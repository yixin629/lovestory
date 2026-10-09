'use client'

import { useState, useEffect } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import { useToast } from '@/app/components/feedback/ToastProvider'
import { useAuth } from '@/hooks/useAuth'
import { coupleChannel } from '@/lib/couple-interactions'
import { supabase } from '@/lib/supabase'
import {
  ACCESSORIES,
  BLUSH_COLORS,
  BOTTOM_STYLES,
  EYE_COLORS,
  HAIR_STYLES_FEMALE,
  HAIR_STYLES_MALE,
  LIP_COLORS,
  SCENES,
  SHOES_STYLES,
  SKIN_TONES,
  STYLE_CHALLENGES,
  TOP_STYLES_FEMALE,
  TOP_STYLES_MALE,
  type SavedOutfit,
} from './constants'
import { darken, lighten } from './lib/color'

export default function DressUpPage() {
  const toast = useToast()
  const { user, coupleId, nameOf } = useAuth()
  const [gender, setGender] = useState<'male' | 'female'>('female')
  const [skinTone, setSkinTone] = useState(0)
  const [hairStyle, setHairStyle] = useState(0)
  const [hairColor, setHairColor] = useState('#2C1810')
  const [topStyle, setTopStyle] = useState(0)
  const [topColor, setTopColor] = useState('#F5F5F5')
  const [bottomStyle, setBottomStyle] = useState(0)
  const [bottomColor, setBottomColor] = useState('#2E4C7B')
  const [shoesStyle, setShoesStyle] = useState(0)
  const [shoesColor, setShoesColor] = useState('#FFFFFF')
  const [accessory, setAccessory] = useState(0)
  const [scene, setScene] = useState(0)
  // Makeup state (mostly for female, but blush works for both)
  const [lipColor, setLipColor] = useState(0)
  const [eyeColor, setEyeColor] = useState(0)
  const [blushColor, setBlushColor] = useState(1)
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([])
  const [sharedOutfits, setSharedOutfits] = useState<Array<{ id: string; created_by: string; name: string; outfit: SavedOutfit; liked_by: string[]; created_at: string }>>([])
  const [outfitName, setOutfitName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'hair' | 'top' | 'bottom' | 'shoes' | 'accessory' | 'scene' | 'makeup'>('scene')
  const [challengeScore, setChallengeScore] = useState<number | null>(null)
  const [coins, setCoins] = useState(0)
  const challengeDay = new Date().toISOString().slice(0, 10)
  const dailyChallenge = STYLE_CHALLENGES[Math.floor(Date.now() / 86400000) % STYLE_CHALLENGES.length]

  useEffect(() => {
    const saved = localStorage.getItem('dressUpOutfits_v3')
    if (saved) setSavedOutfits(JSON.parse(saved))
    setCoins(Number(localStorage.getItem('dressUpCoins') ?? 0))
  }, [])

  const judgeChallenge = () => {
    let score = 10
    if (scene === dailyChallenge.scene) score += 35
    if (dailyChallenge.topStyles.includes(topStyle)) score += 20
    if (dailyChallenge.bottomStyles.includes(bottomStyle)) score += 15
    if (dailyChallenge.shoeStyles.includes(shoesStyle)) score += 10
    if (dailyChallenge.accessories.includes(accessory)) score += 10
    setChallengeScore(score)
    const claimKey = `dressUpChallenge:${challengeDay}`
    if (!localStorage.getItem(claimKey)) {
      const reward = Math.max(10, Math.floor(score / 2))
      const nextCoins = coins + reward
      setCoins(nextCoins)
      localStorage.setItem('dressUpCoins', String(nextCoins))
      localStorage.setItem(claimKey, String(score))
      toast.success(`挑战完成，获得 ${reward} 枚衣橱币！`)
    } else {
      toast.info(`本次搭配获得 ${score} 分`)
    }
  }

  const toggleLike = async (outfitId: string) => {
    if (!user) { toast.warning('请先登录再点赞'); return }
    const { error } = await supabase.rpc('toggle_dress_up_outfit_like', { p_outfit_id: outfitId })
    if (error) toast.error('点赞失败，请确认共享作品墙迁移已更新')
  }

  useEffect(() => {
    if (!coupleId) return
    const loadSharedOutfits = async () => {
      const { data, error } = await supabase.from('dress_up_outfits').select('id, created_by, name, outfit, liked_by, created_at').order('created_at', { ascending: false }).limit(30)
      if (!error && data) setSharedOutfits(data as typeof sharedOutfits)
    }
    void loadSharedOutfits()
    const channel = supabase.channel(coupleChannel(coupleId, 'dress-up-gallery')).on('postgres_changes', { event: '*', schema: 'public', table: 'dress_up_outfits' }, () => void loadSharedOutfits()).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [coupleId])

  const saveOutfit = async () => {
    if (!outfitName.trim()) { toast.error('请输入装扮名称'); return }
    const newOutfit: SavedOutfit = {
      id: Date.now().toString(),
      name: outfitName.trim(),
      gender, skinTone, hairStyle, hairColor, topStyle, topColor,
      bottomStyle, bottomColor, shoesStyle, shoesColor, accessory, scene, lipColor, eyeColor, blushColor,
      challengeTitle: challengeScore === null ? undefined : dailyChallenge.title,
      challengeScore: challengeScore ?? undefined,
      timestamp: Date.now(),
    }
    const updated = [newOutfit, ...savedOutfits]
    setSavedOutfits(updated)
    localStorage.setItem('dressUpOutfits_v3', JSON.stringify(updated))
    if (user) {
      const { error } = await supabase.from('dress_up_outfits').insert({ created_by: user, name: newOutfit.name, outfit: newOutfit })
      if (error) toast.warning('已保存到本机；共享作品墙保存失败，请确认已执行数据库迁移')
    }
    setOutfitName(''); setShowSaveDialog(false)
    toast.success(`"${newOutfit.name}" 已保存`)
  }

  const loadOutfit = (o: SavedOutfit) => {
    setGender(o.gender); setSkinTone(o.skinTone); setHairStyle(o.hairStyle); setHairColor(o.hairColor)
    setTopStyle(o.topStyle); setTopColor(o.topColor); setBottomStyle(o.bottomStyle); setBottomColor(o.bottomColor)
    setShoesStyle(o.shoesStyle); setShoesColor(o.shoesColor); setAccessory(o.accessory)
    if (o.scene !== undefined) setScene(o.scene)
    if (o.lipColor !== undefined) setLipColor(o.lipColor)
    if (o.eyeColor !== undefined) setEyeColor(o.eyeColor)
    if (o.blushColor !== undefined) setBlushColor(o.blushColor)
    toast.success(`加载 "${o.name}"`)
  }

  const deleteOutfit = (id: string) => {
    const updated = savedOutfits.filter(o => o.id !== id)
    setSavedOutfits(updated)
    localStorage.setItem('dressUpOutfits_v3', JSON.stringify(updated))
    toast.success('已删除')
  }

  const randomize = () => {
    setSkinTone(Math.floor(Math.random() * SKIN_TONES.length))
    setHairStyle(Math.floor(Math.random() * 8))
    setHairColor(['#2C1810', '#5a3a1f', '#8B4513', '#D4A574', '#FFD700', '#FF4500', '#000000', '#E3C7A1'][Math.floor(Math.random() * 8)])
    setTopStyle(Math.floor(Math.random() * 8))
    setTopColor(['#F5F5F5', '#1a1a1a', '#8B1A1A', '#2E4C7B', '#556B2F', '#E8B4B8', '#D4A574', '#4A4A4A'][Math.floor(Math.random() * 8)])
    setBottomStyle(Math.floor(Math.random() * 8))
    setBottomColor(['#2E4C7B', '#1a1a1a', '#3E2816', '#4A4A4A', '#6B4423', '#3d5a28', '#5B4632', '#1E3A5F'][Math.floor(Math.random() * 8)])
    setShoesStyle(Math.floor(Math.random() * 8))
    setShoesColor(['#FFFFFF', '#1a1a1a', '#6B4423', '#8B1A1A', '#D4A574', '#4A4A4A', '#8B4513', '#2E4C7B'][Math.floor(Math.random() * 8)])
    setAccessory(Math.floor(Math.random() * 8))
    setScene(Math.floor(Math.random() * SCENES.length))
    toast.success('🎲 随机搭配')
  }

  const skin = SKIN_TONES[skinTone]
  const currentScene = SCENES[scene]

  // ── Rendering ──
  const renderCharacter = () => {
    // Realistic proportions: head ~1/7 of total height
    // Total height: 520 units. Head: 75, neck: 15, torso: 130, legs: 200, feet: 20
    return (
      <svg viewBox="0 0 280 540" className="drop-shadow-2xl" style={{ maxHeight: 520 }}>
        <defs>
          {/* Skin gradients */}
          <radialGradient id="skinFace" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={skin.highlight} />
            <stop offset="60%" stopColor={skin.base} />
            <stop offset="100%" stopColor={skin.shadow} />
          </radialGradient>
          <linearGradient id="skinBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={skin.shadow} />
            <stop offset="50%" stopColor={skin.base} />
            <stop offset="100%" stopColor={skin.highlight} />
          </linearGradient>
          <linearGradient id="skinArm" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={skin.shadow} stopOpacity="0.8" />
            <stop offset="50%" stopColor={skin.base} />
            <stop offset="100%" stopColor={skin.highlight} />
          </linearGradient>
          <linearGradient id="skinLeg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={skin.shadow} />
            <stop offset="50%" stopColor={skin.base} />
            <stop offset="100%" stopColor={skin.highlight} />
          </linearGradient>

          {/* Hair gradient (depth) */}
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lighten(hairColor, 25)} />
            <stop offset="40%" stopColor={hairColor} />
            <stop offset="100%" stopColor={darken(hairColor, 20)} />
          </linearGradient>

          {/* Clothing fabric gradients */}
          <linearGradient id="topGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={lighten(topColor, 15)} />
            <stop offset="50%" stopColor={topColor} />
            <stop offset="100%" stopColor={darken(topColor, 15)} />
          </linearGradient>
          <linearGradient id="bottomGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={lighten(bottomColor, 12)} />
            <stop offset="50%" stopColor={bottomColor} />
            <stop offset="100%" stopColor={darken(bottomColor, 18)} />
          </linearGradient>
          <linearGradient id="shoesGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lighten(shoesColor, 15)} />
            <stop offset="100%" stopColor={darken(shoesColor, 20)} />
          </linearGradient>

          {/* Denim texture */}
          <pattern id="denim" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill={bottomColor} />
            <line x1="0" y1="0" x2="4" y2="4" stroke={darken(bottomColor, 10)} strokeWidth="0.5" opacity="0.4" />
            <line x1="0" y1="4" x2="4" y2="0" stroke={lighten(bottomColor, 8)} strokeWidth="0.3" opacity="0.3" />
          </pattern>
          {/* Knit pattern */}
          <pattern id="knit" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={topColor} />
            <path d="M0 3 L3 0 L6 3 L3 6 Z" stroke={lighten(topColor, 10)} strokeWidth="0.5" fill="none" opacity="0.5" />
          </pattern>

          {/* Drop shadow */}
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground shadow beneath character */}
        <ellipse cx="140" cy="510" rx="60" ry="10" fill="#000" opacity="0.25" />

        {/* ── Legs (drawn first, behind body) ── */}
        {renderLegs()}

        {/* ── Shoes ── */}
        {renderShoes()}

        {/* ── Bottom (pants/skirt) ── */}
        {renderBottom()}

        {/* ── Torso + Arms (skin) ── */}
        {/* Torso shape */}
        <path d="M 105 195 Q 140 185 175 195 L 180 330 L 100 330 Z"
              fill="url(#skinBody)" />
        {/* Neck */}
        <rect x="128" y="180" width="24" height="18" fill="url(#skinBody)" rx="3" />
        {/* Neck shadow */}
        <rect x="128" y="195" width="24" height="4" fill={skin.shadow} opacity="0.5" rx="2" />

        {/* Arms */}
        <path d="M 105 200 Q 88 210 82 260 L 78 330 Q 78 345 88 345 L 98 345 L 102 280 Q 108 230 110 205 Z"
              fill="url(#skinArm)" />
        <path d="M 175 200 Q 192 210 198 260 L 202 330 Q 202 345 192 345 L 182 345 L 178 280 Q 172 230 170 205 Z"
              fill="url(#skinArm)" />

        {/* ── Top (shirt/jacket) ── */}
        {renderTop()}

        {/* ── Head ── */}
        <g>
          {/* Face shape with jaw */}
          <path
            d="M 108 110 Q 105 145 115 170 Q 125 182 140 183 Q 155 182 165 170 Q 175 145 172 110 Q 170 85 140 82 Q 110 85 108 110 Z"
            fill="url(#skinFace)"
          />
          {/* Ears */}
          <ellipse cx="107" cy="138" rx="6" ry="10" fill={skin.base} />
          <ellipse cx="173" cy="138" rx="6" ry="10" fill={skin.base} />
          <ellipse cx="107" cy="138" rx="3" ry="6" fill={skin.shadow} opacity="0.5" />
          <ellipse cx="173" cy="138" rx="3" ry="6" fill={skin.shadow} opacity="0.5" />

          {/* Neck shadow on face (chin) */}
          <path d="M 125 170 Q 140 180 155 170 Q 150 185 140 187 Q 130 185 125 170 Z"
                fill={skin.shadow} opacity="0.25" />

          {/* Eye sockets (subtle shadow) */}
          <ellipse cx="125" cy="135" rx="9" ry="5" fill={skin.shadow} opacity="0.18" />
          <ellipse cx="155" cy="135" rx="9" ry="5" fill={skin.shadow} opacity="0.18" />

          {/* Eyes - almond shape (more realistic) */}
          <path d="M 116 135 Q 119 131 125 131 Q 131 131 134 135 Q 131 138 125 138 Q 119 138 116 135 Z" fill="#fff" />
          <path d="M 146 135 Q 149 131 155 131 Q 161 131 164 135 Q 161 138 155 138 Q 149 138 146 135 Z" fill="#fff" />

          {/* Iris with gradient */}
          <defs>
            <radialGradient id="irisL" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor={lighten(EYE_COLORS[eyeColor].color, 30)} />
              <stop offset="70%" stopColor={EYE_COLORS[eyeColor].color} />
              <stop offset="100%" stopColor={darken(EYE_COLORS[eyeColor].color, 30)} />
            </radialGradient>
            <radialGradient id="irisR" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor={lighten(EYE_COLORS[eyeColor].color, 30)} />
              <stop offset="70%" stopColor={EYE_COLORS[eyeColor].color} />
              <stop offset="100%" stopColor={darken(EYE_COLORS[eyeColor].color, 30)} />
            </radialGradient>
          </defs>
          <circle cx="125" cy="135" r="3.5" fill="url(#irisL)" clipPath="inset(0)" />
          <circle cx="155" cy="135" r="3.5" fill="url(#irisR)" clipPath="inset(0)" />

          {/* Pupil */}
          <circle cx="125" cy="135.5" r="1.6" fill="#000" />
          <circle cx="155" cy="135.5" r="1.6" fill="#000" />
          {/* Catchlight (glint) */}
          <circle cx="126.5" cy="133.5" r="1.1" fill="#fff" />
          <circle cx="156.5" cy="133.5" r="1.1" fill="#fff" />
          <circle cx="124" cy="134.5" r="0.4" fill="#fff" opacity="0.7" />
          <circle cx="154" cy="134.5" r="0.4" fill="#fff" opacity="0.7" />

          {/* Upper eyelashes */}
          {gender === 'female' ? (
            <>
              <path d="M 116 135 Q 122 128 134 135" stroke="#1a1008" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M 146 135 Q 152 128 164 135" stroke="#1a1008" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              {/* Individual lash hairs */}
              <line x1="118" y1="133" x2="116" y2="129" stroke="#1a1008" strokeWidth="0.8" />
              <line x1="123" y1="131" x2="122" y2="127" stroke="#1a1008" strokeWidth="0.8" />
              <line x1="128" y1="131" x2="128" y2="127" stroke="#1a1008" strokeWidth="0.8" />
              <line x1="132" y1="132" x2="133" y2="128" stroke="#1a1008" strokeWidth="0.8" />
              <line x1="148" y1="133" x2="146" y2="129" stroke="#1a1008" strokeWidth="0.8" />
              <line x1="153" y1="131" x2="152" y2="127" stroke="#1a1008" strokeWidth="0.8" />
              <line x1="158" y1="131" x2="158" y2="127" stroke="#1a1008" strokeWidth="0.8" />
              <line x1="162" y1="132" x2="163" y2="128" stroke="#1a1008" strokeWidth="0.8" />
              {/* Eyeliner wing */}
              <path d="M 134 135 L 137 133" stroke="#1a1008" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 146 135 L 143 133" stroke="#1a1008" strokeWidth="1.5" strokeLinecap="round" />
              {/* Eyeshadow hint */}
              <path d="M 116 133 Q 125 128 134 133" stroke={LIP_COLORS[lipColor].color} strokeWidth="1" fill="none" opacity="0.25" />
              <path d="M 146 133 Q 155 128 164 133" stroke={LIP_COLORS[lipColor].color} strokeWidth="1" fill="none" opacity="0.25" />
            </>
          ) : (
            <>
              <path d="M 117 134 Q 123 131 133 134" stroke="#1a1008" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <path d="M 147 134 Q 153 131 163 134" stroke="#1a1008" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </>
          )}
          {/* Lower lashline */}
          <path d="M 118 137 Q 125 139 132 137" stroke={skin.shadow} strokeWidth="0.5" fill="none" opacity="0.7" />
          <path d="M 148 137 Q 155 139 162 137" stroke={skin.shadow} strokeWidth="0.5" fill="none" opacity="0.7" />

          {/* Eyebrows (thicker, more defined) */}
          <path d="M 115 125 Q 123 120 132 123 Q 134 125 132 126 Q 123 123 115 127 Z" fill={darken(hairColor, 15)} />
          <path d="M 148 123 Q 157 120 165 125 Q 165 127 157 123 Q 148 126 148 127 Z" fill={darken(hairColor, 15)} />
          {/* Brow hair strokes */}
          <line x1="118" y1="125" x2="120" y2="122" stroke={darken(hairColor, 20)} strokeWidth="0.6" />
          <line x1="123" y1="123" x2="125" y2="121" stroke={darken(hairColor, 20)} strokeWidth="0.6" />
          <line x1="128" y1="123" x2="130" y2="121" stroke={darken(hairColor, 20)} strokeWidth="0.6" />
          <line x1="150" y1="123" x2="152" y2="121" stroke={darken(hairColor, 20)} strokeWidth="0.6" />
          <line x1="155" y1="122" x2="157" y2="120" stroke={darken(hairColor, 20)} strokeWidth="0.6" />
          <line x1="160" y1="123" x2="162" y2="121" stroke={darken(hairColor, 20)} strokeWidth="0.6" />

          {/* Nose - more anatomical */}
          <path d="M 138 140 Q 137 145 136 152 Q 135 156 137 158"
                stroke={skin.shadow} strokeWidth="0.6" fill="none" opacity="0.4" />
          <path d="M 142 140 Q 143 145 144 152 Q 145 156 143 158"
                stroke={skin.shadow} strokeWidth="0.6" fill="none" opacity="0.4" />
          {/* Nose tip + nostrils */}
          <path d="M 135 158 Q 140 161 145 158 Q 143 162 140 162 Q 137 162 135 158 Z"
                fill={skin.shadow} opacity="0.2" />
          <ellipse cx="138" cy="160" rx="1.2" ry="0.8" fill={skin.shadow} opacity="0.55" />
          <ellipse cx="142" cy="160" rx="1.2" ry="0.8" fill={skin.shadow} opacity="0.55" />
          {/* Nose highlight (bridge) */}
          <path d="M 140 135 L 140 156" stroke={skin.highlight} strokeWidth="0.8" opacity="0.5" />

          {/* Lips */}
          {gender === 'female' ? (
            <g>
              {/* Upper lip with cupid's bow */}
              <path d="M 130 168 Q 134 166 137 167 Q 138 165 140 165 Q 142 165 143 167 Q 146 166 150 168 Q 147 171 140 171 Q 133 171 130 168 Z"
                    fill={LIP_COLORS[lipColor].color} opacity="0.9" />
              {/* Lower lip */}
              <path d="M 130 168 Q 140 175 150 168 Q 148 177 140 178 Q 132 177 130 168 Z"
                    fill={LIP_COLORS[lipColor].color} />
              {/* Lip line (center) */}
              <path d="M 130 169 Q 140 171 150 169" stroke={darken(LIP_COLORS[lipColor].color, 25)} strokeWidth="0.6" fill="none" />
              {/* Lip highlight */}
              <ellipse cx="140" cy="173" rx="3.5" ry="1" fill="#fff" opacity="0.35" />
              <ellipse cx="137" cy="167" rx="1.5" ry="0.6" fill="#fff" opacity="0.3" />
            </g>
          ) : (
            <g>
              <path d="M 132 170 Q 140 172 148 170 Q 146 174 140 174 Q 134 174 132 170 Z"
                    fill="#9A5E4E" opacity="0.75" />
              <path d="M 132 170 Q 140 171 148 170" stroke="#7A3E2E" strokeWidth="0.5" fill="none" />
            </g>
          )}

          {/* Blush - soft layered */}
          {BLUSH_COLORS[blushColor].color && (
            <g>
              <ellipse cx="120" cy="155" rx="10" ry="5" fill={BLUSH_COLORS[blushColor].color} opacity="0.35" />
              <ellipse cx="160" cy="155" rx="10" ry="5" fill={BLUSH_COLORS[blushColor].color} opacity="0.35" />
              {/* Inner darker spot */}
              <ellipse cx="120" cy="155" rx="5" ry="2.5" fill={BLUSH_COLORS[blushColor].color} opacity="0.4" />
              <ellipse cx="160" cy="155" rx="5" ry="2.5" fill={BLUSH_COLORS[blushColor].color} opacity="0.4" />
            </g>
          )}

          {/* Face highlight (forehead/cheekbone) */}
          <ellipse cx="140" cy="110" rx="18" ry="8" fill={skin.highlight} opacity="0.25" />
          <ellipse cx="120" cy="145" rx="5" ry="8" fill={skin.highlight} opacity="0.15" />
          <ellipse cx="160" cy="145" rx="5" ry="8" fill={skin.highlight} opacity="0.15" />
        </g>

        {/* ── Hair ── */}
        {renderHair()}

        {/* ── Accessory on head/face ── */}
        {renderAccessory()}
      </svg>
    )
  }

  function renderHair() {
    const c = 'url(#hairGrad)'
    if (gender === 'female') {
      switch (hairStyle) {
        case 0: // 长直发
          return (
            <g>
              {/* Back silhouette */}
              <path d="M 98 95 L 90 250 Q 92 260 102 262 L 178 262 Q 188 260 190 250 L 182 95 Q 140 82 98 95 Z" fill={darken(hairColor, 15)} />
              {/* Main cap */}
              <path d="M 100 95 Q 98 65 140 62 Q 182 65 180 95 L 182 100 Q 175 82 140 80 Q 105 82 98 100 Z" fill={c} />
              {/* Left hair strand falling */}
              <path d="M 98 95 Q 94 130 92 200 Q 92 245 100 250 L 120 250 L 122 140 Q 118 110 102 98 Z" fill={c} />
              {/* Right hair strand falling */}
              <path d="M 182 95 Q 186 130 188 200 Q 188 245 180 250 L 160 250 L 158 140 Q 162 110 178 98 Z" fill={c} />
              {/* Front bangs (side sweep) */}
              <path d="M 105 90 Q 120 74 142 82 Q 168 74 178 92 Q 170 100 140 98 Q 115 100 105 95 Z" fill={c} />
              {/* Parting line (subtle) */}
              <path d="M 135 70 Q 138 85 140 95" stroke={darken(hairColor, 25)} strokeWidth="0.8" fill="none" opacity="0.5" />
              {/* Individual hair strand highlights */}
              <path d="M 102 100 Q 99 160 106 230" stroke={lighten(hairColor, 30)} strokeWidth="1" fill="none" opacity="0.6" />
              <path d="M 112 110 Q 110 170 116 235" stroke={lighten(hairColor, 20)} strokeWidth="0.7" fill="none" opacity="0.5" />
              <path d="M 170 100 Q 173 160 166 230" stroke={lighten(hairColor, 30)} strokeWidth="1" fill="none" opacity="0.6" />
              <path d="M 162 110 Q 164 170 159 235" stroke={lighten(hairColor, 20)} strokeWidth="0.7" fill="none" opacity="0.5" />
              {/* Glossy top shine */}
              <ellipse cx="140" cy="75" rx="30" ry="4" fill={lighten(hairColor, 40)} opacity="0.4" />
              {/* Hair tip wisps */}
              <path d="M 95 248 Q 92 256 90 262 M 105 250 Q 105 258 103 263 M 115 252 Q 115 260 113 265" stroke={darken(hairColor, 10)} strokeWidth="0.6" fill="none" opacity="0.7" />
              <path d="M 185 248 Q 188 256 190 262 M 175 250 Q 175 258 177 263 M 165 252 Q 165 260 167 265" stroke={darken(hairColor, 10)} strokeWidth="0.6" fill="none" opacity="0.7" />
            </g>
          )
        case 1: // 齐肩短发
          return (
            <g>
              <path d="M 98 92 Q 98 68 140 65 Q 182 68 182 92 L 184 165 Q 180 180 170 180 L 110 180 Q 100 180 96 165 Z" fill={c} />
              {/* Inner shadow for depth */}
              <path d="M 98 92 Q 140 82 182 92 L 182 100 Q 140 92 98 100 Z" fill={darken(hairColor, 15)} opacity="0.6" />
              {/* Bangs */}
              <path d="M 105 88 Q 122 76 140 86 Q 158 76 175 88 Q 168 96 140 98 Q 112 96 105 92 Z" fill={c} />
              {/* Glossy shine */}
              <ellipse cx="140" cy="78" rx="28" ry="3" fill={lighten(hairColor, 35)} opacity="0.45" />
              {/* Layered ends */}
              <path d="M 98 170 L 96 180 L 108 178 L 112 172 Z" fill={darken(hairColor, 10)} />
              <path d="M 182 170 L 184 180 L 172 178 L 168 172 Z" fill={darken(hairColor, 10)} />
              {/* Highlight strands */}
              <path d="M 108 100 L 110 170" stroke={lighten(hairColor, 25)} strokeWidth="0.8" fill="none" opacity="0.6" />
              <path d="M 172 100 L 170 170" stroke={lighten(hairColor, 25)} strokeWidth="0.8" fill="none" opacity="0.6" />
            </g>
          )
        case 2: // 高马尾
          return (
            <g>
              <path d="M 105 88 Q 100 68 140 65 Q 180 68 175 88 L 178 128 Q 175 138 140 138 Q 105 138 102 128 Z" fill={c} />
              <path d="M 120 68 Q 140 55 160 68 Q 175 65 170 55 Q 140 40 110 55 Q 108 65 120 68 Z" fill={c} />
              <path d="M 155 75 Q 180 85 195 130 Q 200 180 190 210 Q 185 215 180 210 Q 175 180 175 130 Q 170 85 155 75 Z" fill={c} />
            </g>
          )
        case 3: // 双麻花辫
          return (
            <g>
              <path d="M 102 90 Q 100 70 140 68 Q 180 70 178 90 L 180 130 Q 175 140 140 140 Q 105 140 100 130 Z" fill={c} />
              <path d="M 90 125 Q 80 160 82 210 Q 85 225 92 225 Q 100 225 98 210 Q 95 165 105 128 Z" fill={c} />
              <path d="M 190 125 Q 200 160 198 210 Q 195 225 188 225 Q 180 225 182 210 Q 185 165 175 128 Z" fill={c} />
              {/* Braid detail */}
              <ellipse cx="87" cy="160" rx="6" ry="4" fill={darken(hairColor, 15)} opacity="0.4" />
              <ellipse cx="87" cy="185" rx="6" ry="4" fill={darken(hairColor, 15)} opacity="0.4" />
              <ellipse cx="193" cy="160" rx="6" ry="4" fill={darken(hairColor, 15)} opacity="0.4" />
              <ellipse cx="193" cy="185" rx="6" ry="4" fill={darken(hairColor, 15)} opacity="0.4" />
            </g>
          )
        case 4: // 丸子头
          return (
            <g>
              {/* Base wrap */}
              <path d="M 103 90 Q 100 70 140 67 Q 180 70 177 90 L 179 132 Q 175 142 140 142 Q 105 142 101 132 Z" fill={c} />
              {/* Bun base shadow ring */}
              <ellipse cx="140" cy="68" rx="28" ry="24" fill={darken(hairColor, 20)} />
              {/* Bun */}
              <ellipse cx="140" cy="55" rx="26" ry="23" fill={c} />
              {/* Bun texture strands */}
              <path d="M 118 50 Q 140 40 162 50" stroke={darken(hairColor, 15)} strokeWidth="0.8" fill="none" opacity="0.5" />
              <path d="M 120 58 Q 140 48 160 58" stroke={darken(hairColor, 15)} strokeWidth="0.8" fill="none" opacity="0.5" />
              <path d="M 122 64 Q 140 56 158 64" stroke={darken(hairColor, 15)} strokeWidth="0.8" fill="none" opacity="0.5" />
              {/* Bun highlight */}
              <ellipse cx="132" cy="48" rx="10" ry="5" fill={lighten(hairColor, 35)} opacity="0.5" />
              {/* Hair tie */}
              <ellipse cx="140" cy="78" rx="14" ry="3" fill={darken(hairColor, 30)} opacity="0.7" />
              {/* Baby hair wisps at hairline */}
              <path d="M 108 88 Q 115 84 122 90 M 158 90 Q 165 84 172 88" stroke={darken(hairColor, 10)} strokeWidth="0.6" fill="none" opacity="0.7" />
              {/* Loose strands (from bun) */}
              <path d="M 120 40 Q 108 30 105 18" stroke={c} strokeWidth="2" fill="none" />
              <path d="M 160 40 Q 172 30 175 18" stroke={c} strokeWidth="2" fill="none" />
              {/* Forehead gloss */}
              <ellipse cx="140" cy="95" rx="25" ry="3" fill={lighten(hairColor, 30)} opacity="0.4" />
            </g>
          )
        case 5: // 大波浪
          return (
            <g>
              {/* Back silhouette (wide due to volume) */}
              <path d="M 88 95 Q 80 180 78 280 L 202 280 Q 200 180 192 95 Q 140 85 88 95 Z" fill={darken(hairColor, 15)} />
              {/* Main volume */}
              <path d="M 92 98 Q 88 65 140 58 Q 192 65 188 98 L 195 200 Q 198 240 185 270 L 95 270 Q 82 240 85 200 Z" fill={c} />
              {/* Wavy strand contours (right) */}
              <path d="M 188 105 Q 200 130 195 155 Q 182 175 192 200 Q 205 225 190 260" stroke={darken(hairColor, 20)} strokeWidth="1.5" fill="none" opacity="0.6" />
              <path d="M 180 100 Q 190 130 183 160 Q 170 180 180 210 Q 190 240 175 265" stroke={darken(hairColor, 12)} strokeWidth="1" fill="none" opacity="0.5" />
              {/* Wavy strand contours (left) */}
              <path d="M 92 105 Q 80 130 85 155 Q 98 175 88 200 Q 75 225 90 260" stroke={darken(hairColor, 20)} strokeWidth="1.5" fill="none" opacity="0.6" />
              <path d="M 100 100 Q 90 130 97 160 Q 110 180 100 210 Q 90 240 105 265" stroke={darken(hairColor, 12)} strokeWidth="1" fill="none" opacity="0.5" />
              {/* Center waves */}
              <path d="M 140 105 Q 135 140 142 175 Q 148 210 140 250" stroke={lighten(hairColor, 10)} strokeWidth="0.8" fill="none" opacity="0.4" />
              {/* Side-swept bangs */}
              <path d="M 105 85 Q 125 72 155 90 Q 172 78 178 90 Q 170 100 140 100 Q 112 100 105 90 Z" fill={c} />
              {/* Lip-level volume lobes */}
              <path d="M 78 220 Q 70 250 85 275 Q 90 278 95 265 Z" fill={c} />
              <path d="M 202 220 Q 210 250 195 275 Q 190 278 185 265 Z" fill={c} />
              {/* Glossy top */}
              <ellipse cx="140" cy="72" rx="35" ry="5" fill={lighten(hairColor, 40)} opacity="0.5" />
              {/* Sparkle highlights */}
              <circle cx="108" cy="140" r="1.5" fill="#fff" opacity="0.6" />
              <circle cx="172" cy="160" r="1.2" fill="#fff" opacity="0.5" />
            </g>
          )
        case 6: // 锁骨发
          return (
            <g>
              <path d="M 102 90 Q 100 68 140 65 Q 180 68 178 90 L 180 200 Q 175 220 160 220 L 120 220 Q 105 220 100 200 Z" fill={c} />
              <path d="M 108 92 Q 140 80 172 92 L 170 180" stroke={lighten(hairColor, 15)} strokeWidth="1" fill="none" opacity="0.6" />
            </g>
          )
        case 7: // 空气刘海
          return (
            <g>
              <path d="M 100 90 Q 98 65 140 60 Q 182 65 180 90 L 182 210 Q 180 230 168 235 L 112 235 Q 100 230 98 210 Z" fill={c} />
              <path d="M 108 100 Q 140 112 172 100 Q 168 120 140 122 Q 112 120 108 100 Z" fill={c} />
              <path d="M 108 100 Q 140 115 172 100" stroke={lighten(hairColor, 15)} strokeWidth="0.8" fill="none" opacity="0.6" />
            </g>
          )
      }
    } else {
      switch (hairStyle) {
        case 0: // 短寸
          return <path d="M 108 92 Q 105 75 140 72 Q 175 75 172 92 L 174 115 Q 170 120 140 122 Q 110 120 106 115 Z" fill={c} />
        case 1: // 油头
          return (
            <g>
              <path d="M 108 92 Q 105 70 140 68 Q 175 70 172 92 L 174 115 Q 170 120 140 118 Q 110 120 106 115 Z" fill={c} />
              <path d="M 115 78 Q 140 66 165 78" stroke={lighten(hairColor, 20)} strokeWidth="1.5" fill="none" opacity="0.7" />
              <path d="M 125 88 Q 140 82 155 88" stroke={lighten(hairColor, 20)} strokeWidth="1" fill="none" opacity="0.6" />
            </g>
          )
        case 2: // 毛寸
          return (
            <g>
              <path d="M 107 90 Q 104 70 140 68 Q 176 70 173 90 L 175 116 Q 171 120 140 120 Q 109 120 105 116 Z" fill={c} />
              {/* Spiky texture */}
              <path d="M 115 75 L 118 82 M 125 72 L 127 80 M 135 70 L 137 78 M 145 70 L 147 78 M 155 72 L 157 80 M 165 75 L 167 82" stroke={darken(hairColor, 15)} strokeWidth="1" />
            </g>
          )
        case 3: // 中分
          return (
            <g>
              <path d="M 105 90 Q 102 70 140 65 Q 178 70 175 90 L 177 125 Q 172 130 140 130 Q 108 130 103 125 Z" fill={c} />
              <path d="M 140 70 L 140 100" stroke={skin.shadow} strokeWidth="1.5" />
            </g>
          )
        case 4: // 偏分微卷
          return (
            <g>
              <path d="M 104 90 Q 102 68 140 65 Q 178 68 176 90 L 178 130 Q 172 135 140 132 Q 108 135 102 130 Z" fill={c} />
              <path d="M 115 78 Q 135 70 155 85 Q 170 75 172 95" stroke={skin.shadow} strokeWidth="1.2" fill="none" opacity="0.4" />
            </g>
          )
        case 5: // 蓬松烫
          return (
            <g>
              <path d="M 100 92 Q 95 60 140 58 Q 185 60 180 92 L 185 135 Q 180 140 140 138 Q 100 140 95 135 Z" fill={c} />
              <circle cx="115" cy="75" r="8" fill={c} />
              <circle cx="140" cy="62" r="9" fill={c} />
              <circle cx="165" cy="75" r="8" fill={c} />
              <circle cx="105" cy="95" r="7" fill={c} />
              <circle cx="175" cy="95" r="7" fill={c} />
            </g>
          )
        case 6: // 莫西干
          return (
            <g>
              <path d="M 108 115 Q 105 105 115 105 L 165 105 Q 175 105 172 115 L 172 122 Q 140 120 108 122 Z" fill={darken(hairColor, 20)} />
              <path d="M 128 108 Q 125 60 140 55 Q 155 60 152 108 Z" fill={c} />
            </g>
          )
        case 7: // 辫子
          return (
            <g>
              <path d="M 108 90 Q 105 72 140 70 Q 175 72 172 90 L 174 118 Q 170 122 140 122 Q 110 122 106 118 Z" fill={c} />
              <ellipse cx="120" cy="85" rx="4" ry="3" fill={darken(hairColor, 15)} />
              <ellipse cx="140" cy="82" rx="4" ry="3" fill={darken(hairColor, 15)} />
              <ellipse cx="160" cy="85" rx="4" ry="3" fill={darken(hairColor, 15)} />
              <ellipse cx="130" cy="100" rx="4" ry="3" fill={darken(hairColor, 15)} />
              <ellipse cx="150" cy="100" rx="4" ry="3" fill={darken(hairColor, 15)} />
            </g>
          )
      }
    }
    return null
  }

  function renderTop() {
    const isFemale = gender === 'female'
    const fill = 'url(#topGrad)'
    const shadow = darken(topColor, 20)

    if (isFemale) {
      switch (topStyle) {
        case 0: // 基础T恤
          return (
            <g filter="url(#softShadow)">
              <path d="M 100 200 L 82 230 L 85 270 L 100 268 L 100 340 L 180 340 L 180 268 L 195 270 L 198 230 L 180 200 Q 170 195 150 200 L 145 210 L 135 210 L 130 200 Q 110 195 100 200 Z" fill={fill} />
              <path d="M 115 200 Q 140 210 165 200" stroke={shadow} strokeWidth="1" fill="none" opacity="0.4" />
              {/* Fabric fold */}
              <path d="M 140 210 L 138 300" stroke={shadow} strokeWidth="0.5" opacity="0.3" />
            </g>
          )
        case 1: // 丝质衬衫
          return (
            <g filter="url(#softShadow)">
              <path d="M 100 205 L 85 235 L 88 275 L 100 273 L 100 345 L 180 345 L 180 273 L 192 275 L 195 235 L 180 205 Q 160 198 140 203 Q 120 198 100 205 Z" fill={fill} />
              {/* Collar */}
              <path d="M 130 203 L 140 222 L 150 203 Q 145 210 140 210 Q 135 210 130 203 Z" fill={lighten(topColor, 8)} />
              {/* Buttons */}
              <circle cx="140" cy="235" r="1.8" fill={lighten(topColor, 20)} />
              <circle cx="140" cy="255" r="1.8" fill={lighten(topColor, 20)} />
              <circle cx="140" cy="275" r="1.8" fill={lighten(topColor, 20)} />
              <circle cx="140" cy="295" r="1.8" fill={lighten(topColor, 20)} />
              {/* Silk highlight */}
              <path d="M 120 220 Q 140 260 120 310" stroke={lighten(topColor, 25)} strokeWidth="2" fill="none" opacity="0.4" />
            </g>
          )
        case 2: // 连衣裙
          return (
            <g filter="url(#softShadow)">
              <path d="M 100 200 L 80 240 Q 75 360 65 440 L 215 440 Q 205 360 200 240 L 180 200 Q 160 195 140 202 Q 120 195 100 200 Z" fill={fill} />
              {/* Waist */}
              <path d="M 85 270 Q 140 285 195 270" stroke={shadow} strokeWidth="1" fill="none" opacity="0.5" />
              {/* Neckline */}
              <path d="M 120 205 Q 140 220 160 205" fill={shadow} opacity="0.3" />
              {/* Skirt flow */}
              <path d="M 85 330 Q 140 350 195 330" stroke={shadow} strokeWidth="0.8" fill="none" opacity="0.4" />
            </g>
          )
        case 3: // 针织开衫
          return (
            <g filter="url(#softShadow)">
              <path d="M 100 200 L 80 235 L 84 278 L 100 275 L 100 350 L 180 350 L 180 275 L 196 278 L 200 235 L 180 200 Q 160 195 140 202 Q 120 195 100 200 Z" fill="url(#knit)" />
              {/* Cardigan opening */}
              <line x1="140" y1="202" x2="140" y2="350" stroke={darken(topColor, 25)} strokeWidth="1.5" />
              <circle cx="135" cy="225" r="2" fill={darken(topColor, 30)} />
              <circle cx="135" cy="250" r="2" fill={darken(topColor, 30)} />
              <circle cx="135" cy="275" r="2" fill={darken(topColor, 30)} />
              <circle cx="135" cy="300" r="2" fill={darken(topColor, 30)} />
            </g>
          )
        case 4: // 卫衣
          return (
            <g filter="url(#softShadow)">
              <path d="M 92 205 L 75 240 L 78 285 L 95 283 L 92 350 L 188 350 L 185 283 L 202 285 L 205 240 L 188 205 Q 165 198 140 205 Q 115 198 92 205 Z" fill={fill} />
              {/* Hood */}
              <path d="M 110 170 Q 140 160 170 170 L 180 205 Q 140 198 100 205 Z" fill={darken(topColor, 8)} />
              {/* Hood strings */}
              <line x1="130" y1="205" x2="130" y2="240" stroke={darken(topColor, 20)} strokeWidth="1.2" />
              <line x1="150" y1="205" x2="150" y2="240" stroke={darken(topColor, 20)} strokeWidth="1.2" />
              <circle cx="130" cy="242" r="2" fill={darken(topColor, 30)} />
              <circle cx="150" cy="242" r="2" fill={darken(topColor, 30)} />
              {/* Front pocket */}
              <path d="M 105 290 L 105 330 L 175 330 L 175 290 Z" fill="none" stroke={darken(topColor, 15)} strokeWidth="1" opacity="0.6" />
            </g>
          )
        case 5: // 小香风外套
          return (
            <g filter="url(#softShadow)">
              <path d="M 95 200 L 78 232 L 82 280 L 98 278 L 95 345 L 185 345 L 182 278 L 198 280 L 202 232 L 185 200 Q 162 195 140 203 Q 118 195 95 200 Z" fill={fill} />
              {/* Tweed texture */}
              <circle cx="110" cy="240" r="1" fill={lighten(topColor, 20)} opacity="0.6" />
              <circle cx="125" cy="260" r="1" fill={darken(topColor, 15)} opacity="0.6" />
              <circle cx="155" cy="245" r="1" fill={lighten(topColor, 20)} opacity="0.6" />
              <circle cx="170" cy="270" r="1" fill={darken(topColor, 15)} opacity="0.6" />
              <circle cx="115" cy="290" r="1" fill={lighten(topColor, 20)} opacity="0.6" />
              <circle cx="165" cy="295" r="1" fill={darken(topColor, 15)} opacity="0.6" />
              <circle cx="140" cy="310" r="1" fill={lighten(topColor, 20)} opacity="0.6" />
              {/* Gold buttons */}
              <circle cx="120" cy="250" r="2.5" fill="#D4A574" stroke="#8B6F37" strokeWidth="0.5" />
              <circle cx="160" cy="250" r="2.5" fill="#D4A574" stroke="#8B6F37" strokeWidth="0.5" />
              <circle cx="120" cy="300" r="2.5" fill="#D4A574" stroke="#8B6F37" strokeWidth="0.5" />
              <circle cx="160" cy="300" r="2.5" fill="#D4A574" stroke="#8B6F37" strokeWidth="0.5" />
            </g>
          )
        case 6: // 吊带背心
          return (
            <g filter="url(#softShadow)">
              <path d="M 105 215 L 100 340 L 180 340 L 175 215 Q 155 210 140 215 Q 125 210 105 215 Z" fill={fill} />
              {/* Straps */}
              <path d="M 112 215 Q 115 195 125 190" stroke={topColor} strokeWidth="4" fill="none" />
              <path d="M 168 215 Q 165 195 155 190" stroke={topColor} strokeWidth="4" fill="none" />
              {/* Cleavage line */}
              <path d="M 125 215 Q 140 225 155 215" stroke={shadow} strokeWidth="0.8" fill="none" opacity="0.5" />
            </g>
          )
        case 7: // 风衣
          return (
            <g filter="url(#softShadow)">
              <path d="M 92 200 L 72 240 L 68 380 L 212 380 L 208 240 L 188 200 Q 162 195 140 202 Q 118 195 92 200 Z" fill={fill} />
              {/* Lapel */}
              <path d="M 120 205 L 140 230 L 160 205 L 158 250 L 142 270 L 122 250 Z" fill={darken(topColor, 12)} />
              {/* Belt */}
              <rect x="70" y="300" width="140" height="8" fill={darken(topColor, 25)} />
              <rect x="133" y="298" width="14" height="12" fill={darken(topColor, 35)} />
              <circle cx="140" cy="304" r="2" fill="#D4A574" />
              {/* Buttons */}
              <circle cx="126" cy="255" r="2" fill={darken(topColor, 30)} />
              <circle cx="126" cy="280" r="2" fill={darken(topColor, 30)} />
              <circle cx="154" cy="255" r="2" fill={darken(topColor, 30)} />
              <circle cx="154" cy="280" r="2" fill={darken(topColor, 30)} />
            </g>
          )
      }
    } else {
      // Male tops
      switch (topStyle) {
        case 0: // 纯棉T恤
          return (
            <g filter="url(#softShadow)">
              <path d="M 98 200 L 80 232 L 85 278 L 100 276 L 100 350 L 180 350 L 180 276 L 195 278 L 200 232 L 182 200 Q 160 195 140 200 Q 120 195 98 200 Z" fill={fill} />
              <path d="M 120 200 Q 140 210 160 200" stroke={shadow} strokeWidth="1.5" fill="none" />
            </g>
          )
        case 1: // 牛津衬衫
          return (
            <g filter="url(#softShadow)">
              <path d="M 95 200 L 78 235 L 82 280 L 98 278 L 95 355 L 185 355 L 182 278 L 198 280 L 202 235 L 185 200 Q 160 195 140 203 Q 118 195 95 200 Z" fill={fill} />
              {/* Collar */}
              <path d="M 120 200 L 140 220 L 160 200 L 156 215 L 140 228 L 124 215 Z" fill={lighten(topColor, 10)} stroke={shadow} strokeWidth="0.5" />
              {/* Button placket */}
              <line x1="140" y1="220" x2="140" y2="355" stroke={shadow} strokeWidth="1" opacity="0.5" />
              <circle cx="140" cy="240" r="1.5" fill={darken(topColor, 25)} />
              <circle cx="140" cy="265" r="1.5" fill={darken(topColor, 25)} />
              <circle cx="140" cy="290" r="1.5" fill={darken(topColor, 25)} />
              <circle cx="140" cy="315" r="1.5" fill={darken(topColor, 25)} />
              <circle cx="140" cy="340" r="1.5" fill={darken(topColor, 25)} />
              {/* Chest pocket */}
              <path d="M 105 245 L 125 245 L 125 260 L 105 260 Z" fill="none" stroke={shadow} strokeWidth="0.8" opacity="0.6" />
            </g>
          )
        case 2: // 连帽卫衣
          return (
            <g filter="url(#softShadow)">
              <path d="M 92 205 L 75 240 L 78 285 L 95 283 L 92 355 L 188 355 L 185 283 L 202 285 L 205 240 L 188 205 Q 165 198 140 205 Q 115 198 92 205 Z" fill={fill} />
              {/* Hood */}
              <path d="M 105 165 Q 140 155 175 165 L 185 205 Q 140 198 95 205 Z" fill={darken(topColor, 8)} />
              <line x1="128" y1="205" x2="128" y2="240" stroke={darken(topColor, 25)} strokeWidth="1.2" />
              <line x1="152" y1="205" x2="152" y2="240" stroke={darken(topColor, 25)} strokeWidth="1.2" />
              <circle cx="128" cy="242" r="2" fill={darken(topColor, 35)} />
              <circle cx="152" cy="242" r="2" fill={darken(topColor, 35)} />
              {/* Kangaroo pocket */}
              <path d="M 100 290 Q 140 300 180 290 L 180 335 L 100 335 Z" fill="none" stroke={darken(topColor, 20)} strokeWidth="1" opacity="0.6" />
            </g>
          )
        case 3: // 皮夹克
          return (
            <g filter="url(#softShadow)">
              <path d="M 92 200 L 75 235 L 80 285 L 96 283 L 92 355 L 188 355 L 184 283 L 200 285 L 205 235 L 188 200 Q 162 195 140 202 Q 118 195 92 200 Z" fill={fill} />
              {/* Leather highlights */}
              <path d="M 85 225 Q 90 260 95 285" stroke={lighten(topColor, 30)} strokeWidth="1.5" fill="none" opacity="0.5" />
              <path d="M 185 225 Q 190 260 195 285" stroke={lighten(topColor, 30)} strokeWidth="1.5" fill="none" opacity="0.5" />
              {/* Asymmetric zipper */}
              <line x1="145" y1="205" x2="158" y2="355" stroke="#888" strokeWidth="2" />
              <line x1="145" y1="205" x2="158" y2="355" stroke={darken(topColor, 35)} strokeWidth="0.5" />
              {/* Collar */}
              <path d="M 115 200 L 140 225 L 165 200 L 160 215 L 140 233 L 120 215 Z" fill={darken(topColor, 15)} />
              {/* Zipper pockets */}
              <line x1="105" y1="295" x2="130" y2="300" stroke={lighten(topColor, 15)} strokeWidth="1.5" />
              <line x1="165" y1="300" x2="185" y2="295" stroke={lighten(topColor, 15)} strokeWidth="1.5" />
            </g>
          )
        case 4: // Polo衫
          return (
            <g filter="url(#softShadow)">
              <path d="M 98 200 L 82 232 L 86 278 L 100 276 L 100 345 L 180 345 L 180 276 L 194 278 L 198 232 L 182 200 Q 160 195 140 200 Q 120 195 98 200 Z" fill={fill} />
              {/* Polo collar */}
              <path d="M 122 200 L 140 218 L 158 200 L 155 212 L 140 224 L 125 212 Z" fill={lighten(topColor, 10)} stroke={shadow} strokeWidth="0.5" />
              {/* Placket */}
              <line x1="140" y1="220" x2="140" y2="255" stroke={shadow} strokeWidth="1" opacity="0.5" />
              <circle cx="140" cy="232" r="1.5" fill={darken(topColor, 25)} />
              <circle cx="140" cy="248" r="1.5" fill={darken(topColor, 25)} />
              {/* Brand mark */}
              <rect x="108" y="245" width="8" height="5" fill={darken(topColor, 30)} opacity="0.5" />
            </g>
          )
        case 5: // 西装外套
          return (
            <g filter="url(#softShadow)">
              <path d="M 90 200 L 74 235 L 70 355 L 210 355 L 206 235 L 190 200 Q 162 195 140 202 Q 118 195 90 200 Z" fill={fill} />
              {/* Lapels */}
              <path d="M 108 200 L 140 240 L 172 200 L 168 265 L 140 280 L 112 265 Z" fill={darken(topColor, 15)} />
              <path d="M 108 200 L 140 240 L 172 200" stroke={shadow} strokeWidth="0.8" fill="none" />
              {/* Pocket squares */}
              <rect x="150" y="258" width="8" height="5" fill={lighten(topColor, 40)} opacity="0.9" />
              {/* Buttons */}
              <circle cx="140" cy="295" r="2.5" fill={darken(topColor, 40)} />
              <circle cx="140" cy="320" r="2.5" fill={darken(topColor, 40)} />
              {/* Side pockets */}
              <line x1="98" y1="325" x2="130" y2="328" stroke={shadow} strokeWidth="1" />
              <line x1="182" y1="325" x2="150" y2="328" stroke={shadow} strokeWidth="1" />
            </g>
          )
        case 6: // 针织毛衣
          return (
            <g filter="url(#softShadow)">
              <path d="M 92 200 L 75 235 L 80 280 L 95 278 L 92 355 L 188 355 L 184 278 L 200 280 L 205 235 L 188 200 Q 165 195 140 203 Q 115 195 92 200 Z" fill="url(#knit)" />
              {/* Ribbed collar */}
              <path d="M 115 200 Q 140 215 165 200" fill={darken(topColor, 10)} />
              <path d="M 120 200 Q 140 213 160 200" stroke={darken(topColor, 20)} strokeWidth="0.5" fill="none" />
              {/* Ribbed hem */}
              <path d="M 95 345 L 95 360 M 110 345 L 110 360 M 125 345 L 125 360 M 140 345 L 140 360 M 155 345 L 155 360 M 170 345 L 170 360 M 185 345 L 185 360" stroke={darken(topColor, 15)} strokeWidth="0.5" opacity="0.6" />
            </g>
          )
        case 7: // 工装夹克
          return (
            <g filter="url(#softShadow)">
              <path d="M 94 200 L 78 235 L 82 280 L 98 278 L 94 350 L 186 350 L 182 278 L 198 280 L 202 235 L 186 200 Q 162 195 140 202 Q 118 195 94 200 Z" fill={fill} />
              {/* Chest pockets */}
              <rect x="105" y="240" width="25" height="30" fill="none" stroke={shadow} strokeWidth="1" />
              <rect x="150" y="240" width="25" height="30" fill="none" stroke={shadow} strokeWidth="1" />
              <line x1="117" y1="240" x2="117" y2="270" stroke={shadow} strokeWidth="0.5" opacity="0.5" />
              <line x1="162" y1="240" x2="162" y2="270" stroke={shadow} strokeWidth="0.5" opacity="0.5" />
              {/* Buttons */}
              <circle cx="117" cy="245" r="1.5" fill={lighten(topColor, 15)} />
              <circle cx="162" cy="245" r="1.5" fill={lighten(topColor, 15)} />
              {/* Center button line */}
              <line x1="140" y1="205" x2="140" y2="350" stroke={shadow} strokeWidth="1" opacity="0.5" />
              <circle cx="140" cy="220" r="2" fill={lighten(topColor, 15)} />
              <circle cx="140" cy="290" r="2" fill={lighten(topColor, 15)} />
              <circle cx="140" cy="325" r="2" fill={lighten(topColor, 15)} />
            </g>
          )
      }
    }
    return null
  }

  function renderBottom() {
    const isDress = gender === 'female' && topStyle === 2
    if (isDress) return null

    const fill = bottomStyle === 0 || bottomStyle === 5 ? 'url(#denim)' : 'url(#bottomGrad)'
    const shadow = darken(bottomColor, 20)

    switch (bottomStyle) {
      case 0: // 直筒牛仔
        return (
          <g filter="url(#softShadow)">
            <path d="M 98 335 L 92 490 L 128 490 L 135 395 L 145 395 L 152 490 L 188 490 L 182 335 Z" fill={fill} />
            {/* Waistband */}
            <rect x="97" y="335" width="86" height="8" fill={darken(bottomColor, 15)} />
            {/* Belt loops */}
            <rect x="110" y="333" width="3" height="12" fill={darken(bottomColor, 25)} />
            <rect x="140" y="333" width="3" height="12" fill={darken(bottomColor, 25)} />
            <rect x="168" y="333" width="3" height="12" fill={darken(bottomColor, 25)} />
            {/* Pockets */}
            <path d="M 100 345 L 115 355 L 115 365 L 100 360 Z" fill="none" stroke={shadow} strokeWidth="0.8" opacity="0.7" />
            <path d="M 180 345 L 165 355 L 165 365 L 180 360 Z" fill="none" stroke={shadow} strokeWidth="0.8" opacity="0.7" />
            {/* Zipper */}
            <line x1="140" y1="345" x2="140" y2="380" stroke={darken(bottomColor, 30)} strokeWidth="1" opacity="0.6" />
            {/* Knee fade */}
            <ellipse cx="115" cy="430" rx="12" ry="8" fill={lighten(bottomColor, 15)} opacity="0.3" />
            <ellipse cx="165" cy="430" rx="12" ry="8" fill={lighten(bottomColor, 15)} opacity="0.3" />
            {/* Stitching */}
            <line x1="115" y1="345" x2="115" y2="490" stroke="#D4A574" strokeWidth="0.3" opacity="0.4" />
            <line x1="165" y1="345" x2="165" y2="490" stroke="#D4A574" strokeWidth="0.3" opacity="0.4" />
          </g>
        )
      case 1: // 阔腿裤
        return (
          <g filter="url(#softShadow)">
            <path d="M 98 335 L 82 495 L 132 495 L 138 395 L 142 395 L 148 495 L 198 495 L 182 335 Z" fill="url(#bottomGrad)" />
            <rect x="97" y="335" width="86" height="6" fill={darken(bottomColor, 15)} />
            <line x1="140" y1="345" x2="140" y2="495" stroke={shadow} strokeWidth="0.5" opacity="0.4" />
            {/* Side seams */}
            <path d="M 98 340 Q 90 410 82 495" stroke={shadow} strokeWidth="0.5" fill="none" opacity="0.4" />
            <path d="M 182 340 Q 190 410 198 495" stroke={shadow} strokeWidth="0.5" fill="none" opacity="0.4" />
          </g>
        )
      case 2: // 百褶裙
        return (
          <g filter="url(#softShadow)">
            <path d="M 95 335 L 65 430 L 215 430 L 185 335 Z" fill="url(#bottomGrad)" />
            {/* Pleats */}
            <path d="M 110 340 L 95 425" stroke={shadow} strokeWidth="0.8" opacity="0.6" />
            <path d="M 125 340 L 118 427" stroke={shadow} strokeWidth="0.8" opacity="0.6" />
            <path d="M 140 340 L 140 427" stroke={shadow} strokeWidth="0.8" opacity="0.6" />
            <path d="M 155 340 L 162 427" stroke={shadow} strokeWidth="0.8" opacity="0.6" />
            <path d="M 170 340 L 185 425" stroke={shadow} strokeWidth="0.8" opacity="0.6" />
            {/* Waistband */}
            <rect x="95" y="335" width="90" height="8" fill={darken(bottomColor, 15)} />
          </g>
        )
      case 3: // 短裤
        return (
          <g filter="url(#softShadow)">
            <path d="M 98 335 L 92 420 L 130 420 L 138 395 L 142 395 L 150 420 L 188 420 L 182 335 Z" fill="url(#bottomGrad)" />
            <rect x="97" y="335" width="86" height="7" fill={darken(bottomColor, 15)} />
            <line x1="140" y1="345" x2="140" y2="395" stroke={shadow} strokeWidth="0.5" opacity="0.5" />
            <path d="M 100 345 L 115 352 L 113 362" fill="none" stroke={shadow} strokeWidth="0.5" />
            <path d="M 180 345 L 165 352 L 167 362" fill="none" stroke={shadow} strokeWidth="0.5" />
          </g>
        )
      case 4: // 西装裤
        return (
          <g filter="url(#softShadow)">
            <path d="M 100 335 L 94 490 L 130 490 L 138 395 L 142 395 L 150 490 L 186 490 L 180 335 Z" fill="url(#bottomGrad)" />
            <rect x="99" y="335" width="82" height="5" fill={darken(bottomColor, 15)} />
            {/* Center crease */}
            <line x1="115" y1="345" x2="112" y2="488" stroke={lighten(bottomColor, 15)} strokeWidth="0.8" opacity="0.5" />
            <line x1="165" y1="345" x2="168" y2="488" stroke={lighten(bottomColor, 15)} strokeWidth="0.8" opacity="0.5" />
          </g>
        )
      case 5: // 工装裤
        return (
          <g filter="url(#softShadow)">
            <path d="M 96 335 L 88 490 L 130 490 L 138 395 L 142 395 L 150 490 L 192 490 L 184 335 Z" fill={fill} />
            <rect x="95" y="335" width="90" height="8" fill={darken(bottomColor, 15)} />
            {/* Cargo pockets */}
            <rect x="90" y="400" width="22" height="30" fill={bottomColor} stroke={shadow} strokeWidth="1" />
            <rect x="168" y="400" width="22" height="30" fill={bottomColor} stroke={shadow} strokeWidth="1" />
            <path d="M 95 405 L 107 405" stroke={lighten(bottomColor, 10)} strokeWidth="1" />
            <path d="M 173 405 L 185 405" stroke={lighten(bottomColor, 10)} strokeWidth="1" />
            <circle cx="101" cy="428" r="1" fill={darken(bottomColor, 30)} />
            <circle cx="179" cy="428" r="1" fill={darken(bottomColor, 30)} />
          </g>
        )
      case 6: // 紧身裤
        return (
          <g filter="url(#softShadow)">
            <path d="M 100 335 L 100 490 L 135 490 L 138 395 L 142 395 L 145 490 L 180 490 L 180 335 Z" fill="url(#bottomGrad)" />
            <rect x="99" y="335" width="82" height="5" fill={darken(bottomColor, 15)} />
            {/* Contour lines */}
            <path d="M 105 360 Q 118 420 105 485" stroke={lighten(bottomColor, 15)} strokeWidth="0.5" fill="none" opacity="0.4" />
            <path d="M 175 360 Q 162 420 175 485" stroke={lighten(bottomColor, 15)} strokeWidth="0.5" fill="none" opacity="0.4" />
          </g>
        )
      case 7: // 短裙
        return (
          <g filter="url(#softShadow)">
            <path d="M 95 335 L 85 415 L 195 415 L 185 335 Z" fill="url(#bottomGrad)" />
            <rect x="95" y="335" width="90" height="7" fill={darken(bottomColor, 15)} />
            <line x1="140" y1="345" x2="140" y2="413" stroke={shadow} strokeWidth="0.5" opacity="0.4" />
          </g>
        )
    }
    return null
  }

  function renderShoes() {
    // Feet position
    const isShortBottom = bottomStyle === 2 || bottomStyle === 3 || bottomStyle === 7
    const isDress = gender === 'female' && topStyle === 2
    const y = isDress ? 485 : isShortBottom ? bottomStyle === 3 ? 422 : 415 : 490
    const shoesFill = 'url(#shoesGrad)'
    const sh = darken(shoesColor, 25)

    switch (shoesStyle) {
      case 0: // 白色运动鞋
        return (
          <g filter="url(#softShadow)">
            <ellipse cx="118" cy={y + 8} rx="18" ry="7" fill={shoesFill} />
            <path d={`M 105 ${y + 2} Q 118 ${y - 4} 132 ${y + 2} L 135 ${y + 8} L 101 ${y + 8} Z`} fill={shoesFill} />
            <path d={`M 105 ${y + 2} Q 118 ${y - 4} 132 ${y + 2}`} stroke={sh} strokeWidth="0.8" fill="none" />
            {/* Swoosh */}
            <path d={`M 107 ${y + 1} Q 118 ${y - 2} 128 ${y + 3}`} stroke="#333" strokeWidth="1.2" fill="none" />
            {/* Sole */}
            <rect x="100" y={y + 8} width="36" height="4" fill="#fff" stroke="#bbb" strokeWidth="0.5" />

            <ellipse cx="162" cy={y + 8} rx="18" ry="7" fill={shoesFill} />
            <path d={`M 149 ${y + 2} Q 162 ${y - 4} 176 ${y + 2} L 179 ${y + 8} L 145 ${y + 8} Z`} fill={shoesFill} />
            <path d={`M 149 ${y + 2} Q 162 ${y - 4} 176 ${y + 2}`} stroke={sh} strokeWidth="0.8" fill="none" />
            <path d={`M 151 ${y + 1} Q 162 ${y - 2} 172 ${y + 3}`} stroke="#333" strokeWidth="1.2" fill="none" />
            <rect x="144" y={y + 8} width="36" height="4" fill="#fff" stroke="#bbb" strokeWidth="0.5" />
          </g>
        )
      case 1: // 皮革短靴
        return (
          <g filter="url(#softShadow)">
            <path d={`M 102 ${y - 15} L 102 ${y + 8} L 135 ${y + 8} L 135 ${y - 5} Q 125 ${y - 18} 115 ${y - 15} Z`} fill={shoesFill} />
            <path d={`M 145 ${y - 15} L 145 ${y + 8} L 178 ${y + 8} L 178 ${y - 5} Q 168 ${y - 18} 158 ${y - 15} Z`} fill={shoesFill} />
            {/* Leather shine */}
            <path d={`M 108 ${y - 10} Q 115 ${y - 5} 112 ${y + 5}`} stroke={lighten(shoesColor, 30)} strokeWidth="1" fill="none" opacity="0.5" />
            <path d={`M 151 ${y - 10} Q 158 ${y - 5} 155 ${y + 5}`} stroke={lighten(shoesColor, 30)} strokeWidth="1" fill="none" opacity="0.5" />
            {/* Heel */}
            <rect x="102" y={y + 8} width="33" height="4" fill={sh} />
            <rect x="145" y={y + 8} width="33" height="4" fill={sh} />
          </g>
        )
      case 2: // 高跟鞋
        return (
          <g filter="url(#softShadow)">
            <path d={`M 105 ${y + 3} Q 118 ${y - 5} 133 ${y + 3} L 133 ${y + 8} L 105 ${y + 8} Z`} fill={shoesFill} />
            <rect x="128" y={y + 8} width="3" height="15" fill={sh} />
            <path d={`M 148 ${y + 3} Q 162 ${y - 5} 177 ${y + 3} L 177 ${y + 8} L 148 ${y + 8} Z`} fill={shoesFill} />
            <rect x="172" y={y + 8} width="3" height="15" fill={sh} />
          </g>
        )
      case 3: // 牛津鞋
        return (
          <g filter="url(#softShadow)">
            <path d={`M 102 ${y + 2} Q 118 ${y - 3} 134 ${y + 2} L 134 ${y + 10} L 102 ${y + 10} Z`} fill={shoesFill} />
            <path d={`M 145 ${y + 2} Q 162 ${y - 3} 178 ${y + 2} L 178 ${y + 10} L 145 ${y + 10} Z`} fill={shoesFill} />
            {/* Laces */}
            <line x1="113" y1={y} x2="123" y2={y} stroke={lighten(shoesColor, 20)} strokeWidth="0.8" />
            <line x1="113" y1={y + 3} x2="123" y2={y + 3} stroke={lighten(shoesColor, 20)} strokeWidth="0.8" />
            <line x1="156" y1={y} x2="166" y2={y} stroke={lighten(shoesColor, 20)} strokeWidth="0.8" />
            <line x1="156" y1={y + 3} x2="166" y2={y + 3} stroke={lighten(shoesColor, 20)} strokeWidth="0.8" />
            {/* Sole */}
            <rect x="102" y={y + 10} width="32" height="3" fill={sh} />
            <rect x="145" y={y + 10} width="33" height="3" fill={sh} />
          </g>
        )
      case 4: // 凉鞋
        return (
          <g filter="url(#softShadow)">
            <ellipse cx="118" cy={y + 10} rx="16" ry="4" fill={shoesFill} />
            <ellipse cx="162" cy={y + 10} rx="16" ry="4" fill={shoesFill} />
            {/* Straps */}
            <path d={`M 108 ${y} Q 118 ${y - 5} 128 ${y}`} stroke={shoesColor} strokeWidth="3" fill="none" />
            <path d={`M 108 ${y + 5} Q 118 ${y + 2} 128 ${y + 5}`} stroke={shoesColor} strokeWidth="3" fill="none" />
            <path d={`M 152 ${y} Q 162 ${y - 5} 172 ${y}`} stroke={shoesColor} strokeWidth="3" fill="none" />
            <path d={`M 152 ${y + 5} Q 162 ${y + 2} 172 ${y + 5}`} stroke={shoesColor} strokeWidth="3" fill="none" />
          </g>
        )
      case 5: // 帆布鞋
        return (
          <g filter="url(#softShadow)">
            <path d={`M 102 ${y} L 102 ${y + 10} L 134 ${y + 10} L 134 ${y} Q 118 ${y - 4} 102 ${y} Z`} fill={shoesFill} />
            <path d={`M 145 ${y} L 145 ${y + 10} L 178 ${y + 10} L 178 ${y} Q 162 ${y - 4} 145 ${y} Z`} fill={shoesFill} />
            {/* Toe cap */}
            <path d={`M 102 ${y + 8} Q 110 ${y + 5} 118 ${y + 8}`} fill="#fff" stroke="#999" strokeWidth="0.5" />
            <path d={`M 145 ${y + 8} Q 153 ${y + 5} 161 ${y + 8}`} fill="#fff" stroke="#999" strokeWidth="0.5" />
            {/* Laces */}
            <path d={`M 112 ${y + 2} L 124 ${y + 2} M 112 ${y + 4} L 124 ${y + 4}`} stroke="#fff" strokeWidth="0.8" />
            <path d={`M 155 ${y + 2} L 167 ${y + 2} M 155 ${y + 4} L 167 ${y + 4}`} stroke="#fff" strokeWidth="0.8" />
            {/* White sole */}
            <rect x="100" y={y + 10} width="36" height="4" fill="#f5f5f5" stroke="#bbb" strokeWidth="0.5" />
            <rect x="143" y={y + 10} width="37" height="4" fill="#f5f5f5" stroke="#bbb" strokeWidth="0.5" />
          </g>
        )
      case 6: // 乐福鞋
        return (
          <g filter="url(#softShadow)">
            <path d={`M 102 ${y + 2} Q 118 ${y - 3} 134 ${y + 2} L 134 ${y + 10} L 102 ${y + 10} Z`} fill={shoesFill} />
            <path d={`M 145 ${y + 2} Q 162 ${y - 3} 178 ${y + 2} L 178 ${y + 10} L 145 ${y + 10} Z`} fill={shoesFill} />
            {/* Horsebit */}
            <rect x="113" y={y} width="10" height="3" fill="#D4A574" rx="1" />
            <rect x="156" y={y} width="10" height="3" fill="#D4A574" rx="1" />
            {/* Leather shine */}
            <path d={`M 108 ${y + 3} Q 118 ${y - 1} 128 ${y + 5}`} stroke={lighten(shoesColor, 30)} strokeWidth="1" fill="none" opacity="0.5" />
            <path d={`M 151 ${y + 3} Q 162 ${y - 1} 172 ${y + 5}`} stroke={lighten(shoesColor, 30)} strokeWidth="1" fill="none" opacity="0.5" />
            <rect x="102" y={y + 10} width="32" height="3" fill={sh} />
            <rect x="145" y={y + 10} width="33" height="3" fill={sh} />
          </g>
        )
      case 7: // 马丁靴
        return (
          <g filter="url(#softShadow)">
            <path d={`M 102 ${y - 20} L 102 ${y + 10} L 135 ${y + 10} L 135 ${y - 10} Q 125 ${y - 22} 115 ${y - 20} Z`} fill={shoesFill} />
            <path d={`M 145 ${y - 20} L 145 ${y + 10} L 178 ${y + 10} L 178 ${y - 10} Q 168 ${y - 22} 158 ${y - 20} Z`} fill={shoesFill} />
            {/* Laces */}
            {[0, 1, 2, 3, 4].map(i => (
              <g key={i}>
                <line x1="108" y1={y - 15 + i * 5} x2="128" y2={y - 15 + i * 5} stroke={lighten(shoesColor, 30)} strokeWidth="0.8" />
                <line x1="151" y1={y - 15 + i * 5} x2="171" y2={y - 15 + i * 5} stroke={lighten(shoesColor, 30)} strokeWidth="0.8" />
              </g>
            ))}
            {/* Stitching around sole */}
            <path d={`M 102 ${y + 8} L 135 ${y + 8}`} stroke="#D4A574" strokeWidth="0.3" strokeDasharray="2,1" />
            <path d={`M 145 ${y + 8} L 178 ${y + 8}`} stroke="#D4A574" strokeWidth="0.3" strokeDasharray="2,1" />
            {/* Yellow sole signature */}
            <rect x="100" y={y + 10} width="37" height="4" fill="#D4A574" />
            <rect x="143" y={y + 10} width="38" height="4" fill="#D4A574" />
          </g>
        )
    }
    return null
  }

  function renderLegs() {
    const isDress = gender === 'female' && topStyle === 2
    const isShort = bottomStyle === 2 || bottomStyle === 3 || bottomStyle === 7
    if (!isDress && !isShort) return null

    const legTop = 330
    const legBottom = isDress ? 485 : bottomStyle === 3 ? 422 : 415
    return (
      <g>
        <path d={`M 115 ${legTop} L 110 ${legBottom} L 135 ${legBottom} L 138 ${legTop + 5} Z`} fill="url(#skinLeg)" />
        <path d={`M 165 ${legTop} L 170 ${legBottom} L 145 ${legBottom} L 142 ${legTop + 5} Z`} fill="url(#skinLeg)" />
        {/* Leg contours */}
        <path d={`M 115 ${legTop + 30} Q 125 ${legBottom / 2 + 150} 115 ${legBottom - 10}`} stroke={skin.shadow} strokeWidth="0.5" fill="none" opacity="0.3" />
        <path d={`M 165 ${legTop + 30} Q 155 ${legBottom / 2 + 150} 165 ${legBottom - 10}`} stroke={skin.shadow} strokeWidth="0.5" fill="none" opacity="0.3" />
      </g>
    )
  }

  function renderAccessory() {
    switch (accessory) {
      case 0: return null
      case 1: // 金属眼镜
        return (
          <g>
            <circle cx="125" cy="135" r="11" fill="none" stroke="#555" strokeWidth="1.5" />
            <circle cx="155" cy="135" r="11" fill="none" stroke="#555" strokeWidth="1.5" />
            <line x1="136" y1="135" x2="144" y2="135" stroke="#555" strokeWidth="1.5" />
            <line x1="114" y1="135" x2="108" y2="132" stroke="#555" strokeWidth="1.2" />
            <line x1="166" y1="135" x2="172" y2="132" stroke="#555" strokeWidth="1.2" />
            {/* Lens glare */}
            <path d="M 120 130 Q 125 128 128 131" stroke="#fff" strokeWidth="1" opacity="0.6" fill="none" />
            <path d="M 150 130 Q 155 128 158 131" stroke="#fff" strokeWidth="1" opacity="0.6" fill="none" />
          </g>
        )
      case 2: // 墨镜
        return (
          <g>
            <ellipse cx="125" cy="135" rx="12" ry="8" fill="#1a1a1a" />
            <ellipse cx="155" cy="135" rx="12" ry="8" fill="#1a1a1a" />
            <path d="M 137 134 L 143 134" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M 113 132 L 107 130" stroke="#1a1a1a" strokeWidth="1.5" />
            <path d="M 167 132 L 173 130" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Reflection */}
            <ellipse cx="120" cy="131" rx="3" ry="2" fill="#fff" opacity="0.3" />
            <ellipse cx="150" cy="131" rx="3" ry="2" fill="#fff" opacity="0.3" />
          </g>
        )
      case 3: // 棒球帽
        return (
          <g>
            <path d="M 95 90 Q 140 70 185 90 L 185 110 L 95 110 Z" fill="#1a1a1a" />
            <ellipse cx="140" cy="110" rx="55" ry="6" fill="#1a1a1a" />
            {/* Brim front */}
            <ellipse cx="140" cy="115" rx="55" ry="4" fill="#0a0a0a" />
            {/* Logo */}
            <circle cx="140" cy="92" r="5" fill="#fff" />
            <text x="140" y="96" textAnchor="middle" fontSize="8" fill="#1a1a1a" fontWeight="bold">N</text>
          </g>
        )
      case 4: // 贝雷帽
        return (
          <g>
            <ellipse cx="140" cy="68" rx="40" ry="22" fill="#8B1A1A" />
            <ellipse cx="140" cy="70" rx="38" ry="18" fill="#A82323" opacity="0.7" />
            <circle cx="158" cy="55" r="5" fill="#5C0F0F" />
          </g>
        )
      case 5: // 手拿包
        return (
          <g>
            <rect x="38" y="310" width="34" height="24" rx="2" fill="#3a2816" stroke="#1a0f08" strokeWidth="1" />
            <rect x="40" y="312" width="30" height="2" fill="#D4A574" />
            <circle cx="55" cy="322" r="2" fill="#D4A574" />
            <path d="M 55 322 L 55 328" stroke="#D4A574" strokeWidth="0.8" />
          </g>
        )
      case 6: // 斜挎包
        return (
          <g>
            <path d="M 140 180 Q 225 220 215 295" stroke="#5C3825" strokeWidth="3" fill="none" />
            <rect x="195" y="290" width="30" height="35" rx="3" fill="#8B4513" stroke="#3a2816" strokeWidth="1" />
            <rect x="205" y="290" width="10" height="5" fill="#5C3825" />
            <circle cx="210" cy="305" r="2" fill="#D4A574" />
          </g>
        )
      case 7: // 耳机
        return (
          <g>
            <path d="M 105 85 Q 140 45 175 85" stroke="#1a1a1a" strokeWidth="5" fill="none" strokeLinecap="round" />
            <ellipse cx="103" cy="105" rx="8" ry="12" fill="#1a1a1a" />
            <ellipse cx="177" cy="105" rx="8" ry="12" fill="#1a1a1a" />
            <ellipse cx="103" cy="105" rx="5" ry="8" fill="#3a3a3a" />
            <ellipse cx="177" cy="105" rx="5" ry="8" fill="#3a3a3a" />
          </g>
        )
    }
    return null
  }

  const hairNames = gender === 'female' ? HAIR_STYLES_FEMALE : HAIR_STYLES_MALE
  const topNames = gender === 'female' ? TOP_STYLES_FEMALE : TOP_STYLES_MALE

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <BackButton href="/" text="返回首页" />

        <div className="card">
          <h1 className="text-3xl md:text-4xl font-bold text-primary text-center mb-2">
            ✨ 真实搭配工作室
          </h1>
          <p className="text-gray-600 text-center mb-6">打造你的造型，选择场景拍张大片</p>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Character in scene */}
            <div className="space-y-4">
              {/* Gender selector */}
              <div className="flex justify-center gap-4">
                <button onClick={() => setGender('female')}
                  className={`px-6 py-2 rounded-full transition-all ${gender === 'female' ? 'bg-pink-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >👩 女生</button>
                <button onClick={() => setGender('male')}
                  className={`px-6 py-2 rounded-full transition-all ${gender === 'male' ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >👨 男生</button>
              </div>

              {/* Scene stage with character */}
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl"
                style={{ aspectRatio: '4/5', background: currentScene.sky }}
              >
                {/* Ground */}
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: '28%', background: currentScene.ground }}
                />

                {/* Scene-specific decorations */}
                {scene === 0 && (
                  <>
                    {/* City: skyline silhouettes */}
                    <div className="absolute bottom-[28%] left-0 right-0 flex items-end h-24 opacity-70">
                      <div style={{ width: '18%', height: '50%', background: '#2a2a3a' }} />
                      <div style={{ width: '12%', height: '75%', background: '#1f1f2e' }} />
                      <div style={{ width: '15%', height: '40%', background: '#2a2a3a' }} />
                      <div style={{ width: '20%', height: '80%', background: '#1a1a2e' }} />
                      <div style={{ width: '10%', height: '55%', background: '#2a2a3a' }} />
                      <div style={{ width: '15%', height: '65%', background: '#1f1f2e' }} />
                      <div style={{ width: '10%', height: '45%', background: '#2a2a3a' }} />
                    </div>
                    {/* Street lamp */}
                    <div className="absolute left-[8%] bottom-[28%] w-1 h-32 bg-gray-700" />
                    <div className="absolute left-[6%] top-[40%] w-4 h-4 bg-yellow-200 rounded-full opacity-80" style={{ boxShadow: '0 0 20px #fde047' }} />
                  </>
                )}
                {scene === 1 && (
                  <>
                    {/* Cafe: window frame + shelf */}
                    <div className="absolute top-[5%] left-[5%] right-[5%] h-[60%] border-4 border-[#4a2f18] rounded-lg bg-gradient-to-b from-amber-100/30 to-orange-200/20" />
                    <div className="absolute top-[45%] left-0 right-0 h-4 bg-[#4a2f18]" />
                    {/* Hanging lights */}
                    <div className="absolute top-0 left-[25%] w-0.5 h-12 bg-gray-600" />
                    <div className="absolute top-12 left-[23%] w-4 h-5 bg-yellow-300 rounded-b-full" style={{ boxShadow: '0 0 20px #fbbf24' }} />
                    <div className="absolute top-0 right-[25%] w-0.5 h-12 bg-gray-600" />
                    <div className="absolute top-12 right-[23%] w-4 h-5 bg-yellow-300 rounded-b-full" style={{ boxShadow: '0 0 20px #fbbf24' }} />
                  </>
                )}
                {scene === 2 && (
                  <>
                    {/* Beach: sea line + palm silhouette */}
                    <div className="absolute top-[60%] left-0 right-0 h-[12%] bg-[#3b82a6]" />
                    <div className="absolute top-[58%] left-0 right-0 h-[3%] bg-white/30" />
                    {/* Sun */}
                    <div className="absolute top-[12%] right-[12%] w-16 h-16 bg-yellow-100 rounded-full" style={{ boxShadow: '0 0 40px rgba(254, 240, 138, 0.8)' }} />
                    {/* Palm */}
                    <div className="absolute top-[35%] right-[4%] w-2 h-32 bg-[#3a2516]" />
                    <div className="absolute top-[30%] right-0 text-5xl">🌴</div>
                  </>
                )}
                {scene === 3 && (
                  <>
                    {/* Office: window grid */}
                    <div className="absolute inset-0 grid grid-cols-4 opacity-15">
                      {[...Array(16)].map((_, i) => <div key={i} className="border border-gray-500" />)}
                    </div>
                    <div className="absolute top-[55%] left-0 right-0 h-1 bg-gray-600" />
                  </>
                )}
                {scene === 4 && (
                  <>
                    {/* Park: trees */}
                    <div className="absolute top-[25%] left-[5%] text-7xl">🌳</div>
                    <div className="absolute top-[30%] right-[5%] text-6xl">🌲</div>
                    <div className="absolute top-[50%] left-[20%] text-3xl">🌼</div>
                    <div className="absolute top-[55%] right-[20%] text-3xl">🌻</div>
                  </>
                )}
                {scene === 5 && (
                  <>
                    {/* Night: neon signs */}
                    <div className="absolute top-[20%] left-[8%] text-pink-400 text-lg font-bold" style={{ textShadow: '0 0 15px #f472b6' }}>NEON</div>
                    <div className="absolute top-[35%] right-[8%] text-cyan-300 text-lg font-bold" style={{ textShadow: '0 0 15px #67e8f9' }}>CAFE</div>
                    <div className="absolute top-[25%] right-[15%] text-yellow-300 text-sm" style={{ textShadow: '0 0 12px #fde047' }}>★★★</div>
                    {/* Neon strip */}
                    <div className="absolute top-[60%] left-0 right-0 h-0.5 bg-pink-400" style={{ boxShadow: '0 0 8px #f472b6' }} />
                  </>
                )}

                {/* Character */}
                <div className="absolute inset-0 flex items-end justify-center pb-[4%]">
                  {renderCharacter()}
                </div>

                {/* Scene label */}
                <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                  <span>{currentScene.emoji}</span>
                  <span>{currentScene.name}</span>
                </div>
              </div>

              {/* Skin tone selector */}
              <div className="flex justify-center items-center gap-2">
                <span className="text-sm text-gray-600">肤色:</span>
                {SKIN_TONES.map((tone, i) => (
                  <button key={i} onClick={() => setSkinTone(i)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${skinTone === i ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'border-white shadow'}`}
                    style={{ background: `radial-gradient(circle at 30% 30%, ${tone.highlight}, ${tone.base}, ${tone.shadow})` }}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-rose-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><span className="badge-amber">每日主题</span><h3 className="mt-2 text-lg font-black text-gray-900">{dailyChallenge.title}</h3><p className="mt-1 text-sm text-gray-600">{dailyChallenge.story}</p></div>
                  <div className="whitespace-nowrap rounded-xl bg-white px-3 py-2 text-center shadow-sm"><div className="text-xs text-gray-500">衣橱币</div><div className="font-black text-amber-700">🪙 {coins}</div></div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-gray-500">提示：场景权重最高，服装、鞋子和配饰也会影响评分。</p><button type="button" onClick={judgeChallenge} className="btn-success shrink-0 px-4 py-2 text-sm">提交挑战</button></div>
                {challengeScore !== null && <div className="mt-3 rounded-xl bg-white p-3 text-center"><span className="text-2xl">{'⭐'.repeat(Math.max(1, Math.ceil(challengeScore / 20)))}</span><strong className="ml-2 text-xl text-gray-900">{challengeScore} 分</strong><p className="text-xs text-gray-500">{challengeScore >= 90 ? '完美命中主题！' : challengeScore >= 70 ? '很有氛围，再调整一两件单品试试。' : '继续根据主题提示调整搭配吧。'}</p></div>}
              </div>
              <div className="flex justify-center gap-3 flex-wrap">
                <button onClick={randomize} className="btn-secondary">🎲 随机搭配</button>
                <button onClick={() => setShowSaveDialog(true)} className="btn-primary">💾 保存造型</button>
              </div>
            </div>

            {/* Right: Control panel */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                {[
                  { key: 'scene', label: '场景', icon: '🎬' },
                  { key: 'hair', label: '发型', icon: '💇' },
                  { key: 'makeup', label: '妆容', icon: '💄' },
                  { key: 'top', label: '上装', icon: '👕' },
                  { key: 'bottom', label: '下装', icon: '👖' },
                  { key: 'shoes', label: '鞋子', icon: '👟' },
                  { key: 'accessory', label: '配饰', icon: '👓' },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-white shadow text-primary font-semibold' : 'text-gray-600 hover:text-gray-800'}`}
                  >{tab.icon} {tab.label}</button>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 min-h-[220px]">
                {activeTab === 'scene' && (
                  <div className="grid grid-cols-2 gap-3">
                    {SCENES.map((s, i) => (
                      <button key={i} onClick={() => setScene(i)}
                        className={`relative rounded-xl overflow-hidden aspect-video transition-all ${scene === i ? 'ring-4 ring-primary scale-105' : 'hover:scale-105'}`}
                        style={{ background: s.sky }}
                      >
                        <div className="absolute bottom-0 left-0 right-0 h-[30%]" style={{ background: s.ground }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl drop-shadow">{s.emoji}</span>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 text-center text-white text-xs font-medium drop-shadow">
                          {s.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'hair' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {hairNames.map((name, i) => (
                        <button key={i} onClick={() => setHairStyle(i)}
                          className={`p-3 rounded-xl text-sm transition-all ${hairStyle === i ? 'bg-primary text-white shadow-md' : 'bg-white hover:bg-gray-100'}`}
                        >{name}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-600">发色:</span>
                      <input type="color" value={hairColor} onChange={e => setHairColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border" />
                      <div className="flex gap-1 flex-wrap">
                        {['#2C1810', '#5a3a1f', '#8B4513', '#D4A574', '#FFD700', '#FF4500', '#000000', '#E3C7A1'].map(c => (
                          <button key={c} onClick={() => setHairColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition ${hairColor === c ? 'ring-2 ring-primary' : 'border-white shadow-sm'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'top' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {topNames.map((name, i) => (
                        <button key={i} onClick={() => setTopStyle(i)}
                          className={`p-3 rounded-xl text-sm transition-all ${topStyle === i ? 'bg-primary text-white shadow-md' : 'bg-white hover:bg-gray-100'}`}
                        >{name}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-600">颜色:</span>
                      <input type="color" value={topColor} onChange={e => setTopColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border" />
                      <div className="flex gap-1 flex-wrap">
                        {['#F5F5F5', '#1a1a1a', '#8B1A1A', '#2E4C7B', '#556B2F', '#E8B4B8', '#D4A574', '#4A4A4A'].map(c => (
                          <button key={c} onClick={() => setTopColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition ${topColor === c ? 'ring-2 ring-primary' : 'border-white shadow-sm'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'bottom' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {BOTTOM_STYLES.map((name, i) => (
                        <button key={i} onClick={() => setBottomStyle(i)}
                          className={`p-3 rounded-xl text-sm transition-all ${bottomStyle === i ? 'bg-primary text-white shadow-md' : 'bg-white hover:bg-gray-100'}`}
                        >{name}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-600">颜色:</span>
                      <input type="color" value={bottomColor} onChange={e => setBottomColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border" />
                      <div className="flex gap-1 flex-wrap">
                        {['#2E4C7B', '#1a1a1a', '#3E2816', '#4A4A4A', '#6B4423', '#3d5a28', '#5B4632', '#1E3A5F'].map(c => (
                          <button key={c} onClick={() => setBottomColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition ${bottomColor === c ? 'ring-2 ring-primary' : 'border-white shadow-sm'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'shoes' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {SHOES_STYLES.map((name, i) => (
                        <button key={i} onClick={() => setShoesStyle(i)}
                          className={`p-3 rounded-xl text-sm transition-all ${shoesStyle === i ? 'bg-primary text-white shadow-md' : 'bg-white hover:bg-gray-100'}`}
                        >{name}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-600">颜色:</span>
                      <input type="color" value={shoesColor} onChange={e => setShoesColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border" />
                      <div className="flex gap-1 flex-wrap">
                        {['#FFFFFF', '#1a1a1a', '#6B4423', '#8B1A1A', '#D4A574', '#4A4A4A', '#8B4513', '#2E4C7B'].map(c => (
                          <button key={c} onClick={() => setShoesColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition ${shoesColor === c ? 'ring-2 ring-primary' : 'border-white shadow-sm'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'accessory' && (
                  <div className="grid grid-cols-2 gap-2">
                    {ACCESSORIES.map((name, i) => (
                      <button key={i} onClick={() => setAccessory(i)}
                        className={`p-3 rounded-xl text-sm transition-all ${accessory === i ? 'bg-primary text-white shadow-md' : 'bg-white hover:bg-gray-100'}`}
                      >{name}</button>
                    ))}
                  </div>
                )}

                {activeTab === 'makeup' && (
                  <div className="space-y-4">
                    {/* Lip color */}
                    {gender === 'female' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">💋 唇色</label>
                        <div className="grid grid-cols-6 gap-2">
                          {LIP_COLORS.map((l, i) => (
                            <button key={i} onClick={() => setLipColor(i)}
                              className={`relative aspect-square rounded-full transition-all ${lipColor === i ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'}`}
                              style={{ background: l.color, boxShadow: '0 2px 4px rgba(0,0,0,0.15) inset' }}
                              title={l.name}
                            >
                              {lipColor === i && <span className="absolute inset-0 flex items-center justify-center text-xs text-white drop-shadow">✓</span>}
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-center">{LIP_COLORS[lipColor].name}</div>
                      </div>
                    )}

                    {/* Eye color */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">👁️ 瞳色</label>
                      <div className="grid grid-cols-6 gap-2">
                        {EYE_COLORS.map((e, i) => (
                          <button key={i} onClick={() => setEyeColor(i)}
                            className={`relative aspect-square rounded-full transition-all ${eyeColor === i ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'}`}
                            style={{ background: `radial-gradient(circle at 40% 40%, ${lighten(e.color, 30)}, ${e.color}, ${darken(e.color, 30)})` }}
                            title={e.name}
                          >
                            {eyeColor === i && <span className="absolute inset-0 flex items-center justify-center text-xs text-white drop-shadow">✓</span>}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">{EYE_COLORS[eyeColor].name}</div>
                    </div>

                    {/* Blush */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">🌸 腮红</label>
                      <div className="grid grid-cols-5 gap-2">
                        {BLUSH_COLORS.map((b, i) => (
                          <button key={i} onClick={() => setBlushColor(i)}
                            className={`relative aspect-square rounded-full transition-all border-2 ${blushColor === i ? 'ring-2 ring-primary ring-offset-2 scale-110 border-white' : 'border-gray-200 hover:scale-105'}`}
                            style={{ background: b.color || 'repeating-linear-gradient(45deg, #fff, #fff 3px, #eee 3px, #eee 6px)' }}
                            title={b.name}
                          >
                            {blushColor === i && <span className="absolute inset-0 flex items-center justify-center text-xs text-white drop-shadow">✓</span>}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">{BLUSH_COLORS[blushColor].name}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Saved outfits */}
              {savedOutfits.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span>💾</span> 我的造型集
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {savedOutfits.map(outfit => (
                      <div key={outfit.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                        <div>
                          <div className="font-medium text-sm">{outfit.name}</div>
                          <div className="text-xs text-gray-500">
                            {outfit.gender === 'female' ? '👩' : '👨'} {SCENES[outfit.scene || 0]?.emoji} {SCENES[outfit.scene || 0]?.name}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => loadOutfit(outfit)} className="text-primary hover:text-primary/80 text-sm">加载</button>
                          <button onClick={() => deleteOutfit(outfit.id)} className="text-red-500 hover:text-red-600 text-sm">删除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-gradient-to-br from-violet-50 to-pink-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div><h3 className="font-semibold">🌍 我们的共享作品墙</h3><p className="text-xs text-gray-500">两台电脑会实时看到彼此保存的造型</p></div>
                  <span className="badge-blue">{sharedOutfits.length} 套</span>
                </div>
                {sharedOutfits.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-500">保存第一套造型，开始你们的线上衣橱</p> : (
                  <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                    {sharedOutfits.map(item => <div key={item.id} className="rounded-xl border bg-white p-3 transition hover:border-primary hover:shadow-md"><button type="button" onClick={() => loadOutfit(item.outfit)} className="w-full text-left"><div className="flex items-center justify-between"><span className="font-semibold text-gray-900">{item.name}</span><span>{item.outfit.challengeScore ? `⭐ ${item.outfit.challengeScore}` : item.outfit.gender === 'female' ? '👩' : '👨'}</span></div><div className="mt-1 flex justify-between text-xs text-gray-500"><span>by {nameOf(item.created_by)}</span><span>{SCENES[item.outfit.scene || 0]?.emoji} {item.outfit.challengeTitle ?? SCENES[item.outfit.scene || 0]?.name}</span></div></button><div className="mt-2 flex items-center justify-between border-t pt-2 text-xs"><span className="text-gray-400">点击造型即可加载</span><button type="button" onClick={() => void toggleLike(item.id)} className={`rounded-full px-2 py-1 font-semibold ${user && item.liked_by.includes(user) ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>♥ {item.liked_by.length}</button></div></div>)}
                  </div>
                )}
              </div>

              {sharedOutfits.some(item => item.outfit.challengeScore !== undefined) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="mb-3 font-semibold">🏆 搭配挑战榜</h3><ol className="space-y-2">{[...sharedOutfits].filter(item => item.outfit.challengeScore !== undefined).sort((a, b) => (b.outfit.challengeScore ?? 0) - (a.outfit.challengeScore ?? 0) || b.liked_by.length - a.liked_by.length).slice(0, 3).map((item, index) => <li key={item.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"><span><strong className="mr-2">{['🥇', '🥈', '🥉'][index]}</strong>{item.name} <span className="text-gray-400">· {item.created_by}</span></span><span className="font-black text-amber-700">{item.outfit.challengeScore} 分</span></li>)}</ol></div>}
            </div>
          </div>
        </div>

        {/* Save dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-xl font-bold mb-4">💾 保存造型</h3>
              <input
                type="text" value={outfitName} onChange={e => setOutfitName(e.target.value)}
                placeholder="给这套造型起个名字..."
                className="w-full p-3 border rounded-xl mb-4 focus:border-primary focus:outline-none"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => setShowSaveDialog(false)} className="flex-1 btn-secondary">取消</button>
                <button onClick={() => void saveOutfit()} className="flex-1 btn-primary">保存并分享</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
