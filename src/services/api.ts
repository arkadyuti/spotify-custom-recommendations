// API client for backend communication
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// No need for API_BASE_URL - serving from same origin

export interface ApiResponse<T = any> {
  data: T;
  success?: boolean;
  message?: string;
}

export interface AuthResponse {
  isAuthenticated: boolean;
  userId: string | null;
}

export interface UserProfile {
  id: string;
  display_name: string;
  email?: string;
  country?: string;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height?: number;
    width?: number;
  }>;
}

export interface Track {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    name: string;
    image?: string; // Best quality image URL
  };
  duration_ms: number;
  popularity: number;
  preview_url?: string;
  external_urls?: {
    spotify: string;
  };
}

export interface RecommendationRequest {
  inputTracks: Track[];
  limit?: number;
  engine?: 'basic' | 'custom';
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

export interface RecommendationResponse {
  recommendations: FormattedTrack[];
  metadata: {
    input_songs_count: number;
    seed_tracks_used: number;
    total_candidates: number;
    final_count: number;
    mode?: string;
  };
}

export interface DataCollectionResponse {
  success: boolean;
  profile: UserProfile;
  statistics: {
    topTracks: number;
    topArtists: number;
    recentlyPlayed: number;
    savedTracks: number;
    audioFeatures: number;
  };
}

export interface PlaylistRequest {
  name: string;
  tracks: FormattedTrack[];
}

export interface PlaylistResponse {
  id: string;
  name: string;
  external_url: string;
  tracks_added: number;
  total_requested: number;
}

export interface DataSummary {
  profile: {
    name: string;
    country: string;
    lastUpdated: string;
  };
  stats: {
    topTracksCount: number;
    topArtistsCount: number;
    recentlyPlayedCount: number;
    savedTracksCount: number;
  };
  topGenres: Array<[string, number]>;
  topArtists: string[];
  recentTracks: Array<{
    name: string;
    artist: string;
  }>;
}

export interface UserPlaylist {
  id: string;
  name: string;
  description: string;
  tracks_total: number;
  owner: string;
  is_owner: boolean;
  external_url: string;
  image?: string;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      withCredentials: true, // Important for session cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for debugging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        
        // Handle authentication errors
        if (error.response?.status === 401) {
          // Redirect to login or handle auth error
          console.log('Authentication required');
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async getAuthStatus(): Promise<AuthResponse> {
    const response = await this.api.get('/api');
    return {
      isAuthenticated: response.data.authentication.isAuthenticated,
      userId: response.data.authentication.userId
    };
  }

  async login(): Promise<void> {
    // Redirect to backend auth endpoint
    window.location.href = '/auth/login';
  }

  async logout(): Promise<void> {
    await this.api.get('/auth/logout');
  }

  async testAuth(): Promise<{ profile: UserProfile }> {
    const response = await this.api.get('/api/test-auth');
    return response.data;
  }

  // Data collection methods
  async collectUserData(forceRefresh: boolean = false): Promise<DataCollectionResponse> {
    const response = await this.api.get(`/api/collect-data?refresh=${forceRefresh}`);
    return response.data;
  }

  async getUserSummary(): Promise<DataSummary | null> {
    try {
      const response = await this.api.get('/api/user-summary');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return null; // Not authenticated
      }
      throw error;
    }
  }

  async getUserTracks(): Promise<{
    topTracksShort: Track[];
    topTracksMedium: Track[];
    recentlyPlayed: Track[];
    savedTracks: Track[];
  }> {
    const response = await this.api.get('/api/user-tracks');
    return response.data;
  }

  async searchTracks(query: string, limit: number = 20): Promise<{
    query: string;
    total: number;
    limit: number;
    tracks: Track[];
  }> {
    const response = await this.api.get(`/api/search-tracks?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  // Recommendation methods
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const response = await this.api.post('/api/recommendations', request);
    return response.data;
  }

  async getUserBasedRecommendations(request: Omit<RecommendationRequest, 'engine'>): Promise<RecommendationResponse> {
    const response = await this.api.post('/api/recommendations/user-based', request);
    return response.data;
  }

  // Playlist methods
  async createPlaylist(request: PlaylistRequest): Promise<PlaylistResponse> {
    const response = await this.api.post('/api/create-playlist', request);
    return response.data;
  }

  async updatePlaylist(playlistId: string, tracks: FormattedTrack[]): Promise<PlaylistResponse> {
    const response = await this.api.post('/api/update-playlist', {
      playlistId,
      tracks
    });
    return response.data;
  }

  async getUserPlaylists(): Promise<{
    playlists: UserPlaylist[];
    total: number;
  }> {
    const response = await this.api.get('/api/user-playlists');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.api.get('/health');
    return response.data;
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export default
export default apiService;