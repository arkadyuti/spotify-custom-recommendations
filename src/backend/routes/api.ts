import { Router, Request, Response } from 'express';
import { SpotifyAPI } from '../spotify-api.js';
import { DataCollectorService } from '../data-collector.js';
import { CustomRecommendationEngine } from '../engines/custom.js';
import { BasicRecommendationEngine } from '../engines/basic.js';
import { StorageService } from '../database/storage.js';

const router = Router();
const dataCollector = new DataCollectorService();
const customEngine = new CustomRecommendationEngine();
const basicEngine = new BasicRecommendationEngine();
const storage = new StorageService();

// Helper function to get user ID from session
function getUserId(req: Request): string | null {
  return (req.session as any)?.spotifyUserId || null;
}

// Data collection endpoint
router.get('/collect-data', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const forceRefresh = req.query.refresh === 'true';
    const data = await dataCollector.collectUserData(req, forceRefresh);

    // Also save analysis data
    const analysis = dataCollector.analyzeListeningPatterns();
    await storage.saveAnalysis(userId, analysis);

    // Prepare tracks data for storage
    const tracksData = {
      'Top Tracks - Short Term': data.topTracks.short_term?.map(track => ({
        name: track.name,
        artist: track.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: track.album?.name || 'Unknown',
        duration: Math.round(track.duration_ms / 1000 / 60 * 100) / 100,
        popularity: track.popularity,
        external_url: track.external_urls?.spotify
      })) || [],
      'Top Tracks - Medium Term': data.topTracks.medium_term?.map(track => ({
        name: track.name,
        artist: track.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: track.album?.name || 'Unknown',
        duration: Math.round(track.duration_ms / 1000 / 60 * 100) / 100,
        popularity: track.popularity,
        external_url: track.external_urls?.spotify
      })) || [],
      'Recently Played': data.recentlyPlayed?.map(item => ({
        name: item.track.name,
        artist: item.track.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: item.track.album?.name || 'Unknown',
        played_at: item.played_at,
        duration: Math.round(item.track.duration_ms / 1000 / 60 * 100) / 100,
        external_url: item.track.external_urls?.spotify
      })) || [],
      'Saved Tracks': data.savedTracks?.map(item => ({
        name: item.track.name,
        artist: item.track.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: item.track.album?.name || 'Unknown',
        added_at: item.added_at,
        duration: Math.round(item.track.duration_ms / 1000 / 60 * 100) / 100,
        external_url: item.track.external_urls?.spotify
      })) || []
    };

    await storage.saveTracks(userId, tracksData);

    res.json({
      success: true,
      profile: data.profile,
      statistics: {
        topTracks: Object.values(data.topTracks).flat().length,
        topArtists: Object.values(data.topArtists).flat().length,
        recentlyPlayed: data.recentlyPlayed.length,
        savedTracks: data.savedTracks.length,
        audioFeatures: data.audioFeatures ? data.audioFeatures.size : 0
      }
    });
  } catch (error) {
    console.error('Error in data collection:', error);
    res.status(500).json({
      error: 'Failed to collect data',
      message: (error as Error).message
    });
  }
});

// API endpoint for recommendations (using custom engine)
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const { inputTracks, limit, engine } = req.body;

    if (!inputTracks || inputTracks.length === 0) {
      return res.status(400).json({ error: 'Please select at least one input track' });
    }

    let recommendations;

    if (engine === 'basic') {
      // Use basic recommendation engine
      recommendations = await basicEngine.getRecommendations(req, limit || 20);
    } else {
      // Use custom recommendation engine (independent mode - no user data required)
      recommendations = await customEngine.getIndependentRecommendations(req, inputTracks, limit || 20);
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: (error as Error).message
    });
  }
});

// API endpoint for user-based recommendations
router.post('/recommendations/user-based', async (req: Request, res: Response) => {
  try {
    const { inputTracks, limit } = req.body;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required for user-based recommendations' });
    }

    // Use custom recommendation engine with user data
    const recommendations = await customEngine.getCustomRecommendations(req, inputTracks || [], limit || 20);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating user-based recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate user-based recommendations',
      message: (error as Error).message
    });
  }
});

// API endpoint for creating playlists
router.post('/create-playlist', async (req: Request, res: Response) => {
  try {
    const { name, tracks } = req.body;

    if (!name || !tracks || tracks.length === 0) {
      return res.status(400).json({ error: 'Playlist name and tracks are required' });
    }

    const api = SpotifyAPI.create(req);

    // Get user profile to create playlist
    const profile = await api.getMe();

    // Create playlist
    const playlistResponse = await api.createPlaylist(
      profile.id,
      name,
      `Custom recommendations generated by AI • Created ${new Date().toLocaleDateString()}`,
      false
    );

    console.log('Playlist created:', playlistResponse.name, playlistResponse.id);

    // Search for tracks and collect URIs
    const trackUris: string[] = [];
    console.log(`Searching for ${tracks.length} tracks to add to playlist...`);

    for (const track of tracks.slice(0, 50)) { // Spotify limit
      try {
        // Search for the track
        const searchQuery = `track:"${track.name}" artist:"${track.artist}"`;
        const searchResults = await api.searchTracks(searchQuery, 1);

        if (searchResults.tracks?.items && searchResults.tracks.items.length > 0) {
          trackUris.push(searchResults.tracks.items[0].uri);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error searching for track ${track.name}:`, (error as Error).message);
      }
    }

    console.log(`Found ${trackUris.length} tracks to add to playlist`);

    // Add tracks to playlist
    if (trackUris.length > 0) {
      await api.addTracksToPlaylist(playlistResponse.id, trackUris);
    }

    res.json({
      id: playlistResponse.id,
      name: playlistResponse.name,
      external_url: playlistResponse.external_urls?.spotify,
      tracks_added: trackUris.length,
      total_requested: tracks.length
    });

  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({
      error: 'Failed to create playlist',
      message: (error as Error).message
    });
  }
});

// API endpoint for updating existing playlists
router.post('/update-playlist', async (req: Request, res: Response) => {
  try {
    const { playlistId, playlistUrl, tracks } = req.body;
    
    if ((!playlistId && !playlistUrl) || !tracks || tracks.length === 0) {
      return res.status(400).json({ error: 'Playlist ID/URL and tracks are required' });
    }

    let finalPlaylistId = playlistId;

    // If URL is provided instead of ID, extract the ID
    if (!finalPlaylistId && playlistUrl) {
      function extractPlaylistId(url: string): string | null {
        const regex = /(?:playlist\/|playlist=)([a-zA-Z0-9]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
      }

      finalPlaylistId = extractPlaylistId(playlistUrl);
      if (!finalPlaylistId) {
        return res.status(400).json({ error: 'Invalid Spotify playlist URL format' });
      }
    }

    const api = SpotifyAPI.create(req);
    console.log('Updating playlist:', finalPlaylistId);

    // Get playlist info to verify access
    const playlistInfo = await api.makeRequest(`/playlists/${finalPlaylistId}`);
    console.log('Found playlist:', playlistInfo.name);

    // Search for tracks and collect URIs
    const trackUris: string[] = [];
    console.log(`Searching for ${tracks.length} tracks to add to playlist...`);

    for (const track of tracks.slice(0, 50)) { // Spotify limit
      try {
        // Search for the track
        const searchQuery = `track:"${track.name}" artist:"${track.artist}"`;
        const searchResults = await api.searchTracks(searchQuery, 1);

        if (searchResults.tracks?.items && searchResults.tracks.items.length > 0) {
          trackUris.push(searchResults.tracks.items[0].uri);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error searching for track ${track.name}:`, (error as Error).message);
      }
    }

    console.log(`Found ${trackUris.length} tracks to add to playlist`);

    // Replace all tracks in existing playlist
    if (trackUris.length > 0) {
      // First, replace the playlist tracks with the first batch
      const batchSize = 100; // Spotify limit per request
      const firstBatch = trackUris.slice(0, batchSize);

      // Use PUT to replace all tracks with the first batch
      await api.makeRequest(`/playlists/${finalPlaylistId}/tracks`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: firstBatch
        })
      });

      // If there are more tracks, add them with POST
      if (trackUris.length > batchSize) {
        for (let i = batchSize; i < trackUris.length; i += batchSize) {
          const batch = trackUris.slice(i, i + batchSize);

          await api.makeRequest(`/playlists/${finalPlaylistId}/tracks`, {
            method: 'POST',
            body: JSON.stringify({
              uris: batch
            })
          });
        }
      }
    } else {
      // If no tracks found, clear the playlist
      await api.makeRequest(`/playlists/${finalPlaylistId}/tracks`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: []
        })
      });
    }

    res.json({
      playlist_id: finalPlaylistId,
      playlist_name: playlistInfo.name,
      external_url: playlistInfo.external_urls?.spotify,
      tracks_added: trackUris.length,
      total_requested: tracks.length
    });

  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({
      error: 'Failed to update playlist',
      message: (error as Error).message
    });
  }
});

// Test authentication endpoint
router.get('/test-auth', async (req: Request, res: Response) => {
  try {
    const api = SpotifyAPI.create(req);
    const profile = await api.getMe();
    res.json({
      message: 'Authentication working!',
      profile: {
        id: profile.id,
        display_name: profile.display_name,
        email: profile.email,
        country: profile.country,
        followers: {
          total: profile.followers?.total || 0
        },
        images: profile.images || []
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Authentication failed',
      message: (error as Error).message
    });
  }
});

// Get user data summary
router.get('/user-summary', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const dataSummary = await storage.getDataSummary(userId);
    res.json(dataSummary);
  } catch (error) {
    console.error('Error getting user summary:', error);
    res.status(500).json({
      error: 'Failed to get user summary',
      message: (error as Error).message
    });
  }
});

// Get user tracks for track selection
router.get('/user-tracks', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userData = await storage.loadUserData(userId);
    if (!userData) {
      return res.status(404).json({ error: 'No user data found' });
    }

    // Return tracks in the format expected by the frontend
    const userTracks = {
      topTracksShort: userData.topTracks?.short_term || [],
      topTracksMedium: userData.topTracks?.medium_term || [],
      recentlyPlayed: userData.recentlyPlayed?.map(item => item.track) || [],
      savedTracks: userData.savedTracks?.map(item => item.track) || []
    };

    res.json(userTracks);
  } catch (error) {
    console.error('Error getting user tracks:', error);
    res.status(500).json({
      error: 'Failed to get user tracks',
      message: (error as Error).message
    });
  }
});

// Search for tracks
router.get('/search-tracks', async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchLimit = limit ? parseInt(limit as string) : 20;
    if (searchLimit > 50) {
      return res.status(400).json({ error: 'Search limit cannot exceed 50' });
    }

    const api = SpotifyAPI.create(req);
    const searchResults = await api.searchTracks(q.trim(), searchLimit);

    // Transform search results to match frontend format
    const tracks = searchResults.tracks?.items?.map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists?.map((artist: any) => ({
        name: artist.name,
        id: artist.id
      })) || [],
      album: {
        name: track.album?.name || 'Unknown Album',
        id: track.album?.id,
        image: track.album?.images?.[0]?.url
      },
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      external_urls: track.external_urls,
      uri: track.uri
    })) || [];

    res.json({
      query: q,
      total: searchResults.tracks?.total || 0,
      limit: searchLimit,
      tracks
    });

  } catch (error) {
    console.error('Error searching tracks:', error);
    res.status(500).json({
      error: 'Failed to search tracks',
      message: (error as Error).message
    });
  }
});

// Get user playlists
router.get('/user-playlists', async (req: Request, res: Response) => {
  try {
    const api = SpotifyAPI.create(req);
    const playlists = await api.getMyPlaylists(50);

    // Get user profile to check ownership
    const userProfile = await api.getMe();
    
    // Transform to simpler format
    const userPlaylists = playlists.items?.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      tracks_total: playlist.tracks?.total || 0,
      owner: playlist.owner?.display_name,
      is_owner: playlist.owner?.id === userProfile.id,
      external_url: playlist.external_urls?.spotify,
      image: playlist.images?.[0]?.url
    })) || [];

    res.json({
      playlists: userPlaylists.filter((p: any) => p.is_owner), // Only show user's own playlists
      total: userPlaylists.filter((p: any) => p.is_owner).length
    });

  } catch (error) {
    console.error('Error fetching user playlists:', error);
    res.status(500).json({ 
      error: 'Failed to fetch playlists',
      message: (error as Error).message 
    });
  }
});

// Waitlist endpoints
router.post('/waitlist', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const success = await storage.addToWaitlist(email);
    
    if (success) {
      // Also check status immediately to return it
      const status = await storage.getWaitlistStatus(email);
      res.json({
        success: true,
        message: 'Successfully joined the waitlist!',
        status: status?.status || 'pending'
      });
    } else {
      res.status(500).json({
        error: 'Failed to join waitlist',
        message: 'Please try again later'
      });
    }
  } catch (error) {
    console.error('Error in waitlist signup:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message
    });
  }
});

router.get('/waitlist/status/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const waitlistEntry = await storage.getWaitlistStatus(email);
    
    if (waitlistEntry) {
      res.json({
        email: waitlistEntry.email,
        status: waitlistEntry.status,
        submittedAt: waitlistEntry.submittedAt,
        approvedAt: waitlistEntry.approvedAt
      });
    } else {
      res.status(404).json({
        error: 'Email not found in waitlist',
        status: 'not_found'
      });
    }
  } catch (error) {
    console.error('Error checking waitlist status:', error);
    res.status(500).json({
      error: 'Failed to check waitlist status',
      message: (error as Error).message
    });
  }
});

export default router;
