<script setup lang="ts">
import { usePromptSystem } from '~/composables/usePromptSystem';
import type { ProjectContext, FlowState } from '~/src/models/context';

const route = useRoute();
const { contextAnalyzer, setWorkFolder, clearCache } = usePromptSystem();

const context = useState<ProjectContext | null>('context', () => null);
const flowState = useState<FlowState | null>('flowState', () => null);
const loading = ref(false);
const error = ref<string | null>(null);
const workFolderInput = ref('');
const showFolderPicker = ref(false);

// Le dossier de travail est transmis via query param ?folder=
// Ainsi l'analyse se fait toujours en SSR avec le vrai filesystem.
const folderParam = computed(() => route.query.folder as string | undefined);

async function analyze() {
  loading.value = true;
  error.value = null;
  clearCache();
  try {
    context.value = await contextAnalyzer.analyzeProjectContext();
    flowState.value = await contextAnalyzer.getFlowState();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : "Erreur lors de l'analyse du contexte";
  } finally {
    loading.value = false;
  }
}

// SSR : analyse uniquement si un dossier est passé via ?folder=
// Pas d'analyse automatique du projet racine.
if (import.meta.server) {
  if (folderParam.value) {
    workFolderInput.value = folderParam.value;
    setWorkFolder(folderParam.value);
    await analyze();
  } else {
    // Réinitialiser l'override pour la prochaine requête
    setWorkFolder('');
    context.value = null;
    flowState.value = null;
  }
}

// Client : pas de ré-analyse (les données SSR sont suffisantes).
// Si un dossier est sauvegardé mais pas dans l'URL → recharger avec le paramètre
onMounted(() => {
  const saved = localStorage.getItem('work-folder');
  const currentFolder = route.query.folder as string | undefined;

  if (saved && saved !== currentFolder) {
    // Rechargement complet SSR avec le dossier sauvegardé
    window.location.href = '/context?folder=' + encodeURIComponent(saved);
    return;
  }

  if (saved) {
    workFolderInput.value = saved;
  }

  // DEBUG
  if (import.meta.client) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__DEBUG_CONTEXT = {
      context: context.value
        ? {
            workFolder: {
              path: context.value.workFolder.path,
              name: context.value.workFolder.name,
              type: context.value.workFolder.type,
              technologies: context.value.workFolder.technologies,
              technologiesCount: context.value.workFolder.technologies.length,
            },
            activeFlowsCount: context.value.activeFlows?.length ?? 0,
            availableToolsCount: context.value.availableTools?.length ?? 0,
            projectState: {
              phase: context.value.projectState.phase,
              features: context.value.projectState.activeFeatures,
              completion: context.value.projectState.completionPercentage,
            },
            ecosystem: {
              framework: context.value.technicalEcosystem.framework,
              language: context.value.technicalEcosystem.language,
              dependenciesCount: context.value.technicalEcosystem.dependencies.length,
            },
          }
        : null,
      error: error.value,
      loading: loading.value,
      _meta: { timestamp: Date.now() },
    };
  }
});

function onFolderSelected(path: string) {
  showFolderPicker.value = false;
  localStorage.setItem('work-folder', path);
  // Rechargement SSR complet avec le dossier choisi
  window.location.href = '/context?folder=' + encodeURIComponent(path);
}

function clearSavedFolder() {
  localStorage.removeItem('work-folder');
  window.location.href = '/context';
}

function refresh() {
  window.location.reload();
}

const statusBadge = (s: string) => {
  switch (s) {
    case 'active':
      return 'badge-green';
    case 'paused':
      return 'badge-amber';
    case 'completed':
      return 'badge-blue';
    case 'failed':
      return 'badge-red';
    default:
      return 'badge-gray';
  }
};
</script>

<template>
  <div class="max-w-5xl">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-lg font-semibold text-gray-90">Projet</h1>
        <p class="text-xs text-gray-50 mt-0.5">Sélectionne et explore un projet cible.</p>
      </div>
      <button :disabled="loading" class="btn-ibm text-xs" @click="refresh">
        {{ loading ? 'Analyse…' : 'Réanalyser' }}
      </button>
    </div>

    <!-- Configuration du dossier de travail -->
    <div class="card mb-4">
      <div class="card-header">
        <h2 class="text-xs font-semibold text-gray-80">Projet cible</h2>
      </div>
      <div class="card-body">
        <div class="flex items-center gap-2">
          <div class="flex-1 relative">
            <input
              v-model="workFolderInput"
              type="text"
              placeholder="Chemin du dossier (ex: /home/user/project)"
              class="input-field text-xs w-full pr-9"
              readonly
            />
            <button
              class="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-gray-40 hover:text-ibm-60 hover:bg-gray-10 transition-colors"
              title="Parcourir…"
              @click="showFolderPicker = true"
            >
              <svg
                class="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z" />
              </svg>
            </button>
            <button
              v-if="folderParam"
              class="absolute right-7 top-1/2 -translate-y-1/2 p-1 rounded text-gray-30 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Réinitialiser le dossier"
              @click="clearSavedFolder"
            >
              <svg
                class="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Folder tree picker modal -->
      <FolderTreePicker v-model="showFolderPicker" :current-path="workFolderInput" @select="onFolderSelected" />
    </div>

    <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded text-xs mb-4">
      {{ error }}
    </div>

    <div v-if="loading" class="text-xs text-gray-50 py-4">Analyse en cours…</div>

    <!-- État vide : aucun projet sélectionné -->
    <div v-if="!folderParam" class="flex flex-col items-center justify-center py-16 text-center">
      <svg
        class="w-12 h-12 text-gray-30 mb-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z" />
      </svg>
      <p class="text-sm text-gray-50 mb-1">Aucun projet sélectionné</p>
      <p class="text-xs text-gray-40 mb-4">Sélectionne un dossier de projet pour voir ses informations.</p>
      <button class="btn-ibm text-xs" @click="showFolderPicker = true">Choisir un dossier</button>
    </div>

    <div v-if="context && folderParam" class="grid grid-cols-2 gap-3">
      <!-- Dossier -->
      <div class="card">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">Informations du projet</h2></div>
        <div class="card-body space-y-1.5 text-sm">
          <div class="flex justify-between py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs">Chemin</span>
            <span class="text-[11px] font-mono text-gray-60 truncate ml-2">{{ context.workFolder.path }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs">Nom</span>
            <span class="text-xs text-gray-80 font-medium">{{ context.workFolder.name }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs">Type</span>
            <span class="text-xs text-gray-70">{{ context.workFolder.type }}</span>
          </div>
          <div class="py-1">
            <span class="text-gray-50 text-xs block mb-1">Technologies</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="t in context.workFolder.technologies" :key="t" class="badge-gray">{{ t }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- État projet -->
      <div class="card">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">État du projet</h2></div>
        <div class="card-body space-y-1.5 text-sm">
          <div class="flex justify-between py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs">Phase</span>
            <span class="text-xs text-gray-80 font-medium">{{ context.projectState.phase }}</span>
          </div>
          <div class="py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs block mb-1">Complétion</span>
            <div class="flex items-center gap-2">
              <div class="progress-bar flex-1">
                <div class="progress-fill" :style="{ width: context.projectState.completionPercentage + '%' }" />
              </div>
              <span class="text-xs text-gray-50 w-8 text-right">{{ context.projectState.completionPercentage }}%</span>
            </div>
          </div>
          <div class="py-1">
            <span class="text-gray-50 text-xs block mb-1">Features</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="f in context.projectState.activeFeatures" :key="f" class="badge-blue">{{ f }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Flows (full width) -->
      <div class="card col-span-2">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">Flows actifs</h2></div>
        <div class="card-body">
          <table v-if="context.activeFlows.length" class="w-full">
            <thead>
              <tr>
                <th class="table-header">Nom</th>
                <th class="table-header">Statut</th>
                <th class="table-header">Progression</th>
                <th class="table-header text-right">Étape</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in context.activeFlows" :key="f.id">
                <td class="table-cell text-xs font-medium text-gray-80">{{ f.name }}</td>
                <td class="table-cell">
                  <span :class="['badge-gray', statusBadge(f.status)]" class="!text-[10px]">{{ f.status }}</span>
                </td>
                <td class="table-cell">
                  <div class="flex items-center gap-2">
                    <div class="progress-bar w-24">
                      <div class="progress-fill" :style="{ width: f.progress + '%' }" />
                    </div>
                    <span class="text-[11px] text-gray-50">{{ f.progress }}%</span>
                  </div>
                </td>
                <td class="table-cell text-right text-xs text-gray-60">{{ f.currentStep }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-xs text-gray-40 py-2">Aucun flow actif.</p>
        </div>
      </div>

      <!-- Outils -->
      <div class="card">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">Outils</h2></div>
        <div class="card-body">
          <table class="w-full">
            <thead>
              <tr>
                <th class="table-header">Nom</th>
                <th class="table-header text-right">Version</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in context.availableTools" :key="t.name">
                <td class="table-cell text-xs font-medium text-gray-80">{{ t.name }}</td>
                <td class="table-cell text-xs text-right text-gray-50">{{ t.version }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Écosystème -->
      <div class="card">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">Écosystème</h2></div>
        <div class="card-body space-y-1.5 text-sm">
          <div class="flex justify-between py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs">Framework</span>
            <span class="text-xs text-gray-70">{{ context.technicalEcosystem.framework }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs">Langage</span>
            <span class="text-xs text-gray-70">{{ context.technicalEcosystem.language }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs">Runtime</span>
            <span class="text-xs text-gray-70">{{ context.technicalEcosystem.runtime }}</span>
          </div>
          <div class="py-1">
            <span class="text-gray-50 text-xs block mb-1"
              >Dépendances ({{ context.technicalEcosystem.dependencies.length }})</span
            >
            <div class="space-y-0.5">
              <div
                v-for="d in context.technicalEcosystem.dependencies.slice(0, 5)"
                :key="d.name"
                class="flex justify-between text-[11px]"
              >
                <span class="font-mono text-gray-60">{{ d.name }}@{{ d.version }}</span>
                <span :class="d.isOutdated ? 'text-amber-600' : 'text-green-600'">{{ d.isOutdated ? '↻' : '✓' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
