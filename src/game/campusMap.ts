export type CampusPoint = { x: number; z: number }

export type NavigationPath = {
  id: string
  points: CampusPoint[]
  cumulativeLengths: number[]
  totalLength: number
}

export type CampusRoute = { id: string; points: CampusPoint[] }

export const CAMPUS_SCALE = 1
export const CAMPUS_BOUNDS = { minX: -60, maxX: 60, minZ: -50, maxZ: 50 }
// Coordinate convention matches the viewport: +X is west, +Z is south.
export const CAMPUS_SPAWN: CampusPoint = { x: 52 * CAMPUS_SCALE, z: 0 }
export const CAMPUS_CORE: CampusPoint = { x: -52 * CAMPUS_SCALE, z: 0 }
export const CAMPUS_ROAD_WIDTH = 4 * CAMPUS_SCALE
const BASE_CORE: CampusPoint = { x: -52, z: 0 }

// Temporary routes are authored independently from the GLB. Replace these points when campus.glb gets its road plan.
const BASE_ROUTES: CampusRoute[] = [
  // North road: kept north of the life-science/conference buildings.
  { id: 'north-campus-loop', points: [{ x: 52, z: 0 }, { x: -42, z: 0 }, { x: -42, z: -40 }, { x: -20, z: -40 }, { x: 0, z: -40 }, { x: 22, z: -40 }, { x: 42, z: -40 }, { x: 42, z: 0 }, BASE_CORE] },
  // Main avenue is the only route intentionally crossing the campus-main-avenue asset.
  { id: 'main-avenue', points: [{ x: 52, z: 0 }, { x: -30, z: 0 }, { x: 0, z: 0 }, { x: 28, z: 0 }, BASE_CORE] },
  // Science road runs north of the information/physical/biomedical cluster.
  { id: 'science-loop', points: [{ x: 52, z: 0 }, { x: -40, z: 0 }, { x: -40, z: -20 }, { x: 40, z: -20 }, { x: 40, z: 0 }, BASE_CORE] },
  // South road is kept below the entrepreneurship/Y-building/library cluster.
  { id: 'south-campus-loop', points: [{ x: 52, z: 0 }, { x: -54, z: 0 }, { x: -54, z: 42 }, { x: -20, z: 42 }, { x: 0, z: 42 }, { x: 22, z: 42 }, { x: 54, z: 42 }, { x: 54, z: 0 }, BASE_CORE] },
]
export const CAMPUS_ROUTES: CampusRoute[] = BASE_ROUTES.map((route) => ({ id: route.id, points: route.points.map((point) => ({ x: point.x * CAMPUS_SCALE, z: point.z * CAMPUS_SCALE })) }))

const key = (point: CampusPoint) => `${point.x},${point.z}`
const inBounds = (point: CampusPoint) => point.x >= CAMPUS_BOUNDS.minX && point.x <= CAMPUS_BOUNDS.maxX && point.z >= CAMPUS_BOUNDS.minZ && point.z <= CAMPUS_BOUNDS.maxZ
const distance = (a: CampusPoint, b: CampusPoint) => Math.hypot(a.x - b.x, a.z - b.z)

function rasterizeSegment(from: CampusPoint, to: CampusPoint, width: number): Set<string> {
  const result = new Set<string>()
  const horizontal = from.z === to.z
  const start = horizontal ? Math.min(from.x, to.x) : Math.min(from.z, to.z)
  const end = horizontal ? Math.max(from.x, to.x) : Math.max(from.z, to.z)
  for (let cursor = start; cursor <= end; cursor += 1) {
    const center = horizontal ? { x: cursor, z: from.z } : { x: from.x, z: cursor }
    for (let offset = -Math.floor(width / 2); offset <= Math.floor(width / 2); offset += 1) {
      const cell = horizontal ? { x: center.x, z: center.z + offset } : { x: center.x + offset, z: center.z }
      if (inBounds(cell)) result.add(key(cell))
    }
  }
  return result
}

function routeCells(route: CampusRoute): Set<string> {
  const cells = new Set<string>()
  for (let index = 0; index < route.points.length - 1; index += 1) {
    for (const cell of rasterizeSegment(route.points[index], route.points[index + 1], CAMPUS_ROAD_WIDTH)) cells.add(cell)
  }
  return cells
}

const neighbors = (point: CampusPoint): CampusPoint[] => [
  { x: point.x + 1, z: point.z }, { x: point.x - 1, z: point.z },
  { x: point.x, z: point.z + 1 }, { x: point.x, z: point.z - 1 },
]

function findPath(start: CampusPoint, goal: CampusPoint, cells: Set<string>): CampusPoint[] | null {
  const open = [start]
  const cameFrom = new Map<string, CampusPoint>()
  const cost = new Map<string, number>([[key(start), 0]])
  const score = new Map<string, number>([[key(start), distance(start, goal)]])
  while (open.length > 0) {
    open.sort((a, b) => (score.get(key(a)) ?? Infinity) - (score.get(key(b)) ?? Infinity))
    const current = open.shift()!
    if (key(current) === key(goal)) {
      const path = [current]
      let cursor = current
      while (cameFrom.has(key(cursor))) { cursor = cameFrom.get(key(cursor))!; path.unshift(cursor) }
      return path
    }
    for (const next of neighbors(current)) {
      if (!cells.has(key(next))) continue
      const nextCost = (cost.get(key(current)) ?? Infinity) + 1
      if (nextCost >= (cost.get(key(next)) ?? Infinity)) continue
      cameFrom.set(key(next), current); cost.set(key(next), nextCost); score.set(key(next), nextCost + distance(next, goal))
      if (!open.some((item) => key(item) === key(next))) open.push(next)
    }
  }
  return null
}

function simplify(points: CampusPoint[]): CampusPoint[] {
  if (points.length < 3) return points
  const result = [points[0]]
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]; const current = points[index]; const next = points[index + 1]
    const sameX = previous.x === current.x && current.x === next.x
    const sameZ = previous.z === current.z && current.z === next.z
    if (!sameX && !sameZ) result.push(current)
  }
  result.push(points[points.length - 1])
  return result
}

function createPath(id: string, points: CampusPoint[]): NavigationPath {
  const cumulativeLengths = [0]
  for (let index = 1; index < points.length; index += 1) cumulativeLengths.push(cumulativeLengths[index - 1] + distance(points[index - 1], points[index]))
  return { id, points, cumulativeLengths, totalLength: cumulativeLengths[cumulativeLengths.length - 1] }
}

export function buildRoutePath(route: CampusRoute): NavigationPath | null {
  const cells = routeCells(route)
  const path = findPath(route.points[0], route.points[route.points.length - 1], cells)
  return path ? createPath(route.id, simplify(path)) : null
}

export function getWavePath(wave: number): NavigationPath {
  const route = CAMPUS_ROUTES[(Math.max(1, wave) - 1) % CAMPUS_ROUTES.length]
  const path = buildRoutePath(route)
  if (!path) throw new Error(`Campus route ${route.id} is not connected`)
  return path
}

export function pointAtDistance(path: NavigationPath, progress: number): CampusPoint {
  const target = Math.max(0, Math.min(progress, path.totalLength))
  for (let index = 1; index < path.cumulativeLengths.length; index += 1) {
    if (target > path.cumulativeLengths[index]) continue
    const from = path.points[index - 1]; const to = path.points[index]; const segment = path.cumulativeLengths[index] - path.cumulativeLengths[index - 1]
    const ratio = segment === 0 ? 0 : (target - path.cumulativeLengths[index - 1]) / segment
    return { x: from.x + (to.x - from.x) * ratio, z: from.z + (to.z - from.z) * ratio }
  }
  return path.points[path.points.length - 1]
}

export function isRoadsideBuildPoint(point: CampusPoint): boolean {
  if (!inBounds(point)) return false
  const roadsideMargin = CAMPUS_ROAD_WIDTH / 2 + 5
  return CAMPUS_ROUTES.some((route) => route.points.some((node, index) => {
    const next = route.points[index + 1]
    if (!next) return false
    const minX = Math.min(node.x, next.x) - roadsideMargin; const maxX = Math.max(node.x, next.x) + roadsideMargin
    const minZ = Math.min(node.z, next.z) - roadsideMargin; const maxZ = Math.max(node.z, next.z) + roadsideMargin
    return point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ
  }))
}

export function allCampusRoutesReachCore(): boolean {
  return CAMPUS_ROUTES.every((route) => {
    const points = buildRoutePath(route)?.points ?? []
    const last = points[points.length - 1]
    return last?.x === CAMPUS_CORE.x && last?.z === CAMPUS_CORE.z
  })
}
