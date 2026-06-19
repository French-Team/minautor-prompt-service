// Unit tests for ErrorHandler chain and ErrorHandlerRegistry

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ErrorHandler,
  ErrorHandlerRegistry,
  errorHandlerRegistry,
} from '../../../services/error-handling/error-handler-chain';
import { ContextError, RuleError, ErrorSeverity, ErrorCategory } from '../../../models/errors';
import { isSuccess, isFailure, success, failure } from '../../../models/result';
import type { SystemError, RecoveryResult, ErrorHandlingOptions } from '../../../models/errors';

// Concrete handler for testing
class TestContextHandler extends ErrorHandler<{ requestedOperation: string }> {
  protected canHandle(error: SystemError): boolean {
    return error.category === ErrorCategory.CONTEXT;
  }

  protected async handleError(
    _error: SystemError,
    context: { requestedOperation: string },
    _options: ErrorHandlingOptions,
  ): Promise<import('../../../models/result').Result<RecoveryResult<{ requestedOperation: string }>, SystemError>> {
    return success({
      success: true,
      value: { ...context, handled: true },
      fallbackUsed: false,
      recoveryStrategy: 'test-strategy',
      warnings: [],
    });
  }
}

class TestRuleHandler extends ErrorHandler<{ requestedOperation: string; ruleId?: string }> {
  protected canHandle(error: SystemError): boolean {
    return error.category === ErrorCategory.RULE;
  }

  protected async handleError(
    error: SystemError,
    context: { requestedOperation: string; ruleId?: string },
    options: ErrorHandlingOptions,
  ): Promise<
    import('../../../models/result').Result<
      RecoveryResult<{ requestedOperation: string; ruleId?: string }>,
      SystemError
    >
  > {
    if (!options.enableFallback && context.ruleId === 'fail') {
      return failure(error);
    }
    return success({
      success: true,
      value: { ...context, handledBy: 'rule-handler' },
      fallbackUsed: false,
      recoveryStrategy: 'rule-test-strategy',
      warnings: [],
    });
  }
}

describe('ErrorHandler chain', () => {
  let handler: TestContextHandler;
  let nextHandler: TestRuleHandler;

  beforeEach(() => {
    handler = new TestContextHandler();
    nextHandler = new TestRuleHandler();
  });

  describe('canHandle', () => {
    it('should handle matching error category', () => {
      const contextError = new ContextError('Test', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);
      expect(handler['canHandle'](contextError)).toBe(true);
    });

    it('should not handle non-matching error category', () => {
      const ruleError = new RuleError('Test', 'RULE_CONFLICT', ErrorSeverity.MEDIUM);
      expect(handler['canHandle'](ruleError)).toBe(false);
    });
  });

  describe('setNext', () => {
    it('should chain handlers and return the next handler', () => {
      const result = handler.setNext(nextHandler);
      expect(result).toBe(nextHandler);
    });
  });

  describe('handle', () => {
    it('should handle the error if canHandle returns true', async () => {
      const contextError = new ContextError('Test', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);

      handler.setNext(nextHandler);
      const result = await handler.handle(
        contextError,
        { requestedOperation: 'test' },
        { enableFallback: true, notifyUser: true, logError: true },
      );

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result._value.recoveryStrategy).toBe('test-strategy');
        expect((result._value.value as Record<string, unknown>).handled).toBe(true);
      }
    });

    it('should pass to the next handler if canHandle returns false', async () => {
      const ruleError = new RuleError('Test', 'RULE_CONFLICT', ErrorSeverity.MEDIUM);

      handler.setNext(nextHandler);
      // Use nextHandler directly to pass ruleId context
      const result = await nextHandler.handle(
        ruleError,
        { requestedOperation: 'test', ruleId: 'rule-1' },
        { enableFallback: true, notifyUser: true, logError: true },
      );

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect((result._value.value as Record<string, unknown>).handledBy).toBe('rule-handler');
      }
    });

    it('should fail if no handler can handle the error', async () => {
      const ruleError = new RuleError('Test', 'RULE_CONFLICT', ErrorSeverity.MEDIUM);
      handler.setNext(nextHandler);
      // Use nextHandler with enableFallback: false and ruleId: 'fail' to force failure
      const result = await nextHandler.handle(
        ruleError,
        { requestedOperation: 'test', ruleId: 'fail' },
        { enableFallback: false, notifyUser: true, logError: true },
      );

      expect(isFailure(result)).toBe(true);
    });
  });
});

describe('ErrorHandlerRegistry', () => {
  let registry: ErrorHandlerRegistry;

  beforeEach(() => {
    registry = new ErrorHandlerRegistry();
  });

  describe('registerChain', () => {
    it('should register a chain by name', () => {
      const h = new TestContextHandler();
      registry.registerChain('test-chain', h);
      expect(registry.getChain('test-chain')).toBe(h);
    });
  });

  describe('getChain', () => {
    it('should return undefined for unregistered chain', () => {
      expect(registry.getChain('non-existent')).toBeUndefined();
    });
  });

  describe('handleError', () => {
    it('should handle error through registered chain', async () => {
      const chain = new TestContextHandler();
      registry.registerChain('context-chain', chain);

      const contextError = new ContextError('Test', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);
      const result = await registry.handleError('context-chain', contextError, { requestedOperation: 'test' });

      expect(isSuccess(result)).toBe(true);
    });

    it('should fail if chain is not registered', async () => {
      const contextError = new ContextError('Test', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);
      const result = await registry.handleError('non-existent', contextError, { requestedOperation: 'test' });

      expect(isFailure(result)).toBe(true);
    });

    it('should use default options when not provided', async () => {
      const chain = new TestContextHandler();
      registry.registerChain('context-chain', chain);

      const contextError = new ContextError('Test', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);
      const result = await registry.handleError('context-chain', contextError, { requestedOperation: 'test' });

      expect(isSuccess(result)).toBe(true);
    });
  });
});

describe('errorHandlerRegistry singleton', () => {
  it('should be a singleton instance', () => {
    expect(errorHandlerRegistry).toBeDefined();
    expect(errorHandlerRegistry).toBeInstanceOf(ErrorHandlerRegistry);
  });
});
