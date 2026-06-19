// Unit tests for ResponsableProfileValidator

import { describe, it, expect } from 'vitest';
import { ResponsableProfileValidator } from '../../models/validators/profile-validators';
import type { ResponsableProfile, ValidationRequirement } from '../../models/identity';

describe('ResponsableProfileValidator', () => {
  const validator = new ResponsableProfileValidator();

  const validRequirements: ValidationRequirement[] = [
    { type: 'code_review', severity: 'error', description: 'All code must be reviewed' },
    { type: 'unit_testing', severity: 'warning', description: 'Tests should cover edge cases' },
  ];

  const validProfile: ResponsableProfile = {
    identityType: 'Responsable',
    displayName: 'Test Responsable',
    description: 'A responsable profile for testing',
    capabilities: ['quality_validation', 'audit'],
    qualityChecks: ['syntax', 'logic', 'security'],
    riskTolerance: 'medium',
    validationRequirements: validRequirements,
  };

  describe('validate', () => {
    it('should validate a correct ResponsableProfile', () => {
      const result = validator.validate(validProfile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid identityType', () => {
      const profile = {
        ...validProfile,
        identityType: 'InvalidType' as ResponsableProfile['identityType'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'identityType',
          code: 'INVALID_IDENTITY_TYPE',
        }),
      );
    });

    it('should reject invalid qualityChecks type', () => {
      const profile = {
        ...validProfile,
        qualityChecks: 'not-array' as unknown as ResponsableProfile['qualityChecks'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'qualityChecks',
          code: 'INVALID_QUALITY_CHECKS_TYPE',
        }),
      );
    });

    it('should reject invalid quality check value', () => {
      const profile = {
        ...validProfile,
        qualityChecks: ['invalid-check'] as unknown as ResponsableProfile['qualityChecks'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'qualityChecks[0]',
          code: 'INVALID_QUALITY_CHECK',
        }),
      );
    });

    it('should reject invalid riskTolerance', () => {
      const profile = {
        ...validProfile,
        riskTolerance: 'extreme' as unknown as ResponsableProfile['riskTolerance'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'riskTolerance',
          code: 'INVALID_RISK_TOLERANCE',
        }),
      );
    });

    it('should reject invalid validationRequirements type', () => {
      const profile = {
        ...validProfile,
        validationRequirements: 'not-array' as unknown as ResponsableProfile['validationRequirements'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'validationRequirements',
          code: 'INVALID_VALIDATION_REQUIREMENTS_TYPE',
        }),
      );
    });

    it('should validate nested validation requirement errors', () => {
      const profile = {
        ...validProfile,
        validationRequirements: [{ type: '', severity: 'error', description: 'Desc' }] as ValidationRequirement[],
      } as unknown as ResponsableProfile;
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'validationRequirements[0].type',
          code: 'INVALID_VALIDATION_TYPE',
        }),
      );
    });

    it('should reject invalid severity in validation requirement', () => {
      const profile = {
        ...validProfile,
        validationRequirements: [
          { type: 'review', severity: 'critical', description: 'Desc' },
        ] as unknown as ValidationRequirement[],
      } as unknown as ResponsableProfile;
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_SEVERITY',
        }),
      );
    });
  });
});
