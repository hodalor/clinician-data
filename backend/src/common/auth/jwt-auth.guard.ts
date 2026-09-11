import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Request } from 'express';
import { UserModelName } from '../../modules/users/schemas/user.schema.js';
import type { JwtPayload } from './jwt-payload.interface.js';
import type { AuthenticatedUser } from './authenticated-user.interface.js';

type UserRecord = {
  _id: { toString(): string };
  email: string;
  full_name: string;
  role: AuthenticatedUser['role'];
  status: string;
};

type AuthenticatedRequest = Request & {
  authUser?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(UserModelName)
    private readonly userModel: Model<UserRecord>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token type');
    }

    const user = await this.userModel.findById(payload.sub).lean();

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    request.authUser = {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      deviceId: payload.device_id ?? null,
    };

    return true;
  }

  private extractBearerToken(request: Request) {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
