// Enhanced Prompt Generator Service Tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptGenerator } from '../../services/prompt-generator';
import type { PromptTemplate, TemplateVariables, TemplateCategory } from '../../models/template';
import type { GeneratedPrompt, PersonalizedPrompt, PromptMetadata } from '../../models/prompt';
import type { UserIdentity } from '../../models/identity';
import type { ProjectContext } from '../../models/context';
import type { IIdentityResolver, IRulesIntegrationEngine } from '../../config/di-container';

describe('Enhanced PromptGenerator', () => {
  let promptGenerator: PromptGenerator;
  let mockIdentityResolver: IIdentityResolver;
  let mockRulesEngine: IRulesIntegrationEngine;

  const createMockTemplate = (overrides: Partial<PromptTemplate> = {}): PromptTemplate => ({
    id: 'test-template-1',
    name: 'Test Template',
    description: 'A test template for unit testing',
    category: 'general' as TemplateCategory,
    identities: ['User', 'Superviseur', 'Responsable'],
    template: 'Hello {{name}}, welcome to {{project}}. {{instructions}}',
    variables: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'User name',
        defaultValue: 'User',
      },
      {
        name: 'project',
        type: 'string',
        required: true,
        description: 'Project name',
      },
      {
        name: 'instructions',
        type: 'string',
        required: false,
        description: 'Additional instructions',
        defaultValue: 'Please follow the guidelines.',
      },
    ],
    constraints: [],
    version: '1.0.0',
    isPublic: true,
    author: 'test-author',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    usageCount: 0,
    ...overrides,
  });

  const createMockVariables = (overrides: Partial<TemplateVariables> = {}): TemplateVariables => ({
    name: 'John Doe',
    project: 'Test Project',
    instructions: 'Follow best practices.',
    ...overrides,
  });

  const createMockIdentity = (type: 'User' | 'Superviseur' | 'Responsable' = 'User'): UserIdentity => ({
    type,
    permissions: [
      { action: 'use_template', resource: 'templates' },
      { action: 'read', resource: 'prompts' },
    ],
    preferences: {
      language: 'fr',
      responseStyle: 'balanced',
      technicalLevel: 'intermediate',
    },
    customizations: [],
  });

  const createMockContext = (): ProjectContext => ({
    workFolder: {
      name: 'test-project',
      path: '/test',
      type: 'project',
      technologies: ['typescript'],
      lastModified: new Date(),
    },
    activeFlows: [],
    availableTools: [],
    projectState: { phase: 'development', completionPercentage: 60, activeFeatures: [], blockers: [] },
    technicalEcosystem: {
      framework: 'vitest',
      language: 'typescript',
      runtime: 'node',
      dependencies: [],
      buildTools: [],
    },
  });

  const createMockMetadata = (): PromptMetadata => ({
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    author: 'test-author',
    tags: ['test'],
    usage: {
      totalUses: 0,
      successRate: 1.0,
      averageResponseTime: 1000,
      lastUsed: new Date('2024-01-01'),
    },
  });

  beforeEach(() => {
    // Create mock identity resolver
    mockIdentityResolver = {
      getCurrentIdentity: vi.fn().mockResolvedValue(createMockIdentity()),
      setCurrentIdentity: vi.fn().mockResolvedValue(undefined),
      getIdentityCharacteristics: vi.fn().mockResolvedValue({
        identityType: 'User',
        displayName: 'Standard User',
        description: 'Basic user profile',
        capabilities: ['basic_operations'],
      }),
      validateIdentityPermissions: vi.fn().mockResolvedValue(true),
    };

    // Create mock rules engine
    mockRulesEngine = {
      applyRules: vi.fn().mockImplementation(async (prompt) => ({
        ...prompt,
        appliedRules: [],
        ruleApplicationResults: [],
        conflictResolutions: [],
        validationResults: [],
      })),
      validateRuleConsistency: vi.fn().mockResolvedValue({
        isConsistent: true,
        conflicts: [],
        redundancies: [],
        gaps: [],
        overallScore: 100,
      }),
      detectRuleConflicts: vi.fn().mockResolvedValue({ conflicts: [], resolutions: [] }),
    };

    promptGenerator = new PromptGenerator(mockIdentityResolver, mockRulesEngine);
  });

  describe('generateFromTemplate', () => {
    it('should generate a basic prompt from template', async () => {
      const template = createMockTemplate();
      const variables = createMockVariables();

      const result = await promptGenerator.generateFromTemplate(template, variables);
      const generatedPrompt = result as GeneratedPrompt;

      expect(generatedPrompt).toBeDefined();
      expect(generatedPrompt.id).toBeDefined();
      expect(generatedPrompt.content).toContain('Hello John Doe');
      expect(generatedPrompt.content).toContain('welcome to Test Project');
      expect(generatedPrompt.content).toContain('Follow best practices');
      expect(generatedPrompt.identity.type).toBe('User');
    });

    it('should use default values for missing variables', async () => {
      const template = createMockTemplate();
      const variables = { name: 'Jane Doe', project: 'My Project' }; // missing instructions

      const result = await promptGenerator.generateFromTemplate(template, variables);
      const generatedPrompt = result as GeneratedPrompt;

      expect(generatedPrompt.content).toContain('Please follow the guidelines');
    });

    it('should cache generated prompts', async () => {
      const template = createMockTemplate();
      const variables = createMockVariables();

      const result1 = await promptGenerator.generateFromTemplate(template, variables);
      const result2 = await promptGenerator.generateFromTemplate(template, variables);

      // Should return the same cached result
      expect(result1).toBe(result2);
    });

    it('should validate template structure', async () => {
      const invalidTemplate = createMockTemplate({
        variables: [], // Missing required variables
      });
      const variables = createMockVariables();

      await expect(promptGenerator.generateFromTemplate(invalidTemplate, variables)).rejects.toThrow(
        'Unresolved template variables',
      );
    });
  });

  describe('generateComprehensivePrompt', () => {
    it('should generate comprehensive prompt with all parameters', async () => {
      const template = createMockTemplate();
      const variables = createMockVariables();
      const identity = createMockIdentity('Superviseur');
      const context = createMockContext();

      const result = (await promptGenerator.generateComprehensivePrompt!(
        template,
        variables,
        identity,
        context,
      )) as PersonalizedPrompt;

      expect(result).toBeDefined();
      expect(result.identity.type).toBe('Superviseur');
      expect(result.content).toContain('optimisation');
      expect(mockRulesEngine.applyRules).toHaveBeenCalled();
    });

    it('should apply identity-specific adaptations for User', async () => {
      const template = createMockTemplate({
        template: 'Please optimize the sophisticated implementation. {{name}}',
      });
      const variables = createMockVariables();
      const identity = createMockIdentity('User');
      const context = createMockContext();

      const result = (await promptGenerator.generateComprehensivePrompt!(
        template,
        variables,
        identity,
        context,
      )) as PersonalizedPrompt;

      expect(result.content).toContain('améliorer');
      expect(result.content).toContain('réponse claire et simple');
    });

    it('should apply identity-specific adaptations for Superviseur', async () => {
      const template = createMockTemplate();
      const variables = createMockVariables();
      const identity = createMockIdentity('Superviseur');
      const context = createMockContext();

      const result = (await promptGenerator.generateComprehensivePrompt!(
        template,
        variables,
        identity,
        context,
      )) as PersonalizedPrompt;

      expect(result.content).toContain('optimisation');
      expect(result.content).toContain('alternatives');
    });

    it('should apply identity-specific adaptations for Responsable', async () => {
      const template = createMockTemplate();
      const variables = createMockVariables();
      const identity = createMockIdentity('Responsable');
      const context = createMockContext();

      const result = (await promptGenerator.generateComprehensivePrompt!(
        template,
        variables,
        identity,
        context,
      )) as PersonalizedPrompt;

      expect(result.content).toContain('qualité');
      expect(result.content).toContain('risques');
    });

    it('should validate identity permissions', async () => {
      const template = createMockTemplate({ identities: ['Superviseur'] });
      const variables = createMockVariables();
      const identity = createMockIdentity('User'); // User not allowed for this template
      const context = createMockContext();

      await expect(
        promptGenerator.generateComprehensivePrompt!(template, variables, identity, context),
      ).rejects.toThrow('not compatible with identity type User');
    });
  });

  describe('adaptForAgent', () => {
    it('should adapt prompt for Ollama agent', async () => {
      const prompt = {
        id: 'test-prompt',
        content: 'Original prompt content',
        identity: createMockIdentity(),
        metadata: createMockMetadata(),
        version: '1.0.0',
        context: createMockContext(),
        appliedRules: [],
      };

      const result = (await promptGenerator.adaptForAgent(prompt, 'ollama')) as unknown as {
        content: string;
        adaptedFor: string;
        adaptations: string[];
      };

      expect(result.content).toContain('conversationnelle et naturelle');
      expect(result.adaptedFor).toBe('ollama');
      expect(result.adaptations).toContain('conversational_tone');
    });

    it('should adapt prompt for LM Studio agent', async () => {
      const prompt = {
        id: 'test-prompt',
        content: 'Original prompt content',
        identity: createMockIdentity(),
        metadata: createMockMetadata(),
        version: '1.0.0',
        context: createMockContext(),
        appliedRules: [],
      };

      const result = (await promptGenerator.adaptForAgent(prompt, 'lm-studio')) as unknown as {
        content: string;
        adaptedFor: string;
        adaptations: string[];
      };

      expect(result.content).toContain('coordination');
      expect(result.adaptedFor).toBe('lm-studio');
      expect(result.adaptations).toContain('coordination_focus');
    });

    it('should adapt prompt for Codestral agent', async () => {
      const prompt = {
        id: 'test-prompt',
        content: 'Original prompt content',
        identity: createMockIdentity(),
        metadata: createMockMetadata(),
        version: '1.0.0',
        context: createMockContext(),
        appliedRules: [],
      };

      const result = (await promptGenerator.adaptForAgent(prompt, 'codestral')) as unknown as {
        content: string;
        adaptedFor: string;
        adaptations: string[];
      };

      expect(result.content).toContain('techniques');
      expect(result.adaptedFor).toBe('codestral');
      expect(result.adaptations).toContain('technical_focus');
    });
  });

  describe('applyPersonalization', () => {
    it('should apply language personalization', async () => {
      const prompt = {
        id: 'test-prompt',
        content: 'Original prompt content',
        identity: createMockIdentity(),
        metadata: createMockMetadata(),
        version: '1.0.0',
        context: createMockContext(),
        appliedRules: [],
      };

      const preferences = { language: 'en' };
      const result = (await promptGenerator.applyPersonalization(prompt, preferences)) as PersonalizedPrompt;

      expect(result.content).toContain('Répondez en en');
      expect(result.personalizations).toHaveLength(1);
      expect(result.personalizations[0].type).toBe('append');
    });

    it('should apply verbosity personalization', async () => {
      const prompt = {
        id: 'test-prompt',
        content: 'Original prompt content',
        identity: createMockIdentity(),
        metadata: createMockMetadata(),
        version: '1.0.0',
        context: createMockContext(),
        appliedRules: [],
      };

      const preferences = { verbosity: 'high' };
      const result = (await promptGenerator.applyPersonalization(prompt, preferences)) as PersonalizedPrompt;

      expect(result.content).toContain('explications détaillées');
      expect(result.personalizations).toHaveLength(1);
    });

    it('should apply format personalization', async () => {
      const prompt = {
        id: 'test-prompt',
        content: 'Original prompt content',
        identity: createMockIdentity(),
        metadata: createMockMetadata(),
        version: '1.0.0',
        context: createMockContext(),
        appliedRules: [],
      };

      const preferences = { format: 'structured' };
      const result = (await promptGenerator.applyPersonalization(prompt, preferences)) as PersonalizedPrompt;

      expect(result.content).toContain('Structurez votre réponse');
      expect(result.personalizations).toHaveLength(1);
    });

    it('should apply multiple personalizations', async () => {
      const prompt = {
        id: 'test-prompt',
        content: 'Original prompt content',
        identity: createMockIdentity(),
        metadata: createMockMetadata(),
        version: '1.0.0',
        context: createMockContext(),
        appliedRules: [],
      };

      const preferences = {
        language: 'en',
        verbosity: 'low',
        format: 'structured',
      };
      const result = (await promptGenerator.applyPersonalization(prompt, preferences)) as PersonalizedPrompt;

      expect(result.personalizations).toHaveLength(3);
      expect(result.content).toContain('Répondez en en');
      expect(result.content).toContain('concis et direct');
      expect(result.content).toContain('Structurez votre réponse');
    });
  });

  describe('validateTemplateCompatibility', () => {
    it('should validate compatible template and identity', async () => {
      const template = createMockTemplate({ identities: ['User', 'Superviseur'] });
      const identity = createMockIdentity('User');

      const result = await promptGenerator.validateTemplateCompatibility!(template, identity);

      expect(result).toBe(true);
    });

    it('should reject incompatible template and identity', async () => {
      const template = createMockTemplate({ identities: ['Superviseur'] });
      const identity = createMockIdentity('User');

      const result = await promptGenerator.validateTemplateCompatibility!(template, identity);

      expect(result).toBe(false);
    });

    it('should reject template when identity lacks permissions', async () => {
      const template = createMockTemplate();
      const identity = createMockIdentity('User');

      // Mock permission validation to return false
      mockIdentityResolver.validateIdentityPermissions = vi.fn().mockResolvedValue(false);

      const result = await promptGenerator.validateTemplateCompatibility!(template, identity);

      expect(result).toBe(false);
    });
  });

  describe('Template Method Pattern Integration', () => {
    it('should integrate with identity resolver', async () => {
      const template = createMockTemplate();
      const variables = createMockVariables();
      const identity = createMockIdentity();
      const context = createMockContext();

      await promptGenerator.generateComprehensivePrompt!(template, variables, identity, context);

      expect(mockIdentityResolver.getIdentityCharacteristics).toHaveBeenCalledWith(identity);
      expect(mockIdentityResolver.validateIdentityPermissions).toHaveBeenCalledWith(identity, 'use_template');
    });

    it('should integrate with rules engine', async () => {
      const template = createMockTemplate();
      const variables = createMockVariables();
      const identity = createMockIdentity();
      const context = createMockContext();

      await promptGenerator.generateComprehensivePrompt!(template, variables, identity, context);

      expect(mockRulesEngine.applyRules).toHaveBeenCalled();
    });

    it('should handle rules engine errors gracefully', async () => {
      const template = createMockTemplate();
      const variables = createMockVariables();
      const identity = createMockIdentity();
      const context = createMockContext();

      // Mock rules engine to throw error
      mockRulesEngine.applyRules = vi.fn().mockRejectedValue(new Error('Rules engine error'));

      await expect(
        promptGenerator.generateComprehensivePrompt!(template, variables, identity, context),
      ).rejects.toThrow('Rules engine error');
    });
  });

  describe('Error Handling', () => {
    it('should handle template validation errors', async () => {
      const invalidTemplate = createMockTemplate({
        id: '', // Invalid empty ID
        variables: [],
      });
      const variables = createMockVariables();

      await expect(promptGenerator.generateFromTemplate(invalidTemplate, variables)).rejects.toThrow(
        'Template validation failed',
      );
    });

    it('should handle missing required variables', async () => {
      const template = createMockTemplate();
      const incompleteVariables = { name: 'John' }; // Missing required 'project'

      await expect(promptGenerator.generateFromTemplate(template, incompleteVariables)).rejects.toThrow(
        'Variables validation failed',
      );
    });

    it('should handle unresolved template variables', async () => {
      const template = createMockTemplate({
        template: 'Hello {{name}}, {{undefinedVar}}',
        variables: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'User name',
          },
        ],
      });
      const variables = { name: 'John' };

      await expect(promptGenerator.generateFromTemplate(template, variables)).rejects.toThrow(
        'Unresolved template variables',
      );
    });
  });

  describe('Performance and Caching', () => {
    it('should cache results for identical inputs', async () => {
      const template = createMockTemplate();
      const variables = createMockVariables();

      const result1 = await promptGenerator.generateFromTemplate(template, variables);
      const result2 = await promptGenerator.generateFromTemplate(template, variables);

      expect(result1).toBe(result2); // Same object reference (cached)
    });

    it('should not cache results for different inputs', async () => {
      const template = createMockTemplate();
      const variables1 = createMockVariables({ name: 'John' });
      const variables2 = createMockVariables({ name: 'Jane' });

      const result1 = await promptGenerator.generateFromTemplate(template, variables1);
      const result2 = await promptGenerator.generateFromTemplate(template, variables2);

      expect(result1).not.toBe(result2); // Different objects
      expect((result1 as GeneratedPrompt).content).toContain('John');
      expect((result2 as GeneratedPrompt).content).toContain('Jane');
    });
  });

  describe('Enhanced Personalization Features', () => {
    describe('applyUserPreferences', () => {
      it('should apply comprehensive user preferences', async () => {
        const prompt = {
          id: 'test-prompt',
          content: 'Original prompt content',
          identity: createMockIdentity(),
          metadata: createMockMetadata(),
          version: '1.0.0',
          context: createMockContext(),
          appliedRules: [],
        };

        const additionalPreferences = {
          format: 'structured',
          includeExamples: true,
          contextAwareness: 'high',
        };

        const result = (await promptGenerator.applyUserPreferences!(
          prompt,
          prompt.identity,
          additionalPreferences,
        )) as PersonalizedPrompt;

        expect(result.personalizations.length).toBeGreaterThan(3);
        expect(result.content).toContain('Structurez votre réponse');
        expect(result.content).toContain('exemples concrets');
        expect(result.content).toContain('contexte du projet');
      });

      it('should handle identity-specific preferences', async () => {
        const superviseurIdentity = createMockIdentity('Superviseur');
        const prompt = {
          id: 'test-prompt',
          content: 'Original prompt content',
          identity: superviseurIdentity,
          metadata: createMockMetadata(),
          version: '1.0.0',
          context: createMockContext(),
          appliedRules: [],
        };

        const result = (await promptGenerator.applyUserPreferences!(prompt, superviseurIdentity)) as PersonalizedPrompt;

        expect(result.content).toContain("suggestions d'amélioration");
        expect(result.personalizations.some((p) => p.content.includes('amélioration'))).toBe(true);
      });

      it('should validate personalized prompt', async () => {
        const prompt = {
          id: 'test-prompt',
          content: 'A'.repeat(25000), // Too long content
          identity: createMockIdentity(),
          metadata: createMockMetadata(),
          version: '1.0.0',
          context: createMockContext(),
          appliedRules: [],
        };

        await expect(promptGenerator.applyUserPreferences!(prompt, prompt.identity)).rejects.toThrow(
          'Personalization validation failed',
        );
      });
    });

    describe('savePromptCustomization', () => {
      it('should save valid customizations', async () => {
        const identity = createMockIdentity();
        const customizations = [
          {
            type: 'append',
            content: 'Additional instructions for this prompt',
            priority: 5,
          },
        ];

        await expect(
          promptGenerator.savePromptCustomization!('test-prompt', identity, customizations),
        ).resolves.not.toThrow();

        expect(identity.customizations).toHaveLength(1);
        expect(identity.customizations[0].promptId).toBe('test-prompt');
      });

      it('should validate customizations before saving', async () => {
        const identity = createMockIdentity();
        const invalidCustomizations = [
          {
            type: 'invalid-type',
            content: '',
            priority: 150,
          },
        ];

        await expect(
          promptGenerator.savePromptCustomization!('test-prompt', identity, invalidCustomizations),
        ).rejects.toThrow('Invalid customization');
      });

      it('should replace existing customizations for same prompt', async () => {
        const identity = createMockIdentity();
        identity.customizations = [{ promptId: 'test-prompt', type: 'append', content: 'Old customization' }];

        const newCustomizations = [
          {
            type: 'append',
            content: 'New customization',
            priority: 5,
          },
        ];

        await promptGenerator.savePromptCustomization!('test-prompt', identity, newCustomizations);

        expect(identity.customizations).toHaveLength(1);
        expect(identity.customizations[0].content).toBe('New customization');
      });
    });

    describe('loadPromptCustomizations', () => {
      it('should load customizations for specific prompt', async () => {
        const identity = createMockIdentity();
        identity.customizations = [
          { promptId: 'prompt-1', type: 'append', content: 'Customization 1' },
          { promptId: 'prompt-2', type: 'append', content: 'Customization 2' },
          { promptId: 'prompt-1', type: 'prepend', content: 'Customization 3' },
        ];

        const result = await promptGenerator.loadPromptCustomizations!('prompt-1', identity);

        expect(result).toHaveLength(2);
        expect(result.every((c) => c.promptId === 'prompt-1')).toBe(true);
      });

      it('should return empty array for prompt with no customizations', async () => {
        const identity = createMockIdentity();
        const result = await promptGenerator.loadPromptCustomizations!('non-existent', identity);

        expect(result).toHaveLength(0);
      });
    });

    describe('applyPromptCustomizations', () => {
      it('should apply customizations to prompt', async () => {
        const prompt = {
          id: 'test-prompt',
          content: 'Original content',
          identity: createMockIdentity(),
          metadata: createMockMetadata(),
          version: '1.0.0',
          context: createMockContext(),
          appliedRules: [],
        };

        const customizations = [
          {
            type: 'append',
            content: ' - Additional instruction',
            priority: 1,
          },
          {
            type: 'prepend',
            content: 'Important: ',
            priority: 2,
          },
        ];

        const result = (await promptGenerator.applyPromptCustomizations!(
          prompt,
          customizations,
        )) as import('../../models/prompt').PersonalizedPrompt;

        expect(result.content).toBe('Important: Original content - Additional instruction');
        expect(result.personalizations).toHaveLength(2);
      });
    });

    describe('generatePersonalizedPrompt', () => {
      it('should generate fully personalized prompt', async () => {
        const template = createMockTemplate();
        const variables = createMockVariables();
        const identity = createMockIdentity('Superviseur');
        const context = createMockContext();

        // Add some customizations to the identity
        identity.customizations = [
          {
            promptId: template.id,
            type: 'append',
            content: ' - Custom instruction',
            priority: 1,
          },
        ];

        const additionalPreferences = {
          format: 'structured',
          verbosity: 'high',
        };

        const result = (await promptGenerator.generatePersonalizedPrompt!(
          template,
          variables,
          identity,
          context,
          additionalPreferences,
        )) as PersonalizedPrompt;

        expect(result.content).toContain('John Doe');
        expect(result.content).toContain('Custom instruction');
        expect(result.content).toContain('optimisation');
        expect(result.content).toContain('Structurez');
        expect(result.personalizations.length).toBeGreaterThan(0);
      });
    });

    describe('optimizePersonalization', () => {
      it('should analyze and suggest optimizations', async () => {
        const personalizedPrompt: PersonalizedPrompt = {
          id: 'test-prompt',
          content: 'Test content',
          identity: createMockIdentity(),
          metadata: createMockMetadata(),
          version: '1.0.0',
          context: createMockContext(),
          appliedRules: [],
          personalizations: [
            { type: 'append', content: 'Rule 1', priority: 1 },
            { type: 'append', content: 'Rule 1', priority: 2 }, // Duplicate
            { type: 'append', content: 'Rule 2', priority: 3 },
          ],
        };

        const usageMetrics = {
          totalUses: 50,
          successRate: 0.7, // Low success rate
          averageResponseTime: 6000, // Slow response
          lastUsed: new Date(),
        };

        const result = (await promptGenerator.optimizePersonalization!(
          personalizedPrompt,
          usageMetrics,
        )) as import('../../models/prompt').PersonalizationOptimizationResult;

        expect(result.optimizations.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.currentEffectiveness).toBeLessThan(80); // Should be low due to poor metrics
        expect(result.recommendedActions.length).toBeGreaterThan(0);
      });

      it('should handle well-optimized prompts', async () => {
        const personalizedPrompt: PersonalizedPrompt = {
          id: 'test-prompt',
          content: 'Well optimized content',
          identity: createMockIdentity(),
          metadata: createMockMetadata(),
          version: '1.0.0',
          context: createMockContext(),
          appliedRules: [],
          personalizations: [{ type: 'append', content: 'Good rule', priority: 1 }],
        };

        const usageMetrics = {
          totalUses: 100,
          successRate: 0.95,
          averageResponseTime: 2000,
          lastUsed: new Date(),
        };

        const result = (await promptGenerator.optimizePersonalization!(
          personalizedPrompt,
          usageMetrics,
        )) as import('../../models/prompt').PersonalizationOptimizationResult;

        expect(result.currentEffectiveness).toBeGreaterThan(80);
        expect(result.recommendedActions).toContain('monitor usage metrics');
      });
    });
  });
});
