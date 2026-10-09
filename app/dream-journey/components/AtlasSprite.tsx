import Image from 'next/image'

export type AtlasQuadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type AtlasName = 'monsters' | 'monsters-v2' | 'moon-bosses' | 'items' | 'items-v2' | 'effects' | 'heroes' | 'partners' | 'moon-lotus-actions' | 'moon-fox-actions'

interface AtlasSpriteProps {
  atlas: AtlasName
  quadrant: AtlasQuadrant
  alt: string
  className?: string
  imageClassName?: string
}

const ATLAS_PATHS: Record<AtlasName, string> = {
  monsters: '/games/dream-journey/battle/monsters-atlas-v1.png',
  'monsters-v2': '/games/dream-journey/battle/monsters-atlas-v2.png',
  'moon-bosses': '/games/dream-journey/battle/moon-bosses-atlas-v1.png',
  items: '/games/dream-journey/battle/items-atlas-v1.png',
  'items-v2': '/games/dream-journey/battle/items-atlas-v2.png',
  effects: '/games/dream-journey/battle/effects-atlas-v1.png',
  heroes: '/games/dream-journey/battle/hero-combat-atlas-v1.png',
  partners: '/games/dream-journey/battle/partners-atlas-v1.png',
  'moon-lotus-actions': '/games/dream-journey/battle/moon-lotus-actions-v1.webp',
  'moon-fox-actions': '/games/dream-journey/battle/moon-fox-actions-v1.webp',
}

const POSITIONS: Record<AtlasQuadrant, string> = {
  'top-left': 'left-0 top-0',
  'top-right': '-left-full top-0',
  'bottom-left': 'left-0 -top-full',
  'bottom-right': '-left-full -top-full',
}

export default function AtlasSprite({ atlas, quadrant, alt, className = '', imageClassName = '' }: AtlasSpriteProps) {
  const positionedAbsolutely = className.split(/\s+/).includes('absolute')
  return (
    <span
      className={`block overflow-hidden ${className}`}
      style={{ position: positionedAbsolutely ? 'absolute' : 'relative' }}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <Image
        src={ATLAS_PATHS[atlas]}
        alt=""
        width={1240}
        height={1240}
        sizes="256px"
        className={`pointer-events-none absolute h-[200%] w-[200%] max-w-none object-fill ${POSITIONS[quadrant]} ${imageClassName}`}
        unoptimized
      />
    </span>
  )
}

export function monsterQuadrant(name: string): AtlasQuadrant {
  if (name === '泡泡精') return 'top-left'
  if (name === '花妖') return 'top-right'
  if (name === '巡山小妖') return 'bottom-left'
  if (name === '青竹灵') return 'top-left'
  if (name === '月影狐') return 'top-right'
  if (name === '石甲卫') return 'bottom-left'
  if (name === '沧澜羽蛇') return 'bottom-right'
  if (name === '月蚀妖狐') return 'top-left'
  if (name === '星灯侍灵') return 'top-right'
  if (name === '镜魇') return 'bottom-left'
  return 'bottom-right'
}

export function monsterAtlas(name: string): AtlasName {
  if (['月蚀妖狐', '星灯侍灵', '镜魇'].includes(name)) return 'moon-bosses'
  return ['青竹灵', '月影狐', '石甲卫', '沧澜羽蛇'].includes(name) ? 'monsters-v2' : 'monsters'
}

export function itemQuadrant(itemId: string): AtlasQuadrant {
  if (itemId === 'traveler-sword') return 'top-left'
  if (itemId === 'cloud-robe') return 'top-right'
  if (itemId === 'crimson-charm') return 'bottom-left'
  if (itemId === 'bamboo-shadow-blade') return 'top-left'
  if (itemId === 'moonweave-robe') return 'top-right'
  if (itemId === 'jade-guardian-charm') return 'bottom-left'
  return 'bottom-right'
}

export function itemAtlas(itemId: string): AtlasName {
  return ['bamboo-shadow-blade', 'moonweave-robe', 'jade-guardian-charm'].includes(itemId) ? 'items-v2' : 'items'
}

export function heroQuadrant(phase: 'idle' | 'attack' | 'cast' | 'hurt'): AtlasQuadrant {
  if (phase === 'attack') return 'top-right'
  if (phase === 'cast') return 'bottom-left'
  if (phase === 'hurt') return 'bottom-right'
  return 'top-left'
}
