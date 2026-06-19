// Chain of Responsibility pattern for error handling

import type { Result } from '../../models/result';
import { failure } from '../../models/result';
import type { SystemError, RecoveryResult, ErrorHandlingOptions } from '../../models/errors';

// Abstract base handler for the chain
export abstract class ErrorHandler<T = unknown> {
  protected nextHandler?: ErrorHandler<T>;

  setNext(handler: ErrorHandler<T>): ErrorHandler<T> {
    this.nextHandler = handler;
    return handler;
  }

  async handle(
    error: SystemError,
    context: T,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<T>, SystemError>> {
    if (this.canHandle(error)) {
      return this.handleError(error, context, options);
    }

    if (this.nextHandler) {
      return this.nextHandler.handle(error, context, options);
    }

    // No handler could process this error
    return failure(error);
  }

  protected abstract canHandle(error: SystemError): boolean;
  protected abstract handleError(
    error: SystemError,
    context: T,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<T>, SystemError>>;
}

// Error handler registry for managing chains
export class ErrorHandlerRegistry {
  private chains = new Map<string, ErrorHandler>();

  registerChain(name: string, handler: ErrorHandler): void {
    this.chains.set(name, handler);
  }

  getChain(name: string): ErrorHandler | undefined {
    return this.chains.get(name);
  }

  async handleError<T>(
    chainName: string,
    error: SystemError,
    context: T,
    options: ErrorHandlingOptions = {
      enableFallback: true,
      notifyUser: true,
      logError: true,
    },
  ): Promise<Result<RecoveryResult<T>, SystemError>> {
    const chain = this.getChain(chainName);

    if (!chain) {
      return failure(error);
    }

    return chain.handle(error, context, options) as Promise<Result<RecoveryResult<T>, SystemError>>;
  }
}

// Singleton registry instance
export const errorHandlerRegistry = new ErrorHandlerRegistry();
