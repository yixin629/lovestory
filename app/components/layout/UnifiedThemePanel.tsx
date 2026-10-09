'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export const colorThemes = {
  default: {
    name: '经典粉',
    primary: '#db2777',
    secondary: '#be185d',
    accent: '#9d174d',
    emoji: '💕',
    swatch: 'from-pink-600 to-rose-700',
  },
  lavender: {
    name: '薰衣草紫',
    primary: '#7c3aed',
    secondary: '#6d28d9',
    accent: '#5b21b6',
    emoji: '💜',
    swatch: 'from-violet-600 to-purple-700',
  },
  sakura: {
    name: '樱花粉',
    primary: '#e11d48',
    secondary: '#be123c',
    accent: '#9f1239',
    emoji: '🌸',
    swatch: 'from-rose-600 to-pink-700',
  },
  ocean: {
    name: '海洋蓝',
    primary: '#2563eb',
    secondary: '#1d4ed8',
    accent: '#1e40af',
    emoji: '🌊',
    swatch: 'from-blue-600 to-blue-800',
  },
  sunset: {
    name: '日落橙',
    primary: '#c2410c',
    secondary: '#9a3412',
    accent: '#7c2d12',
    emoji: '🌅',
    swatch: 'from-orange-700 to-amber-800',
  },
  forest: {
    name: '森林绿',
    primary: '#047857',
    secondary: '#065f46',
    accent: '#064e3b',
    emoji: '🌲',
    swatch: 'from-emerald-700 to-green-900',
  },
  midnight: {
    name: '午夜蓝',
    primary: '#4f46e5',
    secondary: '#4338ca',
    accent: '#3730a3',
    emoji: '🌙',
    swatch: 'from-indigo-600 to-indigo-800',
  },
  cherry: {
    name: '樱桃红',
    primary: '#dc2626',
    secondary: '#b91c1c',
    accent: '#991b1b',
    emoji: '🍒',
    swatch: 'from-red-600 to-red-800',
  },
  anniversary: {
    name: '周年纪念',
    primary: '#a61e4d',
    secondary: '#8a1538',
    accent: '#b7791f',
    emoji: '💍',
    swatch: 'from-rose-800 to-amber-700',
  },
  birthday: {
    name: '生日派对',
    primary: '#9333ea',
    secondary: '#db2777',
    accent: '#c2410c',
    emoji: '🎂',
    swatch: 'from-purple-600 to-pink-600',
  },
  starlight: {
    name: '星河纪念',
    primary: '#4338ca',
    secondary: '#6d28d9',
    accent: '#a21caf',
    emoji: '✨',
    swatch: 'from-indigo-700 to-fuchsia-700',
  },
}

type DisplayMode = 'light' | 'dark' | 'eye-care'
type FontSize = 'small' | 'medium' | 'large'
export type ColorThemeName = keyof typeof colorThemes

const DAILY_THEME_NAMES: ColorThemeName[] = [
  'default',
  'lavender',
  'sakura',
  'ocean',
  'sunset',
  'forest',
  'midnight',
  'cherry',
]
const SPECIAL_THEME_NAMES: ColorThemeName[] = ['anniversary', 'birthday', 'starlight']

const BG_GRADIENTS: Record<ColorThemeName, string> = {
  default:
    'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.09), transparent 34rem), linear-gradient(145deg, #fffafb 0%, #fff1f5 100%)',
  lavender:
    'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.1), transparent 34rem), linear-gradient(145deg, #fcfbff 0%, #f3f0ff 100%)',
  sakura:
    'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.09), transparent 34rem), linear-gradient(145deg, #fffafa 0%, #fff0f2 100%)',
  ocean:
    'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.09), transparent 34rem), linear-gradient(145deg, #f8fbff 0%, #eef6ff 100%)',
  sunset:
    'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.08), transparent 34rem), linear-gradient(145deg, #fffaf6 0%, #fff3e9 100%)',
  forest:
    'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.08), transparent 34rem), linear-gradient(145deg, #f8fcfa 0%, #edf8f3 100%)',
  midnight:
    'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.09), transparent 34rem), linear-gradient(145deg, #fafaff 0%, #f0f2ff 100%)',
  cherry:
    'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.08), transparent 34rem), linear-gradient(145deg, #fffafa 0%, #fff1f1 100%)',
  anniversary:
    'radial-gradient(circle at 12% 0%, rgb(183 121 31 / 0.18), transparent 28rem), radial-gradient(circle at 88% 12%, rgb(166 30 77 / 0.12), transparent 30rem), linear-gradient(145deg, #fffaf2 0%, #fff0f4 52%, #fdf6e7 100%)',
  birthday:
    'radial-gradient(circle at 12% 0%, rgb(147 51 234 / 0.13), transparent 28rem), radial-gradient(circle at 90% 16%, rgb(219 39 119 / 0.11), transparent 30rem), linear-gradient(145deg, #fffaff 0%, #fff1f8 100%)',
  starlight:
    'radial-gradient(circle at 15% 0%, rgb(67 56 202 / 0.15), transparent 30rem), radial-gradient(circle at 85% 12%, rgb(162 28 175 / 0.1), transparent 28rem), linear-gradient(145deg, #fbfaff 0%, #f1efff 100%)',
}

const DARK_GRADIENT =
  'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.16), transparent 34rem), linear-gradient(145deg, #0b1120 0%, #111c30 100%)'
const EYE_CARE_GRADIENT =
  'radial-gradient(circle at 12% 0%, rgb(var(--color-primary-rgb) / 0.07), transparent 34rem), linear-gradient(145deg, #f4f2e7 0%, #e9e7d8 100%)'

function isColorTheme(value: string | null): value is ColorThemeName {
  return value !== null && Object.prototype.hasOwnProperty.call(colorThemes, value)
}

function isDisplayMode(value: string | null): value is DisplayMode {
  return value === 'light' || value === 'dark' || value === 'eye-care'
}

function isFontSize(value: string | null): value is FontSize {
  return value === 'small' || value === 'medium' || value === 'large'
}

function hexToRgbChannels(hex: string) {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`
}

function applyColorTheme(name: ColorThemeName, currentMode: DisplayMode) {
  const theme = colorThemes[name]
  const root = document.documentElement

  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-primary-rgb', hexToRgbChannels(theme.primary))
  root.style.setProperty('--color-secondary', theme.secondary)
  root.style.setProperty('--color-secondary-rgb', hexToRgbChannels(theme.secondary))
  root.style.setProperty('--color-accent', theme.accent)
  root.style.setProperty('--color-accent-rgb', hexToRgbChannels(theme.accent))
  root.dataset.colorTheme = name

  if (currentMode === 'light') {
    root.style.setProperty('--bg-gradient', BG_GRADIENTS[name])
  }
}

function applyMode(mode: DisplayMode, currentTheme: ColorThemeName) {
  const root = document.documentElement
  root.classList.remove('dark-mode', 'eye-care-mode')

  if (mode === 'dark') {
    root.classList.add('dark-mode')
    root.style.setProperty('--bg-gradient', DARK_GRADIENT)
  } else if (mode === 'eye-care') {
    root.classList.add('eye-care-mode')
    root.style.setProperty('--bg-gradient', EYE_CARE_GRADIENT)
  } else {
    root.style.setProperty('--bg-gradient', BG_GRADIENTS[currentTheme])
  }

  root.dataset.displayMode = mode
}

function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize =
    size === 'small' ? '14px' : size === 'large' ? '18px' : '16px'
}

function saveSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Personalization remains usable for this session when storage is unavailable.
  }
}

function provideTactileFeedback() {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && navigator.vibrate) {
    navigator.vibrate(20)
  }
}

export default function UnifiedThemePanel() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [colorTheme, setColorTheme] = useState<ColorThemeName>('default')
  const [mode, setMode] = useState<DisplayMode>('light')
  const [fontSize, setFontSize] = useState<FontSize>('medium')
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const hideThemeControl =
    pathname === '/login' || pathname === '/chat' || pathname.startsWith('/chat/') || pathname.startsWith('/mahjong/') || pathname === '/dream-journey'

  useEffect(() => {
    let savedTheme: string | null = null
    let savedMode: string | null = null
    let savedFontSize: string | null = null

    try {
      savedTheme = localStorage.getItem('colorTheme')
      savedMode = localStorage.getItem('themeMode')
      savedFontSize = localStorage.getItem('fontSize')
    } catch {
      // Keep the defaults when storage is unavailable.
    }

    const nextTheme = isColorTheme(savedTheme) ? savedTheme : 'default'
    const nextMode = isDisplayMode(savedMode) ? savedMode : 'light'
    const nextFontSize = isFontSize(savedFontSize) ? savedFontSize : 'medium'

    setColorTheme(nextTheme)
    setMode(nextMode)
    setFontSize(nextFontSize)
    applyColorTheme(nextTheme, nextMode)
    applyMode(nextMode, nextTheme)
    applyFontSize(nextFontSize)
  }, [])

  useEffect(() => {
    if (hideThemeControl) {
      setIsOpen(false)
    }
  }, [hideThemeControl])

  useEffect(() => {
    if (!isOpen || hideThemeControl) return

    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === firstElement ||
          !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleDialogKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleDialogKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [hideThemeControl, isOpen])

  const selectTheme = (name: ColorThemeName) => {
    setColorTheme(name)
    applyColorTheme(name, mode)
    saveSetting('colorTheme', name)
    provideTactileFeedback()
  }

  const selectMode = (nextMode: DisplayMode) => {
    setMode(nextMode)
    applyMode(nextMode, colorTheme)
    saveSetting('themeMode', nextMode)
    provideTactileFeedback()
  }

  const selectFontSize = (size: FontSize) => {
    setFontSize(size)
    applyFontSize(size)
    saveSetting('fontSize', size)
    provideTactileFeedback()
  }

  const current = colorThemes[colorTheme]
  const previewBackground =
    mode === 'dark' ? '#1e293b' : mode === 'eye-care' ? '#f4f2e7' : BG_GRADIENTS[colorTheme]

  if (hideThemeControl) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-[4.25rem] flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-lg transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl sm:bottom-6 sm:right-24 sm:h-14 sm:w-14 sm:text-2xl ${
          isOpen ? 'z-[70]' : 'z-50'
        }`}
        style={{
          background: `linear-gradient(135deg, ${current.primary}, ${current.secondary})`,
        }}
        aria-label={isOpen ? '关闭主题设置' : '打开主题设置'}
        data-global-utility="theme"
        aria-expanded={isOpen}
        aria-controls="theme-settings-panel"
        title="主题与显示"
      >
        <span aria-hidden="true">🎨</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-slate-950/35 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <section
            ref={dialogRef}
            id="theme-settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-settings-title"
            className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] z-[60] flex max-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl animate-fade-in dark:border-slate-700 dark:bg-slate-900 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:max-h-[calc(100dvh-6rem)] sm:w-[340px]"
          >
            <div
              className="flex shrink-0 items-start justify-between gap-3 p-4 text-white"
              style={{
                background: `linear-gradient(135deg, ${current.primary}, ${current.accent})`,
              }}
            >
              <div>
                <h2 id="theme-settings-title" className="flex items-center gap-2 text-lg font-bold">
                  <span aria-hidden="true">🎨</span>
                  <span>主题与显示</span>
                </h2>
                <p className="mt-0.5 text-xs text-white/85">调整配色、明暗和字号</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl transition-colors hover:bg-white/20"
                aria-label="关闭主题设置"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-4">
              <section aria-labelledby="color-theme-label">
                <div className="mb-2 flex items-center justify-between">
                  <h3 id="color-theme-label" className="text-sm font-semibold text-gray-700">
                    日常配色
                  </h3>
                  <span className="text-xs text-gray-500">{current.name}</span>
                </div>
                <div
                  className="grid grid-cols-4 gap-2"
                  role="group"
                  aria-labelledby="color-theme-label"
                >
                  {DAILY_THEME_NAMES.map((key) => {
                      const theme = colorThemes[key]
                      const isSelected = colorTheme === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectTheme(key)}
                          className={`relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl transition-transform duration-200 hover:scale-[1.03] ${
                            isSelected ? 'scale-[1.03]' : ''
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                            boxShadow: isSelected
                              ? `0 0 0 2px white, 0 0 0 4px ${theme.primary}`
                              : undefined,
                          }}
                          title={theme.name}
                          aria-label={theme.name}
                          aria-pressed={isSelected}
                        >
                          <span className="text-2xl drop-shadow" aria-hidden="true">
                            {theme.emoji}
                          </span>
                          {isSelected && (
                            <span
                              className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-xs text-gray-900"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      )
                    })}
                </div>
              </section>

              <section aria-labelledby="special-theme-label">
                <div className="mb-2">
                  <h3 id="special-theme-label" className="text-sm font-semibold text-gray-700">
                    纪念主题
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">适合周年、生日和特别的日子</p>
                </div>
                <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="special-theme-label">
                  {SPECIAL_THEME_NAMES.map((key) => {
                    const theme = colorThemes[key]
                    const isSelected = colorTheme === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectTheme(key)}
                        className={`relative min-h-20 rounded-xl px-2 py-3 text-white transition-transform duration-200 hover:scale-[1.03] ${isSelected ? 'scale-[1.03]' : ''}`}
                        style={{
                          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                          boxShadow: isSelected
                            ? `0 0 0 2px white, 0 0 0 4px ${theme.primary}`
                            : undefined,
                        }}
                        aria-label={theme.name}
                        aria-pressed={isSelected}
                      >
                        <span className="block text-2xl drop-shadow" aria-hidden="true">
                          {theme.emoji}
                        </span>
                        <span className="mt-1 block text-[11px] font-bold">{theme.name}</span>
                        {isSelected && (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-xs text-gray-900" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section aria-labelledby="display-mode-label">
                <h3 id="display-mode-label" className="mb-2 text-sm font-semibold text-gray-700">
                  显示模式
                </h3>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="group"
                  aria-labelledby="display-mode-label"
                >
                  <button
                    type="button"
                    onClick={() => selectMode('light')}
                    aria-pressed={mode === 'light'}
                    className={`min-h-16 rounded-xl p-3 transition-colors ${
                      mode === 'light'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mb-1 block text-2xl" aria-hidden="true">
                      ☀️
                    </span>
                    <span className="block text-xs font-medium">日间</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectMode('dark')}
                    aria-pressed={mode === 'dark'}
                    className={`min-h-16 rounded-xl p-3 transition-colors ${
                      mode === 'dark'
                        ? 'bg-indigo-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mb-1 block text-2xl" aria-hidden="true">
                      🌙
                    </span>
                    <span className="block text-xs font-medium">夜间</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectMode('eye-care')}
                    aria-pressed={mode === 'eye-care'}
                    className={`min-h-16 rounded-xl p-3 transition-colors ${
                      mode === 'eye-care'
                        ? 'bg-lime-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mb-1 block text-2xl" aria-hidden="true">
                      👁️
                    </span>
                    <span className="block text-xs font-medium">护眼</span>
                  </button>
                </div>
              </section>

              <section aria-labelledby="font-size-label">
                <h3 id="font-size-label" className="mb-2 text-sm font-semibold text-gray-700">
                  字体大小
                </h3>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="group"
                  aria-labelledby="font-size-label"
                >
                  {(
                    [
                      ['small', 'text-sm', '小'],
                      ['medium', 'text-base', '中'],
                      ['large', 'text-lg', '大'],
                    ] as const
                  ).map(([size, textClass, label]) => {
                    const isSelected = fontSize === size
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => selectFontSize(size)}
                        aria-pressed={isSelected}
                        className={`min-h-16 rounded-xl p-3 transition-colors ${
                          isSelected
                            ? 'text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={
                          isSelected
                            ? {
                                background: `linear-gradient(135deg, ${current.primary}, ${current.secondary})`,
                              }
                            : undefined
                        }
                      >
                        <span className={`mb-1 block font-bold ${textClass}`} aria-hidden="true">
                          A
                        </span>
                        <span className="block text-xs">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor: `rgb(var(--color-primary-rgb) / 0.35)`,
                  background: previewBackground,
                }}
                aria-label="主题实时预览"
              >
                <p className="mb-2 text-xs text-gray-600">实时预览</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                    主要按钮
                  </span>
                  <span className="rounded-full border border-primary bg-white px-3 py-1 text-xs font-semibold text-primary">
                    次要按钮
                  </span>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  )
}
