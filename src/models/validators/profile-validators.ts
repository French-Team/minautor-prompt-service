// Specialized validators for profile objects

import { BaseValidator } from './base-validator';
import type { ValidationResult, ValidationError, ValidationWarning } from './base-validator';
import type {
  UserProfile,
  SuperviseurProfile,
  ResponsableProfile,
  IdentityProfile,
  ValidationRequirement,
} from '../identity';

const USER_IDENTITY_TYPES = ['User', 'Superviseur', 'Responsable'] as const;
const OPTIMIZATION_AREAS = ['performance', 'security', 'maintainability', 'usability'] as const;
const QUALITY_CHECK_TYPES = ['syntax', 'logic', 'security', 'performance', 'standards'] as const;
const SEVERITY_LEVELS = ['warning', 'error', 'info'] as const;

abstract class ProfileValidator<T extends IdentityProfile> extends BaseValidator<T> {
  protected validateBaseProfile(profile: IdentityProfile): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate identity type
    const typeError = this.validateEnumField(
      profile.identityType,
      'identityType',
      USER_IDENTITY_TYPES,
      'INVALID_IDENTITY_TYPE',
    );
    if (typeError) errors.push(typeError);

    // Validate display name
    const displayNameError = this.validateStringField(profile.displayName, 'displayName', 'INVALID_DISPLAY_NAME');
    if (displayNameError) errors.push(displayNameError);

    // Validate description
    const descriptionError = this.validateStringField(profile.description, 'description', 'INVALID_DESCRIPTION');
    if (descriptionError) errors.push(descriptionError);

    // Validate capabilities
    const capabilityErrors = this.validateArrayField(
      profile.capabilities,
      'capabilities',
      'INVALID_CAPABILITIES_TYPE',
      (capability, index) => {
        if (typeof capability !== 'string' || capability.trim() === '') {
          return [
            this.createError(
              `capabilities[${index}]`,
              'Each capability must be a non-empty string',
              'INVALID_CAPABILITY',
            ),
          ];
        }
        return [];
      },
    );
    errors.push(...capabilityErrors);

    return errors;
  }
}

export class UserProfileValidator extends ProfileValidator<UserProfile> {
  validate(profile: UserProfile): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate base profile fields
    const baseErrors = this.validateBaseProfile(profile);
    errors.push(...baseErrors);

    // Validate User-specific fields
    const simplificationError = this.validateEnumField(
      profile.simplificationLevel,
      'simplificationLevel',
      ['basic', 'intermediate'] as const,
      'INVALID_SIMPLIFICATION_LEVEL',
    );
    if (simplificationError) errors.push(simplificationError);

    const responseLengthError = this.validateEnumField(
      profile.preferredResponseLength,
      'preferredResponseLength',
      ['short', 'medium'] as const,
      'INVALID_RESPONSE_LENGTH',
    );
    if (responseLengthError) errors.push(responseLengthError);

    const technicalDepthError = this.validateEnumField(
      profile.technicalDepth,
      'technicalDepth',
      ['minimal', 'standard'] as const,
      'INVALID_TECHNICAL_DEPTH',
    );
    if (technicalDepthError) errors.push(technicalDepthError);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export class SuperviseurProfileValidator extends ProfileValidator<SuperviseurProfile> {
  validate(profile: SuperviseurProfile): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate base profile fields
    const baseErrors = this.validateBaseProfile(profile);
    errors.push(...baseErrors);

    // Validate optimization focus
    const optimizationErrors = this.validateArrayField(
      profile.optimizationFocus,
      'optimizationFocus',
      'INVALID_OPTIMIZATION_FOCUS_TYPE',
      (area: string, index) => {
        if (!OPTIMIZATION_AREAS.includes(area as (typeof OPTIMIZATION_AREAS)[number])) {
          return [
            this.createError(
              `optimizationFocus[${index}]`,
              `Invalid optimization area: ${area}. Must be one of: ${OPTIMIZATION_AREAS.join(', ')}`,
              'INVALID_OPTIMIZATION_AREA',
            ),
          ];
        }
        return [];
      },
    );
    errors.push(...optimizationErrors);

    // Validate suggestion level
    const suggestionLevelError = this.validateEnumField(
      profile.suggestionLevel,
      'suggestionLevel',
      ['conservative', 'aggressive'] as const,
      'INVALID_SUGGESTION_LEVEL',
    );
    if (suggestionLevelError) errors.push(suggestionLevelError);

    // Validate alternative count
    if (typeof profile.alternativeCount !== 'number' || profile.alternativeCount < 0) {
      errors.push(
        this.createError(
          'alternativeCount',
          'Alternative count must be a non-negative number',
          'INVALID_ALTERNATIVE_COUNT',
        ),
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export class ResponsableProfileValidator extends ProfileValidator<ResponsableProfile> {
  validate(profile: ResponsableProfile): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate base profile fields
    const baseErrors = this.validateBaseProfile(profile);
    errors.push(...baseErrors);

    // Validate quality checks
    const qualityCheckErrors = this.validateArrayField(
      profile.qualityChecks,
      'qualityChecks',
      'INVALID_QUALITY_CHECKS_TYPE',
      (check: string, index) => {
        if (!QUALITY_CHECK_TYPES.includes(check as (typeof QUALITY_CHECK_TYPES)[number])) {
          return [
            this.createError(
              `qualityChecks[${index}]`,
              `Invalid quality check: ${check}. Must be one of: ${QUALITY_CHECK_TYPES.join(', ')}`,
              'INVALID_QUALITY_CHECK',
            ),
          ];
        }
        return [];
      },
    );
    errors.push(...qualityCheckErrors);

    // Validate risk tolerance
    const riskToleranceError = this.validateEnumField(
      profile.riskTolerance,
      'riskTolerance',
      ['low', 'medium', 'high'] as const,
      'INVALID_RISK_TOLERANCE',
    );
    if (riskToleranceError) errors.push(riskToleranceError);

    // Validate validation requirements
    const validationReqErrors = this.validateArrayField(
      profile.validationRequirements,
      'validationRequirements',
      'INVALID_VALIDATION_REQUIREMENTS_TYPE',
      (req: ValidationRequirement, index) =>
        this.validateValidationRequirement(req, `validationRequirements[${index}]`),
    );
    errors.push(...validationReqErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateValidationRequirement(requirement: ValidationRequirement, fieldPrefix: string): ValidationError[] {
    const errors: ValidationError[] = [];

    const typeError = this.validateStringField(requirement.type, `${fieldPrefix}.type`, 'INVALID_VALIDATION_TYPE');
    if (typeError) errors.push(typeError);

    const severityError = this.validateEnumField(
      requirement.severity,
      `${fieldPrefix}.severity`,
      SEVERITY_LEVELS,
      'INVALID_SEVERITY',
    );
    if (severityError) errors.push(severityError);

    const descriptionError = this.validateStringField(
      requirement.description,
      `${fieldPrefix}.description`,
      'INVALID_DESCRIPTION',
    );
    if (descriptionError) errors.push(descriptionError);

    return errors;
  }
}
