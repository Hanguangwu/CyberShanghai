import { Box3, Color, Group, Material, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { EnemyType, TowerType } from './data'

export type GameModels = { towerVariants: Group[]; boar: Group; centerTower: Group }

const TOWER_HEIGHT = 2
const CENTER_TOWER_HEIGHT = 2.4
const BOAR_HEIGHT = 0.9
const BOSS_SCALE = 1.6
const TOWER_FILES = ['flametower_pbr.glb', 'flametower_shaded.glb', 'plantstower_pbr.glb', 'plantstower_shaded.glb']
const CENTER_TOWER_FILE = 'pioche.glb'
const ENEMY_TINTS: Partial<Record<EnemyType, string>> = { boss: '#f3ca58', repair: '#6ee58f' }
let cache: Promise<GameModels> | null = null

export function loadGameModels(): Promise<GameModels> {
  if (!cache) cache = load()
  return cache
}

async function load(): Promise<GameModels> {
  const loader = new GLTFLoader()
  const [towerScenes, boarGltf, centerGltf] = await Promise.all([
    Promise.all(TOWER_FILES.map((file) => loader.loadAsync(`models/${file}`))),
    loader.loadAsync('models/patrol-robot.glb'),
    loader.loadAsync(`models/${CENTER_TOWER_FILE}`),
  ])
  const towerVariants = towerScenes.map((gltf) => normalizeModel(gltf.scene, '#cfe4ef', TOWER_HEIGHT))
  return {
    towerVariants,
    boar: normalizeModel(boarGltf.scene, '#c8722f', BOAR_HEIGHT),
    centerTower: normalizeModel(centerGltf.scene, '#b9d2e0', CENTER_TOWER_HEIGHT),
  }
}

/**
 * 归一化模型：高度对齐目标值、底面贴地、水平居中。
 *
 * 关键点是**绝不整体替换 GLB 自带材质**——那样会丢掉 Blender 里的配色，
 * 也正是“模型在 Blender 有颜色、在 Three.js 没有颜色”的直接原因。
 * 唯一需要干预的是「glTF 中没有任何材质的网格」：GLTFLoader 会塞一个
 * `createDefaultMaterial()`（纯白 + metalness 1 + roughness 1）的占位材质，
 * 没有环境反射时看起来就是一个黑块/镜面球。此时才换成可读的兜底材质。
 *
 * 位移写在内部 pivot 上，外层 root 留在原点，
 * 这样调用方可以自由 `root.position.set(...)`（旧实现把位移写在外层，会被覆盖，模型因此偏离塔位）。
 */
export function normalizeModel(source: Object3D, fallbackColor: string, targetHeight: number): Group {
  source.traverse((node) => {
    if (!(node instanceof Mesh)) return
    const material = node.material
    if (Array.isArray(material)) {
      node.material = material.map((item) => (isLoaderPlaceholder(item) ? createFallbackMaterial(fallbackColor) : item))
    } else if (!material || isLoaderPlaceholder(material)) {
      node.material = createFallbackMaterial(fallbackColor)
    }
  })
  return groundAndScale(source, targetHeight)
}

const createFallbackMaterial = (color: string) => new MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.5 })

/**
 * 识别 GLTFLoader 为「没有材质的 primitive」生成的占位材质（GLTFLoader.createDefaultMaterial）：
 * 无任何贴图 + 纯白基础色 + 黑色自发光 + metalness 1 / roughness 1。
 */
function isLoaderPlaceholder(material: Material): boolean {
  if (!(material instanceof MeshStandardMaterial)) return false
  const textured = material.map || material.emissiveMap || material.metalnessMap || material.roughnessMap
    || material.normalMap || material.aoMap || material.bumpMap || material.displacementMap || material.alphaMap
  return !textured
    && material.metalness === 1
    && material.roughness === 1
    && material.color.getHex() === 0xffffff
    && material.emissive.getHex() === 0x000000
}

function groundAndScale(source: Object3D, targetHeight: number): Group {
  const pivot = new Group()
  pivot.add(source)
  const size = new Vector3()
  new Box3().setFromObject(pivot).getSize(size)
  pivot.scale.setScalar(size.y > 0 ? targetHeight / size.y : 1)
  const scaled = new Box3().setFromObject(pivot)
  const center = new Vector3()
  scaled.getCenter(center)
  pivot.position.set(-center.x, -scaled.min.y, -center.z)
  const root = new Group()
  root.add(pivot)
  return root
}

export function instanceModel(model: Group, scale = 1): Group {
  const clone = model.clone(true); if (scale !== 1) clone.scale.multiplyScalar(scale); return clone
}

export function towerModelFor(models: GameModels, type: TowerType): Group {
  const index: Record<TowerType, number> = { pulse: 0, chain: 1, frost: 2, rail: 3, poison: 2, emp: 1 }
  return models.towerVariants[index[type] % models.towerVariants.length]
}

export function createBoar(model: Group, type: EnemyType): Group {
  const clone = instanceModel(model, type === 'boss' ? BOSS_SCALE : 1); clone.rotation.y = Math.PI / 2
  const tint = ENEMY_TINTS[type]
  if (tint) clone.traverse((node) => { if (node instanceof Mesh) node.material = tintedMaterial(node.material, tint) })
  return clone
}

const tintCache = new Map<string, Material | Material[]>()
function tintedMaterial(base: Material | Material[], tint: string): Material | Material[] {
  const key = Array.isArray(base) ? `${tint}:${base.map((item) => item.uuid).join(',')}` : `${tint}:${base.uuid}`
  const cached = tintCache.get(key); if (cached) return cached
  // 保留原材质的贴图与基础色，只叠加一层自发光色调，避免覆盖掉 Blender 中的配色。
  const make = (material: Material): Material => { const clone = material.clone() as MeshStandardMaterial; if (clone.emissive) { clone.emissive = new Color(tint); clone.emissiveIntensity = 0.9 }; return clone }
  const result = Array.isArray(base) ? base.map(make) : make(base); tintCache.set(key, result); return result
}
