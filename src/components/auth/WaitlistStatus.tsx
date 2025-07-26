import { CheckCircle, Clock, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface WaitlistStatusProps {
  email: string
  status: 'pending' | 'approved'
  onSpotifyConnect?: () => void
}

export function WaitlistStatus({ email, status, onSpotifyConnect }: WaitlistStatusProps) {
  if (status === 'approved') {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-400" />
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              Approved
            </Badge>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              You're Approved! 🎉
            </h2>
            <p className="text-base sm:text-lg text-gray-200 max-w-md mx-auto">
              Welcome to the beta program! You can now connect your Spotify account to get started.
            </p>
          </div>
        </div>

        <Card className="p-6 glass-card text-center">
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Approved email: <span className="text-primary font-medium">{email}</span>
            </p>
            
            <Button
              onClick={onSpotifyConnect}
              size="lg"
              className="w-full spotify-button text-base font-semibold animate-glow"
            >
              <Zap className="h-4 w-4 mr-2" />
              Connect with Spotify
            </Button>

            <p className="text-xs text-gray-400">
              • Secure OAuth connection • Instant recommendations • No data stored
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Clock className="h-6 w-6 text-yellow-400" />
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Pending Review
          </Badge>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Thanks for Joining! ⏳
          </h2>
          <p className="text-base sm:text-lg text-gray-200 max-w-md mx-auto">
            You're on the waitlist! We'll review your application and notify you when you're approved.
          </p>
        </div>
      </div>

      <Card className="p-6 glass-card text-center">
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Email submitted: <span className="text-primary font-medium">{email}</span>
          </p>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              🔍 Your application is under review
            </p>
            <p className="text-sm text-gray-400">
              📧 We'll email you when you're approved
            </p>
            <p className="text-sm text-gray-400">
              ⚡ This usually takes 1-2 business days
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-gray-500">
              Already approved? Refresh this page to continue.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}