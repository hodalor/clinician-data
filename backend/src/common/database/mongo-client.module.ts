import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';

export const MONGO_CLIENT = Symbol('MONGO_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: MONGO_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.getOrThrow<string>('MONGODB_URI');
        return new MongoClient(uri);
      },
    },
  ],
  exports: [MONGO_CLIENT],
})
export class MongoClientModule {}
