// Error handling utilities for identity services
export class IdentityServiceError extends Error {
  constructor(
    message: string,
    public _code: string,
    public _context?: unknown,
  ) {
    super(message);
    this.name = 'IdentityServiceError';
  }
}

export class IdentityErrorHandler {
  static async withErrorHandling<T>(operation: () => Promise<T>, context: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof IdentityServiceError) {
        throw error;
      }

      throw new IdentityServiceError(
        `Error in ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'OPERATION_FAILED',
        { context, originalError: error },
      );
    }
  }

  static handleValidationError(error: Error, field?: string): never {
    throw new IdentityServiceError(error.message, 'VALIDATION_ERROR', {
      field,
    });
  }

  static handleCacheError(error: Error, operation: string): never {
    throw new IdentityServiceError(`Cache operation failed: ${error.message}`, 'CACHE_ERROR', { operation });
  }

  static handleStrategyError(error: Error, identityType: string): never {
    throw new IdentityServiceError(`Strategy error for ${identityType}: ${error.message}`, 'STRATEGY_ERROR', {
      identityType,
    });
  }
}
