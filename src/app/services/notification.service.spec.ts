import { TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

class MockNotification {
  static lastTitle?: string;
  static lastOptions?: NotificationOptions;

  constructor(title: string, options?: NotificationOptions) {
    MockNotification.lastTitle = title;
    MockNotification.lastOptions = options;
  }

  static requestPermission = jasmine
    .createSpy('requestPermission')
    .and.returnValue(Promise.resolve('granted' as NotificationPermission));
}

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarOpenSpy: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    MockNotification.lastTitle = undefined;
    MockNotification.lastOptions = undefined;
    MockNotification.requestPermission.calls.reset();

    snackBarOpenSpy = jasmine.createSpy('open').and.returnValue({
      dismissWithAction: () => undefined,
      dismiss: () => undefined,
    } as unknown as MatSnackBarRef<unknown>);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        {
          provide: MatSnackBar,
          useValue: { open: snackBarOpenSpy },
        },
      ],
    });

    (globalThis as unknown as Record<string, unknown>)['Notification'] =
      MockNotification as unknown as typeof Notification;

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should read enabled state from localStorage', () => {
    localStorage.setItem('air-quality-notifications-enabled', 'true');
    expect(service.areNotificationsEnabled()).toBe(true);
  });

  it('should store enabled state in localStorage', () => {
    service.setNotificationsEnabled(true);
    expect(localStorage.getItem('air-quality-notifications-enabled')).toBe(
      'true',
    );
  });

  it('should show an in-app notification when enabled and browser permission is default', () => {
    service.setNotificationsEnabled(true);

    service.show({
      title: 'Test title',
      body: 'Test body',
      tag: 'test-tag',
    });

    expect(snackBarOpenSpy).toHaveBeenCalledWith(
      'Test body',
      'Dismiss',
      jasmine.objectContaining({
        duration: 6000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      }),
    );
    expect(MockNotification.lastTitle).toBeUndefined();
  });

  it('should not show any notification when notifications are disabled', () => {
    service.setNotificationsEnabled(false);

    service.show({
      title: 'Test title',
      body: 'Test body',
    });

    expect(snackBarOpenSpy).not.toHaveBeenCalled();
    expect(MockNotification.lastTitle).toBeUndefined();
  });

  it('should show a browser notification when permission is granted and tab is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true,
    });

    service.setNotificationsEnabled(true);

    service.show({
      title: 'Browser title',
      body: 'Browser body',
      tag: 'browser-tag',
    });

    expect(MockNotification.lastTitle).toBe('Browser title');
    expect(MockNotification.lastOptions).toEqual(
      jasmine.objectContaining({
        body: 'Browser body',
        tag: 'browser-tag',
        icon: '/favicon.ico',
      }),
    );
    expect(snackBarOpenSpy).not.toHaveBeenCalled();
  });

  it('should request browser permission and persist the result', async () => {
    const granted = await service.enableNotifications();

    expect(granted).toBe(true);
    expect(service.areNotificationsEnabled()).toBe(true);
    expect(MockNotification.requestPermission).toHaveBeenCalled();
  });

  it('should disable notifications', () => {
    service.setNotificationsEnabled(true);
    service.disableNotifications();

    expect(service.areNotificationsEnabled()).toBe(false);
  });
});
