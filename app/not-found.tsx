import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="page-container flex min-h-[70dvh] items-center justify-center py-16">
      <section className="card w-full max-w-lg text-center">
        <div className="mb-4 text-6xl" aria-hidden="true">
          🧭
        </div>
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">这里暂时没有内容</h1>
        <p className="mb-6 text-gray-600">链接可能已经改变，也可能是不小心走进了还没布置好的角落。</p>
        <Link href="/" className="btn-primary inline-flex min-h-11 items-center justify-center">
          回到首页
        </Link>
      </section>
    </main>
  )
}
