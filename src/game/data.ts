export type TowerType = 'pulse' | 'chain' | 'frost' | 'rail' | 'poison' | 'emp'
export type EnemyType = 'beetle' | 'robot' | 'boss'

export const TOWER_DATA: Record<TowerType, { label: string; cost: number; range: number; damage: number; cooldown: number; color: string; note: string }> = {
  pulse: { label: '脉冲炮', cost: 100, range: 5.3, damage: 100, cooldown: 0.7, color: '#35d5e8', note: '稳定的单体输出' },
  chain: { label: '电弧塔', cost: 200, range: 6, damage: 100, cooldown: 1.2, color: '#f5e663', note: '链式攻击最多 3 个目标' },
  frost: { label: '冰霜塔', cost: 300, range: 5, damage: 100, cooldown: 1.4, color: '#a98cff', note: '减速 35%，持续 2.5 秒' },
  rail: { label: '磁轨炮', cost: 400, range: 11, damage: 300, cooldown: 2.4, color: '#ff4ca0', note: '穿透攻击，优先装甲目标' },
  poison: { label: '毒雾塔', cost: 500, range: 5, damage: 100, cooldown: 2, color: '#6ee58f', note: '附加持续伤害' },
  emp: { label: '黑客塔', cost: 600, range: 8, damage: 0, cooldown: 3, color: '#f59b5f', note: 'EMP 沉默机械敌人' },
}

export const ENEMY_DATA: Record<EnemyType, { label: string; hp: number; speed: number; armor: number; reward: number; damage: number }> = {
  beetle: { label: '虫子', hp: 80, speed: 3, armor: 0, reward: 80, damage: 40 },
  robot: { label: '机器人', hp: 300, speed: 1.8, armor: 0.25, reward: 220, damage: 100 },
  boss: { label: '鲸鱼', hp: 5000, speed: 0.9, armor: 0.35, reward: 1000, damage: 300 },
}

export const ENEMY_MODEL_FILES: Record<EnemyType, string> = {
  beetle: 'army_beetle_pbr.glb',
  robot: 'patrol-robot.glb',
  boss: 'deepseek_whale_pbr.glb',
}

export const FIELD_SIZE = { x: 120, z: 100 }
export const MAP_MODEL_FILE = 'mapv0_pbr.glb'
export const MAP_HEIGHT_RATIO = 0.1

export const TOWER_MODEL_FILES: Record<TowerType, string> = {
  pulse: 'machinegun_pbr.glb',
  chain: 'flametower_pbr.glb',
  frost: 'ice_tower_pbr.glb',
  rail: 'rail_gun_pbr.glb',
  poison: 'gas_tower_pbr.glb',
  emp: 'hacker_tower_pbr.glb',
}

export const MAX_WAVES = 8
export const CENTER_TOWER_SLOT = { x: -52, z: 0 }
