// Unit tests for PermissionValidator

import { describe, it, expect } from 'vitest';
import { PermissionValidator } from '../../models/validators/permission-validator';
import type { Permission } from '../../models/identity';

describe('PermissionValidator', () => {
  const validator = new PermissionValidator();

  describe('validate', () => {
    it('should validate a correct Permission', () => {
      const permission: Permission = {
        action: 'read',
        resource: 'documents',
      };

      const result = validator.validate(permission);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null permission', () => {
      const result = validator.validate(null as unknown as Permission);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: '',
          code: 'MISSING_PERMISSION',
        }),
      );
    });

    it('should reject undefined permission', () => {
      const result = validator.validate(undefined as unknown as Permission);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: '',
          code: 'MISSING_PERMISSION',
        }),
      );
    });

    it('should reject empty action', () => {
      const permission: Permission = {
        action: '',
        resource: 'documents',
      };

      const result = validator.validate(permission);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'action',
          code: 'INVALID_PERMISSION_ACTION',
        }),
      );
    });

    it('should reject empty resource', () => {
      const permission: Permission = {
        action: 'read',
        resource: '',
      };

      const result = validator.validate(permission);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'resource',
          code: 'INVALID_PERMISSION_RESOURCE',
        }),
      );
    });

    it('should reject invalid conditions type', () => {
      const permission: Permission = {
        action: 'read',
        resource: 'documents',
        conditions: 'not-an-object' as unknown as Record<string, unknown>,
      };

      const result = validator.validate(permission);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions',
          code: 'INVALID_PERMISSION_CONDITIONS',
        }),
      );
    });

    it('should accept valid conditions', () => {
      const permission: Permission = {
        action: 'read',
        resource: 'documents',
        conditions: { role: 'admin' },
      };

      const result = validator.validate(permission);
      expect(result.isValid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const permission: Permission = {
        action: '',
        resource: '',
      };

      const result = validator.validate(permission);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
