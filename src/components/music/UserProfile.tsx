import { useState } from "react"
import { User, TrendingUp, Music, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface UserProfileProps {
  user: {
    name: string
    country: string
    avatar?: string
    stats: {
      topTracks: number
      topArtists: number
      recentlyPlayed: number
      savedTracks: number
    }
    topGenres: Array<{ name: string; count: number }>
    recentPlays: Array<{ track: string; artist: string }>
  }
  lastUpdated: string
}

export function UserProfile({ user, lastUpdated }: UserProfileProps) {
  const totalGenreCount = user.topGenres?.reduce((sum, genre) => sum + genre.count, 0) || 0
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="p-4 sm:p-6 animate-slide-up glass-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full p-0 h-auto hover:bg-transparent">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center flex-shrink-0">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  )}
                </div>
                <div className="text-left min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground truncate">
                    <span className="hidden sm:inline">📊 Your Music Profile</span>
                    <span className="sm:hidden">📊 Profile</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {user.name} {user.country && `(${user.country})`}
                  </p>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">

          {/* Stats */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
              <span className="hidden sm:inline">📈 Library Stats:</span>
              <span className="sm:hidden">📈 Stats:</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Top Tracks:</span>
                  <span className="font-semibold text-foreground text-xs sm:text-sm">{user.stats.topTracks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Top Artists:</span>
                  <span className="font-semibold text-foreground text-xs sm:text-sm">{user.stats.topArtists}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Recently Played:</span>
                  <span className="font-semibold text-foreground text-xs sm:text-sm">{user.stats.recentlyPlayed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Saved Tracks:</span>
                  <span className="font-semibold text-foreground text-xs sm:text-sm">{user.stats.savedTracks}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Genres */}
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center">
              <Music className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
              <span className="hidden sm:inline">🎵 Top Genres:</span>
              <span className="sm:hidden">🎵 Genres:</span>
            </h3>
            <div className="space-y-2">
              {user.topGenres?.slice(0, 3).map((genre, index) => (
                <div key={genre.name} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-foreground truncate mr-2">• {genre.name}</span>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {genre.count}
                    </Badge>
                  </div>
                  <Progress 
                    value={(genre.count / totalGenreCount) * 100} 
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Plays */}
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
              <span className="hidden sm:inline">🎤 Recent Plays:</span>
              <span className="sm:hidden">🎤 Recent:</span>
            </h3>
            <div className="space-y-2">
              {user.recentPlays?.slice(0, 3).map((play, index) => (
                <div key={index} className="text-xs sm:text-sm">
                  <div className="truncate">
                    <span className="text-foreground">• {play.track}</span>
                    <span className="text-muted-foreground block sm:inline sm:ml-1">by {play.artist}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last Updated */}
          <div className="pt-3 sm:pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}