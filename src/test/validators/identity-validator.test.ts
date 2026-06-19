// Unit tests for the new modular identity validator

import { describe, it, expect } from 'vitest';
import { IdentityValidator } from '../../models/validators/identity-validator';
import type { UserIdentity, IdentityPreferences } from '../../models/identity';

describe('IdentityValidator', () => {
  const validator = new IdentityValidator();

  describe('validate', () => {
    it('should validate a correct UserIdentity', () => {
      const identity: UserIdentity = {
        type: 'User',
        permissions: [
          {
            action: 'read',
            resource: 'documents',
          },
        ],
        preferences: {
          language: 'en',
          responseStyle: 'balanced',
          technicalLevel: 'intermediate',
        },
        customizations: [
          {
            type: 'append',
            content: 'Custom content',
            templateId: 'template-1',
            customContent: 'Custom content',
            isActive: true,
          },
        ],
      };

      const result = validator.validate(identity);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid identity type', () => {
      const identity: UserIdentity = {
        type: 'InvalidType' as unknown as 'User' | 'Superviseur' | 'Responsable',
        permissions: [],
        preferences: {
          language: 'en',
          responseStyle: 'balanced',
          technicalLevel: 'intermediate',
        },
        customizations: [],
      };

      const result = validator.validate(identity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'type',
          code: 'INVALID_IDENTITY_TYPE',
        }),
      );
    });

    it('should reject missing preferences', () => {
      const identity: UserIdentity = {
        type: 'User',
        permissions: [],
        preferences: null as unknown as IdentityPreferences,
        customizations: [],
      };

      const result = validator.validate(identity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'preferences',
          code: 'MISSING_PREFERENCES',
        }),
      );
    });

    it('should validate nested permission errors with proper field paths', () => {
      const identity: UserIdentity = {
        type: 'User',
        permissions: [
          {
            action: '', // Invalid empty action
            resource: 'documents',
          },
        ],
        preferences: {
          language: 'en',
          responseStyle: 'balanced',
          technicalLevel: 'intermediate',
        },
        customizations: [],
      };

      const result = validator.validate(identity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'permissions[0].action',
          code: 'INVALID_PERMISSION_ACTION',
        }),
      );
    });
  });
});
