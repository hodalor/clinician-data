import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { UserModelName, UserSchema } from '../users/schemas/user.schema.js';
import { StudyConfigurationsController } from './study-configurations.controller.js';
import { StudyConfigurationsService } from './study-configurations.service.js';
import {
  StudyConfigurationModelName,
  StudyConfigurationSchema,
} from './schemas/study-configuration.schema.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: StudyConfigurationModelName,
        schema: StudyConfigurationSchema,
      },
      { name: UserModelName, schema: UserSchema },
    ]),
  ],
  controllers: [StudyConfigurationsController],
  providers: [StudyConfigurationsService],
  exports: [MongooseModule, StudyConfigurationsService],
})
export class StudyConfigurationsModule {}
