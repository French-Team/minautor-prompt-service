// Server-side singleton for TemplateLibraryService with disk persistence.
//
// Strategy:
// - Single instance per Nitro server process (module-level state)
// - Storage path resolved relative to the project root (process.cwd())
// - Auto-initialized on first access — endpoints just `await getTemplateService()`
// - Honors TEMPLATES_STORAGE_PATH env var (mainly for E2E tests / CI)
// - Race-safe: initPromise is allocated atomically before any object is created,
//   so two concurrent callers cannot initialise two separate service instances.

import { join } from 'node:path';

import { TemplateLibraryService } from '../../src/services/template-library';

const DEFAULT_STORAGE_DIR = 'runtime';
const DEFAULT_STORAGE_FILENAME = 'templates.json';

let serviceInstance: TemplateLibraryService | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Resolve the absolute path to the templates JSON file from the project root.
 */
export function resolveStoragePath(): string {
  const override = process.env.TEMPLATES_STORAGE_PATH;
  if (override && override.trim().length > 0) return override;
  return join(process.cwd(), DEFAULT_STORAGE_DIR, DEFAULT_STORAGE_FILENAME);
}

/**
 * Lazy getter for the singleton TemplateLibraryService.
 *
 * The first caller triggers `initialize()`, which loads `runtime/templates.json`
 * (and bootstraps from `runtime/templates.seed.json` if the user file is missing).
 * Subsequent callers receive the same initialized instance immediately.
 *
 * The initPromise is allocated BEFORE any constructor call so two concurrent
 * requests never race past the `if (!initPromise)` check.
 */
export async function getTemplateService(): Promise<TemplateLibraryService> {
  if (!initPromise) {
    initPromise = (async () => {
      serviceInstance = new TemplateLibraryService({ storagePath: resolveStoragePath() });
      await serviceInstance.initialize();
    })();
  }
  await initPromise;
  if (!serviceInstance) {
    // Should be unreachable: initPromise always assigns serviceInstance before resolving.
    throw new Error('[templateService] Failed to initialise TemplateLibraryService');
  }
  return serviceInstance;
}

/**
 * Test-only helper: reset the singleton between tests.
 * Not part of the production API surface.
 */
export function __resetTemplateServiceForTests(): void {
  serviceInstance = null;
  initPromise = null;
}
