'use client'

import { useEffect } from 'react'

export default function HeartParticles() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const activeHearts = new Set<HTMLDivElement>()
    const removalTimers = new Set<ReturnType<typeof setTimeout>>()

    const createHeart = (x: number, y: number) => {
      const size = Math.random() * 20 + 10
      const duration = Math.random() * 1000 + 1000

      const heartEl = document.createElement('div')
      heartEl.className = 'heart-particle'
      heartEl.textContent = ['❤️', '💕', '💖', '💗', '💝'][Math.floor(Math.random() * 5)]
      heartEl.style.left = `${x}px`
      heartEl.style.top = `${y}px`
      heartEl.style.fontSize = `${size}px`
      heartEl.style.animation = `float-up ${duration}ms ease-out`
      heartEl.setAttribute('aria-hidden', 'true')

      document.body.appendChild(heartEl)
      activeHearts.add(heartEl)

      const removalTimer = setTimeout(() => {
        heartEl.remove()
        activeHearts.delete(heartEl)
        removalTimers.delete(removalTimer)
      }, duration)
      removalTimers.add(removalTimer)
    }

    const handleClick = (e: MouseEvent) => {
      // 10% 概率触发爱心特效
      if (Math.random() < 0.1) {
        createHeart(e.clientX, e.clientY)
      }
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
      removalTimers.forEach((timer) => clearTimeout(timer))
      activeHearts.forEach((heart) => heart.remove())
    }
  }, [])

  return (
    <style jsx global>{`
      .heart-particle {
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        user-select: none;
      }

      @keyframes float-up {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(-100px) rotate(20deg);
          opacity: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .heart-particle {
          display: none;
        }
      }
    `}</style>
  )
}
