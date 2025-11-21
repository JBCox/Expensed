import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { ExpenseService } from '../../../core/services/expense.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Observable } from 'rxjs';
import { Receipt } from '../../../core/models/receipt.model';
import { OcrStatus } from '../../../core/models/enums';

@Component({
  selector: 'app-receipt-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  templateUrl: './receipt-list.html',
  styleUrl: './receipt-list.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptList {
  receipts$: Observable<Receipt[]>;
  readonly OcrStatus = OcrStatus;

  constructor(
    private readonly expenseService: ExpenseService,
    private readonly router: Router,
    private readonly supabase: SupabaseService
  ) {
    this.receipts$ = this.expenseService.getMyReceipts();
  }

  createExpense(receipt: Receipt): void {
    this.router.navigate(['/expenses/new'], { queryParams: { receiptId: receipt.id } });
  }

  async viewReceipt(receipt: Receipt): Promise<void> {
    try {
      const { signedUrl } = await this.supabase.getSignedUrl('receipts', receipt.file_path, 86400); // 24 hours
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to get receipt URL:', error);
    }
  }

  getStatusLabel(receipt: Receipt): string {
    switch (receipt.ocr_status as OcrStatus) {
      case OcrStatus.COMPLETED:
        return 'Ready';
      case OcrStatus.PROCESSING:
        return 'Processing';
      case OcrStatus.FAILED:
        return 'Failed';
      default:
        return 'Queued';
    }
  }

  getStatusClass(receipt: Receipt): string {
    return `status-${receipt.ocr_status}`;
  }
}
