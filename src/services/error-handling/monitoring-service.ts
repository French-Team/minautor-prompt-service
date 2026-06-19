// Monitoring service for error tracking and alerting

import type { SystemError, RecoveryResult } from '../../models/errors';
import { ErrorSeverity } from '../../models/errors';

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableAlerting: boolean;
  alertThresholds: AlertThresholds;
  metricsInterval: number;
  retentionPeriod: number;
}

export interface AlertThresholds {
  errorRatePerMinute: number;
  criticalErrorsPerHour: number;
  recoveryFailureRate: number;
  averageRecoveryTime: number;
}

export interface MetricPoint {
  timestamp: Date;
  metric: string;
  value: number;
  tags?: Record<string, string>;
}

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  threshold: number;
  actualValue: number;
  resolved: boolean;
  resolvedAt?: Date;
}

export class MonitoringService {
  private config: MonitoringConfig;
  private metrics: MetricPoint[] = [];
  private alerts: Alert[] = [];
  private metricsInterval?: NodeJS.Timeout;
  private nextAlertId = 1;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enableMetrics: config.enableMetrics ?? true,
      enableAlerting: config.enableAlerting ?? true,
      alertThresholds: {
        errorRatePerMinute: 10,
        criticalErrorsPerHour: 5,
        recoveryFailureRate: 0.2, // 20%
        averageRecoveryTime: 5000, // 5 seconds
        ...config.alertThresholds,
      },
      metricsInterval: config.metricsInterval ?? 60000, // 1 minute
      retentionPeriod: config.retentionPeriod ?? 24 * 60 * 60 * 1000, // 24 hours
    };

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Record an error occurrence
   */
  recordError(error: SystemError, _context?: Record<string, unknown>): void {
    if (!this.config.enableMetrics) return;

    // Record error metrics
    this.recordMetric('errors.total', 1, {
      category: error.category,
      severity: error.severity,
      code: error.code,
    });

    this.recordMetric(`errors.by_category.${error.category.toLowerCase()}`, 1);
    this.recordMetric(`errors.by_severity.${error.severity.toLowerCase()}`, 1);

    // Check for alerts
    if (this.config.enableAlerting) {
      this.checkErrorRateAlert();
      this.checkCriticalErrorAlert(error);
    }
  }

  /**
   * Record a successful recovery
   */
  recordRecovery<T>(error: SystemError, recovery: RecoveryResult<T>, recoveryTimeMs: number): void {
    if (!this.config.enableMetrics) return;

    // Record recovery metrics
    this.recordMetric('recovery.success', 1, {
      strategy: recovery.recoveryStrategy,
      fallback_used: recovery.fallbackUsed.toString(),
      category: error.category,
    });

    this.recordMetric('recovery.time_ms', recoveryTimeMs, {
      strategy: recovery.recoveryStrategy,
      category: error.category,
    });

    if (recovery.fallbackUsed) {
      this.recordMetric('recovery.fallback_used', 1, {
        strategy: recovery.recoveryStrategy,
        category: error.category,
      });
    }

    // Check recovery time alert
    if (this.config.enableAlerting) {
      this.checkRecoveryTimeAlert(recoveryTimeMs);
    }
  }

  /**
   * Record a failed recovery
   */
  recordRecoveryFailure(error: SystemError, attemptedStrategy: string): void {
    if (!this.config.enableMetrics) return;

    this.recordMetric('recovery.failure', 1, {
      strategy: attemptedStrategy,
      category: error.category,
      severity: error.severity,
    });

    // Check recovery failure rate alert
    if (this.config.enableAlerting) {
      this.checkRecoveryFailureRateAlert();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(since?: Date): MetricPoint[] {
    const cutoff = since || new Date(Date.now() - this.config.retentionPeriod);
    return this.metrics.filter((metric) => metric.timestamp >= cutoff);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get aggregated metrics for dashboard
   */
  getDashboardMetrics(timeRange: number = 60 * 60 * 1000): {
    errorRate: number;
    recoveryRate: number;
    averageRecoveryTime: number;
    errorsByCategory: Record<string, number>;
    topErrors: Array<{ code: string; count: number }>;
  } {
    const since = new Date(Date.now() - timeRange);
    const recentMetrics = this.getMetrics(since);

    const errorMetrics = recentMetrics.filter((m) => m.metric === 'errors.total');
    const recoverySuccessMetrics = recentMetrics.filter((m) => m.metric === 'recovery.success');
    const recoveryFailureMetrics = recentMetrics.filter((m) => m.metric === 'recovery.failure');
    const recoveryTimeMetrics = recentMetrics.filter((m) => m.metric === 'recovery.time_ms');

    const totalErrors = errorMetrics.reduce((sum, m) => sum + m.value, 0);
    const totalRecoverySuccess = recoverySuccessMetrics.reduce((sum, m) => sum + m.value, 0);
    const totalRecoveryFailure = recoveryFailureMetrics.reduce((sum, m) => sum + m.value, 0);
    const totalRecoveries = totalRecoverySuccess + totalRecoveryFailure;

    const errorsByCategory: Record<string, number> = {};
    const errorCodes = new Map<string, number>();

    for (const metric of errorMetrics) {
      if (metric.tags?.category) {
        errorsByCategory[metric.tags.category] = (errorsByCategory[metric.tags.category] || 0) + metric.value;
      }

      if (metric.tags?.code) {
        errorCodes.set(metric.tags.code, (errorCodes.get(metric.tags.code) || 0) + metric.value);
      }
    }

    const topErrors = Array.from(errorCodes.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const averageRecoveryTime =
      recoveryTimeMetrics.length > 0
        ? recoveryTimeMetrics.reduce((sum, m) => sum + m.value, 0) / recoveryTimeMetrics.length
        : 0;

    return {
      errorRate: totalErrors / (timeRange / 60000), // errors per minute
      recoveryRate: totalRecoveries > 0 ? totalRecoverySuccess / totalRecoveries : 0,
      averageRecoveryTime,
      errorsByCategory,
      topErrors,
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'prometheus' | 'json' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics();
    }

    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Cleanup old metrics and alerts
   */
  cleanup(): void {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod);

    // Remove old metrics
    this.metrics = this.metrics.filter((metric) => metric.timestamp >= cutoff);

    // Remove old resolved alerts
    this.alerts = this.alerts.filter((alert) => !alert.resolved || (alert.resolvedAt && alert.resolvedAt >= cutoff));
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }

  private recordMetric(metric: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      timestamp: new Date(),
      metric,
      value,
      tags,
    });
  }

  private startMetricsCollection(): void {
    // Ne pas démarrer setInterval côté serveur (SSR).
    // Nuxt émet un warning sinon et l'intervalle crée une fuite mémoire inutile.
    if (typeof window === 'undefined') return;

    this.metricsInterval = setInterval(() => {
      this.cleanup();
      this.collectSystemMetrics();
    }, this.config.metricsInterval);
  }

  private collectSystemMetrics(): void {
    // Collect system-level metrics

    // Memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.recordMetric('system.memory.heap_used', memUsage.heapUsed);
      this.recordMetric('system.memory.heap_total', memUsage.heapTotal);
    }

    // Active alerts count
    const activeAlerts = this.getActiveAlerts().length;
    this.recordMetric('alerts.active', activeAlerts);
  }

  private checkErrorRateAlert(): void {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentErrors = this.metrics.filter((m) => m.metric === 'errors.total' && m.timestamp >= oneMinuteAgo);

    const errorCount = recentErrors.reduce((sum, m) => sum + m.value, 0);

    if (errorCount >= this.config.alertThresholds.errorRatePerMinute) {
      this.createAlert(
        'high',
        'High Error Rate',
        `Error rate of ${errorCount} errors per minute exceeds threshold of ${this.config.alertThresholds.errorRatePerMinute}`,
        'error_rate',
        this.config.alertThresholds.errorRatePerMinute,
        errorCount,
      );
    }
  }

  private checkCriticalErrorAlert(error: SystemError): void {
    if (error.severity !== ErrorSeverity.CRITICAL) return;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const criticalErrors = this.metrics.filter(
      (m) => m.metric === 'errors.total' && m.timestamp >= oneHourAgo && m.tags?.severity === ErrorSeverity.CRITICAL,
    );

    const criticalCount = criticalErrors.reduce((sum, m) => sum + m.value, 0);

    if (criticalCount >= this.config.alertThresholds.criticalErrorsPerHour) {
      this.createAlert(
        'critical',
        'Critical Error Threshold Exceeded',
        `${criticalCount} critical errors in the last hour exceeds threshold of ${this.config.alertThresholds.criticalErrorsPerHour}`,
        'critical_errors',
        this.config.alertThresholds.criticalErrorsPerHour,
        criticalCount,
      );
    }
  }

  private checkRecoveryTimeAlert(recoveryTimeMs: number): void {
    if (recoveryTimeMs >= this.config.alertThresholds.averageRecoveryTime) {
      this.createAlert(
        'medium',
        'Slow Recovery Time',
        `Recovery took ${recoveryTimeMs}ms, exceeding threshold of ${this.config.alertThresholds.averageRecoveryTime}ms`,
        'recovery_time',
        this.config.alertThresholds.averageRecoveryTime,
        recoveryTimeMs,
      );
    }
  }

  private checkRecoveryFailureRateAlert(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recoverySuccess = this.metrics
      .filter((m) => m.metric === 'recovery.success' && m.timestamp >= oneHourAgo)
      .reduce((sum, m) => sum + m.value, 0);

    const recoveryFailure = this.metrics
      .filter((m) => m.metric === 'recovery.failure' && m.timestamp >= oneHourAgo)
      .reduce((sum, m) => sum + m.value, 0);

    const totalRecoveries = recoverySuccess + recoveryFailure;

    if (totalRecoveries > 0) {
      const failureRate = recoveryFailure / totalRecoveries;

      if (failureRate >= this.config.alertThresholds.recoveryFailureRate) {
        this.createAlert(
          'high',
          'High Recovery Failure Rate',
          `Recovery failure rate of ${(failureRate * 100).toFixed(1)}% exceeds threshold of ${(this.config.alertThresholds.recoveryFailureRate * 100).toFixed(1)}%`,
          'recovery_failure_rate',
          this.config.alertThresholds.recoveryFailureRate,
          failureRate,
        );
      }
    }
  }

  private createAlert(
    severity: Alert['severity'],
    title: string,
    description: string,
    metric: string,
    threshold: number,
    actualValue: number,
  ): void {
    // Check if similar alert already exists and is active
    const existingAlert = this.alerts.find(
      (a) => a.metric === metric && !a.resolved && Math.abs(a.timestamp.getTime() - Date.now()) < 5 * 60 * 1000, // 5 minutes
    );

    if (existingAlert) return; // Don't create duplicate alerts

    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      severity,
      title,
      description,
      metric,
      threshold,
      actualValue,
      resolved: false,
    };

    this.alerts.push(alert);

    // In a real implementation, this would send the alert to external systems
    console.warn(`ALERT [${severity.toUpperCase()}]: ${title} - ${description}`);
  }

  private exportPrometheusMetrics(): string {
    const metricGroups = new Map<string, MetricPoint[]>();

    // Group metrics by name
    for (const metric of this.metrics) {
      if (!metricGroups.has(metric.metric)) {
        metricGroups.set(metric.metric, []);
      }
      metricGroups.get(metric.metric)!.push(metric);
    }

    let output = '';

    for (const [metricName, points] of metricGroups) {
      const sanitizedName = metricName.replace(/[^a-zA-Z0-9_]/g, '_');

      // Add metric help and type
      output += `# HELP ${sanitizedName} Generated metric from error handling system\n`;
      output += `# TYPE ${sanitizedName} counter\n`;

      // Add metric values
      for (const point of points) {
        const labels = point.tags
          ? Object.entries(point.tags)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';

        const labelStr = labels ? `{${labels}}` : '';
        output += `${sanitizedName}${labelStr} ${point.value} ${point.timestamp.getTime()}\n`;
      }

      output += '\n';
    }

    return output;
  }

  private generateAlertId(): string {
    return `alert-${this.nextAlertId++}-${Date.now()}`;
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();
