import type { ChordProgressionSection } from '../types'

interface ChordProgressionViewProps {
  section: ChordProgressionSection
}

/**
 * 只展示和弦名称序列（比如 F-G-Em-Am），不展示歌词，也不按"歌词行"排版，
 * 避免和任何谱面网站的"歌词上方标和弦"排版方式相似。
 */
export default function ChordProgressionView({ section }: ChordProgressionViewProps) {
  return (
    <div className="card-compact">
      <div className="font-bold mb-2">{section.label}</div>
      <div className="flex flex-wrap items-center gap-2" aria-label={`${section.label}和弦序列`}>
        {section.chordSequence.map((chordId, index) => (
          <span key={`${chordId}-${index}`} className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 border border-primary px-3 py-1 font-semibold text-primary">
              {chordId}
            </span>
            {index < section.chordSequence.length - 1 && (
              <span className="text-gray-400" aria-hidden="true">
                →
              </span>
            )}
          </span>
        ))}
      </div>
      {section.note && <p className="text-sm text-gray-600 mt-2">{section.note}</p>}
    </div>
  )
}
