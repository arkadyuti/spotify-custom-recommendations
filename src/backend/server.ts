import express, { Request, Response, RequestHandler } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// import cors from 'cors'; // No longer needed - serving from same origin

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes and services
import authRouter from './routes/auth.js';
import apiRouter from './routes/api.js';
import { SpotifyAPI } from './spotify-api.js';
import { DataCollectorService } from './data-collector.js';
import { StorageService } from './database/storage.js';
import { MongoDBClient } from './database/mongodb.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Validate critical environment variables
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required. Please add it to your .env file.');
}

if (!process.env.MONGODB_URI) {
  console.warn('⚠️  MONGODB_URI not found in .env file. Database features will not work.');
}

// Use SESSION_SECRET from environment
const SESSION_SECRET = process.env.SESSION_SECRET;

// Log session secret info for debugging
console.log('Session configuration:', {
  hasEnvSecret: !!process.env.SESSION_SECRET,
  secretLength: SESSION_SECRET.length,
  nodeEnv: process.env.NODE_ENV,
  usingMongoStore: !!process.env.MONGODB_URI
});

// No CORS needed - serving frontend and API from same origin

// Session configuration with MongoDB store
app.use(session({
  secret: SESSION_SECRET,
  name: 'spotify-rec-session',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || '',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours in seconds
    autoRemove: 'native', // Let MongoDB handle cleanup
    touchAfter: 24 * 3600 // Lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const
  }
}) as unknown as RequestHandler);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (React build)
app.use(express.static(path.join(__dirname, '../../dist')));

// Routes
app.use('/auth', authRouter);
app.use('/api', apiRouter);

// Helper functions
function getAccessToken(req: Request): string | null {
  return (req.session as any)?.accessToken || null;
}

function getUserId(req: Request): string | null {
  return (req.session as any)?.spotifyUserId || null;
}

// Initialize services
const dataCollector = new DataCollectorService();
const storage = new StorageService();

// API info endpoint
app.get('/api', async (req: Request, res: Response) => {
  const isAuthenticated = !!getAccessToken(req);
  const userId = getUserId(req);
  
  // Get data summary for authenticated users
  let dataSummary = null;
  
  if (isAuthenticated && userId) {
    try {
      dataSummary = await storage.getDataSummary(userId);
    } catch (error) {
      console.error('Error fetching data summary:', error);
    }
  }
  
  res.json({
    message: 'Spotify RecoEngine API',
    version: '1.0.0',
    authentication: {
      isAuthenticated,
      userId: userId || null
    },
    dataSummary,
    endpoints: {
      auth: {
        login: '/auth/login',
        callback: '/auth/callback',
        logout: '/auth/logout'
      },
      api: {
        collectData: '/api/collect-data',
        recommendations: '/api/recommendations',
        userBasedRecommendations: '/api/recommendations/user-based',
        createPlaylist: '/api/create-playlist',
        updatePlaylist: '/api/update-playlist',
        testAuth: '/api/test-auth',
        userSummary: '/api/user-summary'
      }
    }
  });
});

// Data collection route (web interface)
app.get('/collect-data', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Not Authenticated</h2>
            <p>Please login with Spotify first.</p>
            <a href="/auth/login" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Login with Spotify</a>
          </body>
        </html>
      `);
    }

    const forceRefresh = req.query.refresh === 'true';
    const data = await dataCollector.collectUserData(req, forceRefresh);
    
    // Also save analysis data
    const analysis = dataCollector.analyzeListeningPatterns();
    await storage.saveAnalysis(userId, analysis);
    
    // Prepare tracks data for storage
    const tracksData = {
      'Top Tracks - Short Term': data.topTracks.short_term?.map(track => ({
        name: track.name,
        artist: track.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: track.album?.name || 'Unknown',
        duration: Math.round(track.duration_ms / 1000 / 60 * 100) / 100,
        popularity: track.popularity,
        external_url: track.external_urls?.spotify
      })) || [],
      'Top Tracks - Medium Term': data.topTracks.medium_term?.map(track => ({
        name: track.name,
        artist: track.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: track.album?.name || 'Unknown',
        duration: Math.round(track.duration_ms / 1000 / 60 * 100) / 100,
        popularity: track.popularity,
        external_url: track.external_urls?.spotify
      })) || [],
      'Recently Played': data.recentlyPlayed?.map(item => ({
        name: item.track.name,
        artist: item.track.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: item.track.album?.name || 'Unknown',
        played_at: item.played_at,
        duration: Math.round(item.track.duration_ms / 1000 / 60 * 100) / 100,
        external_url: item.track.external_urls?.spotify
      })) || [],
      'Saved Tracks': data.savedTracks?.map(item => ({
        name: item.track.name,
        artist: item.track.artists?.map(a => a.name).join(', ') || 'Unknown',
        album: item.track.album?.name || 'Unknown',
        added_at: item.added_at,
        duration: Math.round(item.track.duration_ms / 1000 / 60 * 100) / 100,
        external_url: item.track.external_urls?.spotify
      })) || []
    };
    
    await storage.saveTracks(userId, tracksData);
    
    // Success response
    res.send(`
      <html>
        <head>
          <title>Data Collection Complete</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; margin: 20px auto; max-width: 500px; }
            .action-btn { 
              display: inline-block; 
              background: #1db954; 
              color: white; 
              text-decoration: none; 
              padding: 12px 24px; 
              margin: 10px; 
              border-radius: 25px; 
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>✅ Data Collection Complete!</h2>
            <p><strong>Profile:</strong> ${data.profile?.display_name || 'Unknown'}</p>
            <p><strong>Top Tracks:</strong> ${Object.values(data.topTracks).flat().length}</p>
            <p><strong>Top Artists:</strong> ${Object.values(data.topArtists).flat().length}</p>
            <p><strong>Recently Played:</strong> ${data.recentlyPlayed.length}</p>
            <p><strong>Saved Tracks:</strong> ${data.savedTracks.length}</p>
            <p><strong>Audio Features:</strong> ${data.audioFeatures ? data.audioFeatures.size : 0}</p>
            
            <p>Your data has been saved successfully!</p>
          </div>
          
          <a href="/" class="action-btn">🏠 Return to API Info</a>
          <a href="/auth/logout" class="action-btn">🚪 Logout</a>
          
          <script>
            // Auto redirect after 5 seconds
            setTimeout(() => {
              window.location.href = '/';
            }, 5000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Error collecting data</h2>
          <p>${(error as Error).message}</p>
          <a href="/" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Return to API Info</a>
        </body>
      </html>
    `);
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Catch-all for React routing (SPA)
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Server startup function
async function startServer() {
  // Test MongoDB connection if URI is provided
  if (process.env.MONGODB_URI) {
    try {
      const mongoClient = new MongoDBClient();
      await mongoClient.connect();
      console.log('✅ MongoDB connected successfully!');
    } catch (error) {
      console.error('⚠️  MongoDB connection failed:', (error as Error).message);
      console.log('Server will continue without database functionality.');
    }
  }
  
  // Start Express server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Sessions: MongoDB persistent store enabled`);
    console.log(`\n🎵 Spotify RecoEngine Backend`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  GET  /               - API info and status`);
    console.log(`  GET  /health         - Health check`);
    console.log(`  GET  /auth/login     - Start Spotify OAuth`);
    console.log(`  GET  /auth/callback  - OAuth callback`);
    console.log(`  GET  /auth/logout    - Logout`);
    console.log(`  GET  /collect-data   - Collect user data (web)`);
    console.log(`  GET  /api/collect-data    - Collect user data (API)`);
    console.log(`  POST /api/recommendations - Get recommendations`);
    console.log(`  POST /api/create-playlist - Create Spotify playlist`);
    console.log(`  POST /api/update-playlist - Update existing playlist`);
    
    if (!process.env.SPOTIFY_CLIENT_ID) {
      console.log(`\n⚠️  Setup required:`);
      console.log(`  1. Create a Spotify app at https://developer.spotify.com/dashboard`);
      console.log(`  2. Copy .env.example to .env and add your credentials`);
      console.log(`  3. Add redirect URI: ${process.env.REDIRECT_URI || 'your-redirect-url/auth/callback'}`);
    }
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(console.error);
}

export default app;