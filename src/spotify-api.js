const { getAccessToken, refreshAccessToken, ensureValidToken } = require('./auth');

class SpotifyAPI {
  constructor(req) {
    this.baseURL = 'https://api.spotify.com/v1';
    this.req = req;
  }

  async makeRequest(endpoint, options = {}) {
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
  async getMe() {
    return this.makeRequest('/me');
  }

  // Get user's top tracks
  async getTopTracks(timeRange = 'medium_term', limit = 50) {
    return this.makeRequest(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
  }

  // Get user's top artists
  async getTopArtists(timeRange = 'medium_term', limit = 50) {
    return this.makeRequest(`/me/top/artists?time_range=${timeRange}&limit=${limit}`);
  }

  // Get recently played tracks
  async getRecentlyPlayed(limit = 50) {
    return this.makeRequest(`/me/player/recently-played?limit=${limit}`);
  }

  // Get audio features for tracks
  async getAudioFeatures(trackIds) {
    const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;
    return this.makeRequest(`/audio-features?ids=${ids}`);
  }

  // Get track recommendations
  async getRecommendations(params) {
    const queryString = new URLSearchParams(params).toString();
    console.log('Full recommendations URL:', `${this.baseURL}/recommendations?${queryString}`);
    return this.makeRequest(`/recommendations?${queryString}`);
  }

  // Search for tracks
  async searchTracks(query, limit = 20) {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest(`/search?q=${encodedQuery}&type=track&limit=${limit}`);
  }

  // Get user's saved tracks
  async getSavedTracks(limit = 50, offset = 0) {
    return this.makeRequest(`/me/tracks?limit=${limit}&offset=${offset}`);
  }

  // Get user's playlists
  async getMyPlaylists(limit = 50) {
    return this.makeRequest(`/me/playlists?limit=${limit}`);
  }

  // Get playlist tracks
  async getPlaylistTracks(playlistId, limit = 100) {
    return this.makeRequest(`/playlists/${playlistId}/tracks?limit=${limit}`);
  }

  // Control playback
  async play(uris = null, deviceId = null) {
    const body = uris ? { uris } : {};
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return this.makeRequest(`/me/player/play${query}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async pause(deviceId = null) {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return this.makeRequest(`/me/player/pause${query}`, {
      method: 'PUT'
    });
  }

  async next(deviceId = null) {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return this.makeRequest(`/me/player/next${query}`, {
      method: 'POST'
    });
  }

  async previous(deviceId = null) {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return this.makeRequest(`/me/player/previous${query}`, {
      method: 'POST'
    });
  }

  // Create a playlist
  async createPlaylist(userId, name, description = '', isPublic = false) {
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
  async addTracksToPlaylist(playlistId, trackUris) {
    return this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        uris: trackUris
      })
    });
  }

  // Get track details
  async getTrack(trackId) {
    return this.makeRequest(`/tracks/${trackId}`);
  }

  // Get multiple tracks
  async getTracks(trackIds) {
    const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;
    return this.makeRequest(`/tracks?ids=${ids}`);
  }

  // Get artist details
  async getArtist(artistId) {
    return this.makeRequest(`/artists/${artistId}`);
  }

  // Get artist's top tracks
  async getArtistTopTracks(artistId, market = 'US') {
    return this.makeRequest(`/artists/${artistId}/top-tracks?market=${market}`);
  }

  // Get related artists
  async getRelatedArtists(artistId) {
    return this.makeRequest(`/artists/${artistId}/related-artists`);
  }

  // Get available devices
  async getDevices() {
    return this.makeRequest('/me/player/devices');
  }

  // Get current playback
  async getCurrentPlayback() {
    return this.makeRequest('/me/player');
  }

  // Get currently playing track
  async getCurrentlyPlaying() {
    return this.makeRequest('/me/player/currently-playing');
  }
}

// Export a factory function instead of a singleton
module.exports = {
  create: (req) => new SpotifyAPI(req)
};