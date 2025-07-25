# Data Collection & Storage

## Overview

The data collection system gathers comprehensive listening data from Spotify to build user profiles and enable personalized recommendations. It implements efficient caching and storage strategies to minimize API calls.

## Data Collection Process

### 1. Initial Data Sync
When a user clicks "Sync My Data", the system collects:

```javascript
// Route: GET /collect-data?refresh=true
1. User Profile
2. Top Tracks (3 time periods)
3. Top Artists (3 time periods)
4. Recently Played Tracks
5. Saved/Liked Tracks
6. Audio Features for all tracks
```

### 2. Data Structure

#### User Data Object
```javascript
{
  profile: {
    id: "spotify_user_id",
    display_name: "User Name",
    email: "email@example.com",
    country: "US",
    followers: { total: 100 }
  },
  topTracks: {
    short_term: [...],   // Last 4 weeks
    medium_term: [...],  // Last 6 months
    long_term: [...]     // All time
  },
  topArtists: {
    short_term: [...],
    medium_term: [...],
    long_term: [...]
  },
  recentlyPlayed: [...], // Last 50 played
  savedTracks: [...],     // User's liked songs
  audioFeatures: Map(),   // Track ID -> features
  playlists: []          // User's playlists
}
```

### 3. Time Ranges
- **Short Term**: ~4 weeks of data
- **Medium Term**: ~6 months of data
- **Long Term**: Several years of data

## Storage Implementation

### Local File Storage (node-persist)
```
./data/
├── users/
│   └── {userId}/
│       ├── profile.json
│       ├── tracks.json
│       └── analysis.json
├── tokens/
│   └── {userId}.json
└── analysis/
    └── {userId}.json
```

### Storage Functions

#### Save User Data
```javascript
async saveUserData(userId, data) {
  // Stores complete user profile
  // Separate files for different data types
  // Automatic serialization
}
```

#### Load User Data
```javascript
async loadUserData(userId) {
  // Retrieves cached data
  // Deserializes audio features Map
  // Returns null if not found
}
```

#### Get Data Summary
```javascript
async getDataSummary(userId) {
  // Quick stats for UI display
  // Top genres, artists, recent tracks
  // Formatted for dashboard sidebar
}
```

## Audio Features Collection

### Features Collected
For each track, Spotify provides:
- **Acousticness**: 0.0 to 1.0
- **Danceability**: 0.0 to 1.0
- **Energy**: 0.0 to 1.0
- **Instrumentalness**: 0.0 to 1.0
- **Liveness**: 0.0 to 1.0
- **Loudness**: -60 to 0 dB
- **Speechiness**: 0.0 to 1.0
- **Tempo**: BPM
- **Valence**: 0.0 to 1.0 (positivity)
- **Key**: 0 to 11
- **Mode**: Major (1) or Minor (0)
- **Time Signature**: Beats per measure

### Batch Processing
```javascript
// Process up to 100 tracks per API call
for (let i = 0; i < trackIds.length; i += 100) {
  const batch = trackIds.slice(i, i + 100);
  const features = await api.getAudioFeatures(batch);
  // Store in Map for O(1) lookup
}
```

## Listening Pattern Analysis

### Analysis Generation
The system analyzes collected data to identify:

1. **Favorite Genres**
   - Extracted from artist data
   - Frequency counting
   - Top 10 genres ranked

2. **Audio Profile**
   - Average of all track features
   - User's musical preferences
   - Energy, mood, style metrics

3. **Artist Diversity**
   - Unique artist count
   - Genre spread
   - Discovery patterns

### Analysis Data Structure
```javascript
{
  favoriteGenres: Map([
    ["indie rock", 45],
    ["alternative", 32],
    ...
  ]),
  audioProfile: {
    energy: 0.68,
    danceability: 0.55,
    valence: 0.42,
    acousticness: 0.23,
    instrumentalness: 0.12,
    speechiness: 0.08
  },
  topGenres: [["genre", count], ...],
  timeOfDay: Map(),  // Future: listening times
  artistDiversity: 0.75
}
```

## Caching Strategy

### Cache Validity
- Default: 24 hours
- Force refresh: `?refresh=true`
- Automatic on first visit

### Cache Benefits
1. Reduces API rate limit usage
2. Faster page loads
3. Offline capability
4. Consistent data during session

### Cache Invalidation
- Manual refresh by user
- Token expiration
- Data corruption detection

## Data Transformation

### Track Formatting
```javascript
{
  name: "Track Name",
  artist: "Artist1, Artist2",
  album: "Album Name",
  duration: 3.5,  // minutes
  popularity: 75,
  external_url: "spotify:track:...",
  played_at: "2024-01-15T10:30:00Z",
  added_at: "2023-12-01T15:00:00Z"
}
```

### Dashboard Summary
```javascript
{
  profile: {
    name: "User Name",
    country: "US",
    lastUpdated: timestamp
  },
  stats: {
    topTracksCount: 150,
    topArtistsCount: 100,
    recentlyPlayedCount: 50,
    savedTracksCount: 500
  },
  topGenres: [["indie", 20], ...],
  topArtists: ["Artist1", ...],
  recentTracks: [
    {name: "Track", artist: "Artist"},
    ...
  ]
}
```

## Error Handling

### Graceful Degradation
1. **Missing Saved Tracks**: Continue without
2. **Audio Features Failure**: Use basic data
3. **Partial Data**: Work with available
4. **API Rate Limits**: Show cached data

### Error Recovery
- Retry logic for transient failures
- Fallback to cached data
- User notification of issues
- Partial data collection

## Performance Optimization

### Parallel Requests
- Concurrent API calls where possible
- Promise.all for independent data
- Controlled concurrency

### Data Efficiency
- Only fetch changed data
- Incremental updates (future)
- Compressed storage

## Privacy Considerations

### Data Handling
- No data sharing
- Local storage only
- User-controlled refresh
- Clear data on logout

### Compliance
- GDPR considerations
- Data minimization
- User consent via OAuth
- Data portability

## Migration Recommendations

### Current Limitations
1. File-based storage doesn't scale
2. No real-time updates
3. Full data replacement on refresh
4. Limited query capabilities
5. No data versioning

### Suggested Improvements
1. **Database Storage**: PostgreSQL/MongoDB
2. **Incremental Updates**: Delta syncing
3. **Background Jobs**: Queue-based collection
4. **Data Pipeline**: Stream processing
5. **Analytics Engine**: Advanced insights
6. **Caching Layer**: Redis for hot data
7. **Data Warehouse**: Historical analysis