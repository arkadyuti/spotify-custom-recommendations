import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TrackCard } from "./TrackCard"
import { apiService, type Track } from "@/services/api"
import { Search, Loader2, Music2, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SearchTracksProps {
  selectedTracks: Track[]
  onTrackSelect: (trackId: string, selected: boolean, track?: Track) => void
  searchedTracks: Track[]
  onSearchedTracksUpdate: (tracks: Track[]) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

export function SearchTracks({ 
  selectedTracks, 
  onTrackSelect, 
  searchedTracks, 
  onSearchedTracksUpdate,
  searchQuery,
  onSearchQueryChange 
}: SearchTracksProps) {
  const { toast } = useToast()
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('spotify-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading recent searches:', error)
      }
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return

    setRecentSearches(prev => {
      const updated = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, 5)
      localStorage.setItem('spotify-recent-searches', JSON.stringify(updated))
      return updated
    })
  }, [])

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchPerformed(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await apiService.searchTracks(query.trim(), 30)
      setSearchResults(response.tracks)
      setSearchPerformed(true)
      saveRecentSearch(query.trim())
      
      // Add new tracks to searchedTracks (avoiding duplicates)
      const existingIds = new Set(searchedTracks.map(t => t.id))
      const newTracks = response.tracks.filter(t => !existingIds.has(t.id))
      if (newTracks.length > 0) {
        onSearchedTracksUpdate([...searchedTracks, ...newTracks])
      }
    } catch (error) {
      console.error('Search failed:', error)
      toast({
        title: "❌ Search failed",
        description: "Could not search for tracks. Please try again.",
        variant: "destructive"
      })
      setSearchResults([])
      setSearchPerformed(true)
    } finally {
      setIsSearching(false)
    }
  }, [toast, saveRecentSearch, searchedTracks, onSearchedTracksUpdate])

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery)
      } else {
        setSearchResults([])
        setSearchPerformed(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, performSearch])

  const handleRecentSearchClick = (query: string) => {
    onSearchQueryChange(query)
  }

  // Get selected tracks that were found through search
  const selectedSearchTracks = searchedTracks.filter(track => 
    selectedTracks.some(selected => selected.id === track.id)
  )

  // Combine current search results with previously selected tracks
  const displayTracks = searchPerformed 
    ? [...searchResults, ...selectedSearchTracks.filter(t => !searchResults.some(r => r.id === t.id))]
    : selectedSearchTracks

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Recent Searches */}
      {recentSearches.length > 0 && !searchQuery && (
        <Card className="p-4 sm:p-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Recent Searches</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecentSearchClick(search)}
                  className="text-xs sm:text-sm h-7 px-2 sm:px-3"
                >
                  {search}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {isSearching ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold">Searching...</h3>
            <p>Finding tracks for "{searchQuery}"</p>
          </div>
        </Card>
      ) : searchPerformed || selectedSearchTracks.length > 0 ? (
        displayTracks.length === 0 && searchPerformed ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <Music2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold">No results found</h3>
              <p>Try a different search term or check your spelling</p>
            </div>
          </Card>
        ) : displayTracks.length > 0 ? (
          <div className="space-y-4">
            {searchPerformed && (
              <div className="flex items-center justify-between">
                <h4 className="text-sm sm:text-base font-medium">
                  Found {searchResults.length} tracks for "{searchQuery}"
                  {selectedSearchTracks.length > 0 && searchResults.length > 0 && 
                    ` (+ ${selectedSearchTracks.filter(t => !searchResults.some(r => r.id === t.id)).length} selected)`}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    searchResults.forEach(track => {
                      if (!selectedTracks.some(t => t.id === track.id)) {
                        onTrackSelect(track.id, true, track)
                      }
                    })
                  }}
                  className="text-xs sm:text-sm"
                >
                  Select All
                </Button>
              </div>
            )}
            
            {!searchPerformed && selectedSearchTracks.length > 0 && (
              <div className="flex items-center justify-between">
                <h4 className="text-sm sm:text-base font-medium">
                  {selectedSearchTracks.length} selected tracks from search
                </h4>
              </div>
            )}
            
            <div className="space-y-2">
              {displayTracks.map((track) => {
                const isFromCurrentSearch = searchResults.some(r => r.id === track.id)
                return (
                  <div key={track.id} className="relative">
                    {!isFromCurrentSearch && searchPerformed && (
                      <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                    )}
                    <TrackCard
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
                      onSelect={(trackId, selected) => onTrackSelect(trackId, selected, track)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ) : null
      ) : (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Search for tracks</h3>
            <p>Find any song on Spotify to add to your recommendations</p>
          </div>
        </Card>
      )}
    </div>
  )
}