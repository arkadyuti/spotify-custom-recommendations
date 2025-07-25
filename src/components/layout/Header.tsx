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
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <MusicVisualizer className="h-4" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                🎵 Spotify Recommendation Engine
              </h1>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{userName}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onLogout}
                  className="hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button 
                onClick={onLogin}
                className="spotify-button"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Connect Spotify
              </Button>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}