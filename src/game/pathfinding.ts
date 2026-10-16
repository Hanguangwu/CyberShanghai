export type GridPoint = { x: number; z: number }
export type MoatModuleType = 'straight' | 'corner' | 'bridge' | 'gate'
export type MoatModule = GridPoint & { id: number; type: MoatModuleType; open: boolean }

export const GRID_MIN_X = -8
export const GRID_MAX_X = 8
export const GRID_MIN_Z = -6
export const GRID_MAX_Z = 6
export const SPAWN: GridPoint = { x: -8, z: 0 }
export const CORE: GridPoint = { x: 7, z: 0 }
export const RIVER_X = -3

const key = (point: GridPoint) => `${point.x},${point.z}`
const inBounds = (point: GridPoint) => point.x >= GRID_MIN_X && point.x <= GRID_MAX_X && point.z >= GRID_MIN_Z && point.z <= GRID_MAX_Z
const riverCell = (point: GridPoint) => point.x === RIVER_X

export const isWalkable = (point: GridPoint, modules: MoatModule[]) => {
  if (!inBounds(point)) return false
  if (!riverCell(point)) return true
  const module = modules.find((item) => item.x === point.x && item.z === point.z)
  return module?.type === 'bridge' || (module?.type === 'gate' && module.open)
}

const neighbors = (point: GridPoint): GridPoint[] => [
  { x: point.x + 1, z: point.z }, { x: point.x - 1, z: point.z },
  { x: point.x, z: point.z + 1 }, { x: point.x, z: point.z - 1 },
]
const heuristic = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z)

export const findPath = (start: GridPoint, goal: GridPoint, modules: MoatModule[]): GridPoint[] | null => {
  if (!isWalkable(start, modules) || !isWalkable(goal, modules)) return null
  const open = [start]
  const cameFrom = new Map<string, GridPoint>()
  const cost = new Map<string, number>([[key(start), 0]])
  const score = new Map<string, number>([[key(start), heuristic(start, goal)]])
  while (open.length > 0) {
    open.sort((a, b) => (score.get(key(a)) ?? Infinity) - (score.get(key(b)) ?? Infinity))
    const current = open.shift()!
    if (key(current) === key(goal)) {
      const result = [current]
      let cursor = current
      while (cameFrom.has(key(cursor))) { cursor = cameFrom.get(key(cursor))!; result.unshift(cursor) }
      return result
    }
    for (const next of neighbors(current)) {
      if (!isWalkable(next, modules)) continue
      const nextKey = key(next)
      const nextCost = (cost.get(key(current)) ?? Infinity) + 1
      if (nextCost >= (cost.get(nextKey) ?? Infinity)) continue
      cameFrom.set(nextKey, current); cost.set(nextKey, nextCost); score.set(nextKey, nextCost + heuristic(next, goal))
      if (!open.some((item) => key(item) === nextKey)) open.push(next)
    }
  }
  return null
}

export const isMapReachable = (modules: MoatModule[]) => findPath(SPAWN, CORE, modules) !== null
export const moduleCost = (type: MoatModuleType) => type === 'bridge' ? 80 : type === 'gate' ? 120 : 60
