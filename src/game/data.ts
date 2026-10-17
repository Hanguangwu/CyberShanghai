export type TowerType = 'pulse' | 'chain' | 'frost' | 'rail' | 'poison' | 'emp'
export type EnemyType = 'beetle' | 'robot' | 'boss'

export const TOWER_DATA: Record<TowerType, { label: string; cost: number; range: number; damage: number; cooldown: number; color: string; note: string }> = {
  pulse: { label: '脉冲炮', cost: 100, range: 5.3, damage: 100, cooldown: 0.7, color: '#35d5e8', note: '稳定单体输出' },
  chain: { label: '电弧塔', cost: 200, range: 6, damage: 100, cooldown: 1.2, color: '#f5e663', note: '链式攻击最多 3 个目标' },
  frost: { label: '冰霜塔', cost: 300, range: 5, damage: 100, cooldown: 1.4, color: '#a98cff', note: '减速 35%，持续 2.5 秒' },
  rail: { label: '磁轨炮', cost: 400, range: 11, damage: 300, cooldown: 2.4, color: '#ff4ca0', note: '穿透首个目标，优先装甲' },
  poison: { label: '毒雾塔', cost: 500, range: 5, damage: 100, cooldown: 2, color: '#6ee58f', note: '范围持续伤害' },
  emp: { label: '黑客塔', cost: 600, range: 8, damage: 0, cooldown: 3, color: '#f59b5f', note: 'EMP 沉默机械敌人' },
}

// 数值取自 docs/所需 3D 模型.md：工蜂虫=基础群怪，巡逻机器人=重甲机械，深海巨鲸=最终 Boss。
// damage 是“泄漏伤害”（敌人走到核心时对核心造成的伤害）。
export const ENEMY_DATA: Record<EnemyType, { label: string; hp: number; speed: number; armor: number; reward: number; damage: number }> = {
  beetle: { label: '工蜂虫', hp: 80, speed: 3, armor: 0, reward: 80, damage: 40 },
  robot: { label: '巡逻机器人', hp: 300, speed: 1.8, armor: 0.25, reward: 220, damage: 100 },
  boss: { label: '深海巨鲸', hp: 5000, speed: 0.9, armor: 0.35, reward: 1000, damage: 300 },
}

// 敌人各自的 GLB 模型。army_beetle / deepseek_whale 只有 _pbr 带贴图信息，patrol-robot 仅一个版本。
export const ENEMY_MODEL_FILES: Record<EnemyType, string> = {
  beetle: 'army_beetle_pbr.glb',
  robot: 'patrol-robot.glb',
  boss: 'deepseek_whale_pbr.glb',
}

// 战场基准区域（X × Z）。地图模型会「装填」进这个范围，地面与网格再跟着地图的实际尺寸收缩。
export const FIELD_SIZE = { x: 100, z: 100 }
export const MAP_MODEL_FILE = 'mapv0_pbr.glb'
// 地图等比放大后最高点会从 0.34 变成 ~3.2，高过只有 2 单位高的炮塔；压扁一半保留城市层次又不遮挡战场。
export const MAP_HEIGHT_RATIO = 0.1

// 六种防御塔各自的专属模型（public/models/）。全部使用 _pbr 版本：
// 它们带 baseColorTexture + metallicRoughnessTexture，配合场景 environment 才有正确反射（_shaded 依赖自发光通道）。
// 中央塔位的 pioche.glb 是例外，见 CENTER_TOWER_SLOT。
export const TOWER_MODEL_FILES: Record<TowerType, string> = {
  pulse: 'machinegun_pbr.glb',
  chain: 'flametower_pbr.glb',
  frost: 'ice_tower_pbr.glb',
  rail: 'rail_gun_pbr.glb',
  poison: 'gas_tower_pbr.glb',
  emp: 'hacker_tower_pbr.glb',
}

export const MAX_WAVES = 6

// 地图中央的“主塔位”：建在此坐标上的炮塔使用 pioche.glb 作为专属模型，其余塔位沿用常规变体。
// 想换位置只改这一行即可。
export const CENTER_TOWER_SLOT = { x: 44, z: 0 }
