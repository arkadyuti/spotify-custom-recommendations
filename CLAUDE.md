# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `yarn dev` - Start the Express server (serves React app + API)
- `yarn build` - Build both frontend (esbuild) and backend (TypeScript)
- `yarn start` - Start production server from built files
- `yarn lint` - Run ESLint for code linting

### Dependencies
- `yarn install` - Install dependencies (uses Yarn as package manager)

## Product Overview

**Spotify RecoEngine** - AI-powered music discovery platform with modern React frontend and integrated Express backend. Analyzes Spotify listening history to generate personalized recommendations using custom multi-strategy algorithms.

## Architecture

### Single Server Architecture
- **Frontend**: React 18 + TypeScript + esbuild
- **Backend**: Express + TypeScript + MongoDB
- **Integration**: Single server serving both static files and API endpoints on port 3005
- **Database**: MongoDB for user data, tokens, and analytics persistence

### Backend Structure (`src/backend/`)
```
src/backend/
├── auth.ts                 # OAuth 2.0 + session management
├── spotify-api.ts          # Spotify Web API client
├── data-collector.ts       # User data collection with lean transformation
├── data-transformer.ts     # 90%+ storage reduction
├── database/
│   ├── mongodb.ts          # MongoDB connection
│   └── storage.ts          # Data persistence layer
├── engines/
│   ├── basic.ts            # Basic recommendation engine
│   └── custom.ts           # Multi-strategy engine (CRITICAL)
├── routes/
│   ├── auth.ts             # Authentication routes
│   └── api.ts              # API routes for recommendations
└── server.ts               # Express server setup
```

### Frontend Structure (`src/`)
- **Components**: Modern React with shadcn/ui components
- **State Management**: React Query for server state
- **API Integration**: Real backend integration with AuthContext
- **Services**: Complete API client for backend communication

## Core Algorithms (CRITICAL)

### Multi-Strategy Recommendation System
1. **Artist-based discovery** (40% weight user mode, 50% independent)
2. **Genre-based discovery** (30% weight, user mode only)
3. **Keyword-based discovery** (30% weight user mode, 50% independent)

### Dual Modes
- **Independent**: Works with only input tracks (no user data required)
- **User-based**: Leverages full user listening history and preferences

### Advanced Features
- Smart filtering and deduplication
- Custom scoring with randomness factor
- Session persistence with MongoDB
- 90%+ storage reduction through lean data transformation

## Environment Configuration

```bash
# Backend (Express)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=your_ngrok_url/auth/callback
SESSION_SECRET=your_secure_session_secret
MONGODB_URI=mongodb://localhost:27017/spotify-recoengine
PORT=3005
NODE_ENV=development
```

## API Endpoints

- `/auth/login` - Initiate Spotify OAuth flow
- `/auth/callback` - OAuth callback handler
- `/api/collect-data` - User data synchronization
- `/api/recommendations` - Independent recommendations engine
- `/api/recommendations/user-based` - User preference integration
- `/api/create-playlist` - Create Spotify playlist from recommendations
- `/api/update-playlist` - Update existing playlist
- `/api/user-tracks` - Get user tracks for selection
