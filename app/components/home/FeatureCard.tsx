import Link from 'next/link'
import type { FeatureDefinition } from '@/lib/features'

interface FeatureCardProps {
  feature: FeatureDefinition
  variant?: 'quick' | 'compact'
  badge?: number
}

export default function FeatureCard({
  feature,
  variant = 'compact',
  badge = 0,
}: FeatureCardProps) {
  const badgeText = badge > 99 ? '99+' : String(badge)

  if (variant === 'quick') {
    return (
      <Link
        href={feature.path}
        className="card group relative flex min-h-28 items-center gap-3 !rounded-2xl !p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300"
      >
        {badge > 0 && (
          <span
            className="absolute -right-2 -top-2 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-md"
            aria-label={`${badgeText} 条未读`}
          >
            {badgeText}
          </span>
        )}
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 text-2xl transition-transform group-hover:scale-110"
          aria-hidden="true"
        >
          {feature.icon}
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-gray-900">{feature.name}</span>
          <span className="mt-1 block text-xs leading-5 text-gray-500">{feature.description}</span>
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={feature.path}
      className="card group relative flex min-h-24 items-start gap-3 !rounded-2xl !p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300"
    >
      {badge > 0 && (
        <span
          className="absolute -right-2 -top-2 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-md"
          aria-label={`${badgeText} 条未读`}
        >
          {badgeText}
        </span>
      )}
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-xl transition-transform group-hover:scale-110"
        aria-hidden="true"
      >
        {feature.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-semibold text-gray-900">{feature.name}</span>
          <span
            className="text-sm text-pink-500 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            →
          </span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-gray-500">{feature.description}</span>
      </span>
    </Link>
  )
}
