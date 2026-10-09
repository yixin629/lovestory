import type { Metadata } from 'next'
import BackButton from '@/app/components/ui/BackButton'
import PageHeader from '@/app/components/ui/PageHeader'
import AnswerBook from './components/AnswerBook'

export const metadata: Metadata = {
  title: '答案之书｜我们的小世界',
  description: '问出心里的问题，翻开一页寻找答案。',
}

export default function AnswerBookPage() {
  return (
    <main className="min-h-dvh bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-100 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <BackButton />
        <PageHeader
          title="答案之书"
          emoji="📖"
          subtitle="想好一个问题，让偶然的一页给你一点新的灵感"
        />
        <AnswerBook />
      </div>
    </main>
  )
}
