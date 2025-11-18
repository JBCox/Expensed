import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { OrganizationService } from './organization.service';
import {
  Expense,
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseFilters,
  ExpenseSortOptions,
  ExpenseWithUser
} from '../models/expense.model';
import {
  Receipt,
  UploadReceiptDto,
  ReceiptUploadResponse
} from '../models/receipt.model';
import { ExpenseStatus, OcrStatus } from '../models/enums';
import { NotificationService } from './notification.service';
import { OcrService } from './ocr.service';
import { LoggerService } from './logger.service';
import { MAX_RECEIPT_FILE_SIZE, ALLOWED_RECEIPT_TYPES, BYTES_PER_MB } from '../constants/app.constants';
import { environment } from '../../../environments/environment';

/**
 * Service for managing expenses and receipts
 * Handles CRUD operations, file uploads, and queries with filters
 * All operations are scoped to the current organization
 */
@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private readonly RECEIPT_BUCKET = 'receipts';
  private readonly MAX_FILE_SIZE = MAX_RECEIPT_FILE_SIZE;
  private readonly ALLOWED_FILE_TYPES = ALLOWED_RECEIPT_TYPES as readonly string[];

  /**
   * File magic numbers (signatures) for validating actual file content
   * Prevents malicious files disguised with wrong extensions
   */
  private readonly FILE_SIGNATURES = {
    'image/jpeg': [
      [0xFF, 0xD8, 0xFF, 0xE0], // JPEG JFIF
      [0xFF, 0xD8, 0xFF, 0xE1], // JPEG Exif
      [0xFF, 0xD8, 0xFF, 0xE2], // JPEG still
      [0xFF, 0xD8, 0xFF, 0xDB]  // JPEG raw
    ],
    'image/png': [
      [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
    ],
    'application/pdf': [
      [0x25, 0x50, 0x44, 0x46] // %PDF
    ]
  };

  constructor(
    private supabase: SupabaseService,
    private organizationService: OrganizationService,
    private notificationService: NotificationService,
    private ocrService: OcrService,
    private logger: LoggerService
  ) {}

  /**
   * Create a new expense
   */
  createExpense(dto: CreateExpenseDto): Observable<Expense> {
    const userId = this.supabase.userId;
    const organizationId = this.organizationService.currentOrganizationId;

    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }
    if (!organizationId) {
      return throwError(() => new Error('No organization selected'));
    }

    return from(
      this.supabase.client
        .from('expenses')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          merchant: dto.merchant,
          amount: dto.amount,
          category: dto.category,
          expense_date: dto.expense_date,
          notes: dto.notes,
          receipt_id: dto.receipt_id,
          status: ExpenseStatus.DRAFT,
          currency: 'USD',
          is_reimbursable: true,
          policy_violations: []
        })
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('No expense data returned');
        return data as unknown as Expense;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get expense by ID
   * Optionally populate user and receipt relationships
   */
  getExpenseById(id: string, includeRelations = true): Observable<Expense> {
    const organizationId = this.organizationService.currentOrganizationId;

    if (!organizationId) {
      return throwError(() => new Error('No organization selected'));
    }

    let query = this.supabase.client
      .from('expenses')
      .select(includeRelations ? '*, user:users!user_id(*), receipt:receipts!expenses_receipt_id_fkey(*)' : '*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('Expense not found');
        return data as unknown as Expense;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get all expenses for current user
   */
  getMyExpenses(
    filters?: ExpenseFilters,
    sort?: ExpenseSortOptions
  ): Observable<Expense[]> {
    const userId = this.supabase.userId;
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.queryExpenses({ ...filters, user_id: userId }, sort);
  }

  /**
   * Query expenses with filters and sorting
   * Used by finance dashboard and reports
   * Automatically scoped to current organization
   */
  queryExpenses(
    filters?: ExpenseFilters,
    sort?: ExpenseSortOptions
  ): Observable<Expense[]> {
    const organizationId = this.organizationService.currentOrganizationId;
    if (!organizationId) {
      return throwError(() => new Error('No organization selected'));
    }

    let query = this.supabase.client
      .from('expenses')
      .select('*, user:users!user_id(*), receipt:receipts!expenses_receipt_id_fkey(*)')
      .eq('organization_id', organizationId); // Always filter by organization

    // Apply filters
    if (filters) {
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.merchant) {
        query = query.ilike('merchant', `%${filters.merchant}%`);
      }
      if (filters.date_from) {
        query = query.gte('expense_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('expense_date', filters.date_to);
      }
      if (filters.min_amount !== undefined) {
        query = query.gte('amount', filters.min_amount);
      }
      if (filters.max_amount !== undefined) {
        query = query.lte('amount', filters.max_amount);
      }
    }

    // Apply sorting
    const sortField = sort?.field || 'created_at';
    const sortDirection = sort?.direction || 'desc';
    query = query.order(sortField, { ascending: sortDirection === 'asc' });

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []) as unknown as Expense[];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update an expense
   */
  updateExpense(id: string, dto: UpdateExpenseDto): Observable<Expense> {
    return from(
      this.supabase.client
        .from('expenses')
        .update(dto)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('Expense not found');
        return data as unknown as Expense;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete an expense (soft delete)
   */
  deleteExpense(id: string): Observable<void> {
    return from(
      this.supabase.client
        .from('expenses')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Submit expense for approval
   */
  submitExpense(id: string): Observable<Expense> {
    return this.updateExpense(id, {
      status: ExpenseStatus.SUBMITTED,
      submitted_at: new Date().toISOString()
    });
  }

  /**
   * Mark expense as reimbursed (finance only)
   */
  markAsReimbursed(id: string): Observable<Expense> {
    const userId = this.supabase.userId;
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return from(
      this.supabase.client
        .from('expenses')
        .update({
          status: ExpenseStatus.REIMBURSED,
          reimbursed_at: new Date().toISOString(),
          reimbursed_by: userId
        })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('Expense not found');
        return data as unknown as Expense;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Upload receipt file and create receipt record
   */
  uploadReceipt(file: File): Observable<ReceiptUploadResponse> {
    const userId = this.supabase.userId;
    const organizationId = this.organizationService.currentOrganizationId;

    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }
    if (!organizationId) {
      return throwError(() => new Error('No organization selected. Please refresh the page and try again.'));
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(file.name);
    const filePath = `${organizationId}/${userId}/${timestamp}_${sanitizedFileName}`;

    return from(
      (async () => {
        // Validate file (including magic number check)
        const validationError = await this.validateReceiptFileAsync(file);
        if (validationError) {
          throw new Error(validationError);
        }
        // Upload file to storage
        const { data: uploadData, error: uploadError } = await this.supabase.uploadFile(
          this.RECEIPT_BUCKET,
          filePath,
          file
        );

        if (uploadError) throw uploadError;

        // Create receipt record in database
        const { data: receiptData, error: receiptError } = await this.supabase.client
          .from('receipts')
          .insert({
            organization_id: organizationId,
            user_id: userId,
            file_path: filePath,
            file_name: sanitizedFileName,
            file_type: file.type,
            file_size: file.size,
            ocr_status: OcrStatus.PENDING
          })
          .select()
          .single();

        if (receiptError) throw receiptError;

        // Get a signed URL for private bucket access
        const { signedUrl } = await this.supabase.getSignedUrl(this.RECEIPT_BUCKET, filePath);

        const receipt = receiptData as Receipt;

        if (this.notificationService.shouldAlert('smartScanUpdates')) {
          this.notificationService.notify({
            type: 'info',
            title: 'SmartScan started',
            message: `We're extracting details from ${receipt.file_name}.`,
            data: { receiptId: receipt.id }
          });
        }

        // Start OCR processing (real or simulated based on environment)
        if (environment.simulateOcr) {
          this.startSmartScanSimulation(receipt, file);
        } else {
          this.startRealOcrProcessing(receipt, file);
        }

        return {
          receipt,
          public_url: signedUrl
        };
      })()
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get receipt by ID
   */
  getReceiptById(id: string): Observable<Receipt> {
    return from(
      this.supabase.client
        .from('receipts')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('Receipt not found');
        return data as unknown as Receipt;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get all receipts for current user in current organization
   */
  getMyReceipts(): Observable<Receipt[]> {
    const userId = this.supabase.userId;
    const organizationId = this.organizationService.currentOrganizationId;

    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }
    if (!organizationId) {
      return throwError(() => new Error('No organization selected'));
    }

    return from(
      this.supabase.client
        .from('receipts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []) as unknown as Receipt[];
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete receipt and associated file
   */
  deleteReceipt(id: string): Observable<void> {
    return from(
      (async () => {
        // Get receipt to find file path
        const { data: receipt, error: fetchError } = await this.supabase.client
          .from('receipts')
          .select('file_path')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!receipt) throw new Error('Receipt not found');

        // Delete file from storage
        const { error: deleteFileError } = await this.supabase.deleteFile(
          this.RECEIPT_BUCKET,
          receipt.file_path
        );

        if (deleteFileError) throw deleteFileError;

        // Delete receipt record
        const { error: deleteRecordError } = await this.supabase.client
          .from('receipts')
          .delete()
          .eq('id', id);

        if (deleteRecordError) throw deleteRecordError;
      })()
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get public URL for receipt file
   */
  getReceiptUrl(filePath: string): string {
    // Note: For private buckets, prefer a short-lived signed URL
    // This wrapper is synchronous in signature—callers that need fresh URLs
    // should use SupabaseService.getSignedUrl directly.
    return this.supabase.getPublicUrl(this.RECEIPT_BUCKET, filePath);
  }

  /**
   * Validate receipt file (MIME type and size only)
   * Call validateReceiptFileAsync for full validation including magic numbers
   */
  validateReceiptFile(file: File): string | null {
    if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed types: ${this.ALLOWED_FILE_TYPES.join(', ')}`;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      const maxSizeMB = this.MAX_FILE_SIZE / BYTES_PER_MB;
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  }

  /**
   * Async validation including magic number check
   * Validates that file content matches claimed MIME type
   */
  async validateReceiptFileAsync(file: File): Promise<string | null> {
    // First run synchronous validations
    const syncError = this.validateReceiptFile(file);
    if (syncError) {
      return syncError;
    }

    // Validate magic number (file signature)
    const magicNumberValid = await this.validateFileMagicNumber(file);
    if (!magicNumberValid) {
      return 'File content does not match file type. Possible security risk detected.';
    }

    return null;
  }

  /**
   * Validate file magic number (file signature)
   * Reads first bytes of file to verify actual content matches claimed type
   */
  private async validateFileMagicNumber(file: File): Promise<boolean> {
    const signatures = this.FILE_SIGNATURES[file.type as keyof typeof this.FILE_SIGNATURES];
    if (!signatures) {
      // No signature defined for this type, allow it
      return true;
    }

    try {
      // Read first 8 bytes (longest signature we have)
      const headerBytes = await this.readFileHeader(file, 8);

      // Check if any of the valid signatures match
      return signatures.some(signature =>
        signature.every((byte, index) => headerBytes[index] === byte)
      );
    } catch (error) {
      this.logger.error('Error reading file header', error, 'ExpenseService');
      return false;
    }
  }

  /**
   * Read first N bytes of a file
   */
  private readFileHeader(file: File, numBytes: number): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const blob = file.slice(0, numBytes);

      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        resolve(Array.from(bytes));
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Sanitize file name to prevent path traversal
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  /**
   * Handle errors consistently
   */
  private handleError = (error: unknown): Observable<never> => {
    this.logger.error('ExpenseService error', error, 'ExpenseService');
    const errorMessage = this.logger.getErrorMessage(error, 'An unexpected error occurred');
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Start real OCR processing using Google Vision API
   */
  private async startRealOcrProcessing(receipt: Receipt, file: File): Promise<void> {
    try {
      // Update status to processing
      await this.supabase.client
        .from('receipts')
        .update({ ocr_status: OcrStatus.PROCESSING })
        .eq('id', receipt.id);

      // Process receipt with Google Vision API
      const ocrResult = await this.ocrService.processReceipt(file);

      // Update receipt with extracted data
      await this.supabase.client
        .from('receipts')
        .update({
          ocr_status: OcrStatus.COMPLETED,
          extracted_merchant: ocrResult.merchant,
          extracted_amount: ocrResult.amount,
          extracted_date: ocrResult.date,
          extracted_tax: ocrResult.tax,
          ocr_confidence: ocrResult.confidence.overall,
          ocr_data: {
            rawText: ocrResult.rawText,
            confidenceScores: ocrResult.confidence
          }
        })
        .eq('id', receipt.id);

      // Send success notification
      if (this.notificationService.shouldAlert('smartScanUpdates')) {
        const amountText = ocrResult.amount
          ? `$${ocrResult.amount.toFixed(2)}`
          : 'unknown amount';

        this.notificationService.notify({
          type: 'success',
          title: 'SmartScan complete',
          message: `Detected ${ocrResult.merchant} for ${amountText}.`,
          data: { receiptId: receipt.id }
        });
      }
    } catch (error) {
      this.logger.error('[OCR] Failed to process receipt', error, 'ExpenseService.OCR');

      // Update status to failed
      await this.supabase.client
        .from('receipts')
        .update({
          ocr_status: OcrStatus.FAILED,
          ocr_data: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        .eq('id', receipt.id);

      // Send error notification
      if (this.notificationService.shouldAlert('smartScanUpdates')) {
        this.notificationService.notify({
          type: 'error',
          title: 'SmartScan failed',
          message: 'Could not extract receipt data. Please enter manually.',
          data: { receiptId: receipt.id }
        });
      }
    }
  }

  /**
   * Start simulated OCR processing (for development/testing)
   */
  private async startSmartScanSimulation(receipt: Receipt, file: File): Promise<void> {
    try {
      await this.supabase.client
        .from('receipts')
        .update({ ocr_status: OcrStatus.PROCESSING })
        .eq('id', receipt.id);
      setTimeout(() => this.completeSmartScanSimulation(receipt.id, file), 3500);
    } catch {
      // ignore simulation errors
    }
  }

  private async completeSmartScanSimulation(receiptId: string, file: File): Promise<void> {
    const extracted = this.estimateReceiptData(file);

    await this.supabase.client
      .from('receipts')
      .update({
        ocr_status: OcrStatus.COMPLETED,
        extracted_merchant: extracted.merchant,
        extracted_amount: extracted.amount,
        extracted_date: extracted.date,
        ocr_confidence: extracted.confidence,
        ocr_data: { simulated: true }
      })
      .eq('id', receiptId);

    if (this.notificationService.shouldAlert('smartScanUpdates')) {
      this.notificationService.notify({
        type: 'success',
        title: 'SmartScan complete',
        message: `Detected ${extracted.merchant} for $${extracted.amount.toFixed(2)}.`,
        data: { receiptId }
      });
    }
  }

  private estimateReceiptData(file: File): { merchant: string; amount: number; date: string; confidence: number } {
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
    const merchant = baseName.trim()
      ? baseName
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .slice(0, 4)
          .join(' ')
      : 'Receipt Merchant';
    const amount = Number((Math.random() * 120 + 15).toFixed(2));
    const date = new Date().toISOString().slice(0, 10);
    const confidence = Number((0.85 + Math.random() * 0.1).toFixed(2));
    return { merchant, amount, date, confidence };
  }
}
