// Specialized validator for Permission objects

import { BaseValidator } from './base-validator';
import type { ValidationResult, ValidationError } from './base-validator';
import type { Permission } from '../identity';

export class PermissionValidator extends BaseValidator<Permission> {
  validate(permission: Permission): ValidationResult {
    const errors: ValidationError[] = [];

    if (!permission) {
      errors.push(this.createError('', 'Permission object is required', 'MISSING_PERMISSION'));
      return { isValid: false, errors, warnings: [] };
    }

    // Validate action
    const actionError = this.validateStringField(
      permission.action,
      'action',
      'INVALID_PERMISSION_ACTION',
      'Permission action must be a non-empty string',
    );
    if (actionError) errors.push(actionError);

    // Validate resource
    const resourceError = this.validateStringField(
      permission.resource,
      'resource',
      'INVALID_PERMISSION_RESOURCE',
      'Permission resource must be a non-empty string',
    );
    if (resourceError) errors.push(resourceError);

    // Conditions are optional, but if provided should be an object
    if (
      permission.conditions !== undefined &&
      (typeof permission.conditions !== 'object' || permission.conditions === null)
    ) {
      errors.push(
        this.createError(
          'conditions',
          'Permission conditions must be an object if provided',
          'INVALID_PERMISSION_CONDITIONS',
        ),
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}
