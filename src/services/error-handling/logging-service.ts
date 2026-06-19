// Logging service for error tracking and monitoring

import type { SystemError, RecoveryResult, ErrorCategory } from '../../models/errors';
import { ErrorSeverity } from '../../models/errors';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  error?: SystemError;
  recovery?: RecoveryResult<unknown>;
  context?: Record<string, unknown>;
  tags?: string[];
}

export interface LoggingOptions {
  includeStackTrace?: boolean;
  includeContext?: boolean;
  sanitizeData?: boolean;
  maxDataSize?: number;
}

export interface LogMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recoverySuccessRate: number;
  averageRecoveryTime: number;
  topErrorCodes: Array<{ code: string; count: number }>;
}

export class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogSize = 10000;
  private nextId = 1;
  private metrics: LogMetrics = {
    totalErrors: 0,
    errorsByCategory: {} as Record<ErrorCategory, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>,
    recoverySuccessRate: 0,
    averageRecoveryTime: 0,
    topErrorCodes: [],
  };

  constructor(maxLogSize = 10000) {
    this.maxLogSize = maxLogSize;
    this.initializeMetrics();
  }

  /**
   * Log an error occurrence
   */
  logError(error: SystemError, context?: Record<string, unknown>, options: LoggingOptions = {}): LogEntry {
    const entry = this.createLogEntry(
      this.getLogLevelForSeverity(error.severity),
      error.category,
      `Error occurred: ${error.message}`,
      {
        error: options.sanitizeData !== false ? this.sanitizeError(error) : error,
        context: options.includeContext ? this.sanitizeContext(context) : undefined,
      },
      options,
    );

    this.addLogEntry(entry);
    this.updateErrorMetrics(error);

    // Also log to console based on severity
    this.logToConsole(entry);

    return entry;
  }

  /**
   * Log a successful error recovery
   */
  logRecovery<T>(
    error: SystemError,
    recovery: RecoveryResult<T>,
    recoveryTimeMs: number,
    options: LoggingOptions = {},
  ): LogEntry {
    const entry = this.createLogEntry(
      LogLevel.INFO,
      error.category,
      `Error recovered using strategy: ${recovery.recoveryStrategy}`,
      {
        error: options.sanitizeData !== false ? this.sanitizeError(error) : error,
        recovery: {
          ...recovery,
          value: undefined, // Don't log the actual recovered value for privacy
        },
        recoveryTimeMs,
        fallbackUsed: recovery.fallbackUsed,
      },
      options,
    );

    this.addLogEntry(entry);
    this.updateRecoveryMetrics(recovery, recoveryTimeMs);

    return entry;
  }

  /**
   * Log a failed recovery attempt
   */
  logRecoveryFailure(
    error: SystemError,
    attemptedStrategy: string,
    failureReason: string,
    options: LoggingOptions = {},
  ): LogEntry {
    const entry = this.createLogEntry(
      LogLevel.ERROR,
      error.category,
      `Recovery failed: ${failureReason}`,
      {
        error: options.sanitizeData !== false ? this.sanitizeError(error) : error,
        attemptedStrategy,
        failureReason,
      },
      options,
    );

    this.addLogEntry(entry);

    return entry;
  }

  /**
   * Log general information
   */
  logInfo(category: string, message: string, data?: Record<string, unknown>, options: LoggingOptions = {}): LogEntry {
    const entry = this.createLogEntry(LogLevel.INFO, category, message, data, options);
    this.addLogEntry(entry);
    return entry;
  }

  /**
   * Log warning
   */
  logWarning(
    category: string,
    message: string,
    data?: Record<string, unknown>,
    options: LoggingOptions = {},
  ): LogEntry {
    const entry = this.createLogEntry(LogLevel.WARN, category, message, data, options);
    this.addLogEntry(entry);
    return entry;
  }

  /**
   * Get logs with optional filtering
   */
  getLogs(filter?: { level?: LogLevel; category?: string; since?: Date; limit?: number }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter((log) => log.level === filter.level);
      }

      if (filter.category) {
        filteredLogs = filteredLogs.filter((log) => log.category === filter.category);
      }

      if (filter.since) {
        filteredLogs = filteredLogs.filter((log) => log.timestamp >= filter.since!);
      }

      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get error metrics
   */
  getMetrics(): LogMetrics {
    this.calculateDynamicMetrics();
    return { ...this.metrics };
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCsv();
    }

    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear old logs to manage memory
   */
  clearOldLogs(olderThan: Date): number {
    const initialCount = this.logs.length;
    this.logs = this.logs.filter((log) => log.timestamp >= olderThan);
    return initialCount - this.logs.length;
  }

  /**
   * Clear all logs
   */
  clearAllLogs(): void {
    this.logs = [];
    this.initializeMetrics();
  }

  private createLogEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, unknown>,
    options: LoggingOptions = {},
  ): LogEntry {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data: options.sanitizeData !== false ? this.sanitizeData(data) : data,
    };

    // Add tags based on content
    entry.tags = this.generateTags(entry);

    return entry;
  }

  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);

    // Maintain max log size
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }
  }

  private getLogLevelForSeverity(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return LogLevel.FATAL;
      case ErrorSeverity.HIGH:
        return LogLevel.ERROR;
      case ErrorSeverity.MEDIUM:
        return LogLevel.WARN;
      case ErrorSeverity.LOW:
        return LogLevel.INFO;
      default:
        return LogLevel.WARN;
    }
  }

  private sanitizeError(error: SystemError): Partial<SystemError> {
    return {
      name: error.name,
      message: error.message,
      category: error.category,
      code: error.code,
      severity: error.severity,
      context: this.sanitizeContext(error.context),
    };
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;

    const sanitized = { ...context };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!data) return undefined;

    // Limit data size
    const serialized = JSON.stringify(data);
    if (serialized.length > 10000) {
      return {
        _truncated: true,
        _originalSize: serialized.length,
        _preview: serialized.substring(0, 1000) + '...',
      };
    }

    return this.sanitizeContext(data);
  }

  private generateTags(entry: LogEntry): string[] {
    const tags: string[] = [];

    tags.push(entry.level);
    tags.push(entry.category.toLowerCase());

    if (entry.data?.error) {
      tags.push('error');
    }

    if (entry.data?.recovery) {
      tags.push('recovery');
    }

    if (entry.data?.fallbackUsed) {
      tags.push('fallback');
    }

    return tags;
  }

  private updateErrorMetrics(error: SystemError): void {
    this.metrics.totalErrors++;

    // Update category counts
    this.metrics.errorsByCategory[error.category] = (this.metrics.errorsByCategory[error.category] || 0) + 1;

    // Update severity counts
    this.metrics.errorsBySeverity[error.severity] = (this.metrics.errorsBySeverity[error.severity] || 0) + 1;
  }

  private updateRecoveryMetrics<T>(_recovery: RecoveryResult<T>, _recoveryTimeMs: number): void {
    // This would be implemented with more sophisticated metrics tracking
    // For now, just update basic recovery success rate
    const recentRecoveries = this.logs.filter(
      (log) => log.data?.recovery && log.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000),
    ).length;

    const recentErrors = this.logs.filter(
      (log) => log.data?.error && log.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000),
    ).length;

    if (recentErrors > 0) {
      this.metrics.recoverySuccessRate = recentRecoveries / recentErrors;
    }
  }

  private calculateDynamicMetrics(): void {
    // Calculate top error codes
    const errorCodes = new Map<string, number>();

    for (const log of this.logs) {
      if (log.data?.error && typeof log.data.error === 'object' && 'code' in log.data.error) {
        const code = (log.data.error as { code: string }).code;
        errorCodes.set(code, (errorCodes.get(code) || 0) + 1);
      }
    }

    this.metrics.topErrorCodes = Array.from(errorCodes.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private logToConsole(entry: LogEntry): void {
    const message = `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`;

    switch (entry.level) {
      case LogLevel.FATAL:
      case LogLevel.ERROR:
        console.error(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
    }
  }

  private exportToCsv(): string {
    const headers = ['timestamp', 'level', 'category', 'message', 'tags'];
    const rows = this.logs.map((log) => [
      log.timestamp.toISOString(),
      log.level,
      log.category,
      log.message.replace(/"/g, '""'), // Escape quotes
      (log.tags || []).join(';'),
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recoverySuccessRate: 0,
      averageRecoveryTime: 0,
      topErrorCodes: [],
    };
  }

  private generateId(): string {
    return `log-${this.nextId++}-${Date.now()}`;
  }
}

// Singleton instance
export const loggingService = new LoggingService();
