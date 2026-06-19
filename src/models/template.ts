// Template-related models and interfaces

import type { UserIdentityType } from './identity';

export type TemplateCategory = 'general' | 'technical' | 'management' | 'quality' | 'optimization';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: unknown;
  description: string;
  validation?: TemplateValidation;
}

export interface TemplateValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
}

export interface TemplateConstraint {
  type: 'length' | 'complexity' | 'format' | 'content';
  rule: string;
  message: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  identities: UserIdentityType[];
  template: string;
  variables: TemplateVariable[];
  constraints: TemplateConstraint[];
  version: string;
  isPublic: boolean;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface TemplateVariables {
  [key: string]: unknown;
}

export interface CompiledTemplate {
  templateId: string;
  content: string;
  resolvedVariables: TemplateVariables;
  compiledAt: Date;
}

export interface TemplateLibrary {
  templates: PromptTemplate[];
  categories: TemplateCategory[];
  searchIndex: TemplateSearchIndex;
}

export interface TemplateSearchIndex {
  byCategory: Record<TemplateCategory, string[]>;
  byIdentity: Record<UserIdentityType, string[]>;
  byKeyword: Record<string, string[]>;
}

export interface TemplateUsageMetrics {
  templateId: string;
  totalUses: number;
  successRate: number;
  averageRating: number;
  lastUsed: Date;
  popularVariables: Record<string, number>;
}

// Template sharing and lifecycle interfaces
export interface TemplateShareInfo {
  templateId: string;
  sharedBy: string;
  sharedWith: string[];
  sharedAt: Date;
  permissions: TemplatePermission[];
  expiresAt?: Date;
}

export type TemplatePermission = 'read' | 'write' | 'share' | 'delete';

export interface TemplateLifecycleStatus {
  templateId: string;
  status: 'active' | 'deprecated' | 'obsolete' | 'archived';
  lastReviewed: Date;
  nextReviewDate: Date;
  deprecationReason?: string;
  replacementTemplateId?: string;
  maintainer: string;
}

export interface TemplateObsolescenceCheck {
  templateId: string;
  isObsolete: boolean;
  reasons: ObsolescenceReason[];
  suggestedActions: TemplateAction[];
  confidence: number;
}

export interface ObsolescenceReason {
  type: 'low_usage' | 'outdated_syntax' | 'better_alternative' | 'security_issue' | 'performance_issue';
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
}

export interface TemplateAction {
  type: 'update' | 'deprecate' | 'archive' | 'replace' | 'merge';
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedEffort: string;
  suggestedBy: string;
}

export interface TemplateVersionInfo {
  templateId: string;
  version: string;
  previousVersion?: string;
  changeLog: string[];
  createdAt: Date;
  createdBy: string;
  isStable: boolean;
}

// Template validation interfaces
export interface TemplateValidationResult {
  isValid: boolean;
  errors: TemplateValidationError[];
  warnings: TemplateValidationWarning[];
}

export interface TemplateValidationError {
  field: string;
  message: string;
  code: string;
}

export interface TemplateValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Template validation class
export class TemplateValidator {
  /**
   * Validates a PromptTemplate object
   */
  static validatePromptTemplate(template: PromptTemplate): TemplateValidationResult {
    const errors: TemplateValidationError[] = [];
    const warnings: TemplateValidationWarning[] = [];

    // Validate required fields
    if (!template.id || typeof template.id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Template ID must be a non-empty string',
        code: 'INVALID_TEMPLATE_ID',
      });
    }

    if (!template.name || typeof template.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Template name must be a non-empty string',
        code: 'INVALID_TEMPLATE_NAME',
      });
    }

    if (!template.description || typeof template.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Template description must be a non-empty string',
        code: 'INVALID_TEMPLATE_DESCRIPTION',
      });
    }

    // Validate category
    const validCategories: TemplateCategory[] = ['general', 'technical', 'management', 'quality', 'optimization'];
    if (!validCategories.includes(template.category)) {
      errors.push({
        field: 'category',
        message: `Template category must be one of: ${validCategories.join(', ')}`,
        code: 'INVALID_TEMPLATE_CATEGORY',
      });
    }

    // Validate identities
    if (!Array.isArray(template.identities)) {
      errors.push({
        field: 'identities',
        message: 'Template identities must be an array',
        code: 'INVALID_IDENTITIES_TYPE',
      });
    } else {
      const validIdentities: UserIdentityType[] = ['User', 'Superviseur', 'Responsable'];
      template.identities.forEach((identity, index) => {
        if (!validIdentities.includes(identity)) {
          errors.push({
            field: `identities[${index}]`,
            message: `Invalid identity type: ${identity}. Must be one of: ${validIdentities.join(', ')}`,
            code: 'INVALID_IDENTITY_TYPE',
          });
        }
      });
    }

    // Validate template content
    if (!template.template || typeof template.template !== 'string') {
      errors.push({
        field: 'template',
        message: 'Template content must be a non-empty string',
        code: 'INVALID_TEMPLATE_CONTENT',
      });
    } else {
      // Validate template syntax
      const syntaxResult = this.validateTemplateSyntax(template.template);
      errors.push(...syntaxResult.errors);
      warnings.push(...syntaxResult.warnings);
    }

    // Validate variables
    if (!Array.isArray(template.variables)) {
      errors.push({
        field: 'variables',
        message: 'Template variables must be an array',
        code: 'INVALID_VARIABLES_TYPE',
      });
    } else {
      template.variables.forEach((variable, index) => {
        const variableErrors = this.validateTemplateVariable(variable, `variables[${index}]`);
        errors.push(...variableErrors);
      });

      // Check if all template variables are defined
      if (template.template) {
        const templateVars = this.extractVariablesFromTemplate(template.template);
        const definedVars = new Set(template.variables.map((v) => v.name));

        templateVars.forEach((varName) => {
          if (!definedVars.has(varName)) {
            warnings.push({
              field: 'variables',
              message: `Template uses variable '${varName}' but it's not defined in variables array`,
              code: 'UNDEFINED_TEMPLATE_VARIABLE',
            });
          }
        });
      }
    }

    // Validate constraints
    if (!Array.isArray(template.constraints)) {
      errors.push({
        field: 'constraints',
        message: 'Template constraints must be an array',
        code: 'INVALID_CONSTRAINTS_TYPE',
      });
    } else {
      template.constraints.forEach((constraint, index) => {
        const constraintErrors = this.validateTemplateConstraint(constraint, `constraints[${index}]`);
        errors.push(...constraintErrors);
      });
    }

    // Validate version
    if (!template.version || typeof template.version !== 'string') {
      errors.push({
        field: 'version',
        message: 'Template version must be a non-empty string',
        code: 'INVALID_TEMPLATE_VERSION',
      });
    }

    // Validate boolean fields
    if (typeof template.isPublic !== 'boolean') {
      errors.push({
        field: 'isPublic',
        message: 'isPublic must be a boolean',
        code: 'INVALID_IS_PUBLIC',
      });
    }

    // Validate author
    if (!template.author || typeof template.author !== 'string') {
      errors.push({
        field: 'author',
        message: 'Template author must be a non-empty string',
        code: 'INVALID_TEMPLATE_AUTHOR',
      });
    }

    // Validate dates
    if (!(template.createdAt instanceof Date) || isNaN(template.createdAt.getTime())) {
      errors.push({
        field: 'createdAt',
        message: 'Created date must be a valid Date object',
        code: 'INVALID_CREATED_DATE',
      });
    }

    if (!(template.updatedAt instanceof Date) || isNaN(template.updatedAt.getTime())) {
      errors.push({
        field: 'updatedAt',
        message: 'Updated date must be a valid Date object',
        code: 'INVALID_UPDATED_DATE',
      });
    }

    // Validate usage count
    if (typeof template.usageCount !== 'number' || template.usageCount < 0) {
      errors.push({
        field: 'usageCount',
        message: 'Usage count must be a non-negative number',
        code: 'INVALID_USAGE_COUNT',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates template syntax for variable placeholders
   */
  static validateTemplateSyntax(template: string): {
    errors: TemplateValidationError[];
    warnings: TemplateValidationWarning[];
  } {
    const errors: TemplateValidationError[] = [];
    const warnings: TemplateValidationWarning[] = [];

    // Check for balanced braces
    const bracePattern = /\{\{|\}\}/g;
    const braces = template.match(bracePattern) || [];
    let openCount = 0;

    for (const brace of braces) {
      if (brace === '{{') {
        openCount++;
      } else if (brace === '}}') {
        openCount--;
        if (openCount < 0) {
          errors.push({
            field: 'template',
            message: 'Template has unmatched closing braces',
            code: 'UNMATCHED_CLOSING_BRACE',
          });
          break;
        }
      }
    }

    if (openCount > 0) {
      errors.push({
        field: 'template',
        message: 'Template has unmatched opening braces',
        code: 'UNMATCHED_OPENING_BRACE',
      });
    }

    // Check for all variable-like patterns first
    const allVariablePattern = /\{\{\s*([^}]+)\s*\}\}/g;
    let match;
    const variables = new Set<string>();

    while ((match = allVariablePattern.exec(template)) !== null) {
      const varName = match[1].trim();
      variables.add(varName);

      // Check for valid variable naming
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        errors.push({
          field: 'template',
          message: `Invalid variable name '${varName}'. Variable names must start with a letter or underscore and contain only letters, numbers, and underscores`,
          code: 'INVALID_VARIABLE_NAME',
        });
      }
    }

    // Check for invalid placeholder syntax by comparing valid vs all patterns
    const validVariablePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const validMatches = template.match(validVariablePattern) || [];
    const allMatches = template.match(/\{\{[^}]*\}\}/g) || [];

    if (allMatches.length !== validMatches.length) {
      warnings.push({
        field: 'template',
        message: 'Template contains placeholders that may not be valid variable syntax',
        code: 'SUSPICIOUS_PLACEHOLDER_SYNTAX',
      });
    }

    return { errors, warnings };
  }

  /**
   * Validates a TemplateVariable object
   */
  static validateTemplateVariable(variable: TemplateVariable, fieldPrefix: string): TemplateValidationError[] {
    const errors: TemplateValidationError[] = [];

    // Validate name
    if (!variable.name || typeof variable.name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: 'Variable name must be a non-empty string',
        code: 'INVALID_VARIABLE_NAME',
      });
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
      errors.push({
        field: `${fieldPrefix}.name`,
        message:
          'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
        code: 'INVALID_VARIABLE_NAME_FORMAT',
      });
    }

    // Validate type
    const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
    if (!validTypes.includes(variable.type)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: `Variable type must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_VARIABLE_TYPE',
      });
    }

    // Validate required field
    if (typeof variable.required !== 'boolean') {
      errors.push({
        field: `${fieldPrefix}.required`,
        message: 'Variable required field must be a boolean',
        code: 'INVALID_REQUIRED_FIELD',
      });
    }

    // Validate description
    if (!variable.description || typeof variable.description !== 'string') {
      errors.push({
        field: `${fieldPrefix}.description`,
        message: 'Variable description must be a non-empty string',
        code: 'INVALID_VARIABLE_DESCRIPTION',
      });
    }

    // Validate default value type consistency
    if (variable.defaultValue !== undefined) {
      const defaultValueType = this.getValueType(variable.defaultValue);
      if (defaultValueType !== variable.type) {
        errors.push({
          field: `${fieldPrefix}.defaultValue`,
          message: `Default value type '${defaultValueType}' does not match declared type '${variable.type}'`,
          code: 'TYPE_MISMATCH_DEFAULT_VALUE',
        });
      }
    }

    // Validate validation rules if present
    if (variable.validation) {
      const validationErrors = this.validateTemplateValidation(
        variable.validation,
        variable.type,
        `${fieldPrefix}.validation`,
      );
      errors.push(...validationErrors);
    }

    return errors;
  }

  /**
   * Validates a TemplateConstraint object
   */
  static validateTemplateConstraint(constraint: TemplateConstraint, fieldPrefix: string): TemplateValidationError[] {
    const errors: TemplateValidationError[] = [];

    // Validate type
    const validTypes = ['length', 'complexity', 'format', 'content'];
    if (!validTypes.includes(constraint.type)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: `Constraint type must be one of: ${validTypes.join(', ')}`,
        code: 'INVALID_CONSTRAINT_TYPE',
      });
    }

    // Validate rule
    if (!constraint.rule || typeof constraint.rule !== 'string') {
      errors.push({
        field: `${fieldPrefix}.rule`,
        message: 'Constraint rule must be a non-empty string',
        code: 'INVALID_CONSTRAINT_RULE',
      });
    }

    // Validate message
    if (!constraint.message || typeof constraint.message !== 'string') {
      errors.push({
        field: `${fieldPrefix}.message`,
        message: 'Constraint message must be a non-empty string',
        code: 'INVALID_CONSTRAINT_MESSAGE',
      });
    }

    return errors;
  }

  /**
   * Validates TemplateVariables object against template definition
   */
  static validateTemplateVariables(variables: TemplateVariables, template: PromptTemplate): TemplateValidationResult {
    const errors: TemplateValidationError[] = [];
    const warnings: TemplateValidationWarning[] = [];

    // Check required variables
    template.variables.forEach((templateVar) => {
      if (templateVar.required && !(templateVar.name in variables)) {
        errors.push({
          field: templateVar.name,
          message: `Required variable '${templateVar.name}' is missing`,
          code: 'MISSING_REQUIRED_VARIABLE',
        });
      }

      // Validate provided variable values
      if (templateVar.name in variables) {
        const value = variables[templateVar.name];
        const valueType = this.getValueType(value);

        if (valueType !== templateVar.type) {
          errors.push({
            field: templateVar.name,
            message: `Variable '${templateVar.name}' expected type '${templateVar.type}' but got '${valueType}'`,
            code: 'VARIABLE_TYPE_MISMATCH',
          });
        }

        // Validate against validation rules
        if (templateVar.validation) {
          const validationErrors = this.validateVariableValue(value, templateVar.validation, templateVar.name);
          errors.push(...validationErrors);
        }
      }
    });

    // Check for extra variables
    Object.keys(variables).forEach((varName) => {
      const isDefined = template.variables.some((templateVar) => templateVar.name === varName);
      if (!isDefined) {
        warnings.push({
          field: varName,
          message: `Variable '${varName}' is not defined in template`,
          code: 'UNDEFINED_VARIABLE',
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extracts variable names from template content
   */
  private static extractVariablesFromTemplate(template: string): string[] {
    const variablePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Gets the type of a value for validation
   */
  private static getValueType(value: unknown): string {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'object';
    return typeof value;
  }

  /**
   * Validates TemplateValidation rules
   */
  private static validateTemplateValidation(
    validation: TemplateValidation,
    variableType: string,
    fieldPrefix: string,
  ): TemplateValidationError[] {
    const errors: TemplateValidationError[] = [];

    // Validate pattern (for string types)
    if (validation.pattern !== undefined) {
      if (variableType !== 'string') {
        errors.push({
          field: `${fieldPrefix}.pattern`,
          message: 'Pattern validation can only be used with string variables',
          code: 'INVALID_PATTERN_FOR_TYPE',
        });
      } else {
        try {
          new RegExp(validation.pattern);
        } catch {
          errors.push({
            field: `${fieldPrefix}.pattern`,
            message: 'Pattern must be a valid regular expression',
            code: 'INVALID_REGEX_PATTERN',
          });
        }
      }
    }

    // Validate length constraints (for string and array types)
    if (validation.minLength !== undefined || validation.maxLength !== undefined) {
      if (!['string', 'array'].includes(variableType)) {
        errors.push({
          field: `${fieldPrefix}.length`,
          message: 'Length validation can only be used with string or array variables',
          code: 'INVALID_LENGTH_FOR_TYPE',
        });
      }

      if (
        validation.minLength !== undefined &&
        (typeof validation.minLength !== 'number' || validation.minLength < 0)
      ) {
        errors.push({
          field: `${fieldPrefix}.minLength`,
          message: 'minLength must be a non-negative number',
          code: 'INVALID_MIN_LENGTH',
        });
      }

      if (
        validation.maxLength !== undefined &&
        (typeof validation.maxLength !== 'number' || validation.maxLength < 0)
      ) {
        errors.push({
          field: `${fieldPrefix}.maxLength`,
          message: 'maxLength must be a non-negative number',
          code: 'INVALID_MAX_LENGTH',
        });
      }

      if (
        validation.minLength !== undefined &&
        validation.maxLength !== undefined &&
        validation.minLength > validation.maxLength
      ) {
        errors.push({
          field: `${fieldPrefix}.length`,
          message: 'minLength cannot be greater than maxLength',
          code: 'INVALID_LENGTH_RANGE',
        });
      }
    }

    // Validate numeric constraints (for number types)
    if (validation.min !== undefined || validation.max !== undefined) {
      if (variableType !== 'number') {
        errors.push({
          field: `${fieldPrefix}.numeric`,
          message: 'Numeric validation can only be used with number variables',
          code: 'INVALID_NUMERIC_FOR_TYPE',
        });
      }

      if (validation.min !== undefined && typeof validation.min !== 'number') {
        errors.push({
          field: `${fieldPrefix}.min`,
          message: 'min must be a number',
          code: 'INVALID_MIN_VALUE',
        });
      }

      if (validation.max !== undefined && typeof validation.max !== 'number') {
        errors.push({
          field: `${fieldPrefix}.max`,
          message: 'max must be a number',
          code: 'INVALID_MAX_VALUE',
        });
      }

      if (validation.min !== undefined && validation.max !== undefined && validation.min > validation.max) {
        errors.push({
          field: `${fieldPrefix}.numeric`,
          message: 'min cannot be greater than max',
          code: 'INVALID_NUMERIC_RANGE',
        });
      }
    }

    // Validate options (for any type)
    if (validation.options !== undefined) {
      if (!Array.isArray(validation.options)) {
        errors.push({
          field: `${fieldPrefix}.options`,
          message: 'options must be an array',
          code: 'INVALID_OPTIONS_TYPE',
        });
      } else if (validation.options.length === 0) {
        errors.push({
          field: `${fieldPrefix}.options`,
          message: 'options array cannot be empty',
          code: 'EMPTY_OPTIONS_ARRAY',
        });
      }
    }

    return errors;
  }

  /**
   * Validates a variable value against validation rules
   */
  private static validateVariableValue(
    value: unknown,
    validation: TemplateValidation,
    fieldName: string,
  ): TemplateValidationError[] {
    const errors: TemplateValidationError[] = [];

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: fieldName,
          message: `Value does not match required pattern: ${validation.pattern}`,
          code: 'PATTERN_MISMATCH',
        });
      }
    }

    // Length validation
    if (typeof value === 'string' || Array.isArray(value)) {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push({
          field: fieldName,
          message: `Value length ${value.length} is less than minimum ${validation.minLength}`,
          code: 'VALUE_TOO_SHORT',
        });
      }

      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push({
          field: fieldName,
          message: `Value length ${value.length} exceeds maximum ${validation.maxLength}`,
          code: 'VALUE_TOO_LONG',
        });
      }
    }

    // Numeric validation
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          field: fieldName,
          message: `Value ${value} is less than minimum ${validation.min}`,
          code: 'VALUE_TOO_SMALL',
        });
      }

      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          field: fieldName,
          message: `Value ${value} exceeds maximum ${validation.max}`,
          code: 'VALUE_TOO_LARGE',
        });
      }
    }

    // Options validation
    if (validation.options && !validation.options.includes(value as string)) {
      errors.push({
        field: fieldName,
        message: `Value must be one of: ${validation.options.join(', ')}`,
        code: 'INVALID_OPTION',
      });
    }

    return errors;
  }
}
