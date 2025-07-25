# Data Models & Storage

## Overview

The application uses several data models to represent user information, tracks, analysis results, and recommendations. Storage is primarily file-based using node-persist with partial MongoDB integration.

## Core Data Models

### User Profile
```javascript
{
  id: "string",              // Spotify user ID
  display_name: "string",    // Display name
  email: "string",           // Email address
  country: "string",         // Country code (US, UK, etc.)
  followers: {
    total: number
  },
  images: [                  // Profile images
    {
      url: "string",
      height: number,
      width: number
    }
  ],
  product: "string",         // Subscription type
  external_urls: {
    spotify: "string"
  }
}
```

### Track Object
```javascript
{
  id: "string",              // Spotify track ID
  name: "string",            // Track name
  artists: [                 // Artist array
    {
      id: "string",
      name: "string",
      genres: ["string"],    // Artist genres
      external_urls: {
        spotify: "string"
      }
    }
  ],
  album: {
    id: "string",
    name: "string",
    release_date: "YYYY-MM-DD",
    images: [
      {
        url: "string",
        height: number,
        width: number
      }
    ]
  },
  duration_ms: number,       // Duration in milliseconds
  popularity: number,        // 0-100 popularity score
  explicit: boolean,         // Explicit content flag
  external_urls: {
    spotify: "string"
  },
  preview_url: "string"      // 30-second preview (if available)
}
```

### Audio Features
```javascript
{
  id: "string",              // Track ID
  acousticness: number,      // 0.0 to 1.0
  danceability: number,      // 0.0 to 1.0
  energy: number,            // 0.0 to 1.0
  instrumentalness: number,  // 0.0 to 1.0
  liveness: number,          // 0.0 to 1.0
  loudness: number,          // -60 to 0 dB
  speechiness: number,       // 0.0 to 1.0
  valence: number,           // 0.0 to 1.0 (musical positivity)
  tempo: number,             // BPM
  key: number,               // 0-11 (C, C#, D, ...)
  mode: number,              // 0 (minor) or 1 (major)
  time_signature: number,    // 3-7 beats per measure
  duration_ms: number        // Duration in milliseconds
}
```

### Artist Object
```javascript
{
  id: "string",              // Spotify artist ID
  name: "string",            // Artist name
  genres: ["string"],        // Array of genres
  popularity: number,        // 0-100 popularity score
  followers: {
    total: number
  },
  images: [
    {
      url: "string",
      height: number,
      width: number
    }
  ],
  external_urls: {
    spotify: "string"
  }
}
```

## Composite Data Models

### User Data Collection
```javascript
{
  profile: UserProfile,      // User profile object
  topTracks: {
    short_term: [Track],     // Last 4 weeks
    medium_term: [Track],    // Last 6 months
    long_term: [Track]       // All time
  },
  topArtists: {
    short_term: [Artist],
    medium_term: [Artist],
    long_term: [Artist]
  },
  recentlyPlayed: [          // Recently played items
    {
      track: Track,
      played_at: "ISO_DATE",
      context: {
        type: "string",      // playlist, album, etc.
        href: "string"
      }
    }
  ],
  savedTracks: [             // Liked songs
    {
      track: Track,
      added_at: "ISO_DATE"
    }
  ],
  audioFeatures: Map(),      // Track ID -> AudioFeatures
  playlists: [Playlist]      // User's playlists (future)
}
```

### Listening Analysis
```javascript
{
  favoriteGenres: Map([      // Genre -> frequency
    ["indie rock", 45],
    ["pop", 32]
  ]),
  audioProfile: {            // Average audio features
    energy: 0.68,
    danceability: 0.55,
    valence: 0.42,
    acousticness: 0.23,
    instrumentalness: 0.12,
    speechiness: 0.08
  },
  topGenres: [               // Sorted by frequency
    ["genre", count], ...
  ],
  timeOfDay: Map(),          // Future: listening patterns
  artistDiversity: 0.75      // Uniqueness metric
}
```

### Recommendation Response
```javascript
{
  recommendations: [
    {
      name: "string",
      artist: "string",      // Comma-separated artists
      album: "string",
      duration: number,      // Duration in minutes
      popularity: number,    // 0-100
      external_url: "string",
      custom_score: number,  // Algorithm score
      preview_url: "string"
    }
  ],
  metadata: {
    input_songs_count: number,
    seed_tracks_used: number,
    total_candidates: number,
    final_count: number,
    mode: "string",          // "independent" or "user-based"
    userProfile: {           // Optional user context
      name: "string",
      topGenres: [],
      topArtists: [],
      totalTracks: number,
      recentActivity: number
    }
  }
}
```

## Storage Implementation

### File Structure
```
./data/
├── users/
│   └── {spotify_user_id}/
│       ├── profile.json     # User profile
│       ├── data.json        # Complete user data
│       └── tracks.json      # Formatted tracks
├── tokens/
│   └── {spotify_user_id}.json # OAuth tokens
└── analysis/
    └── {spotify_user_id}.json # Analysis results
```

### Storage Operations

#### Save User Data
```javascript
async saveUserData(userId, userData) {
  // Serialize Map objects to arrays
  const serialized = {
    ...userData,
    audioFeatures: userData.audioFeatures ? 
      Array.from(userData.audioFeatures.entries()) : []
  };
  
  await this.storage.setItem(
    `users/${userId}/data`, 
    serialized
  );
}
```

#### Load User Data
```javascript
async loadUserData(userId) {
  const data = await this.storage.getItem(`users/${userId}/data`);
  
  if (data && data.audioFeatures) {
    // Restore Map from array
    data.audioFeatures = new Map(data.audioFeatures);
  }
  
  return data;
}
```

### Data Transformation

#### Track Summary for UI
```javascript
function cleanTrackData(track, category, selected = false) {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists?.map(a => ({ 
      name: a.name, 
      id: a.id 
    })) || [],
    album: {
      name: track.album?.name || 'Unknown',
      images: track.album?.images || []
    },
    duration_ms: track.duration_ms,
    popularity: track.popularity,
    external_urls: track.external_urls,
    category,
    selected
  };
}
```

#### Dashboard Summary
```javascript
async getDataSummary(userId) {
  const userData = await this.loadUserData(userId);
  
  return {
    profile: {
      name: userData.profile.display_name,
      country: userData.profile.country,
      lastUpdated: Date.now()
    },
    stats: {
      topTracksCount: Object.values(userData.topTracks).flat().length,
      topArtistsCount: Object.values(userData.topArtists).flat().length,
      recentlyPlayedCount: userData.recentlyPlayed.length,
      savedTracksCount: userData.savedTracks.length
    },
    topGenres: analysis.topGenres.slice(0, 5),
    topArtists: userData.topArtists.medium_term
      .slice(0, 5)
      .map(a => a.name),
    recentTracks: userData.recentlyPlayed
      .slice(0, 3)
      .map(item => ({
        name: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', ')
      }))
  };
}
```

## Data Validation

### Input Validation
```javascript
// Track validation
function validateTrack(track) {
  return track && 
         track.id && 
         track.name && 
         track.artists && 
         track.artists.length > 0;
}

// Recommendation request validation
function validateRecommendationRequest(body) {
  const { inputTracks, limit } = body;
  
  if (!inputTracks || !Array.isArray(inputTracks)) {
    throw new Error('inputTracks must be an array');
  }
  
  if (inputTracks.length === 0) {
    throw new Error('At least one input track required');
  }
  
  if (limit && (limit < 1 || limit > 100)) {
    throw new Error('Limit must be between 1 and 100');
  }
  
  return true;
}
```

## Migration Considerations

### Current Storage Limitations
1. **File-based**: Doesn't scale horizontally
2. **No Relationships**: Can't query across users
3. **No Indexing**: Slow lookups
4. **No Transactions**: Consistency issues
5. **No Backup**: Single point of failure

### Recommended Database Schema

#### PostgreSQL Schema
```sql
-- Users table
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  display_name VARCHAR,
  email VARCHAR,
  country VARCHAR(2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tracks table
CREATE TABLE tracks (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  duration_ms INTEGER,
  popularity INTEGER,
  explicit BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Artists table
CREATE TABLE artists (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  popularity INTEGER,
  genres JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User tracks (many-to-many)
CREATE TABLE user_tracks (
  user_id VARCHAR REFERENCES users(id),
  track_id VARCHAR REFERENCES tracks(id),
  category VARCHAR, -- 'top_short', 'saved', 'recent'
  played_at TIMESTAMP,
  added_at TIMESTAMP,
  PRIMARY KEY (user_id, track_id, category)
);

-- Audio features
CREATE TABLE audio_features (
  track_id VARCHAR PRIMARY KEY REFERENCES tracks(id),
  acousticness DECIMAL,
  danceability DECIMAL,
  energy DECIMAL,
  -- ... other features
);
```

#### MongoDB Schema
```javascript
// User document
{
  _id: "spotify_user_id",
  profile: { ... },
  topTracks: {
    shortTerm: [{ track: ObjectId, rank: Number }],
    mediumTerm: [...],
    longTerm: [...]
  },
  recentlyPlayed: [
    { track: ObjectId, playedAt: Date }
  ],
  savedTracks: [
    { track: ObjectId, addedAt: Date }
  ],
  analysis: { ... },
  createdAt: Date,
  updatedAt: Date
}

// Track document
{
  _id: "spotify_track_id",
  name: String,
  artists: [{ id: String, name: String }],
  album: { ... },
  audioFeatures: { ... },
  createdAt: Date
}
```

### Data Migration Strategy
1. **Export**: JSON dumps from current storage
2. **Transform**: Convert to new schema
3. **Validate**: Ensure data integrity
4. **Import**: Batch insert to new system
5. **Verify**: Check migration accuracy