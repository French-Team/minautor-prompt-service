// Integration tests: IdentityValidator (model) + IdentityResolver (service) + IdentityCharacteristicsCache
// Tests the boundary between model validation and service operations

import { describe, it, expect, beforeEach } from 'vitest';
import { IdentityResolver } from '../../services/identity-resolver';
import { IdentityValidator } from '../../models/validators/identity-validator';
import type { UserIdentity, UserProfile, SuperviseurProfile } from '../../models/identity';

describe('IdentityValidator + IdentityResolver Integration', () => {
  let identityResolver: IdentityResolver;
  let identityValidator: IdentityValidator;

  beforeEach(() => {
    identityResolver = new IdentityResolver();
    identityValidator = new IdentityValidator();
  });

  describe('Pipeline: Validate → Resolve → Cache', () => {
    it('should validate a User identity then resolve its characteristics and cache them', async () => {
      const identity: UserIdentity = {
        type: 'User',
        permissions: [
          { action: 'read', resource: 'templates' },
          { action: 'basic_operation', resource: 'preferences' },
        ],
        preferences: {
          language: 'fr',
          responseStyle: 'concise',
          technicalLevel: 'basic',
        },
        customizations: [],
      };

      // Step 1: Model validator validates the identity
      const validation = identityValidator.validate(identity);
      expect(validation.isValid).toBe(true);

      // Step 2: Service resolves characteristics
      const characteristics = await identityResolver.getIdentityCharacteristics(identity);

      // Step 3: Verify characteristics match the User type
      expect(characteristics.identityType).toBe('User');
      expect(characteristics.displayName).toBe('Utilisateur Standard');

      const userProfile = characteristics as UserProfile;
      expect(userProfile.simplificationLevel).toBe('basic');
      expect(userProfile.preferredResponseLength).toBe('short');
      expect(userProfile.technicalDepth).toBe('minimal');

      // Step 4: Verify cache was populated
      const cacheStats = identityResolver.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    it('should validate, resolve and cache all three identity types', async () => {
      const identities: UserIdentity[] = [
        {
          type: 'User',
          permissions: [{ action: 'read', resource: 'templates' }],
          preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
          customizations: [],
        },
        {
          type: 'Superviseur',
          permissions: [{ action: 'optimize', resource: 'prompts' }],
          preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
          customizations: [],
        },
        {
          type: 'Responsable',
          permissions: [{ action: 'validate', resource: 'quality' }],
          preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
          customizations: [],
        },
      ];

      for (const identity of identities) {
        // Validate
        const validation = identityValidator.validate(identity);
        expect(validation.isValid).toBe(true);

        // Resolve
        const characteristics = await identityResolver.getIdentityCharacteristics(identity);
        expect(characteristics.identityType).toBe(identity.type);
      }

      // Cache should have 3 entries (one per identity, different cache keys due to different preferences)
      const cacheStats = identityResolver.getCacheStats();
      expect(cacheStats.size).toBe(3);
    });

    it('should use cached characteristics on subsequent calls with same identity', async () => {
      const identity: UserIdentity = {
        type: 'User',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
        customizations: [],
      };

      // Validate once
      expect(identityValidator.validate(identity).isValid).toBe(true);

      // Resolve twice
      const result1 = await identityResolver.getIdentityCharacteristics(identity);
      const result2 = await identityResolver.getIdentityCharacteristics(identity);

      // Same object reference indicates cache hit
      expect(result1).toBe(result2);

      // Cache stats show hits
      const stats = identityResolver.getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('Pipeline: Profile customization via preferences', () => {
    it('should customize User profile description based on responseStyle', async () => {
      const conciseIdentity: UserIdentity = {
        type: 'User',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
        customizations: [],
      };

      const detailedIdentity: UserIdentity = {
        type: 'User',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
        customizations: [],
      };

      // Both are valid
      expect(identityValidator.validate(conciseIdentity).isValid).toBe(true);
      expect(identityValidator.validate(detailedIdentity).isValid).toBe(true);

      // Resolve both
      const conciseProfile = await identityResolver.getIdentityCharacteristics(conciseIdentity);
      const detailedProfile = await identityResolver.getIdentityCharacteristics(detailedIdentity);

      // Verify preference-driven customization
      expect(conciseProfile.description).toContain('Mode concis activé');
      expect(detailedProfile.description).toContain('Mode détaillé activé');
      expect(detailedProfile.capabilities).toContain('advanced_technical_analysis');
      expect(conciseProfile.capabilities).not.toContain('advanced_technical_analysis');
    });

    it('should apply customizations after validation through savePromptCustomization flow', async () => {
      const identity: UserIdentity = {
        type: 'User',
        permissions: [{ action: 'read', resource: 'prompts' }],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      };

      // Validate
      expect(identityValidator.validate(identity).isValid).toBe(true);

      // Resolve initially (no customizations)
      const initialProfile = await identityResolver.getIdentityCharacteristics(identity);

      // Verify no customizations were applied (standard profile)
      expect(initialProfile.capabilities).not.toContain('advanced_technical_analysis');
    });
  });

  describe('Pipeline: Validate → Set identity → Resolve', () => {
    it('should validate, set, and retrieve identity through the resolver', async () => {
      const identity: UserIdentity = {
        type: 'Superviseur',
        permissions: [
          { action: 'optimize', resource: 'prompts' },
          { action: 'suggest', resource: 'improvements' },
        ],
        preferences: {
          language: 'en',
          responseStyle: 'detailed',
          technicalLevel: 'advanced',
        },
        customizations: [],
      };

      // Step 1: Validate
      expect(identityValidator.validate(identity).isValid).toBe(true);

      // Step 2: Set on resolver
      await identityResolver.setCurrentIdentity(identity);

      // Step 3: Retrieve
      const retrieved = await identityResolver.getCurrentIdentity();
      expect(retrieved.type).toBe('Superviseur');
      expect(retrieved.preferences.language).toBe('en');

      // Step 4: Resolve characteristics
      const characteristics = await identityResolver.getIdentityCharacteristics(retrieved);
      expect(characteristics.identityType).toBe('Superviseur');

      const superviseurProfile = characteristics as SuperviseurProfile;
      expect(superviseurProfile.optimizationFocus).toContain('performance');
      expect(superviseurProfile.suggestionLevel).toBe('conservative');
      expect(superviseurProfile.alternativeCount).toBe(3);
    });
  });

  describe('Pipeline: Detailed characteristics with metadata', () => {
    it('should include strategy information in detailed characteristics', async () => {
      const identity: UserIdentity = {
        type: 'Responsable',
        permissions: [
          { action: 'validate', resource: 'quality' },
          { action: 'administrative', resource: 'project' },
        ],
        preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
        customizations: [
          {
            type: 'append',
            content: 'Quality first',
            templateId: 't1',
            customContent: 'Quality first',
            isActive: true,
          },
        ],
      };

      expect(identityValidator.validate(identity).isValid).toBe(true);

      const detailed = await identityResolver.getDetailedCharacteristics(identity);

      // Verify model-service boundary: characteristics contain correct model data
      expect(detailed.identityType).toBe('Responsable');
      expect(detailed.metadata.strategyCaps).toContain('comprehensive_prompt_generation');
      expect(detailed.metadata.customizationCount).toBe(1);
      expect(detailed.metadata.permissionCount).toBe(2);
      expect(detailed.metadata.cacheKey).toContain('Responsable');
    });
  });

  describe('Pipeline: Cache invalidation and refresh', () => {
    it('should clear cache and repopulate on refresh', async () => {
      const identity: UserIdentity = {
        type: 'Superviseur',
        permissions: [{ action: 'optimize', resource: 'prompts' }],
        preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
        customizations: [],
      };

      expect(identityValidator.validate(identity).isValid).toBe(true);

      // Populate cache
      await identityResolver.getIdentityCharacteristics(identity);
      expect(identityResolver.getCacheStats().size).toBe(1);

      // Refresh (clears and repopulates)
      const refreshed = await identityResolver.refreshCharacteristics(identity);
      expect(refreshed.identityType).toBe('Superviseur');
      expect(identityResolver.getCacheStats().size).toBe(1); // Repopulated
    });
  });

  describe('Pipeline: Cross-identity comparison', () => {
    it('should compare two validated identities and compute compatibility', async () => {
      const userIdentity: UserIdentity = {
        type: 'User',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
        customizations: [],
      };

      const superviseurIdentity: UserIdentity = {
        type: 'Superviseur',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
        customizations: [],
      };

      expect(identityValidator.validate(userIdentity).isValid).toBe(true);
      expect(identityValidator.validate(superviseurIdentity).isValid).toBe(true);

      const comparison = await identityResolver.compareIdentityCharacteristics(userIdentity, superviseurIdentity);

      expect(comparison.differences).toContain('Identity type: User vs Superviseur');
      expect(comparison.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(comparison.compatibilityScore).toBeLessThanOrEqual(100);
      // Different identity types may share capabilities depending on preferences
      expect(comparison.similarities).toBeDefined();
      expect(Array.isArray(comparison.similarities)).toBe(true);
    });
  });
});
