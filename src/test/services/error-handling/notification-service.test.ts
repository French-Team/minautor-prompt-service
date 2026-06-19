// Unit tests for NotificationService

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService, NotificationType } from '../../../services/error-handling/notification-service';
import { ContextError, ErrorSeverity } from '../../../models/errors';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('notifyErrorRecovery', () => {
    it('should create recovery notification with correct type', () => {
      const error = new ContextError('Context analysis failed', 'CONTEXT_ANALYSIS_FAILED', ErrorSeverity.MEDIUM);

      const recovery = {
        success: true,
        fallbackUsed: true,
        recoveryStrategy: 'minimal-context-fallback',
        warnings: ['Using minimal context'],
      };

      const notification = notificationService.notifyErrorRecovery(error, recovery);

      expect(notification.type).toBe(NotificationType.WARNING);
      expect(notification.title).toContain('Fallback');
      expect(notification.message).toContain('minimal-context-fallback');
      expect(notification.dismissible).toBe(true);
    });

    it('should include details when requested', () => {
      const error = new ContextError('Context error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.HIGH);

      const recovery = {
        success: true,
        fallbackUsed: false,
        recoveryStrategy: 'context-repair',
        warnings: ['Context repaired'],
      };

      const notification = notificationService.notifyErrorRecovery(error, recovery, {
        includeDetails: true,
      });

      expect(notification.details).toBeDefined();
      expect(notification.details).toContain('Error: Context error');
      expect(notification.details).toContain('Recovery Strategy: context-repair');
      expect(notification.details).toContain('Context repaired');
    });

    it('should include recovery actions when requested', () => {
      const error = new ContextError('Context error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM);

      const recovery = {
        success: true,
        fallbackUsed: true,
        recoveryStrategy: 'fallback',
        warnings: [],
      };

      const notification = notificationService.notifyErrorRecovery(error, recovery, {
        includeRecoveryActions: true,
      });

      expect(notification.actions).toBeDefined();
      expect(notification.actions!.length).toBeGreaterThan(0);
      expect(notification.actions!.some((a) => a.label === 'View Details')).toBe(true);
    });

    it('should set correct notification type based on error severity', () => {
      const criticalError = new ContextError('Critical error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.CRITICAL);

      const lowError = new ContextError('Low error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.LOW);

      const recovery = {
        success: true,
        fallbackUsed: true,
        recoveryStrategy: 'fallback',
        warnings: [],
      };

      const criticalNotification = notificationService.notifyErrorRecovery(criticalError, recovery);
      const lowNotification = notificationService.notifyErrorRecovery(lowError, recovery);

      expect(criticalNotification.type).toBe(NotificationType.ERROR);
      expect(lowNotification.type).toBe(NotificationType.INFO);
    });
  });

  describe('notifyRecoveryFailure', () => {
    it('should create failure notification', () => {
      const error = new ContextError('Unrecoverable error', 'CONTEXT_ANALYSIS_FAILED', ErrorSeverity.HIGH);

      const notification = notificationService.notifyRecoveryFailure(error);

      expect(notification.type).toBe(NotificationType.ERROR);
      expect(notification.title).toBe('Recovery Failed');
      expect(notification.message).toContain('Unable to recover from error');
      expect(notification.autoHide).toBe(false);
    });

    it('should include error details when requested', () => {
      const error = new ContextError('Test error', 'CONTEXT_INSUFFICIENT', ErrorSeverity.MEDIUM, {
        testContext: 'value',
      });

      const notification = notificationService.notifyRecoveryFailure(error, {
        includeDetails: true,
      });

      expect(notification.details).toBeDefined();
      expect(notification.details).toContain('Error Code: CONTEXT_INSUFFICIENT');
      expect(notification.details).toContain('Category: CONTEXT');
      expect(notification.details).toContain('Severity: MEDIUM');
    });
  });

  describe('notify', () => {
    it('should create general notification', () => {
      const notification = notificationService.notify(NotificationType.SUCCESS, 'Test Title', 'Test Message');

      expect(notification.type).toBe(NotificationType.SUCCESS);
      expect(notification.title).toBe('Test Title');
      expect(notification.message).toBe('Test Message');
      expect(notification.dismissible).toBe(true);
      expect(notification.autoHide).toBe(true);
    });

    it('should set correct auto-hide behavior', () => {
      const successNotification = notificationService.notify(NotificationType.SUCCESS, 'Success', 'Success message');

      const errorNotification = notificationService.notify(NotificationType.ERROR, 'Error', 'Error message');

      expect(successNotification.autoHide).toBe(true);
      expect(successNotification.duration).toBe(3000);
      expect(errorNotification.autoHide).toBe(false); // Errors don't auto-hide by default
      expect(errorNotification.duration).toBe(0); // Don't auto-hide errors
    });
  });

  describe('dismiss', () => {
    it('should dismiss dismissible notifications', () => {
      const notification = notificationService.notify(NotificationType.INFO, 'Test', 'Test message');

      const dismissed = notificationService.dismiss(notification.id);

      expect(dismissed).toBe(true);
      expect(notificationService.getNotifications()).not.toContain(notification);
    });

    it('should not dismiss non-dismissible notifications', () => {
      const notification = notificationService.notify(NotificationType.ERROR, 'Test', 'Test message', {
        dismissible: false,
      });

      const dismissed = notificationService.dismiss(notification.id);

      expect(dismissed).toBe(false);
      expect(notificationService.getNotifications()).toContain(notification);
    });

    it('should return false for non-existent notifications', () => {
      const dismissed = notificationService.dismiss('non-existent-id');
      expect(dismissed).toBe(false);
    });
  });

  describe('auto-hide functionality', () => {
    it('should auto-hide notifications after duration', () => {
      const notification = notificationService.notify(
        NotificationType.SUCCESS,
        'Auto Hide Test',
        'This should auto-hide',
        { duration: 1000 },
      );

      expect(notificationService.getNotifications()).toContain(notification);

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      expect(notificationService.getNotifications()).not.toContain(notification);
    });

    it('should not auto-hide when disabled', () => {
      const notification = notificationService.notify(
        NotificationType.INFO,
        'No Auto Hide Test',
        'This should not auto-hide',
        { autoHide: false },
      );

      expect(notificationService.getNotifications()).toContain(notification);

      // Fast-forward time beyond default duration
      vi.advanceTimersByTime(10000);

      expect(notificationService.getNotifications()).toContain(notification);
    });
  });

  describe('subscription', () => {
    it('should notify subscribers of new notifications', () => {
      const listener = vi.fn();
      const unsubscribe = notificationService.subscribe(listener);

      const notification = notificationService.notify(NotificationType.INFO, 'Test', 'Test message');

      expect(listener).toHaveBeenCalledWith(notification);

      unsubscribe();

      // Should not be called after unsubscribe
      notificationService.notify(NotificationType.INFO, 'Test 2', 'Test message 2');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      notificationService.subscribe(errorListener);
      notificationService.subscribe(goodListener);

      // Should not throw despite error in first listener
      expect(() => {
        notificationService.notify(NotificationType.INFO, 'Test', 'Test message');
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should clear all notifications', () => {
      notificationService.notify(NotificationType.INFO, 'Test 1', 'Message 1');
      notificationService.notify(NotificationType.WARNING, 'Test 2', 'Message 2');

      expect(notificationService.getNotifications()).toHaveLength(2);

      notificationService.clearAll();

      expect(notificationService.getNotifications()).toHaveLength(0);
    });
  });
});
