'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Photo } from '../types'

interface SlideshowModalProps {
  photos: Photo[]
  currentIndex: number
  onClose: () => void
  onIndexChange: (index: number) => void
  filter: string
}

export default function SlideshowModal({
  photos,
  currentIndex,
  onClose,
  onIndexChange,
  filter,
}: SlideshowModalProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [interval, setIntervalTime] = useState(3000)

  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      onIndexChange((currentIndex + 1) % photos.length)
    }, interval)

    return () => clearInterval(timer)
  }, [isPlaying, currentIndex, photos.length, interval, onIndexChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onIndexChange((currentIndex - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') onIndexChange((currentIndex + 1) % photos.length)
      if (e.key === ' ') {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, photos.length, isPlaying, onClose, onIndexChange])

  const currentPhoto = photos[currentIndex]

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10 flex items-center justify-between">
        <div className="text-white">
          <h3 className="font-bold text-lg">{currentPhoto.title}</h3>
          <p className="text-sm text-white/70">
            {currentIndex + 1} / {photos.length}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white text-3xl hover:text-pink-400 transition-colors"
        >
          ×
        </button>
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Image
          src={currentPhoto.url}
          alt={currentPhoto.title}
          width={1200}
          height={800}
          className="max-w-full max-h-full object-contain transition-all duration-500"
          style={{ filter }}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => onIndexChange((currentIndex - 1 + photos.length) % photos.length)}
            className="text-white text-2xl hover:text-pink-400 transition-colors p-2"
          >
            ⏮️
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-white text-3xl hover:text-pink-400 transition-colors p-2"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button
            onClick={() => onIndexChange((currentIndex + 1) % photos.length)}
            className="text-white text-2xl hover:text-pink-400 transition-colors p-2"
          >
            ⏭️
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center justify-center gap-2 text-white text-sm">
          <span>速度:</span>
          {[2000, 3000, 5000].map((speed) => (
            <button
              key={speed}
              onClick={() => setIntervalTime(speed)}
              className={`px-3 py-1 rounded-full ${
                interval === speed ? 'bg-pink-500' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {speed / 1000}s
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1 mt-4 justify-center">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              className={`h-1 rounded-full transition-all ${
                i === currentIndex ? 'w-8 bg-pink-500' : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
