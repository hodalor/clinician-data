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
        lazyConnection: configService.get<string>('NODE_ENV') === 'test',
      }),
    }),
  ],
  providers: [DatabaseSchemaService],
})
export class DatabaseModule {}
