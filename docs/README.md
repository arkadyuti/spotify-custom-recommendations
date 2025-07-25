# Spotify RecoEngine Documentation

This documentation provides a comprehensive overview of Spotify RecoEngine, designed to help with migration to a new codebase with improved UI.

## Table of Contents

1. [Project Overview](./project-overview.md)
2. [Architecture & Technical Stack](./architecture.md)
3. [Features Documentation](./features/README.md)
   - [Authentication & OAuth](./features/authentication.md)
   - [Data Collection](./features/data-collection.md)
   - [Recommendation Engine](./features/recommendation-engine.md)
   - [Playlist Management](./features/playlist-management.md)
   - [User Interface](./features/user-interface.md)
4. [API Documentation](./api/README.md)
   - [REST Endpoints](./api/endpoints.md)
   - [Spotify API Integration](./api/spotify-integration.md)
5. [Data Models & Storage](./data-models.md)
6. [Setup & Configuration](./setup.md)
7. [Migration Guide](./migration-guide.md)
8. [Known Limitations & Improvements](./limitations.md)

## Quick Start

This project is a Spotify recommendation engine that:
- Authenticates users via Spotify OAuth 2.0
- Collects user listening data (top tracks, artists, recently played)
- Generates personalized music recommendations
- Manages Spotify playlists with recommended tracks

## Project Status

This was developed as a Proof of Concept (POC) and has demonstrated tangible outcomes. The next phase involves:
- Migrating to a modern tech stack
- Enhancing the user interface
- Improving scalability and performance
- Adding more sophisticated recommendation algorithms

## Key Technologies Used

- **Backend**: Node.js, Express.js
- **Authentication**: Spotify OAuth 2.0
- **Storage**: Local file system (node-persist), MongoDB (partial)
- **API**: Spotify Web API SDK
- **Frontend**: Server-side rendered HTML with inline CSS/JS

## Documentation Structure

Each section of this documentation covers specific aspects of the system:
- Feature documentation explains how each component works
- API documentation details all endpoints and integrations
- Migration guide provides recommendations for the new implementation