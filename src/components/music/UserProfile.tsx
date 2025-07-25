import { User, TrendingUp, Music, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

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

  return (
    <Card className="p-6 animate-slide-up glass-card">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-primary-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">📊 Your Music Profile</h2>
            <p className="text-sm text-muted-foreground">
              {user.name} ({user.country})
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            📈 Library Stats:
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Top Tracks:</span>
                <span className="font-semibold text-foreground">{user.stats.topTracks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Top Artists:</span>
                <span className="font-semibold text-foreground">{user.stats.topArtists}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recently Played:</span>
                <span className="font-semibold text-foreground">{user.stats.recentlyPlayed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Saved Tracks:</span>
                <span className="font-semibold text-foreground">{user.stats.savedTracks}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Genres */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            <Music className="h-5 w-5 mr-2 text-primary" />
            🎵 Top Genres:
          </h3>
          <div className="space-y-2">
            {user.topGenres?.slice(0, 3).map((genre, index) => (
              <div key={genre.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground">• {genre.name}</span>
                  <Badge variant="secondary" className="text-xs">
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
          <h3 className="text-lg font-semibold text-foreground flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" />
            🎤 Recent Plays:
          </h3>
          <div className="space-y-2">
            {user.recentPlays?.slice(0, 3).map((play, index) => (
              <div key={index} className="text-sm">
                <span className="text-foreground">• {play.track}</span>
                <span className="text-muted-foreground"> by {play.artist}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Last Updated */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>
    </Card>
  )
}