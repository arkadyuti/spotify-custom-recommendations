import { SpotifyAPI } from '../spotify-api.js';
import { DataCollectorService, UserData, SpotifyTrack, ListeningAnalysis } from '../data-collector.js';
import { Request } from 'express';

export interface CustomRecommendationOptions {
  limit?: number;
  mode?: 'independent' | 'user-based';
}

export interface CustomRecommendationMetadata {
  input_songs_count: number;
  seed_tracks_used: number;
  total_candidates: number;
  final_count: number;
  mode?: string;
}

export interface CustomRecommendationResult {
  recommendations: FormattedTrack[];
  metadata: CustomRecommendationMetadata;
}

export interface FormattedTrack {
  name: string;
  artist: string;
  album: string;
  duration: number;
  popularity: number;
  external_url?: string;
  custom_score: number;
  preview_url?: string;
}

export class CustomRecommendationEngine {
  private diversityWeight: number = 0.4;
  private similarityWeight: number = 0.6;
  private dataCollector: DataCollectorService;

  constructor() {
    this.dataCollector = new DataCollectorService();
  }

  // Independent recommendation function - ONLY uses input tracks, no user data
  async getIndependentRecommendations(req: Request, inputSongs: SpotifyTrack[] = [], limit: number = 20): Promise<CustomRecommendationResult> {
    try {
      console.log('🎵 Starting independent recommendation engine (input tracks only)...');
      console.log('Input tracks received:', inputSongs.length, inputSongs.map(t => `${t.name} by ${t.artists?.map(a => a.name).join(', ')}`));
      
      if (inputSongs.length === 0) {
        throw new Error('No input tracks provided. Independent recommendations require at least one track.');
      }

      // Get seed tracks (random sample of input)
      const seedTracks = this.selectSeedTracks(inputSongs, 5);
      console.log(`Selected ${seedTracks.length} seed tracks for independent recommendations`);

      // Generate recommendations using track-only strategies (no user data)
      const recommendations = await this.generateIndependentRecommendations(req, seedTracks, limit * 3);
      console.log(`Found ${recommendations.length} total candidates from search strategies`);
      
      // Filter and rank the results
      const filteredRecs = this.filterAndRank(recommendations, inputSongs, limit);
      
      console.log(`✅ Generated ${filteredRecs.length} independent recommendations`);
      
      return {
        recommendations: filteredRecs,
        metadata: {
          input_songs_count: inputSongs.length,
          seed_tracks_used: seedTracks.length,
          total_candidates: recommendations.length,
          final_count: filteredRecs.length,
          mode: 'independent'
        }
      };
    } catch (error) {
      console.error('Error in independent recommendations:', error);
      throw error;
    }
  }

  // Main recommendation function (original - with user data)
  async getCustomRecommendations(req: Request, inputSongs: SpotifyTrack[] = [], limit: number = 20): Promise<CustomRecommendationResult> {
    try {
      console.log('🎵 Starting custom recommendation engine...');
      
      // If no input songs provided, use user's top tracks
      if (inputSongs.length === 0) {
        inputSongs = this.getUserTopTracks();
        console.log(`Using ${inputSongs.length} top tracks as input`);
      }

      if (inputSongs.length === 0) {
        throw new Error('No songs available for recommendations. Please collect data first.');
      }

      // Get seed tracks (random sample of input)
      const seedTracks = this.selectSeedTracks(inputSongs, 5);
      console.log(`Selected ${seedTracks.length} seed tracks`);

      // Generate recommendations using multiple strategies
      const recommendations = await this.generateRecommendations(req, seedTracks, limit * 3);
      
      // Filter and rank the results
      const filteredRecs = this.filterAndRank(recommendations, inputSongs, limit);
      
      console.log(`✅ Generated ${filteredRecs.length} custom recommendations`);
      
      return {
        recommendations: filteredRecs,
        metadata: {
          input_songs_count: inputSongs.length,
          seed_tracks_used: seedTracks.length,
          total_candidates: recommendations.length,
          final_count: filteredRecs.length
        }
      };
    } catch (error) {
      console.error('Error in custom recommendations:', error);
      throw error;
    }
  }

  // Get user's top tracks from collected data
  private getUserTopTracks(): SpotifyTrack[] {
    const userData = this.dataCollector.getUserData();
    if (!userData.profile) {
      return [];
    }

    const allTracks: SpotifyTrack[] = [];
    
    // Mix tracks from different time periods
    if (userData.topTracks.short_term) {
      allTracks.push(...userData.topTracks.short_term.slice(0, 10));
    }
    if (userData.topTracks.medium_term) {
      allTracks.push(...userData.topTracks.medium_term.slice(0, 15));
    }
    if (userData.recentlyPlayed) {
      allTracks.push(...userData.recentlyPlayed.slice(0, 10).map(item => item.track));
    }

    // Remove duplicates
    const uniqueTracks: SpotifyTrack[] = [];
    const seenIds = new Set<string>();
    
    for (const track of allTracks) {
      if (!seenIds.has(track.id)) {
        seenIds.add(track.id);
        uniqueTracks.push(track);
      }
    }

    return uniqueTracks;
  }

  // Select seed tracks for recommendation generation
  private selectSeedTracks(inputSongs: SpotifyTrack[], maxSeeds: number): SpotifyTrack[] {
    // Prioritize recent and popular tracks
    const sortedTracks = inputSongs
      .filter(track => track && track.id)
      .sort((a, b) => {
        // Prefer higher popularity
        return (b.popularity || 0) - (a.popularity || 0);
      });

    return sortedTracks.slice(0, maxSeeds);
  }

  // Generate recommendations using multiple strategies
  private async generateRecommendations(req: Request, seedTracks: SpotifyTrack[], limit: number): Promise<SpotifyTrack[]> {
    const allRecommendations: SpotifyTrack[] = [];
    
    try {
      // Strategy 1: Search for songs by the same artists (40% weight user mode, 50% independent)
      console.log('🔍 Strategy 1: Finding tracks by same artists...');
      const artistRecs = await this.getRecommendationsByArtists(req, seedTracks, Math.floor(limit * 0.4));
      allRecommendations.push(...artistRecs);

      // Strategy 2: Search for similar genres/styles (30% weight, user mode only)
      console.log('🔍 Strategy 2: Finding tracks by genre similarity...');
      const genreRecs = await this.getRecommendationsByGenres(req, seedTracks, Math.floor(limit * 0.3));
      allRecommendations.push(...genreRecs);

      // Strategy 3: Search using track/artist names + related terms (30% weight user mode, 50% independent)
      console.log('🔍 Strategy 3: Finding tracks by keyword similarity...');
      const keywordRecs = await this.getRecommendationsByKeywords(req, seedTracks, Math.floor(limit * 0.3));
      allRecommendations.push(...keywordRecs);

    } catch (error) {
      console.error('Error in recommendation strategies:', error);
    }

    return allRecommendations;
  }

  // Generate recommendations independently - only using input track data, no user preferences
  private async generateIndependentRecommendations(req: Request, seedTracks: SpotifyTrack[], limit: number): Promise<SpotifyTrack[]> {
    const allRecommendations: SpotifyTrack[] = [];
    
    try {
      // Strategy 1: Search for songs by the same artists (50% weight independent)
      console.log('🔍 Independent Strategy 1: Finding tracks by same artists...');
      const artistRecs = await this.getRecommendationsByArtists(req, seedTracks, Math.floor(limit * 0.5));
      console.log(`Strategy 1 found ${artistRecs.length} tracks`);
      allRecommendations.push(...artistRecs);

      // Strategy 2: Search using track/artist names + related terms (50% weight independent)
      console.log('🔍 Independent Strategy 2: Finding tracks by keyword similarity...');
      const keywordRecs = await this.getRecommendationsByKeywords(req, seedTracks, Math.floor(limit * 0.5));
      console.log(`Strategy 2 found ${keywordRecs.length} tracks`);
      allRecommendations.push(...keywordRecs);

      console.log(`Total recommendations before filtering: ${allRecommendations.length}`);

    } catch (error) {
      console.error('Error in independent recommendation strategies:', error);
    }

    return allRecommendations;
  }

  // Strategy 1: Find tracks by same artists (but different from input)
  private async getRecommendationsByArtists(req: Request, seedTracks: SpotifyTrack[], limit: number): Promise<SpotifyTrack[]> {
    const api = SpotifyAPI.create(req);
    const recommendations: SpotifyTrack[] = [];
    const artistIds = new Set<string>();

    // Collect all unique artists from seed tracks
    seedTracks.forEach(track => {
      track.artists?.forEach(artist => {
        artistIds.add(artist.id);
      });
    });

    console.log(`Found ${artistIds.size} unique artists from seed tracks`);

    // For each artist, search for their other popular tracks
    for (const artistId of Array.from(artistIds).slice(0, 5)) {
      try {
        // Search for tracks by this artist
        const artist = seedTracks.find(t => t.artists?.some(a => a.id === artistId))?.artists?.find(a => a.id === artistId);
        if (!artist) continue;

        const searchQuery = `artist:${artist.name}`;
        const searchResults = await api.searchTracks(searchQuery, 10);
        
        if (searchResults.tracks?.items) {
          recommendations.push(...searchResults.tracks.items);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error searching for artist ${artistId}:`, (error as Error).message);
      }
    }

    return recommendations.slice(0, limit);
  }

  // Strategy 2: Find tracks by genre/style (user mode only)
  private async getRecommendationsByGenres(req: Request, seedTracks: SpotifyTrack[], limit: number): Promise<SpotifyTrack[]> {
    const api = SpotifyAPI.create(req);
    const recommendations: SpotifyTrack[] = [];
    
    // Extract genres from user's listening patterns
    const analysis = this.dataCollector.analyzeListeningPatterns();
    const topGenres = analysis.topGenres.slice(0, 3);

    for (const [genre, count] of topGenres) {
      try {
        // Search for tracks in this genre
        const searchQuery = `genre:${genre}`;
        const searchResults = await api.searchTracks(searchQuery, 8);
        
        if (searchResults.tracks?.items) {
          recommendations.push(...searchResults.tracks.items);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // If genre search fails, try broader terms
        try {
          const broadQuery = genre.split(' ')[0]; // Use first word of genre
          const searchResults = await api.searchTracks(broadQuery, 5);
          if (searchResults.tracks?.items) {
            recommendations.push(...searchResults.tracks.items);
          }
        } catch (e) {
          console.error(`Error searching for genre ${genre}:`, (e as Error).message);
        }
      }
    }

    return recommendations.slice(0, limit);
  }

  // Strategy 3: Find tracks using keyword similarity
  private async getRecommendationsByKeywords(req: Request, seedTracks: SpotifyTrack[], limit: number): Promise<SpotifyTrack[]> {
    const api = SpotifyAPI.create(req);
    const recommendations: SpotifyTrack[] = [];
    
    // Extract keywords from track and artist names
    const keywords = new Set<string>();
    
    seedTracks.forEach(track => {
      // Add artist names as keywords
      track.artists?.forEach(artist => {
        const words = artist.name.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 2) keywords.add(word);
        });
      });
    });

    console.log(`Generated ${keywords.size} keywords for search`);

    // Search using top keywords
    for (const keyword of Array.from(keywords).slice(0, 5)) {
      try {
        const searchResults = await api.searchTracks(keyword, 6);
        
        if (searchResults.tracks?.items) {
          recommendations.push(...searchResults.tracks.items);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error searching for keyword ${keyword}:`, (error as Error).message);
      }
    }

    return recommendations.slice(0, limit);
  }

  // Filter out known tracks and rank by relevance
  private filterAndRank(recommendations: SpotifyTrack[], inputSongs: SpotifyTrack[], limit: number): FormattedTrack[] {
    // Get IDs of input songs to exclude
    const inputTrackIds = new Set(inputSongs.map(track => track.id));
    
    // Remove duplicates and input tracks
    const uniqueRecs: SpotifyTrack[] = [];
    const seenIds = new Set<string>();
    
    for (const track of recommendations) {
      if (!track || !track.id) continue;
      
      // Skip if it's an input track or already seen
      if (inputTrackIds.has(track.id) || seenIds.has(track.id)) {
        continue;
      }
      
      seenIds.add(track.id);
      uniqueRecs.push(track);
    }

    // Score and sort tracks
    const scoredTracks = uniqueRecs.map(track => ({
      ...track,
      customScore: this.calculateTrackScore(track, inputSongs)
    }));

    // Sort by score and return top results
    return scoredTracks
      .sort((a, b) => b.customScore - a.customScore)
      .slice(0, limit)
      .map(track => ({
        name: track.name,
        artist: track.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: track.album?.name || 'Unknown',
        duration: Math.round(track.duration_ms / 1000 / 60 * 100) / 100,
        popularity: track.popularity || 0,
        external_url: track.external_urls?.spotify,
        custom_score: track.customScore,
        preview_url: track.preview_url
      }));
  }

  // Calculate relevance score for a track (advanced scoring with randomness factor)
  private calculateTrackScore(track: SpotifyTrack & { customScore?: number }, inputSongs: SpotifyTrack[]): number {
    let score = track.popularity / 100; // Base score from popularity

    // Bonus for artist overlap
    const trackArtists = new Set(track.artists?.map(a => a.name.toLowerCase()) || []);
    const inputArtists = new Set<string>();
    inputSongs.forEach(inputTrack => {
      inputTrack.artists?.forEach(artist => {
        inputArtists.add(artist.name.toLowerCase());
      });
    });

    // Check for artist overlap
    for (const artist of trackArtists) {
      if (inputArtists.has(artist)) {
        score += 0.3; // Boost for same artist
        break;
      }
    }

    // Slight preference for newer releases
    const releaseYear = new Date((track.album as any)?.release_date || '1970-01-01').getFullYear();
    const currentYear = new Date().getFullYear();
    if (currentYear - releaseYear <= 3) {
      score += 0.1;
    }

    // Add randomness factor for discovery (critical for diversity)
    score += Math.random() * 0.2;

    return score;
  }
}