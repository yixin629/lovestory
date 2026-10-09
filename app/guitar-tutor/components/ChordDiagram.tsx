import type { ChordShape } from '../types'

interface ChordDiagramProps {
  chord: ChordShape
  /** 是否用更醒目的颜色标出（比如当前练习步骤正在练的和弦） */
  highlighted?: boolean
}

const STRING_COUNT = 6
const FRET_COUNT = 4
const DIAGRAM_WIDTH = 160
const DIAGRAM_HEIGHT = 190
const LEFT_MARGIN = 20
const TOP_MARGIN = 36
const FRET_HEIGHT = 32
const STRING_GAP = (DIAGRAM_WIDTH - LEFT_MARGIN * 2) / (STRING_COUNT - 1)

/**
 * 单个和弦的内联 SVG 指法图：6 根竖直琴弦、若干横向品格线，弦上方标出
 * 空弦(○)/闷音(×)，按弦位置用实心圆点加数字标出用第几根手指。
 *
 * 主题适配：图表本身只用 currentColor 和少量语义色（品牌主色变量），
 * 不使用任何 bg-white/xx 或 border-white/xx 这类不透明度写法——上一次
 * 踩过的坑是那类工具类在暗色/护眼模式下没有被 globals.css 重新映射，
 * 会导致深色背景上出现刺眼的白色色块。这里外层容器改用有主题映射的
 * border-gray-200 / bg-gray-50，SVG 内部线条用 currentColor 跟随文字颜色。
 */
export default function ChordDiagram({ chord, highlighted = false }: ChordDiagramProps) {
  const startFret = chord.startFret ?? 1

  const ariaLabel = `${chord.displayName}和弦：${chord.description}`

  return (
    <div
      className={`card-compact inline-flex flex-col items-center gap-2 border ${
        highlighted ? 'border-primary' : 'border-gray-200'
      }`}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="font-bold text-lg">{chord.displayName}</div>
      <svg
        width={DIAGRAM_WIDTH}
        height={DIAGRAM_HEIGHT}
        viewBox={`0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}`}
        aria-hidden="true"
        className="text-gray-700"
      >
        {/* 弦上方的空弦/闷音标记 */}
        {chord.strings.map((state, index) => {
          const x = LEFT_MARGIN + index * STRING_GAP
          if (state.type === 'open') {
            return (
              <circle
                key={`marker-${index}`}
                cx={x}
                cy={TOP_MARGIN - 16}
                r={6}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              />
            )
          }
          if (state.type === 'muted') {
            return (
              <text
                key={`marker-${index}`}
                x={x}
                y={TOP_MARGIN - 10}
                textAnchor="middle"
                fontSize={13}
                fill="currentColor"
              >
                ×
              </text>
            )
          }
          return null
        })}

        {/* 品格横线（第 0 条加粗代表琴枕，除非是从中间某品开始的图） */}
        {Array.from({ length: FRET_COUNT + 1 }).map((_, fretLine) => {
          const y = TOP_MARGIN + fretLine * FRET_HEIGHT
          const isNut = fretLine === 0 && startFret === 1
          return (
            <line
              key={`fret-${fretLine}`}
              x1={LEFT_MARGIN}
              y1={y}
              x2={LEFT_MARGIN + (STRING_COUNT - 1) * STRING_GAP}
              y2={y}
              stroke="currentColor"
              strokeWidth={isNut ? 4 : 1.5}
            />
          )
        })}

        {/* 竖直琴弦 */}
        {Array.from({ length: STRING_COUNT }).map((_, index) => {
          const x = LEFT_MARGIN + index * STRING_GAP
          return (
            <line
              key={`string-${index}`}
              x1={x}
              y1={TOP_MARGIN}
              x2={x}
              y2={TOP_MARGIN + FRET_COUNT * FRET_HEIGHT}
              stroke="currentColor"
              strokeWidth={1}
            />
          )
        })}

        {/* 起始品位标签，比如从第 2 品开始画就标 "2fr" */}
        {startFret > 1 && (
          <text x={LEFT_MARGIN - 14} y={TOP_MARGIN + FRET_HEIGHT / 2 + 4} fontSize={12} fill="currentColor">
            {startFret}fr
          </text>
        )}

        {/* 按弦圆点 + 手指编号 */}
        {chord.strings.map((state, index) => {
          if (state.type !== 'fretted') return null
          const x = LEFT_MARGIN + index * STRING_GAP
          const relativeFret = state.fret - startFret + 1
          const y = TOP_MARGIN + (relativeFret - 0.5) * FRET_HEIGHT
          return (
            <g key={`dot-${index}`}>
              <circle cx={x} cy={y} r={11} className="fill-primary" />
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="white"
              >
                {state.finger}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="text-xs text-gray-600 max-w-[160px] text-center leading-snug">
        {chord.description}
      </p>
    </div>
  )
}
