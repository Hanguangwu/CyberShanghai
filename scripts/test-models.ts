import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three'
import { ENEMY_DATA, ENEMY_MODEL_FILES, FIELD_SIZE, MAP_HEIGHT_RATIO, MAP_MODEL_FILE, TOWER_DATA, TOWER_MODEL_FILES, type EnemyType, type TowerType } from '../src/game/data.ts'
import { instanceModel, normalizeModel } from '../src/game/models.ts'
import { glbSize } from './glbBounds.ts'

// GLTFLoader 对「glTF 中没有材质的 primitive」会注入 createDefaultMaterial()：
// 纯白 + metalness 1 + roughness 1 + 无贴图。pioche.glb 正是这种情况（materials: 0）。
const loaderPlaceholder = () => new MeshStandardMaterial({ color: 0xffffff, emissive: 0x000000, metalness: 1, roughness: 1 })
const countMaterial = (root: Group, predicate: (material: MeshStandardMaterial) => boolean) => {
  let count = 0
  root.traverse((node) => { if (node instanceof Mesh && node.material instanceof MeshStandardMaterial && predicate(node.material)) count += 1 })
  return count
}

// 1) 无材质网格的占位材质必须被兜底材质替换，否则会渲染成黑块/镜面球。
{
  const scene = new Group()
  const mesh = new Mesh(new BoxGeometry(1, 1, 1))
  mesh.material = loaderPlaceholder()
  scene.add(mesh)
  const root = normalizeModel(scene, '#b9d2e0', 2.4)
  assert.equal(countMaterial(root, (material) => material.metalness === 0.25), 1, 'placeholder material must be replaced')
  assert.equal(countMaterial(root, (material) => material.metalness === 1), 0, 'placeholder material must not survive')
}

// 2) 带 baseColor 贴图的 pbr 材质必须原样保留（“模型没有颜色”的元凶之一就是整体覆盖材质）。
{
  const scene = new Group()
  const mesh = new Mesh(new BoxGeometry(1, 1, 1))
  const pbr = new MeshStandardMaterial({ color: 0xff8844, metalness: 0.9, roughness: 0.4 })
  pbr.map = new Texture()
  mesh.material = pbr
  scene.add(mesh)
  const root = normalizeModel(scene, '#ffffff', 1)
  assert.equal(countMaterial(root, (material) => material === pbr), 1, 'textured pbr material must be preserved untouched')
}

// 3) “shaded”导出的材质（纯黑基础色 + 自发光贴图）也必须保留，颜色完全靠 emissive 通道呈现。
{
  const scene = new Group()
  const mesh = new Mesh(new BoxGeometry(1, 1, 1))
  const shaded = new MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, metalness: 0, roughness: 1 })
  shaded.emissiveMap = new Texture()
  mesh.material = shaded
  scene.add(mesh)
  const root = normalizeModel(scene, '#ffffff', 1)
  assert.equal(countMaterial(root, (material) => material === shaded), 1, 'emissive-driven shaded material must be preserved')
}

// 4) 归一化：外层 root 留在原点（调用方才好设置塔位坐标），高度对齐、底面贴地。
{
  const scene = new Group()
  scene.add(new Mesh(new BoxGeometry(1, 1, 1)))
  const root = normalizeModel(scene, '#ffffff', 2.4)
  assert.deepEqual(root.position.toArray(), [0, 0, 0], 'root must stay at the origin so callers can position it')
  const box = new Box3().setFromObject(root)
  const size = new Vector3()
  box.getSize(size)
  assert.ok(Math.abs(size.y - 2.4) < 1e-6, `normalized height should be 2.4, got ${size.y}`)
  assert.ok(Math.abs(box.min.y) < 1e-6, `model must sit on y=0, got ${box.min.y}`)
}

// 5) 位置可自由设置：确认塔位偏移不会被内部归一化位移吃掉（旧实现会覆盖）。
{
  const scene = new Group()
  scene.add(new Mesh(new BoxGeometry(1, 1, 1)))
  const root = normalizeModel(scene, '#ffffff', 1)
  root.position.set(2, 0, 2)
  const box = new Box3().setFromObject(root)
  const center = new Vector3()
  box.getCenter(center)
  assert.ok(Math.abs(center.x - 2) < 1e-6 && Math.abs(center.z - 2) < 1e-6, `tower position must be respected, got ${center.x},${center.z}`)
}

// 6) 实例化缩放。
{
  const scene = new Group()
  scene.add(new Mesh(new BoxGeometry(1, 1, 1)))
  const scaled = instanceModel(normalizeModel(scene, '#ffffff', 1), 2)
  const box = new Box3().setFromObject(scaled)
  const size = new Vector3()
  box.getSize(size)
  assert.ok(Math.abs(size.y - 2) < 1e-6, `instanceModel scale should double the height, got ${size.y}`)
}

// 7) 六种防御塔必须各自绑定一个真实存在、且互不重复的模型文件（不再共用模拟塔变体）。
{
  const types = Object.keys(TOWER_DATA) as TowerType[]
  const files = types.map((type) => TOWER_MODEL_FILES[type])
  assert.equal(types.length, 6, 'there must be six tower types')
  assert.equal(new Set(files).size, types.length, 'each tower type must use a distinct model file')
  for (const file of files) assert.ok(existsSync(join('public/models', file)), `${file} must exist in public/models`)
}

// 8) 两种敌人 + Boss 各自绑定一个真实存在的模型文件，且互不重复。
{
  const types = Object.keys(ENEMY_DATA) as EnemyType[]
  const files = types.map((type) => ENEMY_MODEL_FILES[type])
  assert.equal(types.length, 3, 'there must be three enemy types (two units + boss)')
  assert.equal(new Set(files).size, types.length, 'each enemy type must use a distinct model file')
  for (const file of files) assert.ok(existsSync(join('public/models', file)), `${file} must exist in public/models`)
}

// 9) 地图必须真的盖得住战场 —— “地图不够大”那个 bug 的回归守卫。
//    这里解析 mapv0_pbr.glb 的真实包围盒，套用与 fitMapToField 相同的「装填制」等比缩放，
//    再断言敌径(x 从 -8 到 8)与塔位边界(|z| = 6)都落在地图范围内。
//    模型在 Blender 里重新导出导致尺寸/长宽比变化时，这条会直接失败并打印实际数字。
{
  const raw = glbSize(join('public/models', MAP_MODEL_FILE))
  const scale = Math.min(FIELD_SIZE.x / raw.x, FIELD_SIZE.z / raw.z)
  const width = raw.x * scale
  const depth = raw.z * scale
  assert.ok(width / 2 >= 8, `地图放大后半宽 ${(width / 2).toFixed(2)} 必须覆盖敌径终点 x=8`)
  assert.ok(depth / 2 >= 6, `地图放大后半深 ${(depth / 2).toFixed(2)} 必须覆盖塔位边界 z=6`)
  assert.ok(width <= FIELD_SIZE.x + 1e-6 && depth <= FIELD_SIZE.z + 1e-6, '装填制缩放不应超出 FIELD_SIZE')
  const peak = raw.y * scale * MAP_HEIGHT_RATIO
  assert.ok(peak < 2, `压扁后地图最高点 ${peak.toFixed(2)} 必须低于 2 单位高的炮塔，否则会遮挡战场`)
}

console.log('models: all assertions passed')