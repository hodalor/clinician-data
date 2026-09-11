import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import {
  USER_ROLES,
  type UserRole,
} from '../../common/database/schema.constants.js';
import { isAdminRole } from '../../common/auth/role-access.util.js';
import { UserModelName } from './schemas/user.schema.js';
import type { UpsertUserDto } from './dto/upsert-user.dto.js';

type UserRecord = {
  _id: Types.ObjectId;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  status: 'active' | 'disabled';
  created_at: Date;
  deleted_at?: Date | null;
  deleted_by?: Types.ObjectId | null;
  delete_reason?: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserModelName)
    private readonly userModel: Model<UserRecord>,
  ) {}

  async listUsers(user: AuthenticatedUser) {
    this.assertAdmin(user);
    const users = await this.userModel
      .find({ deleted_at: null })
      .sort({ created_at: -1 })
      .lean();
    return {
      data: users.map((entry) => this.serializeUser(entry)),
    };
  }

  async createUser(user: AuthenticatedUser, payload: UpsertUserDto) {
    this.assertAdmin(user);
    const normalized = await this.prepareUserPayload(payload, true);
    const created = await this.userModel.create({
      ...normalized,
      created_at: new Date(),
    });

    return {
      user: this.serializeUser(created.toObject()),
    };
  }

  async updateUser(
    user: AuthenticatedUser,
    id: string,
    payload: UpsertUserDto,
  ) {
    this.assertAdmin(user);
    const existing = await this.userModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .exec();

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const normalized = await this.prepareUserPayload(payload, false, existing);
    existing.email = normalized.email;
    existing.full_name = normalized.full_name;
    existing.role = normalized.role;
    existing.status = normalized.status;
    if (normalized.password_hash) {
      existing.password_hash = normalized.password_hash;
    }
    await existing.save();

    return {
      user: this.serializeUser(existing.toObject()),
    };
  }

  async softDeleteUser(user: AuthenticatedUser, id: string, reason: string) {
    this.assertAdmin(user);

    if (user.userId === id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const existing = await this.userModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .exec();

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    existing.deleted_at = new Date();
    existing.deleted_by = new Types.ObjectId(user.userId);
    existing.delete_reason = this.readRequiredString(reason, 'reason');
    await existing.save();

    return {
      id: existing._id.toString(),
      deleted_at: existing.deleted_at,
      delete_reason: existing.delete_reason,
    };
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException('Only ADMIN users may manage users');
    }
  }

  private async prepareUserPayload(
    payload: UpsertUserDto,
    isCreate: boolean,
    existing?: UserRecord,
  ) {
    const email = this.readRequiredString(payload.email, 'email').toLowerCase();
    const role = this.readRequiredString(
      payload.role,
      'role',
    ) as UserRecord['role'];
    const fullName = this.readRequiredString(payload.full_name, 'full_name');
    const status = (payload.status ?? 'active') as UserRecord['status'];

    if (!USER_ROLES.includes(role)) {
      throw new BadRequestException(
        `role must be one of ${USER_ROLES.join(', ')}`,
      );
    }

    if (!['active', 'disabled'].includes(status)) {
      throw new BadRequestException('status must be active or disabled');
    }

    const duplicate = await this.userModel.findOne({ email, deleted_at: null }).lean();
    if (
      duplicate &&
      (!existing || duplicate._id.toString() !== existing._id.toString())
    ) {
      throw new BadRequestException('A user with this email already exists');
    }

    let password_hash: string | undefined;
    if (isCreate || payload.password) {
      const password = this.readRequiredString(payload.password, 'password');
      password_hash = await argon2.hash(password);
    }

    return {
      email,
      role,
      full_name: fullName,
      status,
      password_hash,
    };
  }

  private serializeUser(entry: UserRecord) {
    return {
      id: entry._id.toString(),
      email: entry.email,
      role: entry.role,
      full_name: entry.full_name,
      status: entry.status,
      created_at: entry.created_at,
      deleted_at: entry.deleted_at ?? null,
      delete_reason: entry.delete_reason ?? null,
    };
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return value.trim();
  }

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ObjectId: ${value}`);
    }
    return new Types.ObjectId(value);
  }
}
