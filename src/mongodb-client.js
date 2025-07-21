const { MongoClient } = require('mongodb');
require('dotenv').config();

let client;
let db;

async function connectToDatabase() {
    if (db) return db;

    try {
        client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        console.log('Connected to MongoDB');
        
        db = client.db('spotify');
        
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

async function closeDatabase() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('Disconnected from MongoDB');
    }
}

module.exports = {
    connectToDatabase,
    closeDatabase
};