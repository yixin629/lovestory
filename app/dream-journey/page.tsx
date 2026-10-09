'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import BackButton from '@/app/components/ui/BackButton'
import CombatPanel from './components/CombatPanel'
import BattleResultPanel from './components/BattleResultPanel'
import CaveCanvas from './components/CaveCanvas'
import CaveGuide from './components/CaveGuide'
import CaveMiniMap from './components/CaveMiniMap'
import ChapterPortalPanel from './components/ChapterPortalPanel'
import EncounterPreviewPanel from './components/EncounterPreviewPanel'
import GameCanvas from './components/GameCanvas'
import InventoryPanel from './components/InventoryPanel'
import MiniMap from './components/MiniMap'
import PetPanel from './components/PetPanel'
import QuestGuide from './components/QuestGuide'
import ShopPanel from './components/ShopPanel'
import SkillPanel from './components/SkillPanel'
import { createBattle, INITIAL_STATS, settleBattleStats } from './engine/combat'
import { ELITE_REWARD_IDS, INITIAL_EQUIPMENT, INITIAL_INVENTORY, ITEMS, equipmentBonuses } from './engine/equipment'
import type { FormationBattleResult } from './engine/formation-battle'
import { INITIAL_PET, starUpPet, trainPet, upgradePetSkill } from './engine/pet'
import { INITIAL_SKILLS, upgradeSkill as upgradeHeroSkill } from './engine/skills'
import { getQuestTarget, getSceneName } from './engine/world'
import {
  CHAPTER_REWARD,
  DEFAULT_LINEUP,
  INITIAL_PARTNERS,
  INITIAL_POSITION,
  QUEST_TARGET,
  buyPotion,
  grantPartnerExperience,
  parseGameSave,
  questNotice,
  rest,
  starUpPartner,
} from './engine/progression'
import type {
  BattleResult,
  BattleState,
  EquipmentState,
  HeroStats,
  InventoryState,
  ItemId,
  NpcDefinition,
  PartnerId,
  PartnerRosterState,
  Point,
  PetState,
  QuestStage,
  SceneId,
  SkillId,
  SkillState,
  WorldFlags,
} from './types'

const SAVE_KEY = 'dream-journey-save-v7'
const PREVIOUS_SAVE_KEY = 'dream-journey-save-v6'
const OLDER_SAVE_KEY = 'dream-journey-save-v5'
const EARLIER_SAVE_KEY = 'dream-journey-save-v4'
const EVEN_EARLIER_SAVE_KEY = 'dream-journey-save-v3'
const ANCIENT_SAVE_KEY = 'dream-journey-save-v2'
const LEGACY_SAVE_KEY = 'dream-journey-save-v1'

interface DialogueState {
  npc: NpcDefinition
  message: string
  action?: 'accept-quest' | 'claim-reward'
}

export default function DreamJourneyPage() {
  const [stats, setStats] = useState<HeroStats>(INITIAL_STATS)
  const [position, setPosition] = useState<Point>(INITIAL_POSITION)
  const [questStage, setQuestStage] = useState<QuestStage>('not-started')
  const [scene, setScene] = useState<SceneId>('overworld')
  const [inventory, setInventory] = useState<InventoryState>(INITIAL_INVENTORY)
  const [equipment, setEquipment] = useState<EquipmentState>(INITIAL_EQUIPMENT)
  const [worldFlags, setWorldFlags] = useState<WorldFlags>({ caveChestOpened: false, moonChapterCompleted: false })
  const [pet, setPet] = useState<PetState>(INITIAL_PET)
  const [skills, setSkills] = useState<SkillState>(INITIAL_SKILLS)
  const [lineup, setLineup] = useState<PartnerId[]>(DEFAULT_LINEUP)
  const [partners, setPartners] = useState<PartnerRosterState>(INITIAL_PARTNERS)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [pendingBattle, setPendingBattle] = useState<BattleState | null>(null)
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null)
  const [nearbyNpc, setNearbyNpc] = useState<NpcDefinition | null>(null)
  const [dialogue, setDialogue] = useState<DialogueState | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [petOpen, setPetOpen] = useState(false)
  const [skillOpen, setSkillOpen] = useState(false)
  const [notice, setNotice] = useState(questNotice('not-started', 0))
  const [sceneName, setSceneName] = useState('长安郊野')
  const [navigationRequest, setNavigationRequest] = useState<{ id: number; target: Point; name: string } | null>(null)
  const [navigationNpc, setNavigationNpc] = useState<NpcDefinition | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = parseGameSave(
      window.localStorage.getItem(SAVE_KEY) ?? window.localStorage.getItem(PREVIOUS_SAVE_KEY) ?? window.localStorage.getItem(OLDER_SAVE_KEY) ?? window.localStorage.getItem(EARLIER_SAVE_KEY) ?? window.localStorage.getItem(EVEN_EARLIER_SAVE_KEY) ?? window.localStorage.getItem(ANCIENT_SAVE_KEY),
      window.localStorage.getItem(LEGACY_SAVE_KEY),
    )
    setStats(saved.stats)
    setPosition(saved.position)
    setQuestStage(saved.questStage)
    setScene(saved.scene)
    setInventory(saved.inventory)
    setEquipment(saved.equipment)
    setWorldFlags(saved.worldFlags)
    setPet(saved.pet)
    setSkills(saved.skills)
    setLineup(saved.lineup)
    setPartners(saved.partners)
    setNotice(saved.questStage === 'completed' && saved.stats.eliteWins >= 2 && !saved.worldFlags.moonChapterCompleted
      ? '第二章已经开启：月影秘境正在等待挑战。'
      : questNotice(saved.questStage, saved.stats.questProgress, saved.stats.patrolWins))
    setSceneName(saved.scene === 'crimson-cave' ? '赤焰妖王洞窟' : getSceneName(saved.position))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 7,
      stats,
      position,
      questStage,
      scene,
      inventory,
      equipment,
      worldFlags,
      pet,
      skills,
      lineup,
      partners,
    }))
  }, [equipment, inventory, lineup, loaded, partners, pet, position, questStage, scene, skills, stats, worldFlags])

  const bonuses = useMemo(() => equipmentBonuses(equipment, inventory), [equipment, inventory])

  const beginEncounter = useCallback(() => {
    if (questStage !== 'hunting' && questStage !== 'completed') return
    setBattleResult(null)
    const elite = questStage === 'completed' && (stats.patrolWins + 1) % 3 === 0
    setPendingBattle((current) => current ?? createBattle(stats.level, 'mob', pet, elite))
  }, [pet, questStage, stats.level, stats.patrolWins])

  const beginBossEncounter = () => {
    if (questStage !== 'boss-ready') return
    setDialogue(null)
    setBattleResult(null)
    setPendingBattle(createBattle(stats.level, 'boss', pet))
    setNotice('赤焰妖王现身！先观察敌方阵容和战术提示，再决定迎战。')
  }

  const beginMoonChapter = () => {
    if (questStage !== 'completed' || stats.eliteWins < 2) return
    setBattleResult(null)
    setPendingBattle(createBattle(stats.level, 'boss', pet, false, 'moon'))
    setNotice(worldFlags.moonChapterCompleted ? '月影秘境演练开启：章节奖励不会重复发放。' : '第二章开启：月蚀妖狐正在月影秘境中等待挑战。')
  }

  const startPendingBattle = () => {
    if (!pendingBattle) return
    setBattle(pendingBattle)
    setPendingBattle(null)
    setNotice(`${pendingBattle.elite ? '精英悬赏开始' : '战斗开始'}：优先锁定${pendingBattle.enemy.name}，根据敌方数量选择单体或群体技能。`)
  }

  const retreatFromEncounter = () => {
    setPendingBattle(null)
    setNotice('已安全撤离遭遇。补给、培养宠物或调整装备后可以再次挑战。')
  }

  const handleNpcChange = useCallback((npc: NpcDefinition | null) => setNearbyNpc(npc), [])
  const handlePositionChange = useCallback((nextPosition: Point) => setPosition(nextPosition), [])
  const handleSceneChange = useCallback((nextScene: string) => setSceneName(nextScene), [])

  const handleBattleComplete = (formationBattleResult: FormationBattleResult) => {
    if (!battle) return
    const defeatedEnemy = battle.enemy
    const previousLevel = stats.level
    let nextStats = settleBattleStats(stats, battle, formationBattleResult.outcome, formationBattleResult.heroHp)
    setBattle(null)

    if (formationBattleResult.outcome === 'victory') {
      const partnerExp = defeatedEnemy.kind === 'boss' ? 32 : battle.elite ? 20 : 12
      const partnerShards = defeatedEnemy.kind === 'boss' ? 2 : battle.elite ? 1 : 0
      setPartners((current) => grantPartnerExperience(current, formationBattleResult.lineup, partnerExp, partnerShards))
      const levelMessage = nextStats.level > previousLevel ? ` 升到 ${nextStats.level} 级！` : ''
      const moonChapterVictory = defeatedEnemy.name === '月蚀妖狐' && questStage === 'completed' && !worldFlags.moonChapterCompleted
      const skillPointsGained = nextStats.level - previousLevel + (moonChapterVictory ? 2 : battle.elite ? 1 : 0)
      let resultMessage = '这场战斗已经结束，可以继续在长安境内历练。'
      if (moonChapterVictory) {
        const nextRank = inventory['moonweave-robe'] + 1
        nextStats = { ...nextStats, gold: nextStats.gold + 200, potions: nextStats.potions + 3 }
        setWorldFlags((current) => ({ ...current, moonChapterCompleted: true }))
        setInventory((current) => ({ ...current, 'moonweave-robe': current['moonweave-robe'] + 1 }))
        setEquipment((current) => ({ ...current, armor: 'moonweave-robe' }))
        resultMessage = `第二章通关！额外获得 200 两银子、3 枚金创药，并将月纹战袍${nextRank === 1 ? '首次解锁' : `精炼至 +${nextRank - 1}`}。`
        setNotice(resultMessage)
      } else if (defeatedEnemy.kind === 'boss' && questStage === 'boss-ready') {
        setQuestStage('returning')
        setInventory((current) => ({ ...current, 'crimson-charm': current['crimson-charm'] + 1 }))
        resultMessage = '赤焰妖王已被击败，并掉落赤焰护符。回到长安后找云游师父复命。'
        setNotice(`击败${defeatedEnemy.name}，获得赤焰护符、${defeatedEnemy.exp} 修为和 ${defeatedEnemy.gold} 两银子。${levelMessage}`)
      } else if (defeatedEnemy.kind === 'mob' && questStage === 'hunting') {
        const progress = Math.min(QUEST_TARGET, nextStats.questProgress + 1)
        nextStats = { ...nextStats, questProgress: progress }
        if (progress >= QUEST_TARGET) {
          setQuestStage('boss-ready')
          resultMessage = '小妖试炼已完成，东北方的赤焰洞窟已经开启。小地图会为你指路。'
          setNotice(`已击退 ${QUEST_TARGET} 只小妖！赤焰洞窟在东北方开启。${levelMessage}`)
        } else {
          resultMessage = `城外试炼进度 ${progress}/${QUEST_TARGET}，继续巡逻即可找到下一只小妖。`
          setNotice(`已击退 ${progress}/${QUEST_TARGET} 只小妖，获得 ${defeatedEnemy.exp} 修为和 ${defeatedEnemy.gold} 两银子。${levelMessage}`)
        }
      } else if (defeatedEnemy.kind === 'mob' && questStage === 'completed') {
        const patrolWins = nextStats.patrolWins + 1
        const eliteWins = nextStats.eliteWins + (battle.elite ? 1 : 0)
        nextStats = {
          ...nextStats,
          patrolWins,
          eliteWins,
          potions: nextStats.potions + (battle.elite ? 1 : 0),
        }
        const nextEliteReady = patrolWins % 3 === 2
        resultMessage = battle.elite
          ? `精英悬赏完成！额外获得 1 枚金创药。累计击败 ${eliteWins} 名精英妖物。`
          : nextEliteReady
            ? '悬赏进度已达到 2/3，下一次巡逻必定出现精英妖物与两名护卫。'
            : `悬赏巡逻胜利，当前循环进度 ${patrolWins % 3}/3。`
        setNotice(`${resultMessage}${levelMessage}`)
        if (battle.elite && eliteWins === 2 && !worldFlags.moonChapterCompleted) {
          resultMessage = `${resultMessage} 月影秘境已经开启，第二章首领正在等待挑战。`
          setNotice(`${resultMessage}${levelMessage}`)
        }
      } else {
        setNotice(`击败${defeatedEnemy.name}，获得 ${defeatedEnemy.exp} 修为和 ${defeatedEnemy.gold} 两银子。${levelMessage}`)
      }
      if (skillPointsGained > 0) {
        setSkills((current) => ({ ...current, points: current.points + skillPointsGained }))
        resultMessage = `${resultMessage} 获得 ${skillPointsGained} 点技能点。`
        setNotice(`${resultMessage}${levelMessage}`)
      }
      setBattleResult({
        outcome: 'victory',
        enemyName: defeatedEnemy.name,
        enemyIcon: defeatedEnemy.icon,
        enemyKind: defeatedEnemy.kind,
        elite: battle.elite,
        expGained: defeatedEnemy.exp,
        goldChange: defeatedEnemy.gold,
        leveledUp: nextStats.level > previousLevel,
        message: resultMessage,
        lootChoices: battle.elite ? ELITE_REWARD_IDS : undefined,
        skillPointsGained,
      })
    }
    if (formationBattleResult.outcome === 'defeat') {
      const goldLost = stats.gold - nextStats.gold
      const resultMessage = `你被送回城中休养，损失了 ${goldLost} 两银子。可以去药铺补给后再次出发。`
      setNotice(resultMessage)
      setBattleResult({
        outcome: 'defeat',
        enemyName: defeatedEnemy.name,
        enemyIcon: defeatedEnemy.icon,
        enemyKind: defeatedEnemy.kind,
        elite: battle.elite,
        expGained: 0,
        goldChange: -goldLost,
        leveledUp: false,
        message: resultMessage,
      })
    }
    setStats(nextStats)
  }

  const claimBattleLoot = (itemId: ItemId) => {
    if (!battleResult?.lootChoices?.includes(itemId) || battleResult.lootClaimed) return
    const item = ITEMS[itemId]
    const nextRank = inventory[itemId] + 1
    setInventory((current) => ({ ...current, [itemId]: current[itemId] + 1 }))
    setEquipment((current) => ({ ...current, [item.slot]: itemId }))
    setBattleResult((current) => current ? {
      ...current,
      lootChoices: undefined,
      lootClaimed: itemId,
      message: `${current.message} ${nextRank === 1 ? '首次解锁' : `精炼至 +${nextRank - 1}`}“${item.name}”，并已自动装备。`,
    } : current)
    setNotice(`${nextRank === 1 ? '获得' : '精炼'}${item.name}，已自动装备。可在装备背包中随时切换。`)
  }

  const interactWithNpc = (npc: NpcDefinition) => {
    if (npc.id === 'cave-chest') {
      if (worldFlags.caveChestOpened) return
      setWorldFlags((current) => ({ ...current, caveChestOpened: true }))
      setStats((current) => ({ ...current, gold: current.gold + 45, potions: current.potions + 2 }))
      setNearbyNpc(null)
      setNotice('开启熔岩宝箱：获得 45 两银子和 2 枚金创药。宝箱奖励已永久记录。')
      return
    }
    if (npc.id === 'cave-gate') {
      setDialogue(null)
      setPosition({ x: 450, y: 475 })
      setScene('crimson-cave')
      setSceneName('赤焰妖王洞窟')
      setNotice('沿洞窟石路前往火焰祭坛，靠近妖王后按 E 发起挑战。')
      return
    }
    if (npc.id === 'boss') {
      beginBossEncounter()
      return
    }
    if (npc.id === 'merchant') {
      setShopOpen(true)
      return
    }
    if (npc.id === 'master') {
      if (questStage === 'not-started') {
        setDialogue({
          npc,
          message: `城外妖气异常。先击退 ${QUEST_TARGET} 只小妖，再将现身的妖王除去，可敢接受试炼？`,
          action: 'accept-quest',
        })
      } else if (questStage === 'hunting') {
        setDialogue({ npc, message: `已击退 ${stats.questProgress}/${QUEST_TARGET} 只小妖。保持警惕，药铺掌柜可以帮你补给。` })
      } else if (questStage === 'boss-ready') {
        setDialogue({ npc, message: '东北方的赤焰洞窟已经开启。地图上的金色光环会为你指路。' })
      } else if (questStage === 'returning') {
        setDialogue({
          npc,
          message: '妖王已除，长安境内重归安宁。这是你应得的试炼奖励。',
          action: 'claim-reward',
        })
      } else {
        setDialogue({ npc, message: '新手试炼已完成。继续历练、提升修为，新的故事还会到来。' })
      }
      return
    }
    setDialogue({
      npc,
      message: questStage === 'boss-ready'
        ? '仙子望向东北方：妖火已落在海滩，出发前记得补足气血。'
        : npc.dialogue,
    })
  }

  const navigateToQuestTarget = (target: Point) => {
    const objective = getQuestTarget(questStage)
    setNavigationNpc(objective?.id === 'spirit-patrol' ? null : objective)
    setNavigationRequest({ id: Date.now(), target, name: objective?.name ?? '地图目标' })
    setNotice(`自动寻路已开启：正在前往${objective?.name ?? '地图目标'}。使用方向键可随时取消。`)
  }

  const navigateToMapTarget = (target: Point, name: string, npc?: NpcDefinition) => {
    setNavigationNpc(npc ?? null)
    setNavigationRequest({ id: Date.now(), target, name })
    setNotice(`地图寻路已开启：正在前往${name}。使用方向键可随时取消。`)
  }

  const navigateInCave = (target: Point, name: string) => {
    setNavigationNpc(null)
    setNavigationRequest({ id: Date.now(), target, name })
    setNotice(`洞窟寻路已开启：正在前往${name}。使用方向键可随时取消。`)
  }

  const handleGuideArrival = () => {
    if (navigationNpc) {
      const npc = navigationNpc
      setNavigationNpc(null)
      setNotice(`已抵达${npc.name}，可以开始互动。`)
      interactWithNpc(npc)
      return
    }
    if (questStage === 'hunting') {
      setNotice('已抵达妖气巡逻区，小妖现身！')
      beginEncounter()
      return
    }
    const objective = getQuestTarget(questStage)
    if (objective) interactWithNpc(objective)
  }

  const handleGuideCancel = () => {
    setNavigationNpc(null)
    setNotice('自动寻路已取消。你可以点击地图目标重新开始，或继续手动探索。')
  }

  const handleDialogueAction = () => {
    if (!dialogue?.action) return
    if (dialogue.action === 'accept-quest') {
      setStats((current) => ({ ...current, questProgress: 0 }))
      setQuestStage('hunting')
      setNotice(questNotice('hunting', 0))
    } else {
      setStats((current) => ({
        ...current,
        gold: current.gold + CHAPTER_REWARD.gold,
        potions: current.potions + CHAPTER_REWARD.potions,
        hp: current.maxHp,
        mp: current.maxMp,
      }))
      setQuestStage('completed')
      setNotice(`章节完成：获得 ${CHAPTER_REWARD.gold} 两银子、${CHAPTER_REWARD.potions} 枚金创药，并恢复全部状态。`)
    }
    setDialogue(null)
  }

  const handleBuyPotion = () => {
    const result = buyPotion(stats)
    setStats(result.stats)
    setNotice(result.message)
  }

  const handleRest = () => {
    const result = rest(stats)
    setStats(result.stats)
    setNotice(result.message)
  }

  const handleLeaveCave = useCallback(() => {
    setPosition({ x: 1950, y: 760 })
    setScene('overworld')
    setSceneName('长安郊野')
    setNearbyNpc(null)
    setNotice(questStage === 'returning' ? '妖王已败，回去找云游师父复命。' : questNotice(questStage, stats.questProgress, stats.patrolWins))
  }, [questStage, stats.patrolWins, stats.questProgress])

  const handleCaveGuideArrival = () => {
    if (questStage === 'boss-ready') beginBossEncounter()
  }

  const handleEquip = (itemId: ItemId) => {
    const item = ITEMS[itemId]
    if (inventory[itemId] <= 0) return
    setEquipment((current) => ({ ...current, [item.slot]: itemId }))
    setNotice(`已装备${item.name}：攻击 +${item.attack}，防御 +${item.defense}，暴击 +${item.crit}%。`)
  }

  const applyPetProgress = (result: ReturnType<typeof trainPet>) => {
    if (result.success) {
      setPet(result.pet)
      setStats(result.stats)
    }
    setNotice(result.message)
  }

  const handleTrainPet = () => applyPetProgress(trainPet(pet, stats))
  const handleStarUpPet = () => applyPetProgress(starUpPet(pet, stats))
  const handleUpgradePetSkill = () => applyPetProgress(upgradePetSkill(pet, stats))

  const handleUpgradeHeroSkill = (skillId: SkillId) => {
    const result = upgradeHeroSkill(skills, skillId)
    if (result.success) setSkills(result.skills)
    setNotice(result.message)
  }

  const handleStarUpPartner = (partnerId: PartnerId) => {
    const result = starUpPartner(partners, partnerId)
    if (result.success) setPartners(result.roster)
    setNotice(result.message)
  }

  const continueAdventure = () => {
    const objective = getQuestTarget(questStage)
    if (questStage === 'not-started') {
      const master = nearbyNpc?.id === 'master' ? nearbyNpc : objective?.id === 'master' ? objective : null
      if (master && Math.hypot(position.x - master.x, position.y - master.y) < 180) {
        interactWithNpc(master)
      } else if (objective) {
        navigateToQuestTarget({ x: objective.x, y: objective.y })
      }
      return
    }
    if (questStage === 'hunting') {
      beginEncounter()
      return
    }
    if (questStage === 'boss-ready' || questStage === 'returning') {
      if (objective) navigateToQuestTarget({ x: objective.x, y: objective.y })
      return
    }
    if (stats.eliteWins >= 2) beginMoonChapter()
    else beginEncounter()
  }

  const primaryActionLabel = questStage === 'not-started'
    ? '领取新手试炼'
    : questStage === 'hunting'
      ? `立即迎战小妖 · ${stats.questProgress}/${QUEST_TARGET}`
      : questStage === 'boss-ready'
        ? '自动前往赤焰洞窟'
        : questStage === 'returning'
          ? '自动返回师父复命'
          : stats.eliteWins >= 2
            ? '挑战月影秘境'
            : '开始悬赏巡逻'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#4338ca_0,_#172554_36%,_#071120_100%)] px-3 pb-8 pt-4 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <BackButton className="mb-0 border-white/20 bg-white/10 text-white hover:bg-white/20" />
          <div className="text-center">
            <p className="text-xs tracking-[0.25em] text-amber-200">东方幻想 · {sceneName} · 回合冒险</p>
            <h1 className="text-3xl font-black text-amber-100 drop-shadow md:text-4xl">梦境长安</h1>
          </div>
          <span className="rounded-full border border-amber-300/40 bg-amber-100/10 px-4 py-2 text-sm text-amber-100">任务与位置自动存档</span>
        </div>

        <div className="mb-4 grid gap-3 rounded-2xl border border-amber-200/25 bg-slate-950/45 p-3 shadow-xl backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">当前行动</p>
            <p className="mt-1 text-sm text-slate-200">{notice}</p>
          </div>
          <button type="button" onClick={continueAdventure} disabled={Boolean(pendingBattle || battle || battleResult || dialogue)} className="rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50">⚔️ {primaryActionLabel}</button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="relative">
            {loaded ? (
              scene === 'overworld' ? (
                <GameCanvas
                  paused={Boolean(pendingBattle || battle || battleResult || dialogue || shopOpen || inventoryOpen || petOpen || skillOpen)}
                  initialPosition={position}
                  questStage={questStage}
                  onEncounter={beginEncounter}
                  onInteract={interactWithNpc}
                  onNpcChange={handleNpcChange}
                  onPositionChange={handlePositionChange}
                  onSceneChange={handleSceneChange}
                  navigationRequest={navigationRequest}
                  onGuideArrival={handleGuideArrival}
                  onGuideCancel={handleGuideCancel}
                />
              ) : (
                <CaveCanvas
                  paused={Boolean(pendingBattle || battle || battleResult || inventoryOpen || petOpen || skillOpen)}
                  bossActive={questStage === 'boss-ready'}
                  chestOpened={worldFlags.caveChestOpened}
                  initialPosition={position}
                  onInteract={interactWithNpc}
                  onNpcChange={handleNpcChange}
                  onPositionChange={handlePositionChange}
                  onLeave={handleLeaveCave}
                  navigationRequest={navigationRequest}
                  onGuideArrival={handleCaveGuideArrival}
                  onGuideCancel={handleGuideCancel}
                />
              )
            ) : (
              <div className="grid aspect-[9/5.6] place-items-center rounded-2xl border-4 border-amber-200/80 bg-slate-950 text-amber-100">正在读取游戏存档…</div>
            )}
            {pendingBattle && (pendingBattle.enemy.name === '月蚀妖狐'
              ? <ChapterPortalPanel battle={pendingBattle} onStart={startPendingBattle} onRetreat={retreatFromEncounter} />
              : <EncounterPreviewPanel battle={pendingBattle} onStart={startPendingBattle} onRetreat={retreatFromEncounter} />)}
            {battle && <CombatPanel battle={battle} stats={stats} skills={skills} lineup={lineup} partners={partners} onLineupChange={setLineup} onStarUpPartner={handleStarUpPartner} onComplete={handleBattleComplete} />}
            {battleResult && <BattleResultPanel result={battleResult} inventory={inventory} onClaimLoot={claimBattleLoot} onContinue={() => setBattleResult(null)} />}
            {dialogue && (
              <div className="absolute inset-x-3 bottom-3 z-20 rounded-2xl border-2 border-amber-200 bg-slate-950/95 p-4 shadow-2xl">
                <div className="flex gap-3">
                  <span className="text-4xl">{dialogue.npc.icon}</span>
                  <div className="flex-1">
                    <b className="text-amber-200">{dialogue.npc.name} · {dialogue.npc.title}</b>
                    <p className="mt-1 text-slate-200">{dialogue.message}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setDialogue(null)} className="rounded-full border border-white/20 px-5 py-2 font-bold text-slate-200">稍后再说</button>
                  {dialogue.action && (
                    <button type="button" onClick={handleDialogueAction} className="rounded-full bg-amber-400 px-5 py-2 font-bold text-slate-950">
                      {dialogue.action === 'accept-quest' ? '接受试炼' : '领取奖励'}
                    </button>
                  )}
                </div>
              </div>
            )}
            {shopOpen && (
              <ShopPanel
                stats={stats}
                onBuyPotion={handleBuyPotion}
                onRest={handleRest}
                onClose={() => setShopOpen(false)}
              />
            )}
            {inventoryOpen && <InventoryPanel inventory={inventory} equipment={equipment} onEquip={handleEquip} onClose={() => setInventoryOpen(false)} />}
            {petOpen && <PetPanel pet={pet} gold={stats.gold} onTrain={handleTrainPet} onStarUp={handleStarUpPet} onUpgradeSkill={handleUpgradePetSkill} onClose={() => setPetOpen(false)} />}
            {skillOpen && <SkillPanel skills={skills} onUpgrade={handleUpgradeHeroSkill} onClose={() => setSkillOpen(false)} />}
          </section>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1">
            <div className="order-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-300 text-2xl">⚔️</div>
                <div><b className="text-lg">逍遥少侠</b><p className="text-xs text-sky-200">等级 {stats.level} · 人族</p></div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between"><span>❤️ 气血</span><b>{stats.hp}/{stats.maxHp}</b></p>
                <p className="flex justify-between"><span>💧 法力</span><b>{stats.mp}/{stats.maxMp}</b></p>
                <p className="flex justify-between"><span>⭐ 修为</span><b>{stats.exp}/{stats.level * 60}</b></p>
                <p className="flex justify-between"><span>🪙 银两</span><b>{stats.gold}</b></p>
                <p className="flex justify-between"><span>🧪 金创药</span><b>{stats.potions}</b></p>
                <p className="flex justify-between"><span>🏅 悬赏胜场</span><b>{stats.patrolWins}</b></p>
                <p className="flex justify-between"><span>👑 精英击破</span><b>{stats.eliteWins}</b></p>
                <p className="flex justify-between"><span>⚔️ 攻击</span><b>{stats.attack + bonuses.attack}</b></p>
                <p className="flex justify-between"><span>🛡️ 防御</span><b>{stats.defense + bonuses.defense}</b></p>
                <p className="flex justify-between"><span>🎯 暴击</span><b>{stats.crit + bonuses.crit}%</b></p>
              </div>
              <button type="button" onClick={() => setInventoryOpen(true)} className="mt-3 w-full rounded-xl bg-amber-300 px-3 py-2 font-black text-slate-950">🎒 装备背包</button>
              <button type="button" onClick={() => setPetOpen(true)} className="mt-2 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 font-black text-white">🫧 宠物养成 · {pet.level}级</button>
              <button type="button" onClick={() => setSkillOpen(true)} className="mt-2 w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-3 py-2 font-black text-white">✦ 技能修炼 · {skills.points}点</button>
            </div>

            <div className="order-1">
              {scene === 'overworld' ? (
                <QuestGuide position={position} progress={stats.questProgress} patrolWins={stats.patrolWins} eliteWins={stats.eliteWins} moonChapterCompleted={worldFlags.moonChapterCompleted} questStage={questStage} onNavigate={navigateToQuestTarget} onFreePatrol={beginEncounter} onChapterChallenge={beginMoonChapter} />
              ) : (
                <CaveGuide position={position} questStage={questStage} chestOpened={worldFlags.caveChestOpened} onNavigate={navigateInCave} />
              )}
            </div>

            <div className="order-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs leading-5 text-slate-300"><b className="mr-2 text-sky-300">操作提示</b>点击上方金色按钮即可继续主线；地图探索和手动移动仍然保留。</div>

            <div className="order-2">
              {scene === 'overworld' ? <MiniMap position={position} questStage={questStage} sceneName={sceneName} onNavigate={navigateToMapTarget} /> : (
                <CaveMiniMap position={position} questStage={questStage} chestOpened={worldFlags.caveChestOpened} onNavigate={navigateInCave} />
              )}
            </div>

            {nearbyNpc ? (
              <button type="button" onClick={() => interactWithNpc(nearbyNpc)} className="order-5 w-full animate-pulse rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 p-4 font-black text-slate-950 shadow-lg">
                {nearbyNpc.id === 'boss' ? '⚔️' : '💬'} E · {nearbyNpc.actionLabel ?? `与${nearbyNpc.name}交谈`}
              </button>
            ) : (
              <div className="order-5 rounded-2xl border border-dashed border-white/20 p-4 text-center text-sm text-slate-300">靠近头顶有名字的人物即可交互</div>
            )}

          </aside>
        </div>
      </div>
    </main>
  )
}
