import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditContextInterceptor } from './common/audit/audit-context.interceptor.js';
import appConfig from './config/app.config.js';
import { validateEnv } from './config/env.validation.js';
import { DatabaseModule } from './common/database/database.module.js';
import { HealthModule } from './common/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { DevicesModule } from './modules/devices/devices.module.js';
import { AssignmentsModule } from './modules/assignments/assignments.module.js';
import { RecordsModule } from './modules/records/records.module.js';
import { OutcomesModule } from './modules/outcomes/outcomes.module.js';
import { QcModule } from './modules/qc/qc.module.js';
import { SyncModule } from './modules/sync/sync.module.js';
import { ExportModule } from './modules/export/export.module.js';
import { AuditModule } from './modules/audit/audit.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
      load: [appConfig],
      validate: validateEnv,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    DevicesModule,
    AssignmentsModule,
    RecordsModule,
    OutcomesModule,
    QcModule,
    SyncModule,
    ExportModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
  ],
})
export class AppModule {}
