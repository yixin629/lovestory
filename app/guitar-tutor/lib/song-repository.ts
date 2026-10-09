import type { Song } from '../types'
import { getSongByIdRaw, listSongsRaw } from './songLibrary'

/**
 * 曲库读取层：目前只从本地 songLibrary.ts 读取，但把"读数据"这件事
 * 单独抽成函数，是为了让组件不直接依赖具体数据源。以后如果要接入
 * Supabase 表或真实的和弦查询 API，只需要改这个文件内部实现（比如参考
 * app/pte-practice/lib/item-repository.ts 的"云端优先、本地兜底"写法），
 * 调用方（page.tsx、组件）不需要跟着改。
 */

export async function listSongs(): Promise<Song[]> {
  return listSongsRaw()
}

export async function getSongById(songId: string): Promise<Song | undefined> {
  return getSongByIdRaw(songId)
}
