# REST API Endpoints

## Authentication Endpoints

### GET /auth/login
Initiates Spotify OAuth flow.

**Response:**
- Redirects to Spotify authorization page
- Sets state parameter in session

**Error Cases:**
- 500: Session not available

---

### GET /auth/callback
Handles OAuth callback from Spotify.

**Query Parameters:**
- `code`: Authorization code from Spotify
- `state`: CSRF protection state
- `error`: Error from Spotify (if any)

**Response:**
- Success: HTML page with redirect to homepage
- Error: 400/500 with error message

**Side Effects:**
- Stores tokens in session
- Saves tokens to persistent storage
- Fetches and stores user profile

---

### GET /logout
Clears user session and tokens.

**Response:**
- HTML page with success message
- Auto-redirects to homepage

**Side Effects:**
- Destroys session
- Clears session cookie

## Data Collection Endpoints

### GET /collect-data
Collects user data from Spotify.

**Query Parameters:**
- `refresh=true`: Force refresh (optional)

**Response:**
- HTML page with collection summary
- Shows counts of collected data

**Data Collected:**
- User profile
- Top tracks (3 time periods)
- Top artists (3 time periods)
- Recently played tracks
- Saved tracks
- Audio features

**Error Cases:**
- 401: Not authenticated
- 500: Collection error

---

### GET /test-auth
Tests authentication status.

**Response:**
```json
{
  "message": "Authentication working!",
  "profile": {
    "name": "Display Name",
    "email": "user@email.com",
    "country": "US",
    "followers": 123
  }
}
```

**Error Cases:**
- 500: Authentication error

---

### GET /analysis
Loads listening pattern analysis.

**Response:**
- Redirects to homepage (shows in sidebar)

**Error Cases:**
- No analysis data: Shows collection prompt
- 500: Loading error

---

### GET /my-tracks
Displays user's track collection.

**Response:**
- Currently redirects to homepage
- Future: Detailed track view

**Error Cases:**
- No data: Shows collection prompt
- 500: Loading error

## Recommendation Endpoints

### GET /recommendations
Serves the recommendation UI page.

**Response:**
- HTML page with track selection interface
- Pre-populated with user's tracks

**Features:**
- Track selection by category
- Recommendation settings
- Results display
- Playlist management

**Error Cases:**
- Not authenticated: Login prompt
- No data: Collection prompt

---

### POST /api/recommendations
Generates music recommendations.

**Request Body:**
```json
{
  "inputTracks": [
    {
      "id": "track_id",
      "name": "Track Name",
      "artists": [{"id": "id", "name": "Artist"}],
      "popularity": 75,
      "category": "Top Tracks",
      "selected": true
    }
  ],
  "limit": 20
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "name": "Track Name",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": 3.25,
      "popularity": 78,
      "external_url": "spotify:track:...",
      "custom_score": 0.84,
      "preview_url": "https://..."
    }
  ],
  "metadata": {
    "input_songs_count": 10,
    "seed_tracks_used": 5,
    "total_candidates": 150,
    "final_count": 20,
    "mode": "independent"
  }
}
```

**Error Cases:**
- 400: No input tracks
- 500: Generation error

## Playlist Management Endpoints

### POST /api/create-playlist
Creates a new Spotify playlist.

**Request Body:**
```json
{
  "name": "Playlist Name",
  "tracks": [
    {
      "name": "Track Name",
      "artist": "Artist Name",
      "album": "Album Name"
    }
  ]
}
```

**Response:**
```json
{
  "id": "playlist_id",
  "name": "Playlist Name",
  "external_url": "spotify:playlist:...",
  "tracks_added": 18,
  "total_requested": 20
}
```

**Process:**
1. Creates playlist in user's account
2. Searches for each track
3. Adds found tracks to playlist
4. Returns summary

**Error Cases:**
- 400: Missing name or tracks
- 500: Creation error

---

### POST /api/update-playlist
Updates an existing Spotify playlist.

**Request Body:**
```json
{
  "playlistUrl": "https://open.spotify.com/playlist/...",
  "tracks": [
    {
      "name": "Track Name",
      "artist": "Artist Name"
    }
  ]
}
```

**Response:**
```json
{
  "playlist_id": "id",
  "playlist_name": "Name",
  "external_url": "spotify:playlist:...",
  "tracks_added": 20,
  "total_requested": 20
}
```

**Process:**
1. Extracts playlist ID from URL
2. Verifies user access
3. Searches for track URIs
4. Replaces all playlist tracks
5. Returns update summary

**Supported URL Formats:**
- `https://open.spotify.com/playlist/{id}`
- `spotify:playlist:{id}`

**Error Cases:**
- 400: Invalid URL or missing tracks
- 403: Access denied to playlist
- 500: Update error

## Common Response Codes

### Success Codes
- 200: Successful operation
- 302: Redirect (auth flow)

### Client Error Codes
- 400: Bad request (invalid input)
- 401: Unauthorized (not logged in)
- 403: Forbidden (no access)

### Server Error Codes
- 500: Internal server error
- 502: Spotify API error
- 503: Service unavailable

## Error Response Format

```json
{
  "error": "Human-readable error message"
}
```

HTML error pages for UI endpoints:
```html
<div class="error">
  ❌ Error: {message}
  <a href="/">Return to Homepage</a>
</div>
```

## Request Headers

### Required Headers (JSON endpoints)
```
Content-Type: application/json
```

### Authentication
Authentication is handled via session cookies:
```
Cookie: spotify-rec-session={session_id}
```

## CORS Configuration

Currently configured for same-origin requests only. For production:
```javascript
cors({
  origin: process.env.ALLOWED_ORIGINS,
  credentials: true
})
```

## Rate Limiting

### Current Implementation
- Manual delays in batch operations
- 100ms between track searches

### Recommended Implementation
```javascript
rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 180,             // Spotify limit
  message: "Too many requests"
})
```