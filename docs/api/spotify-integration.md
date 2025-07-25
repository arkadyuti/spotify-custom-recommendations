# Spotify API Integration

## Overview

The application integrates with Spotify Web API using the official TypeScript SDK (`@spotify/web-api-ts-sdk`). This document details the integration implementation, API usage patterns, and best practices.

## SDK Implementation

### API Client Wrapper (`spotify-api.js`)

```javascript
class SpotifyAPI {
  create(req) {
    // Creates SDK instance with token provider
    return SpotifyApi.withAccessToken(
      clientId,
      tokenProvider(req)
    );
  }
}
```

### Token Provider Pattern
```javascript
{
  getAccessToken: async () => {
    await ensureValidToken(req);
    return { access_token, expires_in, expires };
  }
}
```

### Automatic Token Refresh
- Checks token expiry before each call
- 5-minute buffer for safety
- Refreshes using refresh token
- Updates session and storage

## Spotify API Endpoints Used

### Authentication & Profile

#### GET /v1/me
Fetches authenticated user's profile.
```javascript
const profile = await api.getMe();
// Returns: User object with id, display_name, email, etc.
```

### User Data Collection

#### GET /v1/me/top/{type}
Gets user's top artists or tracks.
```javascript
// Type: 'artists' or 'tracks'
// Time ranges: short_term, medium_term, long_term
const topTracks = await api.getTopTracks(timeRange, limit);
```

#### GET /v1/me/player/recently-played
Gets recently played tracks.
```javascript
const recent = await api.getRecentlyPlayed(limit);
// Returns: Array of play history items
```

#### GET /v1/me/tracks
Gets user's saved tracks.
```javascript
const saved = await api.getSavedTracks(limit);
// Returns: Paged list of saved track items
```

### Audio Analysis

#### GET /v1/audio-features
Gets audio features for tracks.
```javascript
const features = await api.getAudioFeatures(trackIds);
// Returns: Array of audio feature objects
// Limit: 100 tracks per request
```

### Search

#### GET /v1/search
Searches for tracks, artists, etc.
```javascript
const results = await api.searchTracks(query, limit);
// Query formats:
// - "track:name artist:name"
// - "genre:indie"
// - Simple keywords
```

### Recommendations

#### GET /v1/recommendations
Gets track recommendations (basic engine only).
```javascript
const params = {
  seed_artists: "artist1,artist2",
  seed_tracks: "track1",
  seed_genres: "pop",
  limit: 20,
  market: "US"
};
const recs = await spotifyAPI.getRecommendations(params);
```

### Playlist Management

#### POST /v1/users/{user_id}/playlists
Creates a new playlist.
```javascript
await api.createPlaylist(
  userId,
  name,
  description,
  isPublic
);
```

#### POST /v1/playlists/{id}/tracks
Adds tracks to playlist.
```javascript
await api.addTracksToPlaylist(playlistId, uris);
// URIs format: ["spotify:track:id1", ...]
```

#### PUT /v1/playlists/{id}/tracks
Replaces all playlist tracks.
```javascript
await api.makeRequest(`/playlists/${id}/tracks`, {
  method: 'PUT',
  body: { uris: trackUris }
});
```

## Rate Limiting

### Spotify's Limits
- **Default**: 180 requests/minute
- **Search**: Subject to additional limits
- **Conditional Requests**: Not counted

### Implementation Strategy
```javascript
// Built-in delays
await new Promise(resolve => setTimeout(resolve, 100));

// Batch processing
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await processBatch(batch);
}
```

### Error Handling
```javascript
try {
  const result = await api.someMethod();
} catch (error) {
  if (error.status === 429) {
    // Rate limited - wait and retry
    const retryAfter = error.headers['retry-after'];
    await sleep(retryAfter * 1000);
  }
}
```

## Request Patterns

### Efficient Data Collection
```javascript
// Parallel requests for independent data
const [topTracks, topArtists, recent] = await Promise.all([
  api.getTopTracks('medium_term', 50),
  api.getTopArtists('medium_term', 50),
  api.getRecentlyPlayed(50)
]);
```

### Batch Audio Features
```javascript
// Process in chunks of 100
const chunks = chunk(trackIds, 100);
const allFeatures = [];

for (const chunk of chunks) {
  const response = await api.getAudioFeatures(chunk);
  allFeatures.push(...response.audio_features);
}
```

### Search Optimization
```javascript
// Precise search queries
const searchQuery = `track:"${track}" artist:"${artist}"`;
// Fallback to broader search if needed
const fallbackQuery = `${track} ${artist}`;
```

## Error Types

### Common Spotify Errors
1. **401 Unauthorized**: Token expired/invalid
2. **403 Forbidden**: Insufficient scopes
3. **404 Not Found**: Resource doesn't exist
4. **429 Too Many Requests**: Rate limited
5. **500 Server Error**: Spotify issues

### Error Response Format
```javascript
{
  error: {
    status: 401,
    message: "The access token expired",
    reason: "NO_TOKEN"
  }
}
```

## SDK Limitations & Workarounds

### 1. Playlist Replacement
SDK doesn't have direct method for replacing tracks.
```javascript
// Workaround: Use raw API call
await api.makeRequest('/playlists/{id}/tracks', {
  method: 'PUT',
  body: { uris }
});
```

### 2. Pagination Handling
Some endpoints return paged results.
```javascript
// Manual pagination example
let allItems = [];
let response = await api.getSavedTracks(50);
allItems.push(...response.items);

while (response.next) {
  response = await api.makeRequest(response.next);
  allItems.push(...response.items);
}
```

### 3. Market Restrictions
Some content is market-restricted.
```javascript
// Always specify market
const params = {
  market: userData.profile.country || 'US'
};
```

## Best Practices

### 1. Token Management
- Always use token provider pattern
- Implement proper refresh logic
- Store tokens securely

### 2. Error Handling
- Catch and handle specific errors
- Implement retry logic
- Provide user feedback

### 3. Performance
- Batch requests when possible
- Cache frequently used data
- Minimize API calls

### 4. Data Freshness
- Implement cache expiry
- Provide manual refresh
- Balance freshness vs API limits

## Migration Recommendations

### Current Implementation
- Direct SDK usage in routes
- Basic error handling
- Sequential processing
- Limited caching

### Recommended Architecture
1. **API Service Layer**: Abstract SDK usage
2. **Request Queue**: Manage rate limits
3. **Response Cache**: Redis caching
4. **Error Recovery**: Automatic retries
5. **Webhook Support**: Real-time updates
6. **GraphQL Layer**: Efficient data fetching

### Enhanced Features
1. **Streaming API**: Real-time playback
2. **Web Playback SDK**: In-app player
3. **Podcast Support**: Extended content
4. **Social Features**: Friend activity
5. **Analytics API**: Deeper insights