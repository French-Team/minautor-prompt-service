// Version Handler Service Tests

import { describe, it, expect, beforeEach } from 'vitest';
import { VersionHandler } from '../../services/version-handler';
import type { VersionMetadata, PerformanceMetrics, PromptVersion, UserFeedback } from '../../models/version';

describe('VersionHandler', () => {
  let versionHandler: VersionHandler;
  const mockPromptId = 'test-prompt-123';
  const mockContent = 'Test prompt content';
  const mockMetadata: VersionMetadata = {
    changeReason: 'Initial version',
    performanceMetrics: {
      responseTime: 100,
      successRate: 0.95,
      errorRate: 0.05,
      userSatisfaction: 4.5,
      usageFrequency: 10,
    },
  };

  beforeEach(() => {
    versionHandler = new VersionHandler();
  });

  describe('createVersion', () => {
    it('should create a new version with correct properties', async () => {
      const version = await versionHandler.createVersion(mockPromptId, mockContent, mockMetadata);

      expect(version).toMatchObject({
        promptId: mockPromptId,
        content: mockContent,
        version: '1.0.0',
        isActive: true,
        metadata: mockMetadata,
      });
      expect(version.id).toContain(mockPromptId);
      expect(version.createdAt).toBeInstanceOf(Date);
      expect(version.changes).toEqual([]);
    });

    it('should increment version number for subsequent versions', async () => {
      await versionHandler.createVersion(mockPromptId, mockContent, mockMetadata);
      const secondVersion = await versionHandler.createVersion(mockPromptId, 'Updated content', mockMetadata);

      expect(secondVersion.version).toBe('1.0.1');
    });

    it('should deactivate previous versions when creating new one', async () => {
      const firstVersion = await versionHandler.createVersion(mockPromptId, mockContent, mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'Updated content', mockMetadata);

      const history = await versionHandler.getVersionHistory(mockPromptId);
      const firstVersionInHistory = history.versions.find((v) => v.id === firstVersion.id);

      expect(firstVersionInHistory?.isActive).toBe(false);
    });
  });

  describe('getVersionHistory', () => {
    beforeEach(async () => {
      // Create multiple versions for testing
      await versionHandler.createVersion(mockPromptId, 'Version 1', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'Version 2', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'Version 3', mockMetadata);
    });

    it('should return complete version history', async () => {
      const history = await versionHandler.getVersionHistory(mockPromptId);

      expect(history.promptId).toBe(mockPromptId);
      expect(history.versions).toHaveLength(3);
      expect(history.totalVersions).toBe(3);
      expect(history.currentVersion).toBe('1.0.2');
    });

    it('should support pagination', async () => {
      const history = await versionHandler.getVersionHistory(mockPromptId, {
        limit: 2,
        offset: 1,
      });

      expect(history.versions).toHaveLength(2);
    });

    it('should support sorting by creation date', async () => {
      const history = await versionHandler.getVersionHistory(mockPromptId, {
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(history.versions[0].version).toBe('1.0.0');
      expect(history.versions[2].version).toBe('1.0.2');
    });

    it('should filter inactive versions when requested', async () => {
      const history = await versionHandler.getVersionHistory(mockPromptId, {
        includeInactive: false,
      });

      expect(history.versions).toHaveLength(1);
      expect(history.versions[0].isActive).toBe(true);
    });

    it('should include metrics when requested', async () => {
      // Record some metrics first
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.2', {
        responseTime: 150,
        successRate: 0.9,
        userSatisfaction: 4.0,
      });

      const history = await versionHandler.getVersionHistory(mockPromptId, {
        includeMetrics: true,
        includeInactive: false,
      });

      expect(history.versions[0].metadata.performanceMetrics).toBeDefined();
      expect(history.versions[0].metadata.performanceMetrics?.responseTime).toBeGreaterThan(0);
    });
  });

  describe('rollbackToVersion', () => {
    let firstVersion: PromptVersion;

    beforeEach(async () => {
      firstVersion = await versionHandler.createVersion(mockPromptId, 'Version 1', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'Version 2', mockMetadata);
    });

    it('should rollback to specified version', async () => {
      const rolledBackVersion = await versionHandler.rollbackToVersion(mockPromptId, firstVersion.version);

      expect(rolledBackVersion.id).toBe(firstVersion.id);
      expect(rolledBackVersion.isActive).toBe(true);
      expect(rolledBackVersion.metadata.rollbackInfo).toBeDefined();
      expect(rolledBackVersion.metadata.rollbackInfo?.rollbackAt).toBeInstanceOf(Date);
    });

    it('should deactivate other versions when rolling back', async () => {
      await versionHandler.rollbackToVersion(mockPromptId, firstVersion.version);

      const history = await versionHandler.getVersionHistory(mockPromptId);
      const activeVersions = history.versions.filter((v) => v.isActive);

      expect(activeVersions).toHaveLength(1);
      expect(activeVersions[0].id).toBe(firstVersion.id);
    });

    it('should throw error for non-existent version', async () => {
      await expect(versionHandler.rollbackToVersion(mockPromptId, '999.999.999')).rejects.toThrow(
        'Version 999.999.999 not found',
      );
    });
  });

  describe('recordUsageMetrics', () => {
    beforeEach(async () => {
      await versionHandler.createVersion(mockPromptId, mockContent, mockMetadata);
    });

    it('should record and update usage metrics', async () => {
      const metrics: Partial<PerformanceMetrics> = {
        responseTime: 200,
        successRate: 0.8,
        userSatisfaction: 3.5,
      };

      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', metrics);

      const recordedMetrics = await versionHandler.getVersionMetrics(mockPromptId, '1.0.0');

      expect(recordedMetrics.responseTime).toBe(200);
      expect(recordedMetrics.successRate).toBe(0.8);
      expect(recordedMetrics.userSatisfaction).toBe(3.5);
    });

    it('should calculate moving averages for multiple recordings', async () => {
      // Record first metrics
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', {
        responseTime: 100,
        userSatisfaction: 4.0,
      });

      // Record second metrics
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', {
        responseTime: 200,
        userSatisfaction: 5.0,
      });

      const metrics = await versionHandler.getVersionMetrics(mockPromptId, '1.0.0');

      // Should be average of 100 and 200 = 150
      expect(metrics.responseTime).toBe(150);
      // Should be average of 4.0 and 5.0 = 4.5
      expect(metrics.userSatisfaction).toBe(4.5);
    });
  });

  describe('getVersionMetrics', () => {
    it('should return default metrics for non-existent version', async () => {
      const metrics = await versionHandler.getVersionMetrics('non-existent', '1.0.0');

      expect(metrics).toEqual({
        responseTime: 0,
        successRate: 0,
        errorRate: 0,
        userSatisfaction: 0,
        usageFrequency: 0,
      });
    });

    it('should calculate success and error rates correctly', async () => {
      await versionHandler.createVersion(mockPromptId, mockContent, mockMetadata);

      // Record successful generations
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', { successRate: 0.9 });
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', { successRate: 0.9 });

      // Record failed generation
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', { successRate: 0.1 });

      const metrics = await versionHandler.getVersionMetrics(mockPromptId, '1.0.0');

      expect(metrics.successRate).toBeCloseTo(0.67, 1); // 2/3 successful
      expect(metrics.errorRate).toBeCloseTo(0.33, 1); // 1/3 failed
    });
  });

  describe('getVersionAnalytics', () => {
    beforeEach(async () => {
      // Create multiple versions with different usage patterns
      await versionHandler.createVersion(mockPromptId, 'Version 1', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'Version 2', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'Version 3', mockMetadata);

      // Record different usage metrics
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', { userSatisfaction: 3.0 });
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.1', { userSatisfaction: 4.0 });
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.2', { userSatisfaction: 4.5 });
    });

    it('should return comprehensive analytics', async () => {
      const analytics = await versionHandler.getVersionAnalytics(mockPromptId);

      expect(analytics.promptId).toBe(mockPromptId);
      expect(analytics.totalVersions).toBe(3);
      expect(analytics.activeVersion).toBe('1.0.2');
      expect(analytics.performanceTrend).toBe('improving');
      expect(analytics.usageMetrics).toHaveLength(3);
      expect(analytics.optimizationSuggestions).toBeInstanceOf(Array);
    });

    it('should identify most used version correctly', async () => {
      // Make version 1.0.1 most used
      for (let i = 0; i < 5; i++) {
        await versionHandler.recordUsageMetrics(mockPromptId, '1.0.1', { userSatisfaction: 4.0 });
      }

      const analytics = await versionHandler.getVersionAnalytics(mockPromptId);
      expect(analytics.mostUsedVersion).toBe('1.0.1');
    });

    it('should generate optimization suggestions', async () => {
      // Create conditions for suggestions
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', {
        successRate: 0.1, // High error rate
        userSatisfaction: 2.0, // Low satisfaction
      });

      const analytics = await versionHandler.getVersionAnalytics(mockPromptId);

      expect(analytics.optimizationSuggestions.length).toBeGreaterThan(0);

      const criticalSuggestion = analytics.optimizationSuggestions.find((s) => s.priority === 'critical');
      expect(criticalSuggestion).toBeDefined();
      expect(criticalSuggestion?.type).toBe('performance');
    });
  });

  describe('compareVersions', () => {
    let version1: PromptVersion;
    let version2: PromptVersion;

    beforeEach(async () => {
      version1 = await versionHandler.createVersion(mockPromptId, 'Original content', mockMetadata);
      version2 = await versionHandler.createVersion(mockPromptId, 'Updated content', {
        ...mockMetadata,
        changeReason: 'Content improvement',
      });
    });

    it('should compare two versions and identify differences', async () => {
      const comparison = await versionHandler.compareVersions(mockPromptId, version1.version, version2.version);

      expect(comparison.oldVersion.id).toBe(version1.id);
      expect(comparison.newVersion.id).toBe(version2.id);
      expect(comparison.differences).toHaveLength(2); // content and metadata
      expect(comparison.recommendation).toMatch(/upgrade|keep|rollback/);
    });

    it('should throw error for non-existent versions', async () => {
      await expect(versionHandler.compareVersions(mockPromptId, '999.999.999', version2.version)).rejects.toThrow(
        'One or both versions not found',
      );
    });

    it('should recommend upgrade for better performing version', async () => {
      // Make version 2 perform better
      await versionHandler.recordUsageMetrics(mockPromptId, version2.version, {
        successRate: 0.95,
        userSatisfaction: 4.8,
      });

      // Make version 1 perform worse
      await versionHandler.recordUsageMetrics(mockPromptId, version1.version, {
        successRate: 0.7,
        userSatisfaction: 3.0,
      });

      const comparison = await versionHandler.compareVersions(mockPromptId, version1.version, version2.version);
      expect(comparison.recommendation).toBe('upgrade');
    });
  });

  describe('addUserFeedback and getVersionFeedback', () => {
    beforeEach(async () => {
      await versionHandler.createVersion(mockPromptId, mockContent, mockMetadata);
    });

    it('should add and retrieve user feedback', async () => {
      const feedback: Omit<UserFeedback, 'timestamp'> = {
        userId: 'user123',
        rating: 4,
        comment: 'Great prompt!',
        helpful: true,
      };

      await versionHandler.addUserFeedback(mockPromptId, '1.0.0', feedback);

      const retrievedFeedback = await versionHandler.getVersionFeedback(mockPromptId, '1.0.0');

      expect(retrievedFeedback).toHaveLength(1);
      expect(retrievedFeedback[0]).toMatchObject(feedback);
      expect(retrievedFeedback[0].timestamp).toBeInstanceOf(Date);
    });

    it('should update satisfaction metrics when feedback is added', async () => {
      const feedback: Omit<UserFeedback, 'timestamp'> = {
        userId: 'user123',
        rating: 5,
        comment: 'Excellent!',
        helpful: true,
      };

      await versionHandler.addUserFeedback(mockPromptId, '1.0.0', feedback);

      const metrics = await versionHandler.getVersionMetrics(mockPromptId, '1.0.0');
      expect(metrics.userSatisfaction).toBe(5);
    });

    it('should handle multiple feedback entries', async () => {
      const feedback1: Omit<UserFeedback, 'timestamp'> = {
        userId: 'user1',
        rating: 4,
        helpful: true,
      };

      const feedback2: Omit<UserFeedback, 'timestamp'> = {
        userId: 'user2',
        rating: 5,
        helpful: true,
      };

      await versionHandler.addUserFeedback(mockPromptId, '1.0.0', feedback1);
      await versionHandler.addUserFeedback(mockPromptId, '1.0.0', feedback2);

      const allFeedback = await versionHandler.getVersionFeedback(mockPromptId, '1.0.0');
      expect(allFeedback).toHaveLength(2);
    });
  });

  describe('performance trend analysis', () => {
    it('should detect improving trend', async () => {
      // Create versions with improving satisfaction scores
      await versionHandler.createVersion(mockPromptId, 'V1', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'V2', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'V3', mockMetadata);

      // Record improving metrics
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', { userSatisfaction: 2.0 });
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.1', { userSatisfaction: 3.5 });
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.2', { userSatisfaction: 4.5 });

      const analytics = await versionHandler.getVersionAnalytics(mockPromptId);
      expect(analytics.performanceTrend).toBe('improving');
    });

    it('should detect declining trend', async () => {
      // Create versions with declining satisfaction scores
      await versionHandler.createVersion(mockPromptId, 'V1', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'V2', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'V3', mockMetadata);

      // Record declining metrics
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', { userSatisfaction: 4.5 });
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.1', { userSatisfaction: 3.0 });
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.2', { userSatisfaction: 2.0 });

      const analytics = await versionHandler.getVersionAnalytics(mockPromptId);
      expect(analytics.performanceTrend).toBe('declining');
    });

    it('should detect stable trend', async () => {
      // Create versions with stable satisfaction scores
      await versionHandler.createVersion(mockPromptId, 'V1', mockMetadata);
      await versionHandler.createVersion(mockPromptId, 'V2', mockMetadata);

      // Record stable metrics
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.0', { userSatisfaction: 4.0 });
      await versionHandler.recordUsageMetrics(mockPromptId, '1.0.1', { userSatisfaction: 4.1 });

      const analytics = await versionHandler.getVersionAnalytics(mockPromptId);
      expect(analytics.performanceTrend).toBe('stable');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty version history gracefully', async () => {
      const history = await versionHandler.getVersionHistory('non-existent-prompt');

      expect(history.versions).toHaveLength(0);
      expect(history.totalVersions).toBe(0);
      expect(history.currentVersion).toBe('');
    });

    it('should handle analytics for prompt with no versions', async () => {
      const analytics = await versionHandler.getVersionAnalytics('non-existent-prompt');

      expect(analytics.totalVersions).toBe(0);
      expect(analytics.activeVersion).toBe('');
      expect(analytics.performanceTrend).toBe('stable');
      expect(analytics.usageMetrics).toHaveLength(0);
    });

    it('should handle feedback for non-existent version gracefully', async () => {
      const feedback = await versionHandler.getVersionFeedback('non-existent', '1.0.0');
      expect(feedback).toHaveLength(0);
    });
  });
});
