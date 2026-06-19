// Identity Cache Service - Caching layer for identity characteristics

export class IdentityCharacteristicsCache {
  private cache = new Map<string, unknown>();
  private hits = 0;
  private misses = 0;

  get(key: string): unknown | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hits++;
      return value;
    }
    this.misses++;
    return undefined;
  }

  set(key: string, value: unknown): void {
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): { size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}
