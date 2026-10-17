import assert from 'node:assert/strict'
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three'
import { instanceModel, normalizeModel } from '../src/game/models.ts'

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

console.log('models: all assertions passed')
