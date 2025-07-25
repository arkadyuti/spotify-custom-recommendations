import { SpotifyAPI } from './spotify-api.js';
import { StorageService } from './database/storage.js';
import { Request } from 'express';
import { 
  LeanTrack, 
  LeanArtist, 
  LeanProfile, 
  LeanAudioFeatures,
  transformTrack, 
  transformArtist, 
  transformProfile, 
  transformAudioFeatures,
  transformRecentlyPlayedItem,
  transformSavedTrackItem 
} from './data-transformer.js';

// Re-export lean types for compatibility
export type UserProfile = LeanProfile;
export type SpotifyTrack = LeanTrack;
export type SpotifyArtist = LeanArtist;
export type AudioFeatures = LeanAudioFeatures;

// Legacy interfaces removed - now using lean types

export interface UserData {
  profile: LeanProfile | null;
  topTracks: {
    short_term: LeanTrack[];
    medium_term: LeanTrack[];
    long_term: LeanTrack[];
  };
  topArtists: {
    short_term: LeanArtist[];
    medium_term: LeanArtist[];
    long_term: LeanArtist[];
  };
  recentlyPlayed: Array<{
    track: LeanTrack;
    played_at: string;
  }>;
  savedTracks: Array<{
    track: LeanTrack;
    added_at: string;
  }>;
  audioFeatures: Map<string, LeanAudioFeatures>;
  playlists: any[]; // Keep as-is for now
}

export interface ListeningAnalysis {
  favoriteGenres: Map<string, number>;
  audioProfile: {
    energy: number;
    danceability: number;
    valence: number;
    acousticness: number;
    instrumentalness: number;
    speechiness: number;
  };
  timeOfDay: Map<string, number>;
  artistDiversity: number;
  topFeatures: any[];
  topGenres: Array<[string, number]>;
}

export interface RecommendationSeeds {
  track_ids: string[];
  artist_ids: string[];
  genres: string[];
}

export class DataCollectorService {
  private userData: UserData;
  private storageService: StorageService;

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
    this.storageService = new StorageService();
  }

  // Load existing data from storage
  async loadExistingData(userId: string): Promise<boolean> {
    try {
      const existingData = await this.storageService.loadUserData(userId);
      if (existingData) {
        this.userData = {
          ...existingData,
          audioFeatures: new Map(Object.entries(existingData.audioFeatures || {})),
          playlists: existingData.playlists || []
        };
        console.log('📁 Loaded existing user data from storage');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading existing data:', error);
      return false;
    }
  }

  async collectUserData(req: Request, forceRefresh: boolean = false): Promise<UserData> {
    console.log('Starting data collection...');
    
    const userId = this.getUserId(req);
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const api = SpotifyAPI.create(req);
    
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
      const rawProfile = await api.getMe();
      this.userData.profile = transformProfile(rawProfile);
      console.log(`Hello, ${this.userData.profile?.display_name || 'User'}!`);

      // Get top tracks for different time ranges
      console.log('Fetching top tracks...');
      const timeRanges: ('short_term' | 'medium_term' | 'long_term')[] = ['short_term', 'medium_term', 'long_term'];
      for (const timeRange of timeRanges) {
        const topTracks = await api.getTopTracks(timeRange, 50);
        this.userData.topTracks[timeRange] = topTracks.items.map(transformTrack);
      }

      // Get top artists
      console.log('Fetching top artists...');
      for (const timeRange of timeRanges) {
        const topArtists = await api.getTopArtists(timeRange, 50);
        this.userData.topArtists[timeRange] = topArtists.items.map(transformArtist);
      }

      // Get recently played
      console.log('Fetching recently played tracks...');
      const recentlyPlayed = await api.getRecentlyPlayed(50);
      this.userData.recentlyPlayed = recentlyPlayed.items.map(transformRecentlyPlayedItem);

      // Get saved tracks
      console.log('Fetching saved tracks...');
      try {
        const savedTracks = await api.getSavedTracks(50);
        this.userData.savedTracks = savedTracks.items.map(transformSavedTrackItem);
        console.log(`✅ Got ${this.userData.savedTracks.length} saved tracks`);
      } catch (error) {
        console.log(`⚠️ Could not fetch saved tracks: ${(error as Error).message}`);
        this.userData.savedTracks = [];
      }

      // Collect all unique track IDs
      const allTrackIds = new Set<string>();
      
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
          
          audioFeatures.audio_features.forEach((feature: any) => {
            if (feature) {
              const leanFeature = transformAudioFeatures(feature);
              this.userData.audioFeatures.set(leanFeature.id, leanFeature);
            }
          });
        }
        console.log(`✅ Got audio features for ${this.userData.audioFeatures.size} tracks`);
      } catch (error) {
        console.log(`⚠️ Could not fetch audio features: ${(error as Error).message}`);
        console.log('Continuing without audio features...');
      }

      console.log('Data collection complete!');
      
      // Save to storage (convert Map to object for storage)
      const dataToSave = {
        ...this.userData,
        audioFeatures: this.userData.audioFeatures.size > 0 ? 
          Object.fromEntries(this.userData.audioFeatures) : {},
        playlists: this.userData.playlists || []
      };
      await this.storageService.saveUserData(userId, dataToSave);
      
      return this.userData;
    } catch (error) {
      console.error('Error collecting data:', error);
      throw error;
    }
  }

  // Analyze listening patterns
  analyzeListeningPatterns(): ListeningAnalysis {
    const analysis: ListeningAnalysis = {
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
      topFeatures: [],
      topGenres: []
    };

    // Analyze genres from top artists
    Object.values(this.userData.topArtists).flat().forEach(artist => {
      artist.genres.forEach(genre => {
        analysis.favoriteGenres.set(genre, (analysis.favoriteGenres.get(genre) || 0) + 1);
      });
    });

    // Calculate average audio features
    const features = Array.from(this.userData.audioFeatures.values());
    const featureKeys = Object.keys(analysis.audioProfile) as (keyof typeof analysis.audioProfile)[];
    
    features.forEach(feature => {
      featureKeys.forEach(key => {
        if (feature[key] !== undefined) {
          analysis.audioProfile[key] += feature[key];
        }
      });
    });

    // Average the features
    if (features.length > 0) {
      featureKeys.forEach(key => {
        analysis.audioProfile[key] /= features.length;
      });
    }

    // Sort genres by frequency
    analysis.topGenres = Array.from(analysis.favoriteGenres.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return analysis;
  }

  // Get seed data for recommendations
  getRecommendationSeeds(): RecommendationSeeds {
    const seeds: RecommendationSeeds = {
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

  // Helper method to get user ID from request
  private getUserId(req: Request): string | null {
    return (req.session as any)?.spotifyUserId || null;
  }

  // Get current user data
  getUserData(): UserData {
    return this.userData;
  }
}