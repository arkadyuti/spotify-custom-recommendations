const spotifyAPI = require('./spotify-api');
const dataStorage = require('./data-storage');
const { getUserId } = require('./auth');

class DataCollector {
  constructor() {
    this.userData = {
      profile: null,
      topTracks: {
        short_term: [],
        medium_term: [],
        long_term: []
      },
      topArtists: {
        short_term: [],
        medium_term: [],
        long_term: []
      },
      recentlyPlayed: [],
      savedTracks: [],
      audioFeatures: new Map(),
      playlists: []
    };
  }

  // Load existing data from storage
  async loadExistingData(userId) {
    try {
      const existingData = await dataStorage.loadUserData(userId);
      if (existingData) {
        this.userData = existingData;
        console.log('📁 Loaded existing user data from storage');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading existing data:', error);
      return false;
    }
  }

  async collectUserData(req, forceRefresh = false) {
    console.log('Starting data collection...');
    
    const userId = getUserId(req);
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const api = spotifyAPI.create(req);
    
    try {
      // Check if we should use existing data
      if (!forceRefresh) {
        const hasExisting = await this.loadExistingData(userId);
        if (hasExisting) {
          console.log('✅ Using existing data (add ?refresh=true to force update)');
          return this.userData;
        }
      }
      // Get user profile
      console.log('Fetching user profile...');
      this.userData.profile = await api.getMe();
      console.log(`Hello, ${this.userData.profile.display_name}!`);

      // Get top tracks for different time ranges
      console.log('Fetching top tracks...');
      for (const timeRange of ['short_term', 'medium_term', 'long_term']) {
        const topTracks = await api.getTopTracks(timeRange, 50);
        this.userData.topTracks[timeRange] = topTracks.items;
      }

      // Get top artists
      console.log('Fetching top artists...');
      for (const timeRange of ['short_term', 'medium_term', 'long_term']) {
        const topArtists = await api.getTopArtists(timeRange, 50);
        this.userData.topArtists[timeRange] = topArtists.items;
      }

      // Get recently played
      console.log('Fetching recently played tracks...');
      const recentlyPlayed = await api.getRecentlyPlayed(50);
      this.userData.recentlyPlayed = recentlyPlayed.items;

      // Get saved tracks
      console.log('Fetching saved tracks...');
      try {
        const savedTracks = await api.getSavedTracks(50);
        this.userData.savedTracks = savedTracks.items;
        console.log(`✅ Got ${this.userData.savedTracks.length} saved tracks`);
      } catch (error) {
        console.log(`⚠️ Could not fetch saved tracks: ${error.message}`);
        this.userData.savedTracks = [];
      }

      // Collect all unique track IDs
      const allTrackIds = new Set();
      
      // Add tracks from all sources
      Object.values(this.userData.topTracks).flat().forEach(track => allTrackIds.add(track.id));
      this.userData.recentlyPlayed.forEach(item => allTrackIds.add(item.track.id));
      this.userData.savedTracks.forEach(item => allTrackIds.add(item.track.id));

      // Get audio features for all tracks
      console.log(`Fetching audio features for ${allTrackIds.size} tracks...`);
      const trackIdArray = Array.from(allTrackIds);
      
      try {
        // Spotify API limits to 100 tracks per request
        for (let i = 0; i < trackIdArray.length; i += 100) {
          const batch = trackIdArray.slice(i, i + 100);
          const audioFeatures = await api.getAudioFeatures(batch);
          
          audioFeatures.audio_features.forEach(feature => {
            if (feature) {
              this.userData.audioFeatures.set(feature.id, feature);
            }
          });
        }
        console.log(`✅ Got audio features for ${this.userData.audioFeatures.size} tracks`);
      } catch (error) {
        console.log(`⚠️ Could not fetch audio features: ${error.message}`);
        console.log('Continuing without audio features...');
      }

      console.log('Data collection complete!');
      
      // Save to local storage
      await dataStorage.saveUserData(userId, this.userData);
      
      return this.userData;
    } catch (error) {
      console.error('Error collecting data:', error);
      throw error;
    }
  }

  // Analyze listening patterns
  analyzeListeningPatterns() {
    const analysis = {
      favoriteGenres: new Map(),
      audioProfile: {
        energy: 0,
        danceability: 0,
        valence: 0,
        acousticness: 0,
        instrumentalness: 0,
        speechiness: 0
      },
      timeOfDay: new Map(),
      artistDiversity: 0,
      topFeatures: []
    };

    // Analyze genres from top artists
    Object.values(this.userData.topArtists).flat().forEach(artist => {
      artist.genres.forEach(genre => {
        analysis.favoriteGenres.set(genre, (analysis.favoriteGenres.get(genre) || 0) + 1);
      });
    });

    // Calculate average audio features
    const features = Array.from(this.userData.audioFeatures.values());
    const featureKeys = Object.keys(analysis.audioProfile);
    
    features.forEach(feature => {
      featureKeys.forEach(key => {
        if (feature[key] !== undefined) {
          analysis.audioProfile[key] += feature[key];
        }
      });
    });

    // Average the features
    featureKeys.forEach(key => {
      analysis.audioProfile[key] /= features.length;
    });

    // Sort genres by frequency
    analysis.topGenres = Array.from(analysis.favoriteGenres.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return analysis;
  }

  // Get seed data for recommendations
  getRecommendationSeeds() {
    const seeds = {
      track_ids: [],
      artist_ids: [],
      genres: []
    };

    // Get top 2 tracks from short term
    seeds.track_ids = this.userData.topTracks.short_term
      .slice(0, 2)
      .map(track => track.id);

    // Get top 2 artists from medium term
    seeds.artist_ids = this.userData.topArtists.medium_term
      .slice(0, 2)
      .map(artist => artist.id);

    // Get top genre
    const analysis = this.analyzeListeningPatterns();
    if (analysis.topGenres.length > 0) {
      seeds.genres = [analysis.topGenres[0][0]];
    }

    return seeds;
  }
}

module.exports = new DataCollector();