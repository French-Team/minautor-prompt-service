// Version Handler Service - Enhanced with metrics and history

import type { IVersionHandler } from '../config/di-container';
import type {
  PromptVersion,
  VersionHistory,
  VersionMetadata,
  PerformanceMetrics,
  UserFeedback,
  VersionComparison,
  VersionDifference,
} from '../models/version';

// Options de configuration du VersionHandler (ajouté en Mission 04 — persistance disque).
export interface VersionHandlerOptions {
  /**
   * Chemin du fichier JSON utilisé pour la persistance disque (ex: `runtime/versions.json`).
   * Si fourni, le service chargera/sauvera les 3 Maps (versions/metrics/feedback) à chaque mutation.
   * Si absent (défaut), le service reste 100% en RAM (utile pour les tests unitaires).
   */
  storagePath?: string;
}

// Structure sérialisée sur disque (1 fichier = 3 Maps + metadata wrapper).
// Le wrapper `metadata` est analogue à templates.json / prompts.json — version du
// schéma, lastUpdated ISO, description lisible. Round-trip conservé via
// loadFromDisk/saveToDisk pour ne pas perdre le contenu du seed après 1er save.
export interface VersionStoreSnapshot {
  versions: Record<string, PromptVersion[]>;
  metrics: Record<string, VersionUsageMetrics>;
  feedback: Record<string, UserFeedback[]>;
  metadata?: {
    version: number;
    lastUpdated: string;
    description?: string;
  };
}

export interface VersionUsageMetrics {
  promptId: string;
  version: string;
  usageCount: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageResponseTime: number;
  userSatisfactionScore: number;
  averageSuccessRate: number;
  lastUsed: Date;
  createdAt: Date;
}

export interface VersionAnalytics {
  promptId: string;
  totalVersions: number;
  activeVersion: string;
  mostUsedVersion: string;
  performanceTrend: 'improving' | 'declining' | 'stable';
  optimizationSuggestions: OptimizationSuggestion[];
  usageMetrics: VersionUsageMetrics[];
}

export interface OptimizationSuggestion {
  type: 'performance' | 'quality' | 'usage' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImpact: string;
  actionRequired: string;
}

export interface VersionQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'version' | 'usageCount' | 'performance';
  sortOrder?: 'asc' | 'desc';
  includeMetrics?: boolean;
  includeInactive?: boolean;
}

export class VersionHandler implements IVersionHandler {
  private versionStore = new Map<string, PromptVersion[]>();
  private metricsStore = new Map<string, VersionUsageMetrics>();
  private feedbackStore = new Map<string, UserFeedback[]>();
  private readonly storagePath: string | null = null;
  private diskLoaded = false;

  constructor(options: VersionHandlerOptions = {}) {
    this.storagePath = options.storagePath ?? null;
  }

  async createVersion(promptId: string, content: string, metadata: VersionMetadata): Promise<PromptVersion> {
    const versions = this.versionStore.get(promptId) || [];
    const versionNumber = this.generateVersionNumber(versions);

    const newVersion: PromptVersion = {
      id: `${promptId}-v${Date.now()}`,
      promptId,
      version: versionNumber,
      content,
      changes: [],
      createdAt: new Date(),
      createdBy: 'system', // TODO: Get from context
      isActive: true,
      metadata,
    };

    // Deactivate previous versions
    versions.forEach((v) => (v.isActive = false));

    versions.push(newVersion);
    this.versionStore.set(promptId, versions);

    // Initialize metrics for new version
    await this.initializeVersionMetrics(promptId, versionNumber);
    await this.persistSafely();

    return newVersion;
  }

  async getVersionHistory(promptId: string, options: VersionQueryOptions = {}): Promise<VersionHistory> {
    const versions = this.versionStore.get(promptId) || [];
    const {
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeMetrics = false,
      includeInactive = true,
    } = options;

    const filteredVersions = includeInactive ? versions : versions.filter((v) => v.isActive);

    // Sort versions
    filteredVersions.sort((a, b) => {
      const aValue = this.getSortValue(a, sortBy);
      const bValue = this.getSortValue(b, sortBy);
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const paginatedVersions = filteredVersions.slice(offset, offset + limit);

    // Enrich with metrics if requested
    if (includeMetrics) {
      for (const version of paginatedVersions) {
        const metrics = await this.getVersionMetrics(promptId, version.version);
        version.metadata.performanceMetrics = metrics;
      }
    }

    const currentVersion = versions.find((v) => v.isActive)?.version || '';

    return {
      promptId,
      versions: paginatedVersions,
      currentVersion,
      totalVersions: versions.length,
      createdAt: versions[0]?.createdAt || new Date(),
      lastModified: versions[versions.length - 1]?.createdAt || new Date(),
    };
  }

  async rollbackToVersion(promptId: string, targetVersion: string): Promise<PromptVersion> {
    const versions = this.versionStore.get(promptId) || [];
    const targetVersionObj = versions.find((v) => v.version === targetVersion);

    if (!targetVersionObj) {
      throw new Error(`Version ${targetVersion} not found for prompt ${promptId}`);
    }

    // Deactivate all versions
    versions.forEach((v) => (v.isActive = false));

    // Activate target version
    targetVersionObj.isActive = true;
    targetVersionObj.metadata.rollbackInfo = {
      canRollback: true,
      rollbackAt: new Date(),
      rollbackReason: 'Manual rollback',
    };

    this.versionStore.set(promptId, versions);

    // Record rollback metrics
    await this.recordRollbackMetrics(promptId, targetVersion);
    await this.persistSafely();

    return targetVersionObj;
  }

  async recordUsageMetrics(promptId: string, version: string, metrics: Partial<PerformanceMetrics>): Promise<void> {
    const key = `${promptId}-${version}`;
    let existing = this.metricsStore.get(key);

    if (!existing) {
      existing = await this.createDefaultMetrics(promptId, version);
      this.metricsStore.set(key, existing);
    }

    // Update metrics
    existing.usageCount++;
    if (metrics.responseTime) {
      existing.averageResponseTime = this.calculateMovingAverage(
        existing.averageResponseTime,
        metrics.responseTime,
        existing.usageCount,
      );
    }

    if (metrics.successRate !== undefined) {
      existing.averageSuccessRate = this.calculateMovingAverage(
        existing.averageSuccessRate,
        metrics.successRate,
        existing.usageCount,
      );

      if (metrics.successRate > 0.8) {
        existing.successfulGenerations++;
      } else {
        existing.failedGenerations++;
      }
    }

    if (metrics.userSatisfaction) {
      existing.userSatisfactionScore = this.calculateMovingAverage(
        existing.userSatisfactionScore,
        metrics.userSatisfaction,
        existing.usageCount,
      );
    }

    existing.lastUsed = new Date();
    this.metricsStore.set(key, existing);
    await this.persistSafely();
  }

  async getVersionMetrics(promptId: string, version: string): Promise<PerformanceMetrics> {
    const key = `${promptId}-${version}`;
    const metrics = this.metricsStore.get(key);

    if (!metrics) {
      return {
        responseTime: 0,
        successRate: 0,
        errorRate: 0,
        userSatisfaction: 0,
        usageFrequency: 0,
      };
    }

    // Use the recorded average success rate
    const successRate = metrics.averageSuccessRate;
    const errorRate = 1 - successRate;

    return {
      responseTime: metrics.averageResponseTime,
      successRate,
      errorRate,
      userSatisfaction: metrics.userSatisfactionScore,
      usageFrequency: this.calculateUsageFrequency(metrics),
    };
  }

  async getVersionAnalytics(promptId: string): Promise<VersionAnalytics> {
    const versions = this.versionStore.get(promptId) || [];
    const activeVersion = versions.find((v) => v.isActive)?.version || '';

    // Calculate most used version
    const usageMetrics = await this.getAllVersionMetrics(promptId);
    const mostUsedVersion =
      usageMetrics.length > 0
        ? usageMetrics.reduce((prev, current) => (prev.usageCount > current.usageCount ? prev : current)).version
        : activeVersion;

    // Analyze performance trend
    const performanceTrend = await this.analyzePerformanceTrend(promptId);

    // Generate optimization suggestions
    const optimizationSuggestions = await this.generateOptimizationSuggestions(promptId, usageMetrics);

    return {
      promptId,
      totalVersions: versions.length,
      activeVersion,
      mostUsedVersion,
      performanceTrend,
      optimizationSuggestions,
      usageMetrics,
    };
  }

  async compareVersions(promptId: string, version1: string, version2: string): Promise<VersionComparison> {
    const versions = this.versionStore.get(promptId) || [];
    const v1 = versions.find((v) => v.version === version1);
    const v2 = versions.find((v) => v.version === version2);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    const differences = await this.calculateVersionDifferences(v1, v2);
    const recommendation = await this.generateVersionRecommendation(v1, v2, differences);

    return {
      oldVersion: v1,
      newVersion: v2,
      differences,
      recommendation,
    };
  }

  async addUserFeedback(promptId: string, version: string, feedback: Omit<UserFeedback, 'timestamp'>): Promise<void> {
    const key = `${promptId}-${version}`;
    const existing = this.feedbackStore.get(key) || [];

    const newFeedback: UserFeedback = {
      ...feedback,
      timestamp: new Date(),
    };

    existing.push(newFeedback);
    this.feedbackStore.set(key, existing);

    // Update user satisfaction metrics
    await this.updateSatisfactionMetrics(promptId, version, feedback.rating);
    await this.persistSafely();
  }

  async getVersionFeedback(promptId: string, version: string): Promise<UserFeedback[]> {
    const key = `${promptId}-${version}`;
    return this.feedbackStore.get(key) || [];
  }

  // Private helper methods

  private generateVersionNumber(versions: PromptVersion[]): string {
    if (versions.length === 0) return '1.0.0';

    const latestVersion = versions[versions.length - 1].version;
    const [major, minor, patch] = latestVersion.split('.').map(Number);

    // Simple increment patch version
    return `${major}.${minor}.${patch + 1}`;
  }

  private async initializeVersionMetrics(promptId: string, version: string): Promise<void> {
    const key = `${promptId}-${version}`;
    const metrics: VersionUsageMetrics = {
      promptId,
      version,
      usageCount: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      averageResponseTime: 0,
      userSatisfactionScore: 0,
      averageSuccessRate: 0,
      lastUsed: new Date(),
      createdAt: new Date(),
    };

    this.metricsStore.set(key, metrics);
  }

  private async createDefaultMetrics(promptId: string, version: string): Promise<VersionUsageMetrics> {
    const metrics: VersionUsageMetrics = {
      promptId,
      version,
      usageCount: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      averageResponseTime: 0,
      userSatisfactionScore: 0,
      averageSuccessRate: 0,
      lastUsed: new Date(),
      createdAt: new Date(),
    };

    return metrics;
  }

  private calculateMovingAverage(currentAvg: number, newValue: number, count: number): number {
    return (currentAvg * (count - 1) + newValue) / count;
  }

  private calculateUsageFrequency(metrics: VersionUsageMetrics): number {
    const daysSinceCreation = Math.max(1, (Date.now() - metrics.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return metrics.usageCount / daysSinceCreation;
  }

  private getSortValue(version: PromptVersion, sortBy: string): number | string {
    switch (sortBy) {
      case 'createdAt':
        return version.createdAt.getTime();
      case 'version':
        return version.version;
      case 'usageCount': {
        const key = `${version.promptId}-${version.version}`;
        return this.metricsStore.get(key)?.usageCount || 0;
      }
      case 'performance': {
        const perfKey = `${version.promptId}-${version.version}`;
        return this.metricsStore.get(perfKey)?.userSatisfactionScore || 0;
      }
      default:
        return version.createdAt.getTime();
    }
  }

  private async getAllVersionMetrics(promptId: string): Promise<VersionUsageMetrics[]> {
    const versions = this.versionStore.get(promptId) || [];
    const metrics: VersionUsageMetrics[] = [];

    for (const version of versions) {
      const key = `${promptId}-${version.version}`;
      const versionMetrics = this.metricsStore.get(key);
      if (versionMetrics) {
        metrics.push(versionMetrics);
      }
    }

    return metrics;
  }

  private async analyzePerformanceTrend(promptId: string): Promise<'improving' | 'declining' | 'stable'> {
    const metrics = await this.getAllVersionMetrics(promptId);
    if (metrics.length < 2) return 'stable';

    // Sort by creation date
    metrics.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // For small datasets, compare first half with second half
    const midpoint = Math.floor(metrics.length / 2);
    const older = metrics.slice(0, midpoint);
    const recent = metrics.slice(midpoint);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvgSatisfaction = recent.reduce((sum, m) => sum + m.userSatisfactionScore, 0) / recent.length;
    const olderAvgSatisfaction = older.reduce((sum, m) => sum + m.userSatisfactionScore, 0) / older.length;

    const threshold = 0.1; // 10% change threshold
    const change = olderAvgSatisfaction > 0 ? (recentAvgSatisfaction - olderAvgSatisfaction) / olderAvgSatisfaction : 0;

    if (change > threshold) return 'improving';
    if (change < -threshold) return 'declining';
    return 'stable';
  }

  private async generateOptimizationSuggestions(
    _promptId: string,
    metrics: VersionUsageMetrics[],
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for low usage versions
    const lowUsageVersions = metrics.filter(
      (m) => m.usageCount < 5 && Date.now() - m.createdAt.getTime() > 7 * 24 * 60 * 60 * 1000,
    ); // Older than 7 days

    if (lowUsageVersions.length > 0) {
      suggestions.push({
        type: 'maintenance',
        priority: 'medium',
        description: `${lowUsageVersions.length} versions have low usage and could be archived`,
        expectedImpact: 'Reduced storage and improved performance',
        actionRequired: 'Review and archive unused versions',
      });
    }

    // Check for performance issues
    const poorPerformingVersions = metrics.filter((m) => m.userSatisfactionScore < 3.0);
    if (poorPerformingVersions.length > 0) {
      suggestions.push({
        type: 'quality',
        priority: 'high',
        description: `${poorPerformingVersions.length} versions have low user satisfaction scores`,
        expectedImpact: 'Improved user experience and prompt effectiveness',
        actionRequired: 'Review and optimize low-performing prompt versions',
      });
    }

    // Check for high error rates
    const highErrorVersions = metrics.filter((m) => {
      const totalGenerations = m.successfulGenerations + m.failedGenerations;
      return totalGenerations > 0 && m.failedGenerations / totalGenerations > 0.2;
    });

    if (highErrorVersions.length > 0) {
      suggestions.push({
        type: 'performance',
        priority: 'critical',
        description: `${highErrorVersions.length} versions have high error rates (>20%)`,
        expectedImpact: 'Reduced errors and improved reliability',
        actionRequired: 'Investigate and fix error-prone prompt versions',
      });
    }

    return suggestions;
  }

  private async calculateVersionDifferences(v1: PromptVersion, v2: PromptVersion): Promise<VersionDifference[]> {
    const differences: VersionDifference[] = [];

    // Compare content
    if (v1.content !== v2.content) {
      differences.push({
        field: 'content',
        oldValue: v1.content,
        newValue: v2.content,
        impact: 'neutral', // Would need more sophisticated analysis
        description: 'Prompt content has changed',
      });
    }

    // Compare metadata
    if (JSON.stringify(v1.metadata) !== JSON.stringify(v2.metadata)) {
      differences.push({
        field: 'metadata',
        oldValue: v1.metadata,
        newValue: v2.metadata,
        impact: 'neutral',
        description: 'Metadata has been updated',
      });
    }

    return differences;
  }

  private async generateVersionRecommendation(
    v1: PromptVersion,
    v2: PromptVersion,
    _differences: VersionDifference[],
  ): Promise<'upgrade' | 'keep' | 'rollback'> {
    // Simple heuristic - in a real implementation, this would be more sophisticated
    const v1Metrics = await this.getVersionMetrics(v1.promptId, v1.version);
    const v2Metrics = await this.getVersionMetrics(v2.promptId, v2.version);

    if (v2Metrics.userSatisfaction > v1Metrics.userSatisfaction && v2Metrics.successRate > v1Metrics.successRate) {
      return 'upgrade';
    }

    if (v1Metrics.userSatisfaction > v2Metrics.userSatisfaction && v1Metrics.successRate > v2Metrics.successRate) {
      return 'rollback';
    }

    return 'keep';
  }

  private async recordRollbackMetrics(promptId: string, version: string): Promise<void> {
    // Record that a rollback occurred for analytics
    const key = `${promptId}-${version}`;
    const metrics = this.metricsStore.get(key);
    if (metrics) {
      // Could add rollback-specific metrics here
      metrics.lastUsed = new Date();
      this.metricsStore.set(key, metrics);
    }
  }

  private async updateSatisfactionMetrics(promptId: string, version: string, rating: number): Promise<void> {
    const key = `${promptId}-${version}`;
    const metrics = this.metricsStore.get(key);
    if (metrics) {
      metrics.userSatisfactionScore = this.calculateMovingAverage(
        metrics.userSatisfactionScore,
        rating,
        metrics.usageCount + 1,
      );
      this.metricsStore.set(key, metrics);
    }
  }

  // ─── Persistance disque (Mission 04) ───────────────────────────────────────

  /**
   * Insère directement un PromptVersion dans versionStore sans passer par
   * la logique d'incrément / désactivation de createVersion.
   * Utilisé par POST /api/versions pour persister une version déjà construite côté client.
   */
  async storePromptVersion(version: PromptVersion): Promise<PromptVersion> {
    const existing = this.versionStore.get(version.promptId) || [];
    // Cohérence avec createVersion() : si la nouvelle version arrive en isActive=true,
    // désactiver les versions précédentes du même promptId pour préserver l'invariant
    // `un seul isActive=true par promptId`. Sinon getVersionHistory.currentVersion
    // serait ambigu (plusieurs actifs).
    if (version.isActive) {
      for (const v of existing) {
        v.isActive = false;
      }
    }
    existing.push(version);
    this.versionStore.set(version.promptId, existing);
    await this.persistSafely();
    return version;
  }

  /**
   * Liste toutes les entrées des 3 Maps sous forme d'un snapshot JSON-friendly.
   * Utilisé par GET /api/versions pour hydrater la page /versions.
   * Les Maps sont converties en Records ; les valeurs restent des références aux objets du store.
   */
  listVersionsAll(): VersionStoreSnapshot {
    return {
      versions: Object.fromEntries(this.versionStore),
      metrics: Object.fromEntries(this.metricsStore),
      feedback: Object.fromEntries(this.feedbackStore),
    };
  }

  /**
   * Indique si une version avec cet id existe déjà (toutes confondues).
   * Utilisé par POST /api/versions pour détecter un duplicate et renvoyer 409.
   */
  hasVersionById(versionId: string): boolean {
    for (const versions of this.versionStore.values()) {
      if (versions.some((v) => v.id === versionId)) return true;
    }
    return false;
  }

  /**
   * Initialise le service depuis le disque si un chemin de stockage est configuré.
   * Idempotent (la classe se protège contre les doubles-chargements).
   * En l'absence de `storagePath`, cette méthode est un no-op (mode RAM pur).
   */
  async initialize(): Promise<void> {
    if (this.diskLoaded) return;
    this.diskLoaded = true;
    if (this.storagePath) {
      await this.loadFromDisk();
    }
  }

  /**
   * Indique si la persistance disque est active (un `storagePath` a été fourni).
   */
  isPersistenceEnabled(): boolean {
    return this.storagePath !== null;
  }

  /**
   * Wrapper privé pour `saveToDisk()` qui log les erreurs sans throw.
   */
  private async persistSafely(): Promise<void> {
    try {
      await this.saveToDisk();
    } catch (diskError) {
      console.error('[VersionHandler] Failed to save versions to disk:', diskError);
    }
  }

  /**
   * Lit le fichier de stockage, charge les 3 Maps et ravive les Dates.
   * Si le fichier n'existe pas, copie le seed `runtime/versions.seed.json`.
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.storagePath) return;
    const { existsSync, readFileSync, writeFileSync, mkdirSync } = await import('node:fs');
    const { dirname } = await import('node:path');

    const dir = dirname(this.storagePath);
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (!existsSync(this.storagePath)) {
      // Bootstrap : on copie le seed de référence s'il existe, sinon on initialise un store vide.
      const seedPath = this.storagePath.replace(/versions\.json$/, 'versions.seed.json');
      if (existsSync(seedPath)) {
        const seedRaw = readFileSync(seedPath, 'utf-8');
        writeFileSync(this.storagePath, seedRaw, 'utf-8');
      } else {
        const empty: VersionStoreSnapshot = { versions: {}, metrics: {}, feedback: {} };
        writeFileSync(this.storagePath, JSON.stringify(empty), 'utf-8');
      }
    }

    const raw = readFileSync(this.storagePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<VersionStoreSnapshot>;

    if (parsed.versions && typeof parsed.versions === 'object') {
      for (const [promptId, versionList] of Object.entries(parsed.versions)) {
        this.versionStore.set(promptId, versionList.map((v) => this.reviveVersionDates(v)));
      }
    }
    if (parsed.metrics && typeof parsed.metrics === 'object') {
      for (const [key, m] of Object.entries(parsed.metrics)) {
        this.metricsStore.set(key, this.reviveMetricsDates(m));
      }
    }
    if (parsed.feedback && typeof parsed.feedback === 'object') {
      for (const [key, fbList] of Object.entries(parsed.feedback)) {
        this.feedbackStore.set(
          key,
          fbList.map((fb) => this.reviveFeedbackDates(fb)),
        );
      }
    }
  }

  /**
   * Sérialise les 3 Maps vers le fichier de stockage.
   * No-op si aucun `storagePath` n'a été configuré.
   */
  private async saveToDisk(): Promise<void> {
    if (!this.storagePath) return;
    const { writeFileSync } = await import('node:fs');

    const payload: VersionStoreSnapshot = {
      versions: Object.fromEntries(this.versionStore),
      metrics: Object.fromEntries(this.metricsStore),
      feedback: Object.fromEntries(this.feedbackStore),
      metadata: {
        version: 1,
        lastUpdated: new Date().toISOString(),
        description: 'Version store snapshot (prompts/versions/metrics/feedback)',
      },
    };
    writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  /**
   * Reconstitue les Dates d'un PromptVersion : createdAt + metadata.rollbackInfo.rollbackAt.
   */
  private reviveVersionDates(raw: PromptVersion): PromptVersion {
    const v: PromptVersion = { ...raw, metadata: { ...raw.metadata } };
    if (typeof v.createdAt === 'string') {
      v.createdAt = new Date(v.createdAt);
    }
    if (v.metadata.rollbackInfo?.rollbackAt && typeof v.metadata.rollbackInfo.rollbackAt === 'string') {
      v.metadata.rollbackInfo = {
        ...v.metadata.rollbackInfo,
        rollbackAt: new Date(v.metadata.rollbackInfo.rollbackAt),
      };
    }
    return v;
  }

  /**
   * Reconstitue les Dates d'un VersionUsageMetrics : lastUsed + createdAt.
   */
  private reviveMetricsDates(raw: VersionUsageMetrics): VersionUsageMetrics {
    const m: VersionUsageMetrics = { ...raw };
    if (typeof m.lastUsed === 'string') m.lastUsed = new Date(m.lastUsed);
    if (typeof m.createdAt === 'string') m.createdAt = new Date(m.createdAt);
    return m;
  }

  /**
   * Reconstitue les Dates d'un UserFeedback : timestamp.
   */
  private reviveFeedbackDates(raw: UserFeedback): UserFeedback {
    const fb: UserFeedback = { ...raw };
    if (typeof fb.timestamp === 'string') fb.timestamp = new Date(fb.timestamp);
    return fb;
  }
}
