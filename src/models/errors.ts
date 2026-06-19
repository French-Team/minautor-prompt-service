// Comprehensive error types for the identity-based prompts system

export enum ErrorCategory {
  CONTEXT = 'CONTEXT',
  RULE = 'RULE',
  TEMPLATE = 'TEMPLATE',
  AGENT = 'AGENT',
  IDENTITY = 'IDENTITY',
  VALIDATION = 'VALIDATION',
  SYSTEM = 'SYSTEM',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Base error class for all system errors
export abstract class SystemError extends Error {
  abstract readonly category: ErrorCategory;
  abstract readonly code: string;
  abstract readonly severity: ErrorSeverity;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
    public override readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      code: this.code,
      severity: this.severity,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

// Context-related errors
export class ContextError extends SystemError {
  readonly category = ErrorCategory.CONTEXT;

  constructor(
    message: string,
    public readonly code: 'CONTEXT_INSUFFICIENT' | 'CONTEXT_INVALID' | 'CONTEXT_ANALYSIS_FAILED' | 'FLOW_STATE_INVALID',
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, context, cause);
  }
}

// Rule-related errors
export class RuleError extends SystemError {
  readonly category = ErrorCategory.RULE;

  constructor(
    message: string,
    public readonly code: 'RULE_CONFLICT' | 'RULE_VALIDATION_FAILED' | 'RULE_APPLICATION_FAILED' | 'RULE_NOT_FOUND',
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, context, cause);
  }
}

// Template-related errors
export class TemplateError extends SystemError {
  readonly category = ErrorCategory.TEMPLATE;

  constructor(
    message: string,
    public readonly code:
      | 'TEMPLATE_NOT_FOUND'
      | 'TEMPLATE_MALFORMED'
      | 'TEMPLATE_VARIABLE_MISSING'
      | 'TEMPLATE_VALIDATION_FAILED',
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, context, cause);
  }
}

// Agent adaptation errors
export class AgentError extends SystemError {
  readonly category = ErrorCategory.AGENT;

  constructor(
    message: string,
    public readonly code:
      | 'AGENT_NOT_SUPPORTED'
      | 'AGENT_ADAPTATION_FAILED'
      | 'AGENT_UNAVAILABLE'
      | 'AGENT_CAPABILITY_MISSING',
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, context, cause);
  }
}

// Identity-related errors
export class IdentityError extends SystemError {
  readonly category = ErrorCategory.IDENTITY;

  constructor(
    message: string,
    public readonly code:
      | 'IDENTITY_NOT_FOUND'
      | 'IDENTITY_INVALID'
      | 'IDENTITY_PERMISSION_DENIED'
      | 'IDENTITY_RESOLUTION_FAILED',
    public readonly severity: ErrorSeverity = ErrorSeverity.HIGH,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, context, cause);
  }
}

// Validation errors
export class ValidationError extends SystemError {
  readonly category = ErrorCategory.VALIDATION;

  constructor(
    message: string,
    public readonly code: 'VALIDATION_FAILED' | 'FIELD_REQUIRED' | 'FIELD_INVALID' | 'CONSTRAINT_VIOLATION',
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, context, cause);
  }
}

// System-level errors
export class SystemLevelError extends SystemError {
  readonly category = ErrorCategory.SYSTEM;

  constructor(
    message: string,
    public readonly code: 'CONFIGURATION_ERROR' | 'DEPENDENCY_UNAVAILABLE' | 'RESOURCE_EXHAUSTED' | 'INTERNAL_ERROR',
    public readonly severity: ErrorSeverity = ErrorSeverity.CRITICAL,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, context, cause);
  }
}

// Error recovery result types
export interface RecoveryResult<T> {
  success: boolean;
  value?: T;
  fallbackUsed: boolean;
  recoveryStrategy: string;
  warnings?: string[];
}

export interface ErrorHandlingOptions {
  enableFallback: boolean;
  notifyUser: boolean;
  logError: boolean;
  retryCount?: number;
  timeout?: number;
}
