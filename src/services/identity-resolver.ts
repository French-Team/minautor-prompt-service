// Identity Resolver Service - Unified Implementation with Best Practices

import type { IIdentityResolver } from '../config/di-container';
import type { UserIdentity, IdentityProfile, IdentityPreferences } from '../models/identity';
import { UserIdentityStrategy, SuperviseurIdentityStrategy, ResponsableIdentityStrategy } from './identity-strategies';
import type { IdentityStrategy } from './identity-strategies';
import { IdentityCharacteristicsCache } from './identity-cache';

/**
 * Unified Identity Resolver with improved separation of concerns
 *
 * Features:
 * - Modular strategy pattern with external strategy classes
 * - Dedicated caching service with hit rate tracking
 * - Comprehensive error handling and validation
 * - Enhanced type safety and documentation
 */
export class IdentityResolver implements IIdentityResolver {
  private readonly strategies: Map<string, IdentityStrategy>;
  private currentIdentity: UserIdentity | null = null;
  private readonly characteristicsCache: IdentityCharacteristicsCache;

  constructor() {
    this.strategies = new Map<string, IdentityStrategy>();
    this.strategies.set('User', new UserIdentityStrategy());
    this.strategies.set('Superviseur', new SuperviseurIdentityStrategy());
    this.strategies.set('Responsable', new ResponsableIdentityStrategy());
    this.characteristicsCache = new IdentityCharacteristicsCache();
  }

  async getCurrentIdentity(): Promise<UserIdentity> {
    if (!this.currentIdentity) {
      this.currentIdentity = this.createDefaultUserIdentity();
    }
    return this.currentIdentity;
  }

  async getIdentityCharacteristics(identity: UserIdentity): Promise<IdentityProfile> {
    const cacheKey = this.createCharacteristicsCacheKey(identity);

    const cachedProfile = this.characteristicsCache.get(cacheKey) as IdentityProfile | undefined;
    if (cachedProfile) {
      return cachedProfile;
    }

    const strategy = this.strategies.get(identity.type);
    if (!strategy) {
      throw new Error(`Unknown identity type: ${identity.type}`);
    }

    const profile = strategy.getDefaultProfile();
    const customizedProfile = this.customizeProfileWithPreferences(profile, identity.preferences);

    this.characteristicsCache.set(cacheKey, customizedProfile);

    return customizedProfile;
  }

  async validateIdentityPermissions(identity: UserIdentity, action: string): Promise<boolean> {
    const strategy = this.strategies.get(identity.type);
    if (!strategy) {
      return false;
    }
    return strategy.validatePermissions(identity.permissions, action);
  }

  async setCurrentIdentity(identity: UserIdentity): Promise<void> {
    const strategy = this.strategies.get(identity.type);
    if (!strategy) {
      throw new Error(`Invalid identity type: ${identity.type}`);
    }
    if (!identity.permissions || identity.permissions.length === 0) {
      throw new Error('Identity must have at least one permission');
    }
    this.currentIdentity = identity;
  }

  async getIdentityCapabilities(identityType: string): Promise<string[]> {
    const strategy = this.strategies.get(identityType);
    if (!strategy) {
      throw new Error(`Unknown identity type: ${identityType}`);
    }
    return strategy.getCapabilities();
  }

  async isActionAllowed(identity: UserIdentity, action: string, resource?: string): Promise<boolean> {
    const strategy = this.strategies.get(identity.type);
    if (!strategy) {
      return false;
    }

    const actionAllowed = strategy.validatePermissions(identity.permissions, action);

    if (resource && actionAllowed) {
      return identity.permissions.some((p) => p.action === action && (p.resource === resource || p.resource === '*'));
    }

    return actionAllowed;
  }

  async getDetailedCharacteristics(
    identity: UserIdentity,
  ): Promise<IdentityProfile & { metadata: Record<string, unknown> }> {
    const baseProfile = await this.getIdentityCharacteristics(identity);
    const strategy = this.strategies.get(identity.type)!;

    return {
      ...baseProfile,
      metadata: {
        cacheKey: this.createCharacteristicsCacheKey(identity),
        strategyCaps: strategy.getCapabilities(),
        lastUpdated: new Date().toISOString(),
        customizationCount: identity.customizations.length,
        permissionCount: identity.permissions.length,
      },
    };
  }

  async refreshCharacteristics(identity: UserIdentity): Promise<IdentityProfile> {
    this.characteristicsCache.clear();
    return this.getIdentityCharacteristics(identity);
  }

  async compareIdentityCharacteristics(
    identity1: UserIdentity,
    identity2: UserIdentity,
  ): Promise<{
    differences: string[];
    similarities: string[];
    compatibilityScore: number;
  }> {
    const [profile1, profile2] = await Promise.all([
      this.getIdentityCharacteristics(identity1),
      this.getIdentityCharacteristics(identity2),
    ]);

    const differences: string[] = [];
    const similarities: string[] = [];

    if (profile1.identityType !== profile2.identityType) {
      differences.push(`Identity type: ${profile1.identityType} vs ${profile2.identityType}`);
    } else {
      similarities.push(`Same identity type: ${profile1.identityType}`);
    }

    const caps1 = new Set(profile1.capabilities);
    const caps2 = new Set(profile2.capabilities);

    const commonCaps = [...caps1].filter((cap) => caps2.has(cap));
    const uniqueCaps1 = [...caps1].filter((cap) => !caps2.has(cap));
    const uniqueCaps2 = [...caps2].filter((cap) => !caps1.has(cap));

    similarities.push(...commonCaps.map((cap) => `Shared capability: ${cap}`));
    differences.push(...uniqueCaps1.map((cap) => `${profile1.identityType} only: ${cap}`));
    differences.push(...uniqueCaps2.map((cap) => `${profile2.identityType} only: ${cap}`));

    const totalCaps = caps1.size + caps2.size - commonCaps.length;
    const compatibilityScore = totalCaps > 0 ? Math.round((commonCaps.length / totalCaps) * 100) : 100;

    return {
      differences,
      similarities,
      compatibilityScore,
    };
  }

  async getIdentityRecommendations(
    currentIdentity: UserIdentity,
    context?: Record<string, unknown>,
  ): Promise<{
    suggestedIdentity?: string;
    reasons: string[];
    benefits: string[];
  }> {
    const recommendations = {
      suggestedIdentity: undefined as string | undefined,
      reasons: [] as string[],
      benefits: [] as string[],
    };

    if (currentIdentity.type === 'User') {
      if (context?.complexityLevel === 'high' || context?.optimizationNeeded) {
        recommendations.suggestedIdentity = 'Superviseur';
        recommendations.reasons.push('Complex tasks detected that could benefit from optimization suggestions');
        recommendations.benefits.push('Access to advanced optimization analysis');
        recommendations.benefits.push('Alternative solution suggestions');
      }
    } else if (currentIdentity.type === 'Superviseur') {
      if (context?.qualityControlNeeded || context?.projectManagement) {
        recommendations.suggestedIdentity = 'Responsable';
        recommendations.reasons.push('Quality control and project management tasks detected');
        recommendations.benefits.push('Comprehensive quality validation');
        recommendations.benefits.push('Administrative controls and oversight');
      }
    }

    return recommendations;
  }

  getCacheStats(): { size: number; hitRate: number } {
    const stats = this.characteristicsCache.getStats();
    return {
      size: stats.size,
      hitRate: stats.hitRate,
    };
  }

  clearCharacteristicsCache(): void {
    this.characteristicsCache.clear();
  }

  private createCharacteristicsCacheKey(identity: UserIdentity): string {
    const keyParts = [
      identity.type,
      identity.preferences.responseStyle,
      identity.preferences.technicalLevel,
      identity.customizations.length.toString(),
    ];
    return keyParts.join('|');
  }

  private customizeProfileWithPreferences(profile: IdentityProfile, preferences: IdentityPreferences): IdentityProfile {
    const customizedProfile = { ...profile };

    if (preferences.responseStyle === 'concise') {
      customizedProfile.description += ' (Mode concis activé)';
    } else if (preferences.responseStyle === 'detailed') {
      customizedProfile.description += ' (Mode détaillé activé)';
    }

    if (preferences.technicalLevel === 'advanced') {
      customizedProfile.capabilities = [...customizedProfile.capabilities, 'advanced_technical_analysis'];
    } else if (preferences.technicalLevel === 'basic') {
      customizedProfile.capabilities = customizedProfile.capabilities.filter((cap) => !cap.includes('advanced'));
    }

    return customizedProfile;
  }

  private createDefaultUserIdentity(): UserIdentity {
    return {
      type: 'User',
      permissions: [
        {
          action: 'read',
          resource: 'templates',
        },
        {
          action: 'read',
          resource: 'prompts',
        },
        {
          action: 'basic_operation',
          resource: 'preferences',
        },
      ],
      preferences: {
        language: 'fr',
        responseStyle: 'balanced',
        technicalLevel: 'intermediate',
      },
      customizations: [],
    };
  }
}
