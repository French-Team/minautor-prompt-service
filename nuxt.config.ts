import { defineNuxtConfig } from 'nuxt/config';
import { fileURLToPath } from 'url';

export default defineNuxtConfig({
  devtools: { enabled: false },

  ssr: true,

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Identity-Based Prompts System',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: "Interface Nuxt pour le système de prompts basés sur l'identité" },
      ],
    },
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
  },

  // Alias pour accéder au code de la librairie depuis `~src/...`
  alias: {
    '~src': fileURLToPath(new URL('./src', import.meta.url)),
  },

  vite: {
    define: {
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
  },

  nitro: {
    minify: true,
  },

  experimental: {
    payloadExtraction: false,
    appManifest: false,
  },

  compatibilityDate: '2026-06-17',
});
