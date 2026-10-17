export type LevelId = 1 | 2 | 3

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
  1: { id: 1, title: '外滩能源环线', subtitle: '第一章 · 雾港警报', story: '黄浦江的潮雾裹着异常信号登陆外滩。守住能源核心，等待城防网络完成扫描。', objective: '完成 6 波入侵并保住核心', startingCredits: 1000, waves: 6, waveReward: 100, clearReward: 500, enemyHpMultiplier: 1, enemySpeedMultiplier: 1, skyColor: '#07131e' },
  2: { id: 2, title: '陆家嘴高架', subtitle: '第二章 · 霓虹断链', story: '敌群转向高架磁轨，城市供能节点即将断链。集中火力，把它们挡在金融区之外。', objective: '完成 7 波入侵并保住核心', startingCredits: 1000, waves: 7, waveReward: 200, clearReward: 800, enemyHpMultiplier: 1.12, enemySpeedMultiplier: 1.05, skyColor: '#160d25' },
  3: { id: 3, title: '黄浦江闸门', subtitle: '终章 · 黎明协议', story: '核心协议已经唤醒，最后的野猪王正带着重装潮冲向城市。守到天亮，上海就能重新上线。', objective: '完成 8 波入侵并击退野猪王', startingCredits: 1200, waves: 8, waveReward: 300, clearReward: 1200, enemyHpMultiplier: 1.28, enemySpeedMultiplier: 1.1, skyColor: '#24101f' },
}

export const getLevel = (id: number): LevelConfig => LEVELS[(id as LevelId) in LEVELS ? id as LevelId : 1]
