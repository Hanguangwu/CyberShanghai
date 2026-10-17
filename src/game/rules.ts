import { ENEMY_DATA, TOWER_DATA, type EnemyType, type TowerType } from './data.ts'
import { getWavePath, pointAtDistance, isRoadsideBuildPoint, type CampusPoint, type NavigationPath } from './campusMap.ts'

export type Enemy = { id: number; type: EnemyType; hp: number; path: NavigationPath; pathProgress: number; position: CampusPoint; slowUntil: number; stunnedUntil: number; poisonUntil: number }
export type Tower = { id: number; x: number; z: number; type: TowerType; level: number; cooldown: number }

export const towerCost = (type: TowerType) => TOWER_DATA[type].cost
export const upgradeCost = (tower: Tower) => 100 * tower.level
export const sellValue = (tower: Tower) => 100 * tower.level
export const canBuildAt = (x: number, z: number, towers: Tower[]) => isRoadsideBuildPoint({ x, z }) && !towers.some((tower) => Math.hypot(tower.x - x, tower.z - z) < 10)

/**
 * 分波冲击的敌人编成（两种敌人 + 最终 Boss）：
 * 第 1 波只有工蜂虫（让玩家先看清节奏），第 2 波起混入巡逻机器人，第 4 波起两者各半。
 */
const enemyRoster = (wave: number): EnemyType[] => {
  if (wave <= 1) return ['beetle']
  if (wave <= 3) return ['beetle', 'beetle', 'robot']
  return ['beetle', 'robot']
}

export const spawnWave = (wave: number, hpMultiplier = 1, countMultiplier = 1, path = getWavePath(wave)): Enemy[] => {
  const enemies: Enemy[] = []
  const count = Math.ceil((3 + wave * 2) * countMultiplier)
  const roster = enemyRoster(wave)
  for (let i = 0; i < count; i += 1) {
    const type = roster[(i + wave) % roster.length]
    const pathProgress = -i * 2.5
    enemies.push({ id: wave * 100 + i, type, hp: ENEMY_DATA[type].hp * (1 + (wave - 1) * 0.08) * hpMultiplier, path, pathProgress, position: pointAtDistance(path, pathProgress), slowUntil: 0, stunnedUntil: 0, poisonUntil: 0 })
  }
  if (wave === 6 || wave === 8) enemies.push({ id: 999 + wave, type: 'boss', hp: ENEMY_DATA.boss.hp * hpMultiplier, path, pathProgress: -8, position: pointAtDistance(path, -8), slowUntil: 0, stunnedUntil: 0, poisonUntil: 0 })
  return enemies
}

export const towerDistanceToEnemy = (tower: Tower, enemy: Enemy) => Math.hypot(tower.x - enemy.position.x, tower.z - enemy.position.z)
