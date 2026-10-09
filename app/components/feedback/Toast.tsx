'use client'

import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  id: number
  message: string
  type: ToastType
  onClose: (id: number) => void
  duration?: number
}

export default function Toast({ id, message, type, onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, id, onClose])

  const icons = {
    success: '✓',
    error: '!',
    info: 'i',
    warning: '!',
  }

  const colors = {
    success:
      'border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-100',
    error:
      'border-red-200 bg-red-50/95 text-red-950 dark:border-red-800 dark:bg-red-950/95 dark:text-red-100',
    info: 'border-sky-200 bg-sky-50/95 text-sky-950 dark:border-sky-800 dark:bg-sky-950/95 dark:text-sky-100',
    warning:
      'border-amber-200 bg-amber-50/95 text-amber-950 dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-100',
  }

  return (
    <div
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`${colors[type]} pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md animate-slide-in-right`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-sm font-bold"
      >
        {icons[type]}
      </span>
      <p className="min-w-0 flex-1 break-words text-sm font-medium leading-6">{message}</p>
      <button
        type="button"
        onClick={() => onClose(id)}
        className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-lg leading-none opacity-70 transition-colors hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        aria-label="关闭通知"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  )
}
