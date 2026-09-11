import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import {
  AssignmentModelName,
  AssignmentSchema,
} from '../assignments/schemas/assignment.schema.js';
import { DeviceModelName, DeviceSchema } from '../devices/schemas/device.schema.js';
import {
  ResearchRecordModelName,
  ResearchRecordSchema,
} from '../records/schemas/research-record.schema.js';
import { UserModelName, UserSchema } from '../users/schemas/user.schema.js';
import { SuperbinController } from './superbin.controller.js';
import { SuperbinService } from './superbin.service.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: UserModelName, schema: UserSchema },
      { name: AssignmentModelName, schema: AssignmentSchema },
      { name: DeviceModelName, schema: DeviceSchema },
      { name: ResearchRecordModelName, schema: ResearchRecordSchema },
    ]),
  ],
  controllers: [SuperbinController],
  providers: [SuperbinService],
})
export class SuperbinModule {}
