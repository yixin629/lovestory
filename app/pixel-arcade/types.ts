export type ArcadeGameId = 'sky-hop' | 'run-gun' | 'cloud-puff' | 'spirit-duel' | 'energy-brawl' | 'fruit-slash' | 'gem-match'

export interface ArcadeGameDefinition {
  id: ArcadeGameId
  name: string
  inspiration: string
  icon: string
  description: string
  accent: string
  controls: string
}

export const ARCADE_GAMES: ArcadeGameDefinition[] = [
  { id: 'sky-hop', name: '星跃大冒险', inspiration: '经典横版跳跃', icon: '🍄', description: '踩怪、收星币，越过浮岛抵达终点旗帜。', accent: 'from-sky-500 to-blue-700', controls: '移动、跳跃' },
  { id: 'run-gun', name: '火线双雄', inspiration: '横版跑射闯关', icon: '🔫', description: '边移动边射击，击退一波波机械军团。', accent: 'from-orange-500 to-red-700', controls: '移动、射击、跳跃' },
  { id: 'cloud-puff', name: '云团变身记', inspiration: '吞噬与能力复制', icon: '☁️', description: '吸入彩色精灵，复制能力并发射星星。', accent: 'from-pink-400 to-fuchsia-600', controls: '移动、吸入、能力' },
  { id: 'spirit-duel', name: '灵兽图鉴', inspiration: '精灵收集对战', icon: '⚡', description: '削弱野生灵兽，再用契约球把它收进图鉴。', accent: 'from-emerald-500 to-teal-700', controls: '攻击、捕捉' },
  { id: 'energy-brawl', name: '能量大乱斗', inspiration: '高速能量格斗', icon: '🔥', description: '蓄积气力、近身连击，用能量波击败对手。', accent: 'from-violet-600 to-indigo-900', controls: '移动、拳击、能量波' },
  { id: 'fruit-slash', name: '水果连斩', inspiration: '反应力切水果', icon: '🍉', description: '移动刀光锁定水果，连续斩击，小心混入其中的炸弹。', accent: 'from-lime-500 to-emerald-700', controls: '移动准星、挥刀' },
  { id: 'gem-match', name: '星糖消消乐', inspiration: '三消益智闯关', icon: '🍬', description: '选中相邻星糖交换，连成三个或更多完成关卡目标。', accent: 'from-pink-500 to-purple-700', controls: '移动光标、选择交换、洗牌' },
]
