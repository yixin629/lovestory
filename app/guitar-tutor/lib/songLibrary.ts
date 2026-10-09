import type { Song, StrumPattern } from '../types'

/**
 * 曲库为什么是"人工整理"而不是"输入歌名联网搜索"：
 *
 * 真正拥有完整和弦谱/六线谱数据库的网站（Ultimate Guitar、Songsterr 等）
 * 并不对外开放可转载数据的 API——它们是向词曲版权方付费获得"在自己网站上
 * 展示"这一授权，把这些谱面数据通过接口转发给第三方应用会构成侵权。
 * Hooktheory 虽然有公开 API，但只暴露"和弦走向统计"（比如"C 后面最常接
 * 什么和弦"），并不能"输入任意歌名查到完整和弦"，曲目覆盖也以欧美流行
 * 曲目为主，不保证任意歌曲（尤其是中文歌）都能查到。
 *
 * 因此这里采用"人工核实 + 原创教学内容"的曲库模式：先查阅公开可得的
 * 和弦名称、调性/移调等事实性信息（这类信息本身不受版权保护，就像"这首
 * 歌用到 C、G、Am、F 这几个和弦"是客观事实），再手写一套原创的分解练习
 * 步骤。曲库里绝不包含歌词，也不复制任何谱面网站的具体排版。
 *
 * 数据访问方式刻意设计成"可插拔"：本文件只导出纯数据，组件不直接 import
 * 这个文件，而是通过 song-repository.ts 里的 getSongById/listSongs 读取。
 * 以后如果接入真实的和弦查询 API 或 Supabase 表，只需要改 repository 的
 * 实现，调用方完全不用变。
 */

export const strumPatterns: Record<string, StrumPattern> = {
  'basic-ballad': {
    id: 'basic-ballad',
    displayName: '基础抒情节奏型（D DU UDU）',
    beats: ['D', 'D', 'U', 'U', 'D', 'U'],
    suggestedBpm: 60,
    description:
      '通用初学者节奏型，适合大部分抒情/流行歌曲：向下、向下、向上、向上、向下、向上，每小节 6 个动作，建议先从每分钟 60 拍练起。',
  },
}

export const songs: Song[] = [
  {
    id: 'always-online-jj-lin',
    title: 'Always Online',
    artist: '林俊杰',
    keyInfo:
      '常见的新手简化编配以 F 大调为主。原唱调性不同，实际弹唱时通常需要变调夹：男声大约夹 0-4 品，女声大约夹 5-7 品，具体夹几品因人而异，但不管夹在哪一品，下面的和弦指法都不需要改变。',
    chordIds: ['F', 'G', 'Em', 'Am', 'C'],
    sections: [
      {
        id: 'verse',
        label: '主歌（循环）',
        chordSequence: ['F', 'G', 'Em', 'Am'],
        note: '这四个和弦会反复循环，是整首歌最基础的和弦圈。',
      },
      {
        id: 'chorus',
        label: '副歌',
        chordSequence: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C'],
        note: '前半段和主歌一样，后面多了 F-G-C 的收尾。',
      },
    ],
    strumPatternId: 'basic-ballad',
    practiceSteps: [
      {
        id: 'step-1-em',
        title: '第一步：单独练 Em',
        chordIds: ['Em'],
        instruction: 'Em 只需要两根手指，是最容易上手的和弦。先反复按弦、松开，确认每根弦都能弹响。',
      },
      {
        id: 'step-2-am',
        title: '第二步：单独练 Am',
        chordIds: ['Am'],
        instruction: '换成 Am 的指法，同样反复按弦确认音色清晰，再和上一步的 Em 对比手型差异。',
      },
      {
        id: 'step-3-em-am',
        title: '第三步：Em ↔ Am 切换',
        chordIds: ['Em', 'Am'],
        instruction: '慢速在 Em 和 Am 之间来回切换，重点是手指移动的路线尽量固定，不要每次都重新找位置。',
      },
      {
        id: 'step-4-add-g',
        title: '第四步：加入 G，练 Em → Am → G',
        chordIds: ['Em', 'Am', 'G'],
        instruction: '在前一步的基础上加入 G，按 Em → Am → G 的顺序循环切换，速度可以比正式弹唱慢一半。',
      },
      {
        id: 'step-5-add-f',
        title: '第五步：加入 F，练完整和弦圈',
        chordIds: ['Em', 'Am', 'G', 'F'],
        instruction: 'F 对新手来说通常最难，先单独多按几次熟悉手型，再按 F → G → Em → Am 的顺序完整过一遍。',
      },
      {
        id: 'step-6-verse-loop',
        title: '第六步：主歌和弦圈 + 节奏型',
        chordIds: ['F', 'G', 'Em', 'Am'],
        instruction: '配合下面的节奏型，按 F-G-Em-Am 循环，每个和弦弹满一小节再换下一个和弦。',
      },
      {
        id: 'step-7-chorus',
        title: '第七步：副歌扩展 F-G-C',
        chordIds: ['F', 'G', 'Em', 'Am', 'C'],
        instruction: '在主歌和弦圈熟练后，练习副歌结尾的 F-G-C 收尾走向，注意 C 和弦手指要提前准备好按弦位置。',
      },
    ],
  },
]

export function listSongsRaw(): Song[] {
  return songs
}

export function getSongByIdRaw(songId: string): Song | undefined {
  return songs.find((song) => song.id === songId)
}

export function getStrumPattern(patternId: string): StrumPattern | undefined {
  return strumPatterns[patternId]
}
