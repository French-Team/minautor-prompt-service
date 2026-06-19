// Unit tests for CachedValidator

import { describe, it, expect, vi } from 'vitest';
import { CachedValidator } from '../../models/validators/cached-validator';
import { BaseValidator } from '../../models/validators/base-validator';
import type { ValidationResult } from '../../models/validators/base-validator';

class MockValidator extends BaseValidator<unknown> {
  validate = vi.fn<(_item: unknown) => ValidationResult>().mockImplementation((item: unknown) => ({
    isValid: (item as { valid?: boolean }).valid !== false,
    errors: [],
    warnings: [],
  }));
}

describe('CachedValidator', () => {
  describe('validate', () => {
    it('should delegate to underlying validator on first call', () => {
      const mock = new MockValidator();
      const cached = new CachedValidator(mock);

      cached.validate({ valid: true });

      expect(mock.validate).toHaveBeenCalledTimes(1);
    });

    it('should return cached result on repeated calls with same input', () => {
      const mock = new MockValidator();
      const cached = new CachedValidator(mock);

      const input = { valid: true };
      const firstResult = cached.validate(input);
      const secondResult = cached.validate(input);

      expect(mock.validate).toHaveBeenCalledTimes(1);
      expect(firstResult).toBe(secondResult);
    });

    it('should call underlying validator for different inputs', () => {
      const mock = new MockValidator();
      const cached = new CachedValidator(mock);

      cached.validate({ id: 1 });
      cached.validate({ id: 2 });

      expect(mock.validate).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid items correctly', () => {
      const mock = new MockValidator();
      const cached = new CachedValidator(mock);

      const result = cached.validate({ valid: false });

      expect(result.isValid).toBe(false);
    });

    it('should handle primitive values as cache keys', () => {
      const mock = new MockValidator();
      const cached = new CachedValidator(mock);

      cached.validate('string-key');
      cached.validate('string-key');
      cached.validate(42);
      cached.validate(42);

      expect(mock.validate).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache and force re-validation', () => {
      const mock = new MockValidator();
      const cached = new CachedValidator(mock);

      const input = { valid: true };
      cached.validate(input);
      cached.clearCache();
      cached.validate(input);

      expect(mock.validate).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache size and max size', () => {
      const mock = new MockValidator();
      const cached = new CachedValidator(mock, 500);

      const stats = cached.getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(500);
    });

    it('should reflect cache size after validation', () => {
      const mock = new MockValidator();
      const cached = new CachedValidator(mock);

      cached.validate({ id: 1 });
      cached.validate({ id: 2 });

      const stats = cached.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('cache size management', () => {
    it('should evict oldest entry when cache exceeds max size', () => {
      const mock = new MockValidator();
      const cached = new CachedValidator(mock, 2);

      cached.validate({ id: 1 });
      cached.validate({ id: 2 });
      cached.validate({ id: 3 }); // Should evict { id: 1 }

      // Re-validate the evicted item — should call underlying validator again
      cached.validate({ id: 1 });
      expect(mock.validate).toHaveBeenCalledTimes(4);
    });
  });
});
