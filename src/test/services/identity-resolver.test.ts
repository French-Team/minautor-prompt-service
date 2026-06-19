// Unit tests for Identity Resolver Service

import { describe, it, expect, beforeEach } from 'vitest';
import { IdentityResolver } from '../../services/identity-resolver';
import type { UserIdentity, UserProfile, SuperviseurProfile, ResponsableProfile } from '../../models/identity';

describe('IdentityResolver', () => {
  let identityResolver: IdentityResolver;

  beforeEach(() => {
    identityResolver = new IdentityResolver();
  });

  describe('getCurrentIdentity', () => {
    it('should return default User identity when no identity is set', async () => {
      const identity = await identityResolver.getCurrentIdentity();

      expect(identity.type).toBe('User');
      expect(identity.permissions).toHaveLength(3);
      expect(identity.preferences.language).toBe('fr');
      expect(identity.preferences.responseStyle).toBe('balanced');
      expect(identity.preferences.technicalLevel).toBe('intermediate');
    });

    it('should return the set identity after setCurrentIdentity is called', async () => {
      const customIdentity = {
        type: 'Superviseur',
        permissions: [{ action: 'optimize', resource: 'prompts' }],
        preferences: {
          language: 'en',
          responseStyle: 'detailed',
          technicalLevel: 'advanced',
        },
        customizations: [],
      } as unknown as UserIdentity;

      await identityResolver.setCurrentIdentity(customIdentity);
      const retrievedIdentity = await identityResolver.getCurrentIdentity();

      expect(retrievedIdentity).toEqual(customIdentity);
    });
  });

  describe('getIdentityCharacteristics', () => {
    it('should return User profile characteristics for User identity', async () => {
      const userIdentity = {
        type: 'User',
        permissions: [] as const,
        preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
        customizations: [],
      } as unknown as UserIdentity;

      const characteristics = (await identityResolver.getIdentityCharacteristics(
        userIdentity as unknown as UserIdentity,
      )) as UserProfile;

      expect(characteristics.identityType).toBe('User');
      expect(characteristics.displayName).toBe('Utilisateur Standard');
      expect(characteristics.simplificationLevel).toBe('basic');
      expect(characteristics.preferredResponseLength).toBe('short');
      expect(characteristics.technicalDepth).toBe('minimal');
      expect(characteristics.capabilities).toContain('basic_operations');
    });

    it('should return Superviseur profile characteristics for Superviseur identity', async () => {
      const superviseurIdentity = {
        type: 'Superviseur',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
        customizations: [],
      } as unknown as UserIdentity;

      const characteristics = (await identityResolver.getIdentityCharacteristics(
        superviseurIdentity as unknown as UserIdentity,
      )) as SuperviseurProfile;

      expect(characteristics.identityType).toBe('Superviseur');
      expect(characteristics.displayName).toBe('Superviseur');
      expect(characteristics.optimizationFocus).toContain('performance');
      expect(characteristics.suggestionLevel).toBe('conservative');
      expect(characteristics.alternativeCount).toBe(3);
      expect(characteristics.capabilities).toContain('optimization_suggestions');
    });

    it('should return Responsable profile characteristics for Responsable identity', async () => {
      const responsableIdentity = {
        type: 'Responsable',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'detailed' as const, technicalLevel: 'advanced' as const },
        customizations: [],
      } as unknown as UserIdentity;

      const id = responsableIdentity as unknown as UserIdentity;
      const characteristics = (await identityResolver.getIdentityCharacteristics(id)) as ResponsableProfile;

      expect(characteristics.identityType).toBe('Responsable');
      expect(characteristics.displayName).toBe('Responsable Projet');
      expect(characteristics.qualityChecks).toContain('security');
      expect(characteristics.riskTolerance).toBe('low');
      expect(characteristics.validationRequirements).toHaveLength(2);
      expect(characteristics.capabilities).toContain('quality_control');
    });

    it('should throw error for unknown identity type', async () => {
      const invalidIdentity = {
        type: 'InvalidType',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      } as unknown as UserIdentity;

      await expect(
        identityResolver.getIdentityCharacteristics(invalidIdentity as unknown as UserIdentity),
      ).rejects.toThrow('Unknown identity type: InvalidType');
    });
  });

  describe('validateIdentityPermissions', () => {
    it('should validate User permissions correctly', async () => {
      const userIdentity = {
        type: 'User',
        permissions: [
          { action: 'read', resource: 'templates' },
          { action: 'basic_operation', resource: 'preferences' },
        ],
        preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
        customizations: [],
      } as unknown as UserIdentity;

      // Should allow basic actions
      expect(await identityResolver.validateIdentityPermissions(userIdentity, 'read')).toBe(true);
      expect(await identityResolver.validateIdentityPermissions(userIdentity, 'query')).toBe(true);
      expect(await identityResolver.validateIdentityPermissions(userIdentity, 'basic_operation')).toBe(true);

      // Should not allow advanced actions
      expect(await identityResolver.validateIdentityPermissions(userIdentity, 'optimize')).toBe(false);
      expect(await identityResolver.validateIdentityPermissions(userIdentity, 'administrative')).toBe(false);
    });

    it('should validate Superviseur permissions correctly', async () => {
      const superviseurIdentity = {
        type: 'Superviseur',
        permissions: [
          { action: 'optimize', resource: 'prompts' },
          { action: 'suggest', resource: 'improvements' },
        ],
        preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
        customizations: [],
      } as unknown as UserIdentity;

      // Should allow basic and optimization actions
      expect(await identityResolver.validateIdentityPermissions(superviseurIdentity, 'read')).toBe(true);
      expect(await identityResolver.validateIdentityPermissions(superviseurIdentity, 'optimize')).toBe(true);
      expect(await identityResolver.validateIdentityPermissions(superviseurIdentity, 'suggest')).toBe(true);
      expect(await identityResolver.validateIdentityPermissions(superviseurIdentity, 'analyze')).toBe(true);

      // Should not allow administrative actions
      expect(await identityResolver.validateIdentityPermissions(superviseurIdentity, 'administrative')).toBe(false);
    });

    it('should validate Responsable permissions correctly', async () => {
      const responsableIdentity = {
        type: 'Responsable',
        permissions: [
          { action: 'validate', resource: 'quality' },
          { action: 'administrative', resource: 'project' },
        ],
        preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
        customizations: [],
      } as unknown as UserIdentity;

      // Should allow all actions including administrative
      expect(await identityResolver.validateIdentityPermissions(responsableIdentity, 'read')).toBe(true);
      expect(await identityResolver.validateIdentityPermissions(responsableIdentity, 'optimize')).toBe(true);
      expect(await identityResolver.validateIdentityPermissions(responsableIdentity, 'validate')).toBe(true);
      expect(await identityResolver.validateIdentityPermissions(responsableIdentity, 'administrative')).toBe(true);
    });

    it('should return false for unknown identity type', async () => {
      const invalidIdentity = {
        type: 'InvalidType',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      } as unknown as UserIdentity;

      const result = await identityResolver.validateIdentityPermissions(invalidIdentity, 'read');
      expect(result).toBe(false);
    });
  });

  describe('getIdentityCapabilities', () => {
    it('should return User capabilities', async () => {
      const capabilities = await identityResolver.getIdentityCapabilities('User');

      expect(capabilities).toContain('simple_prompt_generation');
      expect(capabilities).toContain('basic_customization');
      expect(capabilities).toContain('standard_templates');
    });

    it('should return Superviseur capabilities', async () => {
      const capabilities = await identityResolver.getIdentityCapabilities('Superviseur');

      expect(capabilities).toContain('advanced_prompt_generation');
      expect(capabilities).toContain('optimization_analysis');
      expect(capabilities).toContain('alternative_suggestions');
    });

    it('should return Responsable capabilities', async () => {
      const capabilities = await identityResolver.getIdentityCapabilities('Responsable');

      expect(capabilities).toContain('comprehensive_prompt_generation');
      expect(capabilities).toContain('quality_validation');
      expect(capabilities).toContain('administrative_controls');
    });

    it('should throw error for unknown identity type', async () => {
      await expect(identityResolver.getIdentityCapabilities('InvalidType')).rejects.toThrow(
        'Unknown identity type: InvalidType',
      );
    });
  });

  describe('isActionAllowed', () => {
    it('should check action and resource permissions correctly', async () => {
      const identity = {
        type: 'User',
        permissions: [
          { action: 'read', resource: 'templates' },
          { action: 'read', resource: '*' },
          { action: 'basic_operation', resource: 'preferences' },
        ],
        preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
        customizations: [],
      } as unknown as UserIdentity;

      // Should allow read action on templates
      expect(await identityResolver.isActionAllowed(identity, 'read', 'templates')).toBe(true);

      // Should allow read action on any resource due to wildcard
      expect(await identityResolver.isActionAllowed(identity, 'read', 'anything')).toBe(true);

      // Should allow basic_operation on preferences
      expect(await identityResolver.isActionAllowed(identity, 'basic_operation', 'preferences')).toBe(true);

      // Should not allow basic_operation on templates (no permission)
      expect(await identityResolver.isActionAllowed(identity, 'basic_operation', 'templates')).toBe(false);

      // Should not allow optimize action (not allowed for User)
      expect(await identityResolver.isActionAllowed(identity, 'optimize', 'prompts')).toBe(false);
    });

    it('should work without resource specification', async () => {
      const identity = {
        type: 'Superviseur',
        permissions: [{ action: 'optimize', resource: 'prompts' }],
        preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
        customizations: [],
      } as unknown as UserIdentity;

      // Should allow optimize action without resource check
      expect(await identityResolver.isActionAllowed(identity, 'optimize')).toBe(true);

      // Should not allow administrative action
      expect(await identityResolver.isActionAllowed(identity, 'administrative')).toBe(false);
    });
  });

  describe('setCurrentIdentity', () => {
    it('should set valid identity successfully', async () => {
      const identity = {
        type: 'Superviseur',
        permissions: [{ action: 'optimize', resource: 'prompts' }],
        preferences: { language: 'en', responseStyle: 'detailed', technicalLevel: 'advanced' },
        customizations: [],
      } as unknown as UserIdentity;

      await expect(identityResolver.setCurrentIdentity(identity)).resolves.not.toThrow();

      const currentIdentity = await identityResolver.getCurrentIdentity();
      expect(currentIdentity).toEqual(identity);
    });

    it('should throw error for invalid identity type', async () => {
      const invalidIdentity = {
        type: 'InvalidType',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      } as unknown as UserIdentity;

      await expect(identityResolver.setCurrentIdentity(invalidIdentity)).rejects.toThrow(
        'Invalid identity type: InvalidType',
      );
    });
  });

  describe('Identity Characteristics Management', () => {
    describe('caching behavior', () => {
      it('should cache identity characteristics', async () => {
        const identity = {
          type: 'User',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
          customizations: [],
        } as unknown as UserIdentity;

        // First call should populate cache
        const characteristics1 = await identityResolver.getIdentityCharacteristics(identity as unknown as UserIdentity);

        // Second call should use cache (same object reference)
        const characteristics2 = await identityResolver.getIdentityCharacteristics(identity as unknown as UserIdentity);

        expect(characteristics1).toEqual(characteristics2);
        expect(identityResolver.getCacheStats().size).toBeGreaterThan(0);
      });

      it('should customize profile based on preferences', async () => {
        const conciseIdentity = {
          type: 'User',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
          customizations: [],
        } as unknown as UserIdentity;

        const detailedIdentity = {
          type: 'User',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
          customizations: [],
        } as unknown as UserIdentity;

        const conciseProfile = await identityResolver.getIdentityCharacteristics(
          conciseIdentity as unknown as UserIdentity,
        );
        const detailedProfile = await identityResolver.getIdentityCharacteristics(
          detailedIdentity as unknown as UserIdentity,
        );

        expect(conciseProfile.description).toContain('Mode concis activé');
        expect(detailedProfile.description).toContain('Mode détaillé activé');
        expect(detailedProfile.capabilities).toContain('advanced_technical_analysis');
        expect(conciseProfile.capabilities).not.toContain('advanced_technical_analysis');
      });

      it('should clear cache when requested', async () => {
        const identity = {
          type: 'User',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
          customizations: [],
        } as unknown as UserIdentity;

        await identityResolver.getIdentityCharacteristics(identity as unknown as UserIdentity);
        expect(identityResolver.getCacheStats().size).toBeGreaterThan(0);

        identityResolver.clearCharacteristicsCache();
        expect(identityResolver.getCacheStats().size).toBe(0);
      });
    });

    describe('getDetailedCharacteristics', () => {
      it('should return characteristics with metadata', async () => {
        const identity = {
          type: 'Superviseur',
          permissions: [{ action: 'optimize', resource: 'prompts' }],
          preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
          customizations: [
            { type: 'append', content: 'test', templateId: 'test', customContent: 'test', isActive: true },
          ],
        } as unknown as UserIdentity;

        const detailed = await identityResolver.getDetailedCharacteristics(identity);

        expect(detailed.identityType).toBe('Superviseur');
        expect(detailed.metadata).toBeDefined();
        expect(detailed.metadata.cacheKey).toBeDefined();
        expect(detailed.metadata.strategyCaps).toBeDefined();
        expect(detailed.metadata.customizationCount).toBe(1);
        expect(detailed.metadata.permissionCount).toBe(1);
      });
    });

    describe('refreshCharacteristics', () => {
      it('should refresh cached characteristics', async () => {
        const identity = {
          type: 'User',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
          customizations: [],
        } as unknown as UserIdentity;

        // Populate cache
        await identityResolver.getIdentityCharacteristics(identity as unknown as UserIdentity);
        expect(identityResolver.getCacheStats().size).toBeGreaterThan(0);

        // Refresh should clear cache and return fresh data
        const refreshed = await identityResolver.refreshCharacteristics(identity);

        expect(refreshed.identityType).toBe('User');
        expect(identityResolver.getCacheStats().size).toBeGreaterThan(0); // Should be repopulated
      });
    });

    describe('compareIdentityCharacteristics', () => {
      it('should compare different identity types', async () => {
        const userIdentity = {
          type: 'User',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
          customizations: [],
        } as unknown as UserIdentity;

        const superviseurIdentity = {
          type: 'Superviseur',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
          customizations: [],
        } as unknown as UserIdentity;

        const comparison = await identityResolver.compareIdentityCharacteristics(userIdentity, superviseurIdentity);

        expect(comparison.differences).toContain('Identity type: User vs Superviseur');
        expect(comparison.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(comparison.compatibilityScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(comparison.similarities)).toBe(true);
      });

      it('should compare same identity types', async () => {
        const identity1 = {
          type: 'User',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'concise', technicalLevel: 'basic' },
          customizations: [],
        } as unknown as UserIdentity;

        const identity2 = {
          type: 'User',
          permissions: [],
          preferences: { language: 'en', responseStyle: 'detailed', technicalLevel: 'advanced' },
          customizations: [],
        } as unknown as UserIdentity;

        const comparison = await identityResolver.compareIdentityCharacteristics(identity1, identity2);

        expect(comparison.similarities).toContain('Same identity type: User');
        expect(comparison.compatibilityScore).toBeGreaterThan(0);
      });
    });

    describe('getIdentityRecommendations', () => {
      it('should recommend Superviseur for complex tasks', async () => {
        const userIdentity = {
          type: 'User',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
          customizations: [],
        } as unknown as UserIdentity;

        const context = {
          complexityLevel: 'high',
          optimizationNeeded: true,
        };

        const recommendations = await identityResolver.getIdentityRecommendations(userIdentity, context);

        expect(recommendations.suggestedIdentity).toBe('Superviseur');
        expect(recommendations.reasons).toContain(
          'Complex tasks detected that could benefit from optimization suggestions',
        );
        expect(recommendations.benefits).toContain('Access to advanced optimization analysis');
      });

      it('should recommend Responsable for quality control tasks', async () => {
        const superviseurIdentity = {
          type: 'Superviseur',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'detailed', technicalLevel: 'advanced' },
          customizations: [],
        } as unknown as UserIdentity;

        const context = {
          qualityControlNeeded: true,
          projectManagement: true,
        };

        const recommendations = await identityResolver.getIdentityRecommendations(superviseurIdentity, context);

        expect(recommendations.suggestedIdentity).toBe('Responsable');
        expect(recommendations.reasons).toContain('Quality control and project management tasks detected');
        expect(recommendations.benefits).toContain('Comprehensive quality validation');
      });

      it('should return no recommendations when current identity is sufficient', async () => {
        const userIdentity = {
          type: 'User',
          permissions: [],
          preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
          customizations: [],
        } as unknown as UserIdentity;

        const context = {
          complexityLevel: 'low',
        };

        const recommendations = await identityResolver.getIdentityRecommendations(userIdentity, context);

        expect(recommendations.suggestedIdentity).toBeUndefined();
        expect(recommendations.reasons).toHaveLength(0);
        expect(recommendations.benefits).toHaveLength(0);
      });
    });
  });
});
