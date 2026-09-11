import type { UserRole } from '../database/schema.constants.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  deviceId: string | null;
}
