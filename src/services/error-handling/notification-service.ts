// User notification service for error recovery

import type { SystemError, RecoveryResult } from '../../models/errors';
import { ErrorSeverity } from '../../models/errors';

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  details?: string[];
  timestamp: Date;
  dismissible: boolean;
  autoHide: boolean;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void | Promise<void>;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationOptions {
  title?: string;
  dismissible?: boolean;
  autoHide?: boolean;
  duration?: number;
  includeDetails?: boolean;
  includeRecoveryActions?: boolean;
}

export class NotificationService {
  private notifications = new Map<string, Notification>();
  private listeners = new Set<(notification: Notification) => void>();
  private nextId = 1;

  /**
   * Subscribe to notification events
   */
  subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Create notification for error recovery
   */
  notifyErrorRecovery<T>(
    error: SystemError,
    recovery: RecoveryResult<T>,
    options: NotificationOptions = {},
  ): Notification {
    const notification = this.createRecoveryNotification(error, recovery, options);
    this.addNotification(notification);
    return notification;
  }

  /**
   * Create notification for recovery failure
   */
  notifyRecoveryFailure(error: SystemError, options: NotificationOptions = {}): Notification {
    const notification = this.createFailureNotification(error, options);
    this.addNotification(notification);
    return notification;
  }

  /**
   * Create general notification
   */
  notify(
    type: NotificationType,
    title: string,
    message: string,
    options: Partial<NotificationOptions> = {},
  ): Notification {
    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: new Date(),
      dismissible: options.dismissible ?? true,
      autoHide: options.autoHide ?? (type === NotificationType.SUCCESS || type === NotificationType.INFO),
      duration: options.duration ?? this.getDefaultDuration(type),
    };

    this.addNotification(notification);
    return notification;
  }

  /**
   * Dismiss a notification
   */
  dismiss(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (notification && notification.dismissible) {
      this.notifications.delete(notificationId);
      return true;
    }
    return false;
  }

  /**
   * Get all active notifications
   */
  getNotifications(): Notification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications.clear();
  }

  private createRecoveryNotification<T>(
    error: SystemError,
    recovery: RecoveryResult<T>,
    options: NotificationOptions,
  ): Notification {
    const type = this.getNotificationTypeForSeverity(error.severity);
    const title = options.title || this.getRecoveryTitle(error, recovery);
    const message = this.getRecoveryMessage(error, recovery);

    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: new Date(),
      dismissible: options.dismissible ?? true,
      autoHide: options.autoHide ?? type === NotificationType.INFO,
      duration: options.duration ?? this.getDefaultDuration(type),
    };

    // Add details if requested
    if (options.includeDetails) {
      notification.details = [
        `Error: ${error.message}`,
        `Recovery Strategy: ${recovery.recoveryStrategy}`,
        ...(recovery.warnings || []),
      ];
    }

    // Add recovery actions if requested
    if (options.includeRecoveryActions) {
      notification.actions = this.createRecoveryActions(error, recovery);
    }

    return notification;
  }

  private createFailureNotification(error: SystemError, options: NotificationOptions): Notification {
    const type = NotificationType.ERROR;
    const title = options.title || 'Recovery Failed';
    const message = `Unable to recover from error: ${error.message}`;

    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: new Date(),
      dismissible: options.dismissible ?? true,
      autoHide: options.autoHide ?? false,
      duration: options.duration ?? this.getDefaultDuration(type),
    };

    if (options.includeDetails) {
      notification.details = [
        `Error Code: ${error.code}`,
        `Category: ${error.category}`,
        `Severity: ${error.severity}`,
        ...(error.context ? [`Context: ${JSON.stringify(error.context)}`] : []),
      ];
    }

    return notification;
  }

  private getRecoveryTitle<T>(_error: SystemError, recovery: RecoveryResult<T>): string {
    if (recovery.fallbackUsed) {
      return 'System Recovered with Fallback';
    }
    return 'System Recovered';
  }

  private getRecoveryMessage<T>(error: SystemError, recovery: RecoveryResult<T>): string {
    const baseMessage = `A ${error.category.toLowerCase()} error was automatically resolved`;

    if (recovery.fallbackUsed) {
      return `${baseMessage} using fallback strategy: ${recovery.recoveryStrategy}`;
    }

    return `${baseMessage} using strategy: ${recovery.recoveryStrategy}`;
  }

  private getNotificationTypeForSeverity(severity: ErrorSeverity): NotificationType {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return NotificationType.ERROR;
      case ErrorSeverity.HIGH:
        return NotificationType.ERROR;
      case ErrorSeverity.MEDIUM:
        return NotificationType.WARNING;
      case ErrorSeverity.LOW:
        return NotificationType.INFO;
      default:
        return NotificationType.WARNING;
    }
  }

  private createRecoveryActions<T>(error: SystemError, recovery: RecoveryResult<T>): NotificationAction[] {
    const actions: NotificationAction[] = [];

    // Add action to view details
    actions.push({
      label: 'View Details',
      action: () => {
        console.log('Error Details:', error.toJSON());
        console.log('Recovery Details:', recovery);
      },
      style: 'secondary',
    });

    // Add category-specific actions
    switch (error.category) {
      case 'TEMPLATE':
        actions.push({
          label: 'Edit Template',
          action: () => {
            // In a real implementation, this would open the template editor
            console.log('Opening template editor...');
          },
          style: 'primary',
        });
        break;

      case 'CONTEXT':
        actions.push({
          label: 'Refresh Context',
          action: () => {
            // In a real implementation, this would refresh the project context
            console.log('Refreshing project context...');
          },
          style: 'primary',
        });
        break;

      case 'RULE':
        actions.push({
          label: 'Review Rules',
          action: () => {
            // In a real implementation, this would open the rules editor
            console.log('Opening rules editor...');
          },
          style: 'primary',
        });
        break;
    }

    return actions;
  }

  private getDefaultDuration(type: NotificationType): number {
    switch (type) {
      case NotificationType.SUCCESS:
        return 3000;
      case NotificationType.INFO:
        return 5000;
      case NotificationType.WARNING:
        return 8000;
      case NotificationType.ERROR:
        return 0; // Don't auto-hide errors
      default:
        return 5000;
    }
  }

  private addNotification(notification: Notification): void {
    this.notifications.set(notification.id, notification);

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });

    // Set up auto-hide if enabled
    if (notification.autoHide && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.duration);
    }
  }

  private generateId(): string {
    return `notification-${this.nextId++}-${Date.now()}`;
  }
}

// Singleton instance
export const notificationService = new NotificationService();
