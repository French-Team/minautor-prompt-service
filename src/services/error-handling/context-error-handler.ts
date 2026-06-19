// Context error handler with fallback mechanisms

import type { Result } from '../../models/result';
import { success, failure } from '../../models/result';
import type { SystemError, RecoveryResult, ErrorHandlingOptions, ContextError } from '../../models/errors';
import { ErrorCategory } from '../../models/errors';
import { ErrorHandler } from './error-handler-chain';
import type { ProjectContext } from '../../models/context';

/**
 * Retourne le CWD de façon sécurisée (process.cwd peut ne pas exister côté client).
 * Dupliqué depuis context-analyzer.ts pour éviter une dépendance circulaire.
 */
function safeCwd(): string {
  if (typeof process !== 'undefined' && typeof (process as { cwd?: () => string }).cwd === 'function') {
    return (process as { cwd: () => string }).cwd();
  }
  return '.';
}

export interface ContextRecoveryContext {
  originalContext?: ProjectContext;
  fallbackContext?: ProjectContext;
  requestedOperation: string;
}

export class ContextErrorHandler extends ErrorHandler<ContextRecoveryContext> {
  protected canHandle(error: SystemError): boolean {
    return error.category === ErrorCategory.CONTEXT;
  }

  protected async handleError(
    error: SystemError,
    context: ContextRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<ContextRecoveryContext>, SystemError>> {
    const contextError = error as ContextError;

    switch (contextError.code) {
      case 'CONTEXT_INSUFFICIENT':
        return this.handleInsufficientContext(contextError, context, options);

      case 'CONTEXT_INVALID':
        return this.handleInvalidContext(contextError, context, options);

      case 'CONTEXT_ANALYSIS_FAILED':
        return this.handleAnalysisFailure(contextError, context, options);

      case 'FLOW_STATE_INVALID':
        return this.handleInvalidFlowState(contextError, context, options);

      default:
        return failure(contextError);
    }
  }

  private async handleInsufficientContext(
    error: ContextError,
    context: ContextRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<ContextRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Create minimal fallback context
    const fallbackContext: ProjectContext = {
      workFolder: {
        path: safeCwd(),
        name: 'unknown-project',
        type: 'project',
        technologies: [],
        lastModified: new Date(),
      },
      activeFlows: [],
      availableTools: [],
      projectState: {
        phase: 'development',
        completionPercentage: 0,
        activeFeatures: [],
        blockers: [],
      },
      technicalEcosystem: {
        framework: 'unknown',
        language: 'typescript',
        runtime: 'node',
        dependencies: [],
        buildTools: [],
      },
    };

    const recoveryResult: RecoveryResult<ContextRecoveryContext> = {
      success: true,
      value: {
        ...context,
        fallbackContext,
      },
      fallbackUsed: true,
      recoveryStrategy: 'minimal-context-fallback',
      warnings: [
        'Using minimal context due to insufficient project information',
        'Some features may be limited with fallback context',
      ],
    };

    return success(recoveryResult);
  }

  private async handleInvalidContext(
    error: ContextError,
    context: ContextRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<ContextRecoveryContext>, SystemError>> {
    if (!options.enableFallback || !context.originalContext) {
      return failure(error);
    }

    // Attempt to sanitize the context
    const sanitizedContext = this.sanitizeContext(context.originalContext);

    const recoveryResult: RecoveryResult<ContextRecoveryContext> = {
      success: true,
      value: {
        ...context,
        fallbackContext: sanitizedContext,
      },
      fallbackUsed: true,
      recoveryStrategy: 'context-sanitization',
      warnings: ['Context was sanitized to remove invalid elements', 'Some context information may have been lost'],
    };

    return success(recoveryResult);
  }

  private async handleAnalysisFailure(
    error: ContextError,
    context: ContextRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<ContextRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Use cached context if available, otherwise create basic context
    const fallbackContext = context.originalContext || (await this.createBasicContext());

    const recoveryResult: RecoveryResult<ContextRecoveryContext> = {
      success: true,
      value: {
        ...context,
        fallbackContext,
      },
      fallbackUsed: true,
      recoveryStrategy: 'analysis-bypass',
      warnings: [
        'Context analysis failed, using cached or basic context',
        'Context may not reflect current project state',
      ],
    };

    return success(recoveryResult);
  }

  private async handleInvalidFlowState(
    error: ContextError,
    context: ContextRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<ContextRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Reset flow state to safe defaults
    const contextWithResetFlows: ProjectContext = {
      ...context.originalContext!,
      activeFlows: [], // Clear invalid flows
    };

    const recoveryResult: RecoveryResult<ContextRecoveryContext> = {
      success: true,
      value: {
        ...context,
        fallbackContext: contextWithResetFlows,
      },
      fallbackUsed: true,
      recoveryStrategy: 'flow-state-reset',
      warnings: ['Invalid flow state detected and reset', 'Active flows have been cleared'],
    };

    return success(recoveryResult);
  }

  private sanitizeContext(context: ProjectContext): ProjectContext {
    return {
      workFolder: {
        ...context.workFolder,
        type: context.workFolder.type || 'project',
        technologies: context.workFolder.technologies || [],
      },
      activeFlows: context.activeFlows.filter((flow) => flow.id && flow.name && flow.status),
      availableTools: context.availableTools.filter((tool) => tool.name && tool.version),
      projectState: {
        ...context.projectState,
        phase: ['planning', 'development', 'testing', 'deployment', 'maintenance'].includes(context.projectState.phase)
          ? context.projectState.phase
          : 'development',
      },
      technicalEcosystem: {
        ...context.technicalEcosystem,
        framework: context.technicalEcosystem.framework || 'unknown',
        language: context.technicalEcosystem.language || 'typescript',
        runtime: context.technicalEcosystem.runtime || 'node',
      },
    };
  }

  private async createBasicContext(): Promise<ProjectContext> {
    return {
      workFolder: {
        path: safeCwd(),
        name: 'current-project',
        type: 'project',
        technologies: ['typescript'],
        lastModified: new Date(),
      },
      activeFlows: [],
      availableTools: [],
      projectState: {
        phase: 'development',
        completionPercentage: 0,
        activeFeatures: [],
        blockers: [],
      },
      technicalEcosystem: {
        framework: 'typescript',
        language: 'typescript',
        runtime: 'node',
        dependencies: [],
        buildTools: ['tsc'],
      },
    };
  }
}
