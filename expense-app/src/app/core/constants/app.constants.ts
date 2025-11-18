/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

// ============================================================================
// FILE SIZE CONSTANTS
// ============================================================================

/** Bytes in one kilobyte */
export const BYTES_PER_KB = 1024;

/** Bytes in one megabyte */
export const BYTES_PER_MB = 1024 * 1024;

/** Maximum file size for receipt uploads (5MB) */
export const MAX_RECEIPT_FILE_SIZE = 5 * BYTES_PER_MB;

// ============================================================================
// TIME CONSTANTS
// ============================================================================

/** Milliseconds in one second */
export const MS_PER_SECOND = 1000;

/** Milliseconds in one minute */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Milliseconds in one hour */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Milliseconds in one day */
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Default invitation expiration time (7 days) */
export const INVITATION_EXPIRY_DAYS = 7;

/** Invitation expiration in milliseconds */
export const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_DAYS * MS_PER_DAY;

// ============================================================================
// LOGGING CONSTANTS
// ============================================================================

/** Maximum number of log entries to keep in memory */
export const MAX_LOG_ENTRIES = 100;

// ============================================================================
// UI CONSTANTS
// ============================================================================

/** Default snackbar duration (milliseconds) */
export const SNACKBAR_DURATION = 3000;

/** Success message snackbar duration (milliseconds) */
export const SNACKBAR_SUCCESS_DURATION = 4000;

/** Error message snackbar duration (milliseconds) */
export const SNACKBAR_ERROR_DURATION = 5000;

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

/** Default page size for lists */
export const DEFAULT_PAGE_SIZE = 25;

/** Available page size options */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ============================================================================
// ALLOWED FILE TYPES
// ============================================================================

/** Allowed MIME types for receipt uploads */
export const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;

// ============================================================================
// EXPENSE LIMITS
// ============================================================================

/** Maximum per-gallon fuel expense ($10) */
export const MAX_FUEL_PER_GALLON = 10.00;

/** Maximum single expense amount ($5000) */
export const MAX_SINGLE_EXPENSE = 5000.00;

/** Mileage reimbursement rate (per mile) */
export const MILEAGE_RATE_PER_MILE = 0.67;
