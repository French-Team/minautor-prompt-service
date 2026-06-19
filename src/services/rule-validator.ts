// Rule Validator Service - Comprehensive rule validation

import type {
  Rule,
  RuleValidationResult,
  RuleValidationError,
  RuleValidationWarning,
  RuleValidationSuggestion,
  RuleCondition,
  RuleAction,
  ConditionOperator,
  RuleCategory,
  RulePriority,
} from '../models/rule';

export class RuleValidator {
  /**
   * Validate a complete rule
   */
  static validateRule(rule: Rule): RuleValidationResult {
    const errors: RuleValidationError[] = [];
    const warnings: RuleValidationWarning[] = [];
    const suggestions: RuleValidationSuggestion[] = [];

    // Validate basic rule structure
    errors.push(...this.validateRuleStructure(rule));

    // Validate conditions
    rule.conditions.forEach((condition, index) => {
      const conditionErrors = this.validateCondition(condition, `conditions[${index}]`);
      errors.push(...conditionErrors);
    });

    // Validate actions
    rule.actions.forEach((action, index) => {
      const actionErrors = this.validateAction(action, `actions[${index}]`);
      errors.push(...actionErrors);
    });

    // Generate warnings and suggestions
    warnings.push(...this.generateRuleWarnings(rule));
    suggestions.push(...this.generateRuleSuggestions(rule));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Validate rule structure
   */
  private static validateRuleStructure(rule: Rule): RuleValidationError[] {
    const errors: RuleValidationError[] = [];

    if (!rule.id || typeof rule.id !== 'string' || rule.id.trim() === '') {
      errors.push({
        field: 'id',
        message: 'Rule ID must be a non-empty string',
        code: 'INVALID_RULE_ID',
        severity: 'error',
      });
    }

    if (!rule.name || typeof rule.name !== 'string' || rule.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Rule name must be a non-empty string',
        code: 'INVALID_RULE_NAME',
        severity: 'error',
      });
    }

    if (!rule.description || typeof rule.description !== 'string' || rule.description.trim() === '') {
      errors.push({
        field: 'description',
        message: 'Rule description must be a non-empty string',
        code: 'INVALID_RULE_DESCRIPTION',
        severity: 'error',
      });
    }

    if (!this.isValidCategory(rule.category)) {
      errors.push({
        field: 'category',
        message: `Invalid rule category: ${rule.category}`,
        code: 'INVALID_RULE_CATEGORY',
        severity: 'error',
      });
    }

    if (!this.isValidPriority(rule.priority)) {
      errors.push({
        field: 'priority',
        message: `Invalid rule priority: ${rule.priority}`,
        code: 'INVALID_RULE_PRIORITY',
        severity: 'error',
      });
    }

    if (typeof rule.isActive !== 'boolean') {
      errors.push({
        field: 'isActive',
        message: 'Rule isActive must be a boolean',
        code: 'INVALID_IS_ACTIVE',
        severity: 'error',
      });
    }

    if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      errors.push({
        field: 'conditions',
        message: 'Rule must have at least one condition',
        code: 'MISSING_CONDITIONS',
        severity: 'error',
      });
    }

    if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
      errors.push({
        field: 'actions',
        message: 'Rule must have at least one action',
        code: 'MISSING_ACTIONS',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate a rule condition
   */
  private static validateCondition(condition: RuleCondition, fieldPrefix: string): RuleValidationError[] {
    const errors: RuleValidationError[] = [];

    if (!condition.type || !['identity', 'context', 'prompt', 'custom'].includes(condition.type)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: 'Condition type must be identity, context, prompt, or custom',
        code: 'INVALID_CONDITION_TYPE',
        severity: 'error',
      });
    }

    if (!condition.field || typeof condition.field !== 'string' || condition.field.trim() === '') {
      errors.push({
        field: `${fieldPrefix}.field`,
        message: 'Condition field must be a non-empty string',
        code: 'INVALID_CONDITION_FIELD',
        severity: 'error',
      });
    }

    if (!this.isValidOperator(condition.operator)) {
      errors.push({
        field: `${fieldPrefix}.operator`,
        message: `Invalid condition operator: ${condition.operator}`,
        code: 'INVALID_CONDITION_OPERATOR',
        severity: 'error',
      });
    }

    // Validate operator-value compatibility
    const operatorValidation = this.validateOperatorValueCompatibility(condition.operator, condition.value);
    if (!operatorValidation.isValid) {
      errors.push({
        field: `${fieldPrefix}.value`,
        message: operatorValidation.message,
        code: 'INCOMPATIBLE_OPERATOR_VALUE',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate a rule action
   */
  private static validateAction(action: RuleAction, fieldPrefix: string): RuleValidationError[] {
    const errors: RuleValidationError[] = [];

    if (!action.type || !['modify', 'append', 'prepend', 'replace', 'validate', 'warn'].includes(action.type)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: 'Action type must be modify, append, prepend, replace, validate, or warn',
        code: 'INVALID_ACTION_TYPE',
        severity: 'error',
      });
    }

    if (!action.target || typeof action.target !== 'string' || action.target.trim() === '') {
      errors.push({
        field: `${fieldPrefix}.target`,
        message: 'Action target must be a non-empty string',
        code: 'INVALID_ACTION_TARGET',
        severity: 'error',
      });
    }

    // Validate content requirement for certain action types
    if (['modify', 'append', 'prepend', 'replace'].includes(action.type)) {
      if (!action.content || typeof action.content !== 'string') {
        errors.push({
          field: `${fieldPrefix}.content`,
          message: `Action type ${action.type} requires content to be a non-empty string`,
          code: 'MISSING_ACTION_CONTENT',
          severity: 'error',
        });
      }
    }

    // Validate parameters for replace action
    if (action.type === 'replace' && action.parameters) {
      if (!action.parameters.pattern || typeof action.parameters.pattern !== 'string') {
        errors.push({
          field: `${fieldPrefix}.parameters.pattern`,
          message: 'Replace action requires a valid pattern parameter',
          code: 'INVALID_REPLACE_PATTERN',
          severity: 'error',
        });
      }
    }

    return errors;
  }

  /**
   * Generate warnings for a rule
   */
  private static generateRuleWarnings(rule: Rule): RuleValidationWarning[] {
    const warnings: RuleValidationWarning[] = [];

    // Check for overly complex conditions
    if (rule.conditions.length > 5) {
      warnings.push({
        field: 'conditions',
        message: `Rule has ${rule.conditions.length} conditions, which may be overly complex`,
        code: 'COMPLEX_CONDITIONS',
        impact: 'medium',
      });
    }

    // Check for too many actions
    if (rule.actions.length > 3) {
      warnings.push({
        field: 'actions',
        message: `Rule has ${rule.actions.length} actions, consider splitting into multiple rules`,
        code: 'TOO_MANY_ACTIONS',
        impact: 'low',
      });
    }

    // Check for potentially conflicting actions
    const targets = rule.actions.map((a) => a.target);
    const duplicateTargets = targets.filter((target, index) => targets.indexOf(target) !== index);
    if (duplicateTargets.length > 0) {
      warnings.push({
        field: 'actions',
        message: `Multiple actions target the same field: ${duplicateTargets.join(', ')}`,
        code: 'DUPLICATE_ACTION_TARGETS',
        impact: 'high',
      });
    }

    // Check for unused negation
    const negatedConditions = rule.conditions.filter((c) => c.negated);
    if (negatedConditions.length > rule.conditions.length / 2) {
      warnings.push({
        field: 'conditions',
        message: 'More than half of conditions are negated, consider restructuring the rule logic',
        code: 'EXCESSIVE_NEGATION',
        impact: 'medium',
      });
    }

    return warnings;
  }

  /**
   * Generate suggestions for a rule
   */
  private static generateRuleSuggestions(rule: Rule): RuleValidationSuggestion[] {
    const suggestions: RuleValidationSuggestion[] = [];

    // Suggest adding description if it's too short
    if (rule.description.length < 20) {
      suggestions.push({
        field: 'description',
        message: 'Consider adding a more detailed description',
        rationale: 'Detailed descriptions help with rule maintenance and understanding',
      });
    }

    // Suggest adding tags if metadata is missing
    if (!rule.metadata.tags || rule.metadata.tags.length === 0) {
      suggestions.push({
        field: 'metadata.tags',
        message: 'Consider adding tags to categorize this rule',
        suggestedValue: [rule.category, rule.priority],
        rationale: 'Tags help with rule organization and discovery',
      });
    }

    // Suggest priority adjustment based on category
    const suggestedPriority = this.getSuggestedPriorityForCategory(rule.category);
    if (suggestedPriority !== rule.priority) {
      suggestions.push({
        field: 'priority',
        message: `Consider changing priority to ${suggestedPriority} for ${rule.category} rules`,
        suggestedValue: suggestedPriority,
        rationale: `${rule.category} rules typically have ${suggestedPriority} priority`,
      });
    }

    // Suggest adding version information
    if (!rule.metadata.version || rule.metadata.version === '1.0.0') {
      suggestions.push({
        field: 'metadata.version',
        message: 'Consider using semantic versioning for rule updates',
        rationale: 'Version tracking helps with rule evolution and rollback',
      });
    }

    return suggestions;
  }

  /**
   * Validate operator-value compatibility
   */
  private static validateOperatorValueCompatibility(
    operator: ConditionOperator,
    value: unknown,
  ): { isValid: boolean; message: string } {
    switch (operator) {
      case 'in_array':
      case 'not_in_array':
        if (!Array.isArray(value)) {
          return { isValid: false, message: `Operator ${operator} requires an array value` };
        }
        break;

      case 'greater_than':
      case 'less_than':
      case 'greater_equal':
      case 'less_equal':
        if (typeof value !== 'number') {
          return { isValid: false, message: `Operator ${operator} requires a numeric value` };
        }
        break;

      case 'matches_regex':
        if (typeof value !== 'string') {
          return { isValid: false, message: 'Regex operator requires a string pattern' };
        }
        try {
          new RegExp(String(value));
        } catch {
          return { isValid: false, message: 'Invalid regex pattern' };
        }
        break;

      case 'exists':
      case 'not_exists':
        // These operators don't need specific value validation
        break;

      default:
        if (value === undefined || value === null) {
          return { isValid: false, message: `Operator ${operator} requires a non-null value` };
        }
    }

    return { isValid: true, message: '' };
  }

  /**
   * Check if category is valid
   */
  private static isValidCategory(category: string): category is RuleCategory {
    const validCategories: RuleCategory[] = [
      'identity-specific',
      'context-aware',
      'quality-assurance',
      'security',
      'performance',
      'formatting',
      'validation',
      'personalization',
    ];
    return validCategories.includes(category as RuleCategory);
  }

  /**
   * Check if priority is valid
   */
  private static isValidPriority(priority: string): priority is RulePriority {
    const validPriorities: RulePriority[] = ['low', 'medium', 'high', 'critical'];
    return validPriorities.includes(priority as RulePriority);
  }

  /**
   * Check if operator is valid
   */
  private static isValidOperator(operator: string): operator is ConditionOperator {
    const validOperators: ConditionOperator[] = [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
      'matches_regex',
      'greater_than',
      'less_than',
      'greater_equal',
      'less_equal',
      'in_array',
      'not_in_array',
      'exists',
      'not_exists',
    ];
    return validOperators.includes(operator as ConditionOperator);
  }

  /**
   * Get suggested priority for a category
   */
  private static getSuggestedPriorityForCategory(category: RuleCategory): RulePriority {
    const priorityMap: Record<RuleCategory, RulePriority> = {
      'identity-specific': 'high',
      'context-aware': 'high',
      'quality-assurance': 'medium',
      security: 'critical',
      performance: 'medium',
      formatting: 'low',
      validation: 'medium',
      personalization: 'low',
    };

    return priorityMap[category] || 'medium';
  }

  /**
   * Validate multiple rules for consistency
   */
  static validateRuleSet(rules: Rule[]): RuleValidationResult {
    const errors: RuleValidationError[] = [];
    const warnings: RuleValidationWarning[] = [];
    const suggestions: RuleValidationSuggestion[] = [];

    // Validate individual rules
    rules.forEach((rule, index) => {
      const ruleValidation = this.validateRule(rule);

      ruleValidation.errors.forEach((error) => {
        errors.push({
          ...error,
          field: `rules[${index}].${error.field}`,
        });
      });

      ruleValidation.warnings.forEach((warning) => {
        warnings.push({
          ...warning,
          field: `rules[${index}].${warning.field}`,
        });
      });

      ruleValidation.suggestions.forEach((suggestion) => {
        suggestions.push({
          ...suggestion,
          field: `rules[${index}].${suggestion.field}`,
        });
      });
    });

    // Check for duplicate rule IDs
    const ruleIds = rules.map((r) => r.id);
    const duplicateIds = ruleIds.filter((id, index) => ruleIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push({
        field: 'rules',
        message: `Duplicate rule IDs found: ${duplicateIds.join(', ')}`,
        code: 'DUPLICATE_RULE_IDS',
        severity: 'critical',
      });
    }

    // Check for naming conflicts
    const ruleNames = rules.map((r) => r.name.toLowerCase());
    const duplicateNames = ruleNames.filter((name, index) => ruleNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      warnings.push({
        field: 'rules',
        message: `Similar rule names found: ${duplicateNames.join(', ')}`,
        code: 'SIMILAR_RULE_NAMES',
        impact: 'low',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }
}
