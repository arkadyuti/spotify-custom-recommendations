// Spotify API client - migrated from spotify-custom-recommendations/src/spotify-api.js
// Spotify Web API wrapper with automatic token refresh

import { Request } from 'express';
import { getAccessToken, refreshAccessToken, ensureValidToken } from './auth.js';

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: { name: string; id: string };
  duration_ms: number;
  popularity: number;
  external_urls: { spotify: string };
  uri: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  external_urls: { spotify: string };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  public: boolean;
  external_urls: { spotify: string };
  tracks: { total: number };
}

export interface AudioFeatures {
  id: string;
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  liveness: number;
  loudness: number;
  speechiness: number;
  valence: number;
  tempo: number;
  key: number;
  mode: number;
  time_signature: number;
}

export interface RecommendationParams {
  seed_artists?: string;
  seed_tracks?: string;
  seed_genres?: string;
  limit?: number;
  market?: string;
  min_acousticness?: number;
  max_acousticness?: number;
  target_acousticness?: number;
  min_danceability?: number;
  max_danceability?: number;
  target_danceability?: number;
  min_energy?: number;
  max_energy?: number;
  target_energy?: number;
  min_instrumentalness?: number;
  max_instrumentalness?: number;
  target_instrumentalness?: number;
  min_liveness?: number;
  max_liveness?: number;
  target_liveness?: number;
  min_loudness?: number;
  max_loudness?: number;
  target_loudness?: number;
  min_popularity?: number;
  max_popularity?: number;
  target_popularity?: number;
  min_speechiness?: number;
  max_speechiness?: number;
  target_speechiness?: number;
  min_tempo?: number;
  max_tempo?: number;
  target_tempo?: number;
  min_valence?: number;
  max_valence?: number;
  target_valence?: number;
}

export class SpotifyApiService {
  private baseURL = 'https://api.spotify.com/v1';
  private req: Request;

  constructor(req: Request) {
    this.req = req;
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      // Ensure we have a valid token
      const token = await ensureValidToken(this.req);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        await refreshAccessToken(this.req);
        const newToken = getAccessToken(this.req);
        
        // Retry the request with new token
        const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        if (!retryResponse.ok) {
          const errorBody = await retryResponse.text();
          console.error(`Spotify API error: ${retryResponse.status} ${retryResponse.statusText}`, errorBody);
          throw new Error(`Spotify API error: ${retryResponse.status} ${retryResponse.statusText} - ${errorBody}`);
        }
        
        return await retryResponse.json();
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Spotify API error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Spotify API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get user profile
  async getMe(): Promise<any> {
    return this.makeRequest('/me');
  }

  // Get user's top tracks
  async getTopTracks(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 50): Promise<any> {
    return this.makeRequest(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
  }

  // Get user's top artists
  async getTopArtists(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 50): Promise<any> {
    return this.makeRequest(`/me/top/artists?time_range=${timeRange}&limit=${limit}`);
  }

  // Get recently played tracks
  async getRecentlyPlayed(limit: number = 50): Promise<any> {
    return this.makeRequest(`/me/player/recently-played?limit=${limit}`);
  }

  // Get audio features for tracks
  async getAudioFeatures(trackIds: string | string[]): Promise<any> {
    const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;
    return this.makeRequest(`/audio-features?ids=${ids}`);
  }

  // Get track recommendations
  async getRecommendations(params: RecommendationParams): Promise<any> {
    const queryString = new URLSearchParams(params as any).toString();
    console.log('Full recommendations URL:', `${this.baseURL}/recommendations?${queryString}`);
    return this.makeRequest(`/recommendations?${queryString}`);
  }

  // Search for tracks
  async searchTracks(query: string, limit: number = 20): Promise<any> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest(`/search?q=${encodedQuery}&type=track&limit=${limit}`);
  }

  // Get user's saved tracks
  async getSavedTracks(limit: number = 50, offset: number = 0): Promise<any> {
    return this.makeRequest(`/me/tracks?limit=${limit}&offset=${offset}`);
  }

  // Get user's playlists
  async getMyPlaylists(limit: number = 50): Promise<any> {
    return this.makeRequest(`/me/playlists?limit=${limit}`);
  }

  // Get playlist tracks
  async getPlaylistTracks(playlistId: string, limit: number = 100): Promise<any> {
    return this.makeRequest(`/playlists/${playlistId}/tracks?limit=${limit}`);
  }

  // Control playback
  async play(uris: string[] | null = null, deviceId: string | null = null): Promise<any> {
    const body = uris ? { uris } : {};
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return this.makeRequest(`/me/player/play${query}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async pause(deviceId: string | null = null): Promise<any> {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return this.makeRequest(`/me/player/pause${query}`, {
      method: 'PUT'
    });
  }

  async next(deviceId: string | null = null): Promise<any> {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return this.makeRequest(`/me/player/next${query}`, {
      method: 'POST'
    });
  }

  async previous(deviceId: string | null = null): Promise<any> {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return this.makeRequest(`/me/player/previous${query}`, {
      method: 'POST'
    });
  }

  // Create a playlist
  async createPlaylist(userId: string, name: string, description: string = '', isPublic: boolean = false): Promise<any> {
    return this.makeRequest(`/users/${userId}/playlists`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        public: isPublic
      })
    });
  }

  // Add tracks to playlist
  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<any> {
    return this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        uris: trackUris
      })
    });
  }

  // Get track details
  async getTrack(trackId: string): Promise<SpotifyTrack> {
    return this.makeRequest(`/tracks/${trackId}`);
  }

  // Get multiple tracks
  async getTracks(trackIds: string | string[]): Promise<any> {
    const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;
    return this.makeRequest(`/tracks?ids=${ids}`);
  }

  // Get artist details
  async getArtist(artistId: string): Promise<SpotifyArtist> {
    return this.makeRequest(`/artists/${artistId}`);
  }

  // Get artist's top tracks
  async getArtistTopTracks(artistId: string, market: string = 'US'): Promise<any> {
    return this.makeRequest(`/artists/${artistId}/top-tracks?market=${market}`);
  }

  // Get related artists
  async getRelatedArtists(artistId: string): Promise<any> {
    return this.makeRequest(`/artists/${artistId}/related-artists`);
  }

  // Get available devices
  async getDevices(): Promise<any> {
    return this.makeRequest('/me/player/devices');
  }

  // Get current playback
  async getCurrentPlayback(): Promise<any> {
    return this.makeRequest('/me/player');
  }

  // Get currently playing track
  async getCurrentlyPlaying(): Promise<any> {
    return this.makeRequest('/me/player/currently-playing');
  }
}

// Export a factory function instead of a singleton
export const createSpotifyApi = (req: Request): SpotifyApiService => new SpotifyApiService(req);

// Export static object with create method
export const SpotifyAPI = {
  create: (req: Request): SpotifyApiService => new SpotifyApiService(req)
};