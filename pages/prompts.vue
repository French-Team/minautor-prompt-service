<script setup lang="ts">
import { usePromptSystem } from '~/composables/usePromptSystem';
import type { UserIdentity } from '~/src/models/identity';
import type { PromptTemplate, TemplateVariable } from '~/src/models/template';
import type { UserIdentityType } from '~/src/models/identity';
import { IDENTITY_CATEGORIES, resolveRuntimeProfile, findIdentity } from '~/src/config/identities';
import { getSubcategoriesForIdentity } from '~/src/config/identity-subcategories';

const { promptGenerator, identityResolver, versionHandler, contextAnalyzer, setWorkFolder } = usePromptSystem();
const route = useRoute();

// SSR : applique le dossier depuis ?folder= pour que l'analyse soit cohérente client/serveur.
if (import.meta.server) {
  const folderParam = route.query.folder as string | undefined;
  if (folderParam) {
    setWorkFolder(folderParam);
  }
}

// --- Sélection d'identité (enrichie par catégorie) ---
// selectedIdentityId est un identifiant large (string) qui peut être 'Architecte',
// 'Developpeur', 'ChefProjet', etc. — valeurs de la configuration enrichie. Le profil
// runtime (3 historiques) est dérivé via resolveRuntimeProfile(). Cette indirection
// évite de dupliquer les IdentityStrategy pour chaque nouveau rôle riche.
const selectedIdentityId = ref<string>('User');
const currentIdentityType = computed<UserIdentityType>(() => resolveRuntimeProfile(selectedIdentityId.value));
const currentIdentityLabel = computed<string>(
  () => findIdentity(selectedIdentityId.value)?.label ?? selectedIdentityId.value,
);

// --- Templates chargés depuis /api/templates ---
type TemplateCategory = string;
interface TemplateRow {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  identities: ('User' | 'Superviseur' | 'Responsable')[];
  template: string;
  variables: TemplateVariable[];
  version: string;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

// useFetch permet de livrer les templates dès le SSR initial (pas de "flash" empty → populated
// après hydration). Le `key` stabilise le cache de Nuxt entre navigations.
const {
  data: templatesData,
  pending: templatesLoading,
  error: templatesFetchError,
  refresh: refreshTemplates,
} = await useFetch<TemplateRow[]>('/api/templates', {
  key: 'prompts-templates',
  server: true,
  lazy: false,
  default: () => [] as TemplateRow[],
});

// Reflète le payload useFetch (data peut être null avant l'arrivée du SSR, default() gère ce cas).
const templates = computed<TemplateRow[]>(() => templatesData.value ?? []);

const templatesError = computed<string | null>(() => {
  if (!templatesFetchError.value) return null;
  const err = templatesFetchError.value;
  const message = err instanceof Error ? err.message : String(err);
  return `Bibliothèque indisponible (${message}).`;
});

// Le code écrit après le hook useFetch pouvait garder une trace de selectedTemplateId
// pointant vers un template supprimé sur disque — on la nettoie après chaque refresh.
watch(templates, (list) => {
  if (selectedTemplateId.value && !list.find((t) => t.id === selectedTemplateId.value)) {
    selectedTemplateId.value = '';
  }
});

const selectedTemplateId = ref<string>(''); // '' = aucun template selectionne (placeholder)
// `variableValues` est indexé par nom de variable du template sélectionné ; réinitialisé à chaque changement.
const variableValues = reactive<Record<string, string>>({});

// M02 polish : filtres du picker de templates
const templateSearchQuery = ref('');
// Cascade identité → sous-catégorie : le contenu de ce selecteur depend de
// `selectedIdentityId` (cf. config/identity-subcategories.json). On reset
// à chaque changement d'identité pour éviter qu'une sous-catégorie d'une
// autre identité reste active (et masquerait tous les templates).
const templateSubcategoryFilter = ref<string>('');
watch(selectedIdentityId, () => {
  templateSubcategoryFilter.value = '';
});

// Sous-catégories disponibles pour l'identité courante (rich role).
// L'identifiant `id` de chaque sous-catégorie matche `template.category`
// côté données (cf. runtime/templates.seed.json), donc le filtrage se fait
// par egalité de chaîne.
const availableSubcategories = computed(() => getSubcategoriesForIdentity(selectedIdentityId.value));

// Ref sur le conteneur listbox pour le scrollIntoView après navigation clavier
const templateListboxRef = ref<HTMLElement | null>(null);

const selectedTemplate = computed<TemplateRow | null>(() => {
  if (!selectedTemplateId.value) return null;
  return templates.value.find((t) => t.id === selectedTemplateId.value) ?? null;
});

// M02 polish : picker filtré par recherche (nom + description) et par sous-
// catégorie (résulte de la cascade identité → sous-catégorie).
const filteredTemplates = computed<TemplateRow[]>(() => {
  const q = templateSearchQuery.value.trim().toLowerCase();
  return templates.value.filter((t) => {
    if (templateSubcategoryFilter.value && t.category !== templateSubcategoryFilter.value) return false;
    if (!q) return true;
    return t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q);
  });
});

function clearSelection() {
  selectedTemplateId.value = '';
}

// Recherche dans la liste affichée pour la nav clavier
function focusTemplateAt(nextIdx: number) {
  if (!filteredTemplates.value.length) return;
  const safeIdx = Math.max(0, Math.min(nextIdx, filteredTemplates.value.length - 1));
  const target = filteredTemplates.value[safeIdx];
  if (!target) return;
  selectedTemplateId.value = target.id;
  // Attend le re-render DOM pour scrollIntoView
  nextTick(() => {
    const el = templateListboxRef.value?.querySelector<HTMLElement>(`#${CSS.escape(target.id)}`);
    el?.scrollIntoView({ block: 'nearest' });
  });
}

function onListboxKeydown(e: KeyboardEvent) {
  if (filteredTemplates.value.length === 0) return;
  const currentIdx = filteredTemplates.value.findIndex((t) => t.id === selectedTemplateId.value);
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      focusTemplateAt(currentIdx < 0 ? 0 : currentIdx + 1);
      return;
    case 'ArrowUp':
      e.preventDefault();
      focusTemplateAt(currentIdx <= 0 ? 0 : currentIdx - 1);
      return;
    case 'Home':
      e.preventDefault();
      focusTemplateAt(0);
      return;
    case 'End':
      e.preventDefault();
      focusTemplateAt(filteredTemplates.value.length - 1);
      return;
    case 'Escape':
      // Laisse le comportement natif (blur l'élément)
      return;
    default:
      return;
  }
}

// À chaque changement de template, on réinitialise les valeurs de variables
// (et on applique les valeurs par défaut déclarées dans le template).
watch(selectedTemplateId, () => {
  for (const k of Object.keys(variableValues)) delete variableValues[k];
  const tpl = selectedTemplate.value;
  if (!tpl) return;
  for (const v of tpl.variables) {
    if (v.defaultValue !== undefined && v.defaultValue !== null) {
      variableValues[v.name] = String(v.defaultValue);
    } else if (v.required) {
      variableValues[v.name] = '';
    }
  }
});

// Avertissement visuel quand l'identité n'est pas dans la liste des identités cibles du template.
const identityCompatible = computed(() => {
  const tpl = selectedTemplate.value;
  if (!tpl) return true;
  return tpl.identities.includes(currentIdentityType.value);
});

// Validation : liste les variables required encore vides (utilisée pour bloquer Générer + warning).
const requiredVarsMissing = computed<string[]>(() => {
  const tpl = selectedTemplate.value;
  if (!tpl) return [];
  return tpl.variables.filter((v) => v.required && !variableValues[v.name]?.trim()).map((v) => v.name);
});

const canGenerate = computed(() => {
  if (!selectedTemplate.value) return false;
  return requiredVarsMissing.value.length === 0;
});

const result = ref<Record<string, unknown> | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const statusMessage = ref<string | null>(null);

// ── Accordéon "Personnalisation / Paramètres" ──────────────────────────────
// Exclusion mutuelle : ouvrir l'une replie l'autre. Cliquer sur une section
// déjà ouverte la referme (les deux peuvent être fermées simultanément).
type CollapsibleSection = 'personnalisation' | 'parametres';
const openSection = ref<CollapsibleSection | null>('parametres');

function toggleSection(s: CollapsibleSection) {
  openSection.value = openSection.value === s ? null : s;
}

// ── Modal Résultat ──────────────────────────────────────────────────────────
// Le résultat ne s'affiche plus inline (sinon il pousse tout le layout vers
// le bas quand un template avec beaucoup de variables est sélectionné).
// À la place : modal qui s'ouvre au clic sur "Générer le prompt" et reste
// ouvert jusqu'à ce que l'utilisateur le ferme (✕, click backdrop, ou Escape).
// `resultModalDismissed` évite que le modal se ré-ouvre automatiquement après
// une fermeture manuelle en pleine génération.
const resultModalDismissed = ref(false);
const resultModalOpen = computed(
  () => loading.value === true || (result.value !== null && !resultModalDismissed.value),
);
const resultModalCloseBtnRef = ref<HTMLButtonElement | null>(null);

function closeResultModal() {
  resultModalDismissed.value = true;
}
function onResultModalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && resultModalOpen.value) {
    e.preventDefault();
    closeResultModal();
  }
}
onMounted(() => {
  document.addEventListener('keydown', onResultModalKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onResultModalKeydown);
});
// À l'ouverture du modal, déplace le focus sur le bouton close (a11y).
watch(resultModalOpen, (open) => {
  if (open) {
    nextTick(() => {
      resultModalCloseBtnRef.value?.focus();
    });
  }
});

// Logs du formulaire uniquement pour les variables dont la description suggère un contenu long.
// Évite d'imposer une heuristique compliquée ; basée sur la présence de mots-clés.
const LONG_CONTENT_KEYWORDS = ['description', 'contexte', 'content', 'sujet', 'message', 'objectif'];
function isLongLikely(varName: string, description?: string): boolean {
  if (description && description.length > 60) return true;
  if (varName.length > 24) return true;
  const lower = varName.toLowerCase();
  return LONG_CONTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

async function generate() {
  error.value = null;
  result.value = null;
  resultModalDismissed.value = false; // ré-autorise l'ouverture après chaque clic
  loading.value = true; // posé tôt pour éviter le flicker close→open du modal
  if (!selectedTemplate.value) {
    error.value = 'Sélectionne un template pour générer un prompt.';
    loading.value = false;
    return;
  }
  if (requiredVarsMissing.value.length > 0) {
    error.value = `Champs requis manquants : ${requiredVarsMissing.value.join(', ')}.`;
    loading.value = false;
    return;
  }
  try {
    // 1. Identité courante (ou création par défaut alignée sur le selecteur)
    let identity: UserIdentity | null = await identityResolver.getCurrentIdentity();
    if (!identity) {
      const basePermissions: Record<string, Array<{ action: string; resource: string }>> = {
        User: [
          { action: 'read', resource: 'prompt' },
          { action: 'use_template', resource: 'template' },
        ],
        Superviseur: [
          { action: 'read', resource: 'prompt' },
          { action: 'use_template', resource: 'template' },
          { action: 'optimize', resource: 'prompt' },
          { action: 'review', resource: 'prompt' },
        ],
        Responsable: [
          { action: 'read', resource: 'prompt' },
          { action: 'use_template', resource: 'template' },
          { action: 'optimize', resource: 'prompt' },
          { action: 'review', resource: 'prompt' },
          { action: 'validate', resource: 'prompt' },
          { action: 'rollback', resource: 'version' },
          { action: 'delete', resource: 'prompt' },
        ],
      };
      identity = {
        type: currentIdentityType.value,
        permissions: basePermissions[currentIdentityType.value],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      };
      await identityResolver.setCurrentIdentity(identity);
    }

    // 2. Contexte (réel, basé sur l'analyse FS du dossier sélectionné)
    const context = await contextAnalyzer.analyzeProjectContext();

    // 3. Construit le PromptTemplate complet à partir de la ligne API (compléter les champs techniques)
    const tpl = selectedTemplate.value;
    const now = new Date(tpl.createdAt ?? Date.now());
    const updatedAt = new Date(tpl.updatedAt ?? Date.now());
    const fullTemplate: PromptTemplate = {
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      category: (tpl.category as PromptTemplate['category']) ?? 'general',
      identities: tpl.identities,
      template: tpl.template,
      variables: tpl.variables,
      constraints: [],
      version: tpl.version || '1.0.0',
      isPublic: true,
      author: identity.type,
      createdAt: now,
      updatedAt,
      usageCount: tpl.usageCount ?? 0,
    };

    // 4. Génération via le pipeline complet (Template Method Pattern)
    const generated = await promptGenerator.generateComprehensivePrompt(
      fullTemplate,
      { ...variableValues },
      identity,
      context,
    );
    result.value = generated as unknown as Record<string, unknown>;

    // 5. Sauvegarde de la version — le prompt compilé devient le `content` à versionner
    if (generated?.id) {
      const compiled = typeof generated.content === 'string' ? generated.content : tpl.template;
      await versionHandler.createVersion(generated.id, compiled, {
        changeReason: `Généré via template "${tpl.name}" pour identité ${currentIdentityType.value} (${currentIdentityLabel.value}).`,
      });
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur de génération';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-5xl">
    <div class="mb-5">
      <h1 class="text-lg font-semibold text-gray-90">Générateur</h1>
      <p class="text-xs text-gray-50 mt-0.5">Sélectionne un template, remplis ses variables, génère le prompt.</p>
    </div>

    <!-- Accordéon à 2 sections, exclusion mutuelle. -->
    <div class="space-y-3 mb-3">
      <!-- ── 1. Personnalisation du prompt (collapsible) ── -->
      <section class="card">
        <button
          type="button"
          class="card-header w-full flex items-center justify-between cursor-pointer hover:bg-gray-10 focus:outline-none focus:ring-2 focus:ring-ibm-60/30 transition-colors text-left"
          :aria-expanded="openSection === 'personnalisation'"
          aria-controls="collapsible-personnalisation"
          @click="toggleSection('personnalisation')"
        >
          <h2 class="text-xs font-semibold text-gray-80">Personnalisation du prompt</h2>
          <span class="flex items-center gap-1.5 text-[10px] text-gray-40">
            <span>{{ openSection === 'personnalisation' ? 'Replier' : 'Ouvrir' }}</span>
            <span
              :class="[
                'transition-transform duration-200 inline-block',
                openSection === 'personnalisation' ? 'rotate-180' : '',
              ]"
              aria-hidden="true"
              >▾</span
            >
          </span>
        </button>
        <Transition name="collapse">
          <div v-show="openSection === 'personnalisation'" id="collapsible-personnalisation">
            <div class="card-body">
              <PromptCustomization
                :identity-type="currentIdentityType"
                :bare="true"
                @saved="
                  statusMessage = 'Préférences enregistrées !';
                  setTimeout(() => (statusMessage = null), 3000);
                "
              >
                <template #footer>
                  <div
                    v-if="statusMessage"
                    class="mt-2 bg-green-50 border border-green-100 text-green-700 px-2.5 py-1.5 rounded text-xs"
                  >
                    {{ statusMessage }}
                  </div>
                </template>
              </PromptCustomization>
            </div>
          </div>
        </Transition>
      </section>

      <!-- ── 2. Paramètres (collapsible, 2 colonnes inner) ──
           Col 1 : identité + filtres + listbox + sélection + génération.
           Col 2 : aperçu du contenu du template choisi + variables. -->
      <section class="card">
        <button
          type="button"
          class="card-header w-full flex items-center justify-between cursor-pointer hover:bg-gray-10 focus:outline-none focus:ring-2 focus:ring-ibm-60/30 transition-colors text-left"
          :aria-expanded="openSection === 'parametres'"
          aria-controls="collapsible-parametres"
          @click="toggleSection('parametres')"
        >
          <h2 class="text-xs font-semibold text-gray-80">Paramètres</h2>
          <span class="flex items-center gap-1.5 text-[10px] text-gray-40">
            <span>{{ openSection === 'parametres' ? 'Replier' : 'Ouvrir' }}</span>
            <span
              :class="[
                'transition-transform duration-200 inline-block',
                openSection === 'parametres' ? 'rotate-180' : '',
              ]"
              aria-hidden="true"
              >▾</span
            >
          </span>
        </button>
        <Transition name="collapse">
          <div v-show="openSection === 'parametres'" id="collapsible-parametres">
            <div class="card-body">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <!-- ── Colonne 1 : navigation + sélection + génération ── -->
                <div class="space-y-3">
                  <!-- Identité — selector groupé par catégorie (M3 enrichi) -->
                  <div>
                    <label class="text-[11px] font-medium text-gray-60 block mb-0.5" for="prompts-identity-select">
                      Identité
                      <span class="text-gray-40 font-normal"> ({{ currentIdentityLabel }}) </span>
                    </label>
                    <select id="prompts-identity-select" v-model="selectedIdentityId" class="input-field text-xs">
                      <optgroup v-for="cat in IDENTITY_CATEGORIES" :key="cat.id" :label="cat.label">
                        <option v-for="opt in cat.identities" :key="opt.id" :value="opt.id" :title="opt.description">
                          {{ opt.label }}
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  <!-- Filtre (recherche) -->
                  <div>
                    <label class="text-[11px] font-medium text-gray-60 block mb-0.5" for="prompts-template-search">
                      Filtre
                    </label>
                    <input
                      id="prompts-template-search"
                      v-model="templateSearchQuery"
                      type="text"
                      placeholder="Filtrer (nom, description)…"
                      class="input-field text-xs w-full"
                      :disabled="!templates.length"
                    />
                  </div>

                  <!-- Sélecteur de sous-catégories (cascade : depend de l'identité courante) -->
                  <div>
                    <label class="text-[11px] font-medium text-gray-60 block mb-0.5" for="prompts-template-subcategory">
                      Sous-catégorie
                      <span class="text-gray-40 font-normal"> ({{ currentIdentityLabel }}) </span>
                    </label>
                    <select
                      id="prompts-template-subcategory"
                      v-model="templateSubcategoryFilter"
                      class="input-field text-xs w-full"
                      :disabled="!availableSubcategories.length"
                      aria-label="Filtrer par sous-catégorie"
                    >
                      <option value="">Toutes sous-catégories</option>
                      <option
                        v-for="sub in availableSubcategories"
                        :key="sub.id"
                        :value="sub.id"
                        :title="sub.description"
                      >
                        {{ sub.label }}
                      </option>
                    </select>
                  </div>

                  <!-- Sélecteur de templates : header + listbox -->
                  <div>
                    <div class="flex items-center justify-between mb-1.5">
                      <p class="text-[11px] font-medium text-gray-60 m-0">
                        Templates
                        <span class="text-gray-40 font-normal">
                          ({{ filteredTemplates.length }} / {{ templates.length }} dispo{{
                            templateSearchQuery || templateSubcategoryFilter ? ' · filtré' : ''
                          }})
                        </span>
                      </p>
                      <button
                        class="btn-ghost text-xs px-2"
                        :disabled="templatesLoading"
                        :aria-label="templatesLoading ? 'Rafraîchissement en cours' : 'Rafraîchir la liste'"
                        title="Rafraîchir la liste depuis le serveur"
                        @click="refreshTemplates()"
                      >
                        <span :class="{ 'animate-spin inline-block': templatesLoading }">↻</span>
                      </button>
                    </div>

                    <div
                      v-if="templatesLoading"
                      class="flex items-center justify-center py-4 bg-gray-10 border border-gray-20 rounded text-xs text-gray-50"
                    >
                      <div
                        class="w-3 h-3 border-2 border-ibm-60 border-t-transparent rounded-full animate-spin mr-1.5"
                      />
                      Chargement…
                    </div>
                    <div
                      v-else-if="!templates.length"
                      class="text-[11px] text-gray-40 italic py-2 text-center border border-gray-20 rounded bg-gray-10"
                    >
                      Aucun template — créez-en un dans /templates puis cliquez ↻.
                    </div>
                    <div
                      v-else
                      ref="templateListboxRef"
                      role="listbox"
                      tabindex="0"
                      :aria-activedescendant="selectedTemplateId || undefined"
                      aria-label="Liste des templates"
                      class="border border-gray-20 rounded bg-white max-h-44 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-ibm-60/30"
                      @keydown="onListboxKeydown"
                    >
                      <button
                        v-for="t in filteredTemplates"
                        :id="t.id"
                        :key="t.id"
                        type="button"
                        role="option"
                        :aria-selected="selectedTemplateId === t.id"
                        :tabindex="selectedTemplateId === t.id ? 0 : -1"
                        class="block w-full text-left px-2.5 py-1.5 text-xs hover:bg-ibm-10 border-b border-gray-10 last:border-b-0 transition-colors focus:outline-none focus:bg-ibm-10"
                        :class="selectedTemplateId === t.id ? 'bg-ibm-10 font-medium' : ''"
                        @click="selectedTemplateId = t.id"
                      >
                        <span class="block font-medium text-gray-80 truncate">{{ t.name }}</span>
                        <span class="block text-[10px] text-gray-40">
                          {{ t.category }} ·
                          {{ t.description.length > 60 ? t.description.slice(0, 60) + '…' : t.description }}
                        </span>
                      </button>
                      <div
                        v-if="!filteredTemplates.length"
                        class="text-[10px] text-gray-40 px-2.5 py-2 text-center italic"
                      >
                        Aucun template ne correspond à votre recherche.
                      </div>
                    </div>
                  </div>

                  <!-- Selected pill -->
                  <div
                    v-if="selectedTemplate"
                    class="bg-ibm-10 border border-ibm-60/30 rounded px-2.5 py-1.5 text-xs flex items-center justify-between"
                  >
                    <div>
                      <p class="text-[10px] text-gray-40 uppercase tracking-wider">Sélectionné</p>
                      <p class="font-medium text-ibm-70">{{ selectedTemplate.name }}</p>
                      <p class="text-[10px] text-gray-50 mt-0.5">
                        {{ selectedTemplate.category }} · v{{ selectedTemplate.version }}
                      </p>
                    </div>
                    <button
                      class="text-[10px] text-gray-50 hover:text-red-500 transition-colors"
                      aria-label="Désélectionner ce template"
                      title="Désélectionner ce template"
                      @click="clearSelection"
                    >
                      ✕
                    </button>
                  </div>

                  <!-- Validation : champs requis manquants -->
                  <div
                    v-if="requiredVarsMissing.length"
                    class="bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1.5 rounded text-xs"
                  >
                    Champs requis manquants :
                    <strong>{{ requiredVarsMissing.join(', ') }}</strong
                    >.
                  </div>

                  <button :disabled="loading || !canGenerate" class="btn-ibm w-full text-xs" @click="generate">
                    {{ loading ? 'Génération…' : 'Générer le prompt' }}
                  </button>

                  <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-2.5 py-1.5 rounded text-xs">
                    {{ error }}
                  </div>

                  <div class="text-[10px] text-gray-40 leading-snug pt-1">
                    Le prompt généré apparaît dans une fenêtre modale au clic sur Générer. Tu peux la fermer via ✕,
                    &laquo;&nbsp;Fermer&nbsp;&raquo;, le clic sur le fond noir ou la touche
                    <kbd class="px-1 py-0.5 bg-gray-10 border border-gray-20 rounded">Esc</kbd>.
                  </div>
                </div>

                <!-- ── Colonne 2 : contenu du template sélectionné + variables ── -->
                <div class="space-y-3">
                  <!-- Aperçu du contenu du template -->
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <p class="text-[10px] text-gray-40 uppercase font-semibold tracking-wider">Aperçu du template</p>
                      <span v-if="selectedTemplate" class="text-[10px] text-gray-40" title="Longueur du prompt">
                        {{ selectedTemplate.template.length }} caractères
                      </span>
                    </div>

                    <div
                      v-if="!selectedTemplate"
                      class="text-[11px] text-gray-40 italic py-3 px-2.5 text-center border border-gray-20 border-dashed rounded bg-gray-10"
                    >
                      Choisis un template dans la colonne 1 pour afficher son contenu ici.
                    </div>

                    <template v-else>
                      <p v-if="selectedTemplate.description" class="text-[11px] text-gray-60 leading-snug mb-1">
                        {{ selectedTemplate.description }}
                      </p>
                      <!-- Gros textarea readonly — affichage confortable, sélection/copie possibles. -->
                      <textarea
                        readonly
                        rows="12"
                        class="input-field text-[11px] font-mono min-h-64 resize-vertical leading-relaxed"
                        :aria-label="`Contenu du template ${selectedTemplate.name}`"
                        :value="selectedTemplate.template"
                      />
                    </template>

                    <div v-if="templatesError" class="text-[10px] text-amber-700 mt-0.5 italic">
                      {{ templatesError }}
                    </div>
                  </div>

                  <!-- Warning compatibilité identité -->
                  <div
                    v-if="selectedTemplate && !identityCompatible"
                    class="bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1.5 rounded text-xs"
                  >
                    ⚠️ Identité {{ currentIdentityLabel }} ({{ currentIdentityType }}) non ciblée par ce template (cible
                    : {{ selectedTemplate.identities.join(', ') }}).
                  </div>

                  <!-- Variables dynamiques -->
                  <div v-if="selectedTemplate?.variables?.length" class="space-y-2 pt-2 border-t border-gray-10">
                    <p class="text-[10px] text-gray-40 uppercase font-semibold tracking-wider">
                      Variables ({{ selectedTemplate.variables.length }})
                    </p>
                    <div v-for="v in selectedTemplate.variables" :key="v.name" class="space-y-0.5">
                      <label :for="`var-${v.name}`" class="text-[11px] font-medium text-gray-60 block">
                        {{ v.name }}
                        <span v-if="v.required" class="text-red-500">*</span>
                        <span v-else class="text-gray-40 font-normal">(optionnel)</span>
                      </label>
                      <textarea
                        v-if="isLongLikely(v.name, v.description)"
                        :id="`var-${v.name}`"
                        v-model="variableValues[v.name]"
                        rows="3"
                        class="input-field text-xs font-mono min-h-20 resize-vertical"
                        :placeholder="String(v.defaultValue ?? '')"
                      />
                      <input
                        v-else
                        :id="`var-${v.name}`"
                        v-model="variableValues[v.name]"
                        type="text"
                        class="input-field text-xs"
                        :placeholder="String(v.defaultValue ?? '')"
                      />
                      <p v-if="v.description" class="text-[10px] text-gray-40">
                        {{ v.description }}
                      </p>
                    </div>
                  </div>
                  <div
                    v-else-if="selectedTemplate"
                    class="text-[10px] text-gray-40 italic pt-2 border-t border-gray-10"
                  >
                    Ce template n'expose aucune variable.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </section>
    </div>

    <!-- ── Modal Résultat (Teleport — échappe le container principal) ── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="resultModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40" aria-hidden="true" @click="closeResultModal" />

          <div
            class="relative bg-white rounded-md shadow-2xl border border-gray-20 w-full max-w-3xl max-h-[85vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-modal-title"
            @click.stop
          >
            <div class="flex items-center justify-between border-b border-gray-20 px-4 py-2.5 shrink-0">
              <h2 id="result-modal-title" class="text-xs font-semibold text-gray-80 uppercase tracking-wider">
                Résultat
              </h2>
              <button
                ref="resultModalCloseBtnRef"
                type="button"
                class="text-base leading-none text-gray-40 hover:text-gray-80 transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-gray-10 focus:outline-none focus:ring-2 focus:ring-ibm-60/30"
                aria-label="Fermer la fenêtre du résultat"
                title="Fermer"
                @click="closeResultModal"
              >
                ✕
              </button>
            </div>

            <div class="overflow-y-auto p-4 grow">
              <div
                v-if="loading"
                class="flex items-center justify-center py-12 text-sm text-gray-50 gap-2"
                role="status"
                aria-live="polite"
              >
                <div class="w-4 h-4 border-2 border-ibm-60 border-t-transparent rounded-full animate-spin" />
                Génération du prompt…
              </div>

              <div v-else-if="result" class="space-y-2 text-sm">
                <div class="flex justify-between py-1 border-b border-gray-10">
                  <span class="text-gray-50 text-xs">ID</span>
                  <span class="text-[11px] font-mono text-gray-60 truncate ml-2">{{ result.id }}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-gray-10">
                  <span class="text-gray-50 text-xs">Template</span>
                  <span class="text-xs text-gray-70">{{ selectedTemplate?.name }}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-gray-10">
                  <span class="text-gray-50 text-xs">Version</span>
                  <span class="text-xs text-gray-70">{{ result.version }}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-gray-10">
                  <span class="text-gray-50 text-xs">Identité</span>
                  <span class="text-xs text-gray-70">{{ result.identity?.type }}</span>
                </div>
                <div class="pt-2">
                  <p class="text-[10px] text-gray-40 uppercase tracking-wider font-semibold mb-1">Contenu</p>
                  <pre
                    class="bg-gray-10 border border-gray-20 rounded p-2.5 text-[11px] whitespace-pre-wrap font-mono text-gray-70"
                    >{{ result.content }}</pre
                  >
                </div>
                <div v-if="result.appliedRules?.length" class="pt-1">
                  <p class="text-[10px] text-gray-40 uppercase tracking-wider font-semibold mb-1">
                    Règles ({{ result.appliedRules.length }})
                  </p>
                  <ul class="space-y-0.5">
                    <li v-for="r in result.appliedRules" :key="r.ruleId" class="text-[11px] text-gray-60">
                      · {{ r.ruleName }} <span class="text-gray-40">({{ r.impact }})</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 border-t border-gray-20 px-4 py-2.5 shrink-0">
              <button type="button" class="btn-ghost text-xs" @click="closeResultModal">Fermer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Transition légère pour le modal (fade-in/out du backdrop + carte) */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease-out;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Animation collapse/expand des sections accordéon (max-height + opacity). */
.collapse-enter-active,
.collapse-leave-active {
  transition:
    max-height 0.25s ease-out,
    opacity 0.18s ease-out;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 1500px;
  opacity: 1;
}
</style>
