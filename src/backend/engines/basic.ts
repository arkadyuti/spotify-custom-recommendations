import { SpotifyAPI } from '../spotify-api.js';
import { DataCollectorService, UserData, SpotifyTrack, SpotifyArtist } from '../data-collector.js';
import { Request } from 'express';

export interface RecommendationTrack extends SpotifyTrack {
  customScore?: number;
}

export interface RecommendationSeeds {
  seed_artists?: string;
  seed_tracks?: string;
  seed_genres?: string;
}

export interface RecommendationMetadata {
  totalCandidates: number;
  afterFiltering: number;
  finalCount: number;
  seeds: {
    seed_artists: string[];
    seed_tracks: string[];
    seed_genres: string[];
  };
  userProfile: {
    name: string;
    topGenres: Array<[string, number]>;
    topArtists: string[];
    totalTracks: number;
    recentActivity: number;
  };
}

export interface RecommendationResult {
  recommendations: RecommendationTrack[];
  metadata: RecommendationMetadata;
}

export class BasicRecommendationEngine {
  private diversityWeight: number = 0.3;
  private recencyWeight: number = 0.4;
  private popularityWeight: number = 0.3;
  private dataCollector: DataCollectorService;

  constructor() {
    this.dataCollector = new DataCollectorService();
  }

  // Get recommendations based on user's listening patterns
  async getRecommendations(req: Request, limit: number = 20): Promise<RecommendationResult> {
    try {
      const userData = this.dataCollector.getUserData();
      if (!userData.profile) {
        throw new Error('No user data available. Please collect data first.');
      }

      console.log('Generating custom recommendations...');

      // Get seeds for Spotify's recommendation API
      const seeds = this.buildSeeds(userData);
      console.log('Using seeds:', seeds);

      // Get recommendations from Spotify
      const spotifyRecs = await this.getSpotifyRecommendations(req, seeds, limit * 2);
      
      // Apply our custom filtering and ranking
      const customRecs = this.applyCustomFiltering(spotifyRecs, userData);
      
      // Rank and limit results
      const finalRecs = this.rankRecommendations(customRecs, userData).slice(0, limit);

      console.log(`Generated ${finalRecs.length} custom recommendations`);
      return {
        recommendations: finalRecs,
        metadata: {
          totalCandidates: spotifyRecs.length,
          afterFiltering: customRecs.length,
          finalCount: finalRecs.length,
          seeds: seeds,
          userProfile: this.getUserProfile(userData)
        }
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  // Build seed data for Spotify API
  private buildSeeds(userData: UserData): { seed_artists: string[]; seed_tracks: string[]; seed_genres: string[] } {
    const seeds = {
      seed_artists: [] as string[],
      seed_tracks: [] as string[],
      seed_genres: [] as string[]
    };

    // Start simple - just use top artists
    const topArtists = userData.topArtists.medium_term || userData.topArtists.short_term || [];
    if (topArtists.length > 0) {
      seeds.seed_artists = topArtists.slice(0, 2).map(artist => artist.id);
    }

    // Add top tracks only if we have them
    const topTracks = userData.topTracks.medium_term || userData.topTracks.short_term || [];
    if (topTracks.length > 0) {
      seeds.seed_tracks = topTracks.slice(0, 1).map(track => track.id);
    }

    // Use a simple, well-known genre
    seeds.seed_genres = ['pop'];

    return seeds;
  }

  // Get recommendations from Spotify API
  private async getSpotifyRecommendations(req: Request, seeds: { seed_artists: string[]; seed_tracks: string[]; seed_genres: string[] }, limit: number): Promise<SpotifyTrack[]> {
    const api = SpotifyAPI.create(req);
    
    // Ensure we have valid seeds
    const cleanSeeds: RecommendationSeeds = {};
    
    if (seeds.seed_artists && seeds.seed_artists.length > 0) {
      cleanSeeds.seed_artists = seeds.seed_artists.join(',');
    }
    
    if (seeds.seed_tracks && seeds.seed_tracks.length > 0) {
      cleanSeeds.seed_tracks = seeds.seed_tracks.join(',');
    }
    
    if (seeds.seed_genres && seeds.seed_genres.length > 0) {
      cleanSeeds.seed_genres = seeds.seed_genres.join(',');
    }

    // Must have at least one seed
    if (Object.keys(cleanSeeds).length === 0) {
      throw new Error('At least one seed is required for recommendations');
    }

    const params = {
      limit: Math.min(limit, 100), // Spotify max is 100
      market: 'IN', // Based on user profile
      ...cleanSeeds
    };

    console.log('Recommendation API params:', params);

    const response = await api.getRecommendations(params);
    return response.tracks || [];
  }

  // Apply custom filtering to remove tracks user already knows
  private applyCustomFiltering(recommendations: SpotifyTrack[], userData: UserData): SpotifyTrack[] {
    // Get all track IDs user already has
    const userTrackIds = new Set<string>();
    
    Object.values(userData.topTracks).flat().forEach(track => 
      userTrackIds.add(track.id)
    );
    userData.recentlyPlayed.forEach(item => 
      userTrackIds.add(item.track.id)
    );
    userData.savedTracks.forEach(item => 
      userTrackIds.add(item.track.id)
    );

    // Get user's known artists
    const userArtistIds = new Set<string>();
    Object.values(userData.topArtists).flat().forEach(artist => 
      userArtistIds.add(artist.id)
    );

    // Filter recommendations
    return recommendations.filter(track => {
      // Remove tracks user already has
      if (userTrackIds.has(track.id)) {
        return false;
      }

      // Keep some tracks from known artists (50% chance)
      const hasKnownArtist = track.artists.some(artist => 
        userArtistIds.has(artist.id)
      );
      
      if (hasKnownArtist && Math.random() > 0.5) {
        return false;
      }

      // Remove very short tracks (likely intros/outros)
      if (track.duration_ms < 60000) {
        return false;
      }

      return true;
    });
  }

  // Rank recommendations using custom algorithm
  private rankRecommendations(recommendations: SpotifyTrack[], userData: UserData): RecommendationTrack[] {
    const analysis = this.dataCollector.analyzeListeningPatterns();
    const topGenres = new Set(analysis.topGenres.map(([genre]) => genre.toLowerCase()));
    
    // Get user's artist preferences
    const topArtistIds = new Set<string>();
    Object.values(userData.topArtists).flat().forEach(artist => 
      topArtistIds.add(artist.id)
    );

    return recommendations
      .map(track => {
        let score = track.popularity / 100; // Base score from popularity

        // Boost score for preferred genres (simulate genre matching)
        const trackGenres: string[] = (track.artists[0] as any)?.genres || [];
        const genreMatch = trackGenres.some(genre => 
          Array.from(topGenres).some(userGenre => 
            genre.toLowerCase().includes(userGenre) || 
            userGenre.includes(genre.toLowerCase())
          )
        );
        
        if (genreMatch) {
          score += 0.3;
        }

        // Boost for artists similar to user's taste (same first artist as seed)
        const artistMatch = track.artists.some(artist => 
          topArtistIds.has(artist.id)
        );
        
        if (artistMatch) {
          score += 0.2;
        }

        // Slight preference for newer releases
        const releaseDate = (track.album as any).release_date;
        if (releaseDate) {
          const releaseYear = new Date(releaseDate).getFullYear();
          const currentYear = new Date().getFullYear();
          if (currentYear - releaseYear <= 2) {
            score += 0.1;
          }
        }

        // Diversity bonus (prefer different artists)
        score += Math.random() * 0.2; // Add some randomness for discovery

        return { ...track, customScore: score };
      })
      .sort((a, b) => (b.customScore || 0) - (a.customScore || 0));
  }

  // Get user profile summary
  private getUserProfile(userData: UserData) {
    const analysis = this.dataCollector.analyzeListeningPatterns();
    
    return {
      name: userData.profile?.display_name || 'Unknown User',
      topGenres: analysis.topGenres.slice(0, 5),
      topArtists: userData.topArtists.medium_term.slice(0, 5).map(a => a.name),
      totalTracks: Object.values(userData.topTracks).flat().length,
      recentActivity: userData.recentlyPlayed.length
    };
  }
}