// Unit tests for SuperviseurProfileValidator

import { describe, it, expect } from 'vitest';
import { SuperviseurProfileValidator } from '../../models/validators/profile-validators';
import type { SuperviseurProfile } from '../../models/identity';

describe('SuperviseurProfileValidator', () => {
  const validator = new SuperviseurProfileValidator();

  const validProfile: SuperviseurProfile = {
    identityType: 'Superviseur',
    displayName: 'Test Superviseur',
    description: 'A supervisor profile for testing',
    capabilities: ['team_management', 'project_coordination'],
    optimizationFocus: ['performance', 'security'],
    suggestionLevel: 'conservative',
    alternativeCount: 3,
  };

  describe('validate', () => {
    it('should validate a correct SuperviseurProfile', () => {
      const result = validator.validate(validProfile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid identityType', () => {
      const profile = {
        ...validProfile,
        identityType: 'InvalidType' as SuperviseurProfile['identityType'],
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

    it('should reject empty displayName', () => {
      const profile = { ...validProfile, displayName: '' };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'displayName',
          code: 'INVALID_DISPLAY_NAME',
        }),
      );
    });

    it('should reject invalid optimizationFocus type', () => {
      const profile = {
        ...validProfile,
        optimizationFocus: 'not-array' as unknown as SuperviseurProfile['optimizationFocus'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'optimizationFocus',
          code: 'INVALID_OPTIMIZATION_FOCUS_TYPE',
        }),
      );
    });

    it('should reject invalid optimization area value', () => {
      const profile = {
        ...validProfile,
        optimizationFocus: ['invalid-area'] as unknown as SuperviseurProfile['optimizationFocus'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'optimizationFocus[0]',
          code: 'INVALID_OPTIMIZATION_AREA',
        }),
      );
    });

    it('should reject invalid suggestionLevel', () => {
      const profile = {
        ...validProfile,
        suggestionLevel: 'moderate' as SuperviseurProfile['suggestionLevel'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'suggestionLevel',
          code: 'INVALID_SUGGESTION_LEVEL',
        }),
      );
    });

    it('should reject negative alternativeCount', () => {
      const profile = { ...validProfile, alternativeCount: -1 };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'alternativeCount',
          code: 'INVALID_ALTERNATIVE_COUNT',
        }),
      );
    });

    it('should reject non-number alternativeCount', () => {
      const profile = {
        ...validProfile,
        alternativeCount: 'three' as unknown as number,
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'alternativeCount',
          code: 'INVALID_ALTERNATIVE_COUNT',
        }),
      );
    });
  });
});
