import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { TOWER_DATA, type TowerType } from './game/data'
import { LEVELS } from './game/levels'
import { MusicController } from './game/music'
import { type MoatModuleType } from './game/pathfinding'
import { useGameStore } from './gameStore'

function App() {
  const mountRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<THREE.Group | null>(null)
  const [notice, setNotice] = useState('')
  const [musicOn, setMusicOn] = useState(false)
  const musicRef = useRef<MusicController | null>(null)
  const state = useGameStore()
  const { levelId, levelComplete, credits, core, wave, running, paused, speed, selectedTower, selectedModule, buildMode, selectedId, towers, modules, enemies, shots } = state
  const level = LEVELS[levelId]

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene(); scene.background = new THREE.Color(level.skyColor)
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(9, 12, 13); camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.setSize(mount.clientWidth, mount.clientHeight); mount.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight('#bcefff', '#081018', 2.2))
    const keyLight = new THREE.DirectionalLight('#ff4ca0', 3); keyLight.position.set(-5, 10, 5); scene.add(keyLight)
    const world = new THREE.Group(); worldRef.current = world; scene.add(world)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), new THREE.MeshStandardMaterial({ color: '#0b2430', roughness: 0.92 })); ground.rotation.x = -Math.PI / 2; world.add(ground)
    const grid = new THREE.GridHelper(22, 22, '#1a8290', '#123b4a'); grid.position.y = 0.015; world.add(grid)
    const river = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 18), new THREE.MeshStandardMaterial({ color: '#125b76', emissive: '#062d42', emissiveIntensity: 1.4 })); river.position.set(-3, 0.06, 0); world.add(river)
    const road = new THREE.Mesh(new THREE.BoxGeometry(18, 0.09, 2.2), new THREE.MeshStandardMaterial({ color: '#25283c', emissive: '#161a2b', emissiveIntensity: 0.5 })); road.position.set(1.2, 0.08, 0); world.add(road)
    for (let x = -8; x <= 8; x += 2) { const lane = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.05), new THREE.MeshBasicMaterial({ color: '#f3ca58' })); lane.position.set(x + 1.2, 0.14, 0); world.add(lane) }
    for (let i = 0; i < 18; i += 1) { const h = 0.8 + (i * 7 % 11) / 5; const building = new THREE.Mesh(new THREE.BoxGeometry(0.8 + (i % 3) * 0.3, h, 0.8 + (i % 2) * 0.25), new THREE.MeshStandardMaterial({ color: i % 2 ? '#182a47' : '#26314f', emissive: i % 3 ? '#091f38' : '#3b1550', emissiveIntensity: 1.2 })); building.position.set(4 + (i % 6) * 1.3, h / 2, -6 + Math.floor(i / 6) * 3.8); world.add(building) }
    const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 1.1, 6), new THREE.MeshStandardMaterial({ color: '#ff4ca0', emissive: '#c32374', emissiveIntensity: 2 })); coreMesh.position.set(7, 0.6, 0); world.add(coreMesh)
    const dynamic = new THREE.Group(); world.add(dynamic); world.userData.dynamic = dynamic
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let dragging = false; let lastX = 0; let lastY = 0
    const onPointerDown = (event: PointerEvent) => { dragging = true; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId) }
    const onPointerMove = (event: PointerEvent) => { if (!dragging) return; camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (event.clientX - lastX) * 0.008); camera.position.y = Math.max(5, Math.min(22, camera.position.y + (event.clientY - lastY) * 0.04)); camera.lookAt(0, 0, 0); lastX = event.clientX; lastY = event.clientY }
    const onPointerUp = (event: PointerEvent) => { dragging = false; renderer.domElement.releasePointerCapture(event.pointerId) }
    const onWheel = (event: WheelEvent) => { event.preventDefault(); camera.position.multiplyScalar(event.deltaY > 0 ? 1.06 : 0.94); camera.position.clampLength(7, 28); camera.lookAt(0, 0, 0) }
    const onClick = (event: MouseEvent) => { if (Math.abs(event.clientX - lastX) > 4) return; const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObject(ground)[0]; if (hit) state.buildAt(Math.round(hit.point.x), Math.round(hit.point.z)) }
    renderer.domElement.addEventListener('pointerdown', onPointerDown); renderer.domElement.addEventListener('pointermove', onPointerMove); renderer.domElement.addEventListener('pointerup', onPointerUp); renderer.domElement.addEventListener('wheel', onWheel, { passive: false }); renderer.domElement.addEventListener('click', onClick)
    const resize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight) }; window.addEventListener('resize', resize)
    let frame = 0; const animate = () => { frame = requestAnimationFrame(animate); coreMesh.rotation.y += 0.008; renderer.render(scene, camera) }; animate()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); renderer.domElement.removeEventListener('pointerdown', onPointerDown); renderer.domElement.removeEventListener('pointermove', onPointerMove); renderer.domElement.removeEventListener('pointerup', onPointerUp); renderer.domElement.removeEventListener('wheel', onWheel); renderer.domElement.removeEventListener('click', onClick); renderer.dispose(); mount.removeChild(renderer.domElement); worldRef.current = null }
  }, [level.skyColor])

  useEffect(() => {
    const world = worldRef.current; const dynamic = world?.userData.dynamic as THREE.Group | undefined; if (!dynamic) return
    dynamic.clear()
    towers.forEach((tower) => { const color = TOWER_DATA[tower.type].color; const group = new THREE.Group(); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.22, 8), new THREE.MeshStandardMaterial({ color: selectedId === tower.id ? '#f3ca58' : '#152b3d', emissive: color, emissiveIntensity: 0.7 })); const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.18 + tower.level * 0.03, 0.28, 0.65 + tower.level * 0.08, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.8 })); base.position.y = 0.14; beacon.position.y = 0.55; group.position.set(tower.x, 0, tower.z); group.add(base, beacon); dynamic.add(group) })
    enemies.forEach((enemy) => { const color = enemy.type === 'boss' ? '#f3ca58' : enemy.type === 'repair' ? '#6ee58f' : '#a93649'; const boar = new THREE.Mesh(new THREE.DodecahedronGeometry(enemy.type === 'boss' ? 0.7 : 0.38, 0), new THREE.MeshStandardMaterial({ color, emissive: '#5d1528', emissiveIntensity: 1.2 })); boar.position.set(-8 + enemy.progress, 0.42 + (enemy.type === 'boss' ? 0.25 : 0), 0); dynamic.add(boar) })
    modules.forEach((module) => { const color = module.type === 'bridge' ? '#f3ca58' : module.type === 'gate' ? (module.open ? '#35d5e8' : '#ff4ca0') : '#287c91'; const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, module.type === 'bridge' ? 0.22 : 0.12, 0.9), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 })); mesh.position.set(module.x, 0.18, module.z); dynamic.add(mesh) })
    shots.forEach((shot) => { const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(shot.fromX, 0.8, shot.fromZ), new THREE.Vector3(shot.toX, 0.65, shot.toZ)]); dynamic.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: shot.color, transparent: true, opacity: Math.min(1, shot.ttl * 9) }))) })
  }, [towers, enemies, shots, modules, selectedId])

  useEffect(() => { const timer = window.setInterval(() => state.tick(0.1), 100); return () => window.clearInterval(timer) }, [state.tick])
  useEffect(() => { if (state.loadGame()) setNotice('本地存档已恢复。') }, [])
  useEffect(() => {
    musicRef.current = new MusicController()
    return () => { musicRef.current?.dispose(); musicRef.current = null }
  }, [])
  const toggleMusic = () => { const playing = musicRef.current?.toggle() ?? false; setMusicOn(playing) }
  const startWave = () => { musicRef.current?.start(); state.startWave() }
  const selected = towers.find((tower) => tower.id === selectedId); const selectedConfig = selected ? TOWER_DATA[selected.type] : null
  const moatTypes: MoatModuleType[] = ['bridge', 'gate', 'straight', 'corner']

  return <main className="app-shell"><section className="topbar"><div><span className="eyebrow">SHANGHAI DEFENSE NETWORK // 2049</span><h1>赛博沪上：<em>野猪围城</em></h1><p className="level-subtitle">第 {levelId} 关 · {level.subtitle}</p></div><div className="stats"><span>核心<b>{core}%</b></span><span>资金<b>¥{credits}</b></span><span>波次<b>{wave}/{level.waves}</b></span></div></section><section className="game-layout"><div className="viewport-wrap"><div ref={mountRef} className="viewport" /><div className="map-label">第 {levelId} 关 · {level.title}</div><div className="hint">{notice || state.message}</div></div><aside className="panel"><div className="story-card"><strong>{level.title}</strong><p>{level.story}</p><small>任务：{level.objective} · 通关奖励 ¥{level.clearReward}</small></div><div className="panel-heading"><span>防御部署</span><small>BUILD MENU</small></div><div className="mode-tabs"><button className={buildMode === 'tower' ? 'chosen' : ''} onClick={() => state.setBuildMode('tower')}>炮塔</button><button className={buildMode === 'moat' ? 'chosen' : ''} onClick={() => state.setBuildMode('moat')}>护城河</button></div><div className="tower-list">{(Object.keys(TOWER_DATA) as TowerType[]).map((type) => <button className={`tower-card ${selectedTower === type && buildMode === 'tower' ? 'active' : ''}`} key={type} onClick={() => state.selectTower(type)}><span className="tower-icon" style={{ borderColor: TOWER_DATA[type].color, color: TOWER_DATA[type].color }}>✦</span><span><strong>{TOWER_DATA[type].label}</strong><small>{TOWER_DATA[type].note}</small></span><b>¥{TOWER_DATA[type].cost}</b></button>)}</div><div className="module-list">{moatTypes.map((type) => <button key={type} className={`module-button ${selectedModule === type && buildMode === 'moat' ? 'chosen' : ''}`} onClick={() => state.selectModule(type)}>{type === 'bridge' ? '桥梁' : type === 'gate' ? '闸门' : type === 'straight' ? '直线河道' : '弯道'} <small>¥{type === 'bridge' ? 80 : type === 'gate' ? 120 : 60}</small></button>)}</div>{selected && selectedConfig && <div className="selection"><strong>{selectedConfig.label} · Lv.{selected.level}</strong><small>坐标 {selected.x}, {selected.z}</small><div className="selection-actions"><button disabled={selected.level >= 3} onClick={() => state.upgradeTower(selected.id)}>升级</button><button onClick={() => state.sellTower(selected.id)}>出售</button></div></div>}<div className="panel-heading"><span>战场状态</span><small>TACTICAL FEED</small></div><div className="feed"><p><i />城市能源网已连接</p><p><i />A* 路线验证在线</p><p><i className="pink" />{towers.length} 座防御塔 · {modules.length} 个河道模块</p></div><div className="controls"><button onClick={state.togglePause} disabled={!running}>{paused ? '继续' : '暂停'}</button><button className={speed === 2 ? 'chosen' : ''} onClick={() => state.setSpeed(2)}>2x</button><button className={speed === 1 ? 'chosen' : ''} onClick={() => state.setSpeed(1)}>1x</button><button onClick={toggleMusic}>{musicOn ? '音乐开' : '音乐关'}</button><button onClick={() => { state.saveGame(); setNotice('进度已保存到本地。') }}>存档</button></div><button className="wave-button" disabled={running || core === 0 || (levelComplete && levelId >= 3)} onClick={levelComplete && levelId < 3 ? state.advanceLevel : startWave}>{running ? `第 ${wave} 波进行中` : levelComplete ? (levelId < 3 ? '进入下一关' : '完成战役') : '启动下一波进攻'} <span>→</span></button><button className="reset-button" onClick={state.reset}>重开战役</button></aside></section></main>
}

export default App
