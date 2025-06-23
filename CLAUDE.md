# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `yarn start` or `yarn dev` - Start the Express server on port 3005
- `node src/index.js` - Alternative way to start the application

### Dependencies
- `yarn install` - Install dependencies (uses Yarn 4.4.1 as package manager)

## Architecture

This is a Node.js/Express web application that provides a Spotify recommendation engine with OAuth authentication.

### Core Structure
- **Entry Point**: `src/index.js` - Main Express server with HTML-based UI
- **Authentication**: `src/auth.js` - Spotify OAuth flow with persistent token storage
- **API Layer**: `src/spotify-api.js` - Spotify Web API client with automatic token refresh
- **Data Collection**: `src/data-collector.js` - Gathers user listening data from Spotify
- **Storage**: `src/data-storage.js` - Persistent local data storage using node-persist
- **Recommendations**: `src/recommendation-engine.js` and `src/custom-recommender.js` - Music recommendation algorithms
- **UI**: `src/recommendations-page.js` - Generates recommendation interface

### Key Dependencies
- **@spotify/web-api-ts-sdk** - Official Spotify Web API SDK
- **express** - Web server framework
- **node-persist** - Local file-based storage for tokens and user data
- **dotenv** - Environment variable management
- **axios** - HTTP client for API requests

### Authentication Flow
The app uses Spotify OAuth 2.0 with:
- Authorization code flow for initial login
- Refresh token mechanism for session persistence
- Tokens stored locally in `./data/tokens/` directory
- Automatic token refresh on API calls

### Data Architecture
- User data collected includes: top tracks/artists, recently played, saved tracks, audio features
- Data stored locally using node-persist in `./data/` directory
- Analysis data includes listening patterns and genre preferences

### Environment Setup
Requires `.env` file with:
- `SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret  
- `REDIRECT_URI` - OAuth callback URL (typically ngrok URL for development)
- `PORT` - Server port (defaults to 3005)

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

### Limitations
- Development mode restricts to 25 registered users
- Local file storage (not production-ready)
- Single-user session model
- Requires manual ngrok URL updates during development