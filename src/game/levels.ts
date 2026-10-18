export type LevelId = 1

export type LevelConfig = {
  id: LevelId
  title: string
  subtitle: string
  story: string
  objective: string
  startingCredits: number
  waves: number
  waveReward: number
  clearReward: number
  enemyHpMultiplier: number
  enemySpeedMultiplier: number
  skyColor: string
}

export const LEVELS: Record<LevelId, LevelConfig> = {
  1: {
    id: 1,
    title: '保卫上科大校园',
    subtitle: '校园核心防卫战',
    story: '异常信号穿过校园边界，虫群、机器人与深海鲸鱼正沿着道路逼近核心。作为临时防卫指挥官，你必须守住上科大校园，等待支援网络上线。',
    objective: '完成 8 波入侵并保护校园核心',
    startingCredits: 1000,
    waves: 8,
    waveReward: 100,
    clearReward: 1200,
    enemyHpMultiplier: 1,
    enemySpeedMultiplier: 1,
    skyColor: '#07131e',
  },
}

export const getLevel = (_id: number): LevelConfig => LEVELS[1]
