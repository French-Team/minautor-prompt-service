// Unit tests for PreferencesValidator

import { describe, it, expect } from 'vitest';
import { PreferencesValidator } from '../../models/validators/preferences-validator';
import type { IdentityPreferences } from '../../models/identity';

describe('PreferencesValidator', () => {
  const validator = new PreferencesValidator();

  describe('validate', () => {
    it('should validate correct preferences', () => {
      const preferences: IdentityPreferences = {
        language: 'fr',
        responseStyle: 'balanced',
        technicalLevel: 'intermediate',
      };

      const result = validator.validate(preferences);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty language', () => {
      const preferences: IdentityPreferences = {
        language: '',
        responseStyle: 'balanced',
        technicalLevel: 'intermediate',
      };

      const result = validator.validate(preferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'language',
          code: 'INVALID_LANGUAGE',
        }),
      );
    });

    it('should reject invalid response style', () => {
      const preferences: IdentityPreferences = {
        language: 'fr',
        responseStyle: 'invalid-style' as IdentityPreferences['responseStyle'],
        technicalLevel: 'intermediate',
      };

      const result = validator.validate(preferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'responseStyle',
          code: 'INVALID_RESPONSE_STYLE',
        }),
      );
    });

    it('should accept all valid response styles', () => {
      const styles: IdentityPreferences['responseStyle'][] = ['concise', 'detailed', 'balanced'];
      for (const responseStyle of styles) {
        const preferences: IdentityPreferences = {
          language: 'en',
          responseStyle,
          technicalLevel: 'basic',
        };
        const result = validator.validate(preferences);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid technical level', () => {
      const preferences: IdentityPreferences = {
        language: 'fr',
        responseStyle: 'concise',
        technicalLevel: 'invalid-level' as IdentityPreferences['technicalLevel'],
      };

      const result = validator.validate(preferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'technicalLevel',
          code: 'INVALID_TECHNICAL_LEVEL',
        }),
      );
    });

    it('should accept all valid technical levels', () => {
      const levels: IdentityPreferences['technicalLevel'][] = ['basic', 'intermediate', 'advanced'];
      for (const technicalLevel of levels) {
        const preferences: IdentityPreferences = {
          language: 'en',
          responseStyle: 'detailed',
          technicalLevel,
        };
        const result = validator.validate(preferences);
        expect(result.isValid).toBe(true);
      }
    });
  });
});
