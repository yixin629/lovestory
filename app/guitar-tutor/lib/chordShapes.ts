import type { ChordShape, StringState } from '../types'

/**
 * 标准初学者开放和弦指法字典。
 *
 * 这些指法（哪根弦按第几品、用第几根手指、哪些弦不弹）都是公开的、
 * 教科书级别的吉他基础乐理事实，不属于任何单一歌曲或谱面网站的版权内容，
 * 因此可以放心作为可复用的基础数据。字典按和弦名分组，之后新增歌曲只需要
 * 引用已有和弦 id，或者按同样的结构补充新和弦。
 */

const open: StringState = { type: 'open' }
const muted: StringState = { type: 'muted' }
const fret = (fretNumber: number, finger: 1 | 2 | 3 | 4): StringState => ({
  type: 'fretted',
  fret: fretNumber,
  finger,
})

export const chordShapes: Record<string, ChordShape> = {
  F: {
    id: 'F',
    displayName: 'F（简化版，不需要大横按）',
    // 6弦到1弦：不弹、不弹、食指按2品(第4弦)... 按照下方文字说明重新对应
    strings: [muted, muted, fret(3, 3), fret(2, 2), fret(1, 1), fret(1, 1)],
    description:
      'F和弦（新手简化版）：食指同时轻按1弦和2弦第1品，中指按3弦第2品，无名指按4弦第3品，5、6弦不弹。',
  },
  G: {
    id: 'G',
    displayName: 'G',
    strings: [fret(3, 2), fret(2, 1), open, open, open, fret(3, 3)],
    description:
      'G和弦：中指按6弦第3品，食指按5弦第2品，无名指按1弦第3品，2、3、4弦保持空弦。',
  },
  Em: {
    id: 'Em',
    displayName: 'Em',
    strings: [open, fret(2, 2), fret(2, 3), open, open, open],
    description:
      'Em和弦：中指按5弦第2品，无名指按4弦第2品，1、2、3、6弦都是空弦，是最容易上手的和弦之一。',
  },
  Am: {
    id: 'Am',
    displayName: 'Am',
    strings: [muted, open, fret(2, 2), fret(2, 3), fret(1, 1), open],
    description:
      'Am和弦：食指按2弦第1品，中指按4弦第2品，无名指按3弦第2品，1、5弦空弦，6弦不弹。',
  },
  C: {
    id: 'C',
    displayName: 'C',
    strings: [muted, fret(3, 3), fret(2, 2), open, fret(1, 1), open],
    description:
      'C和弦：无名指按5弦第3品，中指按4弦第2品，食指按2弦第1品，1、3弦空弦，6弦不弹。',
  },
  // 以下是后续歌曲可能用到的常见开放和弦，先补齐字典，方便未来扩充曲库时
  // 不用重新设计数据结构，只需要在 songLibrary.ts 里直接引用这些 id。
  D: {
    id: 'D',
    displayName: 'D',
    strings: [muted, muted, open, fret(2, 1), fret(3, 3), fret(2, 2)],
    description:
      'D和弦：食指按3弦第2品，中指按1弦第2品，无名指按2弦第3品，4弦空弦，5、6弦不弹。',
  },
  A: {
    id: 'A',
    displayName: 'A',
    strings: [muted, open, fret(2, 1), fret(2, 2), fret(2, 3), open],
    description:
      'A和弦：食指、中指、无名指同时按住4、3、2弦第2品，1、5弦空弦，6弦不弹。',
  },
  E: {
    id: 'E',
    displayName: 'E',
    strings: [open, fret(2, 2), fret(2, 3), fret(1, 1), open, open],
    description:
      'E和弦：食指按3弦第1品，中指按5弦第2品，无名指按4弦第2品，1、2、6弦空弦。',
  },
  Dm: {
    id: 'Dm',
    displayName: 'Dm',
    strings: [muted, muted, open, fret(2, 1), fret(3, 3), fret(1, 2)],
    description:
      'Dm和弦：食指按2弦第1品，中指按1弦第2品，无名指按2弦第3品（此处按4弦第2品，与D和弦差别在1弦），5、6弦不弹。',
  },
  G7: {
    id: 'G7',
    displayName: 'G7',
    strings: [fret(3, 3), fret(2, 2), open, open, open, fret(1, 1)],
    description:
      'G7和弦：无名指按6弦第3品，中指按5弦第2品，食指按1弦第1品，2、3、4弦空弦。',
  },
  C7: {
    id: 'C7',
    displayName: 'C7',
    strings: [muted, fret(3, 3), fret(2, 2), fret(3, 4), fret(1, 1), open],
    description:
      'C7和弦：无名指按5弦第3品，中指按4弦第2品，小指按3弦第3品，食指按2弦第1品，1弦空弦，6弦不弹。',
  },
}

export function getChordShape(chordId: string): ChordShape | undefined {
  return chordShapes[chordId]
}

export function listChordShapes(): ChordShape[] {
  return Object.values(chordShapes)
}
