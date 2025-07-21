# Spotify Recommendation Engine - Setup Guide

This document outlines all the setup requirements and assumptions for running the Spotify Recommendation Engine locally.

## Prerequisites

### 1. Node.js & Yarn
- Node.js (v18 or higher)
- Yarn package manager
- Command: `yarn --version` to verify

### 2. Spotify Developer Account
- Create account at https://developer.spotify.com/dashboard
- Spotify Premium account (required for playback control features)

### 3. ngrok (for HTTPS tunneling)
- Install: `brew install ngrok` (macOS) or download from https://ngrok.com/
- Purpose: Creates secure HTTPS tunnel to localhost for Spotify OAuth
- Alternative: Use production domain if available

## Spotify App Configuration

### 1. Create Spotify App
1. Go to https://developer.spotify.com/dashboard
2. Click "Create App"
3. Fill in app details:
    - App name: "Custom Recommendation Engine"
    - App description: "Personal music recommendation system"
    - Website: `https://your-ngrok-url.ngrok.io`
    - Redirect URI: `https://your-ngrok-url.ngrok.io/auth/callback`

### 2. Development Mode Limitations
**IMPORTANT**: Spotify apps start in "Development Mode" with these restrictions:
- Limited to 25 users
- Only registered users can access the app
- Full API access requires quota extension approval

### 3. Add Yourself as User (Required)
1. In your app dashboard → Settings
2. Scroll to "Users and Access"
3. Click "Add New User"
4. Enter your Spotify account email
5. Save changes
6. **Must re-authenticate after adding user**

### 4. Required Scopes
Ensure these scopes are available (automatically included in our auth flow):
- `user-read-private` - Basic profile access
- `user-read-email` - Email access
- `user-read-playback-state` - Current playback info
- `user-modify-playback-state` - Control playback
- `user-read-currently-playing` - Current track
- `user-read-recently-played` - Recent listening history
- `user-top-read` - Top tracks and artists
- `playlist-read-private` - Private playlists
- `playlist-read-collaborative` - Collaborative playlists
- `user-library-read` - Saved tracks
- `streaming` - Web playback SDK

## Environment Setup

### 1. ngrok Setup
```bash
# Install ngrok
brew install ngrok

# Start your local server first
yarn start

# In another terminal, create tunnel
ngrok http 3005

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### 2. Environment Variables
Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Update `.env` with your values:
```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=https://your-ngrok-url.ngrok.io/auth/callback
PORT=3005
```

### 3. Spotify App Settings Update
After getting ngrok URL, update your Spotify app:
1. Dashboard → Your App → Settings
2. Edit Settings
3. Update Redirect URIs to match your ngrok URL
4. Save changes

## Development Workflow

### 1. Start Development Session
```bash
# Terminal 1: Start the app
yarn start

# Terminal 2: Start ngrok tunnel
ngrok http 3005

# Copy the HTTPS ngrok URL
# Update .env with the new ngrok URL
# Update Spotify app redirect URI
# Restart the app
```

### 2. Authentication Flow
1. Visit your ngrok URL in browser
2. Click "Login with Spotify"
3. Authorize the app
4. Should see "Authentication successful!"
5. Return to main page to see authenticated options

### 3. Testing
1. Click "Test Authentication" to verify basic access
2. Click "Collect My Data" to gather listening history
3. Click "View Analysis" to see music taste profile

## Common Issues & Solutions

### 1. "INVALID_CLIENT: Invalid redirect URI"
- **Cause**: Mismatch between .env REDIRECT_URI and Spotify app settings
- **Solution**: Ensure exact match including protocol (https://)

### 2. "403 Forbidden" API Errors
- **Cause**: User not added to development app
- **Solution**: Add your email in Spotify app → Users and Access

### 3. ngrok URL Changes
- **Problem**: ngrok generates new URL each restart (free tier)
- **Solution**: Update both `.env` and Spotify app settings with new URL
- **Alternative**: Use ngrok paid plan for consistent domains

### 4. Token Expiration
- **Problem**: Access tokens expire after 1 hour
- **Solution**: App includes automatic refresh token logic

## Production Considerations

### 1. Domain Setup
- Replace ngrok with actual domain
- Update Spotify app settings with production URLs
- Use environment-specific .env files

### 2. Quota Extension
- Submit request in Spotify dashboard for production use
- Required for >25 users
- Include detailed use case description

### 3. Security
- Never commit .env files
- Use secure token storage in production
- Implement proper session management

## Current Limitations

1. **Development Mode**: Limited to registered users only
2. **ngrok Dependency**: Free tier generates new URLs frequently
3. **Single User Session**: No persistent user sessions across restarts
4. **Local Storage**: User data not persisted between sessions
5. **Rate Limits**: Spotify API has rate limiting (not yet handled)

## Next Steps for Production

1. Request Spotify quota extension
2. Set up production domain/hosting
3. Implement database for user data persistence
4. Add proper session management
5. Handle API rate limiting
6. Add error handling and logging
7. Create proper UI/UX instead of basic HTML links

## TODO - Production Security

### ⚠️ IMPORTANT: Session Secret Configuration
**Current Status**: Using hardcoded SESSION_SECRET for beta testing
**Production Requirement**: Must set SESSION_SECRET as environment variable

#### What to do before production:
1. **Generate a secure session secret**:
   ```bash
   # Method 1: Node.js
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Method 2: OpenSSL
   openssl rand -hex 64
   ```

2. **Set as environment variable**:
   ```bash
   # Production server
   export SESSION_SECRET=your-generated-secret-here
   
   # Or in your .env file
   echo "SESSION_SECRET=your-generated-secret-here" >> .env
   ```

3. **Update deployment configuration**:
   - Add SESSION_SECRET to your hosting platform (Heroku, AWS, etc.)
   - Add to Docker environment variables
   - Add to CI/CD pipeline secrets

#### Why this is critical:
- **Security**: Prevents session hijacking and CSRF attacks
- **OAuth**: Required for state parameter validation (prevents auth bypass)
- **Session persistence**: Users stay logged in across server restarts
- **Production compliance**: Required for any production authentication system

#### Current beta implementation:
- File: `src/index.js:22`
- Build-time generated secret: `crypto.randomBytes(64).toString('hex')`
- **Generates a new random secret on each server startup**
- **For production: Set SESSION_SECRET environment variable to persist sessions across restarts**

---

**Note**: This setup is optimized for local development and testing. Production deployment requires additional security and infrastructure considerations.
