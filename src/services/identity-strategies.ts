// Identity Strategy Pattern - Modular strategy classes for each identity type

import type {
  IdentityProfile,
  UserProfile,
  SuperviseurProfile,
  ResponsableProfile,
  Permission,
} from '../models/identity';

export interface IdentityStrategy {
  getDefaultProfile(): IdentityProfile;
  validatePermissions(permissions: Permission[], action: string): boolean;
  getCapabilities(): string[];
}

export class UserIdentityStrategy implements IdentityStrategy {
  getDefaultProfile(): UserProfile {
    return {
      identityType: 'User',
      displayName: 'Utilisateur Standard',
      description: 'Utilisateur standard avec accès de base',
      capabilities: ['basic_operations', 'simple_prompt_generation', 'basic_customization', 'standard_templates'],
      simplificationLevel: 'basic',
      preferredResponseLength: 'short',
      technicalDepth: 'minimal',
    };
  }

  validatePermissions(permissions: Permission[], action: string): boolean {
    // User can do basic operations
    const allowedActions = ['read', 'query', 'basic_operation', 'use_template'];
    if (allowedActions.includes(action)) return true;
    return permissions.some((p) => p.action === action);
  }

  getCapabilities(): string[] {
    return ['simple_prompt_generation', 'basic_customization', 'standard_templates'];
  }
}

export class SuperviseurIdentityStrategy implements IdentityStrategy {
  getDefaultProfile(): SuperviseurProfile {
    return {
      identityType: 'Superviseur',
      displayName: 'Superviseur',
      description: "Superviseur avec capacités d'optimisation",
      capabilities: [
        'optimization_suggestions',
        'advanced_prompt_generation',
        'optimization_analysis',
        'alternative_suggestions',
      ],
      optimizationFocus: ['performance', 'security', 'maintainability'],
      suggestionLevel: 'conservative',
      alternativeCount: 3,
    };
  }

  validatePermissions(permissions: Permission[], action: string): boolean {
    // Superviseur can do basic and optimization actions
    const allowedActions = ['read', 'query', 'basic_operation', 'optimize', 'suggest', 'analyze', 'use_template'];
    if (allowedActions.includes(action)) return true;
    return permissions.some((p) => p.action === action);
  }

  getCapabilities(): string[] {
    return ['advanced_prompt_generation', 'optimization_analysis', 'alternative_suggestions'];
  }
}

export class ResponsableIdentityStrategy implements IdentityStrategy {
  getDefaultProfile(): ResponsableProfile {
    return {
      identityType: 'Responsable',
      displayName: 'Responsable Projet',
      description: 'Responsable avec contrôle qualité et validation',
      capabilities: [
        'quality_control',
        'comprehensive_prompt_generation',
        'quality_validation',
        'administrative_controls',
      ],
      qualityChecks: ['syntax', 'logic', 'security', 'performance', 'standards'],
      riskTolerance: 'low',
      validationRequirements: [
        { type: 'quality', severity: 'error', description: 'Quality standards must be met' },
        { type: 'security', severity: 'error', description: 'Security requirements must be satisfied' },
      ],
    };
  }

  validatePermissions(permissions: Permission[], action: string): boolean {
    // Responsable can do all actions
    const allowedActions = [
      'read',
      'query',
      'basic_operation',
      'optimize',
      'suggest',
      'analyze',
      'validate',
      'administrative',
      'delete',
      'rollback',
      'use_template',
    ];
    if (allowedActions.includes(action)) return true;
    return permissions.some((p) => p.action === action);
  }

  getCapabilities(): string[] {
    return ['comprehensive_prompt_generation', 'quality_validation', 'administrative_controls'];
  }
}
