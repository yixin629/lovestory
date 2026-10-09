'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react'
import Toast, { ToastType } from './Toast'

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastData {
  id: number
  message: string
  type: ToastType
}

const MAX_VISIBLE_TOASTS = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const nextIdRef = useRef(1)

  const showToast = useCallback((message: string, type: ToastType) => {
    const normalizedMessage = message.trim()
    if (!normalizedMessage) return

    const id = nextIdRef.current
    nextIdRef.current += 1
    setToasts((prev) => [
      ...prev.slice(-(MAX_VISIBLE_TOASTS - 1)),
      { id, message: normalizedMessage, type },
    ])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast])
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast])
  const contextValue = useMemo(
    () => ({ showToast, success, error, info, warning }),
    [showToast, success, error, info, warning]
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[9999] flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
        aria-label="通知"
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
