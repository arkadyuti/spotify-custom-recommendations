# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `yarn start` or `yarn dev` - Start the Express server on port 3005
- `node src/index.js` - Alternative way to start the application

### Dependencies
- `yarn install` - Install dependencies (uses Yarn 1.22.22 as package manager)

### Testing & Quality
- No automated tests currently configured
- No linting or type checking configured

## Product Overview

This is **Spotify RecoEngine** - a custom recommendation engine that provides personalized music recommendations by analyzing user listening patterns on Spotify. It demonstrates custom recommendation algorithms beyond Spotify's native recommendations.

### Core User Journey
1. **Authentication**: User logs in via Spotify OAuth
2. **Data Sync**: User syncs their Spotify listening data 
3. **Track Selection**: User selects input tracks from their library
4. **Generation**: System generates recommendations using custom algorithms
5. **Playlist Creation**: User can save recommendations directly to Spotify playlists

## Architecture

### Technology Stack
- **Backend**: Node.js/Express server with server-side rendered HTML
- **Authentication**: Spotify OAuth 2.0 with express-session
- **Storage**: MongoDB database for user data, tokens, and analysis
- **Frontend**: Vanilla JavaScript with inline CSS (no framework)
- **External API**: @spotify/web-api-ts-sdk for Spotify integration

### Core Structure
- **Entry Point**: `src/index.js` - Main Express server with HTML-based UI
- **Authentication**: `src/auth.js` - Spotify OAuth flow with persistent token storage
- **API Layer**: `src/spotify-api.js` - Spotify Web API client with automatic token refresh
- **Data Collection**: `src/data-collector.js` - Gathers user listening data from Spotify
- **Storage**: `src/data-storage.js` - MongoDB storage abstraction layer
- **Recommendations**: `src/recommendation-engine.js` and `src/custom-recommender.js` - Music recommendation algorithms
- **UI**: `src/recommendations-page.js` - Generates recommendation interface

### Key Dependencies
- **@spotify/web-api-ts-sdk** - Official Spotify Web API SDK
- **express** - Web server framework
- **mongodb** - Database for user data, tokens, and analysis storage
- **dotenv** - Environment variable management
- **axios** - HTTP client for API requests

### Recommendation Algorithms
The app features two recommendation engines:

1. **Basic Engine** (`recommendation-engine.js`):
   - Uses Spotify's recommendation API with custom filtering
   - Requires user data for seed selection
   - Simple scoring based on popularity and genre matching

2. **Custom Recommender** (`custom-recommender.js`):
   - Multi-strategy approach: artist-based, genre-based, keyword-based discovery
   - **Independent mode**: Works without user data using only input tracks
   - **User-based mode**: Leverages user's listening history and preferences
   - Advanced filtering and scoring system

### Authentication Flow
The app uses Spotify OAuth 2.0 with:
- Authorization code flow for initial login
- Refresh token mechanism for session persistence
- Tokens stored in MongoDB `tokens` collection
- Automatic token refresh on API calls
- Per-user session isolation via `req.session.spotifyUserId`

### Data Storage Structure
Uses **MongoDB** with the following collections:
- `userData` - Complete user data collection (profile, top tracks/artists, recently played, saved tracks, audio features)
- `analysis` - Listening analysis and genre preferences  
- `tracks` - Formatted tracks for UI display
- `tokens` - OAuth access and refresh tokens

Each document is keyed by `userId` (Spotify user ID) for proper user isolation.

### Environment Setup
**REQUIRED** environment variables in `.env` file:
- `SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret  
- `REDIRECT_URI` - OAuth callback URL (typically ngrok URL for development)
- `SESSION_SECRET` - **REQUIRED** - Session secret for security (app will throw error if missing)
- `MONGODB_URI` - **REQUIRED** - MongoDB connection string
- `PORT` - Server port (defaults to 3005)

### Session Security
The app now enforces proper session security:
- `SESSION_SECRET` is required as environment variable (no fallback)
- Sessions configured with secure cookies in production
- 24-hour session expiry with rolling renewal
- CSRF protection via session state

### Development Workflow
1. Requires ngrok tunnel for HTTPS OAuth callback during development
2. Spotify app must be configured with matching redirect URI
3. Users must be added to Spotify app's development mode user list
4. Authentication tokens persist across server restarts

### API Endpoints
- `/` - Main dashboard with authentication status and user data summary
- `/auth/login` - Initiate Spotify OAuth flow
- `/auth/callback` - OAuth callback handler
- `/collect-data` - Sync user data from Spotify
- `/recommendations` - Generate and display recommendations
- `/api/recommendations` - REST endpoint for recommendations
- `/api/create-playlist` - Create Spotify playlist from recommendations
- `POST /api/update-playlist` - Update existing playlist by replacing all tracks
- `/logout` - Session cleanup

## Important Limitations & Considerations

### Current System Constraints
- **Development mode**: Spotify app limited to 25 registered users
- **Basic UI**: Server-side rendered HTML without modern framework
- **Synchronous processing**: Data collection and recommendation generation block requests
- **No horizontal scaling**: Single server instance only
- **Requires manual ngrok URL updates** during development

### Common Development Tasks

#### Adding New Recommendation Strategies
- Extend `custom-recommender.js` with new strategy functions
- Update strategy weights in the scoring system
- Consider both independent and user-based modes

#### Modifying Data Collection
- Update `data-collector.js` to fetch additional Spotify data
- Modify data models in storage layer accordingly
- Update UI in `recommendations-page.js` if needed

#### UI Changes
- Most UI is generated server-side in individual route handlers
- Track selection interface is in `recommendations-page.js`
- Styles are inline - consider extracting to separate CSS files

#### Debugging OAuth Issues
- Check `.env` REDIRECT_URI matches Spotify app settings exactly
- Verify user is added to Spotify app's development mode user list
- Ensure ngrok URL is HTTPS and matches redirect URI
- Verify `SESSION_SECRET` and `MONGODB_URI` are set in environment variables