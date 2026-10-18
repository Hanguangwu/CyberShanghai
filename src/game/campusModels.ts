import { Group } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { normalizeModel } from './models.ts'

export type CampusModuleSpec = { file: string; x: number; z: number; rotationY?: number; height: number }

// Layout is expressed in the 120x100 gameplay coordinate system. The western data-center
// model is not in the supplied assets yet, so that location is reserved by campusDecoration.
export const CAMPUS_MODULE_LAYOUT: CampusModuleSpec[] = [
  { file: '01_east_gate.glb', x: 52, z: 0, height: 4.8 },
  { file: '02_teaching_center.glb', x: 10, z: -32, height: 5.8 },
  { file: '03_library.glb', x: 30, z: -32, height: 6.2 },
  { file: '04_student_dormitory.glb', x: 30, z: -12, height: 7.8 },
  { file: '05_stadium.glb', x: 42, z: -30, height: 5.2 },
  { file: '06_dining_hall.glb', x: 44, z: -12, height: 6.8 },
  { file: '07_campus_main_avenue.glb', x: 0, z: 0, height: 3.2 },
  { file: '08_physical_science.glb', x: -20, z: 10, height: 6.8 },
  { file: '09_life_science.glb', x: -28, z: 30, height: 6.4 },
  { file: '10_information_science.glb', x: 8, z: 10, height: 7.1 },
  { file: '11_biomedical_engineering.glb', x: 28, z: 10, height: 6.8 },
  { file: '12_entrepreneurship_management.glb', x: 0, z: -18, height: 6.8 },
  { file: '13_creativity_art.glb', x: -32, z: -6, height: 6.5 },
  { file: '14_y_building.glb', x: -30, z: -24, height: 7.2 },
  { file: '15_conference_center.glb', x: 20, z: 30, height: 6.4 },
  { file: '16_glass_gallery.glb', x: 30, z: -22, height: 6.4 },
  { file: '17_library_information_center.glb', x: -12, z: 18, height: 6.2 },
]

let cache: Promise<Group> | null = null

export function loadCampusModules(): Promise<Group> {
  if (!cache) cache = load()
  return cache
}

async function load(): Promise<Group> {
  const loader = new GLTFLoader()
  const campus = new Group()
  for (const spec of CAMPUS_MODULE_LAYOUT) {
    const gltf = await loader.loadAsync(`campus_map/${spec.file}`)
    const module = normalizeModel(gltf.scene, '#526b8a', spec.height)
    module.position.set(spec.x, 0, spec.z)
    module.rotation.y = spec.rotationY ?? 0
    campus.add(module)
    // Yield after each building so the render loop and input remain responsive while the campus streams in.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
  }
  return campus
}
