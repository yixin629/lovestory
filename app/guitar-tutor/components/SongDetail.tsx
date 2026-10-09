'use client'

import type { Song } from '../types'
import { chordShapes } from '../lib/chordShapes'
import { getStrumPattern } from '../lib/songLibrary'
import { useSongProgress } from '../hooks/useSongProgress'
import ChordDiagram from './ChordDiagram'
import ChordProgressionView from './ChordProgressionView'
import StrumPatternView from './StrumPatternView'
import PracticeStepList from './PracticeStepList'

interface SongDetailProps {
  song: Song
}

export default function SongDetail({ song }: SongDetailProps) {
  const { progress, isLoaded, toggleChordMastered, setCurrentStepIndex, resetProgress } = useSongProgress(song.id)
  const strumPattern = getStrumPattern(song.strumPatternId)

  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <h1 className="text-2xl font-bold mb-1">{song.title}</h1>
        <p className="text-gray-600 mb-3">{song.artist}</p>
        <p className="text-sm text-gray-700">{song.keyInfo}</p>
      </div>

      <section className="card">
        <h2 className="text-xl font-bold mb-3">需要掌握的和弦</h2>
        <div className="flex flex-wrap gap-4">
          {song.chordIds.map((chordId) => {
            const chord = chordShapes[chordId]
            if (!chord) return null
            const isMastered = progress.masteredChordIds.includes(chordId)
            return (
              <div key={chordId} className="flex flex-col items-center gap-2">
                <ChordDiagram chord={chord} />
                <button
                  type="button"
                  onClick={() => toggleChordMastered(chordId)}
                  className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                    isMastered
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-gray-300 bg-gray-50 text-gray-600'
                  }`}
                  aria-pressed={isMastered}
                >
                  {isMastered ? '✅ 已掌握' : '标记为已掌握'}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold mb-3">节奏型</h2>
        {strumPattern && <StrumPatternView pattern={strumPattern} />}
      </section>

      <section className="card">
        <h2 className="text-xl font-bold mb-3">和弦进行（只有和弦名，不含歌词）</h2>
        <div className="flex flex-col gap-3">
          {song.sections.map((section) => (
            <ChordProgressionView key={section.id} section={section} />
          ))}
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xl font-bold">分解练习步骤</h2>
          {isLoaded && (
            <button
              type="button"
              onClick={resetProgress}
              className="text-sm px-3 py-1 rounded-full border border-gray-300 bg-gray-50 text-gray-600"
            >
              🔄 重置本曲进度
            </button>
          )}
        </div>
        <PracticeStepList
          steps={song.practiceSteps}
          currentStepIndex={progress.currentStepIndex}
          onSelectStep={setCurrentStepIndex}
        />
      </section>
    </div>
  )
}
