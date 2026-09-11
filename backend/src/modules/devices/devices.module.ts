import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { UserModelName, UserSchema } from '../users/schemas/user.schema.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { DeviceModelName, DeviceSchema } from './schemas/device.schema.js';
import {
  DeviceRequestModelName,
  DeviceRequestSchema,
} from './schemas/device-request.schema.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: DeviceModelName, schema: DeviceSchema },
      { name: DeviceRequestModelName, schema: DeviceRequestSchema },
      { name: UserModelName, schema: UserSchema },
    ]),
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [MongooseModule, DevicesService],
})
export class DevicesModule {}
