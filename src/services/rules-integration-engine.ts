// Rules Integration Engine Service - Complete implementation

import type { IRulesIntegrationEngine } from '../config/di-container';
import type {
  Rule,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleApplicationResult,
  RuleConflict,
  RuleValidationResult,
  ConsistencyCheckResult,
  RuleEnrichedPrompt,
  ConditionOperator,
  RuleEngineConfig,
  ConflictResolution,
  ConflictSeverity,
  AppliedRuleInfo,
  RuleModification,
  RuleWarning,
  RuleError,
  RuleValidationError,
  RuleValidationWarning,
  RuleValidationSuggestion,
} from '../models/rule';
import type { BasePrompt } from '../models/prompt';
import type { ProjectContext } from '../models/context';
import type { UserIdentity } from '../models/identity';
import { RuleValidator } from './rule-validator';
import { loggingService } from './error-handling';

export class RulesIntegrationEngine implements IRulesIntegrationEngine {
  private rules: Map<string, Rule> = new Map();
  private predicateCache: Map<string, boolean> = new Map();
  private config: RuleEngineConfig;

  constructor(config?: Partial<RuleEngineConfig>) {
    this.config = {
      maxExecutionTime: 5000,
      enableConflictDetection: true,
      enablePerformanceMetrics: true,
      defaultResolutionStrategy: 'priority_based',
      validationLevel: 'moderate',
      cacheEnabled: true,
      cacheTtl: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Apply rules to a prompt with given context
   */
  async applyRules(prompt: BasePrompt, context: ProjectContext): Promise<RuleEnrichedPrompt> {
    const startTime = Date.now();

    try {
      // Create evaluation context with a mock identity for testing
      const evaluationContext: RuleEvaluationContext = {
        identity: {
          type: 'User', // Default identity type for testing
          permissions: [],
          preferences: {
            language: 'fr',
            responseStyle: 'concise',
            technicalLevel: 'basic',
            customizations: [],
          },
          customizations: [],
        } as UserIdentity,
        projectContext: context,
        prompt,
        variables: {},
      };

      // Get applicable rules
      const applicableRules = await this.getApplicableRules(evaluationContext);

      // Detect conflicts if enabled
      let conflictResolutions: ConflictResolution[] = [];
      if (this.config.enableConflictDetection) {
        const conflicts = await this.detectRuleConflicts(applicableRules);
        conflictResolutions = await this.resolveConflicts(conflicts.conflicts);
      }

      // Apply rules in priority order
      const applicationResults: RuleApplicationResult[] = [];
      const appliedRules: AppliedRuleInfo[] = [];
      let enrichedPrompt = { ...prompt } as RuleEnrichedPrompt;

      for (const rule of applicableRules) {
        const applicationResult = await this.applyRule(rule, enrichedPrompt, evaluationContext);
        applicationResults.push(applicationResult);

        if (applicationResult.success) {
          appliedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            priority: rule.priority,
            impact: this.calculateRuleImpact(applicationResult.modifications),
            modifications: applicationResult.modifications.map((m) => m.description),
            executionTime: applicationResult.executionTime,
            success: true,
          });

          // Apply modifications to the prompt
          enrichedPrompt = this.applyModifications(enrichedPrompt, applicationResult.modifications);
        }
      }

      // Validate the enriched prompt
      const validationResults = await this.validateEnrichedPrompt(enrichedPrompt);

      const result: RuleEnrichedPrompt = {
        ...enrichedPrompt,
        appliedRules,
        ruleApplicationResults: applicationResults,
        conflictResolutions,
        validationResults: [validationResults],
      };

      // Update usage statistics
      await this.updateRuleUsageStats(applicableRules, applicationResults);

      return result;
    } catch (error) {
      throw new Error(`Rule application failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        cause: error,
      });
    } finally {
      if (this.config.enablePerformanceMetrics) {
        const executionTime = Date.now() - startTime;
        loggingService.logInfo('rules-engine', `Rules application completed in ${executionTime}ms`);
      }
    }
  }

  /**
   * Validate rule consistency across a set of rules
   */
  async validateRuleConsistency(rules: Rule[]): Promise<ConsistencyCheckResult> {
    const conflicts = await this.detectRuleConflicts(rules);
    const redundancies = await this.detectRuleRedundancies(rules);
    const gaps = await this.detectRuleGaps(rules);

    // Calculate overall consistency score
    const totalIssues = conflicts.conflicts.length + redundancies.length + gaps.length;
    const maxPossibleIssues = Math.max(1, rules.length); // Avoid division by zero
    const overallScore = Math.max(0, 100 - (totalIssues / maxPossibleIssues) * 50); // Adjusted scoring

    return {
      isConsistent: conflicts.conflicts.length === 0 && redundancies.length === 0,
      conflicts: conflicts.conflicts,
      redundancies,
      gaps,
      overallScore: Math.round(overallScore),
    };
  }

  /**
   * Detect conflicts between rules
   */
  async detectRuleConflicts(rules: Rule[]): Promise<{ conflicts: RuleConflict[]; resolutions: ConflictResolution[] }> {
    const conflicts: RuleConflict[] = [];

    // Check for action conflicts
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];

        const conflict = await this.checkRuleConflict(rule1, rule2);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // Generate resolutions for conflicts
    const resolutions = await Promise.all(conflicts.map((conflict) => this.generateConflictResolution(conflict)));

    return { conflicts, resolutions };
  }

  /**
   * Add a rule to the engine
   */
  addRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
    this.clearCache();
  }

  /**
   * Remove a rule from the engine
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.clearCache();
    }
    return removed;
  }

  /**
   * Get all rules
   */
  getRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get applicable rules for a given context
   */
  private async getApplicableRules(context: RuleEvaluationContext): Promise<Rule[]> {
    const applicableRules: Rule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      const evaluationResult = await this.evaluateRule(rule, context);
      if (evaluationResult.isApplicable) {
        applicableRules.push(rule);
      }
    }

    // Sort by priority (critical > high > medium > low)
    return applicableRules.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Evaluate if a rule is applicable in the given context
   */
  private async evaluateRule(rule: Rule, context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const startTime = Date.now();
    const conditionResults = [];

    let isApplicable = true;

    for (let i = 0; i < rule.conditions.length; i++) {
      const condition = rule.conditions[i];
      const result = await this.evaluateCondition(condition, context);
      conditionResults.push({
        conditionIndex: i,
        result: result.result,
        actualValue: result.actualValue,
        expectedValue: condition.value,
        operator: condition.operator,
      });

      if (!result.result) {
        isApplicable = false;
        break;
      }
    }

    return {
      ruleId: rule.id,
      isApplicable,
      conditionResults,
      confidence: this.calculateConfidence(conditionResults),
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: unknown,
    context: RuleEvaluationContext,
  ): Promise<{ result: boolean; actualValue: unknown }> {
    const cond = condition as Record<string, unknown>;
    const cacheKey = `${cond.type}_${cond.field}_${JSON.stringify(cond.value)}_${context.identity.type}`;

    if (this.config.cacheEnabled && this.predicateCache.has(cacheKey)) {
      return { result: this.predicateCache.get(cacheKey)!, actualValue: null };
    }

    let actualValue: unknown;
    let result: boolean;

    try {
      // Get the actual value based on condition type and field
      switch (cond.type) {
        case 'identity':
          actualValue = this.getIdentityValue(context.identity, cond.field as string);
          break;
        case 'context':
          actualValue = this.getContextValue(context.projectContext, cond.field as string);
          break;
        case 'prompt':
          actualValue = this.getPromptValue(context.prompt, cond.field as string);
          break;
        default:
          actualValue = context.variables[cond.field as string];
      }

      // Apply the operator
      result = this.applyOperator(actualValue, cond.operator as ConditionOperator, cond.value);

      // Apply negation if specified
      if (cond.negated) {
        result = !result;
      }

      // Cache the result
      if (this.config.cacheEnabled) {
        this.predicateCache.set(cacheKey, result);
      }
    } catch (error) {
      loggingService.logWarning('rules-engine', `Error evaluating condition:`, { error });
      result = false;
    }

    return { result, actualValue };
  }

  /**
   * Apply an operator to compare values
   */
  private applyOperator(actualValue: unknown, operator: ConditionOperator, expectedValue: unknown): boolean {
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(actualValue).includes(String(expectedValue));
      case 'starts_with':
        return String(actualValue).startsWith(String(expectedValue));
      case 'ends_with':
        return String(actualValue).endsWith(String(expectedValue));
      case 'matches_regex':
        return new RegExp(String(expectedValue)).test(String(actualValue));
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      case 'greater_equal':
        return Number(actualValue) >= Number(expectedValue);
      case 'less_equal':
        return Number(actualValue) <= Number(expectedValue);
      case 'in_array':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      case 'not_in_array':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      case 'not_exists':
        return actualValue === undefined || actualValue === null;
      default:
        return false;
    }
  }

  /**
   * Get value from identity object
   */
  private getIdentityValue(identity: UserIdentity, field: string): unknown {
    const fieldPath = field.split('.');
    let value: unknown = identity as unknown as Record<string, unknown>;

    for (const part of fieldPath) {
      value = (value as Record<string, unknown>)?.[part];
    }

    return value;
  }

  /**
   * Get value from context object
   */
  private getContextValue(context: ProjectContext, field: string): unknown {
    const fieldPath = field.split('.');
    let value: unknown = context as unknown as Record<string, unknown>;

    for (const part of fieldPath) {
      value = (value as Record<string, unknown>)?.[part];
    }

    return value;
  }

  /**
   * Get value from prompt object
   */
  private getPromptValue(prompt: BasePrompt, field: string): unknown {
    const fieldPath = field.split('.');
    let value: unknown = prompt as unknown as Record<string, unknown>;

    for (const part of fieldPath) {
      value = (value as Record<string, unknown>)?.[part];
    }

    return value;
  }

  /**
   * Apply a single rule to a prompt
   */
  private async applyRule(
    rule: Rule,
    prompt: RuleEnrichedPrompt,
    context: RuleEvaluationContext,
  ): Promise<RuleApplicationResult> {
    const startTime = Date.now();
    const modifications: RuleModification[] = [];
    const warnings: RuleWarning[] = [];
    const errors: RuleError[] = [];

    try {
      for (const action of rule.actions) {
        const modification = await this.applyRuleAction(action, prompt, context);
        if (modification) {
          modifications.push(modification);
        }
      }

      return {
        ruleId: rule.id,
        success: errors.length === 0,
        modifications,
        warnings,
        errors,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      errors.push({
        code: 'RULE_APPLICATION_ERROR',
        message: `Failed to apply rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cause: error instanceof Error ? error : undefined,
      });

      return {
        ruleId: rule.id,
        success: false,
        modifications,
        warnings,
        errors,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Apply a single rule action
   */
  private async applyRuleAction(
    action: unknown,
    prompt: RuleEnrichedPrompt,
    _context: RuleEvaluationContext,
  ): Promise<RuleModification | null> {
    const act = action as Record<string, unknown>;
    const oldValue = this.getPromptValue(prompt, act.target as string);
    let newValue: unknown;

    switch (act.type) {
      case 'modify':
        newValue = act.content;
        break;
      case 'append':
        newValue = String(oldValue || '') + String(act.content || '');
        break;
      case 'prepend':
        newValue = String(act.content || '') + String(oldValue || '');
        break;
      case 'replace': {
        const params = act.parameters as Record<string, unknown>;
        newValue = String(oldValue || '').replace(
          new RegExp((params?.pattern as string) || '', (params?.flags as string) || 'g'),
          String(act.content || ''),
        );
        break;
      }
      default:
        return null;
    }

    return {
      type: 'content',
      field: act.target as string,
      oldValue,
      newValue,
      description: `Applied ${act.type} action to ${act.target}`,
    };
  }

  /**
   * Apply modifications to a prompt
   */
  private applyModifications(prompt: RuleEnrichedPrompt, modifications: RuleModification[]): RuleEnrichedPrompt {
    const result = { ...prompt };

    for (const modification of modifications) {
      this.setPromptValue(result, modification.field, modification.newValue);
    }

    return result;
  }

  /**
   * Set value in prompt object
   */
  private setPromptValue(prompt: unknown, field: string, value: unknown): void {
    const fieldPath = field.split('.');
    let current = prompt as Record<string, unknown>;

    for (let i = 0; i < fieldPath.length - 1; i++) {
      const part = fieldPath[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[fieldPath[fieldPath.length - 1]] = value;
  }

  /**
   * Check for conflicts between two rules
   */
  private async checkRuleConflict(rule1: Rule, rule2: Rule): Promise<RuleConflict | null> {
    // Check for target conflicts
    const rule1Targets = rule1.actions.map((a) => a.target);
    const rule2Targets = rule2.actions.map((a) => a.target);

    const commonTargets = rule1Targets.filter((t) => rule2Targets.includes(t));

    if (commonTargets.length > 0) {
      return {
        type: 'target_conflict',
        severity: this.calculateConflictSeverity(rule1, rule2),
        rules: [
          { ruleId: rule1.id, ruleName: rule1.name, conflictingAction: rule1.actions[0], priority: rule1.priority },
          { ruleId: rule2.id, ruleName: rule2.name, conflictingAction: rule2.actions[0], priority: rule2.priority },
        ],
        description: `Rules ${rule1.name} and ${rule2.name} both target: ${commonTargets.join(', ')}`,
        suggestedResolution: {
          strategy: 'priority_based',
          selectedRuleId:
            rule1.priority === 'critical' || (rule1.priority === 'high' && rule2.priority !== 'critical')
              ? rule1.id
              : rule2.id,
          userInteractionRequired: rule1.priority === rule2.priority,
          description: 'Apply rule with higher priority',
        },
      };
    }

    return null;
  }

  /**
   * Calculate conflict severity
   */
  private calculateConflictSeverity(rule1: Rule, rule2: Rule): ConflictSeverity {
    if (rule1.priority === 'critical' || rule2.priority === 'critical') {
      return 'critical';
    }
    if (rule1.priority === 'high' || rule2.priority === 'high') {
      return 'high';
    }
    return 'medium';
  }

  /**
   * Generate conflict resolution
   */
  private async generateConflictResolution(conflict: RuleConflict): Promise<ConflictResolution> {
    if (conflict.suggestedResolution) {
      return conflict.suggestedResolution;
    }

    return {
      strategy: this.config.defaultResolutionStrategy,
      userInteractionRequired: true,
      description: 'Manual resolution required',
    };
  }

  /**
   * Resolve conflicts using specified strategies
   */
  private async resolveConflicts(conflicts: RuleConflict[]): Promise<ConflictResolution[]> {
    return Promise.all(conflicts.map((conflict) => this.generateConflictResolution(conflict)));
  }

  /**
   * Calculate rule impact based on modifications
   */
  private calculateRuleImpact(modifications: RuleModification[]): 'low' | 'medium' | 'high' {
    if (modifications.length === 0) return 'low';
    if (modifications.length <= 2) return 'medium';
    return 'high';
  }

  /**
   * Calculate confidence score for rule evaluation
   */
  private calculateConfidence(conditionResults: unknown[]): number {
    if (conditionResults.length === 0) return 0;
    const successfulConditions = conditionResults.filter((r) => (r as Record<string, unknown>).result).length;
    return (successfulConditions / conditionResults.length) * 100;
  }

  /**
   * Validate enriched prompt
   */
  private async validateEnrichedPrompt(prompt: RuleEnrichedPrompt): Promise<RuleValidationResult> {
    // Validate the prompt structure and applied rules
    const errors: RuleValidationError[] = [];
    const warnings: RuleValidationWarning[] = [];
    const suggestions: RuleValidationSuggestion[] = [];

    // Check if prompt content is valid after rule application
    if (!prompt.content || typeof prompt.content !== 'string' || prompt.content.trim() === '') {
      errors.push({
        field: 'content',
        message: 'Prompt content is empty after rule application',
        code: 'EMPTY_PROMPT_CONTENT',
        severity: 'error',
      });
    }

    // Check for excessive prompt length
    if (prompt.content && prompt.content.length > 10000) {
      warnings.push({
        field: 'content',
        message: 'Prompt content is very long after rule application',
        code: 'LONG_PROMPT_CONTENT',
        impact: 'medium',
      });
    }

    // Validate applied rules
    if (prompt.appliedRules && prompt.appliedRules.length > 10) {
      warnings.push({
        field: 'appliedRules',
        message: `High number of applied rules (${prompt.appliedRules.length})`,
        code: 'TOO_MANY_APPLIED_RULES',
        impact: 'medium',
      });
    }

    // Check for failed rule applications
    const failedRules = prompt.ruleApplicationResults?.filter((r) => !r.success) || [];
    if (failedRules.length > 0) {
      warnings.push({
        field: 'ruleApplicationResults',
        message: `${failedRules.length} rules failed to apply`,
        code: 'FAILED_RULE_APPLICATIONS',
        impact: 'high',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate a rule before adding it to the engine
   */
  validateRule(rule: Rule): RuleValidationResult {
    return RuleValidator.validateRule(rule);
  }

  /**
   * Validate all rules in the engine
   */
  validateAllRules(): RuleValidationResult {
    const rules = Array.from(this.rules.values());
    return RuleValidator.validateRuleSet(rules);
  }

  /**
   * Update usage statistics for rules
   */
  private async updateRuleUsageStats(rules: Rule[], results: RuleApplicationResult[]): Promise<void> {
    for (const rule of rules) {
      const result = results.find((r) => r.ruleId === rule.id);
      if (result) {
        rule.metadata.usage.totalApplications++;
        if (result.success) {
          rule.metadata.usage.successfulApplications++;
        } else {
          rule.metadata.usage.failedApplications++;
        }
        rule.metadata.usage.lastApplied = new Date();
        rule.metadata.usage.averageExecutionTime =
          (rule.metadata.usage.averageExecutionTime + result.executionTime) / 2;
      }
    }
  }

  /**
   * Detect rule redundancies
   */
  private async detectRuleRedundancies(rules: Rule[]): Promise<import('../models/rule').RuleRedundancy[]> {
    const redundancies: import('../models/rule').RuleRedundancy[] = [];

    // Check for duplicate rules (same conditions and actions)
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];

        if (this.areRulesDuplicate(rule1, rule2)) {
          redundancies.push({
            type: 'duplicate',
            rules: [rule1.id, rule2.id],
            description: `Rules ${rule1.name} and ${rule2.name} are duplicates`,
            recommendation: `Remove one of the duplicate rules: ${rule1.id} or ${rule2.id}`,
          });
        } else if (this.areRulesOverlapping(rule1, rule2)) {
          redundancies.push({
            type: 'overlapping',
            rules: [rule1.id, rule2.id],
            description: `Rules ${rule1.name} and ${rule2.name} have overlapping functionality`,
            recommendation: `Consider merging rules ${rule1.id} and ${rule2.id} or making their conditions more specific`,
          });
        } else if (this.isRuleSuperseded(rule1, rule2)) {
          redundancies.push({
            type: 'superseded',
            rules: [rule1.id, rule2.id],
            description: `Rule ${rule1.name} is superseded by ${rule2.name}`,
            recommendation: `Consider removing the superseded rule: ${rule1.id}`,
          });
        }
      }
    }

    return redundancies;
  }

  /**
   * Detect rule gaps in coverage
   */
  private async detectRuleGaps(rules: Rule[]): Promise<import('../models/rule').RuleGap[]> {
    const gaps: import('../models/rule').RuleGap[] = [];

    // Check for missing rule categories
    const existingCategories = new Set(rules.map((r) => r.category));
    const expectedCategories: import('../models/rule').RuleCategory[] = [
      'identity-specific',
      'context-aware',
      'quality-assurance',
      'security',
      'performance',
      'formatting',
      'validation',
      'personalization',
    ];

    for (const category of expectedCategories) {
      if (!existingCategories.has(category)) {
        gaps.push({
          category,
          description: `No rules found for category: ${category}`,
          suggestedRules: this.getSuggestedRulesForCategory(category),
          priority: this.getCategoryPriority(category),
        });
      }
    }

    // Check for missing identity coverage
    const identityTypes = ['User', 'Superviseur', 'Responsable'];
    const coveredIdentities = new Set();

    rules.forEach((rule) => {
      rule.conditions.forEach((condition) => {
        if (condition.type === 'identity' && condition.field === 'type') {
          coveredIdentities.add(condition.value);
        }
      });
    });

    for (const identityType of identityTypes) {
      if (!coveredIdentities.has(identityType)) {
        gaps.push({
          category: 'identity-specific',
          description: `No identity-specific rules found for: ${identityType}`,
          suggestedRules: [
            `${identityType.toLowerCase()}-specific-formatting`,
            `${identityType.toLowerCase()}-content-enhancement`,
          ],
          priority: 'high',
        });
      }
    }

    return gaps;
  }

  /**
   * Check if two rules are duplicates
   */
  private areRulesDuplicate(rule1: Rule, rule2: Rule): boolean {
    // Compare conditions
    if (rule1.conditions.length !== rule2.conditions.length) return false;

    for (let i = 0; i < rule1.conditions.length; i++) {
      const cond1 = rule1.conditions[i];
      const cond2 = rule2.conditions[i];

      if (
        cond1.type !== cond2.type ||
        cond1.field !== cond2.field ||
        cond1.operator !== cond2.operator ||
        cond1.value !== cond2.value
      ) {
        return false;
      }
    }

    // Compare actions
    if (rule1.actions.length !== rule2.actions.length) return false;

    for (let i = 0; i < rule1.actions.length; i++) {
      const action1 = rule1.actions[i];
      const action2 = rule2.actions[i];

      if (action1.type !== action2.type || action1.target !== action2.target || action1.content !== action2.content) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if two rules have overlapping functionality
   */
  private areRulesOverlapping(rule1: Rule, rule2: Rule): boolean {
    // Check if rules target the same fields with similar conditions
    const rule1Targets = rule1.actions.map((a) => a.target);
    const rule2Targets = rule2.actions.map((a) => a.target);

    const commonTargets = rule1Targets.filter((t) => rule2Targets.includes(t));
    if (commonTargets.length === 0) return false;

    // Check if conditions are similar (same type and field, different values)
    for (const cond1 of rule1.conditions) {
      for (const cond2 of rule2.conditions) {
        if (
          cond1.type === cond2.type &&
          cond1.field === cond2.field &&
          cond1.operator === cond2.operator &&
          cond1.value !== cond2.value
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if one rule is superseded by another
   */
  private isRuleSuperseded(rule1: Rule, rule2: Rule): boolean {
    // Rule1 is superseded by rule2 if:
    // 1. Rule2 has higher priority
    // 2. Rule2's conditions are more general (cover rule1's conditions)
    // 3. Rule2's actions include rule1's actions

    if (this.getPriorityValue(rule2.priority) <= this.getPriorityValue(rule1.priority)) {
      return false;
    }

    // Check if rule2's conditions are more general
    for (const cond1 of rule1.conditions) {
      let found = false;
      for (const cond2 of rule2.conditions) {
        if (this.isConditionMoreGeneral(cond2, cond1)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }

    return true;
  }

  /**
   * Check if one condition is more general than another
   */
  private isConditionMoreGeneral(general: unknown, specific: unknown): boolean {
    const gen = general as Record<string, unknown>;
    const spec = specific as Record<string, unknown>;

    if (gen.type !== spec.type || gen.field !== spec.field) {
      return false;
    }

    // Check if general condition covers specific condition
    if (gen.operator === 'exists' && spec.operator !== 'not_exists') {
      return true; // 'exists' is more general than most other operators
    }

    if (gen.operator === 'in_array' && spec.operator === 'equals') {
      return Array.isArray(gen.value) && (gen.value as unknown[]).includes(spec.value);
    }

    // More sophisticated logic would be needed for different operators
    return false;
  }

  /**
   * Get priority value for comparison
   */
  private getPriorityValue(priority: import('../models/rule').RulePriority): number {
    const priorityMap = { low: 1, medium: 2, high: 3, critical: 4 };
    return priorityMap[priority];
  }

  /**
   * Get suggested rules for a category
   */
  private getSuggestedRulesForCategory(category: import('../models/rule').RuleCategory): string[] {
    const suggestions: Record<import('../models/rule').RuleCategory, string[]> = {
      'identity-specific': ['user-simplification', 'superviseur-optimization', 'responsable-validation'],
      'context-aware': ['project-phase-adaptation', 'technology-specific-prompts'],
      'quality-assurance': ['content-validation', 'format-checking'],
      security: ['sensitive-data-filtering', 'permission-validation'],
      performance: ['prompt-optimization', 'response-caching'],
      formatting: ['markdown-formatting', 'code-highlighting'],
      validation: ['input-validation', 'output-validation'],
      personalization: ['user-preference-application', 'custom-templates'],
    };

    return suggestions[category] || [];
  }

  /**
   * Get priority for a category
   */
  private getCategoryPriority(category: import('../models/rule').RuleCategory): 'low' | 'medium' | 'high' {
    const priorityMap: Record<import('../models/rule').RuleCategory, 'low' | 'medium' | 'high'> = {
      'identity-specific': 'high',
      'context-aware': 'high',
      'quality-assurance': 'medium',
      security: 'high',
      performance: 'medium',
      formatting: 'low',
      validation: 'medium',
      personalization: 'low',
    };

    return priorityMap[category] || 'medium';
  }

  /**
   * Clear the predicate cache
   */
  private clearCache(): void {
    this.predicateCache.clear();
  }
}
