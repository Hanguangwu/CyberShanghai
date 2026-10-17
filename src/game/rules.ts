import { ENEMY_DATA, TOWER_DATA, type EnemyType, type TowerType } from './data.ts'

export type Enemy = { id: number; type: EnemyType; hp: number; progress: number; slowUntil: number; stunnedUntil: number; poisonUntil: number }
export type Tower = { id: number; x: number; z: number; type: TowerType; level: number; cooldown: number }

export const pathLength = 16
export const towerCost = (type: TowerType) => TOWER_DATA[type].cost
export const upgradeCost = (tower: Tower) => 100 * tower.level
export const sellValue = (tower: Tower) => 100 * tower.level
export const canBuildAt = (x: number, z: number, towers: Tower[]) => x >= -1 && x <= 6 && Math.abs(z) >= 2 && Math.abs(z) <= 6 && !towers.some((tower) => Math.hypot(tower.x - x, tower.z - z) < 1.1)
export const spawnWave = (wave: number, hpMultiplier = 1, countMultiplier = 1): Enemy[] => {
  const enemies: Enemy[] = []
  const count = Math.ceil((3 + wave * 2) * countMultiplier)
  for (let i = 0; i < count; i += 1) {
    const types: EnemyType[] = ['boar', 'armored', 'charger', 'repair', 'disruptor']
    const type = wave === 1 ? 'boar' : types[(i + wave) % types.length]
    enemies.push({ id: wave * 100 + i, type, hp: ENEMY_DATA[type].hp * (1 + (wave - 1) * 0.08) * hpMultiplier, progress: -i * 0.9, slowUntil: 0, stunnedUntil: 0, poisonUntil: 0 })
  }
  if (wave === 6 || wave === 8) enemies.push({ id: 999 + wave, type: 'boss', hp: ENEMY_DATA.boss.hp * hpMultiplier, progress: -6, slowUntil: 0, stunnedUntil: 0, poisonUntil: 0 })
  return enemies
}

export const distanceAlongPath = (progress: number) => Math.abs(progress - pathLength / 2)
export const enemyWorldX = (progress: number) => -8 + progress
export const towerDistanceToEnemy = (tower: Tower, enemy: Enemy) => Math.hypot(tower.x - enemyWorldX(enemy.progress), tower.z)
