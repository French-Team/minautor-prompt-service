<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    currentPath?: string;
  }>(),
  {
    currentPath: '',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'select', path: string): void;
}>();

interface DirEntry {
  name: string;
  isDirectory: boolean;
}

const open = ref(props.modelValue);
const visiblePath = ref(props.currentPath || detectRoot());
const entries = ref<DirEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Détection du dossier racine selon l'OS
// Côté serveur : process.platform ; côté client : navigator.userAgent
function detectRoot(): string {
  if (typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)) return 'C:\\';
  if (typeof process !== 'undefined' && (process as { platform: string }).platform === 'win32') return 'C:\\';
  return '/';
}

// Normalise les séparateurs de chemin
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

// Obtient le dossier parent
function parentPath(p: string): string {
  const normalized = normalizePath(p).replace(/\/$/, '');
  const idx = normalized.lastIndexOf('/');
  // Si pas de séparateur : racine (/) ou disque Windows
  if (idx <= 0) {
    if (/^[A-Za-z]:$/.test(normalized)) {
      return normalized + '\\'; // C: → C:\ pour correspondre à detectRoot()
    }
    return '/';
  }
  const parent = normalized.slice(0, idx);
  // Les racines Windows (C:) doivent avoir le séparateur pour correspondre à detectRoot()
  if (/^[A-Za-z]:$/.test(parent)) {
    return parent + '\\';
  }
  return parent;
}

// Sépare le chemin en segments pour le breadcrumb
function pathSegments(): string[] {
  const normalized = normalizePath(visiblePath.value).replace(/\/$/, '');
  const parts = normalized.split('/').filter(Boolean);
  // Gère les racines Windows (C:) et Linux (/)
  if (normalized.startsWith('/')) return ['/', ...parts];
  if (parts.length > 0 && parts[0].includes(':')) {
    return parts.map((p, i) => (i === 0 ? p + '\\' : p));
  }
  return parts;
}

// Reconstruit le chemin à partir d'un segment du breadcrumb
function segmentPath(index: number): string {
  const segs = pathSegments();
  if (segs[0] === '/') {
    return '/' + segs.slice(1, index + 1).join('/');
  }
  return segs.slice(0, index + 1).join('/');
}

async function loadDirectory(dir: string) {
  loading.value = true;
  error.value = null;
  visiblePath.value = dir;

  try {
    const res = await fetch(`/api/list-dirs?path=${encodeURIComponent(dir)}`);
    const data = await res.json();

    if (data.error) {
      error.value = data.error;
      entries.value = [];
    } else {
      entries.value = data.entries || [];
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur de chargement';
    entries.value = [];
  } finally {
    loading.value = false;
  }
}

function navigateTo(dirName: string) {
  const sep = visiblePath.value.endsWith('\\') ? '' : normalizePath(visiblePath.value).includes('/') ? '/' : '\\';
  const newPath =
    visiblePath.value.endsWith('\\') || visiblePath.value.endsWith('/')
      ? visiblePath.value + dirName
      : visiblePath.value + sep + dirName;
  loadDirectory(newPath);
}

function goUp() {
  loadDirectory(parentPath(visiblePath.value));
}

function goToBreadcrumb(index: number) {
  loadDirectory(segmentPath(index));
}

function selectFolder(folderPath: string) {
  emit('select', folderPath);
  open.value = false;
}

watch(
  () => props.modelValue,
  (val) => {
    open.value = val;
    if (val) {
      loadDirectory(props.currentPath || detectRoot());
    }
  },
);

watch(open, (val) => {
  emit('update:modelValue', val);
});

onMounted(() => {
  if (open.value) {
    loadDirectory(visiblePath.value);
  }
});

function formatPath(p: string): string {
  return normalizePath(p).replace(/\/$/, '');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="open = false">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/30" />

        <!-- Modal -->
        <div
          class="relative bg-white rounded-lg shadow-xl border border-gray-20 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-20 shrink-0">
            <h3 class="text-sm font-semibold text-gray-90">Sélectionner un dossier</h3>
            <button class="text-gray-40 hover:text-gray-60 transition-colors p-0.5" @click="open = false">
              <svg
                class="w-4 h-4"
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

          <!-- Breadcrumb -->
          <div class="flex items-center gap-1 px-4 py-2 border-b border-gray-10 bg-gray-10/50 overflow-x-auto shrink-0">
            <button
              :disabled="normalizePath(visiblePath) === normalizePath(detectRoot())"
              class="shrink-0 p-1 text-gray-50 hover:text-ibm-60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Dossier parent"
              @click="goUp"
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
                <path d="M19 12H5m7-7-7 7 7 7" />
              </svg>
            </button>

            <template v-for="(seg, i) in pathSegments()" :key="i">
              <button
                class="text-[11px] px-1.5 py-0.5 rounded hover:bg-gray-20 transition-colors truncate max-w-[120px]"
                :class="
                  i === pathSegments().length - 1 ? 'font-semibold text-gray-80' : 'text-gray-50 hover:text-gray-70'
                "
                @click="goToBreadcrumb(i)"
              >
                {{ seg }}
              </button>
              <span v-if="i < pathSegments().length - 1" class="text-gray-30 text-[10px]">›</span>
            </template>
          </div>

          <!-- Directory listing -->
          <div class="flex-1 overflow-y-auto p-2 min-h-0">
            <!-- Loading -->
            <div v-if="loading" class="flex items-center justify-center py-10">
              <div class="w-5 h-5 border-2 border-ibm-60 border-t-transparent rounded-full animate-spin" />
              <span class="text-xs text-gray-50 ml-2">Chargement…</span>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="flex flex-col items-center justify-center py-8 text-center">
              <svg
                class="w-8 h-8 text-red-400 mb-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p class="text-xs text-gray-60 mb-1">Impossible de charger ce dossier</p>
              <p class="text-[10px] text-gray-40 mb-3">{{ error }}</p>
              <button class="btn-ibm text-xs" @click="goUp">Revenir en arrière</button>
            </div>

            <!-- Entries -->
            <div v-else-if="entries.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
              <svg
                class="w-8 h-8 text-gray-30 mb-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z" />
              </svg>
              <p class="text-xs text-gray-50">Ce dossier est vide</p>
            </div>

            <div v-else class="space-y-0.5">
              <button
                v-for="entry in entries"
                :key="entry.name"
                class="w-full flex items-center gap-2 px-3 py-1.5 rounded text-left hover:bg-ibm-10 transition-colors group"
                @click="navigateTo(entry.name)"
              >
                <!-- Folder icon -->
                <svg
                  class="w-4 h-4 shrink-0 text-ibm-60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z" />
                </svg>
                <span class="text-xs text-gray-70 group-hover:text-gray-90 truncate flex-1">{{ entry.name }}</span>
                <svg
                  class="w-3 h-3 text-gray-30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-20 bg-gray-10/30 shrink-0">
            <div class="flex-1 min-w-0">
              <p class="text-[10px] text-gray-40 uppercase tracking-wider font-semibold mb-0.5">Chemin sélectionné</p>
              <p class="text-[11px] font-mono text-gray-70 truncate">{{ formatPath(visiblePath) }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button class="btn-ghost text-xs" @click="open = false">Annuler</button>
              <button class="btn-ibm text-xs" @click="selectFolder(visiblePath)">Sélectionner</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
