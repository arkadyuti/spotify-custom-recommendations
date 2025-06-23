const express = require('express');
const crypto = require('crypto');
const storage = require('node-persist');
require('dotenv').config();

const router = express.Router();
let accessToken = null;
let refreshToken = null;

// Load tokens on startup
async function loadTokens() {
  if (tokensLoaded) return;
  
  try {
    // Initialize storage first
    await storage.init({
      dir: './data/tokens',
      stringify: JSON.stringify,
      parse: JSON.parse,
      encoding: 'utf8',
      logging: false
    });
    
    accessToken = await storage.getItem('accessToken');
    refreshToken = await storage.getItem('refreshToken');
    
    if (accessToken) {
      console.log('✅ Loaded saved authentication tokens');
      
      // Check if token is still valid by making a test request
      const testResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (testResponse.status === 401) {
        console.log('🔄 Access token expired, attempting refresh...');
        await refreshAccessToken();
      } else {
        console.log('✅ Tokens are valid and ready');
      }
    } else {
      console.log('ℹ️ No saved tokens found');
    }
    tokensLoaded = true;
  } catch (error) {
    console.log('ℹ️ Error loading tokens:', error.message);
    tokensLoaded = true;
  }
}

// Save tokens to persistent storage
async function saveTokens() {
  try {
    // Ensure storage is initialized
    await storage.init({
      dir: './data/tokens',
      stringify: JSON.stringify,
      parse: JSON.parse,
      encoding: 'utf8',
      logging: false
    });
    
    await storage.setItem('accessToken', accessToken);
    await storage.setItem('refreshToken', refreshToken);
    console.log('💾 Tokens saved to persistent storage');
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
}

// Initialize tokens - will be called from main app
let tokensLoaded = false;

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

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

router.get('/login', async (req, res) => {
  const state = generateRandomString(16);
  
  // Store state for validation
  req.app.locals.authState = state;
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: process.env.REDIRECT_URI,
    state: state
  });
  
  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log('Auth URL:', authUrl);
  
  res.redirect(authUrl);
});

router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.status(400).send(`Authorization error: ${error}`);
  }
  
  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

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
        code: code,
        redirect_uri: process.env.REDIRECT_URI
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }
    
    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token;
    
    // Save tokens to persistent storage
    await saveTokens();
    
    res.send(`
      <h1>Authentication successful!</h1>
      <p>Your authentication will persist across server restarts.</p>
      <p>Redirecting to home page...</p>
      <script>
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      </script>
    `);
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).send('Authentication failed: ' + error.message);
  }
});

function getAccessToken() {
  return accessToken;
}

function getRefreshToken() {
  return refreshToken;
}

async function refreshAccessToken() {
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SPOTIFY_CLIENT_ID
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  
  accessToken = data.access_token;
  if (data.refresh_token) {
    refreshToken = data.refresh_token;
  }
  
  // Save refreshed tokens
  await saveTokens();
  
  return accessToken;
}

// Clear tokens (logout)
async function clearTokens() {
  try {
    // Ensure storage is initialized
    await storage.init({
      dir: './data/tokens',
      stringify: JSON.stringify,
      parse: JSON.parse,
      encoding: 'utf8',
      logging: false
    });
    
    accessToken = null;
    refreshToken = null;
    await storage.clear();
    console.log('🔓 Tokens cleared');
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
}

module.exports = { router, getAccessToken, getRefreshToken, refreshAccessToken, clearTokens, loadTokens };