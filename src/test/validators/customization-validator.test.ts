// Unit tests for CustomizationValidator

import { describe, it, expect } from 'vitest';
import { CustomizationValidator } from '../../models/validators/customization-validator';
import type { PromptCustomization } from '../../models/identity';

describe('CustomizationValidator', () => {
  const validator = new CustomizationValidator();

  describe('validate', () => {
    it('should validate a correct customization', () => {
      const customization: PromptCustomization = {
        templateId: 'template-1',
        type: 'append',
        content: 'Custom content',
        customContent: 'Custom content here',
        isActive: true,
      };

      const result = validator.validate(customization);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty templateId', () => {
      const customization: PromptCustomization = {
        templateId: '',
        type: 'append',
        content: 'Content',
        customContent: 'Content',
        isActive: true,
      };

      const result = validator.validate(customization);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'templateId',
          code: 'INVALID_TEMPLATE_ID',
        }),
      );
    });

    it('should reject empty customContent', () => {
      const customization: PromptCustomization = {
        templateId: 'template-1',
        type: 'append',
        content: 'Content',
        customContent: '',
        isActive: true,
      };

      const result = validator.validate(customization);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'customContent',
          code: 'INVALID_CUSTOM_CONTENT',
        }),
      );
    });

    it('should reject non-boolean isActive', () => {
      const customization: PromptCustomization = {
        templateId: 'template-1',
        type: 'append',
        content: 'Content',
        customContent: 'Content',
        isActive: 'yes' as unknown as boolean,
      };

      const result = validator.validate(customization);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'isActive',
          code: 'INVALID_IS_ACTIVE',
        }),
      );
    });

    it('should accept missing isActive (optional field)', () => {
      const customization: PromptCustomization = {
        templateId: 'template-1',
        type: 'append',
        content: 'Content',
        customContent: 'Content',
      };

      const result = validator.validate(customization);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid variables type (non-object)', () => {
      const customization: PromptCustomization = {
        templateId: 'template-1',
        type: 'append',
        content: 'Content',
        customContent: 'Content',
        isActive: true,
        variables: 'not-an-object' as unknown as Record<string, unknown>,
      };

      const result = validator.validate(customization);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'variables',
          code: 'INVALID_VARIABLES',
        }),
      );
    });

    it('should accept valid variables object', () => {
      const customization: PromptCustomization = {
        templateId: 'template-1',
        type: 'append',
        content: 'Content',
        customContent: 'Content',
        isActive: true,
        variables: { key: 'value', count: 42 },
      };

      const result = validator.validate(customization);
      expect(result.isValid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const customization: PromptCustomization = {
        templateId: '',
        type: 'append',
        content: 'Content',
        customContent: '',
        isActive: 'yes' as unknown as boolean,
      };

      const result = validator.validate(customization);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
