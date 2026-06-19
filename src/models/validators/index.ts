// Centralized exports for all validators

export { BaseValidator } from './base-validator';
export type { ValidationResult, ValidationError, ValidationWarning } from './base-validator';

export { IdentityValidator } from './identity-validator';
export { PermissionValidator } from './permission-validator';
export { PreferencesValidator } from './preferences-validator';
export { CustomizationValidator } from './customization-validator';
export { UserProfileValidator, SuperviseurProfileValidator, ResponsableProfileValidator } from './profile-validators';

export { CachedValidator } from './cached-validator';

// Import classes for factory use
import { IdentityValidator } from './identity-validator';
import { UserProfileValidator, SuperviseurProfileValidator, ResponsableProfileValidator } from './profile-validators';
import { CachedValidator } from './cached-validator';

// Factory for creating commonly used validators
export class ValidatorFactory {
  static createIdentityValidator(useCache = false) {
    const validator = new IdentityValidator();
    return useCache ? new CachedValidator(validator) : validator;
  }

  static createUserProfileValidator(useCache = false) {
    const validator = new UserProfileValidator();
    return useCache ? new CachedValidator(validator) : validator;
  }

  static createSuperviseurProfileValidator(useCache = false) {
    const validator = new SuperviseurProfileValidator();
    return useCache ? new CachedValidator(validator) : validator;
  }

  static createResponsableProfileValidator(useCache = false) {
    const validator = new ResponsableProfileValidator();
    return useCache ? new CachedValidator(validator) : validator;
  }
}
