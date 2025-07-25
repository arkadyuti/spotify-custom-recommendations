// Data storage layer - migrated from spotify-custom-recommendations/src/data-storage.js
// Data persistence and caching logic with MongoDB

import { Db } from 'mongodb';
import { connectToDatabase } from './mongodb.js';
import { AuthTokens } from '../auth.js';

export interface UserData {
  userId: string;
  profile: any;
  topTracks: any;
  topArtists: any;
  recentlyPlayed: any[];
  savedTracks: any[];
  audioFeatures: Map<string, any> | Record<string, any>;
  playlists: any[];
  lastUpdated: Date;
}

export interface AnalysisData {
  userId: string;
  topGenres: Array<[string, number]>;
  [key: string]: any;
  lastUpdated: Date;
}

export interface TracksData {
  userId: string;
  [key: string]: any;
  lastUpdated: Date;
}

export interface DataSummary {
  profile: {
    name: string;
    country: string;
    lastUpdated: Date;
  };
  stats: {
    topTracksCount: number;
    topArtistsCount: number;
    recentlyPlayedCount: number;
    savedTracksCount: number;
    audioFeaturesCount: number;
  };
  topGenres: Array<[string, number]>;
  topArtists: string[];
  recentTracks: Array<{ name: string; artist: string }>;
}

export class DataStorageService {
  private db: Db | null = null;
  private collections = {
    userData: 'userData',
    analysis: 'analysis', 
    tracks: 'tracks',
    tokens: 'tokens'
  };

  async getDb(): Promise<Db> {
    if (!this.db) {
      this.db = await connectToDatabase();
    }
    return this.db;
  }

  // Save user data to MongoDB
  async saveUserData(userId: string, userData: Partial<UserData>): Promise<boolean> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.userData);
      
      const dataToSave = {
        userId,
        ...userData,
        lastUpdated: new Date(),
        audioFeatures: userData.audioFeatures ? 
          (userData.audioFeatures instanceof Map ? 
            Object.fromEntries(userData.audioFeatures) : 
            userData.audioFeatures) : {}
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
  async loadUserData(userId: string): Promise<UserData | null> {
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
        const { _id, ...userData } = data;
        
        return userData as UserData;
      }
      return null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  }

  // Save analysis data
  async saveAnalysis(userId: string, analysis: Partial<AnalysisData>): Promise<boolean> {
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
  async loadAnalysis(userId: string): Promise<AnalysisData | null> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.analysis);
      
      const data = await collection.findOne({ userId });
      
      if (data) {
        const { _id, ...analysisData } = data;
        return analysisData as AnalysisData;
      }
      return null;
    } catch (error) {
      console.error('Error loading analysis:', error);
      return null;
    }
  }

  // Save tracks data
  async saveTracks(userId: string, tracksData: Partial<TracksData>): Promise<boolean> {
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
  async loadTracks(userId: string): Promise<TracksData | null> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.tracks);
      
      const data = await collection.findOne({ userId });
      
      if (data) {
        const { _id, ...tracksData } = data;
        return tracksData as TracksData;
      }
      return null;
    } catch (error) {
      console.error('Error loading tracks:', error);
      return null;
    }
  }

  // Check if we have saved data for a user
  async hasUserData(userId: string): Promise<boolean> {
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
  async getDataSummary(userId: string): Promise<DataSummary | null> {
    try {
      if (!userId) {
        return null;
      }

      const userData = await this.loadUserData(userId);
      const analysis = await this.loadAnalysis(userId);
      
      if (!userData) {
        return null;
      }

      const summary: DataSummary = {
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
          audioFeaturesCount: userData.audioFeatures ? (userData.audioFeatures as Map<string, any>).size || Object.keys(userData.audioFeatures).length : 0
        },
        topGenres: analysis?.topGenres?.slice(0, 5) || [],
        topArtists: userData.topArtists?.medium_term?.slice(0, 5)?.map((a: any) => a.name) || [],
        recentTracks: userData.recentlyPlayed?.slice(0, 3)?.map((item: any) => ({
          name: item.track.name,
          artist: item.track.artists.map((a: any) => a.name).join(', ')
        })) || []
      };

      return summary;
    } catch (error) {
      console.error('Error getting data summary:', error);
      return null;
    }
  }

  // Clear all saved data for a user
  async clearUserData(userId: string): Promise<boolean> {
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
  async getAllUserIds(): Promise<string[]> {
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
  async saveTokens(userId: string, tokens: AuthTokens): Promise<boolean> {
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

  async loadTokens(userId: string): Promise<AuthTokens | null> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.collections.tokens);
      
      const data = await collection.findOne({ userId });
      
      if (data) {
        const { _id, ...tokens } = data;
        return tokens as AuthTokens;
      }
      return null;
    } catch (error) {
      console.error('Error loading tokens:', error);
      return null;
    }
  }

  // Legacy methods for backward compatibility
  async clearAllData(): Promise<boolean> {
    console.warn('clearAllData() is deprecated. Use clearUserData(userId) instead.');
    return false;
  }

  // For backwards compatibility with file-based paths
  getUserDir(userId: string): string {
    // Return a dummy path since we're using MongoDB now
    return `/data/users/${userId}`;
  }

  async getUserFilePaths(userId: string): Promise<Record<string, string>> {
    // Return dummy paths for backward compatibility
    return {
      userDataFile: `/data/users/${userId}/user-data.json`,
      analysisFile: `/data/users/${userId}/analysis.json`,
      tracksFile: `/data/users/${userId}/tracks.json`
    };
  }

  async initStorage(): Promise<void> {
    // No need to create directories with MongoDB
    console.log('MongoDB storage initialized');
  }
}

// Export alias for backward compatibility
export { DataStorageService as StorageService };