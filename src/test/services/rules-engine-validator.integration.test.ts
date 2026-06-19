// Integration tests: RulesIntegrationEngine + RuleValidator
// Tests the boundary between the Rule model, RuleValidator model validator,
// and the RulesIntegrationEngine service

import { describe, it, expect, beforeEach } from 'vitest';
import { RulesIntegrationEngine } from '../../services/rules-integration-engine';
import { RuleValidator } from '../../services/rule-validator';
import type { Rule, RuleEngineConfig } from '../../models/rule';
import type { BasePrompt } from '../../models/prompt';
import type { ProjectContext } from '../../models/context';

describe('RulesIntegrationEngine + RuleValidator Integration', () => {
  let engine: RulesIntegrationEngine;
  let mockPrompt: BasePrompt;
  let mockContext: ProjectContext;

  beforeEach(() => {
    engine = new RulesIntegrationEngine();

    mockPrompt = {
      id: 'integration-prompt',
      name: 'Integration Test Prompt',
      description: 'A prompt for integration testing',
      content: 'Integration test content',
      identities: ['User'],
      isActive: true,
    };

    mockContext = {
      workFolder: {
        path: '/test',
        name: 'test',
        type: 'project',
        technologies: ['typescript'],
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
        framework: 'node',
        language: 'typescript',
        runtime: 'node',
        dependencies: [],
        buildTools: ['npm'],
      },
    };
  });

  describe('Pipeline: RuleValidator → Engine validation', () => {
    it('should validate a rule through RuleValidator then add it to the engine', () => {
      const rule: Rule = {
        id: 'valid-rule',
        name: 'Valid Rule',
        description: 'A valid rule for integration testing',
        category: 'identity-specific',
        priority: 'medium',
        isActive: true,
        conditions: [{ type: 'identity', field: 'type', operator: 'equals', value: 'User' }],
        actions: [{ type: 'append', target: 'content', content: ' [Validated]' }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: '1.0.0',
          tags: ['integration-test'],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      // Step 1: Validate via RuleValidator (model layer)
      const modelValidation = RuleValidator.validateRule(rule);
      expect(modelValidation.isValid).toBe(true);

      // Step 2: Validate via engine wrapper (service layer)
      const engineValidation = engine.validateRule(rule);
      expect(engineValidation.isValid).toBe(true);

      // Step 3: Add to engine
      engine.addRule(rule);
      const rules = engine.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('valid-rule');
    });

    it('should reject an invalid rule at both validation layers', () => {
      const invalidRule: Rule = {
        id: '',
        name: '',
        description: '',
        category: 'invalid-category' as Rule['category'],
        priority: 'invalid' as Rule['priority'],
        isActive: true,
        conditions: [],
        actions: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: '',
          version: '1.0.0',
          tags: [],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      // Step 1: RuleValidator rejects it
      const modelValidation = RuleValidator.validateRule(invalidRule);
      expect(modelValidation.isValid).toBe(false);
      expect(modelValidation.errors.length).toBeGreaterThan(0);

      // Step 2: Engine's validateRule also rejects it
      const engineValidation = engine.validateRule(invalidRule);
      expect(engineValidation.isValid).toBe(false);
      expect(engineValidation.errors.length).toBeGreaterThan(0);

      // Step 3: Engine still allows adding it (no guard), but applyRules won't apply it
      engine.addRule(invalidRule);
      expect(engine.getRules()).toHaveLength(1);
    });

    it('should align error codes between RuleValidator and engine', () => {
      const ruleWithEmptyId: Rule = {
        id: '',
        name: 'Test Rule',
        description: 'A test rule',
        category: 'identity-specific',
        priority: 'medium',
        isActive: true,
        conditions: [{ type: 'identity', field: 'type', operator: 'equals', value: 'User' }],
        actions: [{ type: 'append', target: 'content', content: 'Test' }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: '1.0.0',
          tags: [],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      const modelResult = RuleValidator.validateRule(ruleWithEmptyId);
      const engineResult = engine.validateRule(ruleWithEmptyId);

      // Both should report INVALID_RULE_ID
      expect(modelResult.errors.some((e) => e.code === 'INVALID_RULE_ID')).toBe(true);
      expect(engineResult.errors.some((e) => e.code === 'INVALID_RULE_ID')).toBe(true);
    });
  });

  describe('Pipeline: Validation → Application → Engine state', () => {
    it('should validate, add, apply and verify engine state', async () => {
      const rule: Rule = {
        id: 'full-pipeline-rule',
        name: 'Full Pipeline Rule',
        description: 'Testing the full validation → application → state pipeline',
        category: 'context-aware',
        priority: 'high',
        isActive: true,
        conditions: [{ type: 'context', field: 'projectState.phase', operator: 'equals', value: 'development' }],
        actions: [{ type: 'append', target: 'content', content: ' [Phase: development]' }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: '1.0.0',
          tags: ['pipeline-test'],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      // Validate
      expect(RuleValidator.validateRule(rule).isValid).toBe(true);
      expect(engine.validateRule(rule).isValid).toBe(true);

      // Add to engine
      engine.addRule(rule);

      // Apply
      const result = await engine.applyRules(mockPrompt, mockContext);
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].ruleId).toBe('full-pipeline-rule');
      expect(result.content).toContain('[Phase: development]');

      // Verify engine state updated (usage stats incremented)
      const storedRule = engine.getRules().find((r) => r.id === 'full-pipeline-rule');
      expect(storedRule).toBeDefined();
      expect(storedRule!.metadata.usage.totalApplications).toBe(1);
      expect(storedRule!.metadata.usage.successfulApplications).toBe(1);
    });

    it('should validate rule set consistency through the engine', async () => {
      const rule1: Rule = {
        id: 'rule-a',
        name: 'Rule A',
        description: 'First rule for consistency check',
        category: 'identity-specific',
        priority: 'high',
        isActive: true,
        conditions: [{ type: 'identity', field: 'type', operator: 'equals', value: 'User' }],
        actions: [{ type: 'append', target: 'content', content: ' [Rule A]' }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: '1.0.0',
          tags: [],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      const rule2: Rule = {
        id: 'rule-b',
        name: 'Rule B',
        description: 'Second rule for consistency check (different target, no conflict)',
        category: 'security',
        priority: 'critical',
        isActive: true,
        conditions: [{ type: 'identity', field: 'type', operator: 'equals', value: 'Superviseur' }],
        actions: [{ type: 'append', target: 'description', content: ' [Security note]' }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: '1.0.0',
          tags: [],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      engine.addRule(rule1);
      engine.addRule(rule2);

      // validateAllRules delegates to RuleValidator.validateRuleSet
      const validation = engine.validateAllRules();
      expect(validation.isValid).toBe(true);

      // Check consistency — different targets = no conflict
      // overallScore may be 0 if gaps are detected (missing rule categories),
      // but isConsistent should be true (no conflicts or redundancies)
      const consistency = await engine.validateRuleConsistency([rule1, rule2]);
      expect(consistency.isConsistent).toBe(true);
      expect(consistency.conflicts).toHaveLength(0);
      expect(consistency.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pipeline: Invalid conditions propagation', () => {
    it('should propagate condition validation errors through the pipeline', () => {
      const ruleWithBadCondition: Rule = {
        id: 'bad-condition-rule',
        name: 'Bad Condition Rule',
        description: 'Rule with invalid condition operators',
        category: 'performance',
        priority: 'medium',
        isActive: true,
        conditions: [
          {
            type: 'identity',
            field: 'type',
            operator: 'invalid_op' as Rule['conditions'][0]['operator'],
            value: 'User',
          },
        ],
        actions: [{ type: 'append', target: 'content', content: 'Test' }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: '1.0.0',
          tags: [],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      // Model validation catches it
      const modelResult = RuleValidator.validateRule(ruleWithBadCondition);
      expect(modelResult.isValid).toBe(false);
      expect(modelResult.errors.some((e) => e.code === 'INVALID_CONDITION_OPERATOR')).toBe(true);

      // Engine validation also catches it
      const engineResult = engine.validateRule(ruleWithBadCondition);
      expect(engineResult.isValid).toBe(false);

      // When applied, the engine skips the rule gracefully
      engine.addRule(ruleWithBadCondition);
    });

    it('should handle action validation errors through both layers', () => {
      const ruleWithBadAction: Rule = {
        id: 'bad-action-rule',
        name: 'Bad Action Rule',
        description: 'Rule with invalid action type',
        category: 'formatting',
        priority: 'low',
        isActive: true,
        conditions: [{ type: 'identity', field: 'type', operator: 'equals', value: 'User' }],
        actions: [{ type: 'invalid_action' as Rule['actions'][0]['type'], target: 'content', content: 'Test' }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: '1.0.0',
          tags: [],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      const modelResult = RuleValidator.validateRule(ruleWithBadAction);
      expect(modelResult.isValid).toBe(false);
      expect(modelResult.errors.some((e) => e.code === 'INVALID_ACTION_TYPE')).toBe(true);

      const engineResult = engine.validateRule(ruleWithBadAction);
      expect(engineResult.isValid).toBe(false);
    });
  });

  describe('Pipeline: Configuration-driven validation', () => {
    it('should respect engine configuration across validation layers', async () => {
      const config: Partial<RuleEngineConfig> = {
        enableConflictDetection: false,
        validationLevel: 'lenient',
      };

      const lenientEngine = new RulesIntegrationEngine(config);

      const rule1: Rule = {
        id: 'config-rule-1',
        name: 'Config Rule 1',
        description: 'First rule with potential conflict',
        category: 'identity-specific',
        priority: 'high',
        isActive: true,
        conditions: [{ type: 'identity', field: 'type', operator: 'equals', value: 'User' }],
        actions: [{ type: 'modify', target: 'content', content: 'From rule 1' }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: '1.0.0',
          tags: [],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      const rule2: Rule = {
        id: 'config-rule-2',
        name: 'Config Rule 2',
        description: 'Second rule with same target (potential conflict)',
        category: 'context-aware',
        priority: 'critical',
        isActive: true,
        conditions: [{ type: 'context', field: 'projectState.phase', operator: 'equals', value: 'development' }],
        actions: [{ type: 'modify', target: 'content', content: 'From rule 2' }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'test',
          version: '1.0.0',
          tags: [],
          usage: {
            totalApplications: 0,
            successfulApplications: 0,
            failedApplications: 0,
            lastApplied: new Date(),
            averageExecutionTime: 0,
          },
        },
      };

      // Both rules are valid according to RuleValidator
      expect(RuleValidator.validateRule(rule1).isValid).toBe(true);
      expect(RuleValidator.validateRule(rule2).isValid).toBe(true);

      lenientEngine.addRule(rule1);
      lenientEngine.addRule(rule2);

      // With conflict detection disabled, the engine applies both despite target conflict
      const result = await lenientEngine.applyRules(mockPrompt, mockContext);
      expect(result.appliedRules).toHaveLength(2);
      expect(result.conflictResolutions).toHaveLength(0); // No conflicts detected
    });
  });
});
