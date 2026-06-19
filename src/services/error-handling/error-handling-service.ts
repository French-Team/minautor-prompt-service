// Main error handling service that orchestrates all error handlers

import type { Result } from '../../models/result';
import { success, failure } from '../../models/result';
import type { SystemError, RecoveryResult, ErrorHandlingOptions } from '../../models/errors';
import type { ErrorHandlerRegistry } from './error-handler-chain';
import { errorHandlerRegistry } from './error-handler-chain';
import { ContextErrorHandler } from './context-error-handler';
import { RuleErrorHandler } from './rule-error-handler';
import { TemplateErrorHandler } from './template-error-handler';
import { AgentErrorHandler } from './agent-error-handler';
import { notificationService } from './notification-service';
import { loggingService } from './logging-service';
import { monitoringService } from './monitoring-service';

export interface ErrorHandlingServiceOptions {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableUserNotification?: boolean;
  defaultFallbackEnabled?: boolean;
  maxRetryAttempts?: number;
  retryDelayMs?: number;
}

export class ErrorHandlingService {
  private readonly registry: ErrorHandlerRegistry;
  private readonly options: Required<ErrorHandlingServiceOptions>;

  constructor(options: ErrorHandlingServiceOptions = {}) {
    this.registry = errorHandlerRegistry;
    this.options = {
      enableLogging: options.enableLogging ?? true,
      enableMetrics: options.enableMetrics ?? true,
      enableUserNotification: options.enableUserNotification ?? true,
      defaultFallbackEnabled: options.defaultFallbackEnabled ?? true,
      maxRetryAttempts: options.maxRetryAttempts ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
    };

    this.initializeHandlerChains();
  }

  /**
   * Handle any system error with appropriate recovery strategy
   */
  async handleError<T>(
    error: SystemError,
    context: T,
    options?: Partial<ErrorHandlingOptions>,
  ): Promise<Result<RecoveryResult<T>, SystemError>> {
    const startTime = Date.now();

    const handlingOptions: ErrorHandlingOptions = {
      enableFallback: options?.enableFallback ?? this.options.defaultFallbackEnabled,
      notifyUser: options?.notifyUser ?? this.options.enableUserNotification,
      logError: options?.logError ?? this.options.enableLogging,
      retryCount: options?.retryCount ?? 0,
      timeout: options?.timeout ?? 30000,
    };

    // Log the error if enabled
    if (handlingOptions.logError) {
      loggingService.logError(error, context as Record<string, unknown>);
    }

    // Record error in monitoring
    if (this.options.enableMetrics) {
      monitoringService.recordError(error, context as Record<string, unknown>);
    }

    // Determine the appropriate handler chain
    const chainName = this.getHandlerChainName(error);

    // Attempt recovery with retry logic
    let lastError = error;
    for (let attempt = 0; attempt <= this.options.maxRetryAttempts; attempt++) {
      const result = await this.registry.handleError(chainName, lastError, context, handlingOptions);

      if (result.success) {
        const recoveryTime = Date.now() - startTime;

        // Log successful recovery
        if (handlingOptions.logError) {
          loggingService.logRecovery(error, result._value, recoveryTime);
        }

        // Record recovery metrics
        if (this.options.enableMetrics) {
          monitoringService.recordRecovery(error, result._value, recoveryTime);
        }

        // Notify user if requested
        if (handlingOptions.notifyUser && result._value.fallbackUsed) {
          notificationService.notifyErrorRecovery(error, result._value, {
            includeDetails: true,
            includeRecoveryActions: true,
          });
        }

        return result;
      }

      // If this was the last attempt, break
      if (attempt === this.options.maxRetryAttempts) {
        break;
      }

      // Wait before retrying
      await this.delay(this.options.retryDelayMs * (attempt + 1));
      lastError = result._error;
    }

    // All recovery attempts failed
    const recoveryStrategy = `failed-after-${this.options.maxRetryAttempts + 1}-attempts`;

    if (handlingOptions.logError) {
      loggingService.logRecoveryFailure(error, recoveryStrategy, lastError.message);
    }

    if (this.options.enableMetrics) {
      monitoringService.recordRecoveryFailure(error, recoveryStrategy);
    }

    if (handlingOptions.notifyUser) {
      notificationService.notifyRecoveryFailure(error, {
        includeDetails: true,
      });
    }

    return failure(lastError);
  }

  /**
   * Handle multiple errors in batch
   */
  async handleErrors<T>(
    errors: SystemError[],
    contexts: T[],
    options?: Partial<ErrorHandlingOptions>,
  ): Promise<Result<RecoveryResult<T>[], SystemError[]>> {
    if (errors.length !== contexts.length) {
      throw new Error('Errors and contexts arrays must have the same length');
    }

    const results: RecoveryResult<T>[] = [];
    const failedErrors: SystemError[] = [];

    // Process errors in parallel for better performance
    const promises = errors.map((error, index) => this.handleError(error, contexts[index], options));

    const settledResults = await Promise.allSettled(promises);

    for (let i = 0; i < settledResults.length; i++) {
      const result = settledResults[i];

      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.push(result.value._value);
        } else {
          failedErrors.push(errors[i]);
          // Add a placeholder result for failed errors
          results.push({
            success: false,
            fallbackUsed: false,
            recoveryStrategy: 'failed',
            warnings: ['Error recovery failed'],
          });
        }
      } else {
        // Promise was rejected
        failedErrors.push(errors[i]);
        results.push({
          success: false,
          fallbackUsed: false,
          recoveryStrategy: 'promise-rejected',
          warnings: ['Promise rejected during error handling'],
        });
      }
    }

    if (failedErrors.length === 0) {
      return success(results);
    }

    return failure(failedErrors);
  }

  /**
   * Check if an error can be recovered
   */
  canRecover(error: SystemError): boolean {
    const chainName = this.getHandlerChainName(error);
    const chain = this.registry.getChain(chainName);
    return chain !== undefined;
  }

  /**
   * Get recovery strategies available for an error
   */
  getAvailableStrategies(error: SystemError): string[] {
    // This would be implemented based on the specific error type and handlers
    const strategies: string[] = [];

    switch (error.category) {
      case 'CONTEXT':
        strategies.push('minimal-context-fallback', 'context-sanitization', 'analysis-bypass');
        break;
      case 'RULE':
        strategies.push('priority-based-conflict-resolution', 'skip-invalid-rules', 'simplified-rule-application');
        break;
      case 'TEMPLATE':
        strategies.push('fallback-template-substitution', 'template-repair', 'default-variable-substitution');
        break;
      case 'AGENT':
        strategies.push('generic-adaptation', 'alternative-agent', 'capability-simplification');
        break;
    }

    return strategies;
  }

  private initializeHandlerChains(): void {
    // Create and register handler chains for each error category

    // Context error chain
    const contextHandler = new ContextErrorHandler();
    this.registry.registerChain('context', contextHandler);

    // Rule error chain
    const ruleHandler = new RuleErrorHandler();
    this.registry.registerChain('rule', ruleHandler);

    // Template error chain
    const templateHandler = new TemplateErrorHandler();
    this.registry.registerChain('template', templateHandler);

    // Agent error chain
    const agentHandler = new AgentErrorHandler();
    this.registry.registerChain('agent', agentHandler);

    // You could chain multiple handlers together if needed:
    // contextHandler.setNext(ruleHandler).setNext(templateHandler)
  }

  private getHandlerChainName(error: SystemError): string {
    return error.category.toLowerCase();
  }

  /**
   * Get comprehensive error handling statistics
   */
  getStatistics(): {
    logging: ReturnType<typeof loggingService.getMetrics>;
    monitoring: ReturnType<typeof monitoringService.getDashboardMetrics>;
    notifications: { active: number; total: number };
  } {
    return {
      logging: loggingService.getMetrics(),
      monitoring: monitoringService.getDashboardMetrics(),
      notifications: {
        active: notificationService.getNotifications().length,
        total: notificationService.getNotifications().length,
      },
    };
  }

  /**
   * Export all error handling data for analysis
   */
  exportData(): {
    logs: string;
    metrics: string;
    alerts: ReturnType<typeof monitoringService.getAllAlerts>;
  } {
    return {
      logs: loggingService.exportLogs('json'),
      metrics: monitoringService.exportMetrics('json'),
      alerts: monitoringService.getAllAlerts(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
