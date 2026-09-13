import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseSchemaService } from './database-schema.service.js';
import { MongoClientModule } from './mongo-client.module.js';

@Module({
  imports: [
    MongoClientModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
        autoCreate: false,
        autoIndex: false,
        // Let the HTTP server start on Cloud Run even if Atlas is slow or
        // temporarily unreachable; the first DB operation will trigger connect.
        lazyConnection: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      }),
    }),
  ],
  providers: [DatabaseSchemaService],
})
export class DatabaseModule {}
