'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('页面渲染失败:', error)
  }, [error])

  return (
    <main className="page-container flex min-h-[70dvh] items-center justify-center py-16">
      <section className="card w-full max-w-lg text-center" role="alert">
        <div className="mb-4 text-6xl" aria-hidden="true">
          🛟
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">页面暂时出了点问题</h1>
        <p className="mb-6 text-gray-600">记录不会因为这个页面错误而被自动删除，可以先重试一次。</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn-primary min-h-11">
            重新加载
          </button>
          <Link href="/" className="btn-secondary inline-flex min-h-11 items-center justify-center">
            返回首页
          </Link>
        </div>
        {error.digest && <p className="mt-5 text-xs text-gray-500">错误编号：{error.digest}</p>}
      </section>
    </main>
  )
}
