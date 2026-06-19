// Template error handler with fallback mechanisms

import type { Result } from '../../models/result';
import { success, failure } from '../../models/result';
import type { SystemError, RecoveryResult, ErrorHandlingOptions, TemplateError } from '../../models/errors';
import { ErrorCategory } from '../../models/errors';
import { ErrorHandler } from './error-handler-chain';
import type { PromptTemplate, TemplateVariable } from '../../models/template';
import type { UserIdentityType } from '../../models/identity';

export interface TemplateRecoveryContext {
  requestedTemplate?: PromptTemplate;
  templateId?: string;
  identityType?: UserIdentityType;
  variables?: Record<string, unknown>;
  requestedOperation: string;
}

export class TemplateErrorHandler extends ErrorHandler<TemplateRecoveryContext> {
  // Default fallback templates for each identity type
  private readonly fallbackTemplates: Record<UserIdentityType, PromptTemplate> = {
    User: {
      id: 'fallback-user',
      name: 'Fallback User Template',
      description: 'Basic fallback template for User identity',
      category: 'general',
      identities: ['User'],
      template: 'You are assisting a user. Please provide clear, simple responses. {{content}}',
      variables: [
        {
          name: 'content',
          type: 'string',
          required: true,
          description: 'Main content for the prompt',
        },
      ],
      constraints: [],
      version: '1.0.0',
      isPublic: false,
      author: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    },
    Superviseur: {
      id: 'fallback-superviseur',
      name: 'Fallback Superviseur Template',
      description: 'Management-focused fallback template for Superviseur identity',
      category: 'management',
      identities: ['Superviseur'],
      template:
        'You are assisting a supervisor. Please provide strategic insights and improvement suggestions. {{content}}',
      variables: [
        {
          name: 'content',
          type: 'string',
          required: true,
          description: 'Main content for the prompt',
        },
      ],
      constraints: [],
      version: '1.0.0',
      isPublic: false,
      author: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    },
    Responsable: {
      id: 'fallback-responsable',
      name: 'Fallback Responsable Template',
      description: 'Quality-focused fallback template for Responsable identity',
      category: 'management',
      identities: ['Responsable'],
      template: 'You are assisting a team leader. Please provide quality-focused analysis and validation. {{content}}',
      variables: [
        {
          name: 'content',
          type: 'string',
          required: true,
          description: 'Main content for the prompt',
        },
      ],
      constraints: [],
      version: '1.0.0',
      isPublic: false,
      author: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    },
  };

  protected canHandle(error: SystemError): boolean {
    return error.category === ErrorCategory.TEMPLATE;
  }

  protected async handleError(
    error: SystemError,
    context: TemplateRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<TemplateRecoveryContext>, SystemError>> {
    const templateError = error as TemplateError;

    switch (templateError.code) {
      case 'TEMPLATE_NOT_FOUND':
        return this.handleMissingTemplate(templateError, context, options);

      case 'TEMPLATE_MALFORMED':
        return this.handleMalformedTemplate(templateError, context, options);

      case 'TEMPLATE_VARIABLE_MISSING':
        return this.handleMissingVariable(templateError, context, options);

      case 'TEMPLATE_VALIDATION_FAILED':
        return this.handleValidationFailure(templateError, context, options);

      default:
        return failure(templateError);
    }
  }

  private async handleMissingTemplate(
    error: TemplateError,
    context: TemplateRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<TemplateRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Use fallback template based on identity type
    const identityType = context.identityType || 'User';
    const fallbackTemplate = this.fallbackTemplates[identityType];

    const recoveryResult: RecoveryResult<TemplateRecoveryContext> = {
      success: true,
      value: {
        ...context,
        requestedTemplate: fallbackTemplate,
      },
      fallbackUsed: true,
      recoveryStrategy: 'fallback-template-substitution',
      warnings: [
        `Template '${context.templateId}' not found, using fallback template`,
        'Fallback template may have limited functionality',
      ],
    };

    return success(recoveryResult);
  }

  private async handleMalformedTemplate(
    error: TemplateError,
    context: TemplateRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<TemplateRecoveryContext>, SystemError>> {
    if (!options.enableFallback || !context.requestedTemplate) {
      return failure(error);
    }

    // Attempt to repair the template
    const repairedTemplate = this.repairTemplate(context.requestedTemplate);

    if (repairedTemplate) {
      const recoveryResult: RecoveryResult<TemplateRecoveryContext> = {
        success: true,
        value: {
          ...context,
          requestedTemplate: repairedTemplate,
        },
        fallbackUsed: true,
        recoveryStrategy: 'template-repair',
        warnings: ['Template was malformed and has been repaired', 'Some template features may have been simplified'],
      };

      return success(recoveryResult);
    }

    // If repair fails, use fallback template
    return this.handleMissingTemplate(error, context, options);
  }

  private async handleMissingVariable(
    error: TemplateError,
    context: TemplateRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<TemplateRecoveryContext>, SystemError>> {
    if (!options.enableFallback || !context.requestedTemplate) {
      return failure(error);
    }

    // Provide default values for missing variables
    const defaultVariables = this.createDefaultVariables(context.requestedTemplate.variables, context.variables || {});

    const recoveryResult: RecoveryResult<TemplateRecoveryContext> = {
      success: true,
      value: {
        ...context,
        variables: { ...context.variables, ...defaultVariables },
      },
      fallbackUsed: true,
      recoveryStrategy: 'default-variable-substitution',
      warnings: [
        'Missing template variables filled with default values',
        'Generated prompt may not be fully customized',
      ],
    };

    return success(recoveryResult);
  }

  private async handleValidationFailure(
    error: TemplateError,
    context: TemplateRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<TemplateRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Use a simplified version of the template or fallback
    const identityType = context.identityType || 'User';
    const fallbackTemplate = this.fallbackTemplates[identityType];

    const recoveryResult: RecoveryResult<TemplateRecoveryContext> = {
      success: true,
      value: {
        ...context,
        requestedTemplate: fallbackTemplate,
      },
      fallbackUsed: true,
      recoveryStrategy: 'validation-failure-fallback',
      warnings: [
        'Template validation failed, using system fallback',
        'Generated prompt will use basic template structure',
      ],
    };

    return success(recoveryResult);
  }

  private repairTemplate(template: PromptTemplate): PromptTemplate | null {
    try {
      // Basic template repair - remove invalid characters and fix structure
      const repairedTemplate: PromptTemplate = {
        ...template,
        template: this.sanitizeTemplateString(template.template),
        variables: template.variables.filter((v) => v.name && v.type),
        constraints: template.constraints || [],
      };

      // Validate the repaired template has minimum required fields
      if (repairedTemplate.id && repairedTemplate.template && repairedTemplate.variables) {
        return repairedTemplate;
      }

      return null;
    } catch {
      return null;
    }
  }

  private sanitizeTemplateString(templateStr: string): string {
    // Remove potentially problematic characters and fix basic syntax
    return templateStr
      .replace(/[^\w\s{}.,!?\-:]/g, '') // Remove special chars except basic ones
      .replace(/\{\{(\w+)\}\}/g, '{{$1}}') // Ensure proper variable syntax
      .trim();
  }

  private createDefaultVariables(
    templateVariables: TemplateVariable[],
    providedVariables: Record<string, unknown>,
  ): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};

    for (const variable of templateVariables) {
      if (!(variable.name in providedVariables)) {
        switch (variable.type) {
          case 'string':
            defaults[variable.name] = variable.defaultValue || '';
            break;
          case 'number':
            defaults[variable.name] = variable.defaultValue || 0;
            break;
          case 'boolean':
            defaults[variable.name] = variable.defaultValue || false;
            break;
          case 'array':
            defaults[variable.name] = variable.defaultValue || [];
            break;
          case 'object':
            defaults[variable.name] = variable.defaultValue || {};
            break;
          default:
            defaults[variable.name] = '';
        }
      }
    }

    return defaults;
  }
}
