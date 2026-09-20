import { useAuth } from '@/features/auth/AuthContext';
import EmployeeDashboard from '@/features/dashboard/EmployeeDashboard';
import AdminManagerDashboard from '@/features/dashboard/AdminManagerDashboard';

/** Sends each role to the dashboard shaped for them. */
export default function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'EMPLOYEE' ? <EmployeeDashboard /> : <AdminManagerDashboard />;
}
