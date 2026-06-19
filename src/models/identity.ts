// Identity-related models and interfaces
// Re-export types from the centralized types module
export type {
  UserIdentityType,
  ResponseStyle,
  TechnicalLevel,
  OptimizationArea,
  QualityCheckType,
  SeverityLevel,
  TemplateId,
  UserId,
  PermissionAction,
  PermissionResource,
} from './types';

export {
  USER_IDENTITY_TYPES,
  RESPONSE_STYLES,
  TECHNICAL_LEVELS,
  OPTIMIZATION_AREAS,
  QUALITY_CHECK_TYPES,
  SEVERITY_LEVELS,
} from './types';

export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, unknown>;
}

export interface IdentityPreferences {
  language: string;
  responseStyle: 'concise' | 'detailed' | 'balanced';
  technicalLevel: 'basic' | 'intermediate' | 'advanced';
}

export interface PromptCustomization {
  promptId?: string;
  templateId?: string;
  type: string;
  content: string;
  customContent?: string;
  condition?: string;
  priority?: number;
  description?: string;
  variables?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UserIdentity {
  type: 'User' | 'Superviseur' | 'Responsable';
  permissions: Permission[];
  preferences: IdentityPreferences;
  customizations: PromptCustomization[];
}

// Base interface for all identity profiles
export interface IdentityProfile {
  identityType: 'User' | 'Superviseur' | 'Responsable';
  displayName: string;
  description: string;
  capabilities: string[];
}

// Specific profile for User identity
export interface UserProfile extends IdentityProfile {
  simplificationLevel: 'basic' | 'intermediate';
  preferredResponseLength: 'short' | 'medium';
  technicalDepth: 'minimal' | 'standard';
}

// Specific profile for Superviseur identity
export interface SuperviseurProfile extends IdentityProfile {
  optimizationFocus: ('performance' | 'security' | 'maintainability' | 'usability')[];
  suggestionLevel: 'conservative' | 'aggressive';
  alternativeCount: number;
}

// Specific profile for Responsable identity
export interface ResponsableProfile extends IdentityProfile {
  qualityChecks: ('syntax' | 'logic' | 'security' | 'performance' | 'standards')[];
  riskTolerance: 'low' | 'medium' | 'high';
  validationRequirements: ValidationRequirement[];
}

export interface ValidationRequirement {
  type: string;
  severity: 'warning' | 'error' | 'info';
  description: string;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Re-export validation interfaces from the modular validators
export type {
  ValidationResult as BaseValidationResult,
  ValidationError as BaseValidationError,
  ValidationWarning as BaseValidationWarning,
} from './validators/base-validator';

// Class implementations for structure tests
import { IdentityValidator as ModularIdentityValidator } from './validators/identity-validator';

const _identityValidator = new ModularIdentityValidator();

export class UserIdentityClass {
  constructor(public _data: UserIdentity) {}

  validate(): ValidationResult {
    return _identityValidator.validate(this._data);
  }
}
