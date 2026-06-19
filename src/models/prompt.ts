// Prompt-related models and interfaces

import type { UserIdentity as IUserIdentity } from './identity';
import type { ProjectContext as IProjectContext } from './context';

export interface PromptMetadata {
  createdAt: Date;
  updatedAt: Date;
  author: string;
  tags: string[];
  usage: PromptUsageStats;
}

export interface PromptUsageStats {
  totalUses: number;
  successRate: number;
  averageResponseTime: number;
  lastUsed: Date;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  impact: 'low' | 'medium' | 'high';
  modifications: string[];
}

export interface GeneratedPrompt {
  id: string;
  identity: IUserIdentity;
  content: string;
  metadata: PromptMetadata;
  version: string;
  context: IProjectContext;
  appliedRules: AppliedRule[];
}

export interface BasePrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  identities: IUserIdentity['type'][];
  isActive: boolean;
}

export interface PromptUpdates {
  content?: string;
  metadata?: Partial<PromptMetadata>;
  isActive?: boolean;
}

export interface PersonalizedPrompt extends GeneratedPrompt {
  personalizations: PersonalizationRule[];
}

export interface PersonalizationRule {
  type: 'replace' | 'append' | 'prepend' | 'conditional';
  condition?: string;
  content: string;
  priority: number;
}

export interface PromptTemplateCustomization {
  promptId?: string;
  type: string;
  content: string;
  condition?: string;
  priority?: number;
  description?: string;
  isActive?: boolean;
}

export interface PromptUsageMetrics {
  totalUses: number;
  successRate: number;
  averageResponseTime: number;
  lastUsed: Date;
}

export interface PersonalizationOptimization {
  type: 'content_adjustment' | 'performance_improvement' | 'rule_optimization';
  description: string;
  suggestedChanges: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface PersonalizationOptimizationResult {
  optimizations: PersonalizationOptimization[];
  suggestions: string[];
  currentEffectiveness: number;
  recommendedActions: string[];
}

// Validation interfaces for prompts
export interface PromptValidationResult {
  isValid: boolean;
  errors: PromptValidationError[];
  warnings: PromptValidationWarning[];
}

export interface PromptValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PromptValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Class implementations for structure tests
export class GeneratedPromptClass {
  constructor(public _data: GeneratedPrompt) {}

  validate(): PromptValidationResult {
    return PromptValidator.validateGeneratedPrompt(this._data);
  }
}

// Prompt validation class
export class PromptValidator {
  /**
   * Validates a GeneratedPrompt object
   */
  static validateGeneratedPrompt(prompt: GeneratedPrompt): PromptValidationResult {
    const errors: PromptValidationError[] = [];
    const warnings: PromptValidationWarning[] = [];

    // Validate required fields
    if (!prompt.id || typeof prompt.id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Prompt ID must be a non-empty string',
        code: 'INVALID_PROMPT_ID',
      });
    }

    if (!prompt.content || typeof prompt.content !== 'string') {
      errors.push({
        field: 'content',
        message: 'Prompt content must be a non-empty string',
        code: 'INVALID_PROMPT_CONTENT',
      });
    } else {
      // Check content length
      if (prompt.content.length < 10) {
        warnings.push({
          field: 'content',
          message: 'Prompt content is very short, consider adding more detail',
          code: 'SHORT_PROMPT_CONTENT',
        });
      }
      if (prompt.content.length > 10000) {
        warnings.push({
          field: 'content',
          message: 'Prompt content is very long, consider breaking it down',
          code: 'LONG_PROMPT_CONTENT',
        });
      }
    }

    if (!prompt.version || typeof prompt.version !== 'string') {
      errors.push({
        field: 'version',
        message: 'Prompt version must be a non-empty string',
        code: 'INVALID_PROMPT_VERSION',
      });
    }

    // Validate identity
    if (!prompt.identity) {
      errors.push({
        field: 'identity',
        message: 'Prompt identity is required',
        code: 'MISSING_IDENTITY',
      });
    }

    // Validate context
    if (!prompt.context) {
      errors.push({
        field: 'context',
        message: 'Prompt context is required',
        code: 'MISSING_CONTEXT',
      });
    }

    // Validate metadata
    if (!prompt.metadata) {
      errors.push({
        field: 'metadata',
        message: 'Prompt metadata is required',
        code: 'MISSING_METADATA',
      });
    } else {
      const metadataErrors = this.validatePromptMetadata(prompt.metadata);
      errors.push(...metadataErrors);
    }

    // Validate applied rules
    if (!Array.isArray(prompt.appliedRules)) {
      errors.push({
        field: 'appliedRules',
        message: 'Applied rules must be an array',
        code: 'INVALID_APPLIED_RULES_TYPE',
      });
    } else {
      prompt.appliedRules.forEach((rule, index) => {
        const ruleErrors = this.validateAppliedRule(rule, `appliedRules[${index}]`);
        errors.push(...ruleErrors);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates a BasePrompt object
   */
  static validateBasePrompt(prompt: BasePrompt): PromptValidationResult {
    const errors: PromptValidationError[] = [];
    const warnings: PromptValidationWarning[] = [];

    if (!prompt.id || typeof prompt.id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Base prompt ID must be a non-empty string',
        code: 'INVALID_BASE_PROMPT_ID',
      });
    }

    if (!prompt.name || typeof prompt.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Base prompt name must be a non-empty string',
        code: 'INVALID_BASE_PROMPT_NAME',
      });
    }

    if (!prompt.description || typeof prompt.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Base prompt description must be a non-empty string',
        code: 'INVALID_BASE_PROMPT_DESCRIPTION',
      });
    }

    if (!prompt.content || typeof prompt.content !== 'string') {
      errors.push({
        field: 'content',
        message: 'Base prompt content must be a non-empty string',
        code: 'INVALID_BASE_PROMPT_CONTENT',
      });
    }

    if (!Array.isArray(prompt.identities)) {
      errors.push({
        field: 'identities',
        message: 'Identities must be an array',
        code: 'INVALID_IDENTITIES_TYPE',
      });
    } else {
      const validIdentities = ['User', 'Superviseur', 'Responsable'];
      prompt.identities.forEach((identity, index) => {
        if (!validIdentities.includes(identity)) {
          errors.push({
            field: `identities[${index}]`,
            message: `Invalid identity type: ${identity}. Must be one of: ${validIdentities.join(', ')}`,
            code: 'INVALID_IDENTITY_TYPE',
          });
        }
      });
    }

    if (typeof prompt.isActive !== 'boolean') {
      errors.push({
        field: 'isActive',
        message: 'isActive must be a boolean',
        code: 'INVALID_IS_ACTIVE',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates PersonalizedPrompt specific fields
   */
  static validatePersonalizedPrompt(prompt: PersonalizedPrompt): PromptValidationResult {
    const errors: PromptValidationError[] = [];
    const warnings: PromptValidationWarning[] = [];

    // First validate as GeneratedPrompt
    const baseResult = this.validateGeneratedPrompt(prompt);
    errors.push(...baseResult.errors);
    warnings.push(...baseResult.warnings);

    // Validate personalizations
    if (!Array.isArray(prompt.personalizations)) {
      errors.push({
        field: 'personalizations',
        message: 'Personalizations must be an array',
        code: 'INVALID_PERSONALIZATIONS_TYPE',
      });
    } else {
      prompt.personalizations.forEach((rule, index) => {
        const ruleErrors = this.validatePersonalizationRule(rule, `personalizations[${index}]`);
        errors.push(...ruleErrors);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates PromptMetadata object
   */
  private static validatePromptMetadata(metadata: PromptMetadata): PromptValidationError[] {
    const errors: PromptValidationError[] = [];

    if (!(metadata.createdAt instanceof Date) || isNaN(metadata.createdAt.getTime())) {
      errors.push({
        field: 'metadata.createdAt',
        message: 'Created date must be a valid Date object',
        code: 'INVALID_CREATED_DATE',
      });
    }

    if (!(metadata.updatedAt instanceof Date) || isNaN(metadata.updatedAt.getTime())) {
      errors.push({
        field: 'metadata.updatedAt',
        message: 'Updated date must be a valid Date object',
        code: 'INVALID_UPDATED_DATE',
      });
    }

    if (!metadata.author || typeof metadata.author !== 'string') {
      errors.push({
        field: 'metadata.author',
        message: 'Author must be a non-empty string',
        code: 'INVALID_AUTHOR',
      });
    }

    if (!Array.isArray(metadata.tags)) {
      errors.push({
        field: 'metadata.tags',
        message: 'Tags must be an array',
        code: 'INVALID_TAGS_TYPE',
      });
    } else {
      metadata.tags.forEach((tag, index) => {
        if (typeof tag !== 'string' || tag.trim() === '') {
          errors.push({
            field: `metadata.tags[${index}]`,
            message: 'Each tag must be a non-empty string',
            code: 'INVALID_TAG',
          });
        }
      });
    }

    if (!metadata.usage) {
      errors.push({
        field: 'metadata.usage',
        message: 'Usage statistics are required',
        code: 'MISSING_USAGE_STATS',
      });
    } else {
      const usageErrors = this.validatePromptUsageStats(metadata.usage);
      errors.push(...usageErrors);
    }

    return errors;
  }

  /**
   * Validates PromptUsageStats object
   */
  private static validatePromptUsageStats(usage: PromptUsageStats): PromptValidationError[] {
    const errors: PromptValidationError[] = [];

    if (typeof usage.totalUses !== 'number' || usage.totalUses < 0) {
      errors.push({
        field: 'metadata.usage.totalUses',
        message: 'Total uses must be a non-negative number',
        code: 'INVALID_TOTAL_USES',
      });
    }

    if (typeof usage.successRate !== 'number' || usage.successRate < 0 || usage.successRate > 1) {
      errors.push({
        field: 'metadata.usage.successRate',
        message: 'Success rate must be a number between 0 and 1',
        code: 'INVALID_SUCCESS_RATE',
      });
    }

    if (typeof usage.averageResponseTime !== 'number' || usage.averageResponseTime < 0) {
      errors.push({
        field: 'metadata.usage.averageResponseTime',
        message: 'Average response time must be a non-negative number',
        code: 'INVALID_RESPONSE_TIME',
      });
    }

    if (!(usage.lastUsed instanceof Date) || isNaN(usage.lastUsed.getTime())) {
      errors.push({
        field: 'metadata.usage.lastUsed',
        message: 'Last used must be a valid Date object',
        code: 'INVALID_LAST_USED',
      });
    }

    return errors;
  }

  /**
   * Validates AppliedRule object
   */
  private static validateAppliedRule(rule: AppliedRule, fieldPrefix: string): PromptValidationError[] {
    const errors: PromptValidationError[] = [];

    if (!rule.ruleId || typeof rule.ruleId !== 'string') {
      errors.push({
        field: `${fieldPrefix}.ruleId`,
        message: 'Rule ID must be a non-empty string',
        code: 'INVALID_RULE_ID',
      });
    }

    if (!rule.ruleName || typeof rule.ruleName !== 'string') {
      errors.push({
        field: `${fieldPrefix}.ruleName`,
        message: 'Rule name must be a non-empty string',
        code: 'INVALID_RULE_NAME',
      });
    }

    if (!['low', 'medium', 'high'].includes(rule.impact)) {
      errors.push({
        field: `${fieldPrefix}.impact`,
        message: 'Rule impact must be low, medium, or high',
        code: 'INVALID_RULE_IMPACT',
      });
    }

    if (!Array.isArray(rule.modifications)) {
      errors.push({
        field: `${fieldPrefix}.modifications`,
        message: 'Modifications must be an array',
        code: 'INVALID_MODIFICATIONS_TYPE',
      });
    } else {
      rule.modifications.forEach((modification, index) => {
        if (typeof modification !== 'string' || modification.trim() === '') {
          errors.push({
            field: `${fieldPrefix}.modifications[${index}]`,
            message: 'Each modification must be a non-empty string',
            code: 'INVALID_MODIFICATION',
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validates PersonalizationRule object
   */
  private static validatePersonalizationRule(rule: PersonalizationRule, fieldPrefix: string): PromptValidationError[] {
    const errors: PromptValidationError[] = [];

    if (!['replace', 'append', 'prepend', 'conditional'].includes(rule.type)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: 'Personalization type must be replace, append, prepend, or conditional',
        code: 'INVALID_PERSONALIZATION_TYPE',
      });
    }

    if (rule.type === 'conditional' && (!rule.condition || typeof rule.condition !== 'string')) {
      errors.push({
        field: `${fieldPrefix}.condition`,
        message: 'Condition is required for conditional personalization rules',
        code: 'MISSING_CONDITION',
      });
    }

    if (!rule.content || typeof rule.content !== 'string') {
      errors.push({
        field: `${fieldPrefix}.content`,
        message: 'Personalization content must be a non-empty string',
        code: 'INVALID_PERSONALIZATION_CONTENT',
      });
    }

    if (typeof rule.priority !== 'number' || rule.priority < 0) {
      errors.push({
        field: `${fieldPrefix}.priority`,
        message: 'Priority must be a non-negative number',
        code: 'INVALID_PRIORITY',
      });
    }

    return errors;
  }
}
