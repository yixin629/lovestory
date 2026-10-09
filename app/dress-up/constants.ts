import type { ReactNode } from 'react'

export interface SavedOutfit {
  id: string
  name: string
  gender: 'male' | 'female'
  skinTone: number
  hairStyle: number
  hairColor: string
  topStyle: number
  topColor: string
  bottomStyle: number
  bottomColor: string
  shoesStyle: number
  shoesColor: string
  accessory: number
  scene: number
  lipColor?: number
  eyeColor?: number
  blushColor?: number
  challengeTitle?: string
  challengeScore?: number
  timestamp: number
}

export interface StyleChallenge {
  title: string
  story: string
  scene: number
  topStyles: number[]
  bottomStyles: number[]
  shoeStyles: number[]
  accessories: number[]
}

export const STYLE_CHALLENGES: StyleChallenge[] = [
  { title: '海边日落约会', story: '轻松、明亮，又适合沿着沙滩散步。', scene: 2, topStyles: [0, 2, 6], bottomStyles: [2, 3, 7], shoeStyles: [0, 4, 5], accessories: [2, 5, 6] },
  { title: '咖啡馆初见', story: '温柔得体，留下让人想再见一面的印象。', scene: 1, topStyles: [1, 3, 6], bottomStyles: [0, 2, 4], shoeStyles: [2, 3, 6], accessories: [1, 4, 5] },
  { title: '都市通勤日', story: '在专业与个人风格之间找到平衡。', scene: 3, topStyles: [1, 5, 7], bottomStyles: [0, 4, 6], shoeStyles: [1, 3, 6], accessories: [1, 5, 6] },
  { title: '霓虹夜游', story: '大胆一点，让造型在夜色中成为焦点。', scene: 5, topStyles: [2, 3, 5], bottomStyles: [3, 5, 7], shoeStyles: [1, 2, 7], accessories: [2, 3, 7] },
  { title: '周末公园野餐', story: '舒服、自然，还要方便一起拍照。', scene: 4, topStyles: [0, 2, 4], bottomStyles: [0, 1, 3], shoeStyles: [0, 4, 5], accessories: [3, 5, 6] },
]

export interface Scene {
  name: string
  emoji: string
  sky: string
  ground: string
  decorations?: ReactNode
}

export const SKIN_TONES = [
  { base: '#FADBC4', shadow: '#E8B89A', highlight: '#FFE8D6' },
  { base: '#EECEB2', shadow: '#D4A888', highlight: '#F8DFC7' },
  { base: '#DEB088', shadow: '#B88D65', highlight: '#EBC6A0' },
  { base: '#B88560', shadow: '#8E6140', highlight: '#CDA080' },
  { base: '#8B5A3C', shadow: '#613A24', highlight: '#A07456' },
  { base: '#5C3A24', shadow: '#3E2416', highlight: '#7A5438' },
]

export const SCENES: Scene[] = [
  {
    name: '城市街道',
    emoji: '🏙️',
    sky: 'linear-gradient(180deg, #87CEEB 0%, #B4D4E8 60%, #E0E8EF 100%)',
    ground: 'linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 100%)',
  },
  {
    name: '温馨咖啡厅',
    emoji: '☕',
    sky: 'linear-gradient(180deg, #8B6F47 0%, #A38560 60%, #C4A27E 100%)',
    ground: 'linear-gradient(180deg, #6b4423 0%, #4a2f18 100%)',
  },
  {
    name: '海边沙滩',
    emoji: '🌊',
    sky: 'linear-gradient(180deg, #FFB88C 0%, #FFD7B0 30%, #87CEEB 60%, #4A9BC4 100%)',
    ground: 'linear-gradient(180deg, #F5DEB3 0%, #E8CC9E 100%)',
  },
  {
    name: '现代办公室',
    emoji: '🏢',
    sky: 'linear-gradient(180deg, #D4E0EC 0%, #E8EEF4 50%, #F5F7FA 100%)',
    ground: 'linear-gradient(180deg, #8a8a8a 0%, #6b6b6b 100%)',
  },
  {
    name: '绿意公园',
    emoji: '🌳',
    sky: 'linear-gradient(180deg, #87CEEB 0%, #AEDBF0 40%, #C8E6C9 100%)',
    ground: 'linear-gradient(180deg, #5a7f3a 0%, #3d5a28 100%)',
  },
  {
    name: '霓虹夜街',
    emoji: '🌃',
    sky: 'linear-gradient(180deg, #1a0033 0%, #2d0854 40%, #4a1078 100%)',
    ground: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1e 100%)',
  },
]

export const HAIR_STYLES_MALE = [
  '短寸',
  '油头',
  '毛寸',
  '中分',
  '偏分微卷',
  '蓬松烫',
  '莫西干',
  '辫子',
]

export const HAIR_STYLES_FEMALE = [
  '长直发',
  '齐肩短发',
  '高马尾',
  '双麻花辫',
  '丸子头',
  '大波浪',
  '锁骨发',
  '空气刘海',
]

export const TOP_STYLES_MALE = [
  '纯棉T恤',
  '牛津衬衫',
  '连帽卫衣',
  '皮夹克',
  'Polo衫',
  '西装外套',
  '针织毛衣',
  '工装夹克',
]

export const TOP_STYLES_FEMALE = [
  '基础T恤',
  '丝质衬衫',
  '连衣裙',
  '针织开衫',
  '卫衣',
  '小香风外套',
  '吊带背心',
  '风衣',
]

export const BOTTOM_STYLES = [
  '直筒牛仔',
  '阔腿裤',
  '百褶裙',
  '短裤',
  '西装裤',
  '工装裤',
  '紧身裤',
  '短裙',
]

export const SHOES_STYLES = [
  '白色运动鞋',
  '皮革短靴',
  '高跟鞋',
  '牛津鞋',
  '凉鞋',
  '帆布鞋',
  '乐福鞋',
  '马丁靴',
]

export const ACCESSORIES = [
  '无',
  '金属眼镜',
  '墨镜',
  '棒球帽',
  '贝雷帽',
  '手拿包',
  '斜挎包',
  '耳机',
]

export const LIP_COLORS = [
  { name: '裸粉', color: '#D4A5A8' },
  { name: '蜜桃', color: '#E8909C' },
  { name: '正红', color: '#C9304A' },
  { name: '豆沙', color: '#B86A6B' },
  { name: '酒红', color: '#8A2E3E' },
  { name: '玫瑰', color: '#D64665' },
]

export const EYE_COLORS = [
  { name: '深棕', color: '#3a2817' },
  { name: '琥珀', color: '#8B5A2B' },
  { name: '榛果', color: '#6B4423' },
  { name: '海蓝', color: '#2E5A7A' },
  { name: '翠绿', color: '#3a6b3a' },
  { name: '灰绿', color: '#5A6B5A' },
]

export const BLUSH_COLORS = [
  { name: '无', color: '' },
  { name: '嫩粉', color: '#F8B8BE' },
  { name: '蜜桃', color: '#FFC5A5' },
  { name: '玫瑰', color: '#E89A9A' },
  { name: '珊瑚', color: '#F79C82' },
]
