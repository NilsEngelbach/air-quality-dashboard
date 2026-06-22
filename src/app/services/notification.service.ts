import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

const NOTIFICATIONS_ENABLED_KEY = 'air-quality-notifications-enabled';

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  areNotificationsEnabled(): boolean {
    return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true';
  }

  setNotificationsEnabled(enabled: boolean): void {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  }

  isBrowserApiSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getBrowserPermission(): NotificationPermission | null {
    if (!this.isBrowserApiSupported()) {
      return null;
    }
    return Notification.permission;
  }

  async requestBrowserPermission(): Promise<boolean> {
    if (!this.isBrowserApiSupported()) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async enableNotifications(): Promise<boolean> {
    const granted = await this.requestBrowserPermission();
    this.setNotificationsEnabled(granted);
    return granted;
  }

  disableNotifications(): void {
    this.setNotificationsEnabled(false);
  }

  show(payload: NotificationPayload): void {
    if (!this.areNotificationsEnabled()) {
      return;
    }

    const isVisible =
      typeof document !== 'undefined' && document.visibilityState === 'visible';
    const browserGranted =
      this.isBrowserApiSupported() && Notification.permission === 'granted';

    if (browserGranted) {
      // Prefer native notifications when the tab is in the background.
      if (!isVisible) {
        this.showBrowserNotification(payload);
      } else {
        this.showInAppNotification(payload);
      }
    } else {
      this.showInAppNotification(payload);
    }
  }

  private showBrowserNotification(payload: NotificationPayload): void {
    try {
      // Native browser notification; created for side effect.
      new Notification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        icon: '/favicon.ico',
      });
    } catch (error) {
      console.error('Error showing browser notification:', error);
      this.showInAppNotification(payload);
    }
  }

  private showInAppNotification(payload: NotificationPayload): void {
    this.snackBar.open(payload.body, 'Dismiss', {
      duration: 6000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: 'air-quality-notification',
    });
  }
}
