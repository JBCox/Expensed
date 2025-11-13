export enum UserRole {
  EMPLOYEE = 'employee',
  FINANCE = 'finance',
  ADMIN = 'admin'
}

export enum ExpenseStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REIMBURSED = 'reimbursed'
}

export enum ExpenseCategory {
  FUEL = 'Fuel',
  MEALS = 'Meals & Entertainment',
  LODGING = 'Lodging',
  AIRFARE = 'Airfare',
  GROUND_TRANSPORTATION = 'Ground Transportation',
  OFFICE_SUPPLIES = 'Office Supplies',
  SOFTWARE = 'Software/Subscriptions',
  MISCELLANEOUS = 'Miscellaneous'
}

export enum OcrStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
