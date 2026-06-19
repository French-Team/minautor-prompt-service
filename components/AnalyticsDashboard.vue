<script setup lang="ts">
import { usePromptSystem } from '~/composables/usePromptSystem';

interface KpiCard {
  label: string;
  value: string | number;
  sub: string;
  icon: string;
  color: string;
}

const { identityResolver, contextAnalyzer } = usePromptSystem();

const cards = ref<KpiCard[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const identity = await identityResolver.getCurrentIdentity().catch(() => null);
    const context = await contextAnalyzer.analyzeProjectContext();
    const agents = ['ollama', 'lm-studio', 'codestral', 'generic'];

    cards.value = [
      {
        label: 'Identité',
        value: identity?.type ?? '—',
        sub: identity ? `${identity.permissions.length} permissions` : '',
        icon: 'user',
        color: 'text-ibm-60',
      },
      {
        label: 'Flows',
        value: context.activeFlows?.length ?? 0,
        sub: context.projectState?.phase ?? '—',
        icon: 'activity',
        color: 'text-green-600',
      },
      {
        label: 'Outils',
        value: context.availableTools?.length ?? 0,
        sub: 'détectés',
        icon: 'tool',
        color: 'text-amber-600',
      },
      { label: 'Agents', value: agents.length, sub: 'supportés', icon: 'cpu', color: 'text-purple-600' },
    ];
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur';
  } finally {
    loading.value = false;
  }
});

const icons: Record<string, string> = {
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4Z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  tool: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z',
  cpu: 'M9 3v2M15 3v2M9 19v2M15 19v2M5 9H3M5 15H3M21 9h-2M21 15h-2M7 7h10v10H7V7Z',
};
</script>

<template>
  <div>
    <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded text-xs mb-4">
      {{ error }}
    </div>

    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="w-5 h-5 border-2 border-ibm-60 border-t-transparent rounded-full animate-spin" />
      <span class="ml-2 text-xs text-gray-50">Chargement…</span>
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div
        v-for="card in cards"
        :key="card.label"
        class="card px-4 py-3 hover:shadow-sm transition-shadow cursor-default"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="stat-label">{{ card.label }}</p>
            <p class="stat-value mt-0.5">{{ card.value }}</p>
            <p class="text-[10px] text-gray-40 mt-0.5">{{ card.sub }}</p>
          </div>
          <svg
            class="w-5 h-5 shrink-0 mt-0.5"
            :class="card.color"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path :d="icons[card.icon]" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Quick actions row -->
    <div class="mt-4 flex flex-wrap gap-2">
      <NuxtLink
        v-for="link in [
          {
            to: '/prompts',
            label: 'Générer un prompt',
            icon: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1',
          },
          { to: '/templates', label: 'Gérer les templates', icon: 'M3 7h18M3 12h18M3 17h18' },
          {
            to: '/identities',
            label: 'Voir les identités',
            icon: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21a8 8 0 0 1 16 0',
          },
        ]"
        :key="link.to"
        :to="link.to"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-30 rounded text-[11px] text-gray-60 hover:text-ibm-60 hover:border-ibm-40 hover:bg-ibm-10 transition-colors"
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
          <path :d="link.icon" />
        </svg>
        {{ link.label }}
      </NuxtLink>
    </div>
  </div>
</template>
