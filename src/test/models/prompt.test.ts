import { describe, it, expect } from 'vitest';
import type { GeneratedPrompt, BasePrompt, PersonalizedPrompt } from '../../models/prompt';
import { PromptValidator } from '../../models/prompt';
import type { UserIdentity } from '../../models/identity';
import type { ProjectContext } from '../../models/context';

describe('PromptValidator', () => {
  // Helper function to create a valid GeneratedPrompt
  const createValidGeneratedPrompt = (): GeneratedPrompt => ({
    id: 'prompt-123',
    identity: {
      type: 'User',
      permissions: [],
      preferences: {
        language: 'fr',
        responseStyle: 'balanced',
        technicalLevel: 'intermediate',
      },
      customizations: [],
    } as UserIdentity,
    content: 'This is a valid prompt content with sufficient length.',
    metadata: {
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      author: 'test-author',
      tags: ['test', 'validation'],
      usage: {
        totalUses: 5,
        successRate: 0.8,
        averageResponseTime: 1500,
        lastUsed: new Date('2024-01-02'),
      },
    },
    version: '1.0.0',
    context: {} as ProjectContext,
    appliedRules: [],
  });

  describe('validateGeneratedPrompt', () => {
    it('should validate a valid GeneratedPrompt', () => {
      const validPrompt = createValidGeneratedPrompt();
      const result = PromptValidator.validateGeneratedPrompt(validPrompt);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid prompt ID', () => {
      const invalidPrompt = createValidGeneratedPrompt();
      invalidPrompt.id = '';

      const result = PromptValidator.validateGeneratedPrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'id',
        message: 'Prompt ID must be a non-empty string',
        code: 'INVALID_PROMPT_ID',
      });
    });

    it('should reject invalid prompt content', () => {
      const invalidPrompt = createValidGeneratedPrompt();
      invalidPrompt.content = '';

      const result = PromptValidator.validateGeneratedPrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'content',
        message: 'Prompt content must be a non-empty string',
        code: 'INVALID_PROMPT_CONTENT',
      });
    });

    it('should warn about short prompt content', () => {
      const shortPrompt = createValidGeneratedPrompt();
      shortPrompt.content = 'Short';

      const result = PromptValidator.validateGeneratedPrompt(shortPrompt);

      expect(result.warnings).toContainEqual({
        field: 'content',
        message: 'Prompt content is very short, consider adding more detail',
        code: 'SHORT_PROMPT_CONTENT',
      });
    });

    it('should warn about long prompt content', () => {
      const longPrompt = createValidGeneratedPrompt();
      longPrompt.content = 'x'.repeat(10001);

      const result = PromptValidator.validateGeneratedPrompt(longPrompt);

      expect(result.warnings).toContainEqual({
        field: 'content',
        message: 'Prompt content is very long, consider breaking it down',
        code: 'LONG_PROMPT_CONTENT',
      });
    });

    it('should reject missing identity', () => {
      const invalidPrompt = createValidGeneratedPrompt();
      invalidPrompt.identity = null as unknown as UserIdentity;

      const result = PromptValidator.validateGeneratedPrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'identity',
        message: 'Prompt identity is required',
        code: 'MISSING_IDENTITY',
      });
    });

    it('should reject missing context', () => {
      const invalidPrompt = createValidGeneratedPrompt();
      invalidPrompt.context = null as unknown as ProjectContext;

      const result = PromptValidator.validateGeneratedPrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'context',
        message: 'Prompt context is required',
        code: 'MISSING_CONTEXT',
      });
    });

    it('should validate metadata fields', () => {
      const invalidPrompt = createValidGeneratedPrompt();
      invalidPrompt.metadata = {
        createdAt: new Date('invalid'),
        updatedAt: new Date('invalid'),
        author: '',
        tags: ['valid', ''],
        usage: {
          totalUses: -1,
          successRate: 1.5,
          averageResponseTime: -100,
          lastUsed: new Date('invalid'),
        },
      };

      const result = PromptValidator.validateGeneratedPrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'metadata.createdAt',
        message: 'Created date must be a valid Date object',
        code: 'INVALID_CREATED_DATE',
      });
      expect(result.errors).toContainEqual({
        field: 'metadata.author',
        message: 'Author must be a non-empty string',
        code: 'INVALID_AUTHOR',
      });
      expect(result.errors).toContainEqual({
        field: 'metadata.usage.totalUses',
        message: 'Total uses must be a non-negative number',
        code: 'INVALID_TOTAL_USES',
      });
      expect(result.errors).toContainEqual({
        field: 'metadata.usage.successRate',
        message: 'Success rate must be a number between 0 and 1',
        code: 'INVALID_SUCCESS_RATE',
      });
    });

    it('should validate applied rules', () => {
      const invalidPrompt = createValidGeneratedPrompt();
      invalidPrompt.appliedRules = [
        {
          ruleId: '',
          ruleName: '',
          impact: 'invalid' as unknown as 'low' | 'medium' | 'high',
          modifications: ['valid', ''],
        },
      ];

      const result = PromptValidator.validateGeneratedPrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'appliedRules[0].ruleId',
        message: 'Rule ID must be a non-empty string',
        code: 'INVALID_RULE_ID',
      });
      expect(result.errors).toContainEqual({
        field: 'appliedRules[0].impact',
        message: 'Rule impact must be low, medium, or high',
        code: 'INVALID_RULE_IMPACT',
      });
    });
  });

  describe('validateBasePrompt', () => {
    const createValidBasePrompt = (): BasePrompt => ({
      id: 'base-prompt-123',
      name: 'Test Base Prompt',
      description: 'A test base prompt for validation',
      content: 'Base prompt content',
      identities: ['User', 'Superviseur'],
      isActive: true,
    });

    it('should validate a valid BasePrompt', () => {
      const validPrompt = createValidBasePrompt();
      const result = PromptValidator.validateBasePrompt(validPrompt);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid identities', () => {
      const invalidPrompt = createValidBasePrompt();
      invalidPrompt.identities = ['Invalid'] as unknown as ('User' | 'Superviseur' | 'Responsable')[];

      const result = PromptValidator.validateBasePrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'identities[0]',
        message: 'Invalid identity type: Invalid. Must be one of: User, Superviseur, Responsable',
        code: 'INVALID_IDENTITY_TYPE',
      });
    });

    it('should reject invalid isActive field', () => {
      const invalidPrompt = createValidBasePrompt();
      invalidPrompt.isActive = 'true' as unknown as boolean;

      const result = PromptValidator.validateBasePrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'isActive',
        message: 'isActive must be a boolean',
        code: 'INVALID_IS_ACTIVE',
      });
    });
  });

  describe('validatePersonalizedPrompt', () => {
    const createValidPersonalizedPrompt = (): PersonalizedPrompt => ({
      ...createValidGeneratedPrompt(),
      personalizations: [
        {
          type: 'append',
          content: 'Additional personalized content',
          priority: 1,
        },
        {
          type: 'conditional',
          condition: 'user.experience === "advanced"',
          content: 'Advanced user content',
          priority: 2,
        },
      ],
    });

    it('should validate a valid PersonalizedPrompt', () => {
      const validPrompt = createValidPersonalizedPrompt();
      const result = PromptValidator.validatePersonalizedPrompt(validPrompt);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate personalization rules', () => {
      const invalidPrompt = createValidPersonalizedPrompt();
      invalidPrompt.personalizations = [
        {
          type: 'invalid' as unknown as 'replace' | 'append' | 'prepend' | 'conditional',
          content: '',
          priority: -1,
        },
        {
          type: 'conditional',
          condition: undefined,
          content: 'Content',
          priority: 1,
        },
      ];

      const result = PromptValidator.validatePersonalizedPrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'personalizations[0].type',
        message: 'Personalization type must be replace, append, prepend, or conditional',
        code: 'INVALID_PERSONALIZATION_TYPE',
      });
      expect(result.errors).toContainEqual({
        field: 'personalizations[0].content',
        message: 'Personalization content must be a non-empty string',
        code: 'INVALID_PERSONALIZATION_CONTENT',
      });
      expect(result.errors).toContainEqual({
        field: 'personalizations[0].priority',
        message: 'Priority must be a non-negative number',
        code: 'INVALID_PRIORITY',
      });
      expect(result.errors).toContainEqual({
        field: 'personalizations[1].condition',
        message: 'Condition is required for conditional personalization rules',
        code: 'MISSING_CONDITION',
      });
    });

    it('should reject invalid personalizations array', () => {
      const invalidPrompt = createValidPersonalizedPrompt();
      invalidPrompt.personalizations = 'not-an-array' as never;

      const result = PromptValidator.validatePersonalizedPrompt(invalidPrompt);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'personalizations',
        message: 'Personalizations must be an array',
        code: 'INVALID_PERSONALIZATIONS_TYPE',
      });
    });
  });
});
