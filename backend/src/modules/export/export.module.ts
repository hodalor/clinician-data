import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { ExportController } from './export.controller.js';
import { ExportService } from './export.service.js';
import {
  ResearchRecordModelName,
  ResearchRecordSchema,
} from '../records/schemas/research-record.schema.js';
import {
  OutcomeModelName,
  OutcomeSchema,
} from '../outcomes/schemas/outcome.schema.js';
import {
  QcReviewModelName,
  QcReviewSchema,
} from '../qc/schemas/qc-review.schema.js';
import { UserModelName, UserSchema } from '../users/schemas/user.schema.js';
import {
  ExclusionModelName,
  ExclusionSchema,
} from '../records/schemas/exclusion.schema.js';
import {
  ExportLogModelName,
  ExportLogSchema,
} from './schemas/export-log.schema.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ResearchRecordModelName, schema: ResearchRecordSchema },
      { name: OutcomeModelName, schema: OutcomeSchema },
      { name: QcReviewModelName, schema: QcReviewSchema },
      { name: UserModelName, schema: UserSchema },
      { name: ExclusionModelName, schema: ExclusionSchema },
      { name: ExportLogModelName, schema: ExportLogSchema },
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
