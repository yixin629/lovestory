'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FEATURE_CATEGORIES,
  featureRegistry,
  isFeaturePathActive,
  mobileNavigationFeatures,
  navigationFeatures,
} from '@/lib/features'

const homeFeature = featureRegistry.find((feature) => feature.path === '/')
const drawerId = 'feature-navigation-drawer'

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const drawerRef = useRef<HTMLElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const lastOpenerRef = useRef<HTMLButtonElement | null>(null)

  const closeDrawer = useCallback((restoreFocus = true) => {
    setIsOpen(false)

    if (restoreFocus) {
      window.setTimeout(() => lastOpenerRef.current?.focus(), 0)
    }
  }, [])

  const openDrawer = (event: React.MouseEvent<HTMLButtonElement>) => {
    lastOpenerRef.current = event.currentTarget
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => searchInputRef.current?.focus())

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusableElements = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )

      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [closeDrawer, isOpen])

  const filteredFeatures = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('zh-CN')
    const features = navigationFeatures.filter((feature) => feature.path !== '/')

    if (!query) return features

    return features.filter((feature) =>
      [feature.name, feature.description, ...(feature.keywords ?? [])]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(query)
    )
  }, [searchQuery])

  const groupedFeatures = FEATURE_CATEGORIES.map((category) => ({
    ...category,
    features: filteredFeatures.filter((feature) => feature.category === category.id),
  })).filter((category) => category.features.length > 0)

  const hideNavigation = pathname === '/login' || pathname === '/chat' || pathname.startsWith('/mahjong/') || pathname === '/dream-journey'
  if (hideNavigation || !homeFeature) return null

  return (
    <>
      <style jsx global>{`
        @media (max-width: 767px) {
          #main-content {
            padding-bottom: calc(env(safe-area-inset-bottom) + 6rem);
          }
        }
      `}</style>

      <button
        type="button"
        onClick={openDrawer}
        tabIndex={isOpen ? -1 : 0}
        className={`fixed left-4 top-4 z-50 hidden h-12 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-800 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 md:flex ${
          isOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        aria-label="打开全部功能"
        aria-controls={drawerId}
        aria-expanded={isOpen}
      >
        <span className="flex w-5 flex-col gap-1" aria-hidden="true">
          <span className="h-0.5 w-5 rounded-full bg-pink-500" />
          <span className="h-0.5 w-5 rounded-full bg-pink-500" />
          <span className="h-0.5 w-5 rounded-full bg-pink-500" />
        </span>
        全部功能
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-[2px]"
            onClick={() => closeDrawer()}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feature-navigation-title"
            className="fixed inset-y-0 left-0 z-[70] flex w-[90vw] max-w-sm flex-col overflow-hidden bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">
                  OUR LITTLE WORLD
                </p>
                <h2
                  id="feature-navigation-title"
                  className="mt-1 text-2xl font-black text-gray-900"
                >
                  全部功能
                </h2>
                <p className="mt-1 text-sm text-gray-500">按生活场景整理，更快找到想做的事</p>
              </div>
              <button
                type="button"
                onClick={() => closeDrawer()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl text-gray-500 transition hover:bg-pink-50 hover:text-pink-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-200"
                aria-label="关闭全部功能"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <div className="border-b border-gray-100 p-4">
              <label htmlFor="feature-navigation-search" className="sr-only">
                搜索功能
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                >
                  🔍
                </span>
                <input
                  ref={searchInputRef}
                  id="feature-navigation-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索功能、场景或关键词"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      searchInputRef.current?.focus()
                    }}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                    aria-label="清空搜索"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                )}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="全部功能导航">
              <Link
                href={homeFeature.path}
                onClick={() => closeDrawer(false)}
                aria-current={pathname === '/' ? 'page' : undefined}
                className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-200 ${
                  pathname === '/'
                    ? 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {homeFeature.icon}
                </span>
                <span>{homeFeature.name}</span>
              </Link>

              {groupedFeatures.map((category) => (
                <section key={category.id} aria-labelledby={`drawer-category-${category.id}`}>
                  <h3
                    id={`drawer-category-${category.id}`}
                    className="mb-1 mt-5 flex items-center gap-2 px-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-400 first:mt-1"
                  >
                    <span aria-hidden="true">{category.icon}</span>
                    {category.label}
                    <span className="ml-auto font-medium tracking-normal">
                      {category.features.length}
                    </span>
                  </h3>
                  <div className="space-y-0.5">
                    {category.features.map((feature) => {
                      const isActive = isFeaturePathActive(feature, pathname)

                      return (
                        <Link
                          key={feature.path}
                          href={feature.path}
                          onClick={() => closeDrawer(false)}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-pink-100 to-purple-100 font-bold text-pink-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-lg"
                            aria-hidden="true"
                          >
                            {feature.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{feature.name}</span>
                            <span className="block truncate text-xs font-normal text-gray-400">
                              {feature.description}
                            </span>
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              ))}

              {searchQuery && filteredFeatures.length === 0 && (
                <div className="px-4 py-12 text-center text-gray-500" role="status">
                  <div className="text-4xl" aria-hidden="true">
                    🔍
                  </div>
                  <p className="mt-3 text-sm font-semibold">没有找到匹配的功能</p>
                  <p className="mt-1 text-xs text-gray-400">换个关键词试试看</p>
                </div>
              )}
            </nav>

            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-center text-xs text-gray-500">
              共 {navigationFeatures.length - 1} 个功能
            </div>
          </aside>
        </>
      )}

      <nav
        className="fixed bottom-3 left-3 right-3 z-50 grid grid-cols-5 rounded-2xl border border-white/70 bg-white/95 px-1 py-1.5 shadow-[0_10px_35px_rgba(31,41,55,0.2)] backdrop-blur-xl md:hidden"
        aria-label="移动端主导航"
        data-global-mobile-nav
      >
        <Link
          href={homeFeature.path}
          aria-current={pathname === '/' ? 'page' : undefined}
          className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
            pathname === '/' ? 'bg-pink-50 text-pink-600' : 'text-gray-500'
          }`}
        >
          <span className="text-xl leading-none" aria-hidden="true">
            {homeFeature.icon}
          </span>
          <span className="max-w-full truncate">{homeFeature.name}</span>
        </Link>

        {mobileNavigationFeatures.map((feature) => {
          const isActive = isFeaturePathActive(feature, pathname)

          return (
            <Link
              key={feature.path}
              href={feature.path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
                isActive ? 'bg-pink-50 text-pink-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xl leading-none" aria-hidden="true">
                {feature.icon}
              </span>
              <span className="max-w-full truncate">{feature.name}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={openDrawer}
          aria-controls={drawerId}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-gray-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
        >
          <span className="text-xl leading-none" aria-hidden="true">
            ◉
          </span>
          <span>全部</span>
        </button>
      </nav>
    </>
  )
}
