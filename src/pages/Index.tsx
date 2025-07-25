import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/layout/Header"
import { UserProfile } from "@/components/music/UserProfile"
import { TrackCard } from "@/components/music/TrackCard"
import { MusicVisualizer } from "@/components/music/MusicVisualizer"
import { useAuth } from "@/contexts/AuthContext"
import { apiService, type Track, type FormattedTrack, type RecommendationResponse } from "@/services/api"
import { Zap, Music2, Settings, Target, CheckCircle, RefreshCw, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import heroBackground from "@/assets/hero-bg.jpg"

const Index = () => {
  const { toast } = useToast()
  const { 
    isAuthenticated, 
    profile, 
    dataSummary, 
    loading: authLoading, 
    login, 
    logout, 
    collectData 
  } = useAuth()

  const [selectedTracks, setSelectedTracks] = useState<Track[]>([])
  const [currentView, setCurrentView] = useState<"landing" | "selection" | "recommendations">("landing")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCollectingData, setIsCollectingData] = useState(false)
  const [recommendationCount, setRecommendationCount] = useState("20")
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [playlistName, setPlaylistName] = useState("")
  const [recommendations, setRecommendations] = useState<FormattedTrack[]>([])
  const [userTracks, setUserTracks] = useState<{
    topTracksShort: Track[];
    topTracksMedium: Track[];
    recentlyPlayed: Track[];
    savedTracks: Track[];
  }>({
    topTracksShort: [],
    topTracksMedium: [],
    recentlyPlayed: [],
    savedTracks: []
  })

  // Update view based on authentication status
  useEffect(() => {
    if (isAuthenticated && currentView === "landing") {
      setCurrentView("selection")
    } else if (!isAuthenticated && currentView !== "landing") {
      setCurrentView("landing")
      setSelectedTracks([])
      setRecommendations([])
    }
  }, [isAuthenticated, currentView])

  // Load tracks data when authenticated
  useEffect(() => {
    if (isAuthenticated && profile) {
      // Try to load existing tracks data
      apiService.getUserTracks()
        .then(tracks => setUserTracks(tracks))
        .catch(error => console.log('No tracks data available yet'))
    }
  }, [isAuthenticated, profile])

  const handleLogin = async () => {
    try {
      await login()
    } catch (error) {
      toast({
        title: "❌ Login failed",
        description: "Could not connect to Spotify. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setCurrentView("landing")
      setSelectedTracks([])
      setRecommendations([])
      toast({
        title: "👋 Logged out",
        description: "You've been disconnected from Spotify.",
      })
    } catch (error) {
      toast({
        title: "❌ Logout failed",
        description: "There was an error logging out.",
        variant: "destructive"
      })
    }
  }

  const handleCollectData = async (forceRefresh = false) => {
    if (!isAuthenticated) return

    setIsCollectingData(true)
    try {
      await collectData(forceRefresh)
      // After data collection, fetch tracks for selection
      const tracks = await apiService.getUserTracks()
      setUserTracks(tracks)
      toast({
        title: "✅ Data synced!",
        description: "Your Spotify data has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "❌ Data sync failed",
        description: "Could not sync your Spotify data. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCollectingData(false)
    }
  }

  const handleTrackSelect = (trackId: string, selected: boolean) => {
    const track = Object.values(userTracks).flat().find(t => t.id === trackId)
    if (!track) return

    if (selected) {
      setSelectedTracks([...selectedTracks, track])
    } else {
      setSelectedTracks(selectedTracks.filter(t => t.id !== trackId))
    }
  }

  const handleSelectAll = (category: keyof typeof userTracks) => {
    const categoryTracks = userTracks[category]
    const newSelected = [...selectedTracks]
    
    categoryTracks.forEach(track => {
      if (!newSelected.find(t => t.id === track.id)) {
        newSelected.push(track)
      }
    })
    
    setSelectedTracks(newSelected)
  }

  const handleSelectNone = (category: keyof typeof userTracks) => {
    const categoryTrackIds = userTracks[category].map(track => track.id)
    setSelectedTracks(selectedTracks.filter(track => !categoryTrackIds.includes(track.id)))
  }

  const generateRecommendations = async () => {
    if (selectedTracks.length < 1) {
      toast({
        title: "⚠️ No tracks selected",
        description: "Please select at least 1 track for recommendations.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await apiService.getRecommendations({
        inputTracks: selectedTracks,
        limit: parseInt(recommendationCount),
        engine: 'custom'
      })
      
      setRecommendations(response.recommendations)
      setCurrentView("recommendations")
      
      toast({
        title: "🎯 Recommendations generated!",
        description: `Found ${response.recommendations.length} perfect tracks for you.`,
      })
    } catch (error) {
      console.error('Failed to generate recommendations:', error)
      toast({
        title: "❌ Generation failed",
        description: "Could not generate recommendations. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const createPlaylist = async () => {
    if (!playlistName.trim()) {
      toast({
        title: "⚠️ Playlist name required",
        description: "Please enter a name for your playlist.",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await apiService.createPlaylist({
        name: playlistName,
        tracks: recommendations
      })
      
      toast({
        title: "🎵 Playlist created!",
        description: `"${response.name}" has been saved to your Spotify with ${response.tracks_added} tracks.`,
      })
      
      setPlaylistName("")
    } catch (error) {
      console.error('Failed to create playlist:', error)
      toast({
        title: "❌ Playlist creation failed",
        description: "Could not create playlist. Please try again.",
        variant: "destructive"
      })
    }
  }

  const updatePlaylist = async () => {
    if (!playlistUrl.trim()) {
      toast({
        title: "⚠️ Playlist URL required",
        description: "Please enter a Spotify playlist URL.",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await apiService.updatePlaylist(playlistUrl, recommendations)
      
      toast({
        title: "🔄 Playlist updated!",
        description: `"${response.playlist_name}" has been updated with ${response.tracks_added} new tracks.`,
      })
    } catch (error) {
      console.error('Failed to update playlist:', error)
      toast({
        title: "❌ Playlist update failed",
        description: "Could not update playlist. Please check the URL and try again.",
        variant: "destructive"
      })
    }
  }

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Landing Page View
  if (currentView === "landing") {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          isAuthenticated={isAuthenticated}
          userName={profile?.display_name || null}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        
        <div 
          className="relative min-h-[80vh] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBackground})` }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Panel - Hero Content */}
                <div className="space-y-8 animate-slide-up">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <MusicVisualizer className="h-8" />
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        AI-Powered Music Discovery
                      </Badge>
                    </div>
                    <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                      Discover Your 
                      <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                        {" "}Next Favorite
                      </span>
                      {" "}Songs
                    </h1>
                    <p className="text-xl text-gray-200 leading-relaxed">
                      Get personalized Spotify recommendations based on your listening history. 
                      Our AI analyzes your music taste to find hidden gems you'll love.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button 
                      onClick={handleLogin}
                      size="lg"
                      className="spotify-button text-lg px-8 py-4 animate-glow"
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      Connect with Spotify
                    </Button>
                    <p className="text-sm text-gray-300">
                      • No account creation required • Secure OAuth connection • Instant recommendations
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">10M+</div>
                      <div className="text-sm text-gray-300">Songs Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">95%</div>
                      <div className="text-sm text-gray-300">Accuracy Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">1M+</div>
                      <div className="text-sm text-gray-300">Happy Users</div>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Preview Card */}
                <div className="animate-fade-in">
                  <Card className="p-6 glass-card">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">How it works</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground">1</div>
                          <div>
                            <div className="font-medium">Connect your Spotify</div>
                            <div className="text-sm text-muted-foreground">Secure OAuth authentication</div>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground">2</div>
                          <div>
                            <div className="font-medium">Select your favorite tracks</div>
                            <div className="text-sm text-muted-foreground">From your top songs and playlists</div>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground">3</div>
                          <div>
                            <div className="font-medium">Get AI recommendations</div>
                            <div className="text-sm text-muted-foreground">Personalized just for your taste</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Track Selection View
  if (currentView === "selection") {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          isAuthenticated={isAuthenticated}
          userName={profile?.display_name || null}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
        
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content - Track Selection */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Select Your Tracks</h2>
                  <p className="text-muted-foreground">Choose tracks that represent your music taste</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {selectedTracks.length} tracks selected
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCollectData(true)}
                    disabled={isCollectingData}
                  >
                    {isCollectingData ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Data
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {!dataSummary || (dataSummary.stats.topTracksCount === 0 && dataSummary.stats.recentlyPlayedCount === 0 && dataSummary.stats.savedTracksCount === 0) ? (
                <Card className="p-8 text-center space-y-4">
                  <div className="text-muted-foreground">
                    <Music2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold">No music data found</h3>
                    <p>Click "Sync Data" to fetch your Spotify listening history</p>
                  </div>
                  <Button onClick={() => handleCollectData(false)} disabled={isCollectingData}>
                    {isCollectingData ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing your data...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync My Spotify Data
                      </>
                    )}
                  </Button>
                </Card>
              ) : (
                <Tabs defaultValue="topTracksShort" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="topTracksShort">Top Tracks - 4 Weeks</TabsTrigger>
                    <TabsTrigger value="topTracksMedium">Top Tracks - 6 Months</TabsTrigger>
                    <TabsTrigger value="recentlyPlayed">Recently Played</TabsTrigger>
                    <TabsTrigger value="savedTracks">Saved Tracks</TabsTrigger>
                  </TabsList>

                  {Object.entries(userTracks).map(([key, tracks]) => (
                    <TabsContent key={key} value={key} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSelectAll(key as keyof typeof userTracks)}
                            disabled={tracks.length === 0}
                          >
                            Select All
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSelectNone(key as keyof typeof userTracks)}
                          >
                            None
                          </Button>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {tracks.length} tracks available
                        </span>
                      </div>
                      
                      {tracks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Music2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No tracks found in this category</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tracks.map((track) => (
                            <TrackCard
                              key={track.id}
                              track={{
                                id: track.id,
                                name: track.name,
                                artist: track.artists.map(a => a.name).join(', '),
                                album: track.album.name,
                                image: track.album.image,
                                duration: `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`,
                                popularity: track.popularity,
                                spotifyUrl: track.external_urls?.spotify,
                                isSelected: selectedTracks.some(t => t.id === track.id)
                              }}
                              selectable
                              onSelect={handleTrackSelect}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {profile && dataSummary && (
                <UserProfile 
                  user={{
                    name: profile.display_name,
                    country: profile.country || '',
                    avatar: profile.images?.[0]?.url,
                    stats: {
                      topTracks: dataSummary.stats?.topTracksCount || 0,
                      topArtists: dataSummary.stats?.topArtistsCount || 0,
                      recentlyPlayed: dataSummary.stats?.recentlyPlayedCount || 0,
                      savedTracks: dataSummary.stats?.savedTracksCount || 0
                    },
                    topGenres: dataSummary.topGenres?.map(([name, count]) => ({ name, count })) || [],
                    recentPlays: dataSummary.recentTracks?.map(track => ({ 
                      track: track.name, 
                      artist: track.artist 
                    })) || []
                  }} 
                  lastUpdated={dataSummary?.profile?.lastUpdated ? new Date(dataSummary.profile.lastUpdated).toLocaleString() : "Never"}
                />
              )}

              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Settings</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Recommendation Count</label>
                      <Select value={recommendationCount} onValueChange={setRecommendationCount}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 tracks</SelectItem>
                          <SelectItem value="20">20 tracks</SelectItem>
                          <SelectItem value="30">30 tracks</SelectItem>
                          <SelectItem value="50">50 tracks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Playlist URL (Optional)</label>
                      <Input 
                        placeholder="https://open.spotify.com/playlist/..."
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                      />
                    </div>

                    <Button 
                      className="w-full spotify-button"
                      disabled={isGenerating || selectedTracks.length === 0}
                      onClick={generateRecommendations}
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Target className="h-4 w-4 mr-2" />
                          Generate Recommendations
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>💡 Select 5-15 tracks for best results</p>
                      <p>🎵 Mix different genres for variety</p>
                      <p>⚡ Process takes 10-30 seconds</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Recommendations View
  return (
    <div className="min-h-screen bg-background">
      <Header 
        isAuthenticated={isAuthenticated}
        userName={profile?.display_name || null}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-foreground flex items-center justify-center">
              <Target className="h-8 w-8 mr-3 text-primary" />
              🎯 Your Custom Recommendations
            </h2>
            <p className="text-lg text-muted-foreground">
              Based on {selectedTracks.length} selected tracks • {recommendations.length} recommendations found
            </p>
          </div>

          {/* Playlist Management */}
          <Card className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Music2 className="h-5 w-5 mr-2 text-primary" />
                  Create New Playlist
                </h3>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="My Awesome Playlist" 
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    className="flex-1" 
                  />
                  <Button 
                    onClick={createPlaylist} 
                    className="spotify-button"
                    disabled={!playlistName.trim() || recommendations.length === 0}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Update Existing Playlist</h3>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="https://open.spotify.com/playlist/..."
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={updatePlaylist}
                    disabled={!playlistUrl.trim() || recommendations.length === 0}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Replace
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Recommendations List */}
          {recommendations.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">No recommendations yet</h3>
                <p>Generate recommendations from the track selection page</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {recommendations.map((track, index) => (
                <div key={`${track.name}-${track.artist}-${index}`} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <TrackCard
                    track={{
                      id: `rec-${index}`,
                      name: track.name,
                      artist: track.artist,
                      album: track.album,
                      duration: `${Math.floor(track.duration)}:${Math.floor((track.duration % 1) * 60).toString().padStart(2, '0')}`,
                      popularity: track.popularity,
                      spotifyUrl: track.external_url
                    }}
                    showPlayButton
                    variant="full"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Back to Selection */}
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView("selection")}
              className="px-8 py-3"
            >
              ← Back to Track Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
};

export default Index;
