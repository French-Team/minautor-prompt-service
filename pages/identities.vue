<script setup lang="ts">
import { usePromptSystem, createDefaultIdentity } from '~/composables/usePromptSystem';
import type { UserIdentity, IdentityProfile } from '~/src/models/identity';
import { IDENTITY_CATEGORIES, resolveRuntimeProfile, findIdentity } from '~/src/config/identities';

const { identityResolver } = usePromptSystem();

// selectedIdentityId est un id large (string) issu de la configuration enrichie
// enrichi (Architecte, Developpeur, ChefProjet, etc.). Le profil runtime
// derivé via resolveRuntimeProfile() reste étroit (UserIdentityType) pour
// les appels IdentityResolver / createDefaultIdentity.
const selectedIdentityId = ref<string>('User');
const currentRuntimeProfile = computed(() => resolveRuntimeProfile(selectedIdentityId.value));
const currentLabel = computed(() => findIdentity(selectedIdentityId.value)?.label ?? selectedIdentityId.value);

const identity = ref<UserIdentity | null>(null);
const profile = ref<IdentityProfile | null>(null);
const capabilities = ref<string[]>([]);
const permissionCheck = reactive<Record<string, boolean>>({});
const loading = ref(false);
const error = ref<string | null>(null);

const testActions = ['read', 'use_template', 'optimize', 'review', 'validate', 'rollback', 'delete'];

async function loadIdentity(id: string) {
  loading.value = true;
  error.value = null;
  try {
    selectedIdentityId.value = id;
    const runtimeType = resolveRuntimeProfile(id);
    const newIdentity = createDefaultIdentity(runtimeType);
    await identityResolver.setCurrentIdentity(newIdentity);
    identity.value = newIdentity;
    profile.value = await identityResolver.getIdentityCharacteristics(newIdentity);
    capabilities.value = await identityResolver.getIdentityCapabilities(runtimeType);
    for (const action of testActions) {
      permissionCheck[action] = await identityResolver.validateIdentityPermissions(newIdentity, action);
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur';
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadIdentity('User'));
</script>

<template>
  <div class="max-w-5xl">
    <div class="mb-5">
      <h1 class="text-lg font-semibold text-gray-90">Identités</h1>
      <p class="text-xs text-gray-50 mt-0.5">Sélectionne une identité et visualise ses capacités et permissions.</p>
    </div>

    <!-- Sélecteur groupé par catégorie (M3 enrichi) -->
    <div class="space-y-2.5 mb-4">
      <div v-for="cat in IDENTITY_CATEGORIES" :key="cat.id">
        <p class="text-[10px] text-gray-40 uppercase tracking-wider font-semibold mb-1">
          {{ cat.label }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in cat.identities"
            :key="opt.id"
            class="text-xs font-medium px-3 py-1.5 rounded transition-colors"
            :class="
              selectedIdentityId === opt.id
                ? 'bg-ibm-60 text-white'
                : 'bg-white border border-gray-30 text-gray-60 hover:bg-gray-10'
            "
            :title="opt.description"
            @click="loadIdentity(opt.id)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded text-xs mb-4">
      {{ error }}
    </div>
    <div v-if="loading" class="text-xs text-gray-50 py-4">Chargement…</div>

    <p v-if="!loading && identity" class="text-[11px] text-gray-50 mb-3">
      Profil runtime : <strong class="text-gray-80">{{ currentRuntimeProfile }}</strong> (affiché :
      <strong class="text-gray-80">{{ currentLabel }}</strong>)
    </p>

    <div v-else-if="identity" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <!-- Profil -->
      <div class="card">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">Profil</h2></div>
        <div class="card-body space-y-1.5 text-sm">
          <div class="flex justify-between py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs">Type</span>
            <span class="text-gray-80 text-xs font-medium">{{ profile?.identityType }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs">Nom affiché</span>
            <span class="text-gray-80 text-xs">{{ profile?.displayName }}</span>
          </div>
          <div class="py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs block mb-0.5">Description</span>
            <span class="text-gray-70 text-xs">{{ profile?.description }}</span>
          </div>
          <div class="py-1 border-b border-gray-10">
            <span class="text-gray-50 text-xs block mb-1">Capacités</span>
            <div class="flex flex-wrap gap-1">
              <span v-for="c in capabilities" :key="c" class="badge-ibm">{{ c }}</span>
            </div>
          </div>
          <div v-if="profile?.simplificationLevel" class="py-1">
            <span class="text-gray-50 text-xs block mb-0.5">Spécifique User</span>
            <span class="text-[10px] text-gray-50">simplification: {{ profile.simplificationLevel }} · longueur: {{ profile.preferredResponseLength }} ·
              profondeur: {{ profile.technicalDepth }}</span>
          </div>
          <div v-if="profile?.optimizationFocus" class="py-1">
            <span class="text-gray-50 text-xs block mb-0.5">Spécifique Superviseur</span>
            <span class="text-[10px] text-gray-50">focus: {{ profile.optimizationFocus.join(', ') }} · suggestions: {{ profile.suggestionLevel }} ·
              alternatives: {{ profile.alternativeCount }}</span>
          </div>
          <div v-if="profile?.qualityChecks" class="py-1">
            <span class="text-gray-50 text-xs block mb-0.5">Spécifique Responsable</span>
            <span class="text-[10px] text-gray-50">checks: {{ profile.qualityChecks.join(', ') }} · risque: {{ profile.riskTolerance }}</span>
          </div>
        </div>
      </div>

      <!-- Permissions -->
      <div class="card">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">Test des permissions</h2></div>
        <div class="card-body">
          <table class="w-full">
            <thead>
              <tr>
                <th class="table-header">Action</th>
                <th class="table-header text-right">Autorisé</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="action in testActions" :key="action">
                <td class="table-cell font-mono text-[11px]">{{ action }}</td>
                <td class="table-cell text-right">
                  <span class="inline-flex items-center gap-1.5">
                    <span
                      class="w-1.5 h-1.5 rounded-sm"
                      :class="permissionCheck[action] ? 'bg-green-500' : 'bg-red-400'"
                    />
                    <span class="text-xs" :class="permissionCheck[action] ? 'text-green-700' : 'text-red-500'">{{
                      permissionCheck[action] ? 'oui' : 'non'
                    }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="mt-4">
            <p class="text-[10px] text-gray-40 uppercase tracking-wider font-semibold mb-1.5">Permissions accordées</p>
            <div class="flex flex-wrap gap-1">
              <span v-for="p in identity.permissions" :key="p.action + p.resource" class="badge-ibm font-mono">{{ p.action }}:{{ p.resource }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
