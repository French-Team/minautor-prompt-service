<script setup lang="ts">
import { useAppSettings } from '~/composables/useAppSettings';

const route = useRoute();
useAppSettings();

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/prompts', label: 'Prompts', icon: 'sparkles' },
  { to: '/templates', label: 'Templates', icon: 'stack' },
  { to: '/identities', label: 'Identités', icon: 'users' },
  { to: '/context', label: 'Contexte', icon: 'cube' },
  { to: '/versions', label: 'Versions', icon: 'clock' },
];

const iconPaths: Record<string, string> = {
  home: 'M3 12 12 3l9 9M5 10v10h14V10',
  sparkles: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  stack: 'M3 7h18M3 12h18M3 17h18',
  users: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21a8 8 0 0 1 16 0',
  cube: 'M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
};
</script>

<template>
  <div class="h-screen flex overflow-hidden bg-gray-10 text-gray-80">
    <!-- Sidebar -->
    <aside
      class="shrink-0 bg-white border-r border-gray-20 flex flex-col transition-all duration-200"
      :style="{ width: `var(--sidebar-w, 224px)` }"
    >
      <div class="h-11 flex items-center gap-2 px-4 border-b border-gray-20">
        <div class="w-2 h-2 rounded-sm bg-ibm-60" />
        <span class="text-sm font-semibold text-gray-90 tracking-tight">Prompts</span>
        <span class="ml-auto text-[10px] text-gray-40 font-medium">v1</span>
      </div>

      <nav class="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="route.path === item.to ? 'nav-link-active' : 'nav-link-inactive'"
        >
          <svg
            class="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path :d="iconPaths[item.icon]" />
          </svg>
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- Settings link -->
      <NuxtLink
        to="/settings"
        class="flex items-center gap-2.5 px-4 h-9 border-t border-gray-20 text-xs text-gray-50 hover:text-ibm-60 hover:bg-ibm-10 transition-colors"
        :class="route.path === '/settings' ? 'bg-ibm-10 text-ibm-70' : ''"
      >
        <svg
          class="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </svg>
        Préférences
      </NuxtLink>
    </aside>

    <!-- Main area -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto px-6 py-5">
        <slot />
      </div>
    </main>
  </div>
</template>
