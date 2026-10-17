import { readFileSync } from 'node:fs'

/**
 * 读取 GLB 的真实世界包围盒（用于测试里守卫“模型尺寸变了代码还能不能盖住战场”）。
 *
 * 只依赖 glTF 的 accessor.min/max + 节点 TRS，不解析顶点数据、不加载贴图，
 * 所以在 node 里跑得动（GLTFLoader 需要 DOM/fetch，测试里用不了）。
 * 返回值单位与模型文件一致（Blender 导出的“米”）。
 */
export type GlbSize = { x: number; y: number; z: number; minY: number; triangles: number }

type Vec3 = [number, number, number]
type Mat4 = number[]

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out: number[] = new Array(16)
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3]
    }
  }
  return out
}

function fromTRS(translation: Vec3 = [0, 0, 0], rotation: [number, number, number, number] = [0, 0, 0, 1], scale: Vec3 = [1, 1, 1]): Mat4 {
  const [x, y, z, w] = rotation
  const x2 = x + x, y2 = y + y, z2 = z + z
  const xx = x * x2, xy = x * y2, xz = x * z2
  const yy = y * y2, yz = y * z2, zz = z * z2
  const wx = w * x2, wy = w * y2, wz = w * z2
  return [
    (1 - (yy + zz)) * scale[0], (xy + wz) * scale[0], (xz - wy) * scale[0], 0,
    (xy - wz) * scale[1], (1 - (xx + zz)) * scale[1], (yz + wx) * scale[1], 0,
    (xz + wy) * scale[2], (yz - wx) * scale[2], (1 - (xx + yy)) * scale[2], 0,
    translation[0], translation[1], translation[2], 1,
  ]
}

const transformPoint = (m: Mat4, p: Vec3): Vec3 => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
]

type GltfNode = { matrix?: Mat4; translation?: Vec3; rotation?: [number, number, number, number]; scale?: Vec3; mesh?: number; children?: number[] }
type GltfDocument = {
  nodes?: GltfNode[]
  meshes?: { primitives?: { attributes?: { POSITION?: number }; indices?: number }[] }[]
  accessors?: { min?: number[]; max?: number[]; count?: number }[]
  scenes?: { nodes?: number[] }[]
  scene?: number
}

function readJsonChunk(buffer: Buffer): GltfDocument {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB file')
  let offset = 12
  while (offset + 8 <= buffer.byteLength) {
    const length = view.getUint32(offset, true)
    const type = view.getUint32(offset + 4, true)
    if (type === 0x4e4f534a) return JSON.parse(new TextDecoder().decode(buffer.subarray(offset + 8, offset + 8 + length))) as GltfDocument
    offset += 8 + length
  }
  throw new Error('GLB has no JSON chunk')
}

export function glbSize(filePath: string): GlbSize {
  const json = readJsonChunk(readFileSync(filePath))
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  let triangles = 0

  const visit = (nodeIndex: number, parent: Mat4) => {
    const node = json.nodes?.[nodeIndex] ?? {}
    const local = node.matrix ?? fromTRS(node.translation, node.rotation, node.scale)
    const world = multiply(parent, local)
    if (node.mesh !== undefined) {
      for (const primitive of json.meshes?.[node.mesh]?.primitives ?? []) {
        const accessor = json.accessors?.[primitive.attributes?.POSITION ?? -1]
        if (!accessor?.min || !accessor?.max) continue
        if (primitive.indices !== undefined) triangles += Math.floor((json.accessors?.[primitive.indices]?.count ?? 0) / 3)
        for (const x of [accessor.min[0], accessor.max[0]]) {
          for (const y of [accessor.min[1], accessor.max[1]]) {
            for (const z of [accessor.min[2], accessor.max[2]]) {
              const point = transformPoint(world, [x, y, z])
              for (let axis = 0; axis < 3; axis += 1) {
                if (point[axis] < min[axis]) min[axis] = point[axis]
                if (point[axis] > max[axis]) max[axis] = point[axis]
              }
            }
          }
        }
      }
    }
    for (const child of node.children ?? []) visit(child, world)
  }

  const roots = json.scenes?.[json.scene ?? 0]?.nodes ?? json.nodes?.map((_, index) => index) ?? []
  for (const root of roots) visit(root, IDENTITY)
  return { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2], minY: min[1], triangles }
}
