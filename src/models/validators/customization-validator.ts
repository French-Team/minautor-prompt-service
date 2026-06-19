// Specialized validator for PromptCustomization objects

import { BaseValidator } from './base-validator';
import type { ValidationResult, ValidationError } from './base-validator';
import type { PromptCustomization } from '../identity';

export class CustomizationValidator extends BaseValidator<PromptCustomization> {
  validate(customization: PromptCustomization): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate templateId
    const templateIdError = this.validateStringField(customization.templateId, 'templateId', 'INVALID_TEMPLATE_ID');
    if (templateIdError) errors.push(templateIdError);

    // Validate customContent
    const customContentError = this.validateStringField(
      customization.customContent,
      'customContent',
      'INVALID_CUSTOM_CONTENT',
    );
    if (customContentError) errors.push(customContentError);

    // Validate isActive (optional — undefined is accepted, but if provided must be a boolean)
    if (customization.isActive !== undefined && typeof customization.isActive !== 'boolean') {
      errors.push(this.createError('isActive', 'isActive must be a boolean if provided', 'INVALID_IS_ACTIVE'));
    }

    // Variables are optional, but if provided should be an object
    if (
      customization.variables !== undefined &&
      (typeof customization.variables !== 'object' || customization.variables === null)
    ) {
      errors.push(this.createError('variables', 'Variables must be an object if provided', 'INVALID_VARIABLES'));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}
