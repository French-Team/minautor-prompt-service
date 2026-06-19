// Unit tests for UserProfileValidator

import { describe, it, expect } from 'vitest';
import { UserProfileValidator } from '../../models/validators/profile-validators';
import type { UserProfile } from '../../models/identity';

describe('UserProfileValidator', () => {
  const validator = new UserProfileValidator();

  const validProfile: UserProfile = {
    identityType: 'User',
    displayName: 'Test User',
    description: 'A standard user profile for testing',
    capabilities: ['basic_operations', 'read_content'],
    simplificationLevel: 'basic',
    preferredResponseLength: 'medium',
    technicalDepth: 'standard',
  };

  describe('validate', () => {
    it('should validate a correct UserProfile', () => {
      const result = validator.validate(validProfile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid identityType', () => {
      const profile = { ...validProfile, identityType: 'InvalidType' as UserProfile['identityType'] };
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

    it('should reject empty description', () => {
      const profile = { ...validProfile, description: '' };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'description',
          code: 'INVALID_DESCRIPTION',
        }),
      );
    });

    it('should reject invalid capabilities type', () => {
      const profile = { ...validProfile, capabilities: 'not-array' as unknown as string[] };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'capabilities',
          code: 'INVALID_CAPABILITIES_TYPE',
        }),
      );
    });

    it('should reject invalid simplificationLevel', () => {
      const profile = {
        ...validProfile,
        simplificationLevel: 'advanced' as UserProfile['simplificationLevel'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'simplificationLevel',
          code: 'INVALID_SIMPLIFICATION_LEVEL',
        }),
      );
    });

    it('should reject invalid preferredResponseLength', () => {
      const profile = {
        ...validProfile,
        preferredResponseLength: 'long' as UserProfile['preferredResponseLength'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'preferredResponseLength',
          code: 'INVALID_RESPONSE_LENGTH',
        }),
      );
    });

    it('should reject invalid technicalDepth', () => {
      const profile = {
        ...validProfile,
        technicalDepth: 'advanced' as UserProfile['technicalDepth'],
      };
      const result = validator.validate(profile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'technicalDepth',
          code: 'INVALID_TECHNICAL_DEPTH',
        }),
      );
    });
  });
});
