export type TowerType = 'pulse' | 'chain' | 'frost' | 'rail' | 'poison' | 'emp'
export type EnemyType = 'boar' | 'armored' | 'charger' | 'repair' | 'disruptor' | 'boss'

export const TOWER_DATA: Record<TowerType, { label: string; cost: number; range: number; damage: number; cooldown: number; color: string; note: string }> = {
  pulse: { label: '脉冲炮', cost: 100, range: 5.3, damage: 100, cooldown: 0.7, color: '#35d5e8', note: '稳定单体输出' },
  chain: { label: '电弧塔', cost: 200, range: 6, damage: 100, cooldown: 1.2, color: '#f5e663', note: '链式攻击最多 3 个目标' },
  frost: { label: '冰霜塔', cost: 300, range: 5, damage: 100, cooldown: 1.4, color: '#a98cff', note: '减速 35%，持续 2.5 秒' },
  rail: { label: '磁轨炮', cost: 400, range: 11, damage: 300, cooldown: 2.4, color: '#ff4ca0', note: '穿透首个目标，优先装甲' },
  poison: { label: '毒雾塔', cost: 500, range: 5, damage: 100, cooldown: 2, color: '#6ee58f', note: '范围持续伤害' },
  emp: { label: '黑客塔', cost: 600, range: 8, damage: 0, cooldown: 3, color: '#f59b5f', note: 'EMP 沉默机械敌人' },
}

export const ENEMY_DATA: Record<EnemyType, { label: string; hp: number; speed: number; armor: number; reward: number; damage: number }> = {
  boar: { label: '锈蚀小野猪', hp: 100, speed: 2.8, armor: 0, reward: 100, damage: 100 },
  armored: { label: '装甲野猪', hp: 300, speed: 1.6, armor: 0.25, reward: 200, damage: 100 },
  charger: { label: '冲锋野猪', hp: 200, speed: 3.8, armor: 0.1, reward: 200, damage: 200 },
  repair: { label: '维修母猪', hp: 300, speed: 1.4, armor: 0.05, reward: 300, damage: 100 },
  disruptor: { label: '干扰野猪', hp: 200, speed: 2.2, armor: 0.15, reward: 300, damage: 200 },
  boss: { label: '黄浦江巨兽', hp: 5000, speed: 0.9, armor: 0.35, reward: 1000, damage: 300 },
}

export const MAX_WAVES = 6

// 地图中央的“主塔位”：建在此坐标上的炮塔使用 pioche.glb 作为专属模型，其余塔位沿用常规变体。
// 想换位置只改这一行即可。
export const CENTER_TOWER_SLOT = { x: 2, z: 2 }
