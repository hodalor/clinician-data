import type { UserRole } from '../api/types';

export interface NavItem {
  label: string;
  path: string;
  roles: UserRole[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', roles: ['PI', 'ADMIN'] },
  { label: 'Assignments', path: '/assignments', roles: ['PI', 'ADMIN'] },
  { label: 'Records', path: '/records', roles: ['PI', 'ADMIN'] },
  { label: 'QC', path: '/qc', roles: ['QC', 'PI'] },
  { label: 'Duplicates', path: '/duplicates', roles: ['QC', 'PI'] },
  { label: 'Missingness', path: '/missingness', roles: ['PI', 'ADMIN'] },
  { label: 'Destination Codes', path: '/destination-codes', roles: ['PI', 'ADMIN'] },
  { label: 'Export', path: '/export', roles: ['PI'] },
  { label: 'Manual', path: '/manual', roles: ['QC', 'PI', 'ADMIN'] },
  { label: 'Users', path: '/users', roles: ['PI', 'ADMIN'] },
  { label: 'Devices', path: '/devices', roles: ['PI', 'ADMIN'] },
  { label: 'Audit', path: '/audit', roles: ['PI', 'ADMIN'] },
  { label: 'Superbin', path: '/superbin', roles: ['SUPERADMIN'] },
];

export function canAccess(role: UserRole | undefined, allowedRoles: UserRole[]) {
  if (!role) {
    return false;
  }

  if (role === 'SUPERADMIN') {
    return true;
  }

  return allowedRoles.includes(role);
}

export function defaultPathForRole(role: UserRole | undefined) {
  switch (role) {
    case 'QC':
      return '/qc';
    case 'PI':
    case 'ADMIN':
    case 'SUPERADMIN':
      return '/dashboard';
    default:
      return '/login';
  }
}
