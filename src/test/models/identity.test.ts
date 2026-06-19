import { describe, it, expect } from 'vitest';
import type {
  UserIdentity,
  UserProfile,
  SuperviseurProfile,
  ResponsableProfile,
  Permission,
  IdentityPreferences,
} from '../../models/identity';
import { IdentityValidator } from '../../models/validators/identity-validator';
import {
  UserProfileValidator,
  SuperviseurProfileValidator,
  ResponsableProfileValidator,
} from '../../models/validators/profile-validators';

const identityValidator = new IdentityValidator();
const userProfileValidator = new UserProfileValidator();
const superviseurProfileValidator = new SuperviseurProfileValidator();
const responsableProfileValidator = new ResponsableProfileValidator();

describe('IdentityValidator', () => {
  describe('validateUserIdentity', () => {
    it('should validate a valid UserIdentity', () => {
      const validIdentity: UserIdentity = {
        type: 'User',
        permissions: [
          {
            action: 'read',
            resource: 'prompts',
            conditions: { scope: 'own' },
          },
        ],
        preferences: {
          language: 'fr',
          responseStyle: 'balanced',
          technicalLevel: 'intermediate',
        },
        customizations: [
          {
            type: 'append',
            content: 'Custom prompt content',
            templateId: 'template-1',
            customContent: 'Custom prompt content',
            variables: { key: 'value' },
            isActive: true,
          },
        ],
      };

      const result = identityValidator.validate(validIdentity);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid identity type', () => {
      const invalidIdentity: UserIdentity = {
        type: 'InvalidType' as 'User' | 'Superviseur' | 'Responsable',
        permissions: [],
        preferences: {
          language: 'fr',
          responseStyle: 'balanced',
          technicalLevel: 'intermediate',
        },
        customizations: [],
      };

      const result = identityValidator.validate(invalidIdentity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'type',
        message: 'type must be one of: User, Superviseur, Responsable',
        code: 'INVALID_IDENTITY_TYPE',
      });
    });

    it('should reject invalid permissions array', () => {
      const invalidIdentity: UserIdentity = {
        type: 'User',
        permissions: 'not-an-array' as unknown as Permission[],
        preferences: {
          language: 'fr',
          responseStyle: 'balanced',
          technicalLevel: 'intermediate',
        },
        customizations: [],
      };

      const result = identityValidator.validate(invalidIdentity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'permissions',
        message: 'permissions must be an array',
        code: 'INVALID_PERMISSIONS_TYPE',
      });
    });

    it('should validate individual permissions', () => {
      const invalidIdentity: UserIdentity = {
        type: 'User',
        permissions: [
          {
            action: '',
            resource: 'prompts',
          } as Permission,
        ],
        preferences: {
          language: 'fr',
          responseStyle: 'balanced',
          technicalLevel: 'intermediate',
        },
        customizations: [],
      };

      const result = identityValidator.validate(invalidIdentity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'permissions[0].action',
        message: 'Permission action must be a non-empty string',
        code: 'INVALID_PERMISSION_ACTION',
      });
    });

    it('should reject missing preferences', () => {
      const invalidIdentity: UserIdentity = {
        type: 'User',
        permissions: [],
        preferences: null as unknown as IdentityPreferences,
        customizations: [],
      };

      const result = identityValidator.validate(invalidIdentity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'preferences',
        message: 'Preferences are required',
        code: 'MISSING_PREFERENCES',
      });
    });

    it('should validate preferences fields', () => {
      const invalidIdentity: UserIdentity = {
        type: 'User',
        permissions: [],
        preferences: {
          language: '',
          responseStyle: 'invalid' as unknown as 'concise' | 'detailed' | 'balanced',
          technicalLevel: 'invalid' as unknown as 'basic' | 'intermediate' | 'advanced',
        },
        customizations: [],
      };

      const result = identityValidator.validate(invalidIdentity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'preferences.language',
        message: 'language must be a non-empty string',
        code: 'INVALID_LANGUAGE',
      });
      expect(result.errors).toContainEqual({
        field: 'preferences.responseStyle',
        message: 'responseStyle must be one of: concise, detailed, balanced',
        code: 'INVALID_RESPONSE_STYLE',
      });
      expect(result.errors).toContainEqual({
        field: 'preferences.technicalLevel',
        message: 'technicalLevel must be one of: basic, intermediate, advanced',
        code: 'INVALID_TECHNICAL_LEVEL',
      });
    });

    it('should validate customizations array', () => {
      const invalidIdentity: UserIdentity = {
        type: 'User',
        permissions: [],
        preferences: {
          language: 'fr',
          responseStyle: 'balanced',
          technicalLevel: 'intermediate',
        },
        customizations: [
          {
            type: 'append',
            content: '',
            templateId: '',
            customContent: '',
            variables: {},
            isActive: 'not-boolean' as unknown as boolean,
          },
        ],
      };

      const result = identityValidator.validate(invalidIdentity);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'customizations[0].templateId',
        message: 'templateId must be a non-empty string',
        code: 'INVALID_TEMPLATE_ID',
      });
      expect(result.errors).toContainEqual({
        field: 'customizations[0].customContent',
        message: 'customContent must be a non-empty string',
        code: 'INVALID_CUSTOM_CONTENT',
      });
      expect(result.errors).toContainEqual({
        field: 'customizations[0].isActive',
        message: 'isActive must be a boolean if provided',
        code: 'INVALID_IS_ACTIVE',
      });
    });
  });

  describe('validateUserProfile', () => {
    it('should validate a valid UserProfile', () => {
      const validProfile: UserProfile = {
        identityType: 'User',
        displayName: 'Standard User',
        description: 'Basic user profile for simple interactions',
        capabilities: ['read', 'basic-operations'],
        simplificationLevel: 'basic',
        preferredResponseLength: 'short',
        technicalDepth: 'minimal',
      };

      const result = userProfileValidator.validate(validProfile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid simplification level', () => {
      const invalidProfile: UserProfile = {
        identityType: 'User',
        displayName: 'Standard User',
        description: 'Basic user profile',
        capabilities: ['read'],
        simplificationLevel: 'invalid' as unknown as 'basic' | 'intermediate',
        preferredResponseLength: 'short',
        technicalDepth: 'minimal',
      };

      const result = userProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'simplificationLevel',
        message: 'simplificationLevel must be one of: basic, intermediate',
        code: 'INVALID_SIMPLIFICATION_LEVEL',
      });
    });

    it('should reject invalid response length', () => {
      const invalidProfile: UserProfile = {
        identityType: 'User',
        displayName: 'Standard User',
        description: 'Basic user profile',
        capabilities: ['read'],
        simplificationLevel: 'basic',
        preferredResponseLength: 'invalid' as unknown as 'short' | 'medium',
        technicalDepth: 'minimal',
      };

      const result = userProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'preferredResponseLength',
        message: 'preferredResponseLength must be one of: short, medium',
        code: 'INVALID_RESPONSE_LENGTH',
      });
    });

    it('should reject invalid technical depth', () => {
      const invalidProfile: UserProfile = {
        identityType: 'User',
        displayName: 'Standard User',
        description: 'Basic user profile',
        capabilities: ['read'],
        simplificationLevel: 'basic',
        preferredResponseLength: 'short',
        technicalDepth: 'invalid' as unknown as 'minimal' | 'standard',
      };

      const result = userProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'technicalDepth',
        message: 'technicalDepth must be one of: minimal, standard',
        code: 'INVALID_TECHNICAL_DEPTH',
      });
    });
  });

  describe('validateSuperviseurProfile', () => {
    it('should validate a valid SuperviseurProfile', () => {
      const validProfile: SuperviseurProfile = {
        identityType: 'Superviseur',
        displayName: 'Supervisor',
        description: 'Supervisor profile with optimization focus',
        capabilities: ['read', 'optimize', 'suggest'],
        optimizationFocus: ['performance', 'security'],
        suggestionLevel: 'conservative',
        alternativeCount: 3,
      };

      const result = superviseurProfileValidator.validate(validProfile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid optimization focus', () => {
      const invalidProfile: SuperviseurProfile = {
        identityType: 'Superviseur',
        displayName: 'Supervisor',
        description: 'Supervisor profile',
        capabilities: ['read'],
        optimizationFocus: ['invalid-area'] as unknown as (
          | 'performance'
          | 'security'
          | 'maintainability'
          | 'usability'
        )[],
        suggestionLevel: 'conservative',
        alternativeCount: 3,
      };

      const result = superviseurProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'optimizationFocus[0]',
        message:
          'Invalid optimization area: invalid-area. Must be one of: performance, security, maintainability, usability',
        code: 'INVALID_OPTIMIZATION_AREA',
      });
    });

    it('should reject invalid suggestion level', () => {
      const invalidProfile: SuperviseurProfile = {
        identityType: 'Superviseur',
        displayName: 'Supervisor',
        description: 'Supervisor profile',
        capabilities: ['read'],
        optimizationFocus: ['performance'],
        suggestionLevel: 'invalid' as unknown as 'conservative' | 'aggressive',
        alternativeCount: 3,
      };

      const result = superviseurProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'suggestionLevel',
        message: 'suggestionLevel must be one of: conservative, aggressive',
        code: 'INVALID_SUGGESTION_LEVEL',
      });
    });

    it('should reject invalid alternative count', () => {
      const invalidProfile: SuperviseurProfile = {
        identityType: 'Superviseur',
        displayName: 'Supervisor',
        description: 'Supervisor profile',
        capabilities: ['read'],
        optimizationFocus: ['performance'],
        suggestionLevel: 'conservative',
        alternativeCount: -1,
      };

      const result = superviseurProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'alternativeCount',
        message: 'Alternative count must be a non-negative number',
        code: 'INVALID_ALTERNATIVE_COUNT',
      });
    });
  });

  describe('validateResponsableProfile', () => {
    it('should validate a valid ResponsableProfile', () => {
      const validProfile: ResponsableProfile = {
        identityType: 'Responsable',
        displayName: 'Project Manager',
        description: 'Responsible profile with quality control',
        capabilities: ['read', 'validate', 'control'],
        qualityChecks: ['syntax', 'security'],
        riskTolerance: 'low',
        validationRequirements: [
          {
            type: 'code-review',
            severity: 'error',
            description: 'All code must be reviewed',
          },
        ],
      };

      const result = responsableProfileValidator.validate(validProfile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid quality checks', () => {
      const invalidProfile: ResponsableProfile = {
        identityType: 'Responsable',
        displayName: 'Project Manager',
        description: 'Responsible profile',
        capabilities: ['read'],
        qualityChecks: ['invalid-check'] as unknown as (
          | 'syntax'
          | 'logic'
          | 'security'
          | 'performance'
          | 'standards'
        )[],
        riskTolerance: 'low',
        validationRequirements: [],
      };

      const result = responsableProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'qualityChecks[0]',
        message:
          'Invalid quality check: invalid-check. Must be one of: syntax, logic, security, performance, standards',
        code: 'INVALID_QUALITY_CHECK',
      });
    });

    it('should reject invalid risk tolerance', () => {
      const invalidProfile: ResponsableProfile = {
        identityType: 'Responsable',
        displayName: 'Project Manager',
        description: 'Responsible profile',
        capabilities: ['read'],
        qualityChecks: ['syntax'],
        riskTolerance: 'invalid' as unknown as 'low' | 'medium' | 'high',
        validationRequirements: [],
      };

      const result = responsableProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'riskTolerance',
        message: 'riskTolerance must be one of: low, medium, high',
        code: 'INVALID_RISK_TOLERANCE',
      });
    });

    it('should validate validation requirements', () => {
      const invalidProfile: ResponsableProfile = {
        identityType: 'Responsable',
        displayName: 'Project Manager',
        description: 'Responsible profile',
        capabilities: ['read'],
        qualityChecks: ['syntax'],
        riskTolerance: 'low',
        validationRequirements: [
          {
            type: '',
            severity: 'invalid' as unknown as 'warning' | 'error' | 'info',
            description: '',
          },
        ],
      };

      const result = responsableProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'validationRequirements[0].type',
        message: 'validationRequirements[0].type must be a non-empty string',
        code: 'INVALID_VALIDATION_TYPE',
      });
      expect(result.errors).toContainEqual({
        field: 'validationRequirements[0].severity',
        message: 'validationRequirements[0].severity must be one of: warning, error, info',
        code: 'INVALID_SEVERITY',
      });
      expect(result.errors).toContainEqual({
        field: 'validationRequirements[0].description',
        message: 'validationRequirements[0].description must be a non-empty string',
        code: 'INVALID_DESCRIPTION',
      });
    });
  });

  describe('Base profile validation', () => {
    it('should reject invalid base profile fields', () => {
      const invalidProfile: UserProfile = {
        identityType: 'Invalid' as unknown as 'User' | 'Superviseur' | 'Responsable',
        displayName: '',
        description: '',
        capabilities: ['', 123] as unknown as string[],
        simplificationLevel: 'basic',
        preferredResponseLength: 'short',
        technicalDepth: 'minimal',
      };

      const result = userProfileValidator.validate(invalidProfile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'identityType',
        message: 'identityType must be one of: User, Superviseur, Responsable',
        code: 'INVALID_IDENTITY_TYPE',
      });
      expect(result.errors).toContainEqual({
        field: 'displayName',
        message: 'displayName must be a non-empty string',
        code: 'INVALID_DISPLAY_NAME',
      });
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'description must be a non-empty string',
        code: 'INVALID_DESCRIPTION',
      });
      expect(result.errors).toContainEqual({
        field: 'capabilities[0]',
        message: 'Each capability must be a non-empty string',
        code: 'INVALID_CAPABILITY',
      });
    });
  });
});
