import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { RecordsModule } from '../records/records.module.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import {
  AppVersionModelName,
  AppVersionSchema,
} from './schemas/app-version.schema.js';
import { SyncLogModelName, SyncLogSchema } from './schemas/sync-log.schema.js';
import {
  PatientLinkageModelName,
  PatientLinkageSchema,
} from '../records/schemas/patient-linkage.schema.js';
import {
  ResearchRecordModelName,
  ResearchRecordSchema,
} from '../records/schemas/research-record.schema.js';
import { OutcomeModelName, OutcomeSchema } from '../outcomes/schemas/outcome.schema.js';

@Module({
  imports: [
    AuthModule,
    RecordsModule,
    MongooseModule.forFeature([
      { name: SyncLogModelName, schema: SyncLogSchema },
      { name: AppVersionModelName, schema: AppVersionSchema },
      { name: ResearchRecordModelName, schema: ResearchRecordSchema },
      { name: PatientLinkageModelName, schema: PatientLinkageSchema },
      { name: OutcomeModelName, schema: OutcomeSchema },
    ]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [MongooseModule, SyncService],
})
export class SyncModule {}
