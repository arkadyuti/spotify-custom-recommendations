// Authentication system - migrated from spotify-custom-recommendations/src/auth.js
// OAuth 2.0 flow, token management, and session handling

import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { DataStorageService } from './database/storage.js';

// Extend the Request type to include session properties
declare module 'express-session' {
  interface SessionData {
    authState?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: number;
    spotifyUserId?: string;
    userDisplayName?: string;
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  userDisplayName: string;
  spotifyUserId: string;
}

const router = express.Router();

const scopes = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-library-read',
  'streaming'
].join(' ');

const generateRandomString = (length: number): string => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

router.get('/login', async (req: Request, res: Response) => {
  const state = generateRandomString(16);
  
  // Ensure session exists before storing state
  if (!req.session) {
    return res.status(500).send('Session not available. Please refresh and try again.');
  }
  
  // Store state in session for validation
  req.session.authState = state;
  
  console.log('Login initiated:', {
    state,
    sessionId: req.sessionID,
    hasSession: !!req.session,
    sessionSaved: !!req.session.authState
  });
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID || '',
    scope: scopes,
    redirect_uri: process.env.REDIRECT_URI || '',
    state: state
  });
  
  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log('Auth URL:', authUrl);
  
  res.redirect(authUrl);
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.status(400).send(`Authorization error: ${error}`);
  }
  
  if (!code) {
    return res.status(400).send('No authorization code provided');
  }
  
  // Validate state parameter
  console.log('State validation:', {
    receivedState: state,
    sessionState: req.session.authState,
    sessionId: req.sessionID,
    hasSession: !!req.session
  });
  
  if (state !== req.session.authState) {
    console.error('State mismatch detected:', {
      received: state,
      expected: req.session.authState,
      sessionKeys: req.session ? Object.keys(req.session) : 'no session'
    });
    return res.status(400).send('State mismatch - possible CSRF attack');
  }
  
  // Clear the state from session
  delete req.session.authState;

  try {
    const authString = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.REDIRECT_URI || ''
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }
    
    // Store tokens in session
    req.session.accessToken = tokenData.access_token;
    req.session.refreshToken = tokenData.refresh_token;
    req.session.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
    
    // Get user profile to store user ID
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      req.session.spotifyUserId = profile.id;
      req.session.userDisplayName = profile.display_name;
      console.log(`✅ User ${profile.display_name} (${profile.id}) authenticated successfully`);
      
      // Save tokens to MongoDB for persistence
      const dataStorage = new DataStorageService();
      await dataStorage.saveTokens(profile.id, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiry: req.session.tokenExpiry,
        userDisplayName: profile.display_name,
        spotifyUserId: profile.id
      });
    }
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authentication Successful - Spotify RecoEngine</title>
          <style>
            :root {
              --background: 0 0% 100%;
              --foreground: 0 0% 9%;
              --primary: 141 73% 42%;
              --primary-foreground: 0 0% 100%;
              --card: 0 0% 100%;
              --card-foreground: 0 0% 9%;
              --muted-foreground: 215 16% 47%;
              --shadow-card: 0 4px 20px -4px hsl(0 0% 0% / 0.1);
              --radius: 0.75rem;
            }
            
            @media (prefers-color-scheme: dark) {
              :root {
                --background: 0 0% 7%;
                --foreground: 0 0% 95%;
                --card: 0 0% 9%;
                --card-foreground: 0 0% 95%;
                --muted-foreground: 217.9 10.6% 64.9%;
              }
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              background-color: hsl(var(--background));
              color: hsl(var(--foreground));
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 1rem;
            }
            
            .container {
              max-width: 28rem;
              width: 100%;
            }
            
            .card {
              background-color: hsl(var(--card));
              color: hsl(var(--card-foreground));
              border-radius: var(--radius);
              padding: 2rem;
              text-align: center;
              box-shadow: var(--shadow-card);
              border: 1px solid hsl(214 32% 91%);
            }
            
            .icon {
              width: 4rem;
              height: 4rem;
              margin: 0 auto 1.5rem;
              background-color: hsl(var(--primary));
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
            }
            
            h1 {
              font-size: 1.5rem;
              font-weight: 700;
              margin-bottom: 0.5rem;
              color: hsl(var(--foreground));
            }
            
            .welcome {
              font-size: 1rem;
              color: hsl(var(--muted-foreground));
              margin-bottom: 1rem;
            }
            
            .redirect-info {
              font-size: 0.875rem;
              color: hsl(var(--muted-foreground));
              margin-bottom: 1.5rem;
            }
            
            .progress-bar {
              width: 100%;
              height: 0.25rem;
              background-color: hsl(214 32% 91%);
              border-radius: 0.125rem;
              overflow: hidden;
            }
            
            .progress-fill {
              height: 100%;
              background-color: hsl(var(--primary));
              width: 0%;
              animation: progress 2s ease-in-out forwards;
            }
            
            @keyframes progress {
              to {
                width: 100%;
              }
            }
            
            .fade-in {
              animation: fadeIn 0.5s ease-in;
            }
            
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(1rem);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          </style>
        </head>
        <body>
          <div class="container fade-in">
            <div class="card">
              <div class="icon">✅</div>
              <h1>Authentication successful!</h1>
              <p class="welcome">Welcome${req.session.userDisplayName ? `, ${req.session.userDisplayName}` : ''}!</p>
              <p class="redirect-info">Redirecting to home page...</p>
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(500).send('Authentication failed: ' + error.message);
  }
});

// Helper functions to get tokens from session
export function getAccessToken(req: Request): string | null {
  return req.session?.accessToken || null;
}

export function getRefreshToken(req: Request): string | null {
  return req.session?.refreshToken || null;
}

export function getUserId(req: Request): string | null {
  return req.session?.spotifyUserId || null;
}

export async function refreshAccessToken(req: Request): Promise<string> {
  const refreshToken = getRefreshToken(req);
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const authString = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authString}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    // If refresh fails, clear the session
    req.session.destroy(() => {});
    throw new Error(data.error_description || data.error);
  }
  
  // Update session with new tokens
  req.session.accessToken = data.access_token;
  if (data.refresh_token) {
    req.session.refreshToken = data.refresh_token;
  }
  req.session.tokenExpiry = Date.now() + (data.expires_in * 1000);
  
  console.log('🔄 Tokens refreshed successfully for user:', req.session.spotifyUserId);
  
  // Update tokens in MongoDB
  const userId = getUserId(req);
  if (userId) {
    const dataStorage = new DataStorageService();
    await dataStorage.saveTokens(userId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenExpiry: req.session.tokenExpiry,
      userDisplayName: req.session.userDisplayName || '',
      spotifyUserId: userId
    });
  }
  
  return data.access_token;
}

// Check if token needs refresh
export async function ensureValidToken(req: Request): Promise<string> {
  if (!req.session?.accessToken) {
    throw new Error('Not authenticated');
  }
  
  // Check if token is expired or about to expire (5 minutes buffer)
  if (req.session.tokenExpiry && Date.now() > req.session.tokenExpiry - 300000) {
    console.log('🔄 Token expired or expiring soon, refreshing...');
    await refreshAccessToken(req);
  }
  
  return req.session.accessToken;
}

// Clear tokens (logout)
export async function clearTokens(req: Request, res?: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    if (req.session) {
      const userId = req.session.spotifyUserId;
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          reject(err);
        } else {
          console.log('🔓 Session cleared for user:', userId);
          // Clear the session cookie
          if (res) {
            res.clearCookie('spotify-rec-session');
          }
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

// Load tokens from MongoDB to restore session (useful after server restart)
export async function loadTokens(userId: string, req: Request): Promise<AuthTokens | null> {
  if (!userId || !req || !req.session) {
    return null;
  }
  
  try {
    const dataStorage = new DataStorageService();
    const tokens = await dataStorage.loadTokens(userId);
    
    if (tokens && tokens.refreshToken) {
      // Check if tokens are still valid
      if (tokens.tokenExpiry && Date.now() < tokens.tokenExpiry) {
        // Restore session from MongoDB
        req.session.accessToken = tokens.accessToken;
        req.session.refreshToken = tokens.refreshToken;
        req.session.tokenExpiry = tokens.tokenExpiry;
        req.session.spotifyUserId = userId;
        req.session.userDisplayName = tokens.userDisplayName;
        
        console.log('🔑 Session restored from MongoDB for user:', userId);
        return tokens;
      } else {
        console.log('⏰ Stored tokens expired, needs re-authentication');
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error loading tokens from MongoDB:', error);
    return null;
  }
}

export default router;