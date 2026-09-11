import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import type { JwtPayload } from '../../common/auth/jwt-payload.interface.js';
import type { UserRole } from '../../common/database/schema.constants.js';
import { DeviceModelName } from '../devices/schemas/device.schema.js';
import { DeviceRequestModelName } from '../devices/schemas/device-request.schema.js';
import type { LoginDto } from './dto/login.dto.js';
import type { LogoutDto } from './dto/logout.dto.js';
import type { RefreshDto } from './dto/refresh.dto.js';
import { RefreshTokenModelName } from './schemas/refresh-token.schema.js';
import { UserModelName } from '../users/schemas/user.schema.js';

type UserRecord = {
  _id: Types.ObjectId;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  status: string;
};

type DeviceRecord = {
  _id: Types.ObjectId;
  device_id: string;
  user_id: Types.ObjectId;
  authorised: boolean;
  deactivated_at: Date | null;
  last_seen_at: Date | null;
};

type RefreshTokenRecord = {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  jti: string;
  token_hash: string;
  device_id: string | null;
  revoked_at: Date | null;
  expires_at: Date;
  created_at: Date;
};

type DeviceRequestRecord = {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  requested_device_id: string;
  requested_at: Date;
  status: 'pending' | 'approved' | 'rejected';
  save: () => Promise<DeviceRequestRecord>;
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(UserModelName)
    private readonly userModel: Model<UserRecord>,
    @InjectModel(DeviceModelName)
    private readonly deviceModel: Model<DeviceRecord>,
    @InjectModel(DeviceRequestModelName)
    private readonly deviceRequestModel: Model<DeviceRequestRecord>,
    @InjectModel(RefreshTokenModelName)
    private readonly refreshTokenModel: Model<RefreshTokenRecord>,
  ) {}

  async login(
    loginDto: LoginDto,
    deviceIdHeader?: string,
    isApprovalPoll = false,
  ) {
    const email = this.readRequiredString(
      loginDto.email,
      'email',
    ).toLowerCase();
    const password = this.readRequiredString(loginDto.password, 'password');
    const deviceId = this.readOptionalDeviceId(deviceIdHeader);

    const user = await this.userModel.findOne({ email }).exec();

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2.verify(user.password_hash, password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.role === 'RA') {
      const deviceGateResponse = await this.enforceRaDeviceLogin(
        user,
        deviceId,
        isApprovalPoll,
      );

      if (deviceGateResponse) {
        return deviceGateResponse;
      }
    }

    const tokens = await this.issueTokens(user, deviceId);

    return {
      ...tokens,
      user: {
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  async refresh(refreshDto: RefreshDto) {
    const refreshToken = this.readRequiredString(
      refreshDto.refresh_token,
      'refresh_token',
    );
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.refreshTokenModel
      .findOne({
        jti: payload.jti,
        user_id: new Types.ObjectId(payload.sub),
      })
      .exec();

    if (!session) {
      throw new UnauthorizedException('Refresh token is not recognised');
    }

    this.assertRefreshSessionIsUsable(session, refreshToken);

    const user = await this.userModel.findById(payload.sub).exec();

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    if (user.role === 'RA') {
      await this.assertRaDeviceStillAuthorised(user._id, session.device_id);
    }

    session.revoked_at = new Date();
    await session.save();

    return this.issueTokens(user, session.device_id);
  }

  async logout(logoutDto: LogoutDto) {
    const refreshToken = this.readRequiredString(
      logoutDto.refresh_token,
      'refresh_token',
    );
    const payload = await this.verifyRefreshToken(refreshToken);

    await this.refreshTokenModel.updateOne(
      {
        jti: payload.jti,
        user_id: new Types.ObjectId(payload.sub),
        revoked_at: null,
      },
      {
        $set: {
          revoked_at: new Date(),
        },
      },
    );

    return {
      success: true,
    };
  }

  private async issueTokens(user: UserRecord, deviceId: string | null) {
    const accessPayload: JwtPayload = {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      full_name: user.full_name,
      device_id: deviceId,
      type: 'access',
    };

    const refreshJti = randomUUID();
    const refreshPayload: JwtPayload = {
      ...accessPayload,
      jti: refreshJti,
      type: 'refresh',
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      }),
    ]);

    await this.refreshTokenModel.updateMany(
      {
        user_id: user._id,
        device_id: deviceId,
        revoked_at: null,
      },
      {
        $set: {
          revoked_at: new Date(),
        },
      },
    );

    await this.refreshTokenModel.create({
      user_id: user._id,
      jti: refreshJti,
      token_hash: this.hashToken(refresh_token),
      device_id: deviceId,
      revoked_at: null,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      created_at: new Date(),
    });

    return {
      access_token,
      refresh_token,
      access_token_expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token_expires_in: REFRESH_TOKEN_TTL_SECONDS,
    };
  }

  private async enforceRaDeviceLogin(
    user: UserRecord,
    deviceId: string | null,
    isApprovalPoll: boolean,
  ) {
    if (!deviceId) {
      throw new BadRequestException(
        'x-device-id header is required for RA login',
      );
    }

    const activeDevice = await this.deviceModel
      .findOne({
        user_id: user._id,
        authorised: true,
        deactivated_at: null,
      })
      .sort({ last_seen_at: -1, _id: -1 })
      .exec();

    if (activeDevice && activeDevice.device_id !== deviceId) {
      return this.createOrRefreshDeviceRequest(user, deviceId, isApprovalPoll);
    }

    if (activeDevice && activeDevice.device_id === deviceId) {
      activeDevice.last_seen_at = new Date();
      await activeDevice.save();
    }

    return null;
  }

  private async createOrRefreshDeviceRequest(
    user: UserRecord,
    deviceId: string,
    isApprovalPoll: boolean,
  ) {
    const now = new Date();
    const existingRequest = await this.deviceRequestModel
      .findOne({
        user_id: user._id,
        requested_device_id: deviceId,
      })
      .exec();

    if (!existingRequest) {
      const createdRequest = await this.deviceRequestModel.create({
        user_id: user._id,
        requested_device_id: deviceId,
        requested_at: now,
        status: 'pending',
      });

      return this.pendingApprovalResponse(createdRequest);
    }

    if (existingRequest.status === 'rejected' && isApprovalPoll) {
      return this.rejectedApprovalResponse(existingRequest);
    }

    if (existingRequest.status !== 'pending' || !isApprovalPoll) {
      existingRequest.status = 'pending';
      existingRequest.requested_at = now;
      await existingRequest.save();
    }

    return this.pendingApprovalResponse(existingRequest);
  }

  private pendingApprovalResponse(request: DeviceRequestRecord) {
    return {
      status: 'pending_approval' as const,
      request_id: request._id.toString(),
      message: 'Waiting for admin approval to use this phone.',
    };
  }

  private rejectedApprovalResponse(request: DeviceRequestRecord) {
    return {
      status: 'rejected' as const,
      request_id: request._id.toString(),
      message:
        'This phone was not approved for this account. Please contact an admin or try again later.',
    };
  }

  private async assertRaDeviceStillAuthorised(
    userId: Types.ObjectId,
    deviceId: string | null,
  ) {
    if (!deviceId) {
      throw new UnauthorizedException(
        'Refresh token is missing a device binding',
      );
    }

    const activeDevice = await this.deviceModel.findOne({
      user_id: userId,
      device_id: deviceId,
      authorised: true,
      deactivated_at: null,
    });

    if (!activeDevice) {
      throw new UnauthorizedException('Device is no longer authorised');
    }
  }

  private assertRefreshSessionIsUsable(
    session: RefreshTokenRecord,
    refreshToken: string,
  ) {
    if (session.revoked_at) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (session.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (session.token_hash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException('Refresh token does not match');
    }
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      if (payload.type !== 'refresh' || !payload.jti) {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return value.trim();
  }

  private readOptionalDeviceId(value?: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null;
    }

    return value.trim();
  }
}
