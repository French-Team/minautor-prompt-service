import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    globals: true,
    environment: 'nuxt',
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
