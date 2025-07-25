import { useState } from "react"
import { Play, Pause, Heart, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import albumPlaceholder from "@/assets/album-placeholder.jpg"

interface TrackCardProps {
  track: {
    id: string
    name: string
    artist: string
    album: string
    image?: string
    duration: string
    popularity: number
    spotifyUrl?: string
    isSelected?: boolean
  }
  selectable?: boolean
  onSelect?: (id: string, selected: boolean) => void
  showPlayButton?: boolean
  variant?: "compact" | "full"
}

export function TrackCard({ 
  track, 
  selectable = false, 
  onSelect, 
  showPlayButton = true,
  variant = "full" 
}: TrackCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const getPopularityColor = (popularity: number) => {
    if (popularity >= 80) return "bg-music-popularity-high"
    if (popularity >= 50) return "bg-music-popularity-medium"
    return "bg-music-popularity-low"
  }

  const isCompact = variant === "compact"

  return (
    <div className={`music-card group ${isCompact ? 'p-3' : 'p-4'} animate-fade-in`}>
      <div className="flex items-center space-x-4">
        {selectable && (
          <Checkbox
            checked={track.isSelected}
            onCheckedChange={(checked) => onSelect?.(track.id, checked as boolean)}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        )}
        
        <div className={`relative ${isCompact ? 'w-12 h-12' : 'w-16 h-16'} flex-shrink-0`}>
          <img
            src={track.image || albumPlaceholder}
            alt={`${track.album} cover`}
            className="w-full h-full object-cover rounded-lg"
          />
          {showPlayButton && (
            <Button
              size="icon"
              onClick={handlePlayPause}
              className={`absolute inset-0 m-auto w-8 h-8 rounded-full bg-primary/90 hover:bg-primary opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 ${
                isPlaying ? 'opacity-100' : ''
              }`}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Play className="h-4 w-4 text-primary-foreground" />
              )}
            </Button>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-foreground truncate ${isCompact ? 'text-sm' : 'text-base'}`}>
            {track.name}
          </h3>
          <p className={`text-muted-foreground truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
            by {track.artist}
          </p>
          {!isCompact && (
            <p className="text-xs text-muted-foreground truncate">
              {track.album}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {!isCompact && (
            <>
              <div className="text-xs text-muted-foreground">
                {track.duration}
              </div>
              <div className="flex flex-col items-end space-y-1">
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getPopularityColor(track.popularity)} rounded-full`}
                    style={{ width: `${track.popularity}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {track.popularity}%
                </span>
              </div>
            </>
          )}
          
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsLiked(!isLiked)}
              className="h-8 w-8 hover:bg-music-card-hover"
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>
            
            {track.spotifyUrl && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => window.open(track.spotifyUrl, '_blank')}
                className="h-8 w-8 hover:bg-music-card-hover"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}