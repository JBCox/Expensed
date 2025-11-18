import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotificationService, AppNotification, NotificationPreferences, NotificationType } from '../../../core/services/notification.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatBadgeModule,
    MatDividerModule,
    MatSlideToggleModule
  ],
  templateUrl: './notification-center.html',
  styleUrl: './notification-center.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationCenterComponent {
  private notificationService = inject(NotificationService);

  notificationsSignal = toSignal(this.notificationService.notifications$, { initialValue: [] });
  preferencesSignal = toSignal(this.notificationService.preferences$, {
    initialValue: this.notificationService.currentPreferences
  });

  unreadCount = computed(() => this.notificationsSignal().filter(notification => !notification.read).length);

  markAllRead(): void {
    this.notificationService.markAllAsRead();
  }

  markAsRead(notification: AppNotification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
  }

  updatePreference(partial: Partial<NotificationPreferences>): void {
    this.notificationService.updatePreferences(partial);
  }

  trackById(_: number, notification: AppNotification): string {
    return notification.id;
  }

  iconFor(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'notifications';
    }
  }
}
