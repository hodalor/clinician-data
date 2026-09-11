import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { RecordsModule } from '../records/records.module.js';
import { UserModelName, UserSchema } from '../users/schemas/user.schema.js';
import { QcController } from './qc.controller.js';
import { QcService } from './qc.service.js';
import {
  QcReviewModelName,
  QcReviewSchema,
} from './schemas/qc-review.schema.js';
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
      { name: QcReviewModelName, schema: QcReviewSchema },
      { name: ResearchRecordModelName, schema: ResearchRecordSchema },
      { name: OutcomeModelName, schema: OutcomeSchema },
      { name: UserModelName, schema: UserSchema },
    ]),
  ],
  controllers: [QcController],
  providers: [QcService],
  exports: [MongooseModule, QcService],
})
export class QcModule {}
