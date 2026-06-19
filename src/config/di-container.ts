// Dependency Injection Container

import type { AppConfig } from './app.config';

// Service interfaces for DI
export interface IIdentityResolver {
  getCurrentIdentity(): Promise<import('../models/identity').UserIdentity>;
  setCurrentIdentity(_identity: import('../models/identity').UserIdentity): Promise<void>;
  getIdentityCharacteristics(
    _identity: import('../models/identity').UserIdentity,
  ): Promise<import('../models/identity').IdentityProfile>;
  validateIdentityPermissions(_identity: import('../models/identity').UserIdentity, _action: string): Promise<boolean>;
}

export interface IContextAnalyzer {
  analyzeProjectContext(): Promise<import('../models/context').ProjectContext>;
  getFlowState(): Promise<import('../models/context').FlowState>;
  detectContextChanges(): import('../services/context-analyzer').ContextChangeObservable;
  enrichContext(
    _baseContext: import('../models/context').ProjectContext,
  ): Promise<import('../models/context').EnrichedContext>;
  isDegradedMode(): boolean;
  setWorkFolder(_path: string): void;
  clearCache(): void;
  validateFolder(_path: string): Promise<boolean>;
}

export interface IRulesIntegrationEngine {
  applyRules(
    _prompt: import('../models/prompt').BasePrompt,
    _context: import('../models/context').ProjectContext,
  ): Promise<import('../models/rule').RuleEnrichedPrompt>;
  validateRuleConsistency(
    _rules: import('../models/rule').Rule[],
  ): Promise<import('../models/rule').ConsistencyCheckResult>;
  detectRuleConflicts(_rules: import('../models/rule').Rule[]): Promise<{
    conflicts: import('../models/rule').RuleConflict[];
    resolutions: import('../models/rule').ConflictResolution[];
  }>;
}

export interface IPromptGenerator {
  generateFromTemplate(_template: unknown, _variables: unknown): Promise<unknown>;
  adaptForAgent(_prompt: unknown, _agentType: string): Promise<unknown>;
  applyPersonalization(_prompt: unknown, _preferences: unknown): Promise<unknown>;
  generateComprehensivePrompt(
    _template: unknown,
    _variables: unknown,
    _identity: unknown,
    _context: unknown,
  ): Promise<unknown>;
  validateTemplateCompatibility?(_template: unknown, _identity: unknown): Promise<boolean>;
}

export interface IVersionHandler {
  createVersion(
    _promptId: string,
    _content: string,
    _metadata: import('../models/version').VersionMetadata,
  ): Promise<import('../models/version').PromptVersion>;
  getVersionHistory(
    _promptId: string,
    _options?: import('../services/version-handler').VersionQueryOptions,
  ): Promise<import('../models/version').VersionHistory>;
  rollbackToVersion(_promptId: string, _version: string): Promise<import('../models/version').PromptVersion>;
  recordUsageMetrics(
    _promptId: string,
    _version: string,
    _metrics: Partial<import('../models/version').PerformanceMetrics>,
  ): Promise<void>;
  getVersionMetrics(_promptId: string, _version: string): Promise<import('../models/version').PerformanceMetrics>;
  getVersionAnalytics(_promptId: string): Promise<import('../services/version-handler').VersionAnalytics>;
  compareVersions(
    _promptId: string,
    _version1: string,
    _version2: string,
  ): Promise<import('../models/version').VersionComparison>;
  addUserFeedback(
    _promptId: string,
    _version: string,
    _feedback: Omit<import('../models/version').UserFeedback, 'timestamp'>,
  ): Promise<void>;
  getVersionFeedback(_promptId: string, _version: string): Promise<import('../models/version').UserFeedback[]>;
}

export interface IAgentAdaptationInterface {
  adaptPromptForAgent(_prompt: unknown, _agentType: string): Promise<unknown>;
  getSupportedAgents(): string[];
  validateAgentCompatibility(_prompt: unknown, _agentType: string): boolean;
  getAgentCapabilities?(_agentType: string): unknown;
  detectBestAgent?(_prompt: unknown): string;
  validateAgentCompatibilityDetailed?(_prompt: unknown, _agentType: string): unknown;
}

export interface IPromptManager {
  generatePrompt(_identity: unknown, _context: unknown): Promise<unknown>;
  updatePrompt(_promptId: string, _updates: unknown): Promise<unknown>;
  getPromptHistory(_promptId: string): Promise<unknown[]>;
  optimizePrompts(_criteria: unknown): Promise<unknown>;
}

// Type compatible avec l'interface privée FileSystem de ContextAnalyzer
export interface FsLike {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding?: string): string;
  statSync(path: string): { mtime: Date };
  readdirSync(path: string, options?: { withFileTypes?: boolean }): { name: string; isDirectory: () => boolean }[];
}

// DI Container class
export class DIContainer {
  private services = new Map<
    string,
    { factory: (_container: DIContainer) => unknown | Promise<unknown>; singleton: boolean }
  >();
  private singletons = new Map<string, unknown>();

  constructor(private _config: AppConfig) {}

  // Register a service
  register<T>(name: string, factory: (_container: DIContainer) => T | Promise<T>, singleton = false): void {
    this.services.set(name, { factory, singleton });
  }

  // Resolve a service
  async resolve<T>(name: string): Promise<T> {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        const instance = await service.factory(this);
        this.singletons.set(name, instance);
      }
      return this.singletons.get(name) as T;
    }

    return (await service.factory(this)) as T;
  }

  // Get configuration
  getConfig(): AppConfig {
    return this._config;
  }

  // Register all core services
  registerCoreServices(options?: { fs?: FsLike }): void {
    // Placeholder implementations - will be replaced with actual services
    this.register(
      'identityResolver',
      async () => {
        const { IdentityResolver } = await import('../services/identity-resolver');
        return new IdentityResolver();
      },
      true,
    );

    this.register(
      'contextAnalyzer',
      async () => {
        const { ContextAnalyzer } = await import('../services/context-analyzer');
        return new ContextAnalyzer(options?.fs as FsLike);
      },
      true,
    );

    this.register(
      'rulesIntegrationEngine',
      async () => {
        const { RulesIntegrationEngine } = await import('../services/rules-integration-engine');
        return new RulesIntegrationEngine();
      },
      true,
    );

    this.register(
      'promptGenerator',
      async (container) => {
        const identityResolver = await container.resolve<IIdentityResolver>('identityResolver');
        const rulesEngine = await container.resolve<IRulesIntegrationEngine>('rulesIntegrationEngine');
        const { PromptGenerator } = await import('../services/prompt-generator');
        return new PromptGenerator(identityResolver, rulesEngine);
      },
      true,
    );

    this.register(
      'versionHandler',
      async () => {
        const { VersionHandler } = await import('../services/version-handler');
        return new VersionHandler();
      },
      true,
    );

    this.register(
      'agentAdaptationInterface',
      async () => {
        const { AgentAdaptationInterface } = await import('../services/agent-adaptation');
        return new AgentAdaptationInterface();
      },
      true,
    );

    this.register(
      'promptManager',
      async (container) => {
        const identityResolver = await container.resolve<IIdentityResolver>('identityResolver');
        const contextAnalyzer = await container.resolve<IContextAnalyzer>('contextAnalyzer');
        const rulesEngine = await container.resolve<IRulesIntegrationEngine>('rulesIntegrationEngine');
        const promptGenerator = await container.resolve<IPromptGenerator>('promptGenerator');
        const versionHandler = await container.resolve<IVersionHandler>('versionHandler');
        const agentAdapter = await container.resolve<IAgentAdaptationInterface>('agentAdaptationInterface');

        const { PromptManager } = await import('../services/prompt-manager');
        return new PromptManager(
          identityResolver,
          contextAnalyzer,
          rulesEngine,
          promptGenerator,
          versionHandler,
          agentAdapter,
        );
      },
      true,
    );
  }
}

// Factory function to create configured DI container
export function createDIContainer(config: AppConfig, options?: { fs?: FsLike }): DIContainer {
  const container = new DIContainer(config);
  container.registerCoreServices(options);
  return container;
}
