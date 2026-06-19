<script setup lang="ts">
import { usePromptSystem } from '~/composables/usePromptSystem';
import type { UserIdentity } from '~/src/models/identity';

const { promptGenerator, identityResolver, versionHandler, contextAnalyzer } = usePromptSystem();

const identityType = ref<'User' | 'Superviseur' | 'Responsable'>('User');
const templateContent = ref(
  'En tant que {{role}}, effectue une revue de code sur le fichier {{file}}. Focus : {{focus}}.',
);
const variables = reactive({ role: '', file: '', focus: 'qualité' });
const result = ref<Record<string, unknown> | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const statusMessage = ref<string | null>(null);

async function generate() {
  error.value = null;
  result.value = null;
  loading.value = true;
  try {
    // 1. Récupérer l'identité courante (ou en créer une par défaut)
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
        type: identityType.value,
        permissions: basePermissions[identityType.value],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      };
      await identityResolver.setCurrentIdentity(identity);
    }

    // 2. Récupérer le contexte réel du projet
    const context = await contextAnalyzer.analyzeProjectContext();

    // 3. Construire le template à partir du contenu utilisateur
    const template = {
      id: `tpl-${Date.now()}`,
      name: 'Template personnalisé',
      description: 'Généré depuis le formulaire',
      category: 'general' as const,
      identities: [identityType.value],
      template: templateContent.value,
      variables: [
        { name: 'role', type: 'string', required: true, description: 'Rôle attendu' },
        { name: 'file', type: 'string', required: true, description: 'Chemin du fichier' },
        { name: 'focus', type: 'string', required: false, defaultValue: 'qualité' },
      ],
      constraints: [],
      version: '1.0.0',
      isPublic: true,
      author: identity.type,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    };

    // 4. Générer via le pipeline complet (Template Method Pattern)
    const generated = await promptGenerator.generateComprehensivePrompt(template, { ...variables }, identity, context);
    result.value = generated as unknown as Record<string, unknown>;

    // 5. Sauvegarder la version
    if (generated?.id) {
      await versionHandler.createVersion(generated.id, generated.content || templateContent.value, {
        changeReason: `Généré via UI pour identité ${identityType.value}`,
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
      <p class="text-xs text-gray-50 mt-0.5">Crée un prompt adapté à une identité et un contexte.</p>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <!-- Formulaire -->
      <div class="card">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">Paramètres</h2></div>
        <div class="card-body space-y-3">
          <div>
            <label class="text-[11px] font-medium text-gray-60 block mb-0.5">Identité</label>
            <select v-model="identityType" class="input-field text-xs">
              <option value="User">User</option>
              <option value="Superviseur">Superviseur</option>
              <option value="Responsable">Responsable</option>
            </select>
          </div>
          <div>
            <label class="text-[11px] font-medium text-gray-60 block mb-0.5"
              >Template <span class="text-gray-40 font-normal">(&#123;&#123;var&#125;&#125;)</span></label
            >
            <textarea v-model="templateContent" rows="3" class="input-field text-xs font-mono" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] font-medium text-gray-60 block mb-0.5">Rôle</label>
              <input v-model="variables.role" type="text" class="input-field text-xs" placeholder="développeur" />
            </div>
            <div>
              <label class="text-[11px] font-medium text-gray-60 block mb-0.5">Fichier</label>
              <input v-model="variables.file" type="text" class="input-field text-xs" placeholder="src/index.ts" />
            </div>
          </div>
          <button :disabled="loading" class="btn-ibm w-full text-xs" @click="generate">
            {{ loading ? 'Génération…' : 'Générer le prompt' }}
          </button>
          <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-2.5 py-1.5 rounded text-xs">
            {{ error }}
          </div>
        </div>
      </div>

      <!-- Résultat -->
      <div class="card">
        <div class="card-header"><h2 class="text-xs font-semibold text-gray-80">Résultat</h2></div>
        <div class="card-body">
          <div v-if="!result" class="text-xs text-gray-40 py-6 text-center">Renseigne le formulaire et génère.</div>
          <div v-else class="space-y-2 text-sm">
            <div class="flex justify-between py-1 border-b border-gray-10">
              <span class="text-gray-50 text-xs">ID</span>
              <span class="text-[11px] font-mono text-gray-60 truncate ml-2">{{ result.id }}</span>
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
      </div>

      <!-- Prompt Customization -->
      <PromptCustomization
        :identity-type="identityType"
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
</template>
