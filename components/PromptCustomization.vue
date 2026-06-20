<script setup lang="ts">
import { usePromptSystem } from '~/composables/usePromptSystem';

const emit = defineEmits<{
  saved: [preferences: Record<string, unknown>];
}>();

interface PromptPreferences {
  language: string;
  responseStyle: 'concise' | 'balanced' | 'detailed';
  technicalLevel: 'basic' | 'intermediate' | 'advanced';
  includeExamples: boolean;
  includeReferences: boolean;
  format: 'auto' | 'structured' | 'narrative';
}

withDefaults(
  defineProps<{
    identityType?: 'User' | 'Superviseur' | 'Responsable';
    /**
     * Mode "bare" : ne rend PAS le wrapper `.card` ni le header interne de la section.
     * Utile quand le composant est inclus dans une carte parente (accordion/collapse)
     * qui fournit déjà son propre header + styling, pour éviter les cartes imbriquées
     * et les titres dupliqués.
     */
    bare?: boolean;
  }>(),
  {
    identityType: 'User',
    bare: false,
  },
);

const { identityResolver } = usePromptSystem();

const prefs = reactive<PromptPreferences>({
  language: 'fr',
  responseStyle: 'balanced',
  technicalLevel: 'intermediate',
  includeExamples: false,
  includeReferences: false,
  format: 'auto',
});

const saving = ref(false);
const saved = ref(false);
const error = ref<string | null>(null);

async function save() {
  saving.value = true;
  error.value = null;
  saved.value = false;
  try {
    const identity = await identityResolver.getCurrentIdentity();
    if (identity) {
      await identityResolver.setCurrentIdentity({
        ...identity,
        preferences: {
          language: prefs.language,
          responseStyle: prefs.responseStyle,
          technicalLevel: prefs.technicalLevel,
        },
        customizations: [],
      });
    }
    saved.value = true;
    emit('saved', { ...prefs });
    setTimeout(() => {
      saved.value = false;
    }, 2000);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erreur';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div :class="bare ? '' : 'card'">
    <div v-if="!bare" class="card-header">
      <h2 class="text-xs font-semibold text-gray-80">Personnalisation du prompt</h2>
    </div>
    <div :class="bare ? 'space-y-3' : 'card-body space-y-3'">
      <!-- Langue -->
      <div>
        <label class="text-[11px] font-medium text-gray-60 block mb-0.5">Langue</label>
        <select v-model="prefs.language" class="input-field text-xs">
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
          <option value="it">Italiano</option>
        </select>
      </div>

      <!-- Style de réponse -->
      <div>
        <label class="text-[11px] font-medium text-gray-60 block mb-0.5">Style de réponse</label>
        <div class="flex gap-1.5">
          <button
            v-for="opt in [
              { value: 'concise' as const, label: 'Concis', desc: 'Court et direct' },
              { value: 'balanced' as const, label: 'Équilibré', desc: 'Juste assez' },
              { value: 'detailed' as const, label: 'Détaillé', desc: 'Complet' },
            ]"
            :key="opt.value"
            class="flex-1 text-[11px] px-2 py-1.5 rounded border transition-all"
            :class="
              prefs.responseStyle === opt.value
                ? 'border-ibm-60 bg-ibm-10 text-ibm-70 font-medium'
                : 'border-gray-30 bg-white text-gray-50 hover:border-gray-40'
            "
            @click="prefs.responseStyle = opt.value"
          >
            <div>{{ opt.label }}</div>
            <div class="text-[9px] opacity-70">{{ opt.desc }}</div>
          </button>
        </div>
      </div>

      <!-- Niveau technique -->
      <div>
        <label class="text-[11px] font-medium text-gray-60 block mb-0.5">Niveau technique</label>
        <div class="flex gap-1.5">
          <button
            v-for="opt in [
              { value: 'basic' as const, label: 'Débutant', desc: 'Pas de jargon' },
              { value: 'intermediate' as const, label: 'Intermédiaire', desc: 'Termes modérés' },
              { value: 'advanced' as const, label: 'Avancé', desc: 'Terminologie technique' },
            ]"
            :key="opt.value"
            class="flex-1 text-[11px] px-2 py-1.5 rounded border transition-all"
            :class="
              prefs.technicalLevel === opt.value
                ? 'border-ibm-60 bg-ibm-10 text-ibm-70 font-medium'
                : 'border-gray-30 bg-white text-gray-50 hover:border-gray-40'
            "
            @click="prefs.technicalLevel = opt.value"
          >
            <div>{{ opt.label }}</div>
            <div class="text-[9px] opacity-70">{{ opt.desc }}</div>
          </button>
        </div>
      </div>

      <!-- Format -->
      <div>
        <label class="text-[11px] font-medium text-gray-60 block mb-0.5">Format</label>
        <select v-model="prefs.format" class="input-field text-xs">
          <option value="auto">Automatique</option>
          <option value="structured">Structuré (titres, listes)</option>
          <option value="narrative">Narratif</option>
        </select>
      </div>

      <!-- Options supplémentaires -->
      <div class="space-y-1.5 pt-1">
        <label class="inline-flex items-center gap-2 text-xs text-gray-60 cursor-pointer">
          <input
            v-model="prefs.includeExamples"
            type="checkbox"
            class="w-3.5 h-3.5 rounded border-gray-30 text-ibm-60 focus:ring-ibm-60/30"
          />
          Inclure des exemples concrets
        </label>
        <label class="inline-flex items-center gap-2 text-xs text-gray-60 cursor-pointer">
          <input
            v-model="prefs.includeReferences"
            type="checkbox"
            class="w-3.5 h-3.5 rounded border-gray-30 text-ibm-60 focus:ring-ibm-60/30"
          />
          Inclure des références
        </label>
      </div>

      <!-- Feedback -->
      <div v-if="error" class="bg-red-50 border border-red-100 text-red-700 px-2.5 py-1.5 rounded text-xs">
        {{ error }}
      </div>
      <div v-if="saved" class="bg-green-50 border border-green-100 text-green-700 px-2.5 py-1.5 rounded text-xs">
        Préférences enregistrées ✓
      </div>

      <!-- Save -->
      <button :disabled="saving" class="btn-ibm w-full text-xs" @click="save">
        {{ saving ? 'Enregistrement…' : 'Appliquer les préférences' }}
      </button>

      <!-- Slot pour feedback du parent -->
      <slot name="footer" />
    </div>
  </div>
</template>
