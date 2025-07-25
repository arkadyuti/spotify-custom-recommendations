// MongoDB client - migrated from spotify-custom-recommendations/src/mongodb-client.js
// MongoDB connection and client setup

import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
    if (db) return db;

    try {
        client = new MongoClient(process.env.MONGODB_URI || '');
        await client.connect();
        console.log('Connected to MongoDB');
        
        db = client.db('spotify');
        
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

export async function closeDatabase(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('Disconnected from MongoDB');
    }
}

export { client, db };

// Export a MongoDBClient class for compatibility
export class MongoDBClient {
  async connect(): Promise<Db> {
    return connectToDatabase();
  }

  async close(): Promise<void> {
    return closeDatabase();
  }
}