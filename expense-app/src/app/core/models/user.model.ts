import { UserRole } from './enums';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user: User;
  manager?: User;
}

export interface AuthResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  full_name: string;
  confirm_password: string;
}

export interface ResetPasswordCredentials {
  email: string;
}
