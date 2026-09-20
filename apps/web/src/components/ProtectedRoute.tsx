import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import type { Role } from '@/types/auth';

interface Props {
  children: ReactNode;
  allow?: Role[];
}

/**
 * Frontend route protection is a UX convenience only — the backend
 * independently enforces every permission via JwtAuthGuard + RolesGuard.
 * This component just avoids showing a screen the API would reject anyway.
 */
export default function ProtectedRoute({ children, allow }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
