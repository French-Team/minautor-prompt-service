<script setup lang="ts">
import { useAppSettings } from '~/composables/useAppSettings';

const { settings, update, reset } = useAppSettings();
</script>

<template>
  <div class="max-w-2xl">
    <div class="mb-5">
      <h1 class="text-lg font-semibold text-gray-90">Préférences</h1>
      <p class="text-xs text-gray-50 mt-0.5">Ajuste l'affichage de l'application à ton goût.</p>
    </div>

    <div class="space-y-3">
      <!-- Thème clair/sombre -->
      <div class="card">
        <div class="card-header">
          <p class="text-sm font-semibold text-gray-80">Thème</p>
          <p class="text-xs text-gray-50 mt-0.5">Bascule entre l'affichage clair et sombre.</p>
        </div>
        <div class="card-body">
          <div class="flex gap-2">
            <button
              v-for="opt in [
                {
                  key: 'light',
                  label: 'Clair',
                  icon: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4',
                },
                { key: 'dark', label: 'Sombre', icon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z' },
              ]"
              :key="opt.key"
              class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors"
              :class="
                settings.theme === opt.key
                  ? 'bg-ibm-60 text-white'
                  : 'border border-gray-30 text-gray-60 hover:bg-gray-10'
              "
              @click="update({ theme: opt.key as any })"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="opt.icon" />
              </svg>
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Taille de police -->
      <div class="card">
        <div class="card-header">
          <p class="text-sm font-semibold text-gray-80">Taille de police</p>
          <p class="text-xs text-gray-50 mt-0.5">Échelle générale des textes dans l'interface.</p>
        </div>
        <div class="card-body">
          <div class="flex gap-2">
            <button
              v-for="opt in [
                { key: 'small', label: 'Petite' },
                { key: 'medium', label: 'Moyenne' },
                { key: 'large', label: 'Grande' },
              ]"
              :key="opt.key"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="
                settings.fontSize === opt.key
                  ? 'bg-ibm-60 text-white'
                  : 'border border-gray-30 text-gray-60 hover:bg-gray-10'
              "
              @click="update({ fontSize: opt.key as any })"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-xs text-gray-40 mt-2">
            Actuelle : <span class="font-mono text-gray-50">base = {{ settings.fontSize }}</span>
          </p>
        </div>
      </div>

      <!-- Densité des cartes -->
      <div class="card">
        <div class="card-header">
          <p class="text-sm font-semibold text-gray-80">Densité des cartes</p>
          <p class="text-xs text-gray-50 mt-0.5">Espacement interne des panneaux et blocs.</p>
        </div>
        <div class="card-body">
          <div class="flex gap-2">
            <button
              v-for="opt in [
                { key: 'compact', label: 'Compact' },
                { key: 'normal', label: 'Normal' },
              ]"
              :key="opt.key"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="
                settings.cardDensity === opt.key
                  ? 'bg-ibm-60 text-white'
                  : 'border border-gray-30 text-gray-60 hover:bg-gray-10'
              "
              @click="update({ cardDensity: opt.key as any })"
            >
              {{ opt.label }}
            </button>
          </div>
          <div class="mt-3 flex gap-2 text-xs text-gray-50">
            <div class="bg-gray-10 rounded p-2 flex-1">
              <p class="font-medium text-gray-60 mb-1">Aperçu compact</p>
              <div class="bg-white border border-gray-20 rounded-sm p-1.5 space-y-1">
                <div class="h-1.5 bg-gray-30 rounded w-3/4" />
                <div class="h-1.5 bg-gray-20 rounded w-1/2" />
              </div>
            </div>
            <div class="bg-gray-10 rounded p-2 flex-1">
              <p class="font-medium text-gray-60 mb-1">Aperçu normal</p>
              <div class="bg-white border border-gray-20 rounded-sm p-3 space-y-1.5">
                <div class="h-1.5 bg-gray-30 rounded w-3/4" />
                <div class="h-1.5 bg-gray-20 rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Largeur de la sidebar -->
      <div class="card">
        <div class="card-header">
          <p class="text-sm font-semibold text-gray-80">Largeur de la sidebar</p>
          <p class="text-xs text-gray-50 mt-0.5">Place accordée à la navigation latérale.</p>
        </div>
        <div class="card-body">
          <div class="flex gap-2">
            <button
              v-for="opt in [
                { key: 'narrow', label: 'Étroite (192px)' },
                { key: 'normal', label: 'Normale (224px)' },
                { key: 'wide', label: 'Large (256px)' },
              ]"
              :key="opt.key"
              class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              :class="
                settings.sidebarWidth === opt.key
                  ? 'bg-ibm-60 text-white'
                  : 'border border-gray-30 text-gray-60 hover:bg-gray-10'
              "
              @click="update({ sidebarWidth: opt.key as any })"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Réinitialiser -->
      <div class="card">
        <div class="card-body flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-80">Réinitialiser</p>
            <p class="text-xs text-gray-50 mt-0.5">Revenir aux valeurs par défaut.</p>
          </div>
          <button class="btn-ghost text-xs !text-red-600 hover:!bg-red-50 hover:!text-red-700" @click="reset">
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
