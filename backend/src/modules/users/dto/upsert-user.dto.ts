import type { UserRole } from '../../../common/database/schema.constants.js';

export interface UpsertUserDto {
  email: string;
  password?: string;
  role: UserRole;
  full_name: string;
  status?: 'active' | 'disabled';
}
