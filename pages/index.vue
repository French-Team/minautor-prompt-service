<script setup lang="ts">
import { usePromptSystem } from '~/composables/usePromptSystem';
import type { UserIdentity } from '~/src/models/identity';
import type { ProjectContext } from '~/src/models/context';

definePageMeta({
  title: 'Dashboard',
  keepalive: true,
});

const { identityResolver, contextAnalyzer, setWorkFolder } = usePromptSystem();
const route = useRoute();

// SSR : si un dossier est passé via ?folder=, l'appliquer au context analyzer
if (import.meta.server) {
  const folderParam = route.query.folder as string | undefined;
  if (folderParam) {
    setWorkFolder(folderParam);
  }
}

const identity = ref<UserIdentity | null>(null);
const context = ref<ProjectContext | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    identity.value = await identityResolver.getCurrentIdentity();
    context.value = await contextAnalyzer.analyzeProjectContext();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="max-w-5xl">
    <div class="flex items-baseline justify-between mb-5">
      <div>
        <h1 class="text-lg font-semibold text-gray-90">Tableau de bord</h1>
        <p class="text-xs text-gray-50 mt-0.5">Vue d'ensemble du système de prompts.</p>
      </div>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded text-xs mb-4">
      {{ error }}
    </div>
    <div v-if="loading" class="text-xs text-gray-50 py-4">Chargement…</div>

    <!-- Analytics Dashboard (loaded in parallel with parent data) -->
    <AnalyticsDashboard />

    <div class="h-3" />

    <template v-if="!loading && !error">
      <!-- Two panels -->
      <div class="grid grid-cols-2 gap-3">
        <div class="card">
          <div class="card-header">
            <h2 class="text-xs font-semibold text-gray-80">Identité courante</h2>
          </div>
          <div class="card-body space-y-2 text-sm">
            <div v-if="identity">
              <div class="flex justify-between py-1 border-b border-gray-10">
                <span class="text-gray-50 text-xs">Type</span>
                <span class="text-gray-80 text-xs font-medium">{{ identity.type }}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-gray-10">
                <span class="text-gray-50 text-xs">Langue</span>
                <span class="text-gray-80 text-xs">{{ identity.preferences.language }}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-gray-10">
                <span class="text-gray-50 text-xs">Style</span>
                <span class="text-gray-80 text-xs">{{ identity.preferences.responseStyle }}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-gray-10">
                <span class="text-gray-50 text-xs">Niveau technique</span>
                <span class="text-gray-80 text-xs">{{ identity.preferences.technicalLevel }}</span>
              </div>
              <div class="pt-2">
                <p class="text-[10px] text-gray-40 uppercase tracking-wider font-semibold mb-1">Permissions</p>
                <div class="flex flex-wrap gap-1">
                  <span v-for="p in identity.permissions" :key="p.action + p.resource" class="badge-ibm">{{ p.action }}:{{ p.resource }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="text-xs font-semibold text-gray-80">État du projet</h2>
          </div>
          <div class="card-body space-y-2 text-sm">
            <div v-if="context">
              <div class="flex justify-between py-1 border-b border-gray-10">
                <span class="text-gray-50 text-xs">Phase</span>
                <span class="text-gray-80 text-xs font-medium">{{ context.projectState.phase }}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-gray-10">
                <span class="text-gray-50 text-xs">Framework</span>
                <span class="text-gray-80 text-xs">{{ context.technicalEcosystem.framework }}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-gray-10">
                <span class="text-gray-50 text-xs">Langage</span>
                <span class="text-gray-80 text-xs">{{ context.technicalEcosystem.language }}</span>
              </div>
              <div class="pt-2">
                <p class="text-[10px] text-gray-40 uppercase tracking-wider font-semibold mb-1">Flows</p>
                <ul class="space-y-1">
                  <li v-for="f in context.activeFlows" :key="f.id" class="flex justify-between text-xs text-gray-60">
                    <span>{{ f.name }}</span>
                    <span class="text-gray-40">{{ f.status }} · {{ f.progress }}%</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
