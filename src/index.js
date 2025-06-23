const express = require('express');
const { router: authRouter, getAccessToken, clearTokens, loadTokens } = require('./auth');
const dataCollector = require('./data-collector');
const spotifyAPI = require('./spotify-api');
const recommendationEngine = require('./recommendation-engine');
const customRecommender = require('./custom-recommender');
const dataStorage = require('./data-storage');
const { generateRecommendationsPage } = require('./recommendations-page');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.use('/auth', authRouter);

app.get('/', async (req, res) => {
  // Ensure tokens are loaded before checking auth status
  await loadTokens();
  
  const isAuthenticated = !!getAccessToken();
  console.log('Authentication check:', { isAuthenticated, hasToken: !!getAccessToken() });
  
  // Get data summary for sidebar
  const dataSummary = isAuthenticated ? await dataStorage.getDataSummary() : null;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Spotify Recommendation Engine</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { display: flex; gap: 20px; max-width: 1200px; margin: 0 auto; }
        .main { flex: 2; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .sidebar { flex: 1; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-height: 600px; overflow-y: auto; }
        h1 { color: #1db954; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .action-btn { 
          display: inline-block; 
          background: #1db954; 
          color: white; 
          text-decoration: none; 
          padding: 12px 24px; 
          margin: 5px 10px 5px 0; 
          border-radius: 25px; 
          font-weight: bold;
          transition: background 0.3s;
        }
        .action-btn:hover { background: #1ed760; }
        .secondary-btn {
          background: #666;
        }
        .secondary-btn:hover { background: #777; }
        .status { 
          background: #d4edda; 
          color: #155724; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0;
          border-left: 4px solid #1db954;
        }
        .data-summary h3 { color: #1db954; margin-bottom: 15px; }
        .stat-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .stat-number { font-weight: bold; color: #1db954; }
        .genre-list, .artist-list { margin: 5px 0; }
        .no-data { color: #666; font-style: italic; text-align: center; padding: 40px 20px; }
        .recent-tracks { margin-top: 15px; }
        .track-item { 
          margin: 8px 0; 
          padding: 8px; 
          background: #f0f0f0; 
          border-radius: 4px; 
          font-size: 14px; 
        }
        .track-name { font-weight: bold; }
        .track-artist { color: #666; }
        .last-updated { 
          font-size: 12px; 
          color: #999; 
          margin-top: 15px; 
          padding-top: 15px; 
          border-top: 1px solid #eee; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="main">
          <h1>🎵 Spotify Recommendation Engine</h1>
          <p class="subtitle">Your personalized music discovery platform</p>
          
          ${isAuthenticated ? `
            <div class="status">
              ✅ You are successfully logged in to Spotify!
            </div>
            
            <h3>Quick Actions</h3>
            <a href="/collect-data" class="action-btn">🔄 Sync My Data</a>
            <a href="/recommendations" class="action-btn">🎯 Get Recommendations</a>
            <br><br>
            
            <h3>Explore Your Music</h3>
            <a href="/my-tracks" class="action-btn secondary-btn">📊 View All Tracks</a>
            <a href="/analysis" class="action-btn secondary-btn">📈 Music Analysis</a>
            <a href="/test-auth" class="action-btn secondary-btn">🔍 Test Connection</a>
            <br><br>
            
            <a href="/logout" class="action-btn secondary-btn">🚪 Logout</a>
          ` : `
            <p>Connect your Spotify account to start getting personalized music recommendations!</p>
            <a href="/auth/login" class="action-btn">🎧 Login with Spotify</a>
          `}
        </div>
        
        <div class="sidebar">
          ${dataSummary ? `
            <div class="data-summary">
              <h3>📊 Your Music Profile</h3>
              
              <div class="stat-item">
                <strong>Profile:</strong> ${dataSummary.profile.name}<br>
                <small>Country: ${dataSummary.profile.country}</small>
              </div>
              
              <div class="stat-item">
                <strong>Music Library:</strong><br>
                • Top Tracks: <span class="stat-number">${dataSummary.stats.topTracksCount}</span><br>
                • Top Artists: <span class="stat-number">${dataSummary.stats.topArtistsCount}</span><br>
                • Recently Played: <span class="stat-number">${dataSummary.stats.recentlyPlayedCount}</span><br>
                • Saved Tracks: <span class="stat-number">${dataSummary.stats.savedTracksCount}</span>
              </div>
              
              ${dataSummary.topGenres.length > 0 ? `
                <div class="stat-item">
                  <strong>Top Genres:</strong>
                  <div class="genre-list">
                    ${dataSummary.topGenres.map(([genre, count]) => 
                      `• ${genre} (${count})`
                    ).join('<br>')}
                  </div>
                </div>
              ` : ''}
              
              ${dataSummary.topArtists.length > 0 ? `
                <div class="stat-item">
                  <strong>Top Artists:</strong>
                  <div class="artist-list">
                    ${dataSummary.topArtists.slice(0, 5).map(artist => `• ${artist}`).join('<br>')}
                  </div>
                </div>
              ` : ''}
              
              ${dataSummary.recentTracks.length > 0 ? `
                <div class="recent-tracks">
                  <strong>Recent Plays:</strong>
                  ${dataSummary.recentTracks.map(track => 
                    `<div class="track-item">
                      <div class="track-name">${track.name}</div>
                      <div class="track-artist">by ${track.artist}</div>
                    </div>`
                  ).join('')}
                </div>
              ` : ''}
              
              <div class="last-updated">
                Last updated: ${new Date(dataSummary.profile.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          ` : isAuthenticated ? `
            <div class="no-data">
              <h3>📊 Your Music Profile</h3>
              <p>No data collected yet.<br><br>Click "Sync My Data" to get started!</p>
            </div>
          ` : `
            <div class="no-data">
              <h3>🎧 Get Started</h3>
              <p>Login with Spotify to see your personalized music profile and get custom recommendations!</p>
            </div>
          `}
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/test-auth', async (req, res) => {
  try {
    const profile = await spotifyAPI.getMe();
    res.json({
      message: 'Authentication working!',
      profile: {
        name: profile.display_name,
        email: profile.email,
        country: profile.country,
        followers: profile.followers.total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/collect-data', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const data = await dataCollector.collectUserData(forceRefresh);
    
    // Also save analysis data
    const analysis = dataCollector.analyzeListeningPatterns();
    await dataStorage.saveAnalysis(analysis);
    
    // Prepare tracks data for storage
    const tracksData = {
      'Top Tracks - Short Term': data.topTracks.short_term?.map(track => ({
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        duration: Math.round(track.duration_ms / 1000 / 60 * 100) / 100,
        popularity: track.popularity,
        external_url: track.external_urls.spotify
      })) || [],
      'Top Tracks - Medium Term': data.topTracks.medium_term?.map(track => ({
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        duration: Math.round(track.duration_ms / 1000 / 60 * 100) / 100,
        popularity: track.popularity,
        external_url: track.external_urls.spotify
      })) || [],
      'Recently Played': data.recentlyPlayed?.map(item => ({
        name: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        album: item.track.album.name,
        played_at: item.played_at,
        duration: Math.round(item.track.duration_ms / 1000 / 60 * 100) / 100,
        external_url: item.track.external_urls.spotify
      })) || [],
      'Saved Tracks': data.savedTracks?.map(item => ({
        name: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        album: item.track.album.name,
        added_at: item.added_at,
        duration: Math.round(item.track.duration_ms / 1000 / 60 * 100) / 100,
        external_url: item.track.external_urls.spotify
      })) || []
    };
    
    await dataStorage.saveTracks(tracksData);
    
    // Redirect back to homepage to show updated data
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
            <p><strong>Profile:</strong> ${data.profile.display_name}</p>
            <p><strong>Top Tracks:</strong> ${Object.values(data.topTracks).flat().length}</p>
            <p><strong>Top Artists:</strong> ${Object.values(data.topArtists).flat().length}</p>
            <p><strong>Recently Played:</strong> ${data.recentlyPlayed.length}</p>
            <p><strong>Saved Tracks:</strong> ${data.savedTracks.length}</p>
            <p><strong>Audio Features:</strong> ${data.audioFeatures ? data.audioFeatures.size || Object.keys(data.audioFeatures).length : 0}</p>
            
            <p>Your data has been saved locally and will be displayed on the homepage.</p>
          </div>
          
          <a href="/" class="action-btn">🏠 Return to Homepage</a>
          <a href="/recommendations" class="action-btn">🎯 Get Recommendations</a>
          
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
          <p>${error.message}</p>
          <a href="/" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Return to Homepage</a>
        </body>
      </html>
    `);
  }
});

app.get('/analysis', async (req, res) => {
  try {
    const analysis = await dataStorage.loadAnalysis();
    if (!analysis) {
      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>📊 No Analysis Data Available</h2>
            <p>Please collect your data first to see the analysis.</p>
            <a href="/collect-data" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Collect My Data</a>
          </body>
        </html>
      `);
    }
    
    res.redirect('/'); // Show analysis in sidebar
  } catch (error) {
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Error loading analysis</h2>
          <p>${error.message}</p>
          <a href="/" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Return to Homepage</a>
        </body>
      </html>
    `);
  }
});

app.get('/my-tracks', async (req, res) => {
  try {
    const tracksData = await dataStorage.loadTracks();
    if (!tracksData) {
      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>📊 No Tracks Data Available</h2>
            <p>Please collect your data first to see your tracks.</p>
            <a href="/collect-data" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Collect My Data</a>
          </body>
        </html>
      `);
    }
    
    // For now, just redirect to homepage where summary is shown
    // Later we can create a detailed tracks view
    res.redirect('/');
  } catch (error) {
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Error loading tracks</h2>
          <p>${error.message}</p>
          <a href="/" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Return to Homepage</a>
        </body>
      </html>
    `);
  }
});

app.get('/recommendations', async (req, res) => {
  const pageContent = await generateRecommendationsPage(req, res);
  res.send(pageContent);
});

// API endpoint for recommendations (called by the frontend)
app.post('/api/recommendations', async (req, res) => {
  try {
    const { inputTracks, limit } = req.body;
    
    if (!inputTracks || inputTracks.length === 0) {
      return res.status(400).json({ error: 'Please select at least one input track' });
    }
    
    // Use independent recommendations (no user account data)
    const recommendations = await customRecommender.getIndependentRecommendations(inputTracks, limit || 20);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for creating playlists
app.post('/api/create-playlist', async (req, res) => {
  try {
    const { name, tracks } = req.body;
    
    if (!name || !tracks || tracks.length === 0) {
      return res.status(400).json({ error: 'Playlist name and tracks are required' });
    }

    // Get user profile to create playlist
    const profile = await spotifyAPI.getMe();
    
    // Create playlist
    const playlistResponse = await spotifyAPI.makeRequest('/me/playlists', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        description: `Custom recommendations generated by AI • Created ${new Date().toLocaleDateString()}`,
        public: false
      })
    });

    console.log('Playlist created:', playlistResponse.name, playlistResponse.id);

    // Search for tracks and collect URIs
    const trackUris = [];
    console.log(`Searching for ${tracks.length} tracks to add to playlist...`);
    
    for (const track of tracks.slice(0, 50)) { // Spotify limit
      try {
        // Search for the track
        const searchQuery = `track:"${track.name}" artist:"${track.artist}"`;
        const searchResults = await spotifyAPI.searchTracks(searchQuery, 1);
        
        if (searchResults.tracks.items.length > 0) {
          trackUris.push(searchResults.tracks.items[0].uri);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error searching for track ${track.name}:`, error.message);
      }
    }

    console.log(`Found ${trackUris.length} tracks to add to playlist`);

    // Add tracks to playlist in batches
    if (trackUris.length > 0) {
      const batchSize = 100; // Spotify limit per request
      for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize);
        
        await spotifyAPI.makeRequest(`/playlists/${playlistResponse.id}/tracks`, {
          method: 'POST',
          body: JSON.stringify({
            uris: batch
          })
        });
      }
    }

    res.json({
      id: playlistResponse.id,
      name: playlistResponse.name,
      external_url: playlistResponse.external_urls.spotify,
      tracks_added: trackUris.length,
      total_requested: tracks.length
    });

  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for updating existing playlists
app.post('/api/update-playlist', async (req, res) => {
  try {
    const { playlistUrl, tracks } = req.body;
    
    if (!playlistUrl || !tracks || tracks.length === 0) {
      return res.status(400).json({ error: 'Playlist URL and tracks are required' });
    }

    // Extract playlist ID from URL
    function extractPlaylistId(url) {
      const regex = /(?:playlist\/|playlist=)([a-zA-Z0-9]+)/;
      const match = url.match(regex);
      return match ? match[1] : null;
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      return res.status(400).json({ error: 'Invalid Spotify playlist URL format' });
    }

    console.log('Updating playlist:', playlistId);

    // Get playlist info to verify access
    const playlistInfo = await spotifyAPI.makeRequest(`/playlists/${playlistId}`);
    console.log('Found playlist:', playlistInfo.name);

    // Search for tracks and collect URIs
    const trackUris = [];
    console.log(`Searching for ${tracks.length} tracks to add to playlist...`);
    
    for (const track of tracks.slice(0, 50)) { // Spotify limit
      try {
        // Search for the track
        const searchQuery = `track:"${track.name}" artist:"${track.artist}"`;
        const searchResults = await spotifyAPI.searchTracks(searchQuery, 1);
        
        if (searchResults.tracks.items.length > 0) {
          trackUris.push(searchResults.tracks.items[0].uri);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error searching for track ${track.name}:`, error.message);
      }
    }

    console.log(`Found ${trackUris.length} tracks to add to playlist`);

    // Replace all tracks in existing playlist
    if (trackUris.length > 0) {
      // First, replace the playlist tracks with the first batch
      const batchSize = 100; // Spotify limit per request
      const firstBatch = trackUris.slice(0, batchSize);
      
      // Use PUT to replace all tracks with the first batch
      await spotifyAPI.makeRequest(`/playlists/${playlistId}/tracks`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: firstBatch
        })
      });
      
      // If there are more tracks, add them with POST
      if (trackUris.length > batchSize) {
        for (let i = batchSize; i < trackUris.length; i += batchSize) {
          const batch = trackUris.slice(i, i + batchSize);
          
          await spotifyAPI.makeRequest(`/playlists/${playlistId}/tracks`, {
            method: 'POST',
            body: JSON.stringify({
              uris: batch
            })
          });
        }
      }
    } else {
      // If no tracks found, clear the playlist
      await spotifyAPI.makeRequest(`/playlists/${playlistId}/tracks`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: []
        })
      });
    }

    res.json({
      playlist_id: playlistId,
      playlist_name: playlistInfo.name,
      external_url: playlistInfo.external_urls.spotify,
      tracks_added: trackUris.length,
      total_requested: tracks.length
    });

  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/logout', async (req, res) => {
  await clearTokens();
  res.send(`
    <h1>Logged out successfully!</h1>
    <p><a href="/">Go back to home</a></p>
  `);
});

async function startServer() {
  // Load saved tokens before starting server
  await loadTokens();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`\nTo get started:`);
    console.log(`1. Create a Spotify app at https://developer.spotify.com/dashboard`);
    console.log(`2. Copy .env.example to .env and add your credentials`);
    console.log(`3. Add redirect URI in Spotify app: https://e8e4-121-242-143-146.ngrok-free.app/auth/callback`);
    console.log(`4. Visit https://e8e4-121-242-143-146.ngrok-free.app and login with Spotify`);
  });
}

startServer().catch(console.error);
