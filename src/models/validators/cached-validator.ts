// Cached validator wrapper for performance optimization

import { BaseValidator } from './base-validator';
import type { ValidationResult } from './base-validator';

export class CachedValidator<T> extends BaseValidator<T> {
  private cache = new Map<string, ValidationResult>();
  private readonly maxCacheSize: number;
  private readonly validator: BaseValidator<T>;

  constructor(validator: BaseValidator<T>, maxCacheSize = 1000) {
    super();
    this.validator = validator;
    this.maxCacheSize = maxCacheSize;
  }

  validate(item: T): ValidationResult {
    const key = this.generateCacheKey(item);

    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Validate and cache result
    const result = this.validator.validate(item);

    // Manage cache size
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, result);
    return result;
  }

  private generateCacheKey(item: T): string {
    // Simple JSON-based cache key - could be optimized further
    return JSON.stringify(item);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}
