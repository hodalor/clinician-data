import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Db, MongoClient } from 'mongodb';
import { collectionDefinitions } from './collection-definitions.js';
import { MONGO_CLIENT } from './mongo-client.module.js';

@Injectable()
export class DatabaseSchemaService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(DatabaseSchemaService.name);
  private initialized = false;

  constructor(
    @Inject(MONGO_CLIENT) private readonly mongoClient: MongoClient,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (
      this.configService.get<string>('NODE_ENV') === 'test' ||
      this.initialized
    ) {
      return;
    }

    void this.initializeCollections();
  }

  async onApplicationShutdown() {
    await this.mongoClient.close();
  }

  private async initializeCollections() {
    try {
      await this.mongoClient.connect();

      const db = this.mongoClient.db();

      for (const definition of collectionDefinitions) {
        await this.ensureCollection(db, definition.name, definition.validator);
        await this.ensureIndexes(db, definition.name, definition.indexes ?? []);
      }

      this.initialized = true;
      this.logger.log('MongoDB collections, validators, and indexes are ready.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error';

      this.logger.error(
        `MongoDB startup bootstrap did not complete: ${message}`,
      );
    }
  }

  private async ensureCollection(
    db: Db,
    name: string,
    validator: Record<string, unknown>,
  ) {
    const existingCollection = await db.listCollections({ name }).hasNext();

    if (!existingCollection) {
      await db.createCollection(name, {
        validator,
        validationAction: 'error',
        validationLevel: 'strict',
      });
      return;
    }

    await db.command({
      collMod: name,
      validator,
      validationAction: 'error',
      validationLevel: 'strict',
    });
  }

  private async ensureIndexes(
    db: Db,
    name: string,
    indexes: Array<{
      key: Record<string, 1 | -1>;
      options?: Record<string, unknown>;
    }>,
  ) {
    if (indexes.length === 0) {
      return;
    }

    const collection = db.collection(name);

    for (const index of indexes) {
      await collection.createIndex(index.key, index.options);
    }
  }
}
