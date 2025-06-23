const fs = require('fs-extra');
const path = require('path');

class DataStorage {
  constructor() {
    this.dataDir = './data';
    this.userDataFile = path.join(this.dataDir, 'user-data.json');
    this.analysisFile = path.join(this.dataDir, 'analysis.json');
    this.tracksFile = path.join(this.dataDir, 'tracks.json');
    
    // Ensure data directory exists
    this.initStorage();
  }

  async initStorage() {
    try {
      await fs.ensureDir(this.dataDir);
    } catch (error) {
      console.error('Error creating data directory:', error);
    }
  }

  // Save user data to JSON file
  async saveUserData(userData) {
    try {
      const dataToSave = {
        ...userData,
        lastUpdated: new Date().toISOString(),
        audioFeatures: userData.audioFeatures ? Object.fromEntries(userData.audioFeatures) : {}
      };
      
      await fs.writeJson(this.userDataFile, dataToSave, { spaces: 2 });
      console.log('💾 User data saved to local storage');
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  }

  // Load user data from JSON file
  async loadUserData() {
    try {
      if (await fs.pathExists(this.userDataFile)) {
        const data = await fs.readJson(this.userDataFile);
        
        // Convert audioFeatures back to Map
        if (data.audioFeatures && typeof data.audioFeatures === 'object') {
          data.audioFeatures = new Map(Object.entries(data.audioFeatures));
        }
        
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  }

  // Save analysis data
  async saveAnalysis(analysis) {
    try {
      const analysisToSave = {
        ...analysis,
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeJson(this.analysisFile, analysisToSave, { spaces: 2 });
      console.log('💾 Analysis saved to local storage');
      return true;
    } catch (error) {
      console.error('Error saving analysis:', error);
      return false;
    }
  }

  // Load analysis data
  async loadAnalysis() {
    try {
      if (await fs.pathExists(this.analysisFile)) {
        return await fs.readJson(this.analysisFile);
      }
      return null;
    } catch (error) {
      console.error('Error loading analysis:', error);
      return null;
    }
  }

  // Save tracks data
  async saveTracks(tracksData) {
    try {
      const tracksToSave = {
        ...tracksData,
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeJson(this.tracksFile, tracksToSave, { spaces: 2 });
      console.log('💾 Tracks data saved to local storage');
      return true;
    } catch (error) {
      console.error('Error saving tracks:', error);
      return false;
    }
  }

  // Load tracks data
  async loadTracks() {
    try {
      if (await fs.pathExists(this.tracksFile)) {
        return await fs.readJson(this.tracksFile);
      }
      return null;
    } catch (error) {
      console.error('Error loading tracks:', error);
      return null;
    }
  }

  // Check if we have saved data
  async hasUserData() {
    return await fs.pathExists(this.userDataFile);
  }

  // Get data summary for homepage
  async getDataSummary() {
    try {
      const userData = await this.loadUserData();
      const analysis = await this.loadAnalysis();
      
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

  // Clear all saved data
  async clearAllData() {
    try {
      const files = [this.userDataFile, this.analysisFile, this.tracksFile];
      
      for (const file of files) {
        if (await fs.pathExists(file)) {
          await fs.remove(file);
        }
      }
      
      console.log('🗑️ All saved data cleared');
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }
}

module.exports = new DataStorage();