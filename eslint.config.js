import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

// Nuxt/Vue auto-imported globals (synced from .nuxt/types/imports.d.ts)
const nuxtGlobals = {
  // Runtime
  console: 'readonly',
  process: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  URL: 'readonly',
  NodeJS: 'readonly',
  // Vue reactivity
  ref: 'readonly',
  computed: 'readonly',
  reactive: 'readonly',
  watch: 'readonly',
  watchEffect: 'readonly',
  shallowRef: 'readonly',
  shallowReactive: 'readonly',
  isRef: 'readonly',
  unref: 'readonly',
  toRef: 'readonly',
  toRefs: 'readonly',
  toValue: 'readonly',
  markRaw: 'readonly',
  toRaw: 'readonly',
  nextTick: 'readonly',
  readonly: 'readonly',
  triggerRef: 'readonly',
  customRef: 'readonly',
  effect: 'readonly',
  effectScope: 'readonly',
  // Vue lifecycle
  onMounted: 'readonly',
  onBeforeMount: 'readonly',
  onBeforeUnmount: 'readonly',
  onBeforeUpdate: 'readonly',
  onUnmounted: 'readonly',
  onUpdated: 'readonly',
  onErrorCaptured: 'readonly',
  onActivated: 'readonly',
  onDeactivated: 'readonly',
  onScopeDispose: 'readonly',
  onServerPrefetch: 'readonly',
  // Vue utilities
  defineComponent: 'readonly',
  defineAsyncComponent: 'readonly',
  h: 'readonly',
  inject: 'readonly',
  provide: 'readonly',
  // Nuxt composables
  useNuxtApp: 'readonly',
  tryUseNuxtApp: 'readonly',
  useRuntimeConfig: 'readonly',
  useAppConfig: 'readonly',
  useRoute: 'readonly',
  useRouter: 'readonly',
  useState: 'readonly',
  useFetch: 'readonly',
  useLazyFetch: 'readonly',
  useAsyncData: 'readonly',
  useLazyAsyncData: 'readonly',
  useCookie: 'readonly',
  useHead: 'readonly',
  useSeoMeta: 'readonly',
  useRequestHeaders: 'readonly',
  useRequestURL: 'readonly',
  useRequestEvent: 'readonly',
  navigateTo: 'readonly',
  createError: 'readonly',
  showError: 'readonly',
  clearError: 'readonly',
  callOnce: 'readonly',
  refreshNuxtData: 'readonly',
  reloadNuxtApp: 'readonly',
  // Nuxt definitions
  defineNuxtPlugin: 'readonly',
  definePageMeta: 'readonly',
  defineNuxtRouteMiddleware: 'readonly',
  // Browser globals (utilisés dans les composables côté client)
  localStorage: 'readonly',
  document: 'readonly',
  window: 'readonly',
  HTMLElement: 'readonly',
  MutationObserver: 'readonly',
  ResizeObserver: 'readonly',
  IntersectionObserver: 'readonly',
  CustomEvent: 'readonly',
  // Custom project composables (auto-imported by Nuxt)
  usePromptSystem: 'readonly',
  useAppSettings: 'readonly',
  createDefaultIdentity: 'readonly',
  createMockContext: 'readonly',
  createMockTemplate: 'readonly',
}

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  ...eslintPluginVue.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsparser,
      globals: nuxtGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        disallowTypeAnnotations: false
      }],
      'prefer-const': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      'no-duplicate-case': 'error',
      'eqeqeq': ['error', 'smart'],
      'no-throw-literal': 'error'
    }
  },
  // Vue SFC files (*.vue)
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsparser,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: nuxtGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      }],
      'prefer-const': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      'no-duplicate-case': 'error',
      'eqeqeq': ['error', 'smart'],
      'no-throw-literal': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },

  // Nitro server files (server/api/*.ts)
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      globals: {
        defineEventHandler: 'readonly',
        getQuery: 'readonly',
        readBody: 'readonly',
        setHeader: 'readonly',
        getHeader: 'readonly',
        getRouterParams: 'readonly',
        sendRedirect: 'readonly',
        sendError: 'readonly',
        createError: 'readonly',
        H3Error: 'readonly',
      },
    },
  },

  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        afterEach: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        test: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      // Les tests utilisent `any` pour filtrer les wrappers de composants
      '@typescript-eslint/no-explicit-any': 'off',
      // TypeScript gère la résolution des types DOM (HTMLInputElement, etc.)
      'no-undef': 'off'
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.nuxt/**', '*.js']
  }
]