<script setup lang="ts">
import { usePromptSystem } from '~/composables/usePromptSystem';

const emit = defineEmits<{
  reverted: [version: string];
}>();

const props = withDefaults(
  defineProps<{
    promptId?: string;
    promptIds?: string[];
    showCreate?: boolean;
  }>(),
  {
    promptId: '',
    promptIds: () => [],
    showCreate: true,
  },
);

const { versionHandler } = usePromptSystem();

const promptIdInput = ref(props.promptId || '');
const newContent = ref('');
const newReason = ref('Mise à jour');
interface VersionEntry {
  id: string;
  version: string;
  content: string;
  createdAt?: Date | string;
  isActive?: boolean;
  metadata?: {
    changeReason?: string;
  };
}

const versionsByPrompt = reactive<Record<string, VersionEntry[]>>({});
const loading = ref(false);
const error = ref<string | null>(null);
const status = ref<string | null>(null);

const allPromptIds = computed(() => {
  const ids = [
    ...new Set([...props.promptIds, ...(props.promptId ? [props.promptId] : []), ...Object.keys(versionsByPrompt)]),
  ];
  return ids.filter(Boolean);
});

async function refresh() {
  error.value = null;
  const ids = [promptIdInput.value, ...props.promptIds].filter(Boolean);
  for (const pid of [...new Set(ids)]) {
    try {
      const versionData = (await versionHandler.getVersionHistory(pid)) as { versions?: VersionEntry[] } | null;
      versionsByPrompt[pid] = versionData?.versions || [];
    } catch {
      if (!versionsByPrompt[pid]) versionsByPrompt[pid] = [];
    }
  }
}

async function createVersion() {
  const targetId = promptIdInput.value || props.promptId;
  if (!targetId.trim()) {
    error.value = 'Indique un promptId.';
    return;
  }
  if (!newContent.value.trim()) {
    error.value = 'Le contenu ne peut pas être vide.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    await versionHandler.createVersion(targetId, newContent.value, {
      changeReason: newReason.value,
      performanceMetrics: {
        responseTime: 0,
        successRate: 1.0,
        errorRate: 0,
        userSatisfaction: 0,
        usageFrequency: 0,
      },
    });
    status.value = `Version créée pour ${targetId}.`;
    newContent.value = '';
    await refresh();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur';
  } finally {
    loading.value = false;
  }
}

async function revertToVersion(version: string) {
  try {
    await versionHandler.rollbackToVersion(promptIdInput.value || props.promptId, version);
    status.value = `Revenu à la version ${version}.`;
    emit('reverted', version);
    await refresh();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur';
  }
}

onMounted(refresh);

watch(
  () => props.promptId,
  (val) => {
    if (val) {
      promptIdInput.value = val;
      refresh();
    }
  },
);
</script>

<template>
  <div>
    <!-- Create version form -->
    <div v-if="showCreate" class="card mb-3">
      <div class="card-header"><h3 class="text-xs font-semibold text-gray-80">Nouvelle version</h3></div>
      <div class="card-body space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <input
            v-model="promptIdInput"
            type="text"
            placeholder="promptId"
            class="input-field text-xs"
            :disabled="!!promptId"
          >
          <input v-model="newReason" type="text" placeholder="Raison du changement" class="input-field text-xs">
        </div>
        <textarea
          v-model="newContent"
          rows="2"
          placeholder="Contenu de la nouvelle version…"
          class="input-field text-xs font-mono"
        />
        <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-2.5 py-1.5 rounded text-xs">
          {{ error }}
        </div>
        <div v-if="status" class="bg-green-50 border border-green-100 text-green-700 px-2.5 py-1.5 rounded text-xs">
          {{ status }}
        </div>
        <button :disabled="loading" class="btn-ibm text-xs" @click="createVersion">
          {{ loading ? 'Création…' : 'Créer la version' }}
        </button>
      </div>
    </div>

    <!-- Version lists -->
    <div v-if="!allPromptIds.length" class="text-center text-xs text-gray-40 py-4">
      Aucun prompt suivi. Créez-en un avec le formulaire ci-dessus.
    </div>

    <div v-else class="space-y-3">
      <div v-for="pid in allPromptIds" :key="pid" class="card">
        <div class="card-header flex items-center justify-between">
          <h3 class="text-xs font-mono font-semibold text-gray-80 truncate">{{ pid }}</h3>
          <span class="text-[10px] text-gray-40 shrink-0 ml-2">
            {{ versionsByPrompt[pid]?.length || 0 }} version(s)
          </span>
        </div>
        <div class="card-body">
          <div v-if="!versionsByPrompt[pid]?.length" class="text-xs text-gray-40 py-2">Aucune version enregistrée.</div>
          <div v-else class="relative space-y-2">
            <!-- Timeline -->
            <div class="absolute left-[7px] top-2 bottom-2 w-px bg-gray-20" />

            <div v-for="(v, i) in versionsByPrompt[pid].slice().reverse()" :key="v.id || i" class="relative pl-6">
              <!-- Dot -->
              <div
                class="absolute left-0 top-[7px] w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center"
                :class="i === 0 ? 'border-ibm-60 bg-ibm-10' : 'border-gray-30 bg-white'"
              >
                <div :class="['w-1.5 h-1.5 rounded-full', i === 0 ? 'bg-ibm-60' : 'bg-gray-30']" />
              </div>

              <!-- Content -->
              <div class="bg-gray-10 border border-gray-20 rounded p-2.5">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium" :class="i === 0 ? 'text-ibm-70' : 'text-gray-80'">
                      v{{ v.version }}
                    </span>
                    <span
                      v-if="i === 0"
                      class="text-[10px] bg-ibm-60 text-white px-1.5 py-[1px] rounded-sm font-medium"
                    >
                      actuelle
                    </span>
                    <span
                      :class="[
                        'text-[10px] px-1.5 py-[1px] rounded-sm font-medium',
                        v.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-50',
                      ]"
                    >
                      {{ v.isActive ? 'active' : 'inactive' }}
                    </span>
                  </div>
                  <button
                    v-if="i > 0"
                    class="text-[10px] text-gray-40 hover:text-ibm-60 transition-colors"
                    title="Revenir à cette version"
                    @click="revertToVersion(v.version)"
                  >
                    Restaurer
                  </button>
                </div>

                <div class="flex items-center gap-3 text-[10px] text-gray-40 mb-1">
                  <span>{{ v.metadata?.changeReason || '—' }}</span>
                  <span>{{ v.createdAt ? new Date(v.createdAt).toLocaleString() : '' }}</span>
                </div>

                <pre
                  class="bg-white border border-gray-20 rounded p-1.5 text-[11px] whitespace-pre-wrap font-mono text-gray-60 max-h-16 overflow-y-auto"
                >{{ v.content }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
