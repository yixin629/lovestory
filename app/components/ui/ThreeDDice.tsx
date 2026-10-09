'use client'

const DOTS: Record<number, number[]> = {
  1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9],
}

const FINAL_TRANSFORM: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(0deg) rotateY(180deg)',
  3: 'rotateX(0deg) rotateY(-90deg)',
  4: 'rotateX(0deg) rotateY(90deg)',
  5: 'rotateX(-90deg) rotateY(0deg)',
  6: 'rotateX(90deg) rotateY(0deg)',
}

const FACES = [
  { value: 1, transform: 'translateZ(48px)' },
  { value: 2, transform: 'rotateY(180deg) translateZ(48px)' },
  { value: 3, transform: 'rotateY(90deg) translateZ(48px)' },
  { value: 4, transform: 'rotateY(-90deg) translateZ(48px)' },
  { value: 5, transform: 'rotateX(90deg) translateZ(48px)' },
  { value: 6, transform: 'rotateX(-90deg) translateZ(48px)' },
]

export default function ThreeDDice({ value = 1, rolling, onRoll, disabled = false }: { value?: number; rolling: boolean; onRoll: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onRoll} disabled={disabled || rolling} className="group relative h-36 w-40 touch-manipulation disabled:cursor-not-allowed" aria-label={rolling ? '骰子滚动中' : `掷骰子，当前点数 ${value}`}>
      <span className={`dice-shadow absolute bottom-2 left-1/2 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900/25 blur-sm ${rolling ? 'dice-shadow-rolling' : ''}`} />
      <span className="absolute left-1/2 top-3 h-24 w-24 -translate-x-1/2 [perspective:700px]">
        <span className={`dice-cube relative block h-24 w-24 [transform-style:preserve-3d] ${rolling ? 'dice-cube-rolling' : 'transition-transform duration-500 ease-out group-hover:scale-105'}`} style={rolling ? undefined : { transform: FINAL_TRANSFORM[value] ?? FINAL_TRANSFORM[1] }}>
          {FACES.map((face) => (
            <span key={face.value} className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-[1.35rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-200 p-3 shadow-[inset_-5px_-7px_12px_rgba(15,23,42,.16),inset_4px_4px_8px_rgba(255,255,255,.9)] [backface-visibility:hidden]" style={{ transform: face.transform }}>
              {Array.from({ length: 9 }, (_, index) => <span key={index} className={`m-auto h-3.5 w-3.5 rounded-full shadow-inner ${DOTS[face.value].includes(index + 1) ? face.value === 1 ? 'bg-rose-500' : 'bg-slate-800' : 'bg-transparent'}`} />)}
            </span>
          ))}
        </span>
      </span>
      <style jsx>{`
        @keyframes dice-tumble {
          0% { transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          18% { transform: translateY(-34px) rotateX(210deg) rotateY(155deg) rotateZ(80deg); }
          55% { transform: translateY(-10px) rotateX(610deg) rotateY(530deg) rotateZ(250deg); }
          78% { transform: translateY(-19px) rotateX(820deg) rotateY(745deg) rotateZ(330deg); }
          92% { transform: translateY(3px) rotateX(1030deg) rotateY(965deg) rotateZ(410deg); }
          100% { transform: translateY(0) rotateX(1080deg) rotateY(1080deg) rotateZ(360deg); }
        }
        @keyframes dice-shadow-roll { 0%,100% { transform: translateX(-50%) scale(1); opacity:.38 } 25%,75% { transform: translateX(-50%) scale(.55); opacity:.15 } 92% { transform: translateX(-50%) scale(1.15); opacity:.45 } }
        .dice-cube-rolling { animation: dice-tumble 1.45s cubic-bezier(.18,.8,.22,1) both; }
        .dice-shadow-rolling { animation: dice-shadow-roll 1.45s ease-out both; }
      `}</style>
    </button>
  )
}
