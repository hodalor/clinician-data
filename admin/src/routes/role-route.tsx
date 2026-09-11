import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '../api/types';
import { useAuth } from '../features/auth/use-auth';
import { canAccess, defaultPathForRole } from './permissions';

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { session } = useAuth();
  const role = session?.user.role;

  if (!canAccess(role, allowedRoles)) {
    return <Navigate to={defaultPathForRole(role)} replace />;
  }

  return <Outlet />;
}
