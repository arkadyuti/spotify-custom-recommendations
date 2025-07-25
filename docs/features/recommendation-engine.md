# Recommendation Engine

## Overview

The application features two recommendation engines:
1. **Basic Recommendation Engine**: Uses Spotify's recommendation API with custom filtering
2. **Custom Recommender**: Multi-strategy approach with independent capabilities

Both engines provide personalized music discovery with different levels of sophistication.

## Basic Recommendation Engine

### Algorithm Overview
The basic engine (`recommendation-engine.js`) leverages Spotify's recommendation API with custom enhancements:

1. **Seed Selection**: Chooses representative tracks/artists
2. **Spotify API Call**: Gets initial recommendations
3. **Custom Filtering**: Removes known tracks
4. **Smart Ranking**: Applies custom scoring

### Seed Building Process
```javascript
// Maximum 5 seeds total (Spotify limitation)
{
  seed_artists: [top 2 medium-term artists],
  seed_tracks: [top 1 medium-term track],
  seed_genres: ["pop"]  // Fallback genre
}
```

### Filtering Logic
Removes tracks that:
- User already has in library
- User recently played
- Are too short (<60 seconds)
- Are from known artists (50% probability)

### Ranking Algorithm
```javascript
score = popularity/100  // Base score
+ 0.3 (genre match)     // Genre similarity
+ 0.2 (artist match)    // Known artist bonus
+ 0.1 (recent release)  // Newer tracks
+ 0.2 * random()        // Discovery factor
```

## Custom Recommender

### Advanced Features
The custom recommender (`custom-recommender.js`) implements:

1. **Multi-Strategy Approach**: Multiple discovery methods
2. **Independent Mode**: Works without user data
3. **Enhanced Filtering**: Smarter deduplication
4. **Flexible Scoring**: Configurable weights

### Recommendation Strategies

#### Strategy 1: Artist-Based Discovery
```javascript
// Find other tracks by same artists
- Extract artists from input tracks
- Search for their popular tracks
- Exclude input tracks
- Limit 5 artists, 10 tracks each
```

#### Strategy 2: Genre-Based Discovery (User Mode Only)
```javascript
// Use user's top genres
- Analyze listening patterns
- Search tracks by genre
- Fallback to broad terms
- Weight by genre frequency
```

#### Strategy 3: Keyword-Based Discovery
```javascript
// Find similar tracks by keywords
- Extract keywords from artist names
- Search using related terms
- Filter short/common words
- Discover adjacent artists
```

### Independent Recommendations
Special mode that works without user data:
- Uses only input tracks
- No genre preferences
- Equal weight strategies
- Broader search terms

### Strategy Weights
```javascript
User-based mode:
- Artist similarity: 40%
- Genre matching: 30%
- Keyword discovery: 30%

Independent mode:
- Artist similarity: 50%
- Keyword discovery: 50%
```

## Scoring System

### Track Score Calculation
```javascript
calculateTrackScore(track, inputSongs) {
  let score = track.popularity / 100;
  
  // Artist overlap bonus
  if (hasCommonArtist) score += 0.3;
  
  // Recency bonus
  if (releasedWithin3Years) score += 0.1;
  
  // Diversity factor
  score += Math.random() * 0.2;
  
  return score;
}
```

### Scoring Factors
1. **Popularity**: Base metric (0-100)
2. **Artist Familiarity**: Known vs new
3. **Release Date**: Prefer newer music
4. **Randomness**: Ensure variety

## Recommendation Process Flow

### 1. Input Processing
```
User selects tracks → 
Extract metadata →
Determine seed tracks →
Choose strategies
```

### 2. Candidate Generation
```
Execute strategies →
Collect all results →
Remove duplicates →
Apply initial filters
```

### 3. Ranking & Selection
```
Calculate scores →
Sort by relevance →
Apply limit →
Format results
```

## Response Format

### Recommendation Object
```javascript
{
  recommendations: [
    {
      name: "Track Name",
      artist: "Artist Name",
      album: "Album Name",
      duration: 3.25,  // minutes
      popularity: 78,
      external_url: "spotify:track:...",
      custom_score: 0.84,
      preview_url: "https://..."
    }
  ],
  metadata: {
    input_songs_count: 10,
    seed_tracks_used: 5,
    total_candidates: 150,
    final_count: 20,
    mode: "independent",
    userProfile: {...}
  }
}
```

## Algorithm Comparison

| Feature | Basic Engine | Custom Recommender |
|---------|--------------|-------------------|
| Strategies | Single (Spotify API) | Multiple (3+) |
| User Data Required | Yes | Optional |
| Customization | Limited | Extensive |
| Discovery Range | Moderate | Wide |
| Performance | Fast | Moderate |
| Accuracy | High | Variable |

## Configuration Options

### Adjustable Parameters
```javascript
// Weights for scoring
diversityWeight: 0.4,    // New artist discovery
similarityWeight: 0.6,   // Match input taste

// Strategy limits
artistSearchLimit: 5,    // Artists to search
tracksPerArtist: 10,    // Tracks per artist
keywordLimit: 5,        // Keywords to use

// Filtering thresholds
minTrackDuration: 60000, // 1 minute
maxPopularity: 100,     // No limit
releaseRecency: 3,      // Years
```

## Performance Considerations

### API Rate Limiting
- Delays between searches (100ms)
- Batch processing where possible
- Cache search results
- Limit concurrent requests

### Optimization Techniques
1. **Parallel Searches**: When independent
2. **Early Termination**: Stop when enough
3. **Result Caching**: Reuse searches
4. **Smart Deduplication**: Efficient Set usage

## Quality Metrics

### Recommendation Quality
- **Relevance**: Match to input tracks
- **Diversity**: Variety in results
- **Discovery**: New artist ratio
- **Popularity**: Balance known/unknown

### User Engagement
- Track selection rate
- Playlist creation
- Repeat usage
- Feedback (implicit)

## Future Enhancements

### Algorithm Improvements
1. **Machine Learning**: Collaborative filtering
2. **Audio Analysis**: Deep audio features
3. **Context Awareness**: Time, mood, activity
4. **Social Signals**: Friend recommendations
5. **Feedback Loop**: Learn from choices

### Technical Improvements
1. **Caching Layer**: Redis for results
2. **Async Processing**: Background generation
3. **A/B Testing**: Algorithm comparison
4. **Real-time Updates**: Live adjustments
5. **Explanation Engine**: Why recommended

## Migration Recommendations

### Current Limitations
1. Limited to Spotify's data
2. No learning from user behavior
3. Simple scoring algorithms
4. No cross-user insights
5. API-dependent strategies

### Suggested Architecture
1. **ML Pipeline**: TensorFlow/PyTorch
2. **Feature Store**: Centralized features
3. **Recommendation Service**: Dedicated API
4. **Experimentation Platform**: A/B testing
5. **Analytics Integration**: Track performance
6. **Hybrid Approach**: Multiple algorithms