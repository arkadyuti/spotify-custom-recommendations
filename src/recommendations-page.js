const dataStorage = require('./data-storage');
const { getUserId } = require('./auth');

// Helper function to clean track data and prevent circular references
function cleanTrackData(track, category, selected = false, extraData = {}) {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists?.map(a => ({ name: a.name, id: a.id })) || [],
    album: {
      name: track.album?.name || 'Unknown',
      images: track.album?.images || []
    },
    duration_ms: track.duration_ms,
    popularity: track.popularity,
    external_urls: track.external_urls,
    category,
    selected,
    ...extraData
  };
}

async function generateRecommendationsPage(req, res) {
  try {
    // Get user ID from session
    const userId = getUserId(req);
    if (!userId) {
      return `
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>🔐 Authentication Required</h2>
            <p>Please login with Spotify to access recommendations.</p>
            <a href="/auth/login" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Login with Spotify</a>
          </body>
        </html>
      `;
    }

    // Load user data to show track selection
    const userData = await dataStorage.loadUserData(userId);
    
    if (!userData || !userData.profile) {
      return `
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>🎵 No Music Data Available</h2>
            <p>Please collect your data first to get personalized recommendations.</p>
            <a href="/collect-data" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Collect My Data</a>
          </body>
        </html>
      `;
    }

    // Prepare track selection data
    const allTracks = [];
    
    // Add top tracks from different periods
    if (userData.topTracks.short_term) {
      userData.topTracks.short_term.forEach(track => {
        allTracks.push(cleanTrackData(track, 'Top Tracks - Last 4 Weeks', true));
      });
    }
    
    if (userData.topTracks.medium_term) {
      userData.topTracks.medium_term.forEach(track => {
        if (!allTracks.find(t => t.id === track.id)) { // Avoid duplicates
          allTracks.push(cleanTrackData(track, 'Top Tracks - Last 6 Months', true));
        }
      });
    }
    
    if (userData.topTracks.long_term) {
      userData.topTracks.long_term.forEach(track => {
        if (!allTracks.find(t => t.id === track.id)) {
          allTracks.push(cleanTrackData(track, 'Top Tracks - All Time', false));
        }
      });
    }
    
    // Add recently played tracks
    if (userData.recentlyPlayed) {
      userData.recentlyPlayed.forEach(item => {
        if (!allTracks.find(t => t.id === item.track.id)) {
          allTracks.push(cleanTrackData(item.track, 'Recently Played', false, { played_at: item.played_at }));
        }
      });
    }
    
    // Add saved tracks
    if (userData.savedTracks) {
      userData.savedTracks.forEach(item => {
        if (!allTracks.find(t => t.id === item.track.id)) {
          allTracks.push(cleanTrackData(item.track, 'Saved Tracks', false, { added_at: item.added_at }));
        }
      });
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Get Recommendations - Spotify RecoEngine</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
          .container { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
          .left-panel, .right-panel { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; grid-column: 1 / -1; }
          h1 { color: #1db954; margin-bottom: 10px; }
          .subtitle { color: #666; margin-bottom: 30px; }
          
          .track-selection { max-height: 500px; overflow-y: auto; }
          .category-section { margin-bottom: 25px; }
          .category-header { 
            font-weight: bold; 
            color: #1db954; 
            margin-bottom: 10px; 
            padding: 10px; 
            background: #f0f8f4; 
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .category-controls { font-size: 12px; }
          .select-all, .select-none { 
            color: #666; 
            cursor: pointer; 
            margin-left: 10px; 
            text-decoration: underline;
          }
          .select-all:hover, .select-none:hover { color: #1db954; }
          
          .track-checkbox-item { 
            display: flex; 
            align-items: center; 
            padding: 10px; 
            margin: 5px 0; 
            background: #f8f9fa; 
            border-radius: 5px;
            transition: background 0.2s;
          }
          .track-checkbox-item:hover { background: #e9f7ef; }
          .track-checkbox-item.selected { background: #d4edda; border-left: 3px solid #1db954; }
          
          .track-checkbox { margin-right: 12px; width: 18px; height: 18px; cursor: pointer; }
          .track-info { flex: 1; }
          .track-name { font-weight: bold; color: #333; font-size: 14px; }
          .track-artist { color: #666; font-size: 12px; }
          .track-popularity { color: #999; font-size: 11px; margin-top: 2px; }
          
          .selection-summary { 
            background: #e9f7ef; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            text-align: center;
          }
          
          .form-group { margin-bottom: 20px; }
          label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
          input, select { 
            width: 100%; 
            padding: 12px; 
            border: 2px solid #ddd; 
            border-radius: 6px; 
            font-size: 16px;
            box-sizing: border-box;
          }
          input:focus, select:focus { border-color: #1db954; outline: none; }
          
          .btn { 
            background: #1db954; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 25px; 
            font-size: 16px; 
            font-weight: bold; 
            cursor: pointer;
            transition: background 0.3s;
            margin: 5px;
            width: 100%;
          }
          .btn:hover { background: #1ed760; }
          .btn:disabled { background: #ccc; cursor: not-allowed; }
          .btn-secondary { background: #666; }
          .btn-secondary:hover { background: #777; }
          
          .recommendations-container { 
            grid-column: 1 / -1;
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: none;
          }
          
          .track-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding: 15px; 
            margin: 10px 0; 
            background: #f8f9fa; 
            border-radius: 8px; 
            border-left: 4px solid #1db954;
          }
          .rec-track-info { flex: 1; }
          .rec-track-name { font-weight: bold; color: #333; margin-bottom: 4px; }
          .rec-track-artist { color: #666; font-size: 14px; }
          .rec-track-details { color: #999; font-size: 12px; margin-top: 4px; }
          .track-actions { display: flex; gap: 10px; }
          .play-btn { 
            background: #1db954; 
            color: white; 
            border: none; 
            padding: 8px 12px; 
            border-radius: 15px; 
            font-size: 12px; 
            cursor: pointer;
            text-decoration: none;
          }
          
          .loading { text-align: center; padding: 50px; color: #666; }
          .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .nav-link { 
            display: inline-block; 
            color: #1db954; 
            text-decoration: none; 
            margin-bottom: 20px; 
            font-weight: bold;
          }
          .nav-link:hover { text-decoration: underline; }
          .metadata { 
            background: #e9f7ef; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            font-size: 14px; 
            color: #2d5a3d;
          }
          .playlist-section { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #eee; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="/" class="nav-link">← Back to Homepage</a>
            <h1>🎯 Get Custom Recommendations</h1>
            <p class="subtitle">Select tracks from your music library to get personalized recommendations</p>
          </div>

          <div class="left-panel">
            <h3>📱 Select Input Tracks</h3>
            <p>Choose tracks that represent your current mood or preferences. The algorithm will find similar music.</p>
            
            <div class="selection-summary">
              <strong id="selectionCount">${allTracks.filter(t => t.selected).length}</strong> tracks selected
            </div>
            
            <div class="track-selection">
              ${Object.entries(
                allTracks.reduce((acc, track) => {
                  if (!acc[track.category]) acc[track.category] = [];
                  acc[track.category].push(track);
                  return acc;
                }, {})
              ).map(([category, tracks]) => `
                <div class="category-section">
                  <div class="category-header">
                    ${category} (${tracks.length})
                    <div class="category-controls">
                      <span class="select-all" onclick="selectCategory('${category}', true)">Select All</span>
                      <span class="select-none" onclick="selectCategory('${category}', false)">None</span>
                    </div>
                  </div>
                  ${tracks.map(track => `
                    <div class="track-checkbox-item ${track.selected ? 'selected' : ''}" data-track-id="${track.id}" data-category="${category}">
                      <input type="checkbox" class="track-checkbox" ${track.selected ? 'checked' : ''} 
                             onchange="toggleTrack('${track.id}', this.checked)">
                      <div class="track-info">
                        <div class="track-name">${track.name}</div>
                        <div class="track-artist">by ${track.artists.map(a => a.name).join(', ')}</div>
                        <div class="track-popularity">Popularity: ${track.popularity}/100</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>
          </div>

          <div class="right-panel">
            <h3>⚙️ Recommendation Settings</h3>
            
            <div class="form-group">
              <label for="limit">Number of recommendations:</label>
              <select id="limit" name="limit">
                <option value="10">10 tracks</option>
                <option value="20" selected>20 tracks</option>
                <option value="30">30 tracks</option>
                <option value="50">50 tracks</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="playlistUrl">Spotify Playlist URL:</label>
              <input type="text" id="playlistUrl" name="playlistUrl" 
                     value="https://open.spotify.com/playlist/1pZZSuOY0hfn8HGRsnZRcu"
                     style="font-family: monospace;">
              <small style="color: #666; font-size: 12px; display: block; margin-top: 5px;">
                Paste the Spotify playlist URL here. All existing tracks will be replaced with the new recommendations.
              </small>
            </div>

            <button id="generateBtn" class="btn" onclick="generateRecommendations()">
              🎵 Generate Recommendations
            </button>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
              <h4>💡 Tips</h4>
              <ul style="font-size: 14px; color: #666; line-height: 1.6;">
                <li>Select 5-15 tracks for best results</li>
                <li>Mix different genres for diverse recommendations</li>
                <li>Recent favorites are pre-selected</li>
                <li>The algorithm finds music similar to your selection</li>
              </ul>
            </div>
          </div>

          <div id="recommendationsContainer" class="recommendations-container">
            <div id="loadingState" class="loading">
              <h3>🎵 Analyzing your selected tracks...</h3>
              <p>Finding music that matches your taste...</p>
            </div>
            
            <div id="recommendationsContent" style="display: none;">
              <h3>🎯 Your Custom Recommendations</h3>
              <div id="metadata"></div>
              <div id="tracksList"></div>
              
              <div class="playlist-section">
                <h4>🔄 Replace Playlist</h4>
                <p>Replace all tracks in your existing Spotify playlist with these recommendations:</p>
                <button id="updatePlaylistBtn" class="btn">🔄 Replace Playlist Tracks</button>
                <button id="refreshBtn" class="btn btn-secondary">🔄 Get New Recommendations</button>
              </div>
              
              <div id="playlistResult"></div>
            </div>
          </div>
        </div>

        <script>
          let selectedTracks = new Set(${JSON.stringify(allTracks.filter(t => t.selected).map(t => t.id))});
          let allTracksData = ${JSON.stringify(allTracks)};
          let currentRecommendations = [];
          
          function updateSelectionCount() {
            document.getElementById('selectionCount').textContent = selectedTracks.size;
            document.getElementById('generateBtn').disabled = selectedTracks.size === 0;
          }
          
          function toggleTrack(trackId, selected) {
            const trackElement = document.querySelector(\`[data-track-id="\${trackId}"]\`);
            
            if (selected) {
              selectedTracks.add(trackId);
              trackElement.classList.add('selected');
            } else {
              selectedTracks.delete(trackId);
              trackElement.classList.remove('selected');
            }
            
            updateSelectionCount();
          }
          
          function selectCategory(category, selectAll) {
            const categoryTracks = allTracksData.filter(t => t.category === category);
            
            categoryTracks.forEach(track => {
              const checkbox = document.querySelector(\`[data-track-id="\${track.id}"] .track-checkbox\`);
              const trackElement = document.querySelector(\`[data-track-id="\${track.id}"]\`);
              
              checkbox.checked = selectAll;
              
              if (selectAll) {
                selectedTracks.add(track.id);
                trackElement.classList.add('selected');
              } else {
                selectedTracks.delete(track.id);
                trackElement.classList.remove('selected');
              }
            });
            
            updateSelectionCount();
          }
          
          async function generateRecommendations() {
            if (selectedTracks.size === 0) {
              alert('Please select at least one track');
              return;
            }
            
            const generateBtn = document.getElementById('generateBtn');
            const limit = document.getElementById('limit').value;
            const container = document.getElementById('recommendationsContainer');
            const loading = document.getElementById('loadingState');
            const content = document.getElementById('recommendationsContent');
            
            // Disable generate button
            generateBtn.disabled = true;
            generateBtn.textContent = '⏳ Generating...';
            
            // Show container and loading state
            container.style.display = 'block';
            loading.style.display = 'block';
            content.style.display = 'none';
            
            // Scroll to recommendations
            container.scrollIntoView({ behavior: 'smooth' });
            
            try {
              // Get selected track data and transform to compact format
              const selectedTrackData = allTracksData.filter(t => selectedTracks.has(t.id));
              
              // Transform to compact payload with only essential fields
              const inputTracks = selectedTrackData.map(track => ({
                id: track.id,
                name: track.name,
                artists: track.artists.map(artist => ({
                  id: artist.id,
                  name: artist.name
                })),
                // Keep only essential metadata for recommendations
                popularity: track.popularity,
                category: track.category,
                selected: track.selected
              }));
              
              const response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  inputTracks: inputTracks,
                  limit: parseInt(limit)
                })
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to get recommendations');
              }
              
              currentRecommendations = data.recommendations;
              displayRecommendations(data);
              
            } catch (error) {
              document.getElementById('tracksList').innerHTML = 
                '<div class="error">❌ Error: ' + error.message + '</div>';
            } finally {
              // Re-enable generate button
              generateBtn.disabled = false;
              generateBtn.textContent = '🎵 Generate Recommendations';
            }
            
            loading.style.display = 'none';
            content.style.display = 'block';
          }
          
          function displayRecommendations(data) {
            const metadata = document.getElementById('metadata');
            const tracksList = document.getElementById('tracksList');
            
            // Show metadata
            metadata.innerHTML = \`
              <div class="metadata">
                <strong>Generation Summary:</strong><br>
                • Input songs analyzed: \${data.metadata.input_songs_count}<br>
                • Seed tracks used: \${data.metadata.seed_tracks_used}<br>
                • Total candidates found: \${data.metadata.total_candidates}<br>
                • Final recommendations: \${data.metadata.final_count}
              </div>
            \`;
            
            // Show tracks
            tracksList.innerHTML = data.recommendations.map((track, index) => \`
              <div class="track-item">
                <div class="rec-track-info">
                  <div class="rec-track-name">\${track.name}</div>
                  <div class="rec-track-artist">by \${track.artist}</div>
                  <div class="rec-track-details">
                    Album: \${track.album} • Duration: \${track.duration}m • 
                    Popularity: \${track.popularity}/100 • Score: \${track.custom_score?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div class="track-actions">
                  \${track.external_url ? 
                    \`<a href="\${track.external_url}" target="_blank" class="play-btn">▶️ Play</a>\` : 
                    ''
                  }
                  \${track.preview_url ? 
                    \`<button onclick="playPreview('\${track.preview_url}')" class="play-btn">🎵 Preview</button>\` : 
                    ''
                  }
                </div>
              </div>
            \`).join('');
          }
          
          function playPreview(url) {
            const audio = new Audio(url);
            audio.play().catch(e => alert('Preview not available'));
          }
          
          document.getElementById('updatePlaylistBtn').addEventListener('click', async () => {
            const playlistUrl = document.getElementById('playlistUrl').value.trim();
            const resultDiv = document.getElementById('playlistResult');
            const updateBtn = document.getElementById('updatePlaylistBtn');
            const refreshBtn = document.getElementById('refreshBtn');
            
            if (!playlistUrl) {
              resultDiv.innerHTML = '<div class="error">Please enter a Spotify playlist URL!</div>';
              return;
            }
            
            if (currentRecommendations.length === 0) {
              resultDiv.innerHTML = '<div class="error">No recommendations to add!</div>';
              return;
            }
            
            // Disable buttons
            updateBtn.disabled = true;
            updateBtn.textContent = '⏳ Updating...';
            refreshBtn.disabled = true;
            
            resultDiv.innerHTML = '<div class="loading">Replacing playlist tracks...</div>';
            
            try {
              const response = await fetch('/api/update-playlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  playlistUrl: playlistUrl,
                  tracks: currentRecommendations
                })
              });
              
              const result = await response.json();
              
              if (!response.ok) {
                throw new Error(result.error || 'Failed to update playlist');
              }
              
              resultDiv.innerHTML = \`
                <div class="success">
                  ✅ Playlist updated successfully!<br>
                  Replaced with \${result.tracks_added} new tracks in <strong>\${result.playlist_name}</strong><br>
                  <a href="\${result.external_url}" target="_blank" class="play-btn">🎵 Open Playlist</a>
                </div>
              \`;
              
            } catch (error) {
              resultDiv.innerHTML = '<div class="error">❌ Error: ' + error.message + '</div>';
            } finally {
              // Re-enable buttons
              updateBtn.disabled = false;
              updateBtn.textContent = '🔄 Replace Playlist Tracks';
              refreshBtn.disabled = false;
            }
          });
          
          document.getElementById('refreshBtn').addEventListener('click', () => {
            generateRecommendations();
          });
          
          // Initialize
          updateSelectionCount();
        </script>
      </body>
      </html>
    `;
  } catch (error) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Error loading recommendations page</h2>
          <p>${error.message}</p>
          <a href="/" style="background: #1db954; color: white; text-decoration: none; padding: 12px 24px; border-radius: 25px;">Return to Homepage</a>
        </body>
      </html>
    `;
  }
}

module.exports = { generateRecommendationsPage };