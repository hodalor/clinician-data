import type { UserRole } from '../database/schema.constants.js';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
  full_name: string;
  device_id: string | null;
  jti?: string;
  type: 'access' | 'refresh';
}
