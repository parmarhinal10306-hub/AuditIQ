const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = 'seo_aeo_geo_audit';

let client;
let db;

const setupIndexes = async (database) => {
  try {
    const users = database.collection('users');
    const audits = database.collection('audits');

    // Create indexes
    await users.createIndex({ email: 1 }, { unique: true });
    await audits.createIndex({ userId: 1 });
    await audits.createIndex({ createdAt: -1 });

    console.log(`[database] Database indexes successfully initialized/verified`);
  } catch (error) {
    console.error(`[database] Failed to set up indexes:`, error.message);
  }
};

const connectDB = async () => {
  try {
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log(`[database] Successfully connected to MongoDB. Database: ${dbName}`);
    
    // Simple database connection test
    await db.command({ ping: 1 });
    console.log(`[database] Ping successful for ${dbName}`);
    
    // Setup collections and indexes
    await setupIndexes(db);
    
    return db;
  } catch (error) {
    console.error(`[database] MongoDB connection error:`, error.message);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};

module.exports = { connectDB, getDB, client };
