import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  emoji?: string
  /** Display emoji on both sides of title */
  emojiDouble?: boolean
  /** Align left instead of center */
  align?: 'left' | 'center'
  /** Use gradient text effect */
  gradient?: boolean
  /** Right-side action button/content */
  action?: React.ReactNode
  className?: string
}

export default function PageHeader({
  title,
  subtitle,
  emoji,
  emojiDouble = false,
  align = 'center',
  gradient = true,
  action,
  className = '',
}: PageHeaderProps) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left'
  const titleColor = gradient
    ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 bg-clip-text text-transparent'
    : 'text-primary'

  return (
    <header className={`mb-6 md:mb-8 ${alignClass} ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}
      >
        <h1
          className={`inline-flex items-center gap-2 text-2xl font-black sm:text-3xl md:text-4xl ${titleColor}`}
        >
          {emoji && (
            <span className="text-3xl md:text-4xl" aria-hidden="true">
              {emoji}
            </span>
          )}
          <span>{title}</span>
          {emojiDouble && emoji && (
            <span className="text-3xl md:text-4xl" aria-hidden="true">
              {emoji}
            </span>
          )}
        </h1>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {subtitle && (
        <p
          className={`mt-2 max-w-2xl text-sm text-gray-500 md:text-base ${
            align === 'center' ? 'mx-auto' : ''
          }`}
        >
          {subtitle}
        </p>
      )}
    </header>
  )
}
