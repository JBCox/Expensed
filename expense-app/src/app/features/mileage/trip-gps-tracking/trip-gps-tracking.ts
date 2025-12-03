import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, interval, takeUntil } from 'rxjs';
import { TripTrackingService } from '../../../core/services/trip-tracking.service';
import { StartStopTrackingService, StartStopResult } from '../../../core/services/start-stop-tracking.service';
import { TripCoordinate, TrackingMethod } from '../../../core/models/mileage.model';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog';

export interface TrackingResult {
  coordinates: TripCoordinate[];
  distance: number;
  duration: number;
  // Start/Stop mode specific fields
  originLat?: number;
  originLng?: number;
  originAddress?: string;
  destinationLat?: number;
  destinationLng?: number;
  destinationAddress?: string;
  startTimestamp?: string;
  endTimestamp?: string;
}

@Component({
  selector: 'app-trip-gps-tracking',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule],
  template: `
    <div class="jensify-tab-content">
      <!-- Start/Stop Mode (persists when app is closed) -->
      @if (trackingMode === 'start_stop') {
        @if (startStopService.isActive()) {
          <!-- Trip in Progress - shows when user returns to app -->
          <div class="jensify-tracking-active jensify-trip-in-progress">
            <div class="jensify-tracking-header">
              <mat-icon color="accent">gps_fixed</mat-icon>
              <h3>Trip in Progress</h3>
            </div>
            <div class="jensify-trip-info">
              <div class="jensify-info-row">
                <mat-icon>place</mat-icon>
                <div>
                  <span class="jensify-info-label">Started from</span>
                  <span class="jensify-info-value">{{ startStopService.startAddress() || 'Loading...' }}</span>
                </div>
              </div>
              <div class="jensify-info-row">
                <mat-icon>schedule</mat-icon>
                <div>
                  <span class="jensify-info-label">Trip duration</span>
                  <span class="jensify-info-value jensify-elapsed-time">{{ startStopService.formatElapsed(startStopService.elapsedSeconds()) }}</span>
                </div>
              </div>
            </div>
            <p class="jensify-text-muted jensify-hint">
              Drive to your destination, then tap "Stop Trip" when you arrive.
            </p>
            <div class="jensify-tracking-actions">
              <button
                mat-raised-button
                color="primary"
                type="button"
                (click)="stopStartStopTrip()"
                [disabled]="stopping()"
                class="jensify-button">
                @if (stopping()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>stop</mat-icon>
                }
                Stop Trip
              </button>
              <button
                mat-stroked-button
                type="button"
                (click)="cancelStartStopTrip()"
                [disabled]="stopping()"
                class="jensify-button">
                <mat-icon>close</mat-icon>
                Cancel
              </button>
            </div>
          </div>
        } @else {
          <!-- Start Trip UI -->
          <div class="jensify-tracking-start">
            <p class="jensify-text-muted">Tap Start when you begin your trip. You can close the app while driving.</p>
            <button
              mat-raised-button
              color="primary"
              type="button"
              (click)="startStartStopTrip()"
              [disabled]="!gpsAvailable || starting()"
              class="jensify-button-lg">
              @if (starting()) {
                <mat-spinner diameter="24"></mat-spinner>
              } @else {
                <mat-icon>play_arrow</mat-icon>
              }
              Start Trip
            </button>
            @if (!gpsAvailable) {
              <p class="jensify-message-warning">GPS not available on this device</p>
            }
          </div>
        }
      }

      <!-- Full GPS Mode (continuous tracking, must keep app open) -->
      @if (trackingMode === 'full_gps') {
        <p class="jensify-text-muted">Live GPS tracking for accurate mileage calculation</p>

        @if (!isTracking()) {
          <div class="jensify-tracking-start">
            <button
              mat-raised-button
              color="primary"
              type="button"
              (click)="startFullGpsTracking()"
              [disabled]="!gpsAvailable"
              class="jensify-button-lg">
              <mat-icon>play_arrow</mat-icon>
              Start Tracking
            </button>
            @if (!gpsAvailable) {
              <p class="jensify-message-warning">GPS not available on this device</p>
            }
            <p class="jensify-message-info">Note: Keep the app open during your trip for continuous tracking.</p>
          </div>
        } @else {
          <div class="jensify-tracking-active">
            <div class="jensify-tracking-header">
              <mat-icon color="accent">gps_fixed</mat-icon>
              <h3>Tracking in Progress...</h3>
            </div>
            <div class="jensify-tracking-stats">
              <div class="jensify-stat">
                <mat-icon>straighten</mat-icon>
                <div class="jensify-stat-content">
                  <span class="jensify-stat-label">Distance</span>
                  <span class="jensify-stat-value">{{ trackingDistance().toFixed(2) }} mi</span>
                </div>
              </div>
              <div class="jensify-stat">
                <mat-icon>timer</mat-icon>
                <div class="jensify-stat-content">
                  <span class="jensify-stat-label">Duration</span>
                  <span class="jensify-stat-value">{{ formatDuration(trackingDuration()) }}</span>
                </div>
              </div>
            </div>
            <div class="jensify-tracking-actions">
              <button
                mat-raised-button
                color="primary"
                type="button"
                (click)="stopFullGpsTracking()"
                class="jensify-button">
                <mat-icon>stop</mat-icon>
                Stop Tracking
              </button>
              <button
                mat-stroked-button
                type="button"
                (click)="cancelFullGpsTracking()"
                class="jensify-button">
                <mat-icon>close</mat-icon>
                Cancel
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .jensify-tab-content {
      padding: 16px 0;
    }

    .jensify-text-muted {
      color: var(--jensify-text-muted, #666);
      margin-bottom: 16px;
    }

    .jensify-hint {
      font-size: 0.875rem;
      margin-top: 16px;
      margin-bottom: 16px;
    }

    .jensify-tracking-start {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;
    }

    .jensify-button-lg {
      padding: 12px 32px;
      font-size: 1rem;
      min-width: 160px;

      mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }
    }

    .jensify-message-warning {
      color: #f57c00;
      font-size: 0.875rem;
    }

    .jensify-message-info {
      color: var(--jensify-text-muted, #666);
      font-size: 0.8rem;
      font-style: italic;
      margin-top: 8px;
    }

    .jensify-tracking-active {
      background: var(--jensify-primary-soft, color-mix(in srgb, var(--jensify-primary) 8%, transparent));
      border-radius: 8px;
      padding: 20px;
    }

    .jensify-trip-in-progress {
      border-left: 4px solid var(--jensify-primary, #ff5900);
    }

    .jensify-tracking-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;

      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
      }

      mat-icon {
        animation: pulse 1.5s infinite;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .jensify-trip-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 8px;
    }

    .jensify-info-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;

      mat-icon {
        color: var(--jensify-primary, #ff5900);
        margin-top: 2px;
      }

      > div {
        display: flex;
        flex-direction: column;
      }
    }

    .jensify-info-label {
      font-size: 0.75rem;
      color: var(--jensify-text-muted, #666);
      text-transform: uppercase;
    }

    .jensify-info-value {
      font-size: 1rem;
      color: var(--jensify-text-strong, #1a1a1a);
    }

    .jensify-elapsed-time {
      font-size: 1.25rem;
      font-weight: 600;
      font-family: 'SF Mono', 'Roboto Mono', monospace;
    }

    .jensify-tracking-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
    }

    .jensify-stat {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        color: var(--jensify-primary, #ff5900);
      }
    }

    .jensify-stat-content {
      display: flex;
      flex-direction: column;
    }

    .jensify-stat-label {
      font-size: 0.75rem;
      color: var(--jensify-text-muted, #666);
      text-transform: uppercase;
    }

    .jensify-stat-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--jensify-text-strong, #1a1a1a);
    }

    .jensify-tracking-actions {
      display: flex;
      gap: 12px;
    }

    .jensify-button {
      mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }
    }
  `],
})
export class TripGpsTrackingComponent implements OnInit, OnDestroy {
  @Input() gpsAvailable = false;
  @Input() trackingMode: TrackingMethod = 'start_stop';

  @Output() trackingComplete = new EventEmitter<TrackingResult>();
  @Output() trackingStarted = new EventEmitter<void>();
  @Output() trackingCancelled = new EventEmitter<void>();

  // Full GPS mode signals
  isTracking = signal(false);
  trackingDistance = signal(0);
  trackingDuration = signal(0);

  // Start/Stop mode signals
  starting = signal(false);
  stopping = signal(false);

  private destroy$ = new Subject<void>();

  // Services
  private fullGpsService = inject(TripTrackingService);
  startStopService = inject(StartStopTrackingService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    // Check if there's an active Start/Stop trip when component loads
    if (this.trackingMode === 'start_stop' && this.startStopService.hasActiveTrip()) {
      // Trip is in progress - UI will show "Trip in Progress" state
      this.trackingStarted.emit();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // Start/Stop Mode Methods
  // ============================================

  startStartStopTrip(): void {
    this.starting.set(true);

    this.startStopService.startTrip().subscribe({
      next: (state) => {
        this.starting.set(false);
        this.trackingStarted.emit();
        this.snackBar.open(`Trip started from ${state.startAddress}`, 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.starting.set(false);
        this.snackBar.open(err.message || 'Failed to get GPS location', 'Close', { duration: 4000 });
      }
    });
  }

  stopStartStopTrip(): void {
    this.stopping.set(true);

    this.startStopService.stopTrip().subscribe({
      next: (result: StartStopResult) => {
        this.stopping.set(false);

        // Convert to TrackingResult format
        const trackingResult: TrackingResult = {
          coordinates: [], // Start/Stop mode doesn't track continuous coordinates
          distance: result.distanceMiles,
          duration: result.durationSeconds,
          originLat: result.startLat,
          originLng: result.startLng,
          originAddress: result.startAddress,
          destinationLat: result.endLat,
          destinationLng: result.endLng,
          destinationAddress: result.endAddress,
          startTimestamp: result.startTime,
          endTimestamp: result.endTime
        };

        this.trackingComplete.emit(trackingResult);
        this.snackBar.open(
          `Trip complete: ${result.distanceMiles.toFixed(2)} miles`,
          'Close',
          { duration: 5000 }
        );
      },
      error: (err) => {
        this.stopping.set(false);
        this.snackBar.open(err.message || 'Failed to complete trip', 'Close', { duration: 4000 });
      }
    });
  }

  cancelStartStopTrip(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancel Trip',
        message: 'Cancel this trip? Your starting location will be discarded.',
        confirmText: 'Cancel Trip',
        cancelText: 'Keep Trip',
        confirmColor: 'warn',
        icon: 'warning',
        iconColor: '#ff9800',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.startStopService.cancelTrip();
        this.trackingCancelled.emit();
        this.snackBar.open('Trip cancelled', 'Close', { duration: 2000 });
      }
    });
  }

  // ============================================
  // Full GPS Mode Methods
  // ============================================

  startFullGpsTracking(): void {
    this.fullGpsService.startTracking().subscribe({
      next: () => {
        this.isTracking.set(true);
        this.trackingStarted.emit();
        this.snackBar.open('GPS tracking started', 'Close', { duration: 2000 });

        // Subscribe to tracking updates
        interval(1000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            if (this.fullGpsService.isTracking()) {
              this.trackingDistance.set(this.fullGpsService.distance());
              this.trackingDuration.set(this.fullGpsService.duration());
            }
          });
      },
      error: (err) => {
        this.snackBar.open(err.message, 'Close', { duration: 4000 });
      }
    });
  }

  stopFullGpsTracking(): void {
    const trackingState = this.fullGpsService.stopTracking();
    this.isTracking.set(false);

    if (trackingState.coordinates.length > 0) {
      this.trackingComplete.emit({
        coordinates: trackingState.coordinates,
        distance: trackingState.distance,
        duration: trackingState.duration
      });
      this.snackBar.open(
        `Trip tracked: ${trackingState.distance.toFixed(2)} miles in ${this.formatDuration(trackingState.duration)}`,
        'Close',
        { duration: 5000 }
      );
    } else {
      this.snackBar.open('No GPS data recorded', 'Close', { duration: 3000 });
    }

    this.resetFullGpsState();
  }

  cancelFullGpsTracking(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cancel Tracking',
        message: 'Cancel tracking? All GPS data will be lost.',
        confirmText: 'Cancel Tracking',
        cancelText: 'Keep Tracking',
        confirmColor: 'warn',
        icon: 'warning',
        iconColor: '#ff9800',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.fullGpsService.stopTracking();
        this.isTracking.set(false);
        this.resetFullGpsState();
        this.trackingCancelled.emit();
        this.snackBar.open('Tracking cancelled', 'Close', { duration: 2000 });
      }
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  private resetFullGpsState(): void {
    this.trackingDistance.set(0);
    this.trackingDuration.set(0);
  }
}
