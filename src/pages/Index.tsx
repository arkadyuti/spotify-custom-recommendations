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
import { SearchTracks } from "@/components/music/SearchTracks"
import { MusicVisualizer } from "@/components/music/MusicVisualizer"
import { WaitlistForm } from "@/components/auth/WaitlistForm"
import { WaitlistStatus } from "@/components/auth/WaitlistStatus"
import { useAuth } from "@/contexts/AuthContext"
import { apiService, type Track, type FormattedTrack, type RecommendationResponse, type UserPlaylist } from "@/services/api"
import { Zap, Music2, Settings, Target, CheckCircle, RefreshCw, Loader2, Search } from "lucide-react"
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
  const [currentView, setCurrentView] = useState<"landing" | "waitlist" | "selection" | "recommendations">("landing")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCollectingData, setIsCollectingData] = useState(false)
  const [isUpdatingPlaylist, setIsUpdatingPlaylist] = useState(false)
  const [recommendationCount, setRecommendationCount] = useState("20")
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [playlistName, setPlaylistName] = useState("")
  const [updatedPlaylistUrl, setUpdatedPlaylistUrl] = useState("")
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("")
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false)
  const [recommendations, setRecommendations] = useState<FormattedTrack[]>([])
  const [searchedTracks, setSearchedTracks] = useState<Track[]>([])
  const [activeTab, setActiveTab] = useState("topTracksShort")
  const [searchQuery, setSearchQuery] = useState("")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  
  // Waitlist state
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false)
  const [waitlistEmail, setWaitlistEmail] = useState<string>('')
  const [waitlistStatus, setWaitlistStatus] = useState<'pending' | 'approved' | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [, forceUpdate] = useState(0)
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
    } else if (!isAuthenticated && currentView !== "landing" && currentView !== "waitlist") {
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
        .then(tracks => {
          setUserTracks(tracks)
        })
        .catch(error => console.log('No tracks data available yet'))
    }
  }, [isAuthenticated, profile])

  // Set last sync time from data summary
  useEffect(() => {
    if (dataSummary?.profile?.lastUpdated) {
      setLastSyncTime(new Date(dataSummary.profile.lastUpdated))
    }
  }, [dataSummary])

  // Force re-render every 30 seconds to check if sync is needed
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSyncTime) {
        // Force a re-render
        forceUpdate(prev => prev + 1)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [lastSyncTime])

  // Initialize waitlist state from localStorage
  useEffect(() => {
    const initializeWaitlist = async () => {
      const onboarded = localStorage.getItem('hasOnboarded') === 'true'
      const email = localStorage.getItem('userEmail')
      
      setHasOnboarded(onboarded)
      
      if (onboarded && email) {
        setWaitlistEmail(email)
        
        // Check current status
        setIsCheckingStatus(true)
        try {
          const response = await fetch(`/api/waitlist/status/${encodeURIComponent(email)}`)
          if (response.ok) {
            const data = await response.json()
            setWaitlistStatus(data.status)
          } else if (response.status === 404) {
            // Email not found, reset onboarding
            localStorage.removeItem('hasOnboarded')
            localStorage.removeItem('userEmail')
            setHasOnboarded(false)
            setWaitlistEmail('')
          }
        } catch (error) {
          console.error('Error checking waitlist status:', error)
        } finally {
          setIsCheckingStatus(false)
        }
      }
    }

    if (!isAuthenticated) {
      initializeWaitlist()
    }
  }, [isAuthenticated])

  // Load playlists when recommendations are generated
  useEffect(() => {
    if (currentView === "recommendations" && isAuthenticated && userPlaylists.length === 0) {
      loadUserPlaylists()
    }
  }, [currentView, isAuthenticated])

  // Check if sync is needed (more than 2 days ago)
  const isSyncNeeded = () => {
    if (!lastSyncTime) return false
    const now = new Date()
    const diffMs = now.getTime() - lastSyncTime.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays > 2
  }

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

  // Waitlist handlers
  const handleEmailSubmitted = async (email: string, status: 'pending' | 'approved') => {
    setHasOnboarded(true)
    setWaitlistEmail(email)
    setWaitlistStatus(status)
    
    toast({
      title: status === 'approved' ? "🎉 You're approved!" : "✅ Joined waitlist",
      description: status === 'approved' 
        ? "You can now connect with Spotify to get started."
        : "We'll review your application and notify you when approved.",
    })
  }

  const handleSpotifyConnect = async () => {
    await handleLogin()
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
      setLastSyncTime(new Date())
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

  const handleTrackSelect = (trackId: string, selected: boolean, searchTrack?: Track) => {
    if (selected) {
      // First check if it's already selected
      if (selectedTracks.some(t => t.id === trackId)) return

      // If we have a search track, use it directly
      if (searchTrack) {
        setSelectedTracks([...selectedTracks, searchTrack])
        // Also add to searchedTracks if not already there
        if (!searchedTracks.some(t => t.id === searchTrack.id)) {
          setSearchedTracks([...searchedTracks, searchTrack])
        }
        return
      }

      // Otherwise try to find track in user tracks
      const track = Object.values(userTracks).flat().find(t => t.id === trackId)
      if (track) {
        setSelectedTracks([...selectedTracks, track])
        return
      }

      console.warn(`Track ${trackId} not found in user tracks`)
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

  const loadUserPlaylists = async () => {
    if (!isAuthenticated) return

    setIsLoadingPlaylists(true)
    try {
      const response = await apiService.getUserPlaylists()
      setUserPlaylists(response.playlists)
    } catch (error) {
      console.error('Failed to load playlists:', error)
      toast({
        title: "❌ Failed to load playlists",
        description: "Could not fetch your playlists. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingPlaylists(false)
    }
  }

  const updatePlaylist = async () => {
    const playlistId = selectedPlaylist || playlistUrl.trim()
    
    if (!playlistId) {
      toast({
        title: "⚠️ Playlist required",
        description: "Please select a playlist or enter a URL.",
        variant: "destructive"
      })
      return
    }

    setIsUpdatingPlaylist(true)
    try {
      const response = await apiService.updatePlaylist(playlistId, recommendations)
      const selectedPlaylistData = userPlaylists.find(p => p.id === playlistId)
      setUpdatedPlaylistUrl(selectedPlaylistData?.external_url || playlistUrl)
      
      toast({
        title: "🔄 Playlist updated!",
        description: `"${response.playlist_name}" has been updated with ${response.tracks_added} new tracks.`,
      })
    } catch (error) {
      console.error('Failed to update playlist:', error)
      toast({
        title: "❌ Playlist update failed",
        description: "Could not update playlist. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingPlaylist(false)
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
      <div className="min-h-screen bg-background sm:overflow-x-auto overflow-x-hidden">
        <Header 
          isAuthenticated={isAuthenticated}
          userName={profile?.display_name || null}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onWaitlistClick={() => setCurrentView("waitlist")}
          waitlistState={{
            hasOnboarded,
            status: waitlistStatus
          }}
        />
        
        <div 
          className="relative min-h-[60vh] sm:min-h-[70vh] lg:min-h-[80vh] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBackground})` }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative container mx-auto px-4 py-8 sm:py-12 lg:py-20">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                {/* Left Panel - Hero Content */}
                <div className="space-y-6 sm:space-y-8 animate-slide-up text-center lg:text-left">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center lg:justify-start space-x-2">
                      <MusicVisualizer className="h-6 sm:h-8" />
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs sm:text-sm">
                        <span className="hidden sm:inline">AI-Powered Music Discovery</span>
                        <span className="sm:hidden">AI Music Discovery</span>
                      </Badge>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                      <span className="block sm:inline">Discover Your</span>
                      <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                        {" "}Next Favorite
                      </span>
                      {" "}Songs
                    </h1>
                    <p className="text-base sm:text-lg lg:text-xl text-gray-200 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                      Get personalized Spotify recommendations based on your listening history. 
                      Our AI analyzes your music taste to find hidden gems you'll love.
                    </p>
                  </div>

                  {/* Conditional content based on waitlist state */}
                  {isCheckingStatus ? (
                    <div className="flex items-center justify-center lg:justify-start space-x-2 text-gray-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Checking status...</span>
                    </div>
                  ) : !hasOnboarded ? (
                    <div className="space-y-4">
                      <Button 
                        onClick={() => setCurrentView("waitlist")}
                        size="lg"
                        className="spotify-button text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 animate-glow w-full sm:w-auto"
                      >
                        <Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Join Waitlist
                      </Button>
                      <p className="text-xs sm:text-sm text-gray-300 text-center lg:text-left">
                        <span className="block sm:inline">• Early access program</span>
                        <span className="block sm:inline"> • No spam, just updates</span>
                        <span className="block sm:inline"> • Exclusive beta features</span>
                      </p>
                    </div>
                  ) : waitlistStatus === 'approved' ? (
                    <div className="space-y-4">
                      <Button 
                        onClick={handleSpotifyConnect}
                        size="lg"
                        className="spotify-button text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 animate-glow w-full sm:w-auto"
                      >
                        <Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Connect with Spotify
                      </Button>
                      <p className="text-xs sm:text-sm text-green-300 text-center lg:text-left">
                        <span className="block sm:inline">✅ You're approved!</span>
                        <span className="block sm:inline"> • Secure OAuth connection</span>
                        <span className="block sm:inline"> • Instant recommendations</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-yellow-300 text-center lg:text-left">
                          <span className="block">⏳ You're on the waitlist!</span>
                          <span className="block text-sm mt-1">We'll notify you when you're approved.</span>
                        </p>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 text-center lg:text-left">
                        Already approved? Refresh this page to continue.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 sm:pt-8">
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl font-bold text-white">10M+</div>
                      <div className="text-xs sm:text-sm text-gray-300">Songs Analyzed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl font-bold text-white">95%</div>
                      <div className="text-xs sm:text-sm text-gray-300">Accuracy Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-2xl font-bold text-white">AI</div>
                      <div className="text-xs sm:text-sm text-gray-300">Powered</div>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Preview Card */}
                <div className="animate-fade-in mt-8 lg:mt-0">
                  <Card className="p-4 sm:p-6 glass-card">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-primary" />
                        <h3 className="text-base sm:text-lg font-semibold">How it works</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">1</div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm sm:text-base">Connect your Spotify</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">Secure OAuth authentication</div>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">2</div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm sm:text-base">Select your favorite tracks</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">From your top songs and playlists</div>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">3</div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm sm:text-base">Get AI recommendations</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">Personalized just for your taste</div>
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

  // Waitlist View
  if (currentView === "waitlist") {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          isAuthenticated={isAuthenticated}
          userName={profile?.display_name || null}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onWaitlistClick={() => setCurrentView("waitlist")}
          waitlistState={{
            hasOnboarded,
            status: waitlistStatus
          }}
        />
        
        <div 
          className="relative min-h-[80vh] bg-cover bg-center bg-no-repeat flex items-center justify-center"
          style={{ backgroundImage: `url(${heroBackground})` }}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative container mx-auto px-4 py-12">
            <div className="max-w-lg mx-auto">
              {!hasOnboarded ? (
                <WaitlistForm onEmailSubmitted={handleEmailSubmitted} />
              ) : (
                <WaitlistStatus 
                  email={waitlistEmail}
                  status={waitlistStatus || 'pending'}
                  onSpotifyConnect={waitlistStatus === 'approved' ? handleSpotifyConnect : undefined}
                />
              )}
              
              <div className="mt-8 text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentView("landing")}
                  className="text-gray-300 hover:text-white"
                >
                  ← Back to Home
                </Button>
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
      <div className="min-h-screen bg-background sm:overflow-x-auto overflow-x-hidden">
        <Header 
          isAuthenticated={isAuthenticated}
          userName={profile?.display_name || null}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onWaitlistClick={() => setCurrentView("waitlist")}
          waitlistState={{
            hasOnboarded,
            status: waitlistStatus
          }}
        />
        
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Main Content - Track Selection */}
            <div className="lg:col-span-3 space-y-4 sm:space-y-6 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Select Your Tracks</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">Choose tracks that represent your music taste</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <Badge variant="secondary" className="text-sm sm:text-base px-3 py-1 sm:px-4 sm:py-2 w-fit">
                    {selectedTracks.length} selected
                  </Badge>
                  <Button 
                    variant={isSyncNeeded() ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCollectData(true)}
                    disabled={isCollectingData}
                    className={`w-full sm:w-auto transition-all ${
                      isSyncNeeded() 
                        ? 'animate-pulse-glow shadow-lg shadow-primary/50' 
                        : ''
                    }`}
                    style={isSyncNeeded() ? {
                      animation: 'pulseGlow 2s ease-in-out infinite',
                      boxShadow: '0 0 20px hsl(141 73% 42% / 0.8)'
                    } : {}}
                  >
                    {isCollectingData ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Syncing...</span>
                        <span className="sm:hidden">Sync...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncNeeded() ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">
                          {isSyncNeeded() ? '⚡ Sync Data Now!' : 'Sync Data'}
                        </span>
                        <span className="sm:hidden">
                          {isSyncNeeded() ? '⚡ Sync!' : 'Sync'}
                        </span>
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
                <div className="space-y-4 sm:space-y-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                    <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto">
                    <TabsTrigger value="topTracksShort" className="text-xs sm:text-sm p-2 min-w-0">
                      <span className="hidden sm:inline truncate">Top Tracks - 4 Weeks</span>
                      <span className="sm:hidden truncate">Top - 4W</span>
                    </TabsTrigger>
                    <TabsTrigger value="topTracksMedium" className="text-xs sm:text-sm p-2 min-w-0">
                      <span className="hidden sm:inline truncate">Top Tracks - 6 Months</span>
                      <span className="sm:hidden truncate">Top - 6M</span>
                    </TabsTrigger>
                    <TabsTrigger value="recentlyPlayed" className="text-xs sm:text-sm p-2 min-w-0">
                      <span className="hidden sm:inline truncate">Recently Played</span>
                      <span className="sm:hidden truncate">Recent</span>
                    </TabsTrigger>
                    <TabsTrigger value="savedTracks" className="text-xs sm:text-sm p-2 min-w-0">
                      <span className="hidden sm:inline truncate">Saved Tracks</span>
                      <span className="sm:hidden truncate">Saved</span>
                    </TabsTrigger>
                    <TabsTrigger value="search" className="text-xs sm:text-sm p-2 min-w-0">
                      <span className="hidden sm:inline truncate">Search</span>
                      <span className="sm:hidden truncate">Search</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Global Search Input */}
                  <Card className="p-4 sm:p-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <h3 className="text-base sm:text-lg font-semibold">Search Spotify</h3>
                      </div>
                      
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search for songs, artists, or albums..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => setActiveTab("search")}
                          className="pl-10 pr-20 text-sm sm:text-base"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("")
                              setActiveTab("topTracksShort")
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>

                  {Object.entries(userTracks).map(([key, tracks]) => (
                    <TabsContent key={key} value={key} className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSelectAll(key as keyof typeof userTracks)}
                            disabled={tracks.length === 0}
                            className="text-xs sm:text-sm"
                          >
                            Select All
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSelectNone(key as keyof typeof userTracks)}
                            className="text-xs sm:text-sm"
                          >
                            None
                          </Button>
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">
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

                  <TabsContent value="search" className="space-y-4">
                    <SearchTracks
                      selectedTracks={selectedTracks}
                      onTrackSelect={handleTrackSelect}
                      searchedTracks={searchedTracks}
                      onSearchedTracksUpdate={setSearchedTracks}
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                    />
                  </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6 order-first lg:order-last">
              {/* User Profile - First on mobile, stays on mobile */}
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

              {/* Settings Card - Always visible */}
              <Card className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <h3 className="text-base sm:text-lg font-semibold">Settings</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium">Recommendation Count</label>
                      <Select value={recommendationCount} onValueChange={setRecommendationCount}>
                        <SelectTrigger className="text-sm">
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
                      <label className="text-xs sm:text-sm font-medium">Playlist URL (Optional)</label>
                      <Input 
                        placeholder="https://open.spotify.com/playlist/..."
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <Button 
                      className="w-full spotify-button text-sm sm:text-base"
                      disabled={isGenerating || selectedTracks.length === 0}
                      onClick={generateRecommendations}
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          <span className="hidden sm:inline">Generating...</span>
                          <span className="sm:hidden">Gen...</span>
                        </>
                      ) : (
                        <>
                          <Target className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Generate Recommendations</span>
                          <span className="sm:hidden">Generate</span>
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
    <div className="min-h-screen bg-background sm:overflow-x-auto overflow-x-hidden">
      <Header 
        isAuthenticated={isAuthenticated}
        userName={profile?.display_name || null}
        onLogin={handleLogin}
        onLogout={handleLogout}
        waitlistState={{
          hasOnboarded,
          status: waitlistStatus
        }}
      />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground flex items-center justify-center flex-wrap">
              <Target className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3 text-primary flex-shrink-0" />
              <span className="break-words">🎯 Your Custom Recommendations</span>
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground px-4">
              <span className="block sm:inline">Based on {selectedTracks.length} selected tracks</span>
              <span className="hidden sm:inline"> • </span>
              <span className="block sm:inline">{recommendations.length} recommendations found</span>
            </p>
          </div>

          {/* Playlist Management */}
          <Card className="p-4 sm:p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center">
                  <Music2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                  Create New Playlist
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                  <Input 
                    placeholder="My Awesome Playlist" 
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    className="flex-1 text-sm sm:text-base" 
                  />
                  <Button 
                    onClick={createPlaylist} 
                    className="spotify-button w-full sm:w-auto text-sm sm:text-base"
                    disabled={!playlistName.trim() || recommendations.length === 0}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Create</span>
                    <span className="sm:hidden">Create Playlist</span>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Update Existing Playlist</h3>
                
                {/* Playlist Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Select a playlist:</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadUserPlaylists}
                      disabled={isLoadingPlaylists}
                      className="text-xs"
                    >
                      {isLoadingPlaylists ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Refresh
                    </Button>
                  </div>
                  
                  <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                    <SelectTrigger className="text-sm sm:text-base">
                      <SelectValue placeholder={isLoadingPlaylists ? "Loading playlists..." : "Choose a playlist"} />
                    </SelectTrigger>
                    <SelectContent>
                      {userPlaylists.map((playlist) => (
                        <SelectItem key={playlist.id} value={playlist.id}>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{playlist.name}</span>
                            <span className="text-xs text-muted-foreground">({playlist.tracks_total} tracks)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Or URL Input */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Or paste playlist URL:</label>
                  <Input 
                    placeholder="https://open.spotify.com/playlist/..."
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    onClick={updatePlaylist}
                    disabled={(!selectedPlaylist && !playlistUrl.trim()) || recommendations.length === 0 || isUpdatingPlaylist}
                    className="w-full sm:w-auto text-sm sm:text-base"
                  >
                    {isUpdatingPlaylist ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    <span className="hidden sm:inline">
                      {isUpdatingPlaylist ? "Updating..." : "Replace Tracks"}
                    </span>
                    <span className="sm:hidden">
                      {isUpdatingPlaylist ? "Updating..." : "Update"}
                    </span>
                  </Button>
                  {updatedPlaylistUrl && (
                    <Button 
                      variant="default" 
                      onClick={() => window.open(updatedPlaylistUrl, '_blank')}
                      className="w-full sm:w-auto text-sm sm:text-base"
                    >
                      <Music2 className="h-4 w-4 mr-2" />
                      Open in Spotify
                    </Button>
                  )}
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
          <div className="text-center pt-4">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView("selection")}
              className="px-6 py-2 sm:px-8 sm:py-3 text-sm sm:text-base w-full sm:w-auto"
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
