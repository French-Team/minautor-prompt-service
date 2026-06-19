import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.ts',
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Utiliser npm run preview (build nécessaire au préalable).
  // En local : reuseExistingServer pour éviter un rebuild à chaque run.
  // En CI : le build est fait dans le workflow GitHub Actions.
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
});
