import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutcomeModelName, OutcomeSchema } from './schemas/outcome.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OutcomeModelName, schema: OutcomeSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class OutcomesModule {}
