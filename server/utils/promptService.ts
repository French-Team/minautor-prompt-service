// Server-side singleton for PromptManager with disk persistence.
//
// Strategy:
// - Single instance per Nitro server process (module-level state)
// - Storage path resolved relative to the project root (process.cwd())
// - Auto-initialized on first access — endpoints just `await getPromptService()`
// - Honors PROMPTS_STORAGE_PATH env var (mainly for E2E tests / CI)
// - Race-safe: initPromise is allocated atomically before any object is created,
//   so two concurrent callers cannot initialise two separate service instances.
//
// Note : on instancie le graphe DI complet (6 services) parce que PromptManager
// est le seul orchestrateur de la génération+règles+versions. Côté serveur, on
// n'utilise que la persistance (load/save) — les services DI sont des no-op
// opérationnels car aucun appel à createPrompt côté serveur ; on reste cohérent
// avec l'API client (le client génère, le serveur persiste via storePrompt).

import { join } from 'node:path';

import { IdentityResolver } from '../../src/services/identity-resolver';
import { ContextAnalyzer } from '../../src/services/context-analyzer';
import { RulesIntegrationEngine } from '../../src/services/rules-integration-engine';
import { PromptGenerator } from '../../src/services/prompt-generator';
import { VersionHandler } from '../../src/services/version-handler';
import { AgentAdaptationInterface } from '../../src/services/agent-adaptation';
import { PromptManager } from '../../src/services/prompt-manager';

const DEFAULT_STORAGE_DIR = 'runtime';
const DEFAULT_STORAGE_FILENAME = 'prompts.json';

let serviceInstance: PromptManager | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Resolve the absolute path to the prompts JSON file from the project root.
 */
export function resolveStoragePath(): string {
  const override = process.env.PROMPTS_STORAGE_PATH;
  if (override && override.trim().length > 0) return override;
  return join(process.cwd(), DEFAULT_STORAGE_DIR, DEFAULT_STORAGE_FILENAME);
}

/**
 * Lazy getter for the singleton PromptManager.
 *
 * The first caller triggers `initialize()`, which loads `runtime/prompts.json`
 * (and bootstraps from `runtime/prompts.seed.json` if the user file is missing).
 * Subsequent callers receive the same initialized instance immediately.
 *
 * The initPromise is allocated BEFORE any constructor call so two concurrent
 * requests never race past the `if (!initPromise)` check.
 */
export async function getPromptService(): Promise<PromptManager> {
  if (!initPromise) {
    initPromise = (async () => {
      const identityResolver = new IdentityResolver();
      const contextAnalyzer = new ContextAnalyzer();
      const rulesEngine = new RulesIntegrationEngine();
      const promptGenerator = new PromptGenerator(identityResolver, rulesEngine);
      const versionHandler = new VersionHandler();
      const agentAdapter = new AgentAdaptationInterface();

      serviceInstance = new PromptManager(
        identityResolver,
        contextAnalyzer,
        rulesEngine,
        promptGenerator,
        versionHandler,
        agentAdapter,
        { storagePath: resolveStoragePath() },
      );
      await serviceInstance.initialize();
    })();
  }
  await initPromise;
  if (!serviceInstance) {
    // Should be unreachable: initPromise always assigns serviceInstance before resolving.
    throw new Error('[promptService] Failed to initialise PromptManager');
  }
  return serviceInstance;
}

/**
 * Test-only helper: reset the singleton between tests.
 * Not part of the production API surface.
 */
export function __resetPromptServiceForTests(): void {
  serviceInstance = null;
  initPromise = null;
}
