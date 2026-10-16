import { create } from 'zustand'
import { ENEMY_DATA, TOWER_DATA, type TowerType } from './game/data.ts'
import { canBuildAt, pathLength, sellValue, spawnWave, towerCost, towerDistanceToEnemy, upgradeCost, type Enemy, type Tower } from './game/rules.ts'
import { isMapReachable, moduleCost, type MoatModule, type MoatModuleType } from './game/pathfinding.ts'
import { getLevel, type LevelId } from './game/levels.ts'

export type Shot = { id: number; fromX: number; fromZ: number; toX: number; toZ: number; color: string; ttl: number }
export type BuildMode = 'tower' | 'moat'
export type SaveData = { version: 2; levelId: LevelId; levelComplete: boolean; credits: number; core: number; wave: number; towers: Tower[]; modules: MoatModule[] }

const defaultModules = (): MoatModule[] => [{ id: 1, x: -3, z: 0, type: 'bridge', open: true }]
const initial = () => ({ levelId: 1 as LevelId, levelComplete: false, credits: getLevel(1).startingCredits, core: 100, wave: 0, running: false, paused: false, speed: 1 as 1 | 2, selectedTower: 'pulse' as TowerType, selectedModule: 'bridge' as MoatModuleType, buildMode: 'tower' as BuildMode, selectedId: null as number | null, towers: [] as Tower[], modules: defaultModules(), enemies: [] as Enemy[], shots: [] as Shot[], message: '选择炮塔后，点击道路两侧的蓝色建造区。' })

type GameState = ReturnType<typeof initial> & {
  selectTower: (type: TowerType) => void; selectModule: (type: MoatModuleType) => void; setBuildMode: (mode: BuildMode) => void; selectEntity: (id: number | null) => void
  buildAt: (x: number, z: number) => void; toggleGate: (id: number) => void; startWave: () => void; advanceLevel: () => void; togglePause: () => void; setSpeed: (speed: 1 | 2) => void
  upgradeTower: (id: number) => void; sellTower: (id: number) => void; reset: () => void; tick: (dt: number) => void; saveGame: () => boolean; loadGame: () => boolean
}

const validSave = (value: unknown): value is SaveData => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<SaveData>
  return ((item.version as number | undefined) === 1 || item.version === 2) && typeof item.credits === 'number' && typeof item.core === 'number' && typeof item.wave === 'number' && Array.isArray(item.towers) && Array.isArray(item.modules)
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initial(),
  selectTower: (selectedTower) => set({ selectedTower, buildMode: 'tower', selectedId: null }),
  selectModule: (selectedModule) => set({ selectedModule, buildMode: 'moat', selectedId: null }),
  setBuildMode: (buildMode) => set({ buildMode, selectedId: null }),
  selectEntity: (selectedId) => set({ selectedId }),
  buildAt: (x, z) => set((state) => {
    if (state.buildMode === 'tower') {
      const cost = towerCost(state.selectedTower)
      if (!canBuildAt(x, z, state.towers)) return { message: '这里不可建造，或与已有炮塔过近。' }
      if (state.credits < cost) return { message: `资源不足，需要 ${cost} 资金。` }
      const tower = { id: Date.now(), x, z, type: state.selectedTower, level: 1, cooldown: 0 }
      return { credits: state.credits - cost, towers: [...state.towers, tower], selectedId: tower.id, message: `${TOWER_DATA[state.selectedTower].label} 已部署。` }
    }
    if (x !== -3 || z < -6 || z > 6 || state.modules.some((module) => module.x === x && module.z === z)) return { message: '护城河模块只能放在未占用的河道格。' }
    const cost = moduleCost(state.selectedModule)
    if (state.credits < cost) return { message: `改造需要 ${cost} 资金。` }
    const module: MoatModule = { id: Date.now(), x, z, type: state.selectedModule, open: state.selectedModule !== 'gate' }
    const modules = [...state.modules, module]
    if (!isMapReachable(modules)) return { message: '改造会切断出生点到核心的路线，操作已回滚。' }
    return { credits: state.credits - cost, modules, message: '护城河模块已安装。' }
  }),
  toggleGate: (id) => set((state) => {
    const next = state.modules.map((module) => module.id === id && module.type === 'gate' ? { ...module, open: !module.open } : module)
    if (!isMapReachable(next)) return { message: '闸门关闭会切断唯一通路，操作已拒绝。' }
    return { modules: next, message: '闸门状态已切换。' }
  }),
  startWave: () => set((state) => {
    const level = getLevel(state.levelId)
    if (state.running || state.levelComplete || state.core <= 0 || state.wave >= level.waves) return state
    const wave = state.wave + 1
    return { wave, running: true, paused: false, enemies: spawnWave(wave, level.enemyHpMultiplier), message: `第 ${wave} 波入侵开始。` }
  }),
  advanceLevel: () => set((state) => {
    if (!state.levelComplete || state.levelId >= 3) return state
    const levelId = (state.levelId + 1) as LevelId
    const next = getLevel(levelId)
    return { ...initial(), levelId, credits: Math.max(state.credits, next.startingCredits), message: `已进入第 ${levelId} 关：${next.title}。${next.story}` }
  }),
  togglePause: () => set((state) => ({ paused: !state.paused, message: state.paused ? '战斗继续。' : '战斗已暂停。' })),
  setSpeed: (speed) => set({ speed }),
  upgradeTower: (id) => set((state) => {
    const tower = state.towers.find((item) => item.id === id)
    if (!tower || tower.level >= 3) return { message: '该炮塔已达到最高等级。' }
    const cost = upgradeCost(tower)
    if (state.credits < cost) return { message: `升级需要 ${cost} 资金。` }
    return { credits: state.credits - cost, towers: state.towers.map((item) => item.id === id ? { ...item, level: item.level + 1 } : item), message: '炮塔升级完成。' }
  }),
  sellTower: (id) => set((state) => {
    const tower = state.towers.find((item) => item.id === id)
    if (!tower) return state
    return { credits: state.credits + sellValue(tower), towers: state.towers.filter((item) => item.id !== id), selectedId: null, message: `炮塔已出售，返还 ${sellValue(tower)} 资金。` }
  }),
  reset: () => set({ ...initial(), message: '防线已重启。选择炮塔并开始部署。' }),
  saveGame: () => {
    const state = get()
    const save: SaveData = { version: 2, levelId: state.levelId, levelComplete: state.levelComplete, credits: state.credits, core: state.core, wave: state.wave, towers: state.towers, modules: state.modules }
    localStorage.setItem('cyber-shanghai-save', JSON.stringify(save)); set({ message: '进度已保存到本地。' }); return true
  },
  loadGame: () => {
    try {
      const raw = localStorage.getItem('cyber-shanghai-save')
      const parsed: unknown = raw ? JSON.parse(raw) : null
      if (!validSave(parsed)) return false
      const levelId: LevelId = parsed.version === 2 && (parsed.levelId === 1 || parsed.levelId === 2 || parsed.levelId === 3) ? parsed.levelId : 1
      set({ ...initial(), levelId, levelComplete: parsed.version === 2 ? Boolean(parsed.levelComplete) : false, credits: parsed.credits, core: parsed.core, wave: parsed.wave, towers: parsed.towers, modules: parsed.modules, message: '本地存档已恢复。' })
      return true
    } catch { return false }
  },
  tick: (dt) => set((state) => {
    if (!state.running || state.paused) return state
    const level = getLevel(state.levelId)
    const seconds = dt * state.speed
    let credits = state.credits
    const shots = state.shots.map((shot) => ({ ...shot, ttl: shot.ttl - seconds })).filter((shot) => shot.ttl > 0)
    const enemies = state.enemies.map((enemy) => {
      const poisonDamage = enemy.poisonUntil > 0 ? 3 * seconds : 0
      const movement = enemy.stunnedUntil > 0 ? 0 : ENEMY_DATA[enemy.type].speed * level.enemySpeedMultiplier * seconds * (enemy.slowUntil > 0 ? 0.65 : 1)
      return { ...enemy, hp: enemy.hp - poisonDamage, progress: enemy.progress + movement, slowUntil: Math.max(0, enemy.slowUntil - seconds), stunnedUntil: Math.max(0, enemy.stunnedUntil - seconds), poisonUntil: Math.max(0, enemy.poisonUntil - seconds) }
    })
    const towers = state.towers.map((tower) => ({ ...tower, cooldown: Math.max(0, tower.cooldown - seconds) }))
    for (const tower of towers) {
      if (tower.cooldown > 0) continue
      const config = TOWER_DATA[tower.type]
      const targets = enemies.filter((enemy) => enemy.hp > 0 && towerDistanceToEnemy(tower, enemy) <= config.range).sort((a, b) => b.progress - a.progress)
      const target = targets[0]
      if (!target) continue
      const damage = config.damage * (1 + (tower.level - 1) * 0.35) * (1 - ENEMY_DATA[target.type].armor)
      if (tower.type === 'chain') targets.slice(0, 3).forEach((enemy, index) => { enemy.hp -= damage * (1 - index * 0.25) })
      else if (tower.type === 'rail') targets.slice(0, 2).forEach((enemy) => { enemy.hp -= damage })
      else target.hp -= damage
      if (tower.type === 'frost') target.slowUntil = 2.5
      if (tower.type === 'poison') target.poisonUntil = 5
      if (tower.type === 'emp') target.stunnedUntil = 1.5
      tower.cooldown = config.cooldown
      shots.push({ id: Date.now() + tower.id, fromX: tower.x, fromZ: tower.z, toX: -8 + target.progress, toZ: 0, color: config.color, ttl: 0.14 })
    }
    const escaped = enemies.filter((enemy) => enemy.progress >= pathLength && enemy.hp > 0)
    const defeated = enemies.filter((enemy) => enemy.hp <= 0)
    credits += defeated.reduce((sum, enemy) => sum + ENEMY_DATA[enemy.type].reward, 0)
    const alive = enemies.filter((enemy) => enemy.hp > 0 && enemy.progress < pathLength)
    const core = Math.max(0, state.core - escaped.reduce((sum, enemy) => sum + ENEMY_DATA[enemy.type].damage, 0))
    if (core === 0) return { core, running: false, enemies: [], shots, message: '核心能量归零，防线失守。' }
    if (alive.length === 0) {
      const finalWave = state.wave >= level.waves
      const reward = level.waveReward + (finalWave ? level.clearReward : 0)
      credits += reward
      return { credits, core, towers, enemies: [], shots, running: false, levelComplete: finalWave, message: finalWave ? `第 ${level.id} 关完成，获得 ${reward} 资金奖励。` : `第 ${state.wave} 波已清除，获得 ${reward} 资金。` }
    }
    return { credits, core, towers, enemies: alive, shots }
  }),
}))
