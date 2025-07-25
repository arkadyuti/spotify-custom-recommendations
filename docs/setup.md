# Setup & Configuration

## Prerequisites

### System Requirements
- **Node.js**: v16+ (LTS recommended)
- **npm/yarn**: Latest version
- **Git**: For cloning repository
- **Spotify Account**: Premium recommended

### Development Tools
- **ngrok**: For HTTPS tunneling (required for OAuth)
- **Code Editor**: VS Code recommended
- **Terminal**: For running commands

## Initial Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd spotify-custom-recommendations
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Using yarn
yarn install
```

### 3. Spotify App Registration

#### Create Spotify App
1. Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in app details:
   - **App Name**: "Your App Name"
   - **App Description**: "Custom music recommendations"
   - **Website**: Your website or localhost
   - **Redirect URIs**: Will be set later
4. Accept terms and create app
5. Note your **Client ID** and **Client Secret**

#### Configure App Settings
1. Go to app settings
2. Add redirect URI: `https://your-ngrok-url.ngrok.io/auth/callback`
3. Add users to development mode (quota: 25 users)

### 4. Environment Configuration

#### Create .env File
```bash
cp .env.example .env
```

#### Configure Environment Variables
```bash
# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here

# OAuth Configuration
REDIRECT_URI=https://your-ngrok-url.ngrok.io/auth/callback

# Server Configuration
PORT=3005
NODE_ENV=development

# Session Security
SESSION_SECRET=your_super_secret_session_key_minimum_32_characters

# Optional: MongoDB (if using)
MONGODB_URI=mongodb://localhost:27017/spotify-recommendations
```

#### Generate Session Secret
```bash
# Generate a secure session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. HTTPS Setup (ngrok)

#### Install ngrok
```bash
# Via npm
npm install -g ngrok

# Via download from https://ngrok.com/download
```

#### Start ngrok Tunnel
```bash
# In a separate terminal
ngrok http 3005
```

#### Update Configuration
1. Copy the HTTPS URL from ngrok output
2. Update `REDIRECT_URI` in `.env`
3. Update redirect URI in Spotify app settings

## Development Workflow

### 1. Start the Application
```bash
# Start the server
npm start
# or
yarn start
# or
node src/index.js
```

### 2. Access the Application
1. Open browser to ngrok HTTPS URL
2. Click "Login with Spotify"
3. Authorize the application
4. Start using features

### 3. Development Process
```bash
# Terminal 1: ngrok tunnel
ngrok http 3005

# Terminal 2: application server
npm run dev  # or npm start

# Terminal 3: development commands
# File watching, testing, etc.
```

## Configuration Details

### Session Configuration
```javascript
// Session settings in src/index.js
{
  secret: process.env.SESSION_SECRET,
  name: 'spotify-rec-session',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}
```

### Spotify OAuth Scopes
The application requests these permissions:
```javascript
const scopes = [
  'user-read-private',         // Basic profile
  'user-read-email',          // Email address
  'user-read-playback-state', // Current playback
  'user-modify-playback-state', // Control playback
  'user-read-currently-playing', // Now playing
  'user-read-recently-played', // Recent history
  'user-top-read',            // Top tracks/artists
  'playlist-read-private',    // Private playlists
  'playlist-read-collaborative', // Collaborative playlists
  'playlist-modify-private',  // Modify private playlists
  'playlist-modify-public',   // Modify public playlists
  'user-library-read',        // Saved tracks
  'streaming'                 // Web Playback SDK
];
```

### Data Storage Paths
```
./data/
├── users/           # User data cache
├── tokens/          # OAuth tokens
└── analysis/        # Analysis results
```

## Troubleshooting

### Common Issues

#### 1. "Session not available" Error
- **Cause**: Missing SESSION_SECRET
- **Solution**: Set SESSION_SECRET in .env file

#### 2. OAuth Redirect Mismatch
- **Cause**: Redirect URI doesn't match Spotify app
- **Solution**: Update Spotify app settings with exact ngrok URL

#### 3. "User not registered" Error
- **Cause**: User not in Spotify app's development mode
- **Solution**: Add user email in Spotify app settings

#### 4. Token Refresh Failures
- **Cause**: Invalid refresh token or client secret
- **Solution**: Re-authenticate user, check credentials

#### 5. API Rate Limiting
- **Cause**: Too many requests to Spotify
- **Solution**: Wait and retry, check request patterns

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start

# Or set in .env
DEBUG=spotify:*
```

### Testing Authentication
Visit `/test-auth` endpoint to verify:
- Token validity
- API connectivity
- User profile access

## Production Deployment

### Environment Preparation
```bash
# Production environment variables
NODE_ENV=production
REDIRECT_URI=https://yourdomain.com/auth/callback
SESSION_SECRET=production_secret_here

# Security headers
SECURE_COOKIES=true
CORS_ORIGIN=https://yourdomain.com
```

### Server Configuration
```javascript
// Production-specific settings
app.use(helmet()); // Security headers
app.use(compression()); // Response compression
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // requests per window
}));
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] HTTPS certificate valid
- [ ] Spotify app redirect URI updated
- [ ] Session secret generated
- [ ] Database connection tested
- [ ] Error monitoring enabled
- [ ] Backup strategy implemented

## Development Best Practices

### Code Organization
```
src/
├── index.js           # Main server file
├── auth.js           # Authentication logic
├── spotify-api.js    # Spotify integration
├── data-collector.js # Data collection
├── recommendation-engine.js
├── custom-recommender.js
└── recommendations-page.js
```

### Git Workflow
```bash
# Never commit .env files
echo ".env" >> .gitignore

# Create feature branches
git checkout -b feature/new-algorithm

# Regular commits
git commit -m "feat: add genre-based recommendations"
```

### Testing Strategy
```bash
# Manual testing endpoints
curl -X GET http://localhost:3005/test-auth

# Check data collection
curl -X GET http://localhost:3005/collect-data?refresh=true
```

## Next Steps

After setup:
1. Test authentication flow
2. Collect sample data
3. Generate recommendations
4. Create test playlist
5. Review application logs
6. Plan feature enhancements