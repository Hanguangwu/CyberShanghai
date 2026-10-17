import * as THREE from 'three'
import { CAMPUS_BOUNDS, CAMPUS_ROAD_WIDTH, CAMPUS_ROUTES, isRoadsideBuildPoint } from './campusMap.ts'

const seeded = (seed: number) => {
  let value = seed >>> 0
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 0x100000000 }
}

function roadSegment(from: { x: number; z: number }, to: { x: number; z: number }): THREE.Mesh {
  const horizontal = from.z === to.z
  const length = horizontal ? Math.abs(to.x - from.x) : Math.abs(to.z - from.z)
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? length : CAMPUS_ROAD_WIDTH, 0.08, horizontal ? CAMPUS_ROAD_WIDTH : length), new THREE.MeshStandardMaterial({ color: '#202b3c', roughness: 0.9, emissive: '#09121d', emissiveIntensity: 0.5 }))
  mesh.position.set((from.x + to.x) / 2, 0.05, (from.z + to.z) / 2)
  return mesh
}

function campusBuilding(x: number, z: number, width: number, depth: number, height: number, color: string): THREE.Group {
  const building = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.12 }))
  body.position.y = height / 2
  building.add(body)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, 0.35, depth + 0.8), new THREE.MeshStandardMaterial({ color: '#263b56', roughness: 0.55, emissive: '#10243b', emissiveIntensity: 0.45 }))
  roof.position.y = height + 0.18
  building.add(roof)
  const windowMaterial = new THREE.MeshStandardMaterial({ color: '#75e5f2', emissive: '#1aa6bc', emissiveIntensity: 1.5, metalness: 0.2, roughness: 0.3 })
  const columns = Math.max(2, Math.floor(width / 2.5))
  for (let index = 0; index < columns; index += 1) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.06), windowMaterial)
    window.position.set(-width / 2 + 1.2 + index * ((width - 2.4) / Math.max(1, columns - 1)), height * 0.62, depth / 2 + 0.04)
    building.add(window)
  }
  building.position.set(x, 0, z)
  return building
}

export function createCampusDecoration(): THREE.Group {
  const group = new THREE.Group()
  for (const route of CAMPUS_ROUTES) for (let index = 0; index < route.points.length - 1; index += 1) group.add(roadSegment(route.points[index], route.points[index + 1]))

  // Buildings are deliberately generated outside the navigation graph: the graph owns walkable roads,
  // while this layer provides readable campus massing without letting an imported GLB occlude gameplay.
  group.add(
    campusBuilding(-28, 12, 9, 7, 5.5, '#4d6285'),
    campusBuilding(-14, -26, 11, 6, 4.2, '#536b8c'),
    campusBuilding(10, 30, 13, 8, 6.5, '#455c80'),
    campusBuilding(28, -18, 8, 12, 5, '#5e6f8b'),
    campusBuilding(18, 8, 7, 7, 3.5, '#687b98'),
    campusBuilding(-34, 34, 10, 6, 4.8, '#3f587c'),
  )

  const random = seeded(20261017)
  const treeCount = 180
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 6), new THREE.MeshStandardMaterial({ color: '#5b3c32' }), treeCount)
  const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 1.8, 8), new THREE.MeshStandardMaterial({ color: '#1d9a78', roughness: 0.85 }), treeCount)
  const transform = new THREE.Object3D()
  let placed = 0
  while (placed < treeCount) {
    const point = { x: CAMPUS_BOUNDS.minX + random() * (CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX), z: CAMPUS_BOUNDS.minZ + random() * (CAMPUS_BOUNDS.maxZ - CAMPUS_BOUNDS.minZ) }
    if (isRoadsideBuildPoint(point)) continue
    const scale = 0.7 + random() * 0.6
    transform.position.set(point.x, 0.55 * scale, point.z); transform.scale.setScalar(scale); transform.updateMatrix()
    trunk.setMatrixAt(placed, transform.matrix)
    transform.position.y = 1.65 * scale; transform.updateMatrix(); crown.setMatrixAt(placed, transform.matrix)
    placed += 1
  }
  trunk.instanceMatrix.needsUpdate = true; crown.instanceMatrix.needsUpdate = true
  group.add(trunk, crown)
  return group
}
