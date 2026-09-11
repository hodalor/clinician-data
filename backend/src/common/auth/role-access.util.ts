import type { UserRole } from '../database/schema.constants.js';

export function isSuperAdminRole(role: UserRole) {
  return role === 'SUPERADMIN';
}

export function hasRoleAccess(role: UserRole, allowedRoles: UserRole[]) {
  return isSuperAdminRole(role) || allowedRoles.includes(role);
}

export function isAdminRole(role: UserRole) {
  return role === 'ADMIN' || isSuperAdminRole(role);
}

export function isPiRole(role: UserRole) {
  return role === 'PI' || isSuperAdminRole(role);
}

export function isPiOrAdminRole(role: UserRole) {
  return role === 'PI' || isAdminRole(role);
}

export function isQcOrPiRole(role: UserRole) {
  return role === 'QC' || isPiRole(role);
}
