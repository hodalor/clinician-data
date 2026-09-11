import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import {
  DeviceModelName,
  DeviceSchema,
} from '../devices/schemas/device.schema.js';
import { UserModelName, UserSchema } from '../users/schemas/user.schema.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  RefreshTokenModelName,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema.js';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: UserModelName, schema: UserSchema },
      { name: DeviceModelName, schema: DeviceSchema },
      { name: RefreshTokenModelName, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, MongooseModule],
})
export class AuthModule {}
