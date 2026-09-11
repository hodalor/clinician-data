import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import {
  ResearchRecordModelName,
  ResearchRecordSchema,
} from '../records/schemas/research-record.schema.js';
import { UserModelName, UserSchema } from '../users/schemas/user.schema.js';
import { AssignmentsController } from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';
import {
  AssignmentModelName,
  AssignmentSchema,
} from './schemas/assignment.schema.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: AssignmentModelName, schema: AssignmentSchema },
      { name: UserModelName, schema: UserSchema },
      { name: ResearchRecordModelName, schema: ResearchRecordSchema },
    ]),
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [MongooseModule, AssignmentsService],
})
export class AssignmentsModule {}
