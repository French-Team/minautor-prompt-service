<script setup lang="ts">
import type { PromptTemplate, TemplateCategory } from '~/src/models/template';

type IdentityType = 'User' | 'Superviseur' | 'Responsable';

export interface TemplateEntry {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory | string;
  identities: IdentityType[] | string[];
  template: string;
  variables: { name: string; type: string; required: boolean; description?: string }[];
  version: string;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

const emit = defineEmits<{
  selected: [templateId: string];
  created: [template: TemplateEntry];
  deleted: [templateId: string];
}>();

withDefaults(
  defineProps<{
    categories?: string[];
    filterable?: boolean;
    creatable?: boolean;
    showUsage?: boolean;
  }>(),
  {
    categories: () => ['general', 'technical', 'management', 'quality', 'optimization'],
    filterable: true,
    creatable: true,
    showUsage: true,
  },
);

const LOCAL_STORAGE_KEY = 'templates-cache-v1';

const templates = ref<TemplateEntry[]>([]);
const search = ref('');
const filterCategory = ref<string>('all');
const showCreate = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

const draft = reactive({
  name: '',
  description: '',
  category: 'general' as TemplateCategory | string,
  identities: ['User', 'Superviseur', 'Responsable'] as IdentityType[],
  template: '',
});

const filtered = computed(() =>
  templates.value.filter((t) => {
    if (!t) return false;
    const ms =
      !search.value ||
      t.name?.toLowerCase().includes(search.value.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.value.toLowerCase());
    const mc = filterCategory.value === 'all' || t.category === filterCategory.value;
    return ms && mc;
  }),
);

// Charge les templates depuis l'API serveur. Fallback localStorage si l'API échoue.
async function loadTemplates() {
  loading.value = true;
  error.value = null;
  try {
    const data = await $fetch<TemplateEntry[]>('/api/templates');
    templates.value = data || [];
    if (import.meta.client) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates.value));
      } catch {
        // Storage plein ou indisponible — on ignore, l'API est la source de vérité.
      }
    }
  } catch (e: unknown) {
    error.value = `Chargement serveur indisponible : ${e instanceof Error ? e.message : 'erreur inconnue'}`;
    // Fallback localStorage pour ne pas perdre la vue offline
    if (import.meta.client) {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          templates.value = JSON.parse(cached) as TemplateEntry[];
        }
      } catch {
        // Ignore — cache corrompu, on reste sur la liste vide.
      }
    }
  } finally {
    loading.value = false;
  }
}

// Construit la payload PromptTemplate côté client avant envoi à l'API.
function buildPromptTemplate(): PromptTemplate {
  const now = new Date();
  return {
    id: `tpl-${Date.now()}`,
    name: draft.name.trim(),
    description: draft.description.trim() || draft.name.trim(),
    category: draft.category as TemplateCategory,
    identities: [...draft.identities],
    template: draft.template,
    variables: extractVariables(draft.template),
    constraints: [],
    version: '1.0.0',
    isPublic: true,
    author: 'user',
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
  };
}

async function addTemplate() {
  error.value = null;
  if (!draft.name.trim() || !draft.template.trim()) {
    error.value = 'Nom et contenu sont obligatoires.';
    return;
  }
  try {
    const created = await $fetch<TemplateEntry>('/api/templates', {
      method: 'POST',
      body: buildPromptTemplate(),
    });
    templates.value.push(created);
    emit('created', created);
    showCreate.value = false;
    Object.assign(draft, {
      name: '',
      description: '',
      template: '',
      category: 'general',
      identities: ['User', 'Superviseur', 'Responsable'] as IdentityType[],
    });
  } catch (e: unknown) {
    error.value = `Création échouée : ${e instanceof Error ? e.message : 'erreur inconnue'}`;
  }
}

async function removeTemplate(id: string) {
  try {
    await $fetch(`/api/templates/${id}`, { method: 'DELETE' });
    templates.value = templates.value.filter((t) => t.id !== id);
    emit('deleted', id);
  } catch (e: unknown) {
    error.value = `Suppression échouée : ${e instanceof Error ? e.message : 'erreur inconnue'}`;
  }
}

function selectTemplate(id: string) {
  emit('selected', id);
}

// Extrait les variables `{{var}}` d'un template pour pré-remplir le tableau `variables`
// du PromptTemplate (best-effort — le serveur valide de toute façon).
function extractVariables(templateContent: string) {
  const matches = templateContent.match(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g) || [];
  const names = Array.from(new Set(matches.map((m) => m.replace(/[{}\s]/g, ''))));
  return names.map((name) => ({
    name,
    type: 'string' as const,
    required: true,
    description: `Variable ${name}`,
  }));
}

onMounted(loadTemplates);
</script>

<template>
  <div>
    <!-- Header -->
    <div v-if="creatable" class="flex items-center justify-between mb-3">
      <p class="text-xs text-gray-50">{{ templates.length }} template(s)</p>
      <button class="btn-ibm text-xs" @click="showCreate = !showCreate">
        {{ showCreate ? 'Annuler' : '+ Nouveau' }}
      </button>
    </div>

    <!-- Create form -->
    <div v-if="showCreate" class="card mb-3">
      <div class="card-header"><h3 class="text-xs font-semibold text-gray-80">Nouveau template</h3></div>
      <div class="card-body space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <input v-model="draft.name" type="text" placeholder="Nom" class="input-field text-xs" />
          <select v-model="draft.category" class="input-field text-xs">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <input v-model="draft.description" type="text" placeholder="Description" class="input-field text-xs" />
        <textarea
          v-model="draft.template"
          rows="2"
          placeholder="Contenu (&#123;&#123;variable&#125;&#125;)"
          class="input-field text-xs font-mono"
        />
        <div class="flex items-center gap-3 text-xs text-gray-60">
          <span class="font-medium">Identités :</span>
          <label
            v-for="i in ['User', 'Superviseur', 'Responsable']"
            :key="i"
            class="inline-flex items-center gap-1 cursor-pointer"
          >
            <input
              v-model="draft.identities"
              type="checkbox"
              :value="i"
              class="rounded border-gray-30 text-ibm-60 focus:ring-ibm-60/30"
            />
            {{ i }}
          </label>
        </div>
        <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-2.5 py-1.5 rounded text-xs">
          {{ error }}
        </div>
        <button class="btn-ibm text-xs" @click="addTemplate">Créer</button>
      </div>
    </div>

    <!-- Search / filter -->
    <div v-if="filterable" class="flex gap-2 mb-3">
      <input v-model="search" type="text" placeholder="Rechercher…" class="input-field text-xs flex-1" />
      <select v-model="filterCategory" class="input-field text-xs w-36">
        <option value="all">Toutes</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-6">
      <div class="w-4 h-4 border-2 border-ibm-60 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Grid -->
    <div v-else-if="filtered.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        v-for="t in filtered"
        :key="t.id"
        class="card cursor-pointer hover:shadow-sm transition-shadow"
        @click="selectTemplate(t.id)"
      >
        <div class="card-header flex items-center justify-between">
          <h3 class="text-xs font-semibold text-gray-80 truncate">{{ t.name }}</h3>
          <button
            class="text-[10px] text-gray-40 hover:text-red-500 transition-colors shrink-0 ml-2"
            @click.stop="removeTemplate(t.id)"
          >
            Supprimer
          </button>
        </div>
        <div class="card-body">
          <p class="text-xs text-gray-50 mb-2 line-clamp-2">{{ t.description }}</p>
          <div class="flex flex-wrap gap-1 mb-2">
            <span class="badge-gray">{{ t.category }}</span>
            <span v-for="i in t.identities" :key="i" class="badge-ibm">{{ i }}</span>
          </div>
          <pre
            class="bg-gray-10 border border-gray-20 rounded p-2 text-[11px] whitespace-pre-wrap font-mono text-gray-60 max-h-20 overflow-hidden"
            >{{ t.template }}</pre
          >
          <div v-if="showUsage" class="flex items-center gap-3 mt-1.5 text-[10px] text-gray-40">
            <span>{{ t.variables?.length || 0 }} variable(s)</span>
            <span>v{{ t.version }}</span>
            <span v-if="t.usageCount !== undefined">{{ t.usageCount }} utilisation(s)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="text-center text-xs text-gray-40 py-6">
      {{ search || filterCategory !== 'all' ? 'Aucun template trouvé.' : 'Aucun template.' }}
    </div>
  </div>
</template>
