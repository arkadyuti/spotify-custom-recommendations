import { useState } from 'react'
import { Mail, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface WaitlistFormProps {
  onEmailSubmitted: (email: string, status: 'pending' | 'approved') => void
}

export function WaitlistForm({ onEmailSubmitted }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store in localStorage
        localStorage.setItem('hasOnboarded', 'true')
        localStorage.setItem('userEmail', email.trim().toLowerCase())
        
        // Notify parent component
        onEmailSubmitted(email.trim().toLowerCase(), data.status)
      } else {
        setError(data.error || 'Failed to join waitlist')
      }
    } catch (error) {
      console.error('Error submitting email:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Mail className="h-6 w-6 text-primary" />
          <Badge className="bg-primary/20 text-primary border-primary/30">
            Early Access
          </Badge>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Join the Waitlist
          </h2>
          <p className="text-base sm:text-lg text-gray-200 max-w-md mx-auto">
            Get early access to advanced music discovery. We'll notify you when you're approved!
          </p>
        </div>
      </div>

      <Card className="p-6 glass-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              className="text-base h-12"
              disabled={isLoading}
            />
            {error && (
              <p className="text-sm text-red-400 animate-slide-up">
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold spotify-button animate-glow"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining Waitlist...
              </>
            ) : (
              <>
                Join Waitlist
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            • Secure and private • No spam • Early access only
          </p>
        </div>
      </Card>
    </div>
  )
}