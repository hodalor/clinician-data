import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is required to flag invalid discriminator records');
}

const client = new MongoClient(uri);

const reviewNote =
  'Flagged for review: discriminator_type is set even though discriminator_yes is No.';

try {
  await client.connect();
  const db = client.db();

  const filter = {
    deleted_at: null,
    mode: { $in: ['PILOT', 'TRAINING'] },
    'sats.discriminator_yes': false,
    'sats.discriminator_type': { $nin: [null, '', '0'] },
  };

  const candidates = await db
    .collection('research_records')
    .find(filter, { projection: { _id: 1, study_id: 1, status: 1, data_quality: 1 } })
    .toArray();

  if (candidates.length === 0) {
    console.log('No invalid discriminator combinations found in PILOT/TRAINING data.');
    process.exit(0);
  }

  const ids = candidates.map((record) => record._id);

  await db.collection('research_records').updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        'data_quality.qc_required': true,
        'data_quality.qc_comment': reviewNote,
        updated_at: new Date(),
      },
    },
  );

  console.log(`Flagged ${candidates.length} record(s) for review:`);
  for (const candidate of candidates) {
    console.log(`- ${candidate.study_id} (${candidate.status})`);
  }
} finally {
  await client.close();
}
