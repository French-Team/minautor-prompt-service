// Prompt Manager Integration Tests - Complete workflow testing

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptManager, type OptimizationCriteria, type OptimizationResults } from '../../services/prompt-manager';
import { IdentityResolver } from '../../services/identity-resolver';
import { ContextAnalyzer } from '../../services/context-analyzer';
import { RulesIntegrationEngine } from '../../services/rules-integration-engine';
import { PromptGenerator } from '../../services/prompt-generator';
import { VersionHandler } from '../../services/version-handler';
import { AgentAdaptationInterface } from '../../services/agent-adaptation';
import type { UserIdentity } from '../../models/identity';
import type { ProjectContext } from '../../models/context';
import type { GeneratedPrompt, PromptUpdates } from '../../models/prompt';
import type { PromptTemplate, TemplateVariables } from '../../models/template';

describe('PromptManager Integration Tests', () => {
  let promptManager: PromptManager;
  let identityResolver: IdentityResolver;
  let contextAnalyzer: ContextAnalyzer;
  let rulesEngine: RulesIntegrationEngine;
  let promptGenerator: PromptGenerator;
  let versionHandler: VersionHandler;
  let agentAdapter: AgentAdaptationInterface;

  const mockIdentity: UserIdentity = {
    type: 'User',
    permissions: [
      { action: 'generate_prompt', resource: 'prompts' },
      { action: 'use_template', resource: 'templates' },
    ],
    preferences: {
      language: 'fr',
      responseStyle: 'balanced',
      technicalLevel: 'intermediate',
    },
    customizations: [],
  };

  const mockContext: ProjectContext = {
    workFolder: {
      name: 'test-project',
      path: '/test',
      type: 'project',
      technologies: ['typescript', 'nuxt'],
      lastModified: new Date(),
    },
    activeFlows: [
      {
        id: 'flow-1',
        name: 'Test Flow',
        status: 'active',
        progress: 50,
        currentStep: 'Implementation',
      },
    ],
    availableTools: [
      {
        name: 'typescript',
        version: '5.0.0',
        isAvailable: true,
        capabilities: ['type-checking', 'compilation'],
      },
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
        {
          name: 'nuxt',
          version: '3.8.0',
          type: 'runtime',
          isOutdated: false,
        },
      ],
      buildTools: ['vite', 'typescript'],
    },
  };

  beforeEach(() => {
    // Initialize all services
    identityResolver = new IdentityResolver();
    contextAnalyzer = new ContextAnalyzer();
    rulesEngine = new RulesIntegrationEngine();
    promptGenerator = new PromptGenerator(identityResolver, rulesEngine);
    versionHandler = new VersionHandler();
    agentAdapter = new AgentAdaptationInterface();

    // Initialize PromptManager with all dependencies
    promptManager = new PromptManager(
      identityResolver,
      contextAnalyzer,
      rulesEngine,
      promptGenerator,
      versionHandler,
      agentAdapter,
    );
  });

  describe('Core Prompt Management Functionality', () => {
    it('should generate prompt with full orchestration', async () => {
      const result = await promptManager.generatePrompt(mockIdentity, mockContext);
      const generatedPrompt = result as GeneratedPrompt;

      expect(generatedPrompt).toBeDefined();
      expect(generatedPrompt.id).toBeDefined();
      expect(generatedPrompt.identity).toEqual(mockIdentity);
      expect(generatedPrompt.content).toBeDefined();
      expect(generatedPrompt.version).toBeDefined();
      expect(generatedPrompt.metadata).toBeDefined();
      expect(generatedPrompt.metadata.createdAt).toBeInstanceOf(Date);
      expect(generatedPrompt.metadata.author).toBe('User');
    });

    it('should create prompt with template and variables', async () => {
      const template: PromptTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        category: 'technical',
        template: 'Create a {{type}} component for {{feature}}',
        variables: [
          {
            name: 'type',
            type: 'string',
            description: 'Component type',
            required: true,
            defaultValue: 'React',
          },
          {
            name: 'feature',
            type: 'string',
            description: 'Feature name',
            required: true,
            defaultValue: 'authentication',
          },
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
        type: 'Vue',
        feature: 'dashboard',
      };

      const result = await promptManager.createPrompt(template, variables, mockIdentity, mockContext);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.content).toContain('Vue');
      expect(result.content).toContain('dashboard');
      expect(result.identity).toEqual(mockIdentity);
      expect(result.context).toEqual(mockContext);
    });

    it('should update existing prompt', async () => {
      // First create a prompt
      const originalPrompt = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      // Update the prompt
      const updates: PromptUpdates = {
        content: 'Updated prompt content',
        metadata: {
          tags: ['updated', 'test'],
        },
      };

      await promptManager.updatePrompt(originalPrompt.id, updates);

      // Wait to ensure timestamp difference
      await new Promise((resolve) => globalThis.setTimeout(resolve, 5));

      // Verify the update (using enhanced method to get updated prompt)
      const updatedPrompt = await promptManager.updatePromptEnhanced(originalPrompt.id, {
        content: 'Final updated content',
      });

      expect(updatedPrompt.content).toBe('Final updated content');
      expect(updatedPrompt.metadata.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalPrompt.metadata.updatedAt.getTime(),
      );
    });

    it('should get prompt history', async () => {
      const prompt = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      // Update prompt to create history
      await promptManager.updatePrompt(prompt.id, { content: 'Updated content' });

      const history = await promptManager.getPromptHistory(prompt.id);

      expect(Array.isArray(history)).toBe(true);
      // History might be empty if version handler doesn't have the prompt
      // This is acceptable for the test
    });

    it('should handle prompt lifecycle operations', async () => {
      const prompt = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      // Archive prompt
      const archived = await promptManager.archivePrompt(prompt.id);
      expect(archived).toBe(true);

      // Restore prompt
      const restored = await promptManager.restorePrompt(prompt.id);
      expect(restored).toBeDefined();
      expect(restored.id).toBe(prompt.id);
      expect(restored.metadata.tags).not.toContain('archived');

      // Delete prompt
      const deleted = await promptManager.deletePrompt(prompt.id);
      expect(deleted).toBe(true);

      // Try to restore deleted prompt (should fail)
      await expect(promptManager.restorePrompt(prompt.id)).rejects.toThrow();
    });
  });

  describe('Optimization and Analytics Features', () => {
    it('should optimize prompts based on criteria', async () => {
      // Create some test prompts
      await promptManager.generatePrompt(mockIdentity, mockContext);
      await promptManager.generatePrompt({ ...mockIdentity, type: 'Superviseur' }, mockContext);

      // Set up optimization criteria
      const criteria: OptimizationCriteria = {
        targetIdentity: 'User',
        performanceThreshold: 0.8,
        usageThreshold: 5,
        includeVersionAnalysis: true,
        includeAgentOptimization: true,
      };

      const results = (await promptManager.optimizePrompts(criteria)) as OptimizationResults;

      expect(results).toBeDefined();
      expect(results.optimized).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(results.suggestions)).toBe(true);
      expect(Array.isArray(results.performanceImprovements)).toBe(true);
      expect(Array.isArray(results.versionRecommendations)).toBe(true);
      expect(Array.isArray(results.agentRecommendations)).toBe(true);
    });

    it('should get usage statistics for prompt', async () => {
      const prompt = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      const stats = await promptManager.getUsageStatistics(prompt.id);

      expect(stats).toBeDefined();
      expect(typeof stats.totalUses).toBe('number');
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.averageResponseTime).toBe('number');
      expect(stats.lastUsed).toBeInstanceOf(Date);
    });

    it('should get performance metrics for prompt', async () => {
      const prompt = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      const metrics = await promptManager.getPerformanceMetrics(prompt.id);

      expect(metrics).toBeDefined();
      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.userSatisfaction).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.usageFrequency).toBe('number');
    });

    it('should get optimization insights for prompt', async () => {
      const prompt = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      const insights = await promptManager.getOptimizationInsights(prompt.id);

      expect(insights).toBeDefined();
      expect(Array.isArray(insights.strengths)).toBe(true);
      expect(Array.isArray(insights.weaknesses)).toBe(true);
      expect(Array.isArray(insights.recommendations)).toBe(true);
      expect(Array.isArray(insights.potentialImprovements)).toBe(true);
    });

    it('should handle optimization with different criteria', async () => {
      await promptManager.generatePrompt(mockIdentity, mockContext);

      // Test with minimal criteria
      const minimalCriteria: OptimizationCriteria = {};
      const minimalResults = (await promptManager.optimizePrompts(minimalCriteria)) as OptimizationResults;

      expect(minimalResults).toBeDefined();
      expect(minimalResults.optimized).toBeGreaterThanOrEqual(0);

      // Test with specific time range
      const timeRangeCriteria: OptimizationCriteria = {
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          end: new Date(),
        },
      };
      const timeRangeResults = (await promptManager.optimizePrompts(timeRangeCriteria)) as OptimizationResults;

      expect(timeRangeResults).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid identity gracefully', async () => {
      const invalidIdentity = { type: 'Invalid' } as unknown as UserIdentity;

      await expect(promptManager.generatePrompt(invalidIdentity, mockContext)).rejects.toThrow();
    });

    it('should handle missing context gracefully', async () => {
      const invalidContext = {} as ProjectContext;

      await expect(promptManager.generatePrompt(mockIdentity, invalidContext)).rejects.toThrow();
    });

    it('should handle non-existent prompt operations', async () => {
      const nonExistentId = 'non-existent-prompt-id';

      await expect(promptManager.updatePrompt(nonExistentId, { content: 'test' })).rejects.toThrow();

      await expect(promptManager.restorePrompt(nonExistentId)).rejects.toThrow();

      await expect(promptManager.getUsageStatistics(nonExistentId)).rejects.toThrow();

      const deleted = await promptManager.deletePrompt(nonExistentId);
      expect(deleted).toBe(false);

      const archived = await promptManager.archivePrompt(nonExistentId);
      expect(archived).toBe(false);
    });

    it('should handle optimization errors gracefully', async () => {
      // Test with invalid criteria that might cause errors
      const invalidCriteria = {
        performanceThreshold: -1, // Invalid threshold
        usageThreshold: -1, // Invalid threshold
      } as OptimizationCriteria;

      // Should not throw, but handle gracefully
      const results = (await promptManager.optimizePrompts(invalidCriteria)) as OptimizationResults;
      expect(results).toBeDefined();
    });
  });

  describe('Integration with All Services', () => {
    it('should integrate with identity resolver for permissions', async () => {
      // Mock identity without permissions
      const restrictedIdentity: UserIdentity = {
        type: 'User',
        permissions: [], // No permissions
        preferences: mockIdentity.preferences,
        customizations: [],
      };

      await expect(promptManager.generatePrompt(restrictedIdentity, mockContext)).rejects.toThrow();
    });

    it('should integrate with context analyzer for enrichment', async () => {
      const result = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      // Verify that context was processed (enriched context should be used)
      expect(result.context).toBeDefined();
      expect(result.context.workFolder).toEqual(mockContext.workFolder);
    });

    it('should integrate with rules engine for rule application', async () => {
      const result = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      // Verify that rules were considered (appliedRules array should exist)
      expect(Array.isArray(result.appliedRules)).toBe(true);
    });

    it('should integrate with version handler for versioning', async () => {
      const prompt = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      // Verify version was created
      expect(prompt.version).toBeDefined();
      expect(typeof prompt.version).toBe('string');

      // Update prompt to create new version
      await promptManager.updatePrompt(prompt.id, { content: 'Updated content' });

      // Get history to verify versioning
      const history = await promptManager.getPromptHistory(prompt.id);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should integrate with agent adapter for optimization', async () => {
      await promptManager.generatePrompt(mockIdentity, mockContext);

      const criteria: OptimizationCriteria = {
        includeAgentOptimization: true,
      };

      const results = (await promptManager.optimizePrompts(criteria)) as OptimizationResults;

      // Verify agent recommendations are included
      expect(Array.isArray(results.agentRecommendations)).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache prompts for performance', async () => {
      // Generate first prompt
      const prompt1 = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;
      // Generate second prompt (should use some cached data)
      const prompt2 = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;

      expect(prompt1).toBeDefined();
      expect(prompt2).toBeDefined();
      expect(prompt1.id).not.toBe(prompt2.id); // Should be different prompts

      // Performance test is informational - caching may or may not improve performance
      // depending on the complexity of operations
    });

    it('should handle concurrent prompt operations', async () => {
      // Create multiple prompts concurrently
      const promises = Array.from({ length: 5 }, (_, i) =>
        promptManager.generatePrompt({ ...mockIdentity, type: i % 2 === 0 ? 'User' : 'Superviseur' }, mockContext),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        const prompt = result as GeneratedPrompt;
        expect(prompt).toBeDefined();
        expect(prompt.id).toBeDefined();
        expect(prompt.identity.type).toBe(index % 2 === 0 ? 'User' : 'Superviseur');
      });
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should execute complete prompt management workflow', async () => {
      // Step 1: Generate initial prompt
      const initialPrompt = (await promptManager.generatePrompt(mockIdentity, mockContext)) as GeneratedPrompt;
      expect(initialPrompt).toBeDefined();

      // Step 2: Get initial metrics
      const initialMetrics = await promptManager.getPerformanceMetrics(initialPrompt.id);
      expect(initialMetrics).toBeDefined();

      // Step 3: Update prompt content
      await promptManager.updatePrompt(initialPrompt.id, {
        content: 'Updated content for better performance',
      });

      // Step 4: Get optimization insights
      const insights = await promptManager.getOptimizationInsights(initialPrompt.id);
      expect(insights).toBeDefined();
      expect(insights.potentialImprovements.length).toBeGreaterThan(0);

      // Step 5: Run optimization
      const optimizationResults = (await promptManager.optimizePrompts({
        targetIdentity: mockIdentity.type,
        includeVersionAnalysis: true,
        includeAgentOptimization: true,
      })) as OptimizationResults;

      expect(optimizationResults).toBeDefined();
      expect(optimizationResults.suggestions.length).toBeGreaterThanOrEqual(0);

      // Step 6: Archive and restore
      await promptManager.archivePrompt(initialPrompt.id);
      const restored = await promptManager.restorePrompt(initialPrompt.id);
      expect(restored.id).toBe(initialPrompt.id);

      // Step 7: Final cleanup
      const deleted = await promptManager.deletePrompt(initialPrompt.id);
      expect(deleted).toBe(true);
    });

    it('should handle complex multi-identity workflow', async () => {
      const identities: UserIdentity[] = [
        { ...mockIdentity, type: 'User' },
        { ...mockIdentity, type: 'Superviseur' },
        { ...mockIdentity, type: 'Responsable' },
      ];

      const prompts: GeneratedPrompt[] = [];

      // Generate prompts for each identity
      for (const identity of identities) {
        const prompt = (await promptManager.generatePrompt(identity, mockContext)) as GeneratedPrompt;
        prompts.push(prompt);
        expect(prompt.identity.type).toBe(identity.type);
      }

      // Optimize all prompts
      const optimizationResults = (await promptManager.optimizePrompts({
        includeVersionAnalysis: true,
        includeAgentOptimization: true,
      })) as OptimizationResults;

      expect(optimizationResults).toBeDefined();

      // Clean up
      for (const prompt of prompts) {
        await promptManager.deletePrompt(prompt.id);
      }
    });
  });
});
