import type { StrumPattern } from '../types'

interface StrumPatternViewProps {
  pattern: StrumPattern
}

const BEAT_LABEL: Record<'D' | 'U', string> = { D: '↓ 下', U: '↑ 上' }

/**
 * 简单的节奏型可视化：一排"下/上"标签，按小节顺序展示。不做真实的
 * Web Audio 节拍器，保持这个功能足够简单、够用即可。
 */
export default function StrumPatternView({ pattern }: StrumPatternViewProps) {
  return (
    <div className="card-compact">
      <div className="font-bold mb-2">{pattern.displayName}</div>
      <div className="flex gap-2 flex-wrap mb-2" role="list" aria-label="节奏型动作序列">
        {pattern.beats.map((beat, index) => (
          <span
            key={index}
            role="listitem"
            className="min-w-11 text-center rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-semibold"
          >
            {BEAT_LABEL[beat]}
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-600">
        {pattern.description}建议起始速度约每分钟 {pattern.suggestedBpm} 拍。
      </p>
    </div>
  )
}
