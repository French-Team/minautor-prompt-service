// Unit tests for LoggingService

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoggingService, LogLevel } from '../../../services/error-handling/logging-service';
import { ContextError, ErrorSeverity } from '../../../models/errors';

describe('LoggingService', () => {
  let loggingService: LoggingService;

  beforeEach(() => {
    loggingService = new LoggingService(100); // Small max size for testing
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logError', () => {
    it('should log error with correct level based on severity', () => {
      const criticalError = new ContextError('Critical error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.CRITICAL);

      const mediumError = new ContextError('Medium error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);

      const criticalEntry = loggingService.logError(criticalError);
      const mediumEntry = loggingService.logError(mediumError);

      expect(criticalEntry.level).toBe(LogLevel.FATAL);
      expect(mediumEntry.level).toBe(LogLevel.WARN);
    });

    it('should include error details in log entry', () => {
      const error = new ContextError('Test error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.HIGH, {
        testContext: 'value',
      });

      const entry = loggingService.logError(
        error,
        { additionalContext: 'test' },
        {
          includeContext: true,
        },
      );

      expect(entry.data?.error).toBeDefined();
      expect(entry.data?.context).toBeDefined();
      expect(entry.category).toBe('CONTEXT');
      expect(entry.message).toContain('Test error');
    });

    it('should sanitize sensitive data', () => {
      const error = new ContextError('Error with sensitive data', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM, {
        password: 'secret123',
        normalData: 'visible',
      });

      const context = {
        token: 'bearer-token',
        publicInfo: 'public',
      };

      const entry = loggingService.logError(error, context, {
        includeContext: true,
      });

      expect(entry.data?.error).toBeDefined();
      expect(entry.data?.context).toBeDefined();

      // Check that sensitive data is redacted
      interface ErrorLogData {
        context?: Record<string, unknown>;
      }

      const errorData = entry.data?.error as ErrorLogData;
      expect(errorData.context?.password).toBe('[REDACTED]');
      expect(errorData.context?.normalData).toBe('visible');

      const contextData = entry.data?.context as Record<string, unknown>;
      expect(contextData.token).toBe('[REDACTED]');
      expect(contextData.publicInfo).toBe('public');
    });

    it('should update error metrics', () => {
      const error = new ContextError('Test error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.HIGH);

      loggingService.logError(error);
      loggingService.logError(error);

      const metrics = loggingService.getMetrics();

      expect(metrics.totalErrors).toBe(2);
      expect(metrics.errorsByCategory.CONTEXT).toBe(2);
      expect(metrics.errorsBySeverity.HIGH).toBe(2);
    });
  });

  describe('logRecovery', () => {
    it('should log successful recovery', () => {
      const error = new ContextError('Recovered error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);

      const recovery = {
        success: true,
        fallbackUsed: true,
        recoveryStrategy: 'minimal-context-fallback',
        warnings: ['Using fallback'],
      };

      const entry = loggingService.logRecovery(error, recovery, 1500);

      expect(entry.level).toBe(LogLevel.INFO);
      expect(entry.message).toContain('minimal-context-fallback');
      expect(entry.data?.recoveryTimeMs).toBe(1500);
      expect(entry.data?.fallbackUsed).toBe(true);
    });

    it('should not include recovery value in logs for privacy', () => {
      const error = new ContextError('Test error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);

      const recovery = {
        success: true,
        value: { sensitiveData: 'should-not-be-logged' },
        fallbackUsed: false,
        recoveryStrategy: 'test-strategy',
        warnings: [],
      };

      const entry = loggingService.logRecovery(error, recovery, 1000);

      expect(entry.data?.recovery).toBeDefined();

      interface RecoveryLogData {
        success: boolean;
        fallbackUsed: boolean;
        recoveryStrategy: string;
        warnings: string[];
        value?: unknown;
      }

      expect((entry.data?.recovery as RecoveryLogData).value).toBeUndefined();
    });
  });

  describe('logRecoveryFailure', () => {
    it('should log recovery failure', () => {
      const error = new ContextError('Failed recovery', 'CONTEXT_INSUFFICIENT', ErrorSeverity.HIGH);

      const entry = loggingService.logRecoveryFailure(
        error,
        'attempted-strategy',
        'Strategy failed due to insufficient data',
      );

      expect(entry.level).toBe(LogLevel.ERROR);
      expect(entry.message).toContain('Recovery failed');
      expect(entry.data?.attemptedStrategy).toBe('attempted-strategy');
      expect(entry.data?.failureReason).toBe('Strategy failed due to insufficient data');
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      // Add some test logs
      loggingService.logInfo('test', 'Info message 1');
      loggingService.logWarning('test', 'Warning message 1');
      loggingService.logInfo('other', 'Info message 2');
    });

    it('should return all logs when no filter', () => {
      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(3);
    });

    it('should filter by level', () => {
      const infoLogs = loggingService.getLogs({ level: LogLevel.INFO });
      expect(infoLogs).toHaveLength(2);
      expect(infoLogs.every((log) => log.level === LogLevel.INFO)).toBe(true);
    });

    it('should filter by category', () => {
      const testLogs = loggingService.getLogs({ category: 'test' });
      expect(testLogs).toHaveLength(2);
      expect(testLogs.every((log) => log.category === 'test')).toBe(true);
    });

    it('should filter by date', () => {
      const futureDate = new Date(Date.now() + 1000);
      const futureLogs = loggingService.getLogs({ since: futureDate });
      expect(futureLogs).toHaveLength(0);
    });

    it('should limit results', () => {
      const limitedLogs = loggingService.getLogs({ limit: 2 });
      expect(limitedLogs).toHaveLength(2);
    });

    it('should return logs in reverse chronological order', () => {
      const logs = loggingService.getLogs();

      for (let i = 1; i < logs.length; i++) {
        expect(logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(logs[i].timestamp.getTime());
      }
    });
  });

  describe('exportLogs', () => {
    beforeEach(() => {
      loggingService.logInfo('test', 'Test message', { data: 'value' });
    });

    it('should export logs as JSON', () => {
      const exported = loggingService.exportLogs('json');
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe('Test message');
    });

    it('should export logs as CSV', () => {
      const exported = loggingService.exportLogs('csv');
      const lines = exported.split('\n');

      expect(lines[0]).toContain('"timestamp","level","category","message","tags"');
      expect(lines[1]).toContain('info');
      expect(lines[1]).toContain('test');
      expect(lines[1]).toContain('Test message');
    });
  });

  describe('clearOldLogs', () => {
    it('should clear logs older than specified date', () => {
      // Add some logs
      loggingService.logInfo('test', 'Old message 1');
      loggingService.logInfo('test', 'Old message 2');

      // Clear logs older than future date (should clear all existing logs)
      const futureDate = new Date(Date.now() + 1000);
      const cleared = loggingService.clearOldLogs(futureDate);

      expect(cleared).toBe(2);
      expect(loggingService.getLogs()).toHaveLength(0);
    });

    it('should not clear recent logs', () => {
      loggingService.logInfo('test', 'Recent message');

      // Clear logs older than 1 hour ago (should not clear recent logs)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const cleared = loggingService.clearOldLogs(oneHourAgo);

      expect(cleared).toBe(0);
      expect(loggingService.getLogs()).toHaveLength(1);
    });
  });

  describe('clearAllLogs', () => {
    it('should clear all logs and reset metrics', () => {
      const error = new ContextError('Test error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);

      loggingService.logError(error);
      loggingService.logInfo('test', 'Test message');

      expect(loggingService.getLogs()).toHaveLength(2);
      expect(loggingService.getMetrics().totalErrors).toBe(1);

      loggingService.clearAllLogs();

      expect(loggingService.getLogs()).toHaveLength(0);
      expect(loggingService.getMetrics().totalErrors).toBe(0);
    });
  });

  describe('log size management', () => {
    it('should maintain maximum log size', () => {
      const smallLoggingService = new LoggingService(3); // Max 3 logs

      // Add more logs than the limit
      smallLoggingService.logInfo('test', 'Message 1');
      smallLoggingService.logInfo('test', 'Message 2');
      smallLoggingService.logInfo('test', 'Message 3');
      smallLoggingService.logInfo('test', 'Message 4');
      smallLoggingService.logInfo('test', 'Message 5');

      const logs = smallLoggingService.getLogs();
      expect(logs).toHaveLength(3);

      // Should keep the most recent logs (in reverse chronological order)
      expect(logs[2].message).toBe('Message 5');
      expect(logs[1].message).toBe('Message 4');
      expect(logs[0].message).toBe('Message 3');
    });
  });

  describe('data sanitization', () => {
    it('should truncate large data objects', () => {
      const largeData = {
        largeString: 'x'.repeat(20000), // Very large string
      };

      const entry = loggingService.logInfo('test', 'Large data test', largeData);

      expect(entry.data?._truncated).toBe(true);
      expect(entry.data?._originalSize).toBeGreaterThan(10000);
      expect(entry.data?._preview).toBeDefined();
    });
  });
});
