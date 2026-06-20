// Template Library Service - Comprehensive template management

import type {
  PromptTemplate,
  TemplateCategory,
  TemplateSearchIndex,
  TemplateUsageMetrics,
  TemplateShareInfo,
  TemplatePermission,
  TemplateLifecycleStatus,
  TemplateObsolescenceCheck,
  ObsolescenceReason,
  TemplateAction,
  TemplateVersionInfo,
} from '../models/template';
import { TemplateValidator } from '../models/template';
import type { UserIdentityType } from '../models/identity';
import type { Result } from '../models/result';
import { success, failure } from '../models/result';

export interface TemplateSearchCriteria {
  category?: TemplateCategory;
  identity?: UserIdentityType;
  keywords?: string[];
  author?: string;
  isPublic?: boolean;
  minUsageCount?: number;
  maxUsageCount?: number;
}

export interface TemplateSearchResult {
  templates: PromptTemplate[];
  totalCount: number;
  searchTime: number;
}

export interface TemplateStorageOptions {
  validateOnStore?: boolean;
  updateSearchIndex?: boolean;
  trackMetrics?: boolean;
}

export interface TemplateLibraryServiceOptions {
  /**
   * Chemin du fichier JSON utilisé pour la persistance disque (ex: `runtime/templates.json`).
   * Si fourni, le service chargera/sauvera les templates dans ce fichier à chaque mutation.
   * Si absent, le service reste 100% en RAM (utile pour les tests unitaires).
   */
  storagePath?: string;
}

export interface TemplateLibraryStats {
  totalTemplates: number;
  publicTemplates: number;
  privateTemplates: number;
  categoryCounts: Record<TemplateCategory, number>;
  identityCounts: Record<UserIdentityType, number>;
  averageUsageCount: number;
  mostUsedTemplate: PromptTemplate | null;
}

export class TemplateLibraryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'TemplateLibraryError';
  }
}

/**
 * Comprehensive template management service providing storage, retrieval,
 * search, and organization functionality for prompt templates
 */
export class TemplateLibraryService {
  private templates = new Map<string, PromptTemplate>();
  private searchIndex: TemplateSearchIndex = {
    byCategory: {} as Record<TemplateCategory, string[]>,
    byIdentity: {} as Record<UserIdentityType, string[]>,
    byKeyword: {},
  };
  private usageMetrics = new Map<string, TemplateUsageMetrics>();
  private readonly storagePath: string | null = null;
  private diskLoaded = false;

  constructor(options: TemplateLibraryServiceOptions = {}) {
    this.storagePath = options.storagePath ?? null;
    this.initializeSearchIndex();
  }

  /**
   * Initialise le service depuis le disque si un chemin de stockage est configuré.
   * À appeler une seule fois (la classe se protège contre les doubles-chargements).
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
   * Lit le fichier de stockage, charge les templates en mémoire et peuple l'index de recherche.
   * Si le fichier n'existe pas, crée un fichier de seeds à partir de `runtime/templates.seed.json`
   * (copié dans le fichier cible). Idempotent : peut être appelé plusieurs fois.
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
      // Seed initial depuis le fichier de référence commit-git
      const seedPath = this.storagePath.replace(/templates\.json$/, 'templates.seed.json');
      if (existsSync(seedPath)) {
        const seedRaw = readFileSync(seedPath, 'utf-8');
        writeFileSync(this.storagePath, seedRaw, 'utf-8');
      } else {
        // Pas de seed disponible : on démarre avec un store vide
        writeFileSync(
          this.storagePath,
          JSON.stringify({ templates: {}, metadata: { version: 1, lastUpdated: new Date().toISOString() } }),
          'utf-8',
        );
      }
    }

    const raw = readFileSync(this.storagePath, 'utf-8');
    const parsed = JSON.parse(raw) as { templates?: Record<string, PromptTemplate>; metadata?: unknown };

    if (parsed.templates && typeof parsed.templates === 'object') {
      for (const [id, raw] of Object.entries(parsed.templates)) {
        const tpl = this.reviveTemplateDates(raw);
        this.templates.set(id, tpl);
        this.addToSearchIndex(tpl);
      }
    }
  }

  /**
   * Sérialise la Map courante vers le fichier de stockage.
   * No-op si aucun `storagePath` n'a été configuré.
   */
  private async saveToDisk(): Promise<void> {
    if (!this.storagePath) return;
    const { writeFileSync } = await import('node:fs');

    const payload = {
      templates: Object.fromEntries(this.templates),
      metadata: {
        version: 1,
        lastUpdated: new Date().toISOString(),
      },
    };
    writeFileSync(this.storagePath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  /**
   * Reconstitue des objets `Date` à partir de chaînes ISO après désérialisation JSON.
   * Traite `createdAt` et `updatedAt` (PromptTemplate) — les autres champs restent tels quels.
   */
  private reviveTemplateDates(raw: PromptTemplate): PromptTemplate {
    const tpl: PromptTemplate = { ...raw };
    if (typeof tpl.createdAt === 'string') {
      tpl.createdAt = new Date(tpl.createdAt);
    }
    if (typeof tpl.updatedAt === 'string') {
      tpl.updatedAt = new Date(tpl.updatedAt);
    }
    return tpl;
  }

  /**
   * Indique si la persistance disque est active (un `storagePath` a été fourni).
   * Utile pour les logs/diagnostics et pour les tests d'intégration côté serveur.
   */
  isPersistenceEnabled(): boolean {
    return this.storagePath !== null;
  }

  /**
   * Stores a template in the library with validation and indexing
   */
  async storeTemplate(
    template: PromptTemplate,
    options: TemplateStorageOptions = {},
  ): Promise<Result<void, TemplateLibraryError>> {
    const { validateOnStore = true, updateSearchIndex = true, trackMetrics = true } = options;

    try {
      // Validate template if requested
      if (validateOnStore) {
        const validationResult = TemplateValidator.validatePromptTemplate(template);
        if (!validationResult.isValid) {
          return failure(
            new TemplateLibraryError(
              `Template validation failed: ${validationResult.errors.map((e) => e.message).join(', ')}`,
              'TEMPLATE_VALIDATION_FAILED',
              validationResult.errors,
            ),
          );
        }
      }

      // Check for duplicate ID
      if (this.templates.has(template.id)) {
        return failure(
          new TemplateLibraryError(`Template with ID '${template.id}' already exists`, 'DUPLICATE_TEMPLATE_ID', {
            templateId: template.id,
          }),
        );
      }

      // Store template
      this.templates.set(template.id, { ...template });

      // Update search index
      if (updateSearchIndex) {
        this.addToSearchIndex(template);
      }

      // Initialize metrics tracking
      if (trackMetrics && !this.usageMetrics.has(template.id)) {
        this.usageMetrics.set(template.id, {
          templateId: template.id,
          totalUses: template.usageCount || 0,
          successRate: 1.0,
          averageRating: 0,
          lastUsed: new Date(),
          popularVariables: {},
        });
      }

      // Persist on disk after a successful store (only if persistence is enabled)
      if (this.storagePath) {
        try {
          await this.saveToDisk();
        } catch (diskError) {
          console.error('[TemplateLibraryService] Failed to save template to disk:', diskError);
          // The in-memory mutation succeeded — the disk error is logged but does not break the API response.
        }
      }

      return success(undefined);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to store template: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'STORAGE_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Retrieves a template by ID
   */
  async getTemplate(templateId: string): Promise<Result<PromptTemplate, TemplateLibraryError>> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return failure(
          new TemplateLibraryError(`Template with ID '${templateId}' not found`, 'TEMPLATE_NOT_FOUND', { templateId }),
        );
      }

      return success({ ...template });
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to retrieve template: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'RETRIEVAL_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Updates an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<PromptTemplate>,
    options: TemplateStorageOptions = {},
  ): Promise<Result<void, TemplateLibraryError>> {
    const { validateOnStore = true, updateSearchIndex = true } = options;

    try {
      const existingTemplate = this.templates.get(templateId);
      if (!existingTemplate) {
        return failure(
          new TemplateLibraryError(`Template with ID '${templateId}' not found`, 'TEMPLATE_NOT_FOUND', { templateId }),
        );
      }

      // Create updated template
      const updatedTemplate: PromptTemplate = {
        ...existingTemplate,
        ...updates,
        id: templateId, // Ensure ID cannot be changed
        updatedAt: new Date(),
      };

      // Validate updated template if requested
      if (validateOnStore) {
        const validationResult = TemplateValidator.validatePromptTemplate(updatedTemplate);
        if (!validationResult.isValid) {
          return failure(
            new TemplateLibraryError(
              `Template validation failed: ${validationResult.errors.map((e) => e.message).join(', ')}`,
              'TEMPLATE_VALIDATION_FAILED',
              validationResult.errors,
            ),
          );
        }
      }

      // Update search index if needed
      if (updateSearchIndex) {
        this.removeFromSearchIndex(existingTemplate);
        this.addToSearchIndex(updatedTemplate);
      }

      // Store updated template
      this.templates.set(templateId, updatedTemplate);

      // Persist on disk after a successful update (only if persistence is enabled)
      if (this.storagePath) {
        try {
          await this.saveToDisk();
        } catch (diskError) {
          console.error('[TemplateLibraryService] Failed to save updated template to disk:', diskError);
        }
      }

      return success(undefined);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'UPDATE_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Deletes a template from the library
   */
  async deleteTemplate(templateId: string): Promise<Result<void, TemplateLibraryError>> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return failure(
          new TemplateLibraryError(`Template with ID '${templateId}' not found`, 'TEMPLATE_NOT_FOUND', { templateId }),
        );
      }

      // Remove from search index
      this.removeFromSearchIndex(template);

      // Remove template and metrics
      this.templates.delete(templateId);
      this.usageMetrics.delete(templateId);

      // Persist on disk after a successful delete (only if persistence is enabled)
      if (this.storagePath) {
        try {
          await this.saveToDisk();
        } catch (diskError) {
          console.error('[TemplateLibraryService] Failed to save deletion to disk:', diskError);
        }
      }

      return success(undefined);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'DELETE_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Searches templates based on criteria with advanced filtering
   */
  async searchTemplates(criteria: TemplateSearchCriteria): Promise<Result<TemplateSearchResult, TemplateLibraryError>> {
    const startTime = Date.now();

    try {
      let candidateIds = new Set<string>();
      let isFirstFilter = true;

      // Filter by category
      if (criteria.category) {
        const categoryIds = new Set(this.searchIndex.byCategory[criteria.category] || []);
        if (isFirstFilter) {
          candidateIds = categoryIds;
          isFirstFilter = false;
        } else {
          candidateIds = new Set([...candidateIds].filter((id) => categoryIds.has(id)));
        }
      }

      // Filter by identity
      if (criteria.identity) {
        const identityIds = new Set(this.searchIndex.byIdentity[criteria.identity] || []);
        if (isFirstFilter) {
          candidateIds = identityIds;
          isFirstFilter = false;
        } else {
          candidateIds = new Set([...candidateIds].filter((id) => identityIds.has(id)));
        }
      }

      // Filter by keywords
      if (criteria.keywords && criteria.keywords.length > 0) {
        const keywordIds = new Set<string>();
        criteria.keywords.forEach((keyword) => {
          const ids = this.searchIndex.byKeyword[keyword.toLowerCase()] || [];
          ids.forEach((id) => keywordIds.add(id));
        });

        if (isFirstFilter) {
          candidateIds = keywordIds;
          isFirstFilter = false;
        } else {
          candidateIds = new Set([...candidateIds].filter((id) => keywordIds.has(id)));
        }
      }

      // If no specific filters, start with all templates
      if (isFirstFilter) {
        candidateIds = new Set(this.templates.keys());
      }

      // Apply additional filters
      const filteredTemplates = Array.from(candidateIds)
        .map((id) => this.templates.get(id)!)
        .filter((template) => {
          // Filter by author
          if (criteria.author && template.author !== criteria.author) {
            return false;
          }

          // Filter by public/private
          if (criteria.isPublic !== undefined && template.isPublic !== criteria.isPublic) {
            return false;
          }

          // Filter by usage count range
          if (criteria.minUsageCount !== undefined && template.usageCount < criteria.minUsageCount) {
            return false;
          }

          if (criteria.maxUsageCount !== undefined && template.usageCount > criteria.maxUsageCount) {
            return false;
          }

          return true;
        });

      const searchTime = Date.now() - startTime;

      return success({
        templates: filteredTemplates,
        totalCount: filteredTemplates.length,
        searchTime,
      });
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SEARCH_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets templates by category with optional sorting
   */
  async getTemplatesByCategory(
    category: TemplateCategory,
    sortBy: 'name' | 'usageCount' | 'createdAt' | 'updatedAt' = 'name',
  ): Promise<Result<PromptTemplate[], TemplateLibraryError>> {
    try {
      const templateIds = this.searchIndex.byCategory[category] || [];
      const templates = templateIds.map((id) => this.templates.get(id)!).filter((template) => template !== undefined);

      // Sort templates
      templates.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'usageCount':
            return b.usageCount - a.usageCount;
          case 'createdAt':
            return b.createdAt.getTime() - a.createdAt.getTime();
          case 'updatedAt':
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          default:
            return 0;
        }
      });

      return success(templates);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get templates by category: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CATEGORY_RETRIEVAL_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets templates for a specific identity type
   */
  async getTemplatesForIdentity(identity: UserIdentityType): Promise<Result<PromptTemplate[], TemplateLibraryError>> {
    try {
      const templateIds = this.searchIndex.byIdentity[identity] || [];
      const templates = templateIds.map((id) => this.templates.get(id)!).filter((template) => template !== undefined);

      return success(templates);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get templates for identity: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'IDENTITY_RETRIEVAL_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets library statistics
   */
  async getLibraryStats(): Promise<Result<TemplateLibraryStats, TemplateLibraryError>> {
    try {
      const templates = Array.from(this.templates.values());

      const stats: TemplateLibraryStats = {
        totalTemplates: templates.length,
        publicTemplates: templates.filter((t) => t.isPublic).length,
        privateTemplates: templates.filter((t) => !t.isPublic).length,
        categoryCounts: {} as Record<TemplateCategory, number>,
        identityCounts: {} as Record<UserIdentityType, number>,
        averageUsageCount:
          templates.length > 0 ? templates.reduce((sum, t) => sum + t.usageCount, 0) / templates.length : 0,
        mostUsedTemplate:
          templates.length > 0 ? templates.reduce((max, t) => (t.usageCount > max.usageCount ? t : max)) : null,
      };

      // Calculate category counts
      const categories: TemplateCategory[] = [
        'general',
        'technical',
        'architecture',
        'refactoring',
        'quality',
        'security',
        'documentation',
        'devops',
        'management',
        'performance',
      ];
      categories.forEach((category) => {
        stats.categoryCounts[category] = templates.filter((t) => t.category === category).length;
      });

      // Calculate identity counts
      const identities: UserIdentityType[] = ['User', 'Superviseur', 'Responsable'];
      identities.forEach((identity) => {
        stats.identityCounts[identity] = templates.filter((t) => t.identities.includes(identity)).length;
      });

      return success(stats);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get library stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'STATS_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets usage metrics for a template
   */
  async getTemplateMetrics(templateId: string): Promise<Result<TemplateUsageMetrics, TemplateLibraryError>> {
    try {
      const metrics = this.usageMetrics.get(templateId);
      if (!metrics) {
        return failure(
          new TemplateLibraryError(`Metrics for template '${templateId}' not found`, 'METRICS_NOT_FOUND', {
            templateId,
          }),
        );
      }

      return success({ ...metrics });
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get template metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'METRICS_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Updates usage metrics for a template
   */
  async updateTemplateMetrics(
    templateId: string,
    updates: Partial<TemplateUsageMetrics>,
  ): Promise<Result<void, TemplateLibraryError>> {
    try {
      const existingMetrics = this.usageMetrics.get(templateId);
      if (!existingMetrics) {
        return failure(
          new TemplateLibraryError(`Metrics for template '${templateId}' not found`, 'METRICS_NOT_FOUND', {
            templateId,
          }),
        );
      }

      const updatedMetrics: TemplateUsageMetrics = {
        ...existingMetrics,
        ...updates,
        templateId, // Ensure ID cannot be changed
      };

      this.usageMetrics.set(templateId, updatedMetrics);

      return success(undefined);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to update template metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'METRICS_UPDATE_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Rebuilds the search index from all stored templates
   */
  async rebuildSearchIndex(): Promise<Result<void, TemplateLibraryError>> {
    try {
      this.initializeSearchIndex();

      for (const template of this.templates.values()) {
        this.addToSearchIndex(template);
      }

      return success(undefined);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to rebuild search index: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INDEX_REBUILD_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets all templates (with optional filtering)
   */
  async getAllTemplates(includePrivate = false): Promise<Result<PromptTemplate[], TemplateLibraryError>> {
    try {
      const templates = Array.from(this.templates.values());
      const filteredTemplates = includePrivate ? templates : templates.filter((t) => t.isPublic);

      return success(filteredTemplates);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get all templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'GET_ALL_ERROR',
          error,
        ),
      );
    }
  }

  // Template Sharing and Lifecycle Management Methods

  private shareInfo = new Map<string, TemplateShareInfo>();
  private lifecycleStatus = new Map<string, TemplateLifecycleStatus>();
  private versionInfo = new Map<string, TemplateVersionInfo[]>();

  /**
   * Shares a template with specified users and permissions
   */
  async shareTemplate(
    templateId: string,
    sharedBy: string,
    sharedWith: string[],
    permissions: TemplatePermission[],
    expiresAt?: Date,
  ): Promise<Result<void, TemplateLibraryError>> {
    try {
      // Verify template exists
      const template = this.templates.get(templateId);
      if (!template) {
        return failure(
          new TemplateLibraryError(`Template with ID '${templateId}' not found`, 'TEMPLATE_NOT_FOUND', { templateId }),
        );
      }

      // Verify sharer has permission to share
      if (template.author !== sharedBy && !template.isPublic) {
        return failure(
          new TemplateLibraryError(
            `User '${sharedBy}' does not have permission to share template '${templateId}'`,
            'INSUFFICIENT_PERMISSIONS',
            { templateId, sharedBy },
          ),
        );
      }

      // Create or update share info
      const shareInfo: TemplateShareInfo = {
        templateId,
        sharedBy,
        sharedWith: [...new Set(sharedWith)], // Remove duplicates
        sharedAt: new Date(),
        permissions: [...new Set(permissions)], // Remove duplicates
        expiresAt,
      };

      this.shareInfo.set(templateId, shareInfo);

      return success(undefined);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to share template: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SHARE_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets sharing information for a template
   */
  async getTemplateShareInfo(templateId: string): Promise<Result<TemplateShareInfo | null, TemplateLibraryError>> {
    try {
      const shareInfo = this.shareInfo.get(templateId);

      // Check if sharing has expired
      if (shareInfo && shareInfo.expiresAt && shareInfo.expiresAt < new Date()) {
        this.shareInfo.delete(templateId);
        return success(null);
      }

      return success(shareInfo ? { ...shareInfo } : null);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get share info: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'SHARE_INFO_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Revokes sharing for a template
   */
  async revokeTemplateSharing(templateId: string, revokedBy: string): Promise<Result<void, TemplateLibraryError>> {
    try {
      const shareInfo = this.shareInfo.get(templateId);
      if (!shareInfo) {
        return failure(
          new TemplateLibraryError(
            `No sharing information found for template '${templateId}'`,
            'SHARE_INFO_NOT_FOUND',
            { templateId },
          ),
        );
      }

      // Verify revocation permissions
      if (shareInfo.sharedBy !== revokedBy) {
        const template = this.templates.get(templateId);
        if (!template || template.author !== revokedBy) {
          return failure(
            new TemplateLibraryError(
              `User '${revokedBy}' does not have permission to revoke sharing for template '${templateId}'`,
              'INSUFFICIENT_PERMISSIONS',
              { templateId, revokedBy },
            ),
          );
        }
      }

      this.shareInfo.delete(templateId);
      return success(undefined);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to revoke sharing: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'REVOKE_SHARING_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets templates shared with a specific user
   */
  async getSharedTemplates(userId: string): Promise<Result<PromptTemplate[], TemplateLibraryError>> {
    try {
      const sharedTemplateIds = Array.from(this.shareInfo.entries())
        .filter(([, shareInfo]) => {
          // Check if not expired
          if (shareInfo.expiresAt && shareInfo.expiresAt < new Date()) {
            return false;
          }
          return shareInfo.sharedWith.includes(userId);
        })
        .map(([templateId]) => templateId);

      const sharedTemplates = sharedTemplateIds
        .map((id) => this.templates.get(id)!)
        .filter((template) => template !== undefined);

      return success(sharedTemplates);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get shared templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'GET_SHARED_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Sets lifecycle status for a template
   */
  async setTemplateLifecycleStatus(
    templateId: string,
    status: TemplateLifecycleStatus,
  ): Promise<Result<void, TemplateLibraryError>> {
    try {
      // Verify template exists
      if (!this.templates.has(templateId)) {
        return failure(
          new TemplateLibraryError(`Template with ID '${templateId}' not found`, 'TEMPLATE_NOT_FOUND', { templateId }),
        );
      }

      this.lifecycleStatus.set(templateId, { ...status, templateId });
      return success(undefined);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to set lifecycle status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LIFECYCLE_STATUS_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets lifecycle status for a template
   */
  async getTemplateLifecycleStatus(
    templateId: string,
  ): Promise<Result<TemplateLifecycleStatus | null, TemplateLibraryError>> {
    try {
      const status = this.lifecycleStatus.get(templateId);
      return success(status ? { ...status } : null);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get lifecycle status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'GET_LIFECYCLE_STATUS_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Checks for template obsolescence and suggests actions
   */
  async checkTemplateObsolescence(
    templateId: string,
  ): Promise<Result<TemplateObsolescenceCheck, TemplateLibraryError>> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return failure(
          new TemplateLibraryError(`Template with ID '${templateId}' not found`, 'TEMPLATE_NOT_FOUND', { templateId }),
        );
      }

      const metrics = this.usageMetrics.get(templateId);
      const reasons: ObsolescenceReason[] = [];
      const suggestedActions: TemplateAction[] = [];

      // Check for low usage
      if (metrics && metrics.totalUses < 5) {
        reasons.push({
          type: 'low_usage',
          description: `Template has only been used ${metrics.totalUses} times`,
          severity: 'medium',
          detectedAt: new Date(),
        });

        suggestedActions.push({
          type: 'archive',
          description: 'Consider archiving this template due to low usage',
          priority: 'low',
          estimatedEffort: '5 minutes',
          suggestedBy: 'system',
        });
      }

      // Check for old templates (older than 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (template.updatedAt < oneYearAgo) {
        reasons.push({
          type: 'outdated_syntax',
          description: 'Template has not been updated in over a year',
          severity: 'low',
          detectedAt: new Date(),
        });

        suggestedActions.push({
          type: 'update',
          description: 'Review and update template to ensure it follows current best practices',
          priority: 'medium',
          estimatedEffort: '30 minutes',
          suggestedBy: 'system',
        });
      }

      // Check for poor success rate
      if (metrics && metrics.successRate < 0.7) {
        reasons.push({
          type: 'performance_issue',
          description: `Template has a low success rate of ${(metrics.successRate * 100).toFixed(1)}%`,
          severity: 'high',
          detectedAt: new Date(),
        });

        suggestedActions.push({
          type: 'update',
          description: 'Improve template to increase success rate',
          priority: 'high',
          estimatedEffort: '1-2 hours',
          suggestedBy: 'system',
        });
      }

      const isObsolete =
        reasons.some((r) => r.severity === 'high') || reasons.filter((r) => r.severity === 'medium').length >= 2;

      const confidence =
        reasons.length > 0
          ? Math.min(0.9, reasons.length * 0.3 + reasons.filter((r) => r.severity === 'high').length * 0.4)
          : 0;

      return success({
        templateId,
        isObsolete,
        reasons,
        suggestedActions,
        confidence,
      });
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to check obsolescence: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'OBSOLESCENCE_CHECK_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets templates that need review based on lifecycle status
   */
  async getTemplatesNeedingReview(): Promise<Result<TemplateLifecycleStatus[], TemplateLibraryError>> {
    try {
      const now = new Date();
      const needingReview = Array.from(this.lifecycleStatus.values()).filter((status) => status.nextReviewDate <= now);

      return success(needingReview);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get templates needing review: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'GET_REVIEW_TEMPLATES_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Creates a new version of a template
   */
  async createTemplateVersion(
    templateId: string,
    newVersion: string,
    changeLog: string[],
    createdBy: string,
    isStable = false,
  ): Promise<Result<void, TemplateLibraryError>> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return failure(
          new TemplateLibraryError(`Template with ID '${templateId}' not found`, 'TEMPLATE_NOT_FOUND', { templateId }),
        );
      }

      const existingVersions = this.versionInfo.get(templateId) || [];

      // Check if version already exists
      if (existingVersions.some((v) => v.version === newVersion)) {
        return failure(
          new TemplateLibraryError(
            `Version '${newVersion}' already exists for template '${templateId}'`,
            'VERSION_ALREADY_EXISTS',
            { templateId, version: newVersion },
          ),
        );
      }

      const versionInfo: TemplateVersionInfo = {
        templateId,
        version: newVersion,
        previousVersion: template.version,
        changeLog: [...changeLog],
        createdAt: new Date(),
        createdBy,
        isStable,
      };

      existingVersions.push(versionInfo);
      this.versionInfo.set(templateId, existingVersions);

      // Update template version
      const updatedTemplate = { ...template, version: newVersion, updatedAt: new Date() };
      this.templates.set(templateId, updatedTemplate);

      return success(undefined);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to create template version: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CREATE_VERSION_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Gets version history for a template
   */
  async getTemplateVersionHistory(templateId: string): Promise<Result<TemplateVersionInfo[], TemplateLibraryError>> {
    try {
      const versions = this.versionInfo.get(templateId) || [];
      return success([...versions]);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to get version history: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'GET_VERSION_HISTORY_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Tracks template usage for metrics and lifecycle management
   */
  async trackTemplateUsage(
    templateId: string,
    isSuccessful: boolean,
    rating?: number,
    usedVariables?: Record<string, unknown>,
  ): Promise<Result<void, TemplateLibraryError>> {
    try {
      // Verify template exists
      const template = this.templates.get(templateId);
      if (!template) {
        return failure(
          new TemplateLibraryError(`Template with ID '${templateId}' not found`, 'TEMPLATE_NOT_FOUND', { templateId }),
        );
      }

      let metrics = this.usageMetrics.get(templateId);

      if (!metrics) {
        // Initialize metrics if they don't exist
        metrics = {
          templateId,
          totalUses: 0,
          successRate: 1.0,
          averageRating: 0,
          lastUsed: new Date(),
          popularVariables: {},
        };
      }

      // Update usage statistics
      const previousTotalUses = metrics.totalUses;
      const previousSuccessCount = Math.round(previousTotalUses * metrics.successRate);

      metrics.totalUses += 1;
      metrics.lastUsed = new Date();

      // Update success rate
      const newSuccessCount = isSuccessful ? previousSuccessCount + 1 : previousSuccessCount;
      metrics.successRate = newSuccessCount / metrics.totalUses;

      // Update rating
      if (rating !== undefined && rating >= 0 && rating <= 5) {
        const previousRatingSum = metrics.averageRating * previousTotalUses;
        metrics.averageRating = (previousRatingSum + rating) / metrics.totalUses;
      }

      // Track popular variables
      if (usedVariables) {
        Object.keys(usedVariables).forEach((varName) => {
          metrics!.popularVariables[varName] = (metrics!.popularVariables[varName] || 0) + 1;
        });
      }

      this.usageMetrics.set(templateId, metrics);

      // Also update template usage count
      template.usageCount = metrics.totalUses;
      this.templates.set(templateId, template);

      return success(void 0);
    } catch (error) {
      return failure(
        new TemplateLibraryError(
          `Failed to track template usage: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'TRACK_USAGE_ERROR',
          error,
        ),
      );
    }
  }

  // Private helper methods

  private initializeSearchIndex(): void {
    const categories: TemplateCategory[] = [
      'general',
      'technical',
      'architecture',
      'refactoring',
      'quality',
      'security',
      'documentation',
      'devops',
      'management',
      'performance',
    ];
    const identities: UserIdentityType[] = ['User', 'Superviseur', 'Responsable'];

    this.searchIndex = {
      byCategory: {} as Record<TemplateCategory, string[]>,
      byIdentity: {} as Record<UserIdentityType, string[]>,
      byKeyword: {},
    };

    categories.forEach((category) => {
      this.searchIndex.byCategory[category] = [];
    });

    identities.forEach((identity) => {
      this.searchIndex.byIdentity[identity] = [];
    });
  }

  private addToSearchIndex(template: PromptTemplate): void {
    // Add to category index
    if (!this.searchIndex.byCategory[template.category]) {
      this.searchIndex.byCategory[template.category] = [];
    }
    if (!this.searchIndex.byCategory[template.category].includes(template.id)) {
      this.searchIndex.byCategory[template.category].push(template.id);
    }

    // Add to identity index
    template.identities.forEach((identity) => {
      if (!this.searchIndex.byIdentity[identity]) {
        this.searchIndex.byIdentity[identity] = [];
      }
      if (!this.searchIndex.byIdentity[identity].includes(template.id)) {
        this.searchIndex.byIdentity[identity].push(template.id);
      }
    });

    // Add to keyword index
    const keywords = this.extractKeywords(template);
    keywords.forEach((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      if (!this.searchIndex.byKeyword[lowerKeyword]) {
        this.searchIndex.byKeyword[lowerKeyword] = [];
      }
      if (!this.searchIndex.byKeyword[lowerKeyword].includes(template.id)) {
        this.searchIndex.byKeyword[lowerKeyword].push(template.id);
      }
    });
  }

  private removeFromSearchIndex(template: PromptTemplate): void {
    // Remove from category index
    const categoryTemplates = this.searchIndex.byCategory[template.category];
    if (categoryTemplates) {
      const index = categoryTemplates.indexOf(template.id);
      if (index > -1) {
        categoryTemplates.splice(index, 1);
      }
    }

    // Remove from identity index
    template.identities.forEach((identity) => {
      const identityTemplates = this.searchIndex.byIdentity[identity];
      if (identityTemplates) {
        const index = identityTemplates.indexOf(template.id);
        if (index > -1) {
          identityTemplates.splice(index, 1);
        }
      }
    });

    // Remove from keyword index
    const keywords = this.extractKeywords(template);
    keywords.forEach((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      const keywordTemplates = this.searchIndex.byKeyword[lowerKeyword];
      if (keywordTemplates) {
        const index = keywordTemplates.indexOf(template.id);
        if (index > -1) {
          keywordTemplates.splice(index, 1);
        }
      }
    });
  }

  private extractKeywords(template: PromptTemplate): string[] {
    const keywords = new Set<string>();

    // Extract from name
    template.name.split(/\s+/).forEach((word) => {
      if (word.length > 2) {
        keywords.add(word);
      }
    });

    // Extract from description
    template.description.split(/\s+/).forEach((word) => {
      if (word.length > 2) {
        keywords.add(word);
      }
    });

    // Add category as keyword
    keywords.add(template.category);

    // Add identities as keywords
    template.identities.forEach((identity) => {
      keywords.add(identity);
    });

    // Add author as keyword
    keywords.add(template.author);

    return Array.from(keywords);
  }
}
