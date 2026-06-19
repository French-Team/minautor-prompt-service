// Integration tests: Cross-service pipeline
// Tests end-to-end flow connecting multiple services through shared models:
// IdentityValidator → IdentityResolver → PromptGenerator → VersionHandler

import { describe, it, expect, beforeEach } from 'vitest';
import { IdentityResolver } from '../../services/identity-resolver';
import { PromptGenerator } from '../../services/prompt-generator';
import { VersionHandler } from '../../services/version-handler';
import { RulesIntegrationEngine } from '../../services/rules-integration-engine';
import { IdentityValidator } from '../../models/validators/identity-validator';
import type { UserIdentity } from '../../models/identity';
import type { ProjectContext } from '../../models/context';
import type { PromptTemplate, TemplateVariables } from '../../models/template';

describe('Cross-service Pipeline: Validator → Resolver → Generator → Version', () => {
  let identityResolver: IdentityResolver;
  let rulesEngine: RulesIntegrationEngine;
  let promptGenerator: PromptGenerator;
  let versionHandler: VersionHandler;
  let identityValidator: IdentityValidator;

  const mockContext: ProjectContext = {
    workFolder: {
      name: 'pipeline-test',
      path: '/pipeline-test',
      type: 'project',
      technologies: ['typescript', 'nuxt'],
      lastModified: new Date(),
    },
    activeFlows: [],
    availableTools: [],
    projectState: {
      phase: 'development',
      completionPercentage: 50,
      activeFeatures: [],
      blockers: [],
    },
    technicalEcosystem: {
      framework: 'nuxt',
      language: 'typescript',
      runtime: 'node',
      dependencies: [],
      buildTools: ['vite'],
    },
  };

  beforeEach(() => {
    identityResolver = new IdentityResolver();
    rulesEngine = new RulesIntegrationEngine();
    promptGenerator = new PromptGenerator(identityResolver, rulesEngine);
    versionHandler = new VersionHandler();
    identityValidator = new IdentityValidator();
  });

  describe('Pipeline: User identity through all layers', () => {
    it('should validate, resolve, generate and version for a User identity', async () => {
      // Step 1: Create and validate identity
      const identity: UserIdentity = {
        type: 'User',
        permissions: [
          { action: 'use_template', resource: 'templates' },
          { action: 'read', resource: 'prompts' },
          { action: 'generate_prompt', resource: 'prompts' },
        ],
        preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
        customizations: [],
      };

      const validation = identityValidator.validate(identity);
      expect(validation.isValid).toBe(true);

      // Step 2: Resolve identity characteristics
      const characteristics = await identityResolver.getIdentityCharacteristics(identity);
      expect(characteristics.identityType).toBe('User');
      expect(characteristics.capabilities).toContain('basic_operations');

      // Step 3: Set identity on resolver
      await identityResolver.setCurrentIdentity(identity);
      const currentIdentity = await identityResolver.getCurrentIdentity();
      expect(currentIdentity.type).toBe('User');

      // Step 4: Generate prompt via PromptGenerator
      const template: PromptTemplate = {
        id: 'pipeline-user-template',
        name: 'Pipeline User Template',
        description: 'Template for pipeline integration test (User)',
        category: 'general',
        template: 'Bonjour {{name}}, bienvenue dans {{project}}.',
        variables: [
          { name: 'name', type: 'string', required: true, description: 'User name' },
          { name: 'project', type: 'string', required: true, description: 'Project name' },
        ],
        identities: ['User', 'Superviseur', 'Responsable'],
        constraints: [],
        version: '1.0.0',
        isPublic: false,
        author: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      const variables: TemplateVariables = {
        name: 'Jean',
        project: 'Mon Projet',
      };

      const generatedPrompt = await promptGenerator.generateComprehensivePrompt(
        template,
        variables,
        identity,
        mockContext,
      );
      expect(generatedPrompt).toBeDefined();
      expect(generatedPrompt.id).toBeDefined();
      expect(generatedPrompt.content).toContain('Jean');
      expect(generatedPrompt.content).toContain('Mon Projet');
      expect(generatedPrompt.identity.type).toBe('User');

      // Step 5: Create version via VersionHandler
      const version = await versionHandler.createVersion(generatedPrompt.id, generatedPrompt.content, {
        changeReason: 'Initial pipeline test',
        performanceMetrics: {
          responseTime: 0,
          successRate: 1.0,
          errorRate: 0,
          userSatisfaction: 0,
          usageFrequency: 0,
        },
      });

      expect(version).toBeDefined();
      expect(version.version).toBe('1.0.0');
      expect(version.content).toContain('Jean');
      expect(version.isActive).toBe(true);

      // Step 6: Verify version history
      const history = await versionHandler.getVersionHistory(generatedPrompt.id);
      expect(history.totalVersions).toBe(1);
      expect(history.currentVersion).toBe('1.0.0');

      // Step 7: Record usage metrics
      await versionHandler.recordUsageMetrics(generatedPrompt.id, version.version, {
        responseTime: 150,
        successRate: 0.95,
        userSatisfaction: 4.5,
      });

      const metrics = await versionHandler.getVersionMetrics(generatedPrompt.id, version.version);
      expect(metrics.responseTime).toBe(150);
      expect(metrics.successRate).toBe(0.95);
    });

    it('should generate and version prompts for all three identity types through the pipeline', async () => {
      const identities: UserIdentity[] = [
        {
          type: 'User',
          permissions: [
            { action: 'use_template', resource: 'templates' },
            { action: 'generate_prompt', resource: 'prompts' },
          ],
          preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
          customizations: [],
        },
        {
          type: 'Superviseur',
          permissions: [
            { action: 'use_template', resource: 'templates' },
            { action: 'generate_prompt', resource: 'prompts' },
          ],
          preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
          customizations: [],
        },
        {
          type: 'Responsable',
          permissions: [
            { action: 'use_template', resource: 'templates' },
            { action: 'generate_prompt', resource: 'prompts' },
          ],
          preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
          customizations: [],
        },
      ];

      const template: PromptTemplate = {
        id: 'pipeline-multi-identity-template',
        name: 'Multi-Identity Template',
        description: 'Template compatible with all identity types',
        category: 'general',
        template: 'Task: {{description}}. Context: {{context}}.',
        variables: [
          { name: 'description', type: 'string', required: true, description: 'Task description' },
          { name: 'context', type: 'string', required: true, description: 'Context' },
        ],
        identities: ['User', 'Superviseur', 'Responsable'],
        constraints: [],
        version: '1.0.0',
        isPublic: false,
        author: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      const variables: TemplateVariables = {
        description: 'Implémenter une nouvelle fonctionnalité',
        context: 'Projet en développement',
      };

      const promptIds: string[] = [];

      for (let i = 0; i < identities.length; i++) {
        const identity = identities[i];

        // Validate
        expect(identityValidator.validate(identity).isValid).toBe(true);

        // Resolve
        const characteristics = await identityResolver.getIdentityCharacteristics(identity);
        expect(characteristics.identityType).toBe(identity.type);

        // Generate
        const prompt = await promptGenerator.generateComprehensivePrompt(template, variables, identity, mockContext);
        expect(prompt.content).toContain('Implémenter');
        expect(prompt.identity.type).toBe(identity.type);
        promptIds.push(prompt.id);

        // Version
        const version = await versionHandler.createVersion(prompt.id, prompt.content, {
          changeReason: `Pipeline test for ${identity.type}`,
          performanceMetrics: {
            responseTime: 0,
            successRate: 1.0,
            errorRate: 0,
            userSatisfaction: 0,
            usageFrequency: 0,
          },
        });
        expect(version.isActive).toBe(true);
      }

      // Verify each prompt has its own version history
      for (const promptId of promptIds) {
        const history = await versionHandler.getVersionHistory(promptId);
        expect(history.totalVersions).toBe(1);
      }
    });
  });

  describe('Pipeline: Error propagation across services', () => {
    it('should reject invalid identity at the model level before reaching services', async () => {
      const invalidIdentity = {
        type: 'InvalidType',
        permissions: [],
        preferences: { language: '', responseStyle: 'invalid', technicalLevel: 'invalid' },
        customizations: [],
      } as unknown as UserIdentity;

      // Model validator rejects it
      const validation = identityValidator.validate(invalidIdentity);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Resolver will throw when trying to resolve characteristics
      await expect(identityResolver.getIdentityCharacteristics(invalidIdentity)).rejects.toThrow(
        'Unknown identity type: InvalidType',
      );
    });

    it('should reject identity incompatible with template identities', async () => {
      const identity: UserIdentity = {
        type: 'User',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      };

      // Model: identity structure is valid
      expect(identityValidator.validate(identity).isValid).toBe(true);

      // Template only allows Superviseur — User should be rejected
      const template: PromptTemplate = {
        id: 'perm-test-template',
        name: 'Permission Test',
        description: 'Template for permission test',
        category: 'general',
        template: 'Test {{name}}',
        variables: [{ name: 'name', type: 'string', required: true, description: 'Name' }],
        identities: ['Superviseur'], // Only Superviseur, NOT User
        constraints: [],
        version: '1.0.0',
        isPublic: false,
        author: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      const variables: TemplateVariables = { name: 'Test' };

      // Should fail because template is not compatible with identity type User
      await expect(
        promptGenerator.generateComprehensivePrompt(template, variables, identity, mockContext),
      ).rejects.toThrow('not compatible with identity type');
    });
  });

  describe('Pipeline: Context enrichment through services', () => {
    it('should generate prompts with context enrichment across the pipeline', async () => {
      const identity: UserIdentity = {
        type: 'User',
        permissions: [
          { action: 'use_template', resource: 'templates' },
          { action: 'read', resource: 'prompts' },
        ],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      };

      expect(identityValidator.validate(identity).isValid).toBe(true);

      // Create context with flow data and tools
      const richContext: ProjectContext = {
        workFolder: {
          name: 'rich-context-project',
          path: '/rich',
          type: 'project',
          technologies: ['typescript', 'nuxt', 'node'],
          lastModified: new Date(),
        },
        activeFlows: [
          {
            id: 'auth-flow',
            name: 'Authentication Flow',
            status: 'active',
            progress: 75,
            currentStep: 'Implementation',
          },
          { id: 'test-flow', name: 'Testing Flow', status: 'active', progress: 30, currentStep: 'Setup' },
        ],
        availableTools: [
          { name: 'typescript', version: '5.0.0', isAvailable: true, capabilities: ['type-checking'] },
          { name: 'vitest', version: '1.0.0', isAvailable: true, capabilities: ['testing'] },
        ],
        projectState: {
          phase: 'development',
          completionPercentage: 60,
          activeFeatures: ['authentication', 'dashboard'],
          blockers: [],
        },
        technicalEcosystem: {
          framework: 'nuxt',
          language: 'typescript',
          runtime: 'node',
          dependencies: [
            { name: 'nuxt', version: '3.8.0', type: 'runtime', isOutdated: false },
            { name: 'vue', version: '3.3.0', type: 'runtime', isOutdated: false },
          ],
          buildTools: ['vite', 'typescript'],
        },
      };

      // Generate prompt with enriched context
      const template: PromptTemplate = {
        id: 'context-enrich-template',
        name: 'Context Enrich Template',
        description: 'Template for context enrichment test',
        category: 'technical',
        template: 'Développez {{feature}} en utilisant {{tech}}.',
        variables: [
          { name: 'feature', type: 'string', required: true, description: 'Feature' },
          { name: 'tech', type: 'string', required: true, description: 'Technology' },
        ],
        identities: ['User'],
        constraints: [],
        version: '1.0.0',
        isPublic: false,
        author: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      const variables: TemplateVariables = {
        feature: 'authentification',
        tech: 'TypeScript',
      };

      const prompt = await promptGenerator.generateComprehensivePrompt(template, variables, identity, richContext);
      expect(prompt.context.workFolder.name).toBe('rich-context-project');
      expect(prompt.context.activeFlows).toHaveLength(2);
      expect(prompt.context.availableTools).toHaveLength(2);

      // Create version with the enriched context data
      const version = await versionHandler.createVersion(prompt.id, prompt.content, {
        changeReason: 'Context enrichment test',
        performanceMetrics: {
          responseTime: 0,
          successRate: 1.0,
          errorRate: 0,
          userSatisfaction: 0,
          usageFrequency: 0,
        },
      });

      expect(version.content).toContain('authentification');
      expect(version.content).toContain('TypeScript');
    });
  });

  describe('Pipeline: Version analytics after generation', () => {
    it('should create, use, and analyze versions from generated prompts', async () => {
      const identity: UserIdentity = {
        type: 'User',
        permissions: [
          { action: 'use_template', resource: 'templates' },
          { action: 'read', resource: 'prompts' },
        ],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      };

      expect(identityValidator.validate(identity).isValid).toBe(true);

      // Generate initial prompt
      const template: PromptTemplate = {
        id: 'analytics-template',
        name: 'Analytics Template',
        description: 'Template for analytics pipeline test',
        category: 'technical',
        template: 'Build {{component}} with {{language}}.',
        variables: [
          { name: 'component', type: 'string', required: true, description: 'Component type' },
          { name: 'language', type: 'string', required: true, description: 'Language' },
        ],
        identities: ['User'],
        constraints: [],
        version: '1.0.0',
        isPublic: false,
        author: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      let variables: TemplateVariables = { component: 'API', language: 'TypeScript' };
      const prompt = await promptGenerator.generateComprehensivePrompt(template, variables, identity, mockContext);

      // Create version 1
      await versionHandler.createVersion(prompt.id, prompt.content, {
        changeReason: 'Initial version',
        performanceMetrics: { responseTime: 0, successRate: 1.0, errorRate: 0, userSatisfaction: 0, usageFrequency: 0 },
      });

      // Record usage for version 1
      await versionHandler.recordUsageMetrics(prompt.id, '1.0.0', {
        responseTime: 200,
        successRate: 0.9,
        userSatisfaction: 4.0,
      });

      // Create version 2 (update content)
      variables = { component: 'Dashboard', language: 'TypeScript' };
      const promptV2 = await promptGenerator.generateComprehensivePrompt(template, variables, identity, mockContext);

      await versionHandler.createVersion(promptV2.id, promptV2.content, {
        changeReason: 'Updated component',
        performanceMetrics: { responseTime: 0, successRate: 1.0, errorRate: 0, userSatisfaction: 0, usageFrequency: 0 },
      });

      // Record usage for version 2
      await versionHandler.recordUsageMetrics(promptV2.id, '1.0.0', {
        responseTime: 100,
        successRate: 0.98,
        userSatisfaction: 4.5,
      });

      // Get analytics
      const analytics = await versionHandler.getVersionAnalytics(prompt.id);
      expect(analytics.totalVersions).toBe(1);
      expect(analytics.activeVersion).toBe('1.0.0');

      // Add user feedback
      await versionHandler.addUserFeedback(prompt.id, '1.0.0', {
        userId: 'test-user',
        rating: 4,
        comment: 'Good prompt',
        helpful: true,
      });

      const feedback = await versionHandler.getVersionFeedback(prompt.id, '1.0.0');
      expect(feedback).toHaveLength(1);
      expect(feedback[0].rating).toBe(4);
    });
  });
});
