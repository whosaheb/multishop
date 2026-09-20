export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  fullName: string;
  mobileNumber: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
