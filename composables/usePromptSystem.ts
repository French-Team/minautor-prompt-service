import type { IIdentityResolver, IContextAnalyzer } from '../src/config/di-container';
import type { UserIdentity } from '../src/models/identity';

// Composable qui expose le système de prompts et des helpers prêts à l'emploi.
// Les types des services sont déclarés via `types/prompt-system.d.ts`.

export const usePromptSystem = () => {
  const {
    $promptSystem,
    $identityResolver,
    $contextAnalyzer,
    $rulesIntegrationEngine,
    $promptGenerator,
    $versionHandler,
    $agentAdaptationInterface,
    $promptManager,
  } = useNuxtApp();

  return {
    system: $promptSystem,
    identityResolver: $identityResolver as IIdentityResolver,
    contextAnalyzer: $contextAnalyzer as IContextAnalyzer,
    rulesIntegrationEngine: $rulesIntegrationEngine,
    promptGenerator: $promptGenerator,
    versionHandler: $versionHandler,
    agentAdaptationInterface: $agentAdaptationInterface,
    promptManager: $promptManager,

    // Helpers haut-niveau
    async getCurrentIdentity(): Promise<unknown> {
      return await $identityResolver.getCurrentIdentity();
    },
    async setCurrentIdentity(identity: unknown): Promise<void> {
      return await $identityResolver.setCurrentIdentity(identity as UserIdentity);
    },
    async analyzeContext(): Promise<unknown> {
      return await $contextAnalyzer.analyzeProjectContext();
    },
    isDegradedMode: () => ($contextAnalyzer as IContextAnalyzer).isDegradedMode(),
    setWorkFolder: (path: string) => ($contextAnalyzer as IContextAnalyzer).setWorkFolder(path),
    clearCache: () => ($contextAnalyzer as IContextAnalyzer).clearCache(),
    validateFolder: (path: string) => ($contextAnalyzer as IContextAnalyzer).validateFolder(path),
  };
};

// Helper : crée une identité par défaut pour un type donné
export const createDefaultIdentity = (type: 'User' | 'Superviseur' | 'Responsable'): Record<string, unknown> => {
  const basePermissions: Record<string, Array<{ action: string; resource: string }>> = {
    User: [
      { action: 'read', resource: 'prompt' },
      { action: 'use_template', resource: 'template' },
    ],
    Superviseur: [
      { action: 'read', resource: 'prompt' },
      { action: 'use_template', resource: 'template' },
      { action: 'optimize', resource: 'prompt' },
      { action: 'review', resource: 'prompt' },
    ],
    Responsable: [
      { action: 'read', resource: 'prompt' },
      { action: 'use_template', resource: 'template' },
      { action: 'optimize', resource: 'prompt' },
      { action: 'review', resource: 'prompt' },
      { action: 'validate', resource: 'prompt' },
      { action: 'rollback', resource: 'version' },
      { action: 'delete', resource: 'prompt' },
    ],
  };

  return {
    type,
    permissions: basePermissions[type],
    preferences: {
      language: 'fr',
      responseStyle: 'balanced',
      technicalLevel: 'intermediate',
    },
    customizations: [],
  };
};

// Helper : crée un contexte projet factice (l'analyseur réel lit le FS, ce qu'on
// ne peut pas faire dans le navigateur — on simule donc via cette fonction).
export const createMockContext = (): Record<string, unknown> => {
  const now = new Date();
  return {
    workFolder: {
      path: 'h:/SEPTEMBRE-2025/flux-de-travail',
      name: 'flux-de-travail',
      type: 'project',
      technologies: ['TypeScript', 'Nuxt 3', 'Tailwind CSS'],
      lastModified: now,
    },
    activeFlows: [
      { id: 'f1', name: 'Migration UI', status: 'active', progress: 65, currentStep: 'Pages' },
      { id: 'f2', name: 'Refactor services', status: 'paused', progress: 30, currentStep: 'DI container' },
    ],
    availableTools: [
      { name: 'Nuxt', version: '3.9', isAvailable: true, capabilities: ['SSR', 'SSG', 'Routing'] },
      { name: 'Tailwind', version: '3.4', isAvailable: true, capabilities: ['Utility CSS'] },
    ],
    projectState: {
      phase: 'development',
      completionPercentage: 55,
      activeFeatures: ['Prompts', 'Templates', 'Identities'],
      blockers: [],
    },
    technicalEcosystem: {
      framework: 'Nuxt 3',
      language: 'TypeScript',
      runtime: 'Node 20',
      dependencies: [
        { name: 'nuxt', version: '^3.9.0', type: 'dev', isOutdated: false },
        { name: 'tailwindcss', version: '^3.4', type: 'dev', isOutdated: false },
      ],
      buildTools: ['vite', 'esbuild'],
    },
  };
};

// Helper : crée un template par défaut pour les tests
export const createMockTemplate = (id = 'tpl-1'): Record<string, unknown> => ({
  id,
  name: 'Template de revue de code',
  description: "Génère un prompt de revue de code adapté à l'identité choisie.",
  category: 'technical',
  identities: ['User', 'Superviseur', 'Responsable'],
  template: 'En tant que {{role}}, effectue une revue de code sur le fichier {{file}}. Concentre-toi sur : {{focus}}.',
  variables: [
    { name: 'role', type: 'string', required: true, description: 'Rôle attendu' },
    { name: 'file', type: 'string', required: true, description: 'Chemin du fichier' },
    { name: 'focus', type: 'string', required: false, defaultValue: 'qualité', description: 'Focus de la revue' },
  ],
  constraints: [],
  version: '1.0.0',
  isPublic: true,
  author: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
  usageCount: 0,
});
