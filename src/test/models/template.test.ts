import { describe, it, expect } from 'vitest';
import type { PromptTemplate, TemplateVariable, TemplateVariables, TemplateValidation } from '../../models/template';
import type { UserIdentityType } from '../../models/identity';
import { TemplateValidator, type TemplateCategory } from '../../models/template';

describe('TemplateValidator', () => {
  // Helper function to create a valid PromptTemplate
  const createValidTemplate = (): PromptTemplate => ({
    id: 'template-123',
    name: 'Test Template',
    description: 'A test template for validation',
    category: 'general',
    identities: ['User', 'Superviseur'],
    template: 'Hello {{name}}, your role is {{role}}.',
    variables: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'User name',
        validation: {
          minLength: 1,
          maxLength: 50,
        },
      },
      {
        name: 'role',
        type: 'string',
        required: true,
        description: 'User role',
        validation: {
          options: ['admin', 'user', 'guest'],
        },
      },
    ],
    constraints: [
      {
        type: 'length',
        rule: 'max 1000 characters',
        message: 'Template must not exceed 1000 characters',
      },
    ],
    version: '1.0.0',
    isPublic: true,
    author: 'test-author',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    usageCount: 10,
  });

  describe('validatePromptTemplate', () => {
    it('should validate a valid PromptTemplate', () => {
      const validTemplate = createValidTemplate();
      const result = TemplateValidator.validatePromptTemplate(validTemplate);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid template ID', () => {
      const invalidTemplate = createValidTemplate();
      invalidTemplate.id = '';

      const result = TemplateValidator.validatePromptTemplate(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'id',
        message: 'Template ID must be a non-empty string',
        code: 'INVALID_TEMPLATE_ID',
      });
    });

    it('should reject invalid category', () => {
      const invalidTemplate = createValidTemplate();
      invalidTemplate.category = 'invalid' as TemplateCategory;

      const result = TemplateValidator.validatePromptTemplate(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'category',
        message:
          'Template category must be one of: general, technical, architecture, refactoring, quality, security, documentation, devops, management, performance',
        code: 'INVALID_TEMPLATE_CATEGORY',
      });
    });

    it('should reject invalid identities', () => {
      const invalidTemplate = createValidTemplate();
      invalidTemplate.identities = ['Invalid'] as unknown as UserIdentityType[];

      const result = TemplateValidator.validatePromptTemplate(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'identities[0]',
        message: 'Invalid identity type: Invalid. Must be one of: User, Superviseur, Responsable',
        code: 'INVALID_IDENTITY_TYPE',
      });
    });

    it('should validate template syntax', () => {
      const invalidTemplate = createValidTemplate();
      invalidTemplate.template = 'Hello {{name}, missing closing brace';

      const result = TemplateValidator.validatePromptTemplate(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'template',
        message: 'Template has unmatched opening braces',
        code: 'UNMATCHED_OPENING_BRACE',
      });
    });

    it('should warn about undefined template variables', () => {
      const templateWithUndefinedVar = createValidTemplate();
      templateWithUndefinedVar.template = 'Hello {{name}}, your {{undefinedVar}} is important.';

      const result = TemplateValidator.validatePromptTemplate(templateWithUndefinedVar);

      expect(result.warnings).toContainEqual({
        field: 'variables',
        message: "Template uses variable 'undefinedVar' but it's not defined in variables array",
        code: 'UNDEFINED_TEMPLATE_VARIABLE',
      });
    });

    it('should validate template variables', () => {
      const invalidTemplate = createValidTemplate();
      invalidTemplate.variables = [
        {
          name: '',
          type: 'invalid' as unknown as 'string' | 'number' | 'boolean' | 'array' | 'object',
          required: 'not-boolean' as unknown as boolean,
          description: '',
          defaultValue: 123,
          validation: {
            pattern: '[invalid regex',
          },
        },
      ];

      const result = TemplateValidator.validatePromptTemplate(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'variables[0].name',
        message: 'Variable name must be a non-empty string',
        code: 'INVALID_VARIABLE_NAME',
      });
      expect(result.errors).toContainEqual({
        field: 'variables[0].type',
        message: 'Variable type must be one of: string, number, boolean, array, object',
        code: 'INVALID_VARIABLE_TYPE',
      });
      expect(result.errors).toContainEqual({
        field: 'variables[0].required',
        message: 'Variable required field must be a boolean',
        code: 'INVALID_REQUIRED_FIELD',
      });
    });

    it('should validate constraints', () => {
      const invalidTemplate = createValidTemplate();
      invalidTemplate.constraints = [
        {
          type: 'invalid' as unknown as 'length' | 'complexity' | 'format' | 'content',
          rule: '',
          message: '',
        },
      ];

      const result = TemplateValidator.validatePromptTemplate(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'constraints[0].type',
        message: 'Constraint type must be one of: length, complexity, format, content',
        code: 'INVALID_CONSTRAINT_TYPE',
      });
      expect(result.errors).toContainEqual({
        field: 'constraints[0].rule',
        message: 'Constraint rule must be a non-empty string',
        code: 'INVALID_CONSTRAINT_RULE',
      });
    });

    it('should validate dates and numeric fields', () => {
      const invalidTemplate = createValidTemplate();
      invalidTemplate.createdAt = new Date('invalid');
      invalidTemplate.updatedAt = new Date('invalid');
      invalidTemplate.usageCount = -1;
      invalidTemplate.isPublic = 'not-boolean' as unknown as boolean;

      const result = TemplateValidator.validatePromptTemplate(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'createdAt',
        message: 'Created date must be a valid Date object',
        code: 'INVALID_CREATED_DATE',
      });
      expect(result.errors).toContainEqual({
        field: 'usageCount',
        message: 'Usage count must be a non-negative number',
        code: 'INVALID_USAGE_COUNT',
      });
      expect(result.errors).toContainEqual({
        field: 'isPublic',
        message: 'isPublic must be a boolean',
        code: 'INVALID_IS_PUBLIC',
      });
    });
  });

  describe('validateTemplateSyntax', () => {
    it('should validate correct template syntax', () => {
      const template = 'Hello {{name}}, your role is {{role}}.';
      const result = TemplateValidator.validateTemplateSyntax(template);

      expect(result.errors).toHaveLength(0);
    });

    it('should detect unmatched opening braces', () => {
      const template = 'Hello {{name, missing closing brace';
      const result = TemplateValidator.validateTemplateSyntax(template);

      expect(result.errors).toContainEqual({
        field: 'template',
        message: 'Template has unmatched opening braces',
        code: 'UNMATCHED_OPENING_BRACE',
      });
    });

    it('should detect unmatched closing braces', () => {
      const template = 'Hello name}}, extra closing brace';
      const result = TemplateValidator.validateTemplateSyntax(template);

      expect(result.errors).toContainEqual({
        field: 'template',
        message: 'Template has unmatched closing braces',
        code: 'UNMATCHED_CLOSING_BRACE',
      });
    });

    it('should detect invalid variable names', () => {
      const template = 'Hello {{123invalid}}, invalid variable name';
      const result = TemplateValidator.validateTemplateSyntax(template);

      expect(result.errors).toContainEqual({
        field: 'template',
        message:
          "Invalid variable name '123invalid'. Variable names must start with a letter or underscore and contain only letters, numbers, and underscores",
        code: 'INVALID_VARIABLE_NAME',
      });
    });

    it('should warn about suspicious placeholder syntax', () => {
      const template = 'Hello {{name with spaces}}, suspicious syntax';
      const result = TemplateValidator.validateTemplateSyntax(template);

      expect(result.warnings).toContainEqual({
        field: 'template',
        message: 'Template contains placeholders that may not be valid variable syntax',
        code: 'SUSPICIOUS_PLACEHOLDER_SYNTAX',
      });
    });
  });

  describe('validateTemplateVariable', () => {
    it('should validate a valid template variable', () => {
      const validVariable: TemplateVariable = {
        name: 'userName',
        type: 'string',
        required: true,
        description: 'The user name',
        validation: {
          minLength: 1,
          maxLength: 50,
        },
      };

      const result = TemplateValidator.validateTemplateVariable(validVariable, 'variable');

      expect(result).toHaveLength(0);
    });

    it('should reject invalid variable name format', () => {
      const invalidVariable: TemplateVariable = {
        name: '123invalid',
        type: 'string',
        required: true,
        description: 'Invalid name',
      };

      const result = TemplateValidator.validateTemplateVariable(invalidVariable, 'variable');

      expect(result).toContainEqual({
        field: 'variable.name',
        message:
          'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
        code: 'INVALID_VARIABLE_NAME_FORMAT',
      });
    });

    it('should detect type mismatch in default value', () => {
      const invalidVariable: TemplateVariable = {
        name: 'count',
        type: 'number',
        required: false,
        description: 'A count value',
        defaultValue: 'not-a-number',
      };

      const result = TemplateValidator.validateTemplateVariable(invalidVariable, 'variable');

      expect(result).toContainEqual({
        field: 'variable.defaultValue',
        message: "Default value type 'string' does not match declared type 'number'",
        code: 'TYPE_MISMATCH_DEFAULT_VALUE',
      });
    });

    it('should validate validation rules', () => {
      const invalidVariable: TemplateVariable = {
        name: 'testVar',
        type: 'number',
        required: true,
        description: 'Test variable',
        validation: {
          pattern: 'invalid-for-number',
          minLength: 5, // invalid for number type
        },
      };

      const result = TemplateValidator.validateTemplateVariable(invalidVariable, 'variable');

      expect(result).toContainEqual({
        field: 'variable.validation.pattern',
        message: 'Pattern validation can only be used with string variables',
        code: 'INVALID_PATTERN_FOR_TYPE',
      });
      expect(result).toContainEqual({
        field: 'variable.validation.length',
        message: 'Length validation can only be used with string or array variables',
        code: 'INVALID_LENGTH_FOR_TYPE',
      });
    });
  });

  describe('validateTemplateVariables', () => {
    it('should validate correct template variables', () => {
      const template = createValidTemplate();
      const variables: TemplateVariables = {
        name: 'John Doe',
        role: 'admin',
      };

      const result = TemplateValidator.validateTemplateVariables(variables, template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required variables', () => {
      const template = createValidTemplate();
      const variables: TemplateVariables = {
        name: 'John Doe',
        // missing required 'role' variable
      };

      const result = TemplateValidator.validateTemplateVariables(variables, template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'role',
        message: "Required variable 'role' is missing",
        code: 'MISSING_REQUIRED_VARIABLE',
      });
    });

    it('should detect type mismatches', () => {
      const template = createValidTemplate();
      const variables: TemplateVariables = {
        name: 123, // should be string
        role: 'admin',
      };

      const result = TemplateValidator.validateTemplateVariables(variables, template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: "Variable 'name' expected type 'string' but got 'number'",
        code: 'VARIABLE_TYPE_MISMATCH',
      });
    });

    it('should validate against validation rules', () => {
      const template = createValidTemplate();
      const variables: TemplateVariables = {
        name: '', // violates minLength: 1
        role: 'invalid-role', // not in options
      };

      const result = TemplateValidator.validateTemplateVariables(variables, template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Value length 0 is less than minimum 1',
        code: 'VALUE_TOO_SHORT',
      });
      expect(result.errors).toContainEqual({
        field: 'role',
        message: 'Value must be one of: admin, user, guest',
        code: 'INVALID_OPTION',
      });
    });

    it('should warn about undefined variables', () => {
      const template = createValidTemplate();
      const variables: TemplateVariables = {
        name: 'John Doe',
        role: 'admin',
        extraVar: 'not defined in template',
      };

      const result = TemplateValidator.validateTemplateVariables(variables, template);

      expect(result.warnings).toContainEqual({
        field: 'extraVar',
        message: "Variable 'extraVar' is not defined in template",
        code: 'UNDEFINED_VARIABLE',
      });
    });
  });

  describe('validation rules', () => {
    it('should validate string pattern', () => {
      const validation: TemplateValidation = {
        pattern: '^[A-Z][a-z]+$',
      };

      const errors = TemplateValidator['validateVariableValue']('John', validation, 'name');
      expect(errors).toHaveLength(0);

      const errors2 = TemplateValidator['validateVariableValue']('john', validation, 'name');
      expect(errors2).toContainEqual({
        field: 'name',
        message: 'Value does not match required pattern: ^[A-Z][a-z]+$',
        code: 'PATTERN_MISMATCH',
      });
    });

    it('should validate string length', () => {
      const validation: TemplateValidation = {
        minLength: 3,
        maxLength: 10,
      };

      const errors1 = TemplateValidator['validateVariableValue']('ab', validation, 'name');
      expect(errors1).toContainEqual({
        field: 'name',
        message: 'Value length 2 is less than minimum 3',
        code: 'VALUE_TOO_SHORT',
      });

      const errors2 = TemplateValidator['validateVariableValue']('verylongname', validation, 'name');
      expect(errors2).toContainEqual({
        field: 'name',
        message: 'Value length 12 exceeds maximum 10',
        code: 'VALUE_TOO_LONG',
      });
    });

    it('should validate numeric range', () => {
      const validation: TemplateValidation = {
        min: 0,
        max: 100,
      };

      const errors1 = TemplateValidator['validateVariableValue'](-1, validation, 'score');
      expect(errors1).toContainEqual({
        field: 'score',
        message: 'Value -1 is less than minimum 0',
        code: 'VALUE_TOO_SMALL',
      });

      const errors2 = TemplateValidator['validateVariableValue'](101, validation, 'score');
      expect(errors2).toContainEqual({
        field: 'score',
        message: 'Value 101 exceeds maximum 100',
        code: 'VALUE_TOO_LARGE',
      });
    });

    it('should validate options', () => {
      const validation: TemplateValidation = {
        options: ['red', 'green', 'blue'],
      };

      const errors1 = TemplateValidator['validateVariableValue']('red', validation, 'color');
      expect(errors1).toHaveLength(0);

      const errors2 = TemplateValidator['validateVariableValue']('yellow', validation, 'color');
      expect(errors2).toContainEqual({
        field: 'color',
        message: 'Value must be one of: red, green, blue',
        code: 'INVALID_OPTION',
      });
    });
  });
});
