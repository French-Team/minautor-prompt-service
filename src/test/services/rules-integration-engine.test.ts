// Unit tests for Rules Integration Engine

import { describe, it, expect, beforeEach } from 'vitest';
import { RulesIntegrationEngine } from '../../services/rules-integration-engine';
import type { Rule, RuleEngineConfig } from '../../models/rule';
import type { BasePrompt } from '../../models/prompt';
import type { ProjectContext } from '../../models/context';

describe('RulesIntegrationEngine', () => {
  let engine: RulesIntegrationEngine;
  let mockPrompt: BasePrompt;
  let mockContext: ProjectContext;
  let mockRule: Rule;

  beforeEach(() => {
    engine = new RulesIntegrationEngine();

    mockPrompt = {
      id: 'test-prompt-1',
      name: 'Test Prompt',
      description: 'A test prompt',
      content: 'Hello, this is a test prompt.',
      identities: ['User'],
      isActive: true,
    };

    mockContext = {
      workFolder: {
        path: '/test/project',
        name: 'test-project',
        type: 'project',
        technologies: ['TypeScript', 'Node.js'],
        lastModified: new Date(),
      },
      activeFlows: [],
      availableTools: [],
      projectState: {
        phase: 'development',
        completionPercentage: 50,
        activeFeatures: ['feature1'],
        blockers: [],
      },
      technicalEcosystem: {
        framework: 'Node.js',
        language: 'TypeScript',
        runtime: 'Node.js',
        dependencies: [],
        buildTools: ['npm'],
      },
    };

    mockRule = {
      id: 'test-rule-1',
      name: 'Test Rule',
      description: 'A test rule',
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
        tags: ['test'],
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

  describe('Rule Management', () => {
    it('should add a rule successfully', () => {
      engine.addRule(mockRule);
      const rules = engine.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('test-rule-1');
    });

    it('should remove a rule successfully', () => {
      engine.addRule(mockRule);
      const removed = engine.removeRule('test-rule-1');
      expect(removed).toBe(true);
      expect(engine.getRules()).toHaveLength(0);
    });

    it('should return false when removing non-existent rule', () => {
      const removed = engine.removeRule('non-existent');
      expect(removed).toBe(false);
    });

    it('should get all rules', () => {
      const rule2 = { ...mockRule, id: 'test-rule-2', name: 'Test Rule 2' };
      engine.addRule(mockRule);
      engine.addRule(rule2);

      const rules = engine.getRules();
      expect(rules).toHaveLength(2);
      expect(rules.map((r) => r.id)).toContain('test-rule-1');
      expect(rules.map((r) => r.id)).toContain('test-rule-2');
    });
  });

  describe('Rule Application', () => {
    it('should apply rules to a prompt successfully', async () => {
      engine.addRule(mockRule);

      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result).toBeDefined();
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].ruleId).toBe('test-rule-1');
      expect(result.appliedRules[0].success).toBe(true);
    });

    it('should handle empty rule set', async () => {
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result).toBeDefined();
      expect(result.appliedRules).toHaveLength(0);
      expect(result.ruleApplicationResults).toHaveLength(0);
    });

    it('should skip inactive rules', async () => {
      const inactiveRule = { ...mockRule, isActive: false };
      engine.addRule(inactiveRule);

      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(0);
    });

    it('should apply rules in priority order', async () => {
      const lowPriorityRule: Rule = {
        ...mockRule,
        id: 'low-priority',
        priority: 'low',
        actions: [{ type: 'append', target: 'content', content: ' [Low]' }],
      };

      const highPriorityRule: Rule = {
        ...mockRule,
        id: 'high-priority',
        priority: 'high',
        actions: [{ type: 'append', target: 'content', content: ' [High]' }],
      };

      engine.addRule(lowPriorityRule);
      engine.addRule(highPriorityRule);

      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(2);
      expect(result.appliedRules[0].ruleId).toBe('high-priority');
      expect(result.appliedRules[1].ruleId).toBe('low-priority');
    });
  });

  describe('Rule Evaluation', () => {
    it('should evaluate identity conditions correctly', async () => {
      const identityRule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'equals',
            value: 'User',
          },
        ],
      };

      engine.addRule(identityRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(1);
    });

    it('should evaluate context conditions correctly', async () => {
      const contextRule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'context',
            field: 'projectState.phase',
            operator: 'equals',
            value: 'development',
          },
        ],
      };

      engine.addRule(contextRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(1);
    });

    it('should evaluate prompt conditions correctly', async () => {
      const promptRule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'prompt',
            field: 'content',
            operator: 'contains',
            value: 'test',
          },
        ],
      };

      engine.addRule(promptRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(1);
    });

    it('should handle negated conditions', async () => {
      const negatedRule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'prompt',
            field: 'content',
            operator: 'contains',
            value: 'nonexistent',
            negated: true,
          },
        ],
      };

      engine.addRule(negatedRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(1);
    });

    it('should skip rules when conditions fail', async () => {
      const failingRule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'equals',
            value: 'Superviseur',
          },
        ],
      };

      engine.addRule(failingRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(0);
    });
  });

  describe('Rule Actions', () => {
    it('should apply append action correctly', async () => {
      const appendRule: Rule = {
        ...mockRule,
        actions: [
          {
            type: 'append',
            target: 'content',
            content: ' APPENDED',
          },
        ],
      };

      engine.addRule(appendRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.content).toContain('APPENDED');
      expect(result.content).toMatch(/test prompt\..*APPENDED/);
    });

    it('should apply prepend action correctly', async () => {
      const prependRule: Rule = {
        ...mockRule,
        actions: [
          {
            type: 'prepend',
            target: 'content',
            content: 'PREPENDED ',
          },
        ],
      };

      engine.addRule(prependRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.content).toContain('PREPENDED');
      expect(result.content).toMatch(/^PREPENDED.*Hello/);
    });

    it('should apply modify action correctly', async () => {
      const modifyRule: Rule = {
        ...mockRule,
        actions: [
          {
            type: 'modify',
            target: 'content',
            content: 'MODIFIED CONTENT',
          },
        ],
      };

      engine.addRule(modifyRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.content).toBe('MODIFIED CONTENT');
    });

    it('should apply replace action correctly', async () => {
      const replaceRule: Rule = {
        ...mockRule,
        actions: [
          {
            type: 'replace',
            target: 'content',
            content: 'REPLACED',
            parameters: {
              pattern: 'test',
              flags: 'g',
            },
          },
        ],
      };

      engine.addRule(replaceRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.content).toContain('REPLACED');
      expect(result.content).not.toContain('test');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect target conflicts between rules', async () => {
      const rule1: Rule = {
        ...mockRule,
        id: 'rule1',
        actions: [{ type: 'modify', target: 'content', content: 'Content 1' }],
      };

      const rule2: Rule = {
        ...mockRule,
        id: 'rule2',
        actions: [{ type: 'modify', target: 'content', content: 'Content 2' }],
      };

      const result = await engine.detectRuleConflicts([rule1, rule2]);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('target_conflict');
      expect(result.conflicts[0].rules).toHaveLength(2);
    });

    it('should not detect conflicts for different targets', async () => {
      const rule1: Rule = {
        ...mockRule,
        id: 'rule1',
        actions: [{ type: 'modify', target: 'content', content: 'Content 1' }],
      };

      const rule2: Rule = {
        ...mockRule,
        id: 'rule2',
        actions: [{ type: 'modify', target: 'description', content: 'Description 2' }],
      };

      const result = await engine.detectRuleConflicts([rule1, rule2]);

      expect(result.conflicts).toHaveLength(0);
    });

    it('should generate conflict resolutions', async () => {
      const rule1: Rule = {
        ...mockRule,
        id: 'rule1',
        priority: 'high',
        actions: [{ type: 'modify', target: 'content', content: 'Content 1' }],
      };

      const rule2: Rule = {
        ...mockRule,
        id: 'rule2',
        priority: 'low',
        actions: [{ type: 'modify', target: 'content', content: 'Content 2' }],
      };

      const result = await engine.detectRuleConflicts([rule1, rule2]);

      expect(result.resolutions).toHaveLength(1);
      expect(result.resolutions[0].strategy).toBe('priority_based');
      expect(result.resolutions[0].selectedRuleId).toBe('rule1');
    });
  });

  describe('Rule Consistency Validation', () => {
    it('should validate consistent rule set', async () => {
      const rule1: Rule = {
        ...mockRule,
        id: 'rule1',
        actions: [{ type: 'append', target: 'content', content: ' Addition 1' }],
      };

      const rule2: Rule = {
        ...mockRule,
        id: 'rule2',
        actions: [{ type: 'append', target: 'description', content: ' Addition 2' }],
      };

      const result = await engine.validateRuleConsistency([rule1, rule2]);

      expect(result.isConsistent).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should detect inconsistent rule set', async () => {
      const rule1: Rule = {
        ...mockRule,
        id: 'rule1',
        actions: [{ type: 'modify', target: 'content', content: 'Content 1' }],
      };

      const rule2: Rule = {
        ...mockRule,
        id: 'rule2',
        actions: [{ type: 'modify', target: 'content', content: 'Content 2' }],
      };

      const result = await engine.validateRuleConsistency([rule1, rule2]);

      expect(result.isConsistent).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.overallScore).toBeLessThan(100);
    });
  });

  describe('Operator Evaluation', () => {
    it('should evaluate equals operator correctly', async () => {
      const rule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'prompt',
            field: 'name',
            operator: 'equals',
            value: 'Test Prompt',
          },
        ],
      };

      engine.addRule(rule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(1);
    });

    it('should evaluate contains operator correctly', async () => {
      const rule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'prompt',
            field: 'content',
            operator: 'contains',
            value: 'test',
          },
        ],
      };

      engine.addRule(rule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(1);
    });

    it('should evaluate greater_than operator correctly', async () => {
      const rule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'context',
            field: 'projectState.completionPercentage',
            operator: 'greater_than',
            value: 25,
          },
        ],
      };

      engine.addRule(rule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(1);
    });

    it('should evaluate in_array operator correctly', async () => {
      const rule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'context',
            field: 'projectState.phase',
            operator: 'in_array',
            value: ['development', 'testing', 'deployment'],
          },
        ],
      };

      engine.addRule(rule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(1);
    });

    it('should evaluate exists operator correctly', async () => {
      const rule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'prompt',
            field: 'content',
            operator: 'exists',
            value: null,
          },
        ],
      };

      engine.addRule(rule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(1);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const config: Partial<RuleEngineConfig> = {
        maxExecutionTime: 1000,
        enableConflictDetection: false,
        defaultResolutionStrategy: 'user_choice',
      };

      const customEngine = new RulesIntegrationEngine(config);
      expect(customEngine).toBeDefined();
    });

    it('should handle caching when enabled', async () => {
      const config: Partial<RuleEngineConfig> = {
        cacheEnabled: true,
        cacheTtl: 1000,
      };

      const cachedEngine = new RulesIntegrationEngine(config);
      cachedEngine.addRule(mockRule);

      // First call
      const result1 = await cachedEngine.applyRules(mockPrompt, mockContext);
      expect(result1.appliedRules).toHaveLength(1);

      // Second call should use cache
      const result2 = await cachedEngine.applyRules(mockPrompt, mockContext);
      expect(result2.appliedRules).toHaveLength(1);
    });
  });

  describe('Enhanced Validation and Consistency', () => {
    it('should validate individual rules', () => {
      const validationResult = engine.validateRule(mockRule);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should detect invalid rules during validation', () => {
      const invalidRule: Rule = {
        ...mockRule,
        id: '', // Invalid ID
        conditions: [], // No conditions
      };

      const validationResult = engine.validateRule(invalidRule);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    it('should validate all rules in the engine', () => {
      engine.addRule(mockRule);
      const rule2 = { ...mockRule, id: 'rule-2', name: 'Rule 2' };
      engine.addRule(rule2);

      const validationResult = engine.validateAllRules();

      expect(validationResult.isValid).toBe(true);
    });

    it('should detect rule redundancies', async () => {
      const rule1: Rule = {
        ...mockRule,
        id: 'rule1',
        name: 'Rule 1',
      };

      const rule2: Rule = {
        ...mockRule,
        id: 'rule2',
        name: 'Rule 2',
        // Same conditions and actions as rule1
      };

      const consistencyResult = await engine.validateRuleConsistency([rule1, rule2]);

      expect(consistencyResult.redundancies.length).toBeGreaterThan(0);
      expect(consistencyResult.redundancies[0].type).toBe('duplicate');
    });

    it('should detect rule gaps for missing categories', async () => {
      // Only add identity-specific rule, missing other categories
      const identityRule: Rule = {
        ...mockRule,
        category: 'identity-specific',
      };

      const consistencyResult = await engine.validateRuleConsistency([identityRule]);

      expect(consistencyResult.gaps.length).toBeGreaterThan(0);
      expect(consistencyResult.gaps.some((gap) => gap.category === 'security')).toBe(true);
    });

    it('should detect gaps for missing identity coverage', async () => {
      // Only add rule for 'User' identity
      const userRule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'equals',
            value: 'User',
          },
        ],
      };

      const consistencyResult = await engine.validateRuleConsistency([userRule]);

      expect(
        consistencyResult.gaps.some(
          (gap) => gap.description.includes('Superviseur') || gap.description.includes('Responsable'),
        ),
      ).toBe(true);
    });

    it('should calculate overall consistency score', async () => {
      const goodRule1: Rule = {
        ...mockRule,
        id: 'good-rule-1',
        category: 'identity-specific',
      };

      const goodRule2: Rule = {
        ...mockRule,
        id: 'good-rule-2',
        category: 'security',
        actions: [{ type: 'append', target: 'description', content: ' [Security note]' }],
      };

      const consistencyResult = await engine.validateRuleConsistency([goodRule1, goodRule2]);

      expect(consistencyResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(consistencyResult.overallScore).toBeLessThanOrEqual(100);
      expect(typeof consistencyResult.overallScore).toBe('number');
    });

    it('should detect overlapping rules', async () => {
      const rule1: Rule = {
        ...mockRule,
        id: 'rule1',
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'equals',
            value: 'User',
          },
        ],
        actions: [{ type: 'modify', target: 'content', content: 'User content' }],
      };

      const rule2: Rule = {
        ...mockRule,
        id: 'rule2',
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'equals',
            value: 'Superviseur', // Different value, same field
          },
        ],
        actions: [{ type: 'modify', target: 'content', content: 'Superviseur content' }], // Same target
      };

      const consistencyResult = await engine.validateRuleConsistency([rule1, rule2]);

      expect(consistencyResult.redundancies.some((r) => r.type === 'overlapping')).toBe(true);
    });

    it('should detect superseded rules', async () => {
      const lowPriorityRule: Rule = {
        ...mockRule,
        id: 'low-priority',
        priority: 'low',
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'equals',
            value: 'User',
          },
        ],
      };

      const highPriorityRule: Rule = {
        ...mockRule,
        id: 'high-priority',
        priority: 'critical',
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'exists',
            value: null, // More general condition
          },
        ],
      };

      const consistencyResult = await engine.validateRuleConsistency([lowPriorityRule, highPriorityRule]);

      expect(consistencyResult.redundancies.some((r) => r.type === 'superseded')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid rule conditions gracefully', async () => {
      const invalidRule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'invalid' as unknown as import('../../models/rule').RuleCondition['type'],
            field: 'nonexistent',
            operator: 'equals',
            value: 'test',
          },
        ],
      };

      engine.addRule(invalidRule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      // Should not throw, but rule should not be applied
      expect(result.appliedRules).toHaveLength(0);
    });

    it('should handle invalid rule actions gracefully', async () => {
      const invalidActionRule: Rule = {
        ...mockRule,
        actions: [
          {
            type: 'invalid' as unknown as import('../../models/rule').RuleAction['type'],
            target: 'content',
            content: 'test',
          },
        ],
      };

      engine.addRule(invalidActionRule);

      // Should not throw
      await expect(engine.applyRules(mockPrompt, mockContext)).resolves.toBeDefined();
    });

    it('should handle missing fields gracefully', async () => {
      const rule: Rule = {
        ...mockRule,
        conditions: [
          {
            type: 'prompt',
            field: 'nonexistent.field',
            operator: 'equals',
            value: 'test',
          },
        ],
      };

      engine.addRule(rule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.appliedRules).toHaveLength(0);
    });

    it('should validate enriched prompts and detect issues', async () => {
      const rule: Rule = {
        ...mockRule,
        actions: [
          {
            type: 'modify',
            target: 'content',
            content: '', // This will result in empty content
          },
        ],
      };

      engine.addRule(rule);
      const result = await engine.applyRules(mockPrompt, mockContext);

      expect(result.validationResults).toBeDefined();
      expect(result.validationResults.length).toBeGreaterThan(0);
    });
  });
});
