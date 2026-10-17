import assert from 'node:assert/strict'
import { canBuildAt, sellValue, spawnWave, towerDistanceToEnemy, upgradeCost } from '../src/game/rules.ts'
import { TOWER_DATA } from '../src/game/data.ts'
import { ENEMY_DATA } from '../src/game/data.ts'
import { LEVELS } from '../src/game/levels.ts'
import { drawOpeningCards, getCard } from '../src/game/cards.ts'
import { useGameStore } from '../src/gameStore.ts'

const towers = [{ id: 1, x: 2, z: 3, type: 'pulse' as const, level: 1, cooldown: 0 }]
assert.equal(canBuildAt(4, 3, towers), true)
assert.equal(canBuildAt(2, 3, towers), false)
assert.equal(canBuildAt(0, 0, towers), false)
assert.equal(upgradeCost(towers[0]), 100)
assert.equal(sellValue(towers[0]), 100)
assert.equal(spawnWave(1).length, 5)
assert.equal(spawnWave(6).some((enemy) => enemy.type === 'boss'), true)
assert.equal(towerDistanceToEnemy(towers[0], { id: 2, type: 'boar', hp: 90, progress: 8, slowUntil: 0, stunnedUntil: 0, poisonUntil: 0 }) <= 5.3, true)
assert.equal(towerDistanceToEnemy({ ...towers[0], x: 6 }, { id: 3, type: 'boar', hp: 90, progress: 0, slowUntil: 0, stunnedUntil: 0, poisonUntil: 0 }) <= 5.3, false)
assert.equal(Object.keys(TOWER_DATA).length, 6)
assert.equal(Object.values(TOWER_DATA).every((tower) => tower.cost % 100 === 0 && tower.damage % 100 === 0), true)
assert.equal(Object.values(ENEMY_DATA).every((enemy) => enemy.reward % 100 === 0 && enemy.damage % 100 === 0), true)
assert.equal(Object.keys(LEVELS).length, 3)
assert.equal(LEVELS[1].startingCredits > 420, true)
assert.equal(LEVELS[1].clearReward > 0, true)
assert.equal(drawOpeningCards(3, () => 0.25).length, 3)
assert.equal(getCard('eternal')?.modifier.initialCreditsMultiplier, 1.2)
assert.equal(getCard('too-young')?.modifier.enemyDamageMultiplier, 1.1)
assert.equal(getCard('too-young')?.modifier.enemyCountMultiplier, 1.2)
assert.equal(spawnWave(5).some((enemy) => enemy.type === 'disruptor'), true)
useGameStore.getState().reset()
assert.equal(useGameStore.getState().credits, LEVELS[1].startingCredits)
// 开局盲盒：盒中只有一张卡，玩家无法挑选；开盒后进入揭晓阶段，确认后才能开波。
assert.equal(useGameStore.getState().offeredCards.length, 1)
assert.equal(useGameStore.getState().cardPhase, 'draw')
useGameStore.getState().openBlindBox()
assert.equal(useGameStore.getState().cardPhase, 'reveal')
assert.equal(useGameStore.getState().chosenCardId, useGameStore.getState().offeredCards[0])
useGameStore.getState().startWave()
assert.equal(useGameStore.getState().running, false)
useGameStore.getState().confirmCard()
assert.equal(useGameStore.getState().cardPhase, 'ready')
useGameStore.getState().openBlindBox()
assert.equal(useGameStore.getState().cardPhase, 'ready')
const storage = { value: null as string | null, getItem: () => storage.value, setItem: (_key: string, value: string) => { storage.value = value } }
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
useGameStore.getState().buildAt(2, 3)
const savedCredits = useGameStore.getState().credits
assert.equal(useGameStore.getState().towers.length, 1)
assert.equal(useGameStore.getState().saveGame(), true)
useGameStore.getState().reset()
assert.equal(useGameStore.getState().towers.length, 0)
assert.equal(useGameStore.getState().loadGame(), true)
assert.equal(useGameStore.getState().towers.length, 1, 'save/load must restore the exact tower snapshot')
assert.equal(useGameStore.getState().credits, savedCredits, 'save/load must restore the exact integer credits')
assert.equal(Number.isInteger(useGameStore.getState().credits), true)
useGameStore.getState().startWave()
const beforeAttack = new Map(useGameStore.getState().enemies.map((enemy) => [enemy.id, enemy.hp]))
for (let i = 0; i < 30; i += 1) useGameStore.getState().tick(0.1)
const afterAttack = useGameStore.getState().enemies
assert.equal(afterAttack.some((enemy) => enemy.hp < (beforeAttack.get(enemy.id) ?? enemy.hp)) || afterAttack.length < beforeAttack.size, true, 'deployed tower must damage an enemy during a running wave')
console.log('rules: all assertions passed')
