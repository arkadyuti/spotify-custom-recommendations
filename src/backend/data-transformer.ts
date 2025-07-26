// Data transformation utilities to convert full Spotify objects to lean versions
// This reduces storage by 90%+ by keeping only essential fields

export interface LeanTrack {
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

export interface LeanArtist {
  id: string;
  name: string;
  genres: string[];
  image?: string; // Best quality image URL
}

export interface LeanProfile {
  id: string;
  display_name: string;
  email?: string;
  country?: string;
  image?: string; // Best quality image URL
}

export interface LeanAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  tempo: number;
}

// Helper to get the best quality image from Spotify images array
function getBestImage(images: Array<{ url: string; height?: number; width?: number }>): string | undefined {
  if (!images || images.length === 0) return undefined;
  
  // Sort by size (height * width) and take the largest
  const sorted = images
    .filter(img => img.height && img.width)
    .sort((a, b) => (b.height! * b.width!) - (a.height! * a.width!));
  
  return sorted[0]?.url || images[0]?.url;
}

// Transform full Spotify track to lean version
export function transformTrack(spotifyTrack: any): LeanTrack {
  return {
    id: spotifyTrack.id,
    name: spotifyTrack.name,
    artists: spotifyTrack.artists?.map((artist: any) => ({
      id: artist.id,
      name: artist.name
    })) || [],
    album: {
      name: spotifyTrack.album?.name || 'Unknown',
      image: getBestImage(spotifyTrack.album?.images)
    },
    duration_ms: spotifyTrack.duration_ms || 0,
    popularity: spotifyTrack.popularity || 0,
    preview_url: spotifyTrack.preview_url,
    external_urls: spotifyTrack.external_urls
  };
}

// Transform full Spotify artist to lean version
export function transformArtist(spotifyArtist: any): LeanArtist {
  return {
    id: spotifyArtist.id,
    name: spotifyArtist.name,
    genres: spotifyArtist.genres || [],
    image: getBestImage(spotifyArtist.images)
  };
}

// Transform full Spotify profile to lean version
export function transformProfile(spotifyProfile: any): LeanProfile {
  return {
    id: spotifyProfile.id,
    display_name: spotifyProfile.display_name || 'Unknown',
    email: spotifyProfile.email,
    country: spotifyProfile.country,
    image: getBestImage(spotifyProfile.images)
  };
}

// Transform full Spotify audio features to lean version
export function transformAudioFeatures(spotifyFeatures: any): LeanAudioFeatures {
  return {
    id: spotifyFeatures.id,
    danceability: spotifyFeatures.danceability || 0,
    energy: spotifyFeatures.energy || 0,
    valence: spotifyFeatures.valence || 0,
    acousticness: spotifyFeatures.acousticness || 0,
    instrumentalness: spotifyFeatures.instrumentalness || 0,
    speechiness: spotifyFeatures.speechiness || 0,
    tempo: spotifyFeatures.tempo || 0
  };
}

// Transform recently played item
export function transformRecentlyPlayedItem(item: any) {
  return {
    track: transformTrack(item.track),
    played_at: item.played_at
  };
}

// Transform saved track item
export function transformSavedTrackItem(item: any) {
  return {
    track: transformTrack(item.track),
    added_at: item.added_at
  };
}