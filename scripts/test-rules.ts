import assert from 'node:assert/strict'
import { canBuildAt, sellValue, spawnWave, towerDistanceToEnemy, upgradeCost } from '../src/game/rules.ts'
import { CORE, SPAWN, findPath, isMapReachable, type MoatModule } from '../src/game/pathfinding.ts'
import { TOWER_DATA } from '../src/game/data.ts'
import { LEVELS } from '../src/game/levels.ts'
import { useGameStore } from '../src/gameStore.ts'

const towers = [{ id: 1, x: 2, z: 3, type: 'pulse' as const, level: 1, cooldown: 0 }]
assert.equal(canBuildAt(4, 3, towers), true)
assert.equal(canBuildAt(2, 3, towers), false)
assert.equal(canBuildAt(0, 0, towers), false)
assert.equal(upgradeCost(towers[0]), 60)
assert.equal(sellValue(towers[0]), 70)
assert.equal(spawnWave(1).length, 5)
assert.equal(spawnWave(6).some((enemy) => enemy.type === 'boss'), true)
assert.equal(towerDistanceToEnemy(towers[0], { id: 2, type: 'boar', hp: 90, progress: 8, slowUntil: 0, stunnedUntil: 0, poisonUntil: 0 }) <= 5.3, true)
assert.equal(towerDistanceToEnemy({ ...towers[0], x: 6 }, { id: 3, type: 'boar', hp: 90, progress: 0, slowUntil: 0, stunnedUntil: 0, poisonUntil: 0 }) <= 5.3, false)
assert.equal(Object.keys(TOWER_DATA).length, 6)
assert.equal(Object.keys(LEVELS).length, 3)
assert.equal(LEVELS[1].startingCredits > 420, true)
assert.equal(LEVELS[1].clearReward > 0, true)
assert.equal(spawnWave(5).some((enemy) => enemy.type === 'disruptor'), true)
const defaultModules: MoatModule[] = [{ id: 1, x: -3, z: 0, type: 'bridge', open: true }]
assert.equal(isMapReachable(defaultModules), true)
assert.equal(findPath(SPAWN, CORE, defaultModules)?.some((point) => point.x === -3 && point.z === 0), true)
assert.equal(isMapReachable([]), false)

useGameStore.getState().reset()
assert.equal(useGameStore.getState().credits, LEVELS[1].startingCredits)
useGameStore.getState().buildAt(2, 3)
useGameStore.getState().startWave()
const beforeAttack = useGameStore.getState().enemies.map((enemy) => enemy.hp)
for (let i = 0; i < 30; i += 1) useGameStore.getState().tick(0.1)
const afterAttack = useGameStore.getState().enemies.map((enemy) => enemy.hp)
assert.equal(afterAttack.some((hp, index) => hp < (beforeAttack[index] ?? hp)), true, 'deployed tower must damage an enemy during a running wave')
console.log('rules: all assertions passed')
