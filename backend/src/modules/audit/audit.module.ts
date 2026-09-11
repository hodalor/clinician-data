import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import {
  ResearchRecordModelName,
  ResearchRecordSchema,
} from '../records/schemas/research-record.schema.js';
import { UserModelName, UserSchema } from '../users/schemas/user.schema.js';
import { AuditController } from './audit.controller.js';
import {
  AuditLogModelName,
  AuditLogSchema,
} from './schemas/audit-log.schema.js';
import { AuditService } from './audit.service.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: AuditLogModelName, schema: AuditLogSchema },
      { name: UserModelName, schema: UserSchema },
      { name: ResearchRecordModelName, schema: ResearchRecordSchema },
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [MongooseModule, AuditService],
})
export class AuditModule {}
