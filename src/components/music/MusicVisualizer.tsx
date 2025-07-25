import { useEffect, useState } from "react"

interface MusicVisualizerProps {
  isPlaying?: boolean
  className?: string
}

export function MusicVisualizer({ isPlaying = true, className = "" }: MusicVisualizerProps) {
  const [bars, setBars] = useState<number[]>([])

  useEffect(() => {
    const generateBars = () => {
      return Array.from({ length: 5 }, () => Math.random() * 100 + 20)
    }

    setBars(generateBars())

    if (isPlaying) {
      const interval = setInterval(() => {
        setBars(generateBars())
      }, 300)

      return () => clearInterval(interval)
    }
  }, [isPlaying])

  return (
    <div className={`flex items-end space-x-1 h-6 ${className}`}>
      {bars.map((height, index) => (
        <div
          key={index}
          className={`w-1 bg-gradient-to-t from-primary to-primary-glow rounded-full transition-all duration-300 ${
            isPlaying ? 'animate-pulse-music' : ''
          }`}
          style={{ 
            height: `${height}%`,
            animationDelay: `${index * 0.1}s`
          }}
        />
      ))}
    </div>
  )
}