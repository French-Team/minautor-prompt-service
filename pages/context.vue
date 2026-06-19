<script setup lang="ts">
import { usePromptSystem } from '~/composables/usePromptSystem';
import type { ProjectContext, FlowState } from '~/src/models/context';

const { contextAnalyzer, isDegradedMode, setWorkFolder, clearCache, validateFolder } = usePromptSystem();

// useState permet de partager les données SSR → client sans hydration mismatch
const context = useState<ProjectContext | null>('context', () => null);
const flowState = useState<FlowState | null>('flowState', () => null);
const loading = ref(false);
const error = ref<string | null>(null);
const workFolderInput = ref('');
const workFolderSaved = ref(false);
const workFolderError = ref<string | null>(null);
const showFolderPicker = ref(false);

// Mode forcé : null = auto, 'degraded' = forcer mode dégradé, 'ssr' = forcer mode SSR
const forceMode = ref<string | null>(null);

const degraded = computed(() => {
  if (forceMode.value === 'degraded') return true;
  if (forceMode.value === 'ssr') return false;
  return isDegradedMode();
});

onMounted(() => {
  const saved = localStorage.getItem('work-folder');
  if (saved) {
    workFolderInput.value = saved;
    setWorkFolder(saved);
  }
  // Restaurer le mode forcé
  const savedMode = localStorage.getItem('force-mode');
  if (savedMode === 'degraded' || savedMode === 'ssr') {
    forceMode.value = savedMode;
  }
});

function toggleForceMode() {
  if (forceMode.value === null) {
    forceMode.value = 'degraded';
  } else if (forceMode.value === 'degraded') {
    forceMode.value = 'ssr';
  } else {
    forceMode.value = null;
  }
  localStorage.setItem('force-mode', forceMode.value || '');
}

function onFolderSelected(path: string) {
  workFolderInput.value = path;
  showFolderPicker.value = false;
  saveWorkFolder();
}

async function saveWorkFolder() {
  const path = workFolderInput.value.trim();
  if (!path) return;

  workFolderError.value = null;
  const exists = await validateFolder(path);
  if (!exists) {
    workFolderError.value = "Ce dossier n'existe pas. Vérifie le chemin et réessaie.";
    return;
  }

  setWorkFolder(path);
  localStorage.setItem('work-folder', path);
  workFolderSaved.value = true;
  setTimeout(() => {
    workFolderSaved.value = false;
  }, 2000);
  analyze();
}

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
    // DEBUG : expose l'état du composant pour les tests e2e pisteurs
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
            }
          : null,
        error: error.value,
        loading: loading.value,
        degraded: degraded.value,
        // Metadata pour le pistage
        _meta: {
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hasProcessCwd: typeof process !== 'undefined' && typeof (process as any).cwd === 'function',
        },
      };
    }
  }
}

// PDC : Pister → analyse SSR avec vrai fs, skip client si dégradé pour protéger les données
if (import.meta.server) {
  await analyze();
}
if (import.meta.client && !degraded.value) {
  onMounted(analyze);
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
        <h1 class="text-lg font-semibold text-gray-90">Contexte</h1>
        <p class="text-xs text-gray-50 mt-0.5">Analyse du dossier de travail, flows et écosystème.</p>
      </div>
      <button :disabled="loading" class="btn-ibm text-xs" @click="analyze">
        {{ loading ? 'Analyse…' : 'Réanalyser' }}
      </button>
    </div>

    <!-- Configuration du dossier de travail -->
    <div class="card mb-4">
      <div class="card-header flex items-center justify-between">
        <h2 class="text-xs font-semibold text-gray-80">Dossier de travail</h2>
        <!-- Toggle mode dégradé/SSR -->
        <button
          class="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded transition-colors"
          :class="{
            'bg-amber-50 text-amber-700': !forceMode,
            'bg-red-50 text-red-700': forceMode === 'degraded',
            'bg-blue-50 text-blue-700': forceMode === 'ssr',
          }"
          :title="
            forceMode === 'degraded'
              ? 'Forcé: mode dégradé'
              : forceMode === 'ssr'
                ? 'Forcé: SSR'
                : 'Auto: détection automatique'
          "
          @click="toggleForceMode"
        >
          <svg v-if="!forceMode" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <svg
            v-else-if="forceMode === 'degraded'"
            class="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <svg v-else class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 3v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3M5 3l1.5-1.5h11L21 3M5 3h16M9 7h6M9 11h6M9 15h4" />
          </svg>
          <span>{{ !forceMode ? 'Auto' : forceMode === 'degraded' ? 'Dégradé' : 'SSR' }}</span>
        </button>
      </div>
      <div class="card-body">
        <div class="flex items-center gap-2">
          <div class="flex-1 relative">
            <input
              v-model="workFolderInput"
              type="text"
              placeholder="Chemin du dossier (ex: /home/user/project)"
              class="input-field text-xs w-full pr-9"
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
          </div>
        </div>
        <div v-if="workFolderError" class="text-xs text-red-600 mt-1">{{ workFolderError }}</div>
        <div v-if="workFolderSaved" class="text-xs text-green-600 mt-1">✓ Dossier enregistré</div>
      </div>

      <!-- Folder tree picker modal -->
      <FolderTreePicker v-model="showFolderPicker" :current-path="workFolderInput" @select="onFolderSelected" />
    </div>

    <!-- Badge mode dégradé (client-only pour éviter hydration mismatch) -->
    <ClientOnly>
      <div
        v-if="degraded && !error"
        class="bg-amber-50 border border-amber-100 text-amber-700 px-3 py-2 rounded text-xs mb-4 flex items-center gap-2"
      >
        <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span
          ><strong>Mode dégradé :</strong> certaines données sont limitées (affichage côté client). Les analyses FS
          réelles sont disponibles en SSR.</span
        >
      </div>
    </ClientOnly>

    <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded text-xs mb-4">
      {{ error }}
    </div>

    <div v-if="loading" class="text-xs text-gray-50 py-4">Analyse en cours…</div>

    <div v-if="context" class="grid grid-cols-2 gap-3">
      <!-- Dossier -->
      <div class="card">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">Dossier de travail</h2></div>
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
