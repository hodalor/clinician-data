import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { isAdminRole } from '../../common/auth/role-access.util.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { DeviceModelName } from './schemas/device.schema.js';
import { DeviceRequestModelName } from './schemas/device-request.schema.js';
import type { RegisterDeviceDto } from './dto/register-device.dto.js';
import { UserModelName } from '../users/schemas/user.schema.js';

type DeviceRecord = {
  _id: Types.ObjectId;
  device_id: string;
  user_id: Types.ObjectId;
  authorised: boolean;
  deactivated_at: Date | null;
  last_seen_at: Date | null;
  deleted_at?: Date | null;
  deleted_by?: Types.ObjectId | null;
  delete_reason?: string | null;
};

type UserRecord = {
  _id: Types.ObjectId;
  email: string;
  full_name: string;
  role: string;
  status: string;
  deleted_at?: Date | null;
};

type DeviceRequestRecord = {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  requested_device_id: string;
  requested_at: Date;
  status: 'pending' | 'approved' | 'rejected';
  save: () => Promise<DeviceRequestRecord>;
};

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(DeviceModelName)
    private readonly deviceModel: Model<DeviceRecord>,
    @InjectModel(DeviceRequestModelName)
    private readonly deviceRequestModel: Model<DeviceRequestRecord>,
    @InjectModel(UserModelName)
    private readonly userModel: Model<UserRecord>,
  ) {}

  async registerDevice(
    user: AuthenticatedUser,
    registerDeviceDto: RegisterDeviceDto,
  ) {
    const deviceId = this.readRequiredString(
      registerDeviceDto.device_id,
      'device_id',
    );
    const now = new Date();

    if (user.role === 'RA' && user.deviceId && user.deviceId !== deviceId) {
      throw new BadRequestException(
        'RA device registration must use the same x-device-id that was used at login',
      );
    }

    if (user.role === 'RA') {
      const activeDevice = await this.deviceModel
        .findOne({
          user_id: new Types.ObjectId(user.userId),
          authorised: true,
          deactivated_at: null,
        deleted_at: null,
        })
        .exec();

      if (activeDevice && activeDevice.device_id !== deviceId) {
        throw new ConflictException(
          'This RA account already has an active device. Ask an admin to deactivate it before registering another device.',
        );
      }
    }

    const existingDevice = await this.deviceModel.findOne({
      user_id: new Types.ObjectId(user.userId),
      device_id: deviceId,
    });

    if (existingDevice) {
      existingDevice.deleted_at = null;
      existingDevice.deleted_by = null;
      existingDevice.delete_reason = null;
      existingDevice.authorised = true;
      existingDevice.deactivated_at = null;
      existingDevice.last_seen_at = now;
      await existingDevice.save();

      return {
        device_id: existingDevice.device_id,
        authorised: existingDevice.authorised,
        deactivated_at: existingDevice.deactivated_at,
        last_seen_at: existingDevice.last_seen_at,
      };
    }

    const device = await this.deviceModel.create({
      device_id: deviceId,
      user_id: new Types.ObjectId(user.userId),
      authorised: true,
      deactivated_at: null,
      last_seen_at: now,
    });

    return {
      device_id: device.device_id,
      authorised: device.authorised,
      deactivated_at: device.deactivated_at,
      last_seen_at: device.last_seen_at,
    };
  }

  async listDevices(user: AuthenticatedUser) {
    this.assertAdmin(user);
    const devices = await this.deviceModel
      .find({ deleted_at: null })
      .sort({ last_seen_at: -1 })
      .lean();
    const users = await this.userModel
      .find({
        _id: { $in: devices.map((device) => device.user_id) },
        deleted_at: null,
      })
      .lean();
    const userMap = new Map(
      users.map((entry) => [entry._id.toString(), entry]),
    );

    return {
      data: devices.map((device) => ({
        id: device._id.toString(),
        device_id: device.device_id,
        user_id: device.user_id.toString(),
        user_name:
          userMap.get(device.user_id.toString())?.full_name ?? 'Unknown user',
        user_email: userMap.get(device.user_id.toString())?.email ?? null,
        authorised: device.authorised,
        deactivated_at: device.deactivated_at,
        last_seen_at: device.last_seen_at,
      })),
    };
  }

  async listDeviceRequests(user: AuthenticatedUser, status = 'pending') {
    this.assertAdmin(user);
    const query: Record<string, unknown> = {};

    if (status.trim().length > 0) {
      query.status = this.readRequestStatus(status);
    }

    const requests = await this.deviceRequestModel
      .find(query)
      .sort({ requested_at: -1, _id: -1 })
      .lean();
    const users = await this.userModel
      .find({ _id: { $in: requests.map((request) => request.user_id) } })
      .lean();
    const userMap = new Map(
      users.map((entry) => [entry._id.toString(), entry]),
    );

    return {
      data: requests.map((request) => ({
        id: request._id.toString(),
        user_id: request.user_id.toString(),
        user_name:
          userMap.get(request.user_id.toString())?.full_name ?? 'Unknown user',
        user_email: userMap.get(request.user_id.toString())?.email ?? null,
        requested_device_id: request.requested_device_id,
        requested_at: request.requested_at,
        status: request.status,
      })),
    };
  }

  async deactivateDevice(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    const device = await this.deviceModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .exec();

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.authorised = false;
    device.deactivated_at = new Date();
    await device.save();

    return {
      device_id: device.device_id,
      authorised: device.authorised,
      deactivated_at: device.deactivated_at,
    };
  }

  async softDeleteDevice(user: AuthenticatedUser, id: string, reason: string) {
    this.assertAdmin(user);
    const device = await this.deviceModel
      .findOne({ _id: this.toObjectId(id), deleted_at: null })
      .exec();

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.deleted_at = new Date();
    device.deleted_by = new Types.ObjectId(user.userId);
    device.delete_reason = this.readRequiredString(reason, 'reason');
    await device.save();

    return {
      id: device._id.toString(),
      deleted_at: device.deleted_at,
      delete_reason: device.delete_reason,
    };
  }

  async approveDeviceRequest(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    const request = await this.deviceRequestModel
      .findById(this.toObjectId(id))
      .exec();

    if (!request) {
      throw new NotFoundException('Device request not found');
    }

    if (request.status !== 'pending') {
      throw new ConflictException('Only pending requests can be approved');
    }

    const targetUser = await this.userModel
      .findOne({ _id: request.user_id, deleted_at: null })
      .lean();

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.role !== 'RA') {
      throw new ConflictException('Only RA device requests can be approved');
    }

    const now = new Date();

    await this.deviceModel.updateMany(
      {
        user_id: request.user_id,
        device_id: { $ne: request.requested_device_id },
        authorised: true,
        deactivated_at: null,
        deleted_at: null,
      },
      {
        $set: {
          authorised: false,
          deactivated_at: now,
        },
      },
    );

    const existingDevice = await this.deviceModel
      .findOne({
        user_id: request.user_id,
        device_id: request.requested_device_id,
      })
      .exec();

    if (existingDevice) {
      existingDevice.deleted_at = null;
      existingDevice.deleted_by = null;
      existingDevice.delete_reason = null;
      existingDevice.authorised = true;
      existingDevice.deactivated_at = null;
      existingDevice.last_seen_at = now;
      await existingDevice.save();
    } else {
      await this.deviceModel.create({
        user_id: request.user_id,
        device_id: request.requested_device_id,
        authorised: true,
        deactivated_at: null,
        last_seen_at: now,
      });
    }

    request.status = 'approved';
    await request.save();

    await this.deviceRequestModel.updateMany(
      {
        user_id: request.user_id,
        status: 'pending',
        _id: { $ne: request._id },
      },
      {
        $set: {
          status: 'rejected',
        },
      },
    );

    return {
      id: request._id.toString(),
      status: request.status,
      user_id: request.user_id.toString(),
      requested_device_id: request.requested_device_id,
      requested_at: request.requested_at,
    };
  }

  async rejectDeviceRequest(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    const request = await this.deviceRequestModel
      .findById(this.toObjectId(id))
      .exec();

    if (!request) {
      throw new NotFoundException('Device request not found');
    }

    if (request.status !== 'pending') {
      throw new ConflictException('Only pending requests can be rejected');
    }

    request.status = 'rejected';
    await request.save();

    return {
      id: request._id.toString(),
      status: request.status,
      user_id: request.user_id.toString(),
      requested_device_id: request.requested_device_id,
      requested_at: request.requested_at,
    };
  }

  async authoriseReplacement(
    user: AuthenticatedUser,
    payload: { user_id: string; device_id: string },
  ) {
    this.assertAdmin(user);
    const targetUserId = this.toObjectId(
      this.readRequiredString(payload.user_id, 'user_id'),
    );
    const deviceId = this.readRequiredString(payload.device_id, 'device_id');
    const now = new Date();
    const targetUser = await this.userModel
      .findOne({ _id: targetUserId, deleted_at: null })
      .lean();

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const existing = await this.deviceModel.findOne({
      user_id: targetUserId,
      device_id: deviceId,
    });

    if (existing) {
      existing.deleted_at = null;
      existing.deleted_by = null;
      existing.delete_reason = null;
      existing.authorised = true;
      existing.deactivated_at = null;
      existing.last_seen_at = now;
      await existing.save();
      return {
        device_id: existing.device_id,
        authorised: existing.authorised,
        deactivated_at: existing.deactivated_at,
        last_seen_at: existing.last_seen_at,
      };
    }

    const created = await this.deviceModel.create({
      user_id: targetUserId,
      device_id: deviceId,
      authorised: true,
      deactivated_at: null,
      last_seen_at: now,
    });

    return {
      device_id: created.device_id,
      authorised: created.authorised,
      deactivated_at: created.deactivated_at,
      last_seen_at: created.last_seen_at,
    };
  }

  private assertAdmin(user: AuthenticatedUser) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException('Only ADMIN users may manage devices');
    }
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private readRequestStatus(value: string) {
    if (value === 'pending' || value === 'approved' || value === 'rejected') {
      return value;
    }

    throw new BadRequestException(
      'status must be one of pending, approved, rejected',
    );
  }

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ObjectId: ${value}`);
    }
    return new Types.ObjectId(value);
  }
}
