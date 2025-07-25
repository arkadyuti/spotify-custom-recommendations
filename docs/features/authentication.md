# Authentication & OAuth Implementation

## Overview

The authentication system implements Spotify's OAuth 2.0 authorization code flow with PKCE (Proof Key for Code Exchange) for secure user authentication. It handles token management, refresh, and session persistence.

## OAuth Flow

### 1. Authorization Request
```javascript
// Route: GET /auth/login
- Generate random state for CSRF protection
- Store state in session
- Redirect to Spotify authorization URL
```

**Spotify Scopes Requested:**
- `user-read-private` - User profile access
- `user-read-email` - Email address
- `user-read-playback-state` - Current playback
- `user-modify-playback-state` - Control playback
- `user-read-currently-playing` - Now playing info
- `user-read-recently-played` - Recent listening history
- `user-top-read` - Top artists and tracks
- `playlist-read-private` - Private playlists
- `playlist-read-collaborative` - Collaborative playlists
- `playlist-modify-private` - Modify private playlists
- `playlist-modify-public` - Modify public playlists
- `user-library-read` - Saved tracks
- `streaming` - Web Playback SDK

### 2. Authorization Callback
```javascript
// Route: GET /auth/callback
- Validate state parameter (CSRF protection)
- Exchange authorization code for tokens
- Fetch user profile
- Store tokens in session and persistent storage
```

### 3. Token Storage
Tokens are stored in two locations:
1. **Session Storage**: For immediate access
2. **Persistent Storage**: For session recovery

**Token Data Structure:**
```javascript
{
  accessToken: "string",
  refreshToken: "string",
  tokenExpiry: timestamp,
  userDisplayName: "string",
  spotifyUserId: "string"
}
```

## Token Management

### Automatic Token Refresh
The system automatically refreshes expired tokens:

1. **Expiry Check**: Before each API call
2. **Buffer Time**: 5 minutes before expiration
3. **Refresh Process**:
   - Use refresh token to get new access token
   - Update session and persistent storage
   - Maintain user session continuity

### Token Validation
```javascript
async function ensureValidToken(req) {
  // Check if token exists
  // Verify expiration with 5-minute buffer
  // Refresh if needed
  // Return valid token
}
```

## Session Management

### Session Configuration
```javascript
{
  secret: process.env.SESSION_SECRET,
  name: 'spotify-rec-session',
  resave: false,
  saveUninitialized: false,
  rolling: true,  // Reset expiry on activity
  cookie: {
    secure: production only,
    httpOnly: true,
    maxAge: 24 hours,
    sameSite: 'lax' (dev) / 'none' (prod)
  }
}
```

### Session Persistence
- Sessions survive server restarts
- Tokens loaded from persistent storage
- Automatic session restoration

## Security Measures

### 1. CSRF Protection
- Random state parameter generated per request
- State validated on callback
- Prevents authorization hijacking

### 2. Token Security
- Tokens never exposed in URLs
- HTTP-only cookies prevent XSS
- Secure flag in production

### 3. Environment Security
- Secrets stored in environment variables
- No hardcoded credentials
- Client secret never exposed to frontend

## Error Handling

### Common Error Scenarios
1. **Invalid State**: CSRF attempt detected
2. **No Authorization Code**: User denied access
3. **Token Exchange Failure**: Invalid credentials
4. **Refresh Token Failure**: Token revoked

### Error Recovery
- Clear invalid sessions
- Redirect to login
- User-friendly error messages
- Logging for debugging

## Implementation Details

### Key Functions

#### `generateRandomString(length)`
Creates cryptographically secure random strings for state parameter.

#### `getAccessToken(req)`
Retrieves current access token from session.

#### `refreshAccessToken(req)`
Handles token refresh logic with error handling.

#### `clearTokens(req, res)`
Safely clears all authentication data.

#### `loadTokens(userId, req)`
Restores session from persistent storage.

### Integration Points

1. **Spotify API Module**: Uses auth tokens
2. **Data Storage**: Persists tokens
3. **Main App**: Checks authentication state
4. **All API Routes**: Validate tokens

## Development Considerations

### Local Development Setup
1. Register Spotify App
2. Configure redirect URI (ngrok URL)
3. Add test users in Spotify dashboard
4. Set environment variables

### Production Requirements
1. HTTPS required for OAuth
2. Secure session secret
3. Proper CORS configuration
4. Rate limiting implementation

## Migration Recommendations

### Current Limitations
1. Single-user session model
2. File-based token storage
3. No multi-device support
4. Limited error recovery

### Suggested Improvements
1. **JWT Implementation**: Stateless authentication
2. **Redis Sessions**: Scalable session storage
3. **OAuth Service**: Dedicated auth microservice
4. **Token Encryption**: Additional security layer
5. **Multi-factor Auth**: Enhanced security
6. **Device Management**: Track user devices