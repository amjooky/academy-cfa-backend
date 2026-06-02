const { MongoClient } = require('mongodb');

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = 'academy_pedagogy';

async function run() {
  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    console.log('[MIGRATE] Connected to Mongo at', mongoUrl);
    const db = client.db(dbName);

    // Ensure collections exist and create basic index
    const exercises = db.collection('exercises');
    // Create unique index on slug
    await exercises.createIndex({ slug: 1 }, { unique: true });
    console.log('[MIGRATE] Ensured collection `exercises` with index on `slug`');

    // Insert seed doc if collection empty
    const count = await exercises.countDocuments();
    if (count === 0) {
      await exercises.insertOne({
        slug: 'welcome-exercise',
        title: 'Welcome Exercise',
        content: 'This is a seeded exercise.',
        createdAt: new Date()
      });
      console.log('[MIGRATE] Seeded `exercises` collection with a sample document');
    } else {
      console.log('[MIGRATE] `exercises` collection already has documents, skipping seed');
    }

    console.log('[MIGRATE] Migration completed successfully');
  } catch (err) {
    console.error('[MIGRATE] Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();
