'use client'

import type { PracticeStep } from '../types'
import { chordShapes } from '../lib/chordShapes'
import ChordDiagram from './ChordDiagram'

interface PracticeStepListProps {
  steps: PracticeStep[]
  currentStepIndex: number
  onSelectStep: (index: number) => void
}

/**
 * 分解练习步骤列表：一次只展开当前这一步的和弦图，其余步骤折叠成
 * 可点击的标题，避免页面一次性塞太多图表。
 */
export default function PracticeStepList({ steps, currentStepIndex, onSelectStep }: PracticeStepListProps) {
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const isCurrent = index === currentStepIndex
        return (
          <div
            key={step.id}
            className={`card-compact border ${isCurrent ? 'border-primary' : 'border-gray-200'}`}
          >
            <button
              type="button"
              onClick={() => onSelectStep(index)}
              className="w-full text-left flex items-center justify-between gap-2"
              aria-expanded={isCurrent}
            >
              <span className="font-semibold">
                {index + 1}. {step.title}
              </span>
              <span className="text-gray-500 text-sm">{isCurrent ? '收起 ▲' : '展开 ▼'}</span>
            </button>
            {isCurrent && (
              <div className="mt-3">
                <p className="text-sm text-gray-700 mb-3">{step.instruction}</p>
                <div className="flex flex-wrap gap-3">
                  {step.chordIds.map((chordId) => {
                    const chord = chordShapes[chordId]
                    if (!chord) return null
                    return <ChordDiagram key={chordId} chord={chord} highlighted />
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
