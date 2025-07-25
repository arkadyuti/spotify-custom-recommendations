# API Documentation

## Overview

The Spotify Custom Recommendations application exposes several REST API endpoints for authentication, data collection, recommendation generation, and playlist management.

## Documentation Structure

### 1. [REST Endpoints](./endpoints.md)
Complete documentation of all HTTP endpoints including:
- Request/response formats
- Authentication requirements
- Error handling
- Usage examples

### 2. [Spotify API Integration](./spotify-integration.md)
Details about Spotify Web API usage:
- SDK implementation
- API endpoints used
- Rate limiting
- Error handling

## API Categories

### Authentication APIs
- OAuth flow initiation
- Callback handling
- Token management
- Session endpoints

### Data APIs
- User data collection
- Profile information
- Analysis results
- Cache management

### Recommendation APIs
- Generate recommendations
- Input validation
- Response formats
- Algorithm selection

### Playlist APIs
- Create new playlists
- Update existing playlists
- Track matching
- Error handling

## Base URL

Development: `http://localhost:3005`
Production: `https://your-domain.com`

## Authentication

Most endpoints require an active Spotify session. Authentication state is managed via cookies and server-side sessions.

## Response Formats

### Success Response
```json
{
  "status": "success",
  "data": {...},
  "metadata": {...}
}
```

### Error Response
```json
{
  "status": "error",
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

The application implements rate limiting to comply with Spotify's API limits:
- 180 requests per minute for most endpoints
- Built-in delays for batch operations
- Automatic retry with exponential backoff

## API Versioning

Currently, the API is unversioned (v0). Future versions will implement versioning:
- URL path versioning: `/api/v1/...`
- Header versioning support
- Backward compatibility