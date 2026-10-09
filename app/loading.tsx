export default function Loading() {
  return (
    <main
      className="page-container flex min-h-[60dvh] items-center justify-center py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
          aria-hidden="true"
        />
        <p className="font-medium text-gray-700">正在打开我们的小世界…</p>
      </div>
    </main>
  )
}
