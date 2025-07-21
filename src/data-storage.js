const { connectToDatabase } = require('./mongodb-client');

class DataStorage {
  constructor() {
    this.db = null;
    this.collections = {
      userData: 'userData',
      analysis: 'analysis', 
      tracks: 'tracks',
      tokens: 'tokens'
    };
  }

  async getDb() {
    if (!this.db) {
      this.db = await connectToDatabase();
    }
    return this.db;
  }

  // Save user data to MongoDB
  async saveUserData(userId, userData) {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.userData);
      
      const dataToSave = {
        userId,
        ...userData,
        lastUpdated: new Date(),
        audioFeatures: userData.audioFeatures ? Object.fromEntries(userData.audioFeatures) : {}
      };
      
      await collection.replaceOne(
        { userId },
        dataToSave,
        { upsert: true }
      );
      
      console.log(`💾 User data saved for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  }

  // Load user data from MongoDB
  async loadUserData(userId) {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.userData);
      
      const data = await collection.findOne({ userId });
      
      if (data) {
        // Convert audioFeatures back to Map
        if (data.audioFeatures && typeof data.audioFeatures === 'object') {
          data.audioFeatures = new Map(Object.entries(data.audioFeatures));
        }
        
        // Remove MongoDB _id from returned data
        delete data._id;
        
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  }

  // Save analysis data
  async saveAnalysis(userId, analysis) {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.analysis);
      
      const analysisToSave = {
        userId,
        ...analysis,
        lastUpdated: new Date()
      };
      
      await collection.replaceOne(
        { userId },
        analysisToSave,
        { upsert: true }
      );
      
      console.log(`💾 Analysis saved for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error saving analysis:', error);
      return false;
    }
  }

  // Load analysis data
  async loadAnalysis(userId) {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.analysis);
      
      const data = await collection.findOne({ userId });
      
      if (data) {
        delete data._id;
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error loading analysis:', error);
      return null;
    }
  }

  // Save tracks data
  async saveTracks(userId, tracksData) {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.tracks);
      
      const tracksToSave = {
        userId,
        ...tracksData,
        lastUpdated: new Date()
      };
      
      await collection.replaceOne(
        { userId },
        tracksToSave,
        { upsert: true }
      );
      
      console.log(`💾 Tracks data saved for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error saving tracks:', error);
      return false;
    }
  }

  // Load tracks data
  async loadTracks(userId) {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.tracks);
      
      const data = await collection.findOne({ userId });
      
      if (data) {
        delete data._id;
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error loading tracks:', error);
      return null;
    }
  }

  // Check if we have saved data for a user
  async hasUserData(userId) {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.userData);
      
      const count = await collection.countDocuments({ userId });
      return count > 0;
    } catch (error) {
      console.error('Error checking user data:', error);
      return false;
    }
  }

  // Get data summary for homepage
  async getDataSummary(userId) {
    try {
      if (!userId) {
        return null;
      }

      const userData = await this.loadUserData(userId);
      const analysis = await this.loadAnalysis(userId);
      
      if (!userData) {
        return null;
      }

      const summary = {
        profile: {
          name: userData.profile?.display_name || 'Unknown',
          country: userData.profile?.country || 'Unknown',
          lastUpdated: userData.lastUpdated
        },
        stats: {
          topTracksCount: Object.values(userData.topTracks || {}).flat().length,
          topArtistsCount: Object.values(userData.topArtists || {}).flat().length,
          recentlyPlayedCount: (userData.recentlyPlayed || []).length,
          savedTracksCount: (userData.savedTracks || []).length,
          audioFeaturesCount: userData.audioFeatures ? userData.audioFeatures.size || Object.keys(userData.audioFeatures).length : 0
        },
        topGenres: analysis?.topGenres?.slice(0, 5) || [],
        topArtists: userData.topArtists?.medium_term?.slice(0, 5)?.map(a => a.name) || [],
        recentTracks: userData.recentlyPlayed?.slice(0, 3)?.map(item => ({
          name: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', ')
        })) || []
      };

      return summary;
    } catch (error) {
      console.error('Error getting data summary:', error);
      return null;
    }
  }

  // Clear all saved data for a user
  async clearUserData(userId) {
    try {
      const db = await this.getDb();
      
      // Delete from all collections
      await Promise.all([
        db.collection(this.collections.userData).deleteMany({ userId }),
        db.collection(this.collections.analysis).deleteMany({ userId }),
        db.collection(this.collections.tracks).deleteMany({ userId })
      ]);
      
      console.log(`🗑️ All saved data cleared for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error clearing user data:', error);
      return false;
    }
  }

  // Get all user IDs with saved data
  async getAllUserIds() {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.userData);
      
      const users = await collection.distinct('userId');
      return users;
    } catch (error) {
      console.error('Error getting user IDs:', error);
      return [];
    }
  }

  // Token storage methods (for auth.js)
  async saveTokens(userId, tokens) {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.tokens);
      
      await collection.replaceOne(
        { userId },
        { 
          userId,
          ...tokens,
          lastUpdated: new Date()
        },
        { upsert: true }
      );
      
      return true;
    } catch (error) {
      console.error('Error saving tokens:', error);
      return false;
    }
  }

  async loadTokens(userId) {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.tokens);
      
      const data = await collection.findOne({ userId });
      
      if (data) {
        delete data._id;
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error loading tokens:', error);
      return null;
    }
  }

  // Legacy methods for backward compatibility
  async clearAllData() {
    console.warn('clearAllData() is deprecated. Use clearUserData(userId) instead.');
    return false;
  }

  // For backwards compatibility with file-based paths
  getUserDir(userId) {
    // Return a dummy path since we're using MongoDB now
    return `/data/users/${userId}`;
  }

  async getUserFilePaths(userId) {
    // Return dummy paths for backward compatibility
    return {
      userDataFile: `/data/users/${userId}/user-data.json`,
      analysisFile: `/data/users/${userId}/analysis.json`,
      tracksFile: `/data/users/${userId}/tracks.json`
    };
  }

  async initStorage() {
    // No need to create directories with MongoDB
    console.log('MongoDB storage initialized');
  }
}

module.exports = new DataStorage();