const spotifyAPI = require('./spotify-api');
const dataCollector = require('./data-collector');

class RecommendationEngine {
  constructor() {
    this.diversityWeight = 0.3;
    this.recencyWeight = 0.4;
    this.popularityWeight = 0.3;
  }

  // Get recommendations based on user's listening patterns
  async getRecommendations(limit = 20) {
    try {
      const userData = dataCollector.userData;
      if (!userData.profile) {
        throw new Error('No user data available. Please collect data first.');
      }

      console.log('Generating custom recommendations...');

      // Get seeds for Spotify's recommendation API
      const seeds = this.buildSeeds(userData);
      console.log('Using seeds:', seeds);

      // Get recommendations from Spotify
      const spotifyRecs = await this.getSpotifyRecommendations(seeds, limit * 2);
      
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
  buildSeeds(userData) {
    const seeds = {
      seed_artists: [],
      seed_tracks: [],
      seed_genres: []
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
  async getSpotifyRecommendations(seeds, limit) {
    // Ensure we have valid seeds
    const cleanSeeds = {};
    
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

    const response = await spotifyAPI.getRecommendations(params);
    return response.tracks || [];
  }

  // Apply custom filtering to remove tracks user already knows
  applyCustomFiltering(recommendations, userData) {
    // Get all track IDs user already has
    const userTrackIds = new Set();
    
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
    const userArtistIds = new Set();
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
  rankRecommendations(recommendations, userData) {
    const analysis = dataCollector.analyzeListeningPatterns();
    const topGenres = new Set(analysis.topGenres.map(([genre]) => genre.toLowerCase()));
    
    // Get user's artist preferences
    const topArtistIds = new Set();
    Object.values(userData.topArtists).flat().forEach(artist => 
      topArtistIds.add(artist.id)
    );

    return recommendations
      .map(track => {
        let score = track.popularity / 100; // Base score from popularity

        // Boost score for preferred genres (simulate genre matching)
        const trackGenres = track.artists[0]?.genres || [];
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
        const releaseYear = new Date(track.album.release_date).getFullYear();
        const currentYear = new Date().getFullYear();
        if (currentYear - releaseYear <= 2) {
          score += 0.1;
        }

        // Diversity bonus (prefer different artists)
        score += Math.random() * 0.2; // Add some randomness for discovery

        return { ...track, customScore: score };
      })
      .sort((a, b) => b.customScore - a.customScore);
  }

  // Get user profile summary
  getUserProfile(userData) {
    const analysis = dataCollector.analyzeListeningPatterns();
    
    return {
      name: userData.profile.display_name,
      topGenres: analysis.topGenres.slice(0, 5),
      topArtists: userData.topArtists.medium_term.slice(0, 5).map(a => a.name),
      totalTracks: Object.values(userData.topTracks).flat().length,
      recentActivity: userData.recentlyPlayed.length
    };
  }
}

module.exports = new RecommendationEngine();