import { Box3, Color, Group, Material, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ENEMY_MODEL_FILES, FIELD_SIZE, MAP_HEIGHT_RATIO, MAP_MODEL_FILE, TOWER_DATA, TOWER_MODEL_FILES, type EnemyType, type TowerType } from './data.ts'

/** 地图：外层 root 留在原点，width/depth 是缩放后的实际占地，供地面/网格对齐。 */
export type FittedMap = { group: Group; width: number; depth: number }
export type GameModels = { tower: Record<TowerType, Group>; enemy: Record<EnemyType, Group>; centerTower: Group; map: FittedMap }

const TOWER_HEIGHT = 3.2
const CENTER_TOWER_HEIGHT = 3.8
// 三种敌人各自的成品高度：工蜂虫低矮、巡逻机器人齐人高、鲸鱼 Boss 明显压场。
const ENEMY_HEIGHTS: Record<EnemyType, number> = { beetle: 1.2, robot: 2, boss: 3.4 }
const CENTER_TOWER_FILE = 'pioche.glb'
const ENEMY_TINTS: Partial<Record<EnemyType, string>> = { boss: '#f3ca58' }
const assetUrl = (folder: string, file: string) => `${import.meta.env.BASE_URL}${folder}/${file}`
let cache: Promise<GameModels> | null = null

export function loadGameModels(): Promise<GameModels> {
  if (!cache) cache = load()
  return cache
}

async function load(): Promise<GameModels> {
  const loader = new GLTFLoader()
  const towerEntries = Object.entries(TOWER_MODEL_FILES) as [TowerType, string][]
  const enemyEntries = Object.entries(ENEMY_MODEL_FILES) as [EnemyType, string][]
  const [towerScenes, enemyScenes, centerGltf, mapGltf] = await Promise.all([
    Promise.all(towerEntries.map(([, file]) => loader.loadAsync(assetUrl('models', file)))),
    Promise.all(enemyEntries.map(([, file]) => loader.loadAsync(assetUrl('models', file)))),
    loader.loadAsync(assetUrl('models', CENTER_TOWER_FILE)),
    loader.loadAsync(assetUrl('models', MAP_MODEL_FILE)),
  ])
  const tower = {} as Record<TowerType, Group>
  // 兜底色用塔自身的主题色：万一某个模型缺材质，也不会退化成黑白。
  towerEntries.forEach(([type], index) => { tower[type] = normalizeModel(towerScenes[index].scene, TOWER_DATA[type].color, TOWER_HEIGHT) })
  const enemy = {} as Record<EnemyType, Group>
  enemyEntries.forEach(([type], index) => { enemy[type] = normalizeModel(enemyScenes[index].scene, '#c8722f', ENEMY_HEIGHTS[type]) })
  return {
    tower,
    enemy,
    centerTower: normalizeModel(centerGltf.scene, '#b9d2e0', CENTER_TOWER_HEIGHT),
    map: fitMapToField(mapGltf.scene, FIELD_SIZE, MAP_HEIGHT_RATIO),
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

/**
 * 把地图模型「装填」进战场基准区域。
 *
 * 缩放倍率直接由实测包围盒推导（等比取较小者），所以模型在 Blender 里重新导出、尺寸变了也不用改任何数字：
 * 代码只关心「它要盖住 FIELD_SIZE」，不关心它原始是多大。等比保证不变形。
 *
 * heightRatio 单独压 Y：地图等比放大后楼体会高过炮塔，压扁后既保留城市层次又不遮挡战场。
 * 和 normalizeModel 一样，位移写在内部 pivot 上，外层 root 留在原点，调用方可以自由摆放。
 */
export function fitMapToField(source: Object3D, field: { x: number; z: number }, heightRatio: number): FittedMap {
  const raw = new Box3().setFromObject(source)
  const rawSize = new Vector3()
  raw.getSize(rawSize)
  const scale = Math.min(field.x / rawSize.x, field.z / rawSize.z)
  const pivot = new Group()
  pivot.add(source)
  pivot.scale.set(scale, scale * heightRatio, scale)
  const fitted = new Box3().setFromObject(pivot)
  const center = new Vector3()
  fitted.getCenter(center)
  pivot.position.set(-center.x, -fitted.min.y, -center.z)
  const root = new Group()
  root.add(pivot)
  return { group: root, width: rawSize.x * scale, depth: rawSize.z * scale }
}

export function instanceModel(model: Group, scale = 1): Group {
  const clone = model.clone(true); if (scale !== 1) clone.scale.multiplyScalar(scale); return clone
}

export function towerModelFor(models: GameModels, type: TowerType): Group {
  return models.tower[type]
}

/** 敌人生成：旋转 90° 让模型长轴朝向行进方向（+X），Boss 额外叠一层金色自发光便于辨认。 */
export function createEnemy(models: GameModels, type: EnemyType): Group {
  const clone = instanceModel(models.enemy[type]); clone.rotation.y = Math.PI / 2
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
