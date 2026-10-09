/**
 * 吉他入门陪练功能的共享类型。
 *
 * 只在这里定义被 lib/、components/ 多处共用的类型；仅单个文件使用的类型
 * 直接写在该文件内部即可。
 */

/** 手指编号：1=食指 2=中指 3=无名指 4=小指。0 表示不需要按（空弦或不弹）。 */
export type FingerNumber = 0 | 1 | 2 | 3 | 4

/** 单根琴弦在这个和弦里的状态。 */
export type StringState =
  | { type: 'open' }
  | { type: 'muted' }
  | { type: 'fretted'; fret: number; finger: FingerNumber }

/**
 * 一个和弦指法。strings 固定 6 项，索引 0 = 第 6 弦（低音 E，最粗的弦），
 * 索引 5 = 第 1 弦（高音 E，最细的弦），和吉他手常用的"从粗到细"数弦习惯一致。
 */
export interface ChordShape {
  /** 和弦名称，如 "F"、"Em" */
  id: string
  /** 展示用名称，可以带备注，如 "F（简化版，不需要大横按）" */
  displayName: string
  /** 六根弦从第 6 弦到第 1 弦的状态 */
  strings: [StringState, StringState, StringState, StringState, StringState, StringState]
  /** 图表从第几品开始画，默认第 1 品。用于把品位较高的指法完整显示出来 */
  startFret?: number
  /** 给完全新手的文字讲解，控件会用它生成 aria-label 和图表下方的说明 */
  description: string
}

/** 一次分解练习步骤：练一个和弦，或练两个/多个和弦之间的切换 */
export interface PracticeStep {
  id: string
  title: string
  /** 这一步涉及到的和弦 id（对应 chordShapes 里的 key） */
  chordIds: string[]
  instruction: string
}

/** 一小节的强弱节拍标记，只用 Down/Up 两种基本动作 */
export type StrumBeat = 'D' | 'U'

export interface StrumPattern {
  id: string
  displayName: string
  /** 一小节内的节拍序列，例如 ['D','D','U','U','D','U'] */
  beats: StrumBeat[]
  suggestedBpm: number
  description: string
}

/** 歌曲的一个和弦进行段落（主歌/副歌等），只存和弦名称，不含歌词 */
export interface ChordProgressionSection {
  id: string
  label: string
  /** 和弦名称序列，对应 chordShapes 的 key，允许重复出现表示循环 */
  chordSequence: string[]
  note?: string
}

export interface Song {
  id: string
  title: string
  artist: string
  /** 常见的建议调/capo 信息，仅作为事实性说明，不含具体编曲 */
  keyInfo: string
  /** 这首歌用到的和弦 id 列表（对应 chordShapes 的 key） */
  chordIds: string[]
  sections: ChordProgressionSection[]
  strumPatternId: string
  /** 建议的分解练习顺序 */
  practiceSteps: PracticeStep[]
}

/** 本地练习进度：记录已掌握的和弦和当前练到第几步 */
export interface SongProgress {
  masteredChordIds: string[]
  currentStepIndex: number
}
