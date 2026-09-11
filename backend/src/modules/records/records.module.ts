import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentsModule } from '../assignments/assignments.module.js';
import {
  AuditLogModelName,
  AuditLogSchema,
} from '../audit/schemas/audit-log.schema.js';
import { AuthModule } from '../auth/auth.module.js';
import { OutcomesModule } from '../outcomes/outcomes.module.js';
import { UserModelName, UserSchema } from '../users/schemas/user.schema.js';
import { RecordsController } from './records.controller.js';
import { RecordsService } from './records.service.js';
import {
  ExclusionModelName,
  ExclusionSchema,
} from './schemas/exclusion.schema.js';
import {
  PatientLinkageModelName,
  PatientLinkageSchema,
} from './schemas/patient-linkage.schema.js';
import {
  ResearchRecordModelName,
  ResearchRecordSchema,
} from './schemas/research-record.schema.js';

@Module({
  imports: [
    AuthModule,
    AssignmentsModule,
    OutcomesModule,
    MongooseModule.forFeature([
      { name: PatientLinkageModelName, schema: PatientLinkageSchema },
      { name: ResearchRecordModelName, schema: ResearchRecordSchema },
      { name: ExclusionModelName, schema: ExclusionSchema },
      { name: AuditLogModelName, schema: AuditLogSchema },
      { name: UserModelName, schema: UserSchema },
    ]),
  ],
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [MongooseModule, RecordsService],
})
export class RecordsModule {}
