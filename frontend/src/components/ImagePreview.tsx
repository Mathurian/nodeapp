import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  XMarkIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline'

export interface ImagePreviewProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  alt?: string
  title?: string
  allowDownload?: boolean
}

/**
 * Full-featured image preview with mobile-optimized gestures
 *
 * Features:
 * - Pinch-to-zoom on mobile
 * - Double-tap to zoom
 * - Pan/drag to move zoomed image
 * - Mouse wheel zoom on desktop
 * - Touch-friendly controls
 * - Download option
 */
export const ImagePreview: React.FC<ImagePreviewProps> = ({
  isOpen,
  onClose,
  imageUrl,
  alt = 'Image preview',
  title,
  allowDownload = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Zoom and pan state
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Touch gesture state
  const [initialDistance, setInitialDistance] = useState<number | null>(null)
  const [initialScale, setInitialScale] = useState(1)
  const [lastTouchPos, setLastTouchPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [lastTapTime, setLastTapTime] = useState(0)

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
      setInitialDistance(null)
      setLastTouchPos(null)
      setIsDragging(false)
    }
  }, [isOpen])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }

    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Calculate distance between two touch points
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 2) {
      // Pinch zoom gesture
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      setInitialDistance(distance)
      setInitialScale(scale)
      setIsDragging(false)
    } else if (e.touches.length === 1) {
      // Pan gesture or double-tap
      const touch = e.touches[0]
      setLastTouchPos({ x: touch.clientX, y: touch.clientY })
      setIsDragging(true)

      // Double-tap detection
      const now = Date.now()
      if (now - lastTapTime < 300) {
        // Double tap - toggle zoom
        if (scale === 1) {
          setScale(2.5)
        } else {
          setScale(1)
          setPosition({ x: 0, y: 0 })
        }
      }
      setLastTapTime(now)
    }
  }, [scale, lastTapTime])

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 2 && initialDistance !== null) {
      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1])
      const scaleChange = currentDistance / initialDistance
      const newScale = Math.max(0.5, Math.min(5, initialScale * scaleChange))
      setScale(newScale)
    } else if (e.touches.length === 1 && isDragging && lastTouchPos && scale > 1) {
      // Pan
      const touch = e.touches[0]
      const dx = touch.clientX - lastTouchPos.x
      const dy = touch.clientY - lastTouchPos.y

      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }))

      setLastTouchPos({ x: touch.clientX, y: touch.clientY })
    }
  }, [initialDistance, initialScale, isDragging, lastTouchPos, scale])

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setInitialDistance(null)
    setLastTouchPos(null)
    setIsDragging(false)
  }, [])

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.5, Math.min(5, scale * delta))
    setScale(newScale)

    if (newScale === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [scale])

  // Zoom controls
  const zoomIn = () => {
    const newScale = Math.min(5, scale * 1.2)
    setScale(newScale)
  }

  const zoomOut = () => {
    const newScale = Math.max(0.5, scale / 1.2)
    setScale(newScale)
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }

  const resetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // Download handler
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = title || 'image'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center safe-area-inset"
      onClick={(e) => {
        if (e.target === containerRef.current) {
          onClose()
        }
      }}
    >
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent safe-area-top">
        <div className="flex-1">
          {title && (
            <h2 className="text-white font-semibold truncate">{title}</h2>
          )}
        </div>

        <div className="flex items-center gap-2">
          {allowDownload && (
            <button
              onClick={handleDownload}
              className="touch-target p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Download image"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="touch-target p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close preview"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={alt}
          className="max-w-full max-h-full object-contain transition-transform"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            cursor: scale > 1 ? 'grab' : 'default',
          }}
          draggable={false}
        />
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-2 p-4 bg-gradient-to-t from-black/50 to-transparent safe-area-bottom">
        <button
          onClick={zoomOut}
          disabled={scale <= 0.5}
          className="touch-target p-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          aria-label="Zoom out"
        >
          <MagnifyingGlassMinusIcon className="w-5 h-5" />
        </button>

        <button
          onClick={resetZoom}
          disabled={scale === 1}
          className="touch-target px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          aria-label="Reset zoom"
        >
          <div className="flex items-center gap-2">
            <ArrowsPointingOutIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </button>

        <button
          onClick={zoomIn}
          disabled={scale >= 5}
          className="touch-target p-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          aria-label="Zoom in"
        >
          <MagnifyingGlassPlusIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions (show on first load) */}
      {scale === 1 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg bg-black/70 text-white text-sm fade-in">
          <p className="hidden sm:block">Use mouse wheel to zoom • Click and drag to pan</p>
          <p className="sm:hidden">Pinch to zoom • Double-tap to zoom • Drag to pan</p>
        </div>
      )}
    </div>,
    document.body
  )
}
