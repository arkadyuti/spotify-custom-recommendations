const { getAccessToken, refreshAccessToken } = require('./auth');

class SpotifyAPI {
  constructor() {
    this.baseURL = 'https://api.spotify.com/v1';
  }

  async makeRequest(endpoint, options = {}) {
    const token = getAccessToken();
    if (!token) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
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
        await refreshAccessToken();
        return this.makeRequest(endpoint, options);
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

  async pause() {
    return this.makeRequest('/me/player/pause', { method: 'PUT' });
  }

  async next() {
    return this.makeRequest('/me/player/next', { method: 'POST' });
  }

  async previous() {
    return this.makeRequest('/me/player/previous', { method: 'POST' });
  }

  // Get available devices
  async getDevices() {
    return this.makeRequest('/me/player/devices');
  }

  // Get current playback
  async getCurrentPlayback() {
    return this.makeRequest('/me/player');
  }
}

module.exports = new SpotifyAPI();