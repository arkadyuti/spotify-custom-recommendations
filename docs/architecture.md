# Architecture & Technical Stack

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Browser   │────▶│  Express Server │────▶│  Spotify API    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Local Storage  │
                        │  (node-persist) │
                        └─────────────────┘
```

## Technology Stack

### Backend Technologies

#### Core Framework
- **Node.js**: JavaScript runtime
- **Express.js v4**: Web application framework
- **JavaScript**: ES6+ features, CommonJS modules

#### Authentication & Security
- **express-session**: Session management
- **crypto**: Token generation and security
- **dotenv**: Environment variable management

#### Data Storage
- **node-persist**: Primary storage (file-based)
- **MongoDB**: Secondary storage (partially implemented)
- File structure: `./data/` directory

#### External Integrations
- **@spotify/web-api-ts-sdk**: Official Spotify SDK
- **axios**: HTTP client for API requests

### Frontend Technologies

#### Rendering
- **Server-side rendering**: HTML generated on server
- **No frontend framework**: Vanilla JavaScript
- **Inline styles and scripts**: Simplified deployment

#### UI Components
- Custom HTML/CSS components
- Responsive grid layouts
- Interactive track selection
- Real-time form updates

## Application Structure

### Directory Layout
```
spotify-custom-recommendations/
├── src/
│   ├── index.js                 # Main server entry point
│   ├── auth.js                  # OAuth & authentication
│   ├── spotify-api.js           # Spotify API wrapper
│   ├── data-collector.js        # User data collection
│   ├── data-storage.js          # Storage abstraction
│   ├── recommendation-engine.js # Original algorithm
│   ├── custom-recommender.js    # Enhanced algorithm
│   ├── recommendations-page.js  # UI generation
│   └── mongodb-client.js        # Database connection
├── data/                        # Local storage directory
│   ├── tokens/                  # OAuth tokens
│   ├── users/                   # User data cache
│   └── analysis/                # Analysis results
├── .env                         # Environment config
└── package.json                 # Dependencies
```

### Core Modules

#### 1. Authentication Module (`auth.js`)
- OAuth 2.0 flow implementation
- Token management (access & refresh)
- Session handling
- User identification

#### 2. API Wrapper (`spotify-api.js`)
- Spotify SDK initialization
- Automatic token refresh
- Error handling
- Rate limiting consideration

#### 3. Data Collection (`data-collector.js`)
- Batch data fetching
- Data transformation
- Caching logic
- Analysis generation

#### 4. Storage Layer (`data-storage.js`)
- Abstraction over node-persist
- User data management
- Token persistence
- Analysis storage

#### 5. Recommendation Engines
- **recommendation-engine.js**: Basic algorithm
- **custom-recommender.js**: Advanced multi-strategy

#### 6. UI Generation (`recommendations-page.js`)
- Dynamic HTML generation
- Track selection interface
- Results display
- Playlist management UI

## Data Flow

### Authentication Flow
1. User initiates login
2. Redirect to Spotify OAuth
3. Callback with authorization code
4. Exchange for access/refresh tokens
5. Store tokens in session and persist

### Data Collection Flow
1. Check for cached data
2. Fetch from Spotify if needed
3. Transform and normalize data
4. Store in local persistence
5. Generate analysis

### Recommendation Flow
1. User selects input tracks
2. Apply recommendation strategies
3. Filter and rank results
4. Return formatted recommendations
5. Enable playlist creation/update

## API Design

### RESTful Endpoints
- `GET /` - Main dashboard
- `GET /auth/login` - OAuth initiation
- `GET /auth/callback` - OAuth callback
- `GET /collect-data` - Data synchronization
- `GET /recommendations` - UI page
- `POST /api/recommendations` - Generate recommendations
- `POST /api/create-playlist` - Create playlist
- `POST /api/update-playlist` - Update playlist
- `GET /logout` - Session cleanup

### Response Formats
- HTML pages for UI endpoints
- JSON for API endpoints
- Consistent error handling

## Security Architecture

### Authentication Security
- State parameter for CSRF protection
- Secure session configuration
- Token encryption in storage
- Automatic token refresh

### Session Management
- HTTP-only cookies
- Secure flag in production
- Session secret from environment
- 24-hour expiration

### Data Protection
- No sensitive data in logs
- Environment-based configuration
- Scoped Spotify permissions
- User data isolation

## Performance Considerations

### Caching Strategy
- User data cached locally
- 24-hour cache validity
- Force refresh option
- Minimal API calls

### Optimization Techniques
- Batch API requests
- Parallel processing where possible
- Efficient data structures
- Lazy loading of data

## Scalability Limitations

### Current Constraints
1. **Single-server architecture**: No horizontal scaling
2. **File-based storage**: Not suitable for multiple instances
3. **In-memory sessions**: Lost on restart without persistence
4. **Sequential processing**: Some operations could be parallelized
5. **No caching layer**: Direct file system access

### Future Architecture Needs
1. **Microservices**: Separate auth, data, and recommendation services
2. **Database**: PostgreSQL or MongoDB for data
3. **Cache layer**: Redis for sessions and data
4. **Queue system**: For background processing
5. **CDN**: For static assets
6. **Load balancer**: For multiple instances