// Unit tests for ErrorHandlingService

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandlingService } from '../../../services/error-handling/error-handling-service';
import { ContextError, RuleError, TemplateError, AgentError, ErrorSeverity } from '../../../models/errors';
import { isSuccess, isFailure } from '../../../models/result';

describe('ErrorHandlingService', () => {
  let errorHandlingService: ErrorHandlingService;

  beforeEach(() => {
    errorHandlingService = new ErrorHandlingService({
      enableLogging: false, // Disable for tests
      enableMetrics: false,
      enableUserNotification: false,
      maxRetryAttempts: 2,
      retryDelayMs: 10,
    });
  });

  describe('handleError', () => {
    it('should handle context errors with fallback', async () => {
      const contextError = new ContextError('Context analysis failed', 'CONTEXT_ANALYSIS_FAILED', ErrorSeverity.MEDIUM);

      const context = {
        requestedOperation: 'analyze-context',
        originalContext: undefined,
      };

      const result = await errorHandlingService.handleError(contextError, context);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.success).toBe(true);
        expect(result._value.fallbackUsed).toBe(true);
        expect(result._value.recoveryStrategy).toBe('analysis-bypass');
        expect(result._value.warnings).toBeDefined();
      }
    });

    it('should handle rule conflicts with priority resolution', async () => {
      const ruleError = new RuleError('Rule conflict detected', 'RULE_CONFLICT', ErrorSeverity.MEDIUM);

      const context = {
        conflictingRules: [
          {
            id: 'rule1',
            name: 'High Priority Rule',
            category: 'validation',
            conditions: [],
            actions: [],
            metadata: { priority: 10 },
          },
          {
            id: 'rule2',
            name: 'Low Priority Rule',
            category: 'validation',
            conditions: [],
            actions: [],
            metadata: { priority: 5 },
          },
        ],
        requestedOperation: 'apply-rules',
      };

      const result = await errorHandlingService.handleError(ruleError, context);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.success).toBe(true);
        expect(result._value.fallbackUsed).toBe(true);
        expect(result._value.recoveryStrategy).toBe('priority-based-conflict-resolution');
      }
    });

    it('should handle template errors with fallback templates', async () => {
      const templateError = new TemplateError('Template not found', 'TEMPLATE_NOT_FOUND', ErrorSeverity.MEDIUM);

      const context = {
        templateId: 'missing-template',
        identityType: 'User' as const,
        requestedOperation: 'generate-prompt',
      };

      const result = await errorHandlingService.handleError(templateError, context);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.success).toBe(true);
        expect(result._value.fallbackUsed).toBe(true);
        expect(result._value.recoveryStrategy).toBe('fallback-template-substitution');
        expect((result._value.value as Record<string, unknown>)?.requestedTemplate).toBeDefined();
      }
    });

    it('should handle agent errors with generic adaptation', async () => {
      const agentError = new AgentError('Agent not supported', 'AGENT_NOT_SUPPORTED', ErrorSeverity.MEDIUM);

      const context = {
        targetAgent: 'unsupported-agent' as string,
        promptContent: 'Test prompt content',
        requestedOperation: 'adapt-prompt',
      };

      const result = await errorHandlingService.handleError(agentError, context);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.success).toBe(true);
        expect(result._value.fallbackUsed).toBe(true);
        expect(result._value.recoveryStrategy).toBe('generic-adaptation');
      }
    });

    it('should retry failed recovery attempts', async () => {
      const contextError = new ContextError('Context insufficient', 'CONTEXT_INSUFFICIENT', ErrorSeverity.HIGH);

      const context = {
        requestedOperation: 'test-retry',
      };

      // Mock the handler to fail first attempts
      let attemptCount = 0;
      const originalHandle = errorHandlingService['registry'].handleError;
      vi.spyOn(errorHandlingService['registry'], 'handleError').mockImplementation(async (...args) => {
        attemptCount++;
        if (attemptCount <= 2) {
          // Fail first two attempts
          return { success: false as false, _error: contextError } as import('../../../models/result').Failure<
            import('../../../models/errors').SystemError
          >;
        }
        // Succeed on third attempt
        return originalHandle.apply(errorHandlingService['registry'], args);
      });

      const result = await errorHandlingService.handleError(contextError, context);

      expect(attemptCount).toBe(3); // Initial + 2 retries
      expect(isSuccess(result)).toBe(true);
    });

    it('should fail after max retry attempts', async () => {
      const contextError = new ContextError('Unrecoverable error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.CRITICAL);

      const context = {
        requestedOperation: 'test-failure',
      };

      // Mock the handler to always fail
      vi.spyOn(errorHandlingService['registry'], 'handleError').mockResolvedValue({
        success: false as false,
        _error: contextError,
      } as import('../../../models/result').Failure<import('../../../models/errors').SystemError>);

      const result = await errorHandlingService.handleError(contextError, context, {
        enableFallback: false,
      });

      expect(isFailure(result)).toBe(true);
    });

    it('should handle errors without fallback when disabled', async () => {
      const contextError = new ContextError('Context error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);

      const context = {
        requestedOperation: 'no-fallback-test',
      };

      const result = await errorHandlingService.handleError(contextError, context, {
        enableFallback: false,
      });

      expect(isFailure(result)).toBe(true);
    });
  });

  describe('handleErrors (batch)', () => {
    it('should handle multiple errors in batch', async () => {
      const errors = [
        new ContextError('Context error 1', 'CONTEXT_ANALYSIS_FAILED', ErrorSeverity.MEDIUM),
        new RuleError('Rule error 1', 'RULE_CONFLICT', ErrorSeverity.MEDIUM),
        new TemplateError('Template error 1', 'TEMPLATE_NOT_FOUND', ErrorSeverity.MEDIUM),
      ];

      const contexts = [
        { requestedOperation: 'context-op' },
        {
          requestedOperation: 'rule-op',
          conflictingRules: [
            {
              id: 'rule1',
              name: 'Test Rule',
              category: 'test',
              conditions: [],
              actions: [],
              metadata: { priority: 5 },
            },
          ],
        },
        { requestedOperation: 'template-op', identityType: 'User' as const },
      ];

      const result = await errorHandlingService.handleErrors(errors, contexts, {
        enableFallback: true,
      });

      // The batch handler may fail if individual handlers fail, but should still return results
      if (isFailure(result)) {
        // Even if batch fails, we should get some results
        expect(result._error).toBeDefined();
        expect(Array.isArray(result._error)).toBe(true);
      } else {
        expect(result._value).toHaveLength(3);
      }
    });

    it('should handle mismatched arrays', async () => {
      const errors = [new ContextError('Error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM)];
      const contexts = [{ op: 'test' }, { op: 'test2' }];

      await expect(errorHandlingService.handleErrors(errors, contexts)).rejects.toThrow(
        'Errors and contexts arrays must have the same length',
      );
    });
  });

  describe('canRecover', () => {
    it('should return true for recoverable errors', () => {
      const contextError = new ContextError('Context error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);

      expect(errorHandlingService.canRecover(contextError)).toBe(true);
    });

    it('should return false for unhandled error categories', () => {
      // Create a custom error that doesn't have a handler
      interface TestError {
        category: 'UNKNOWN';
        code: string;
        severity: ErrorSeverity;
        message: string;
        name: string;
        toJSON: () => Record<string, unknown>;
      }

      const customError: TestError = {
        category: 'UNKNOWN',
        code: 'UNKNOWN_ERROR',
        severity: ErrorSeverity.MEDIUM,
        message: 'Unknown error',
        name: 'UnknownError',
        toJSON: () => ({}),
      };

      expect(
        errorHandlingService.canRecover(customError as unknown as import('../../../models/errors').SystemError),
      ).toBe(false);
    });
  });

  describe('getAvailableStrategies', () => {
    it('should return context strategies for context errors', () => {
      const contextError = new ContextError('Context error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);

      const strategies = errorHandlingService.getAvailableStrategies(contextError);

      expect(strategies).toContain('minimal-context-fallback');
      expect(strategies).toContain('context-sanitization');
      expect(strategies).toContain('analysis-bypass');
    });

    it('should return rule strategies for rule errors', () => {
      const ruleError = new RuleError('Rule error', 'RULE_CONFLICT', ErrorSeverity.MEDIUM);

      const strategies = errorHandlingService.getAvailableStrategies(ruleError);

      expect(strategies).toContain('priority-based-conflict-resolution');
      expect(strategies).toContain('skip-invalid-rules');
      expect(strategies).toContain('simplified-rule-application');
    });

    it('should return template strategies for template errors', () => {
      const templateError = new TemplateError('Template error', 'TEMPLATE_NOT_FOUND', ErrorSeverity.MEDIUM);

      const strategies = errorHandlingService.getAvailableStrategies(templateError);

      expect(strategies).toContain('fallback-template-substitution');
      expect(strategies).toContain('template-repair');
      expect(strategies).toContain('default-variable-substitution');
    });

    it('should return agent strategies for agent errors', () => {
      const agentError = new AgentError('Agent error', 'AGENT_NOT_SUPPORTED', ErrorSeverity.MEDIUM);

      const strategies = errorHandlingService.getAvailableStrategies(agentError);

      expect(strategies).toContain('generic-adaptation');
      expect(strategies).toContain('alternative-agent');
      expect(strategies).toContain('capability-simplification');
    });
  });
});
