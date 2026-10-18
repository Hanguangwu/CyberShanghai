import { Box3, Group, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { normalizeModel } from './models.ts'
import { CAMPUS_ROAD_WIDTH, CAMPUS_ROUTES, type CampusPoint } from './campusMap.ts'

export type CampusModuleSpec = { file: string; x: number; z: number; rotationY?: number; height: number; blocksRoad?: boolean }

// Gameplay orientation: +X is west, +Z is south. Therefore the viewport reads
// north at the top, south at the bottom, east on the left and west on the right.
// The supplied GLBs are authored backwards relative to this view. Buildings in the
// north/south campus rows are flipped 180 degrees from the previous layout; East Gate
// remains a directional gate with a 90-degree CCW turn.
// The western data-center model is not in the supplied assets yet, so that location is reserved by campusDecoration.
export const CAMPUS_MODULE_LAYOUT: CampusModuleSpec[] = [
  { file: '01_east_gate.glb', x: 52, z: 0, rotationY: Math.PI / 2, height: 4.8, blocksRoad: false },
  { file: '02_teaching_center.glb', x: 10, z: 32, rotationY: 0, height: 5.8 },
  { file: '03_library.glb', x: 30, z: 32, rotationY: 0, height: 6.2 },
  { file: '04_student_dormitory.glb', x: 0, z: 12, rotationY: 0, height: 7.8 },
  { file: '05_stadium.glb', x: 42, z: 30, rotationY: 0, height: 5.2 },
  { file: '06_dining_hall.glb', x: 24, z: 12, rotationY: 0, height: 6.8 },
  { file: '07_campus_main_avenue.glb', x: 0, z: 0, rotationY: Math.PI, height: 3.2, blocksRoad: false },
  { file: '08_physical_science.glb', x: -24, z: -10, rotationY: 0, height: 6.8 },
  { file: '09_life_science.glb', x: -20, z: -30, rotationY: 0, height: 6.4 },
  { file: '10_information_science.glb', x: 0, z: -10, rotationY: 0, height: 7.1 },
  { file: '11_biomedical_engineering.glb', x: 28, z: -10, rotationY: 0, height: 6.8 },
  { file: '12_entrepreneurship_management.glb', x: 0, z: 18, rotationY: 0, height: 6.8 },
  { file: '13_creativity_art.glb', x: -32, z: 10, rotationY: 0, height: 6.5 },
  { file: '14_y_building.glb', x: -30, z: 24, rotationY: 0, height: 7.2 },
  { file: '15_conference_center.glb', x: 28, z: -30, rotationY: 0, height: 6.4 },
  { file: '16_glass_gallery.glb', x: 30, z: 22, rotationY: 0, height: 6.4 },
  { file: '17_library_information_center.glb', x: 12, z: -10, rotationY: 0, height: 6.2 },
]

let cache: Promise<Group> | null = null

export function loadCampusModules(): Promise<Group> {
  if (!cache) cache = load()
  return cache
}

async function load(): Promise<Group> {
  const loader = new GLTFLoader()
  const campus = new Group()
  let avenueTemplate: Group | null = null
  for (const spec of CAMPUS_MODULE_LAYOUT) {
    const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}campus_map/${spec.file}`)
    const module = normalizeModel(gltf.scene, '#526b8a', spec.height)
    if (spec.file === '07_campus_main_avenue.glb') {
      avenueTemplate = module
      continue
    }
    module.position.set(spec.x, 0, spec.z)
    module.rotation.y = spec.rotationY ?? 0
    campus.add(module)
    // Yield after each building so the render loop and input remain responsive while the campus streams in.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
  }
  if (avenueTemplate) campus.add(createRoadSurface(avenueTemplate))
  return campus
}

function createRoadSurface(template: Group): Group {
  const surface = new Group()
  const sourceSize = new Vector3()
  new Box3().setFromObject(template).getSize(sourceSize)
  const seen = new Set<string>()
  for (const route of CAMPUS_ROUTES) {
    for (let index = 0; index < route.points.length - 1; index += 1) {
      const from = route.points[index]
      const to = route.points[index + 1]
      const segmentKey = [pointKey(from), pointKey(to)].sort().join('|')
      if (seen.has(segmentKey)) continue
      seen.add(segmentKey)
      addRoadTiles(surface, template, sourceSize, from, to)
    }
  }
  return surface
}

function addRoadTiles(surface: Group, template: Group, sourceSize: Vector3, from: CampusPoint, to: CampusPoint): void {
  const horizontal = from.z === to.z
  const length = horizontal ? Math.abs(to.x - from.x) : Math.abs(to.z - from.z)
  const direction = horizontal ? Math.sign(to.x - from.x) : Math.sign(to.z - from.z)
  const tileLength = Math.max(1, Math.min(sourceSize.x, 12))
  const tileCount = Math.max(1, Math.ceil(length / tileLength))
  for (let index = 0; index < tileCount; index += 1) {
    const start = index * length / tileCount
    const end = (index + 1) * length / tileCount
    const centerDistance = (start + end) / 2
    const tile = template.clone(true)
    tile.scale.set((end - start) / sourceSize.x, 1, CAMPUS_ROAD_WIDTH / sourceSize.z)
    tile.rotation.y = horizontal ? (direction < 0 ? Math.PI : 0) : direction < 0 ? -Math.PI / 2 : Math.PI / 2
    tile.position.set(
      horizontal ? from.x + direction * centerDistance : from.x,
      0,
      horizontal ? from.z : from.z + direction * centerDistance,
    )
    surface.add(tile)
  }
}

function pointKey(point: CampusPoint): string {
  return `${point.x},${point.z}`
}
