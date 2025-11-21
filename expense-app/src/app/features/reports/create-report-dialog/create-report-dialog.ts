import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReportService } from '../../../core/services/report.service';
import { CreateReportDto } from '../../../core/models/report.model';

/**
 * Create Report Dialog Component
 * Modal dialog for creating a new expense report
 *
 * Features:
 * - Report name (required)
 * - Description (optional)
 * - Date range (optional)
 * - Form validation
 * - Loading state during creation
 */
@Component({
  selector: 'app-create-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-report-dialog.html',
  styleUrl: './create-report-dialog.scss'
})
export class CreateReportDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateReportDialogComponent>);
  private reportService = inject(ReportService);

  form!: FormGroup;
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(1000)]],
      start_date: [null],
      end_date: [null]
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const dto: CreateReportDto = {
      name: formValue.name,
      description: formValue.description || undefined,
      start_date: formValue.start_date ? this.formatDate(formValue.start_date) : undefined,
      end_date: formValue.end_date ? this.formatDate(formValue.end_date) : undefined
    };

    this.reportService.createReport(dto).subscribe({
      next: (report) => {
        this.loading.set(false);
        this.dialogRef.close(report);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Failed to create report');
      }
    });
  }

  /**
   * Close dialog without saving
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get form control error message
   */
  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control) {
      return '';
    }

    if (control.hasError('required')) {
      return 'This field is required';
    }

    if (control.hasError('maxlength')) {
      const maxLength = control.getError('maxlength').requiredLength;
      return `Maximum length is ${maxLength} characters`;
    }

    return '';
  }
}
