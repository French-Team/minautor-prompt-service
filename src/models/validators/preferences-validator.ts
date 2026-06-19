// Specialized validator for IdentityPreferences objects

import { BaseValidator } from './base-validator';
import type { ValidationResult, ValidationError } from './base-validator';
import type { IdentityPreferences } from '../identity';

export class PreferencesValidator extends BaseValidator<IdentityPreferences> {
  validate(preferences: IdentityPreferences): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate language
    const languageError = this.validateStringField(preferences.language, 'language', 'INVALID_LANGUAGE');
    if (languageError) errors.push(languageError);

    // Validate response style
    const responseStyleError = this.validateEnumField(
      preferences.responseStyle,
      'responseStyle',
      ['concise', 'detailed', 'balanced'] as const,
      'INVALID_RESPONSE_STYLE',
    );
    if (responseStyleError) errors.push(responseStyleError);

    // Validate technical level
    const technicalLevelError = this.validateEnumField(
      preferences.technicalLevel,
      'technicalLevel',
      ['basic', 'intermediate', 'advanced'] as const,
      'INVALID_TECHNICAL_LEVEL',
    );
    if (technicalLevelError) errors.push(technicalLevelError);

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}
