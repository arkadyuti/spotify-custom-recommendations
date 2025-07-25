# Project Overview

## Introduction

Spotify RecoEngine is a custom recommendation engine that provides personalized music recommendations by analyzing user listening patterns on Spotify. It was developed as a proof of concept to demonstrate the viability of custom recommendation algorithms beyond Spotify's native recommendations.

## Core Functionality

### 1. User Authentication
- OAuth 2.0 integration with Spotify
- Secure token management with refresh capabilities
- Session persistence across server restarts

### 2. Data Collection
- Fetches user's top tracks (short, medium, and long term)
- Collects top artists across different time periods
- Retrieves recently played tracks
- Gathers saved/liked tracks
- Obtains audio features for tracks (energy, danceability, etc.)

### 3. Recommendation Generation
Two recommendation approaches:
- **User-based recommendations**: Uses collected user data to generate personalized suggestions
- **Independent recommendations**: Generates suggestions based solely on input tracks without user history

### 4. Playlist Management
- Creates new Spotify playlists with recommendations
- Updates existing playlists by replacing all tracks
- Direct integration with user's Spotify account

## User Journey

1. **Authentication**: User logs in via Spotify OAuth
2. **Data Sync**: User syncs their Spotify listening data
3. **Track Selection**: User selects input tracks from their library
4. **Generation**: System generates recommendations based on selection
5. **Playlist Update**: User can save recommendations to a Spotify playlist

## Technical Architecture

### Frontend
- Server-side rendered HTML pages
- Inline CSS for styling
- Vanilla JavaScript for interactivity
- No frontend framework (intentionally simple for POC)

### Backend
- Express.js server running on port 3005
- RESTful API endpoints
- Session management with express-session
- Spotify Web API SDK integration

### Data Storage
- **Primary**: Local file system using node-persist
- **Secondary**: MongoDB integration (partially implemented)
- Token storage for session persistence
- User data caching to reduce API calls

## Key Features

### Smart Track Selection
- Pre-selects user's recent favorites
- Categorizes tracks by time period
- Allows bulk selection/deselection
- Shows track popularity scores

### Recommendation Algorithm
- Multi-strategy approach:
  - Artist similarity matching
  - Genre-based recommendations
  - Keyword and style matching
- Filters out tracks user already knows
- Ranks by custom scoring system

### Real-time Playlist Management
- Direct playlist creation/update from the app
- Automatic track searching and matching
- Batch processing for large playlists

## Development Constraints

### Current Limitations
- Single-user session model
- Development mode (25 user limit)
- Local storage not suitable for production
- Basic UI without modern framework
- Limited error handling and recovery

### Security Considerations
- HTTPS required for OAuth (uses ngrok in development)
- Session secrets stored in environment variables
- Token encryption for storage
- CSRF protection via state parameter

## Success Metrics

The POC has demonstrated:
- Successful OAuth integration
- Reliable data collection from Spotify
- Effective recommendation generation
- Seamless playlist management
- User engagement with recommendations

## Next Steps

This POC has proven the concept viable. The next phase involves:
1. Migration to production-ready architecture
2. Enhanced UI/UX with modern frameworks
3. Scalable data storage solution
4. Advanced recommendation algorithms
5. Multi-user support
6. Performance optimization