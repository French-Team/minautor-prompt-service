// Déclarations de types pour les services fournis par `plugins/prompt-system.client.ts`.

import type {
  IIdentityResolver,
  IContextAnalyzer,
  IRulesIntegrationEngine,
  IPromptGenerator,
  IVersionHandler,
  IAgentAdaptationInterface,
  IPromptManager,
} from '../src/config/di-container';
import type { createPromptSystem } from '../src/index';

declare module '#app' {
  interface NuxtApp {
    $promptSystem: ReturnType<typeof createPromptSystem>;
    $identityResolver: IIdentityResolver;
    $contextAnalyzer: IContextAnalyzer;
    $rulesIntegrationEngine: IRulesIntegrationEngine;
    $promptGenerator: IPromptGenerator;
    $versionHandler: IVersionHandler;
    $agentAdaptationInterface: IAgentAdaptationInterface;
    $promptManager: IPromptManager;
  }
}

export {};
