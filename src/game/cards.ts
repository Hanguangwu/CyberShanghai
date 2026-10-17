export type CardModifier = {
  initialCreditsMultiplier?: number
  enemyDamageMultiplier?: number
  enemyCountMultiplier?: number
  enemyHpMultiplier?: number
  enemySpeedMultiplier?: number
  rewardMultiplier?: number
  towerDamageMultiplier?: number
  coreBonus?: number
}

export type OpeningCard = {
  id: string
  name: string
  subtitle: string
  description: string
  risk: 'safe' | 'risk' | 'chaos'
  color: string
  icon: string
  modifier: CardModifier
}

export const OPENING_CARDS: OpeningCard[] = [
  { id: 'eternal', name: '绵长恒久', subtitle: '稳定的远期供给', description: '初始金币数量增加 20%。', risk: 'safe', color: '#35d5e8', icon: '∞', modifier: { initialCreditsMultiplier: 1.2 } },
  { id: 'too-young', name: 'Too Young Too Simple', subtitle: '轻敌会付出代价', description: '敌人攻击强度增加 10%，数量增加 20%。', risk: 'risk', color: '#ff4ca0', icon: '!', modifier: { enemyDamageMultiplier: 1.1, enemyCountMultiplier: 1.2 } },
  { id: 'neon-dividend', name: '霓虹红利', subtitle: '把战火变成现金', description: '初始金币减少 15%，但所有战斗奖励增加 50%。', risk: 'risk', color: '#f3ca58', icon: '¥', modifier: { initialCreditsMultiplier: 0.85, rewardMultiplier: 1.5 } },
  { id: 'river-oath', name: '江潮护誓', subtitle: '核心不会轻易熄灭', description: '核心上限增加 20 点，但敌人生命值增加 12%。', risk: 'safe', color: '#6ee58f', icon: '◆', modifier: { coreBonus: 20, enemyHpMultiplier: 1.12 } },
  { id: 'ghost-protocol', name: '幽灵协议', subtitle: '看不见的火力', description: '炮塔伤害增加 15%，敌人移动速度增加 12%。', risk: 'risk', color: '#a98cff', icon: '◇', modifier: { towerDamageMultiplier: 1.15, enemySpeedMultiplier: 1.12 } },
  { id: 'red-tide', name: '赤潮倒计时', subtitle: '越快越危险', description: '敌人数量增加 35%、速度增加 15%，奖励增加 80%。', risk: 'chaos', color: '#ff785f', icon: '↯', modifier: { enemyCountMultiplier: 1.35, enemySpeedMultiplier: 1.15, rewardMultiplier: 1.8 } },
  { id: 'cold-start', name: '冷启动', subtitle: '少即是多', description: '初始金币减少 30%，但敌人生命值和速度降低 18%。', risk: 'safe', color: '#79f1ff', icon: '❄', modifier: { initialCreditsMultiplier: 0.7, enemyHpMultiplier: 0.82, enemySpeedMultiplier: 0.82 } },
  { id: 'last-bet', name: '孤注一掷', subtitle: '赌桌只留一个赢家', description: '初始金币增加 45%，敌人攻击、生命值和数量均增加 25%。', risk: 'chaos', color: '#ff9b5f', icon: '♠', modifier: { initialCreditsMultiplier: 1.45, enemyDamageMultiplier: 1.25, enemyHpMultiplier: 1.25, enemyCountMultiplier: 1.25 } },
]

export const getCard = (id: string) => OPENING_CARDS.find((card) => card.id === id)

export const drawOpeningCards = (count = 3, random = Math.random): OpeningCard[] => {
  const cards = [...OPENING_CARDS]
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = cards[index]
    cards[index] = cards[swapIndex]
    cards[swapIndex] = current
  }
  return cards.slice(0, Math.min(count, cards.length))
}

export const cardNumber = (value: number | undefined, fallback: number) => value ?? fallback
