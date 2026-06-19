// Specialized validator for UserIdentity objects

import { BaseValidator } from './base-validator';
import type { ValidationResult, ValidationError, ValidationWarning } from './base-validator';
import type { UserIdentity, Permission, PromptCustomization } from '../identity';
import { PermissionValidator } from './permission-validator';
import { PreferencesValidator } from './preferences-validator';
import { CustomizationValidator } from './customization-validator';

export class IdentityValidator extends BaseValidator<UserIdentity> {
  private readonly permissionValidator = new PermissionValidator();
  private readonly preferencesValidator = new PreferencesValidator();
  private readonly customizationValidator = new CustomizationValidator();

  validate(identity: UserIdentity): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate identity type
    const typeError = this.validateEnumField(
      identity.type,
      'type',
      ['User', 'Superviseur', 'Responsable'] as const,
      'INVALID_IDENTITY_TYPE',
    );
    if (typeError) errors.push(typeError);

    // Validate permissions
    const permissionErrors = this.validateArrayField(
      identity.permissions,
      'permissions',
      'INVALID_PERMISSIONS_TYPE',
      (permission: Permission, index) => {
        const result = this.permissionValidator.validate(permission);
        return result.errors.map((error) => ({
          ...error,
          field: `permissions[${index}].${error.field}`,
        }));
      },
    );
    errors.push(...permissionErrors);

    // Validate preferences
    if (!identity.preferences) {
      errors.push(this.createError('preferences', 'Preferences are required', 'MISSING_PREFERENCES'));
    } else {
      const prefResult = this.preferencesValidator.validate(identity.preferences);
      errors.push(
        ...prefResult.errors.map((error) => ({
          ...error,
          field: `preferences.${error.field}`,
        })),
      );
    }

    // Validate customizations
    const customizationErrors = this.validateArrayField(
      identity.customizations,
      'customizations',
      'INVALID_CUSTOMIZATIONS_TYPE',
      (customization: PromptCustomization, index) => {
        const result = this.customizationValidator.validate(customization);
        return result.errors.map((error) => ({
          ...error,
          field: `customizations[${index}].${error.field}`,
        }));
      },
    );
    errors.push(...customizationErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
