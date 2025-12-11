import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  icon?: string;
  iconColor?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon *ngIf="icon" [style.color]="iconColor" class="title-icon">{{ icon }}</mat-icon>
        <span>{{ title }}</span>
      </h2>
      <mat-dialog-content class="dialog-content">
        <p>{{ message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button [mat-dialog-close]="false" class="cancel-button">
          {{ cancelText }}
        </button>
        <button mat-flat-button [color]="confirmColor" [mat-dialog-close]="true" class="confirm-button" cdkFocusInitial>
          {{ confirmText }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog { min-width: 320px; max-width: 480px; }
    .dialog-title { display: flex; align-items: center; gap: 8px; margin: 0; padding: 16px 24px; font-size: 1.25rem; font-weight: 500; }
    .title-icon { font-size: 24px; width: 24px; height: 24px; }
    .dialog-content { padding: 0 24px 16px; }
    .dialog-content p { margin: 0; color: var(--text-secondary, rgba(0, 0, 0, 0.7)); font-size: 0.95rem; line-height: 1.5; }
    .dialog-actions { padding: 8px 16px 16px; gap: 8px; }
    .cancel-button { color: var(--text-secondary, rgba(0, 0, 0, 0.6)); }
    .confirm-button { min-width: 80px; }
  `]
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  private readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmColor: 'primary' | 'accent' | 'warn';
  icon: string | null;
  iconColor: string;

  constructor() {
    // Assign data to class properties for reliable template binding
    this.title = this.data.title;
    this.message = this.data.message;
    this.confirmText = this.data.confirmText || 'Confirm';
    this.cancelText = this.data.cancelText || 'Cancel';
    this.confirmColor = this.data.confirmColor || 'primary';
    this.icon = this.data.icon || null;
    this.iconColor = this.data.iconColor || 'inherit';
  }
}
