import BackButton from '@/app/components/ui/BackButton'
import MonopolyGame from './components/MonopolyGame'
import OnlineLobby from './components/OnlineLobby'

export default function MonopolyPage() {
  return (
    <main className="min-h-screen px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <BackButton />
        <header className="mb-6 text-center">
          <p className="mb-2 text-5xl" aria-hidden="true">🏙️</p>
          <h1 className="title-h1 title-gradient">甜蜜大富翁</h1>
          <p className="mt-2 text-gray-600">买下约会地标，经营属于两个人的小世界</p>
        </header>
        <OnlineLobby />
        <MonopolyGame />
      </div>
    </main>
  )
}
