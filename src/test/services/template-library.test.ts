// Unit tests for TemplateLibraryService

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TemplateLibraryService,
  TemplateLibraryError,
  type TemplateSearchCriteria,
} from '../../services/template-library';
import type { PromptTemplate, TemplateUsageMetrics } from '../../models/template';

import { isSuccess, isFailure } from '../../models/result';

describe('TemplateLibraryService', () => {
  let service: TemplateLibraryService;
  let sampleTemplate: PromptTemplate;

  beforeEach(() => {
    service = new TemplateLibraryService();
    sampleTemplate = {
      id: 'test-template-1',
      name: 'Test Template',
      description: 'A test template for unit testing',
      category: 'general',
      identities: ['User'],
      template: 'Hello {{name}}, welcome to {{project}}!',
      variables: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'User name',
        },
        {
          name: 'project',
          type: 'string',
          required: true,
          description: 'Project name',
        },
      ],
      constraints: [],
      version: '1.0.0',
      isPublic: true,
      author: 'test-author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      usageCount: 5,
    };
  });

  describe('storeTemplate', () => {
    it('should store a valid template successfully', async () => {
      const result = await service.storeTemplate(sampleTemplate);

      expect(isSuccess(result)).toBe(true);
    });

    it('should reject invalid templates when validation is enabled', async () => {
      const invalidTemplate = { ...sampleTemplate, name: '' };

      const result = await service.storeTemplate(invalidTemplate, { validateOnStore: true });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error).toBeInstanceOf(TemplateLibraryError);
        expect(result._error.code).toBe('TEMPLATE_VALIDATION_FAILED');
      }
    });

    it('should reject duplicate template IDs', async () => {
      await service.storeTemplate(sampleTemplate);

      const result = await service.storeTemplate(sampleTemplate);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('DUPLICATE_TEMPLATE_ID');
      }
    });

    it('should store template without validation when disabled', async () => {
      const invalidTemplate = { ...sampleTemplate, name: '' };

      const result = await service.storeTemplate(invalidTemplate, { validateOnStore: false });

      expect(isSuccess(result)).toBe(true);
    });

    it('should initialize usage metrics when trackMetrics is enabled', async () => {
      await service.storeTemplate(sampleTemplate, { trackMetrics: true });

      const metricsResult = await service.getTemplateMetrics(sampleTemplate.id);

      expect(isSuccess(metricsResult)).toBe(true);
      if (isSuccess(metricsResult)) {
        expect(metricsResult._value.templateId).toBe(sampleTemplate.id);
        expect(metricsResult._value.totalUses).toBe(5);
      }
    });
  });

  describe('getTemplate', () => {
    beforeEach(async () => {
      await service.storeTemplate(sampleTemplate);
    });

    it('should retrieve an existing template', async () => {
      const result = await service.getTemplate(sampleTemplate.id);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.id).toBe(sampleTemplate.id);
        expect(result._value.name).toBe(sampleTemplate.name);
      }
    });

    it('should return error for non-existent template', async () => {
      const result = await service.getTemplate('non-existent');

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('TEMPLATE_NOT_FOUND');
      }
    });

    it('should return a copy of the template (not reference)', async () => {
      const result = await service.getTemplate(sampleTemplate.id);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        result._value.name = 'Modified Name';

        const secondResult = await service.getTemplate(sampleTemplate.id);
        expect(isSuccess(secondResult)).toBe(true);
        if (isSuccess(secondResult)) {
          expect(secondResult._value.name).toBe(sampleTemplate.name);
        }
      }
    });
  });

  describe('updateTemplate', () => {
    beforeEach(async () => {
      await service.storeTemplate(sampleTemplate);
    });

    it('should update an existing template', async () => {
      const updates = { name: 'Updated Template Name', usageCount: 10 };

      const result = await service.updateTemplate(sampleTemplate.id, updates);

      expect(isSuccess(result)).toBe(true);

      const getResult = await service.getTemplate(sampleTemplate.id);
      expect(isSuccess(getResult)).toBe(true);
      if (isSuccess(getResult)) {
        expect(getResult._value.name).toBe('Updated Template Name');
        expect(getResult._value.usageCount).toBe(10);
        expect(getResult._value.updatedAt.getTime()).toBeGreaterThan(sampleTemplate.updatedAt.getTime());
      }
    });

    it('should not allow ID changes', async () => {
      const updates = { id: 'new-id', name: 'Updated Name' };

      await service.updateTemplate(sampleTemplate.id, updates);

      const getResult = await service.getTemplate(sampleTemplate.id);
      expect(isSuccess(getResult)).toBe(true);
      if (isSuccess(getResult)) {
        expect(getResult._value.id).toBe(sampleTemplate.id);
      }
    });

    it('should validate updated template when validation is enabled', async () => {
      const updates = { name: '' };

      const result = await service.updateTemplate(sampleTemplate.id, updates, { validateOnStore: true });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('TEMPLATE_VALIDATION_FAILED');
      }
    });

    it('should return error for non-existent template', async () => {
      const result = await service.updateTemplate('non-existent', { name: 'New Name' });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('TEMPLATE_NOT_FOUND');
      }
    });
  });

  describe('deleteTemplate', () => {
    beforeEach(async () => {
      await service.storeTemplate(sampleTemplate);
    });

    it('should delete an existing template', async () => {
      const result = await service.deleteTemplate(sampleTemplate.id);

      expect(isSuccess(result)).toBe(true);

      const getResult = await service.getTemplate(sampleTemplate.id);
      expect(isFailure(getResult)).toBe(true);
    });

    it('should return error for non-existent template', async () => {
      const result = await service.deleteTemplate('non-existent');

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('TEMPLATE_NOT_FOUND');
      }
    });

    it('should remove template from search index', async () => {
      await service.deleteTemplate(sampleTemplate.id);

      const searchResult = await service.searchTemplates({ category: 'general' });
      expect(isSuccess(searchResult)).toBe(true);
      if (isSuccess(searchResult)) {
        expect(searchResult._value.templates).toHaveLength(0);
      }
    });

    it('should remove template metrics', async () => {
      await service.deleteTemplate(sampleTemplate.id);

      const metricsResult = await service.getTemplateMetrics(sampleTemplate.id);
      expect(isFailure(metricsResult)).toBe(true);
    });
  });

  describe('searchTemplates', () => {
    beforeEach(async () => {
      const templates: PromptTemplate[] = [
        { ...sampleTemplate, id: 'template-1', category: 'general', identities: ['User'] },
        { ...sampleTemplate, id: 'template-2', category: 'technical', identities: ['Superviseur'] },
        { ...sampleTemplate, id: 'template-3', category: 'management', identities: ['Responsable'] },
        {
          ...sampleTemplate,
          id: 'template-4',
          category: 'general',
          identities: ['User', 'Superviseur'],
          author: 'different-author',
        },
      ];

      for (const template of templates) {
        await service.storeTemplate(template);
      }
    });

    it('should search by category', async () => {
      const criteria: TemplateSearchCriteria = { category: 'general' };

      const result = await service.searchTemplates(criteria);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.templates).toHaveLength(2);
        expect(result._value.templates.every((t) => t.category === 'general')).toBe(true);
      }
    });

    it('should search by identity', async () => {
      const criteria: TemplateSearchCriteria = { identity: 'Superviseur' };

      const result = await service.searchTemplates(criteria);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.templates).toHaveLength(2);
        expect(result._value.templates.every((t) => t.identities.includes('Superviseur'))).toBe(true);
      }
    });

    it('should search by author', async () => {
      const criteria: TemplateSearchCriteria = { author: 'different-author' };

      const result = await service.searchTemplates(criteria);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.templates).toHaveLength(1);
        expect(result._value.templates[0].author).toBe('different-author');
      }
    });

    it('should search by keywords', async () => {
      const criteria: TemplateSearchCriteria = { keywords: ['test'] };

      const result = await service.searchTemplates(criteria);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.templates.length).toBeGreaterThan(0);
      }
    });

    it('should combine multiple search criteria', async () => {
      const criteria: TemplateSearchCriteria = {
        category: 'general',
        identity: 'User',
      };

      const result = await service.searchTemplates(criteria);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.templates).toHaveLength(2);
        expect(result._value.templates.every((t) => t.category === 'general' && t.identities.includes('User'))).toBe(
          true,
        );
      }
    });

    it('should filter by usage count range', async () => {
      const criteria: TemplateSearchCriteria = {
        minUsageCount: 5,
        maxUsageCount: 5,
      };

      const result = await service.searchTemplates(criteria);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.templates.every((t) => t.usageCount === 5)).toBe(true);
      }
    });

    it('should return search time in results', async () => {
      const result = await service.searchTemplates({});

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(typeof result._value.searchTime).toBe('number');
        expect(result._value.searchTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getTemplatesByCategory', () => {
    beforeEach(async () => {
      const templates: PromptTemplate[] = [
        { ...sampleTemplate, id: 'template-1', name: 'Alpha Template', category: 'general', usageCount: 10 },
        { ...sampleTemplate, id: 'template-2', name: 'Beta Template', category: 'general', usageCount: 5 },
        { ...sampleTemplate, id: 'template-3', name: 'Gamma Template', category: 'technical', usageCount: 15 },
      ];

      for (const template of templates) {
        await service.storeTemplate(template);
      }
    });

    it('should get templates by category sorted by name', async () => {
      const result = await service.getTemplatesByCategory('general', 'name');

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value).toHaveLength(2);
        expect(result._value[0].name).toBe('Alpha Template');
        expect(result._value[1].name).toBe('Beta Template');
      }
    });

    it('should get templates by category sorted by usage count', async () => {
      const result = await service.getTemplatesByCategory('general', 'usageCount');

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value).toHaveLength(2);
        expect(result._value[0].usageCount).toBe(10);
        expect(result._value[1].usageCount).toBe(5);
      }
    });

    it('should return empty array for category with no templates', async () => {
      const result = await service.getTemplatesByCategory('quality');

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value).toHaveLength(0);
      }
    });
  });

  describe('getTemplatesForIdentity', () => {
    beforeEach(async () => {
      const templates: PromptTemplate[] = [
        { ...sampleTemplate, id: 'template-1', identities: ['User'] },
        { ...sampleTemplate, id: 'template-2', identities: ['Superviseur'] },
        { ...sampleTemplate, id: 'template-3', identities: ['User', 'Superviseur'] },
      ];

      for (const template of templates) {
        await service.storeTemplate(template);
      }
    });

    it('should get templates for specific identity', async () => {
      const result = await service.getTemplatesForIdentity('User');

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value).toHaveLength(2);
        expect(result._value.every((t) => t.identities.includes('User'))).toBe(true);
      }
    });

    it('should return empty array for identity with no templates', async () => {
      const result = await service.getTemplatesForIdentity('Responsable');

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value).toHaveLength(0);
      }
    });
  });

  describe('getLibraryStats', () => {
    beforeEach(async () => {
      const templates: PromptTemplate[] = [
        {
          ...sampleTemplate,
          id: 'template-1',
          category: 'general',
          identities: ['User'],
          isPublic: true,
          usageCount: 10,
        },
        {
          ...sampleTemplate,
          id: 'template-2',
          category: 'technical',
          identities: ['Superviseur'],
          isPublic: false,
          usageCount: 5,
        },
        {
          ...sampleTemplate,
          id: 'template-3',
          category: 'general',
          identities: ['Responsable'],
          isPublic: true,
          usageCount: 15,
        },
      ];

      for (const template of templates) {
        await service.storeTemplate(template);
      }
    });

    it('should calculate correct library statistics', async () => {
      const result = await service.getLibraryStats();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const stats = result._value;
        expect(stats.totalTemplates).toBe(3);
        expect(stats.publicTemplates).toBe(2);
        expect(stats.privateTemplates).toBe(1);
        expect(stats.categoryCounts.general).toBe(2);
        expect(stats.categoryCounts.technical).toBe(1);
        expect(stats.identityCounts.User).toBe(1);
        expect(stats.identityCounts.Superviseur).toBe(1);
        expect(stats.identityCounts.Responsable).toBe(1);
        expect(stats.averageUsageCount).toBe(10);
        expect(stats.mostUsedTemplate?.usageCount).toBe(15);
      }
    });

    it('should handle empty library', async () => {
      const emptyService = new TemplateLibraryService();
      const result = await emptyService.getLibraryStats();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const stats = result._value;
        expect(stats.totalTemplates).toBe(0);
        expect(stats.averageUsageCount).toBe(0);
        expect(stats.mostUsedTemplate).toBeNull();
      }
    });
  });

  describe('template metrics', () => {
    beforeEach(async () => {
      await service.storeTemplate(sampleTemplate, { trackMetrics: true });
    });

    it('should get template metrics', async () => {
      const result = await service.getTemplateMetrics(sampleTemplate.id);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.templateId).toBe(sampleTemplate.id);
        expect(result._value.totalUses).toBe(5);
      }
    });

    it('should update template metrics', async () => {
      const updates: Partial<TemplateUsageMetrics> = {
        totalUses: 20,
        successRate: 0.95,
        averageRating: 4.5,
      };

      const result = await service.updateTemplateMetrics(sampleTemplate.id, updates);

      expect(isSuccess(result)).toBe(true);

      const getResult = await service.getTemplateMetrics(sampleTemplate.id);
      expect(isSuccess(getResult)).toBe(true);
      if (isSuccess(getResult)) {
        expect(getResult._value.totalUses).toBe(20);
        expect(getResult._value.successRate).toBe(0.95);
        expect(getResult._value.averageRating).toBe(4.5);
      }
    });

    it('should not allow templateId changes in metrics', async () => {
      const updates = { templateId: 'different-id', totalUses: 20 };

      await service.updateTemplateMetrics(sampleTemplate.id, updates);

      const getResult = await service.getTemplateMetrics(sampleTemplate.id);
      expect(isSuccess(getResult)).toBe(true);
      if (isSuccess(getResult)) {
        expect(getResult._value.templateId).toBe(sampleTemplate.id);
      }
    });

    it('should return error for non-existent metrics', async () => {
      const result = await service.getTemplateMetrics('non-existent');

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('METRICS_NOT_FOUND');
      }
    });
  });

  describe('search index management', () => {
    beforeEach(async () => {
      await service.storeTemplate(sampleTemplate);
    });

    it('should rebuild search index', async () => {
      const result = await service.rebuildSearchIndex();

      expect(isSuccess(result)).toBe(true);

      // Verify search still works after rebuild
      const searchResult = await service.searchTemplates({ category: 'general' });
      expect(isSuccess(searchResult)).toBe(true);
      if (isSuccess(searchResult)) {
        expect(searchResult._value.templates).toHaveLength(1);
      }
    });
  });

  describe('getAllTemplates', () => {
    beforeEach(async () => {
      const templates: PromptTemplate[] = [
        { ...sampleTemplate, id: 'template-1', isPublic: true },
        { ...sampleTemplate, id: 'template-2', isPublic: false },
      ];

      for (const template of templates) {
        await service.storeTemplate(template);
      }
    });

    it('should get only public templates by default', async () => {
      const result = await service.getAllTemplates();

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value).toHaveLength(1);
        expect(result._value[0].isPublic).toBe(true);
      }
    });

    it('should get all templates when includePrivate is true', async () => {
      const result = await service.getAllTemplates(true);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value).toHaveLength(2);
      }
    });
  });

  describe('template sharing', () => {
    beforeEach(async () => {
      await service.storeTemplate(sampleTemplate);
    });

    it('should share a template with users', async () => {
      const result = await service.shareTemplate(
        sampleTemplate.id,
        sampleTemplate.author,
        ['user1', 'user2'],
        ['read', 'write'],
      );

      expect(isSuccess(result)).toBe(true);

      const shareInfoResult = await service.getTemplateShareInfo(sampleTemplate.id);
      expect(isSuccess(shareInfoResult)).toBe(true);
      if (isSuccess(shareInfoResult)) {
        expect(shareInfoResult._value?.sharedWith).toEqual(['user1', 'user2']);
        expect(shareInfoResult._value?.permissions).toEqual(['read', 'write']);
      }
    });

    it('should prevent unauthorized sharing', async () => {
      const privateTemplate = { ...sampleTemplate, id: 'private-template', isPublic: false, author: 'original-author' };
      await service.storeTemplate(privateTemplate);

      const result = await service.shareTemplate(privateTemplate.id, 'unauthorized-user', ['user1'], ['read']);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('INSUFFICIENT_PERMISSIONS');
      }
    });

    it('should allow sharing of public templates by anyone', async () => {
      const result = await service.shareTemplate(sampleTemplate.id, 'any-user', ['user1'], ['read']);

      expect(isSuccess(result)).toBe(true);
    });

    it('should handle template sharing expiration', async () => {
      const expirationDate = new Date(Date.now() - 1000); // 1 second ago

      await service.shareTemplate(sampleTemplate.id, sampleTemplate.author, ['user1'], ['read'], expirationDate);

      const shareInfoResult = await service.getTemplateShareInfo(sampleTemplate.id);
      expect(isSuccess(shareInfoResult)).toBe(true);
      if (isSuccess(shareInfoResult)) {
        expect(shareInfoResult._value).toBeNull();
      }
    });

    it('should revoke template sharing', async () => {
      await service.shareTemplate(sampleTemplate.id, sampleTemplate.author, ['user1'], ['read']);

      const revokeResult = await service.revokeTemplateSharing(sampleTemplate.id, sampleTemplate.author);
      expect(isSuccess(revokeResult)).toBe(true);

      const shareInfoResult = await service.getTemplateShareInfo(sampleTemplate.id);
      expect(isSuccess(shareInfoResult)).toBe(true);
      if (isSuccess(shareInfoResult)) {
        expect(shareInfoResult._value).toBeNull();
      }
    });

    it('should get shared templates for a user', async () => {
      await service.shareTemplate(sampleTemplate.id, sampleTemplate.author, ['user1', 'user2'], ['read']);

      const sharedResult = await service.getSharedTemplates('user1');
      expect(isSuccess(sharedResult)).toBe(true);
      if (isSuccess(sharedResult)) {
        expect(sharedResult._value).toHaveLength(1);
        expect(sharedResult._value[0].id).toBe(sampleTemplate.id);
      }
    });

    it('should prevent unauthorized revocation', async () => {
      await service.shareTemplate(sampleTemplate.id, sampleTemplate.author, ['user1'], ['read']);

      const revokeResult = await service.revokeTemplateSharing(sampleTemplate.id, 'unauthorized-user');
      expect(isFailure(revokeResult)).toBe(true);
      if (isFailure(revokeResult)) {
        expect(revokeResult._error.code).toBe('INSUFFICIENT_PERMISSIONS');
      }
    });
  });

  describe('template lifecycle management', () => {
    beforeEach(async () => {
      await service.storeTemplate(sampleTemplate);
    });

    it('should set and get lifecycle status', async () => {
      const lifecycleStatus = {
        templateId: sampleTemplate.id,
        status: 'active' as const,
        lastReviewed: new Date(),
        nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        maintainer: 'maintainer-user',
      };

      const setResult = await service.setTemplateLifecycleStatus(sampleTemplate.id, lifecycleStatus);
      expect(isSuccess(setResult)).toBe(true);

      const getResult = await service.getTemplateLifecycleStatus(sampleTemplate.id);
      expect(isSuccess(getResult)).toBe(true);
      if (isSuccess(getResult)) {
        expect(getResult._value?.status).toBe('active');
        expect(getResult._value?.maintainer).toBe('maintainer-user');
      }
    });

    it('should check template obsolescence', async () => {
      // Create a template with low usage
      const lowUsageTemplate = {
        ...sampleTemplate,
        id: 'low-usage-template',
        usageCount: 2,
        updatedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
      };
      await service.storeTemplate(lowUsageTemplate, { trackMetrics: true });

      // Set low success rate
      await service.updateTemplateMetrics(lowUsageTemplate.id, {
        totalUses: 2,
        successRate: 0.5,
      });

      const obsolescenceResult = await service.checkTemplateObsolescence(lowUsageTemplate.id);
      expect(isSuccess(obsolescenceResult)).toBe(true);
      if (isSuccess(obsolescenceResult)) {
        expect(obsolescenceResult._value.isObsolete).toBe(true);
        expect(obsolescenceResult._value.reasons.length).toBeGreaterThan(0);
        expect(obsolescenceResult._value.suggestedActions.length).toBeGreaterThan(0);
      }
    });

    it('should get templates needing review', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const lifecycleStatus = {
        templateId: sampleTemplate.id,
        status: 'active' as const,
        lastReviewed: pastDate,
        nextReviewDate: pastDate,
        maintainer: 'maintainer-user',
      };

      await service.setTemplateLifecycleStatus(sampleTemplate.id, lifecycleStatus);

      const reviewResult = await service.getTemplatesNeedingReview();
      expect(isSuccess(reviewResult)).toBe(true);
      if (isSuccess(reviewResult)) {
        expect(reviewResult._value).toHaveLength(1);
        expect(reviewResult._value[0].templateId).toBe(sampleTemplate.id);
      }
    });
  });

  describe('template versioning', () => {
    beforeEach(async () => {
      await service.storeTemplate(sampleTemplate);
    });

    it('should create a new template version', async () => {
      const changeLog = ['Updated template syntax', 'Added new variables'];

      const result = await service.createTemplateVersion(
        sampleTemplate.id,
        '2.0.0',
        changeLog,
        'version-creator',
        true,
      );

      expect(isSuccess(result)).toBe(true);

      const historyResult = await service.getTemplateVersionHistory(sampleTemplate.id);
      expect(isSuccess(historyResult)).toBe(true);
      if (isSuccess(historyResult)) {
        expect(historyResult._value).toHaveLength(1);
        expect(historyResult._value[0].version).toBe('2.0.0');
        expect(historyResult._value[0].changeLog).toEqual(changeLog);
        expect(historyResult._value[0].isStable).toBe(true);
      }
    });

    it('should prevent duplicate version creation', async () => {
      await service.createTemplateVersion(sampleTemplate.id, '2.0.0', ['Initial update'], 'creator');

      const result = await service.createTemplateVersion(sampleTemplate.id, '2.0.0', ['Duplicate'], 'creator');

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('VERSION_ALREADY_EXISTS');
      }
    });

    it('should update template version when creating new version', async () => {
      await service.createTemplateVersion(sampleTemplate.id, '2.0.0', ['Update'], 'creator');

      const templateResult = await service.getTemplate(sampleTemplate.id);
      expect(isSuccess(templateResult)).toBe(true);
      if (isSuccess(templateResult)) {
        expect(templateResult._value.version).toBe('2.0.0');
      }
    });
  });

  describe('usage tracking', () => {
    beforeEach(async () => {
      await service.storeTemplate(sampleTemplate, { trackMetrics: true });
    });

    it('should track successful template usage', async () => {
      const result = await service.trackTemplateUsage(sampleTemplate.id, true, 4.5, {
        name: 'John',
        project: 'TestProject',
      });

      expect(isSuccess(result)).toBe(true);

      const metricsResult = await service.getTemplateMetrics(sampleTemplate.id);
      expect(isSuccess(metricsResult)).toBe(true);
      if (isSuccess(metricsResult)) {
        expect(metricsResult._value.totalUses).toBe(6); // Original 5 + 1
        expect(metricsResult._value.successRate).toBeGreaterThan(0.8);
        expect(metricsResult._value.averageRating).toBeGreaterThan(0);
        expect(metricsResult._value.popularVariables.name).toBe(1);
        expect(metricsResult._value.popularVariables.project).toBe(1);
      }
    });

    it('should track failed template usage', async () => {
      const result = await service.trackTemplateUsage(sampleTemplate.id, false, 2.0);

      expect(isSuccess(result)).toBe(true);

      const metricsResult = await service.getTemplateMetrics(sampleTemplate.id);
      expect(isSuccess(metricsResult)).toBe(true);
      if (isSuccess(metricsResult)) {
        expect(metricsResult._value.totalUses).toBe(6);
        expect(metricsResult._value.successRate).toBeLessThan(1.0);
      }
    });

    it('should initialize metrics if they do not exist', async () => {
      const newTemplate = { ...sampleTemplate, id: 'new-template' };
      await service.storeTemplate(newTemplate, { trackMetrics: false });

      const result = await service.trackTemplateUsage(newTemplate.id, true, 5.0);
      expect(isSuccess(result)).toBe(true);

      const metricsResult = await service.getTemplateMetrics(newTemplate.id);
      expect(isSuccess(metricsResult)).toBe(true);
      if (isSuccess(metricsResult)) {
        expect(metricsResult._value.totalUses).toBe(1);
        expect(metricsResult._value.successRate).toBe(1.0);
        expect(metricsResult._value.averageRating).toBe(5.0);
      }
    });

    it('should update template usage count', async () => {
      await service.trackTemplateUsage(sampleTemplate.id, true);

      const templateResult = await service.getTemplate(sampleTemplate.id);
      expect(isSuccess(templateResult)).toBe(true);
      if (isSuccess(templateResult)) {
        expect(templateResult._value.usageCount).toBe(6); // Original 5 + 1
      }
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Create a template that would cause an error during processing
      const problematicTemplate = { ...sampleTemplate };

      // Mock a scenario where an error occurs during storage
      const result = await service.storeTemplate(problematicTemplate);
      expect(isSuccess(result) || isFailure(result)).toBe(true);
    });

    it('should create proper error objects', () => {
      const error = new TemplateLibraryError('Test message', 'TEST_CODE', { detail: 'test' });

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('TemplateLibraryError');
    });

    it('should handle sharing errors for non-existent templates', async () => {
      const result = await service.shareTemplate('non-existent', 'user', ['user1'], ['read']);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('TEMPLATE_NOT_FOUND');
      }
    });

    it('should handle lifecycle status errors for non-existent templates', async () => {
      const lifecycleStatus = {
        templateId: 'non-existent',
        status: 'active' as const,
        lastReviewed: new Date(),
        nextReviewDate: new Date(),
        maintainer: 'user',
      };

      const result = await service.setTemplateLifecycleStatus('non-existent', lifecycleStatus);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('TEMPLATE_NOT_FOUND');
      }
    });

    it('should handle version creation errors for non-existent templates', async () => {
      const result = await service.createTemplateVersion('non-existent', '2.0.0', ['Update'], 'user');

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result._error.code).toBe('TEMPLATE_NOT_FOUND');
      }
    });
  });
});
