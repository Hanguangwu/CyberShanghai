import { useEffect, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { getCard } from './game/cards'
import { CENTER_TOWER_SLOT, TOWER_DATA, type TowerType } from './game/data'
import { LEVELS } from './game/levels'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createBoar, instanceModel, loadGameModels, towerModelFor, type GameModels } from './game/models'
import { MusicController } from './game/music'
import { useGameStore } from './gameStore'

function App() {
  const mountRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<THREE.Group | null>(null)
  const modelsRef = useRef<GameModels | null>(null)
  const [notice, setNotice] = useState('')
  const [musicOn, setMusicOn] = useState(false)
  const musicRef = useRef<MusicController | null>(null)
  const [modelsReady, setModelsReady] = useState(0)
  const [boxOpening, setBoxOpening] = useState(false)
  const state = useGameStore()
  const { levelId, levelComplete, cardPhase, chosenCardId, credits, core, wave, running, paused, speed, selectedTower, selectedId, towers, enemies, shots } = state
  const level = LEVELS[levelId]

  useEffect(() => {
    musicRef.current = new MusicController()
    loadGameModels().then((models) => { modelsRef.current = models; setModelsReady(1) }).catch(() => undefined)
    return () => { musicRef.current?.dispose(); musicRef.current = null }
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene(); scene.background = new THREE.Color(level.skyColor)
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100); camera.position.set(9, 12, 13); camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.setSize(mount.clientWidth, mount.clientHeight); mount.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight('#bcefff', '#081018', 2.2)); const keyLight = new THREE.DirectionalLight('#ff4ca0', 3); keyLight.position.set(-5, 10, 5); scene.add(keyLight)
    // PBR 材质的金属表面需要环境贴图才有反射，否则 metalness≈1 会渲染成纯黑（Blender 里看起来有颜色，Three.js 里没有）。
    const pmrem = new THREE.PMREMGenerator(renderer); const roomEnvironment = new RoomEnvironment(); const environmentTarget = pmrem.fromScene(roomEnvironment, 0.04); scene.environment = environmentTarget.texture; scene.environmentIntensity = 0.6; pmrem.dispose(); roomEnvironment.dispose()
    const world = new THREE.Group(); worldRef.current = world; scene.add(world)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), new THREE.MeshStandardMaterial({ color: '#0b2430', roughness: 0.92 })); ground.rotation.x = -Math.PI / 2; world.add(ground)
    const grid = new THREE.GridHelper(22, 22, '#1a8290', '#123b4a'); grid.position.y = 0.015; world.add(grid)
    const road = new THREE.Mesh(new THREE.BoxGeometry(18, 0.09, 2.2), new THREE.MeshStandardMaterial({ color: '#25283c', emissive: '#161a2b', emissiveIntensity: 0.5 })); road.position.set(1.2, 0.08, 0); world.add(road)
    for (let x = -8; x <= 8; x += 2) { const lane = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.05), new THREE.MeshBasicMaterial({ color: '#f3ca58' })); lane.position.set(x + 1.2, 0.14, 0); world.add(lane) }
    for (let i = 0; i < 18; i += 1) { const h = 0.8 + (i * 7 % 11) / 5; const building = new THREE.Mesh(new THREE.BoxGeometry(0.8 + (i % 3) * 0.3, h, 0.8 + (i % 2) * 0.25), new THREE.MeshStandardMaterial({ color: i % 2 ? '#182a47' : '#26314f', emissive: i % 3 ? '#091f38' : '#3b1550', emissiveIntensity: 1.2 })); building.position.set(4 + (i % 6) * 1.3, h / 2, -6 + Math.floor(i / 6) * 3.8); world.add(building) }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 1.1, 6), new THREE.MeshStandardMaterial({ color: '#ff4ca0', emissive: '#c32374', emissiveIntensity: 2 })); core.position.set(7, 0.6, 0); world.add(core)
    // 标出地图中央的主塔位，让玩家一眼看到 pioche.glb 专属塔应该建在哪里。
    const centerSlot = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.98, 28), new THREE.MeshBasicMaterial({ color: '#35d5e8', transparent: true, opacity: 0.5, side: THREE.DoubleSide })); centerSlot.rotation.x = -Math.PI / 2; centerSlot.position.set(CENTER_TOWER_SLOT.x, 0.03, CENTER_TOWER_SLOT.z); world.add(centerSlot)
    const dynamic = new THREE.Group(); world.add(dynamic); world.userData.dynamic = dynamic
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let dragging = false; let moved = false; let downX = 0; let downY = 0; let lastX = 0; let lastY = 0
    const onPointerDown = (event: PointerEvent) => { dragging = true; moved = false; downX = event.clientX; downY = event.clientY; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId) }
    const onPointerMove = (event: PointerEvent) => { if (!dragging) return; if (Math.hypot(event.clientX - downX, event.clientY - downY) > 6) moved = true; camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (event.clientX - lastX) * 0.008); camera.position.y = Math.max(5, Math.min(22, camera.position.y + (event.clientY - lastY) * 0.04)); camera.lookAt(0, 0, 0); lastX = event.clientX; lastY = event.clientY }
    const onPointerUp = (event: PointerEvent) => { dragging = false; renderer.domElement.releasePointerCapture(event.pointerId) }
    const onWheel = (event: WheelEvent) => { event.preventDefault(); camera.position.multiplyScalar(event.deltaY > 0 ? 1.06 : 0.94); camera.position.clampLength(7, 28); camera.lookAt(0, 0, 0) }
    const onClick = (event: MouseEvent) => {
      // 拖动过镜头就不算点击；旧实现用 lastX 判断，而 lastX 在 pointermove 里被不断刷新，导致拖动后仍会误建造。
      if (moved) return
      const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(pointer, camera)
      // 先命中已建造的炮塔：点塔 = 选中（才能升级/出售），点空地才建造。旧实现只对地面做射线检测，所以永远无法选中已有炮塔。
      const towerTargets = dynamic.children.filter((child) => child.userData.towerId !== undefined)
      const towerHit = raycaster.intersectObjects(towerTargets, true)[0]
      if (towerHit) {
        let node: THREE.Object3D | null = towerHit.object
        while (node && node.userData.towerId === undefined) node = node.parent
        if (node && typeof node.userData.towerId === 'number') { useGameStore.getState().selectEntity(node.userData.towerId as number); return }
      }
      const hit = raycaster.intersectObject(ground)[0]
      if (hit) useGameStore.getState().buildAt(Math.round(hit.point.x), Math.round(hit.point.z))
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown); renderer.domElement.addEventListener('pointermove', onPointerMove); renderer.domElement.addEventListener('pointerup', onPointerUp); renderer.domElement.addEventListener('wheel', onWheel, { passive: false }); renderer.domElement.addEventListener('click', onClick)
    const resize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight) }; window.addEventListener('resize', resize)
    let frame = 0; const animate = () => { frame = requestAnimationFrame(animate); core.rotation.y += 0.008; renderer.render(scene, camera) }; animate()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); renderer.domElement.removeEventListener('pointerdown', onPointerDown); renderer.domElement.removeEventListener('pointermove', onPointerMove); renderer.domElement.removeEventListener('pointerup', onPointerUp); renderer.domElement.removeEventListener('wheel', onWheel); renderer.domElement.removeEventListener('click', onClick); scene.environment = null; environmentTarget.dispose(); renderer.dispose(); mount.removeChild(renderer.domElement); worldRef.current = null }
  }, [level.skyColor])

  useEffect(() => {
    const dynamic = worldRef.current?.userData.dynamic as THREE.Group | undefined
    if (!dynamic) return
    dynamic.clear()
    const models = modelsRef.current
    towers.forEach((tower) => { const isCenterSlot = tower.x === CENTER_TOWER_SLOT.x && tower.z === CENTER_TOWER_SLOT.z; const group = models ? instanceModel(isCenterSlot ? models.centerTower : towerModelFor(models, tower.type), 0.8 + tower.level * 0.08) : new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.8, 8), new THREE.MeshStandardMaterial({ color: TOWER_DATA[tower.type].color })); group.position.set(tower.x, 0, tower.z); group.userData.towerId = tower.id; dynamic.add(group) })
    enemies.forEach((enemy) => { const boar = models ? createBoar(models.boar, enemy.type) : new THREE.Mesh(new THREE.DodecahedronGeometry(enemy.type === 'boss' ? 0.7 : 0.38, 0), new THREE.MeshStandardMaterial({ color: '#a93649' })); boar.position.set(-8 + enemy.progress, 0, 0); dynamic.add(boar) })
    shots.forEach((shot) => { const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(shot.fromX, 0.8, shot.fromZ), new THREE.Vector3(shot.toX, 0.65, shot.toZ)]); dynamic.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: shot.color, transparent: true, opacity: Math.min(1, shot.ttl * 9) }))) })
  }, [towers, enemies, shots, selectedId, modelsReady])

  useEffect(() => { const timer = window.setInterval(() => state.tick(0.1), 100); return () => window.clearInterval(timer) }, [state.tick])
  useEffect(() => { if (state.loadGame()) setNotice('本地存档已恢复。') }, [])
  const toggleMusic = () => { const playing = musicRef.current?.toggle() ?? false; setMusicOn(playing) }
  const startWave = () => { musicRef.current?.start(); state.startWave() }
  const selected = towers.find((tower) => tower.id === selectedId); const selectedConfig = selected ? TOWER_DATA[selected.type] : null
  // 盲盒：动画播完再结算；prefers-reduced-motion 时点击即刻结算，不做等待。
  useEffect(() => {
    if (!boxOpening) return
    const timer = window.setTimeout(() => useGameStore.getState().openBlindBox(), 900)
    return () => window.clearTimeout(timer)
  }, [boxOpening])
  // 重开战役或进入下一关会回到「未开盒」阶段，此时把盒子复位。
  useEffect(() => { if (cardPhase !== 'draw') setBoxOpening(false) }, [cardPhase])
  const openBox = () => {
    if (cardPhase !== 'draw' || boxOpening) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { useGameStore.getState().openBlindBox(); return }
    setBoxOpening(true)
  }
  const revealedCard = chosenCardId ? getCard(chosenCardId) : undefined

  return <main className="app-shell"><section className="topbar"><div><span className="eyebrow">SHANGHAI DEFENSE NETWORK // 2049</span><h1>赛博沪上：<em>野猪围城</em></h1><p className="level-subtitle">第 {levelId} 关 · {level.subtitle}</p></div><div className="stats"><span>核心<b>{core}%</b></span><span>资金<b>¥{credits}</b></span><span>波次<b>{wave}/{level.waves}</b></span></div></section><section className="game-layout"><div className="viewport-wrap"><div ref={mountRef} className="viewport" /><div className="map-label">第 {levelId} 关 · {level.title}</div><div className="hint">{notice || state.message}</div></div><aside className="panel"><div className="story-card"><strong>{level.title}</strong><p>{level.story}</p><small>任务：{level.objective} · 通关奖励 ¥{level.clearReward}</small></div><div className="panel-heading"><span>防御部署</span><small>BUILD MENU</small></div><div className="tower-list">{(Object.keys(TOWER_DATA) as TowerType[]).map((type) => <button className={`tower-card ${selectedTower === type ? 'active' : ''}`} key={type} onClick={() => state.selectTower(type)}><span className="tower-icon" style={{ borderColor: TOWER_DATA[type].color, color: TOWER_DATA[type].color }}>✦</span><span><strong>{TOWER_DATA[type].label}</strong><small>{TOWER_DATA[type].note}</small></span><b>¥{TOWER_DATA[type].cost}</b></button>)}</div>{selected && selectedConfig && <div className="selection"><strong>{selectedConfig.label} · Lv.{selected.level}</strong><small>坐标 {selected.x}, {selected.z}</small><div className="selection-actions"><button disabled={selected.level >= 3} onClick={() => state.upgradeTower(selected.id)}>升级</button><button onClick={() => state.sellTower(selected.id)}>出售</button></div></div>}<div className="panel-heading"><span>战场状态</span><small>TACTICAL FEED</small></div><div className="feed"><p><i />城市能源网已连接</p><p><i />炮塔模型模拟加载在线</p><p><i className="pink" />{towers.length} 座防御塔</p></div><div className="controls"><button onClick={state.togglePause} disabled={!running}>{paused ? '继续' : '暂停'}</button><button className={speed === 2 ? 'chosen' : ''} onClick={() => state.setSpeed(2)}>2x</button><button className={speed === 1 ? 'chosen' : ''} onClick={() => state.setSpeed(1)}>1x</button><button onClick={toggleMusic}>{musicOn ? '音乐开' : '音乐关'}</button><button onClick={() => { state.saveGame(); setNotice('进度已保存到本地。') }}>存档</button></div><button className="wave-button" disabled={running || core === 0 || (levelComplete && levelId >= 3)} onClick={levelComplete && levelId < 3 ? state.advanceLevel : startWave}>{running ? `第 ${wave} 波进行中` : levelComplete ? (levelId < 3 ? '进入下一关' : '完成战役') : '启动下一波进攻'} <span>→</span></button><button className="reset-button" onClick={state.reset}>重开战役</button></aside></section>{cardPhase !== 'ready' && <div className="card-overlay"><div className="card-draw">{cardPhase === 'draw' ? <><span className="eyebrow">FATE BOX // OPENING HAND</span><h2>开局命运盲盒</h2><p>盒子里封着一张命运卡，开出什么由它决定，你无法选择。</p><div className="blind-box-stage"><div className={`blind-box${boxOpening ? ' opening' : ''}`}><span className="blind-box-glow" /><span className="blind-box-lid" /><span className="blind-box-body"><i>?</i></span></div></div><button className="blind-open-button" onClick={openBox} disabled={boxOpening}>{boxOpening ? '开启中…' : '开启盲盒'}</button><small className="card-footnote">开盒结果会写入存档；每关开始前盲盒都会重新洗牌。</small></> : revealedCard ? <><span className="eyebrow">FATE BOX // REVEALED</span><h2>盲盒已开启</h2><p>命运已经写好，无法更改。</p><div className="revealed-card" style={{ '--card-color': revealedCard.color } as CSSProperties}><span className="card-art">{revealedCard.icon}</span><span className="card-risk">{revealedCard.risk === 'safe' ? 'STABLE' : revealedCard.risk === 'risk' ? 'RISK' : 'CHAOS'}</span><strong>{revealedCard.name}</strong><small>{revealedCard.subtitle}</small><p>{revealedCard.description}</p></div><button className="blind-open-button" onClick={state.confirmCard}>进入战斗</button></> : null}</div></div>}</main>
}

export default App
