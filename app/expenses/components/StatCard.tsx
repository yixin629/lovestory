'use client'

import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  emoji?: string
  /** Tailwind gradient classes, e.g. "from-pink-500 to-red-500" */
  gradient?: string
  trend?: { value: number; label?: string } // positive = up, negative = down
  onClick?: () => void
  className?: string
}

const DEFAULT_GRADIENT = 'from-pink-500 to-red-500'

export default function StatCard({
  label,
  value,
  emoji,
  gradient = DEFAULT_GRADIENT,
  trend,
  onClick,
  className = '',
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-3xl font-black leading-tight">{value}</div>
          <div className="text-xs md:text-sm opacity-90 mt-0.5">{label}</div>
        </div>
        {emoji && <div className="text-2xl md:text-3xl opacity-90 shrink-0 ml-2">{emoji}</div>}
      </div>
      {trend && (
        <div className={`text-xs mt-2 flex items-center gap-1 ${trend.value >= 0 ? 'text-green-100' : 'text-orange-100'}`}>
          <span>{trend.value >= 0 ? '↑' : '↓'}</span>
          <span>
            {Math.abs(trend.value)}
            {trend.label && ` ${trend.label}`}
          </span>
        </div>
      )}
    </>
  )

  const cardClassName = `
    bg-gradient-to-br ${gradient} rounded-2xl p-4 text-white shadow-lg
    ${onClick ? 'cursor-pointer text-left hover:shadow-xl hover:-translate-y-0.5 transition-all' : ''}
    ${className}
  `

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full ${cardClassName}`}>
        {content}
      </button>
    )
  }

  return (
    <div className={cardClassName}>
      {content}
    </div>
  )
}
