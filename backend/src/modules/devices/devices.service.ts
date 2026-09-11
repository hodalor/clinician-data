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
import type { RegisterDeviceDto } from './dto/register-device.dto.js';
import { UserModelName } from '../users/schemas/user.schema.js';

type DeviceRecord = {
  _id: Types.ObjectId;
  device_id: string;
  user_id: Types.ObjectId;
  authorised: boolean;
  deactivated_at: Date | null;
  last_seen_at: Date | null;
};

type UserRecord = {
  _id: Types.ObjectId;
  email: string;
  full_name: string;
  role: string;
  status: string;
};

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(DeviceModelName)
    private readonly deviceModel: Model<DeviceRecord>,
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
      .find({})
      .sort({ last_seen_at: -1 })
      .lean();
    const users = await this.userModel
      .find({ _id: { $in: devices.map((device) => device.user_id) } })
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

  async deactivateDevice(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    const device = await this.deviceModel.findById(this.toObjectId(id)).exec();

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
    const targetUser = await this.userModel.findById(targetUserId).lean();

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const existing = await this.deviceModel.findOne({
      user_id: targetUserId,
      device_id: deviceId,
    });

    if (existing) {
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

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ObjectId: ${value}`);
    }
    return new Types.ObjectId(value);
  }
}
