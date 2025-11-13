import { UserRole } from './enums';

/**
 * User model matching the database schema
 * Synced with Supabase auth.users and public.users table
 */
export interface User {
  /** UUID from Supabase auth.users */
  id: string;
  /** User's email address (unique) */
  email: string;
  /** User's full name */
  full_name: string;
  /** User role for RBAC (employee, finance, admin) */
  role: UserRole;
  /** Department name (optional) */
  department?: string;
  /** Reference to manager's user ID for approval workflows */
  manager_id?: string;
  /** Timestamp when user was created */
  created_at: string;
  /** Timestamp when user was last updated */
  updated_at: string;
}

/**
 * User profile with populated manager relationship
 * Used for displaying user details with manager info
 */
export interface UserProfile {
  /** User data */
  user: User;
  /** Manager user object (populated) */
  manager?: User;
}

/**
 * Authentication response from Supabase
 * Returned on successful login or registration
 */
export interface AuthResponse {
  /** Authenticated user */
  user: User;
  /** Session tokens */
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

/**
 * Login form credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration form credentials
 * Extends LoginCredentials with additional fields
 */
export interface RegisterCredentials extends LoginCredentials {
  /** User's full name */
  full_name: string;
  /** Password confirmation for validation */
  confirm_password: string;
}

/**
 * Password reset request credentials
 */
export interface ResetPasswordCredentials {
  email: string;
}
