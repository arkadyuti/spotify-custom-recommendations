import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { MusicVisualizer } from "@/components/music/MusicVisualizer"
import { LogIn, LogOut, User } from "lucide-react"

interface HeaderProps {
  isAuthenticated?: boolean
  userName?: string | null
  onLogin?: () => void
  onLogout?: () => void
}

export function Header({ isAuthenticated = false, userName, onLogin, onLogout }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center flex-shrink-0">
                <MusicVisualizer className="h-3 md:h-4" />
              </div>
              <h1 className="text-sm md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent truncate overflow-hidden">
                <span className="hidden sm:inline whitespace-nowrap">🎵 Spotify Recommendation Engine</span>
                <span className="sm:hidden whitespace-nowrap">🎵 Spotify Reco</span>
              </h1>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="hidden sm:flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground max-w-[100px] truncate">{userName}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onLogout}
                  className="hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <Button 
                onClick={onLogin}
                size="sm"
                className="spotify-button"
              >
                <LogIn className="h-4 w-4 md:mr-2" />
                <span className="hidden sm:inline">Connect Spotify</span>
                <span className="sm:hidden">Connect</span>
              </Button>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}