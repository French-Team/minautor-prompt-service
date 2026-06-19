// Core data models for identity-based prompts system
export * from './identity';
export * from './prompt';
export * from './context';
export * from './template';
export * from './version';
export * from './agent';
export * from './rule';
export * from './result';

// Export errors with explicit naming to avoid conflicts
export {
  SystemError,
  ContextError,
  TemplateError,
  AgentError,
  IdentityError,
  SystemLevelError,
  ErrorCategory,
  ErrorSeverity,
} from './errors';

export type { RecoveryResult, ErrorHandlingOptions } from './errors';

// Re-export specific error types to avoid naming conflicts
export { RuleError as RuleSystemError, ValidationError as ValidationSystemError } from './errors';
