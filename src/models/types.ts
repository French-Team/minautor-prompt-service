// Centralized type definitions for identity-based prompts system

// Identity types
export type UserIdentityType = 'User' | 'Superviseur' | 'Responsable';

export const USER_IDENTITY_TYPES: UserIdentityType[] = ['User', 'Superviseur', 'Responsable'];

// Response style types
export type ResponseStyle = 'concise' | 'detailed' | 'balanced';

export const RESPONSE_STYLES: ResponseStyle[] = ['concise', 'detailed', 'balanced'];

// Technical level types
export type TechnicalLevel = 'basic' | 'intermediate' | 'advanced';

export const TECHNICAL_LEVELS: TechnicalLevel[] = ['basic', 'intermediate', 'advanced'];

// Optimization area types
export type OptimizationArea = 'performance' | 'security' | 'maintainability' | 'usability';

export const OPTIMIZATION_AREAS: OptimizationArea[] = ['performance', 'security', 'maintainability', 'usability'];

// Quality check types
export type QualityCheckType = 'syntax' | 'logic' | 'security' | 'performance' | 'standards';

export const QUALITY_CHECK_TYPES: QualityCheckType[] = ['syntax', 'logic', 'security', 'performance', 'standards'];

// Severity level types
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export const SEVERITY_LEVELS: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

// Generic identifiers
export type TemplateId = string;
export type UserId = string;
export type PermissionAction = string;
export type PermissionResource = string;
