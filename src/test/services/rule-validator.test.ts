// Unit tests for Rule Validator

import { describe, it, expect, beforeEach } from 'vitest';
import { RuleValidator } from '../../services/rule-validator';
import type { Rule } from '../../models/rule';

describe('RuleValidator', () => {
  let validRule: Rule;

  beforeEach(() => {
    validRule = {
      id: 'test-rule-1',
      name: 'Test Rule',
      description: 'A comprehensive test rule for validation',
      category: 'identity-specific',
      priority: 'medium',
      isActive: true,
      conditions: [
        {
          type: 'identity',
          field: 'type',
          operator: 'equals',
          value: 'User',
        },
      ],
      actions: [
        {
          type: 'append',
          target: 'content',
          content: ' [User-specific addition]',
        },
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'test-author',
        version: '1.0.0',
        tags: ['test', 'validation'],
        usage: {
          totalApplications: 0,
          successfulApplications: 0,
          failedApplications: 0,
          lastApplied: new Date(),
          averageExecutionTime: 0,
        },
      },
    };
  });

  describe('Rule Structure Validation', () => {
    it('should validate a correct rule', () => {
      const result = RuleValidator.validateRule(validRule);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing rule ID', () => {
      const invalidRule = { ...validRule, id: '' } as unknown as Rule;
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'id',
          code: 'INVALID_RULE_ID',
        }),
      );
    });

    it('should detect missing rule name', () => {
      const invalidRule = { ...validRule, name: '' } as unknown as Rule;
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          code: 'INVALID_RULE_NAME',
        }),
      );
    });

    it('should detect invalid category', () => {
      const invalidRule = {
        ...validRule,
        category: 'invalid-category' as unknown as import('../../models/rule').RuleCategory,
      } as unknown as Rule;
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'category',
          code: 'INVALID_RULE_CATEGORY',
        }),
      );
    });

    it('should detect invalid priority', () => {
      const invalidRule = {
        ...validRule,
        priority: 'invalid-priority' as unknown as import('../../models/rule').RulePriority,
      } as unknown as Rule;
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'priority',
          code: 'INVALID_RULE_PRIORITY',
        }),
      );
    });

    it('should detect missing conditions', () => {
      const invalidRule = { ...validRule, conditions: [] } as unknown as Rule;
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions',
          code: 'MISSING_CONDITIONS',
        }),
      );
    });

    it('should detect missing actions', () => {
      const invalidRule = { ...validRule, actions: [] } as unknown as Rule;
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions',
          code: 'MISSING_ACTIONS',
        }),
      );
    });
  });

  describe('Condition Validation', () => {
    it('should validate correct conditions', () => {
      const result = RuleValidator.validateRule(validRule);

      expect(result.isValid).toBe(true);
      expect(result.errors.filter((e) => e.field.startsWith('conditions'))).toHaveLength(0);
    });

    it('should detect invalid condition type', () => {
      const invalidRule = {
        ...validRule,
        conditions: [
          {
            type: 'invalid' as unknown as import('../../models/rule').RuleCondition['type'],
            field: 'test',
            operator: 'equals',
            value: 'test',
          },
        ],
      };
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].type',
          code: 'INVALID_CONDITION_TYPE',
        }),
      );
    });

    it('should detect invalid condition operator', () => {
      const invalidRule = {
        ...validRule,
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'invalid_operator' as unknown as import('../../models/rule').ConditionOperator,
            value: 'User',
          },
        ],
      };
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].operator',
          code: 'INVALID_CONDITION_OPERATOR',
        }),
      );
    });

    it('should detect incompatible operator-value pairs', () => {
      const invalidRule = {
        ...validRule,
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'in_array',
            value: 'not-an-array', // Should be an array
          },
        ],
      };
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].value',
          code: 'INCOMPATIBLE_OPERATOR_VALUE',
        }),
      );
    });

    it('should validate numeric operators with numeric values', () => {
      const numericRule = {
        ...validRule,
        conditions: [
          {
            type: 'context',
            field: 'projectState.completionPercentage',
            operator: 'greater_than',
            value: 50,
          },
        ],
      };
      const result = RuleValidator.validateRule(numericRule as unknown as Rule);

      expect(result.isValid).toBe(true);
    });

    it('should detect invalid regex patterns', () => {
      const invalidRegexRule = {
        ...validRule,
        conditions: [
          {
            type: 'prompt',
            field: 'content',
            operator: 'matches_regex',
            value: '[invalid-regex',
          },
        ],
      };
      const result = RuleValidator.validateRule(invalidRegexRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].value',
          code: 'INCOMPATIBLE_OPERATOR_VALUE',
        }),
      );
    });
  });

  describe('Action Validation', () => {
    it('should validate correct actions', () => {
      const result = RuleValidator.validateRule(validRule);

      expect(result.isValid).toBe(true);
      expect(result.errors.filter((e) => e.field.startsWith('actions'))).toHaveLength(0);
    });

    it('should detect invalid action type', () => {
      const invalidRule = {
        ...validRule,
        actions: [
          {
            type: 'invalid' as unknown as import('../../models/rule').RuleAction['type'],
            target: 'content',
            content: 'test',
          },
        ],
      };
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions[0].type',
          code: 'INVALID_ACTION_TYPE',
        }),
      );
    });

    it('should detect missing action target', () => {
      const invalidRule = {
        ...validRule,
        actions: [
          {
            type: 'append',
            target: '',
            content: 'test',
          },
        ],
      };
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions[0].target',
          code: 'INVALID_ACTION_TARGET',
        }),
      );
    });

    it('should detect missing content for content-requiring actions', () => {
      const invalidRule = {
        ...validRule,
        actions: [
          {
            type: 'append',
            target: 'content',
            // Missing content
          },
        ],
      };
      const result = RuleValidator.validateRule(invalidRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions[0].content',
          code: 'MISSING_ACTION_CONTENT',
        }),
      );
    });

    it('should validate replace action parameters', () => {
      const replaceRule = {
        ...validRule,
        actions: [
          {
            type: 'replace',
            target: 'content',
            content: 'replacement',
            parameters: {
              pattern: 'test',
              flags: 'g',
            },
          },
        ],
      };
      const result = RuleValidator.validateRule(replaceRule as unknown as Rule);

      expect(result.isValid).toBe(true);
    });

    it('should detect invalid replace action parameters', () => {
      const invalidReplaceRule = {
        ...validRule,
        actions: [
          {
            type: 'replace',
            target: 'content',
            content: 'replacement',
            parameters: {
              // Missing pattern
              flags: 'g',
            },
          },
        ],
      };
      const result = RuleValidator.validateRule(invalidReplaceRule as unknown as Rule);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions[0].parameters.pattern',
          code: 'INVALID_REPLACE_PATTERN',
        }),
      );
    });
  });

  describe('Warning Generation', () => {
    it('should warn about complex conditions', () => {
      const complexRule = {
        ...validRule,
        conditions: Array(6)
          .fill(null)
          .map((_, i) => ({
            type: 'identity',
            field: `field${i}`,
            operator: 'equals',
            value: `value${i}`,
          })),
      };
      const result = RuleValidator.validateRule(complexRule as unknown as Rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'conditions',
          code: 'COMPLEX_CONDITIONS',
        }),
      );
    });

    it('should warn about too many actions', () => {
      const manyActionsRule = {
        ...validRule,
        actions: Array(4)
          .fill(null)
          .map((_, i) => ({
            type: 'append',
            target: `target${i}`,
            content: `content${i}`,
          })),
      };
      const result = RuleValidator.validateRule(manyActionsRule as unknown as Rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'actions',
          code: 'TOO_MANY_ACTIONS',
        }),
      );
    });

    it('should warn about duplicate action targets', () => {
      const duplicateTargetsRule = {
        ...validRule,
        actions: [
          { type: 'append', target: 'content', content: 'first' },
          { type: 'prepend', target: 'content', content: 'second' },
        ],
      };
      const result = RuleValidator.validateRule(duplicateTargetsRule as unknown as Rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'actions',
          code: 'DUPLICATE_ACTION_TARGETS',
        }),
      );
    });

    it('should warn about excessive negation', () => {
      const excessiveNegationRule = {
        ...validRule,
        conditions: [
          { type: 'identity', field: 'type', operator: 'equals', value: 'User', negated: true },
          { type: 'context', field: 'phase', operator: 'equals', value: 'dev', negated: true },
        ],
      };
      const result = RuleValidator.validateRule(excessiveNegationRule as unknown as Rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'conditions',
          code: 'EXCESSIVE_NEGATION',
        }),
      );
    });
  });

  describe('Suggestion Generation', () => {
    it('should suggest better description', () => {
      const shortDescRule = { ...validRule, description: 'Short' } as unknown as Rule;
      const result = RuleValidator.validateRule(shortDescRule as unknown as Rule);

      expect(result.suggestions).toContainEqual(
        expect.objectContaining({
          field: 'description',
          message: 'Consider adding a more detailed description',
        }),
      );
    });

    it('should suggest adding tags', () => {
      const noTagsRule = {
        ...validRule,
        metadata: {
          ...validRule.metadata,
          tags: [],
        },
      };
      const result = RuleValidator.validateRule(noTagsRule as unknown as Rule);

      expect(result.suggestions).toContainEqual(
        expect.objectContaining({
          field: 'metadata.tags',
          message: 'Consider adding tags to categorize this rule',
        }),
      );
    });

    it('should suggest priority adjustment for security rules', () => {
      const securityRule = {
        ...validRule,
        category: 'security' as const,
        priority: 'low' as const,
      };
      const result = RuleValidator.validateRule(securityRule as unknown as Rule);

      expect(result.suggestions).toContainEqual(
        expect.objectContaining({
          field: 'priority',
          message: 'Consider changing priority to critical for security rules',
        }),
      );
    });
  });

  describe('Rule Set Validation', () => {
    it('should validate a consistent rule set', () => {
      const rules = [validRule, { ...validRule, id: 'rule-2', name: 'Rule 2' }];
      const result = RuleValidator.validateRuleSet(rules as unknown as Rule[]);

      expect(result.isValid).toBe(true);
    });

    it('should detect duplicate rule IDs', () => {
      const rules = [
        validRule,
        { ...validRule, name: 'Different Name' }, // Same ID
      ];
      const result = RuleValidator.validateRuleSet(rules as unknown as Rule[]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'rules',
          code: 'DUPLICATE_RULE_IDS',
        }),
      );
    });

    it('should warn about similar rule names', () => {
      const rules = [
        validRule,
        { ...validRule, id: 'rule-2', name: 'test rule' }, // Similar name (case insensitive)
      ];
      const result = RuleValidator.validateRuleSet(rules as unknown as Rule[]);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'rules',
          code: 'SIMILAR_RULE_NAMES',
        }),
      );
    });

    it('should propagate individual rule errors', () => {
      const rules = [
        validRule,
        { ...validRule, id: 'rule-2', name: '' }, // Invalid name
      ];
      const result = RuleValidator.validateRuleSet(rules as unknown as Rule[]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'rules[1].name',
          code: 'INVALID_RULE_NAME',
        }),
      );
    });
  });
});
