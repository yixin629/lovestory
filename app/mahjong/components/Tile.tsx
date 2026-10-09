'use client'

import { Tile as TileType } from '../engine/MahjongLogic'

interface TileProps {
  tile?: TileType
  isHidden?: boolean
  isSideways?: boolean
  isSelected?: boolean
  onClick?: () => void
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const NUM_CN: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九',
}

const SUIT_CN: Record<string, string> = {
  characters: '万',
  bamboo: '条',
  dots: '筒',
}

const SUIT_COLOR: Record<string, string> = {
  characters: '#c0392b',
  bamboo: '#27ae60',
  dots: '#2980b9',
}

export default function Tile({
  tile,
  isHidden = false,
  isSideways = false,
  isSelected = false,
  onClick,
  className = '',
  size = 'md',
}: TileProps) {
  const dims = {
    xs: { w: 24, h: 32, numSize: 11, suitSize: 9 },
    sm: { w: 30, h: 40, numSize: 13, suitSize: 10 },
    md: { w: 36, h: 50, numSize: 15, suitSize: 12 },
    lg: { w: 44, h: 62, numSize: 20, suitSize: 14 },
  }[size]

  const baseStyle: React.CSSProperties = {
    width: dims.w,
    height: dims.h,
    borderRadius: 4,
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    position: 'relative',
    flexShrink: 0,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    transform: isSelected ? 'translateY(-12px)' : isSideways ? 'rotate(90deg)' : 'none',
    cursor: onClick ? 'pointer' : 'default',
    boxShadow: isSelected
      ? '0 8px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)'
      : '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6)',
  }

  if (isHidden) {
    return (
      <div
        className={className}
        style={{
          ...baseStyle,
          background: 'linear-gradient(135deg, #1a6b3c 0%, #0d4f2b 100%)',
          border: '1px solid #0a3d21',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{
          width: dims.w - 8,
          height: dims.h - 8,
          borderRadius: 2,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
        }} />
      </div>
    )
  }

  const color = tile ? SUIT_COLOR[tile.suit] : '#333'
  const numText = tile ? NUM_CN[tile.value] : ''
  const suitText = tile ? SUIT_CN[tile.suit] : ''
  const tileLabel = tile ? `${NUM_CN[tile.value]}${SUIT_CN[tile.suit]}` : '麻将牌'

  return (
    <button
      type="button"
      aria-label={tileLabel}
      aria-pressed={isSelected}
      disabled={!onClick}
      onClick={onClick}
      className={className}
      style={{
        ...baseStyle,
        background: 'linear-gradient(180deg, #faf8f0 0%, #e8e4d8 100%)',
        border: '1px solid #c4b998',
        borderBottom: '3px solid #a89970',
      }}
      onMouseEnter={(e) => {
        if (onClick && !isSelected) {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.8)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = isSideways ? 'rotate(90deg)' : 'none'
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6)'
        }
      }}
    >
      <span
        style={{
          fontSize: dims.numSize,
          fontWeight: 900,
          lineHeight: 1,
          color,
          fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
        }}
      >
        {numText}
      </span>
      <span
        style={{
          fontSize: dims.suitSize,
          fontWeight: 700,
          lineHeight: 1,
          color,
          marginTop: 1,
          fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
        }}
      >
        {suitText}
      </span>
    </button>
  )
}
