import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { isSuperAdminRole } from '../../common/auth/role-access.util.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import {
  AssignmentModelName,
} from '../assignments/schemas/assignment.schema.js';
import { DeviceModelName } from '../devices/schemas/device.schema.js';
import {
  ResearchRecordModelName,
} from '../records/schemas/research-record.schema.js';
import { UserModelName } from '../users/schemas/user.schema.js';

type SoftDeletedDocument = {
  _id: Types.ObjectId;
  deleted_at?: Date | null;
  deleted_by?: Types.ObjectId | null;
  delete_reason?: string | null;
  save: () => Promise<SoftDeletedDocument>;
};

type CollectionKey = 'users' | 'assignments' | 'devices' | 'records';

@Injectable()
export class SuperbinService {
  private readonly allowedCollections: CollectionKey[] = [
    'users',
    'assignments',
    'devices',
    'records',
  ];

  constructor(
    @InjectModel(UserModelName)
    private readonly userModel: Model<any>,
    @InjectModel(AssignmentModelName)
    private readonly assignmentModel: Model<any>,
    @InjectModel(DeviceModelName)
    private readonly deviceModel: Model<any>,
    @InjectModel(ResearchRecordModelName)
    private readonly recordModel: Model<any>,
  ) {}

  async listDeletedItems(user: AuthenticatedUser, collection: string) {
    this.assertSuperAdmin(user);
    const key = this.readCollection(collection);
    const model = this.getModel(key);

    const items = await model
      .find({ deleted_at: { $ne: null } })
      .sort({ deleted_at: -1, _id: -1 })
      .lean();

    return {
      data: items.map((item: any) => this.serialize(key, item)),
    };
  }

  async restoreItem(user: AuthenticatedUser, collection: string, id: string) {
    this.assertSuperAdmin(user);
    const key = this.readCollection(collection);
    const model = this.getModel(key);
    const item = (await model
      .findOne({ _id: this.toObjectId(id), deleted_at: { $ne: null } })
      .exec()) as SoftDeletedDocument | null;

    if (!item) {
      throw new NotFoundException('Deleted item not found');
    }

    item.deleted_at = null;
    item.deleted_by = null;
    item.delete_reason = null;
    await item.save();

    return {
      success: true,
    };
  }

  async permanentlyDeleteItem(
    user: AuthenticatedUser,
    collection: string,
    id: string,
  ) {
    this.assertSuperAdmin(user);
    const key = this.readCollection(collection);
    const model = this.getModel(key);
    const deleted = await model.findOneAndDelete({
      _id: this.toObjectId(id),
      deleted_at: { $ne: null },
    });

    if (!deleted) {
      throw new NotFoundException('Deleted item not found');
    }

    return {
      success: true,
    };
  }

  private serialize(collection: CollectionKey, item: any) {
    const base = {
      id: item._id.toString(),
      deleted_at: item.deleted_at ?? null,
      delete_reason: item.delete_reason ?? null,
    };

    switch (collection) {
      case 'users':
        return {
          ...base,
          title: item.full_name,
          subtitle: item.email,
          status: item.status,
          detail: item.role,
        };
      case 'assignments':
        return {
          ...base,
          title: item.status,
          subtitle: `${item.register_pages?.join(', ') || 'No register pages'} / ${
            item.file_ranges?.join(', ') || 'No file ranges'
          }`,
          status: item.status,
          detail: item.ra_id?.toString() ?? '',
        };
      case 'devices':
        return {
          ...base,
          title: item.device_id,
          subtitle: item.user_id?.toString() ?? '',
          status: item.authorised ? 'Authorised' : 'Inactive',
          detail: item.last_seen_at ? new Date(item.last_seen_at).toLocaleString() : 'Never seen',
        };
      case 'records':
        return {
          ...base,
          title: item.study_id,
          subtitle: item.status,
          status: item.status,
          detail: item.mode ?? '',
        };
    }
  }

  private getModel(collection: CollectionKey) {
    switch (collection) {
      case 'users':
        return this.userModel;
      case 'assignments':
        return this.assignmentModel;
      case 'devices':
        return this.deviceModel;
      case 'records':
        return this.recordModel;
    }
  }

  private assertSuperAdmin(user: AuthenticatedUser) {
    if (!isSuperAdminRole(user.role)) {
      throw new ForbiddenException(
        'Only SUPERADMIN users may access the superbin',
      );
    }
  }

  private readCollection(value: string) {
    if (this.allowedCollections.includes(value as CollectionKey)) {
      return value as CollectionKey;
    }

    throw new BadRequestException(
      `collection must be one of ${this.allowedCollections.join(', ')}`,
    );
  }

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ObjectId: ${value}`);
    }

    return new Types.ObjectId(value);
  }
}
