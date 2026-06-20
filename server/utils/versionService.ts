// Server-side singleton for VersionHandler with disk persistence.
//
// Strategy:
// - Single instance per Nitro server process (module-level state)
// - Storage path resolved relative to the project root (process.cwd())
// - Auto-initialized on first access — endpoints just `await getVersionService()`
// - Honors VERSIONS_STORAGE_PATH env var (mainly for E2E tests / CI)
// - Race-safe: initPromise is allocated atomically before any object is created.
//
// Note : VersionHandler n'a aucune dépendance DI (constructeur vide), donc le
// serveur n'instancie QUE le VersionHandler. Le singleton est par conséquent
// nettement plus léger que promptService (qui instanciait les 6 services DI).

import { join } from 'node:path';

import { VersionHandler } from '../../src/services/version-handler';

const DEFAULT_STORAGE_DIR = 'runtime';
const DEFAULT_STORAGE_FILENAME = 'versions.json';

let serviceInstance: VersionHandler | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Resolve the absolute path to the versions JSON file from the project root.
 */
export function resolveStoragePath(): string {
  const override = process.env.VERSIONS_STORAGE_PATH;
  if (override && override.trim().length > 0) return override;
  return join(process.cwd(), DEFAULT_STORAGE_DIR, DEFAULT_STORAGE_FILENAME);
}

/**
 * Lazy getter for the singleton VersionHandler.
 *
 * The first caller triggers `initialize()`, which loads `runtime/versions.json`
 * (and bootstraps from `runtime/versions.seed.json` if the user file is missing).
 * Subsequent callers receive the same initialized instance immediately.
 *
 * The initPromise is allocated BEFORE any constructor call so two concurrent
 * requests never race past the `if (!initPromise)` check.
 */
export async function getVersionService(): Promise<VersionHandler> {
  if (!initPromise) {
    initPromise = (async () => {
      serviceInstance = new VersionHandler({ storagePath: resolveStoragePath() });
      await serviceInstance.initialize();
    })();
  }
  await initPromise;
  if (!serviceInstance) {
    // Should be unreachable: initPromise always assigns serviceInstance before resolving.
    throw new Error('[versionService] Failed to initialise VersionHandler');
  }
  return serviceInstance;
}

/**
 * Test-only helper: reset the singleton between tests.
 * Not part of the production API surface.
 */
export function __resetVersionServiceForTests(): void {
  serviceInstance = null;
  initPromise = null;
}
