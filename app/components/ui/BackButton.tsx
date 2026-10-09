import Link from 'next/link'

interface BackButtonProps {
  href?: string
  text?: string
  className?: string
}

export default function BackButton({
  href = '/',
  text = '返回首页',
  className = '',
}: BackButtonProps) {
  return (
    <Link
      href={href}
      className={`mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white/90 px-4 py-2 font-medium text-gray-700 shadow-md transition-all duration-300 hover:bg-white hover:text-primary hover:shadow-lg ${className}`}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span>{text}</span>
    </Link>
  )
}
