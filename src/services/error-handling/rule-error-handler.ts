// Rule error handler with conflict resolution

import type { Result } from '../../models/result';
import { success, failure } from '../../models/result';
import type { SystemError, RecoveryResult, ErrorHandlingOptions, RuleError } from '../../models/errors';
import { ErrorCategory } from '../../models/errors';
import { ErrorHandler } from './error-handler-chain';
import type { Rule, AppliedRuleInfo } from '../../models/rule';

export interface RuleRecoveryContext {
  conflictingRules?: Rule[];
  appliedRules?: AppliedRuleInfo[];
  targetPrompt?: string;
  requestedOperation: string;
}

export class RuleErrorHandler extends ErrorHandler<RuleRecoveryContext> {
  protected canHandle(error: SystemError): boolean {
    return error.category === ErrorCategory.RULE;
  }

  protected async handleError(
    error: SystemError,
    context: RuleRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<RuleRecoveryContext>, SystemError>> {
    const ruleError = error as RuleError;

    switch (ruleError.code) {
      case 'RULE_CONFLICT':
        return this.handleRuleConflict(ruleError, context, options);

      case 'RULE_VALIDATION_FAILED':
        return this.handleValidationFailure(ruleError, context, options);

      case 'RULE_APPLICATION_FAILED':
        return this.handleApplicationFailure(ruleError, context, options);

      case 'RULE_NOT_FOUND':
        return this.handleMissingRule(ruleError, context, options);

      default:
        return failure(ruleError);
    }
  }

  private async handleRuleConflict(
    error: RuleError,
    context: RuleRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<RuleRecoveryContext>, SystemError>> {
    if (!options.enableFallback || !context.conflictingRules) {
      return failure(error);
    }

    // Resolve conflicts using priority-based strategy
    const resolvedRules = this.resolveRuleConflicts(context.conflictingRules);

    const recoveryResult: RecoveryResult<RuleRecoveryContext> = {
      success: true,
      value: {
        ...context,
        appliedRules: resolvedRules.map((rule) => ({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          priority: rule.priority,
          impact: 'medium' as const,
          modifications: [],
          executionTime: 0,
          success: true,
        })),
      },
      fallbackUsed: true,
      recoveryStrategy: 'priority-based-conflict-resolution',
      warnings: [
        `Resolved ${context.conflictingRules.length - resolvedRules.length} rule conflicts`,
        'Some rules may have been deprioritized or skipped',
      ],
    };

    return success(recoveryResult);
  }

  private async handleValidationFailure(
    error: RuleError,
    context: RuleRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<RuleRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Skip invalid rules and continue with valid ones
    const validRules = context.appliedRules?.filter((rule) => this.isRuleValid(rule)) || [];

    const recoveryResult: RecoveryResult<RuleRecoveryContext> = {
      success: true,
      value: {
        ...context,
        appliedRules: validRules,
      },
      fallbackUsed: true,
      recoveryStrategy: 'skip-invalid-rules',
      warnings: [
        'Some rules failed validation and were skipped',
        'Prompt generation will continue with valid rules only',
      ],
    };

    return success(recoveryResult);
  }

  private async handleApplicationFailure(
    error: RuleError,
    context: RuleRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<RuleRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Retry with simplified rule application
    const simplifiedRules = this.simplifyRules(context.appliedRules || []);

    const recoveryResult: RecoveryResult<RuleRecoveryContext> = {
      success: true,
      value: {
        ...context,
        appliedRules: simplifiedRules,
      },
      fallbackUsed: true,
      recoveryStrategy: 'simplified-rule-application',
      warnings: [
        'Rule application failed, using simplified rule set',
        'Some advanced rule features may not be applied',
      ],
    };

    return success(recoveryResult);
  }

  private async handleMissingRule(
    error: RuleError,
    context: RuleRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<RuleRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Continue without the missing rule
    const recoveryResult: RecoveryResult<RuleRecoveryContext> = {
      success: true,
      value: context,
      fallbackUsed: true,
      recoveryStrategy: 'skip-missing-rule',
      warnings: ['Required rule not found, continuing without it', 'Prompt may not include all intended constraints'],
    };

    return success(recoveryResult);
  }

  private resolveRuleConflicts(conflictingRules: Rule[]): Rule[] {
    // Sort rules by priority (higher priority first)
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const sortedRules = [...conflictingRules].sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 0;
      const priorityB = priorityOrder[b.priority] || 0;
      return priorityB - priorityA;
    });

    const resolvedRules: Rule[] = [];
    const appliedCategories = new Set<string>();

    for (const rule of sortedRules) {
      const category = rule.category || 'default';

      // If we haven't applied a rule from this category yet, apply it
      if (!appliedCategories.has(category)) {
        resolvedRules.push(rule);
        appliedCategories.add(category);
      }
    }

    return resolvedRules;
  }

  private isRuleValid(appliedRule: AppliedRuleInfo): boolean {
    // Basic validation - check if rule has required properties
    return !!(appliedRule.ruleId && appliedRule.ruleName && appliedRule.success !== undefined);
  }

  private simplifyRules(appliedRules: AppliedRuleInfo[]): AppliedRuleInfo[] {
    // Create simplified versions of rules that are more likely to succeed
    return appliedRules.map((rule) => ({
      ...rule,
      modifications: [], // Remove complex modifications
      result: 'simplified',
    }));
  }
}
