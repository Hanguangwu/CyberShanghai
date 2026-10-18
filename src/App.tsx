import { useEffect, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { getCard } from './game/cards'
import { CENTER_TOWER_SLOT, FIELD_SIZE, TOWER_DATA, type TowerType } from './game/data'
import { LEVELS } from './game/levels'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { CAMPUS_CORE } from './game/campusMap'
import { createCampusDecoration } from './game/campusDecoration'
import { loadCampusModules } from './game/campusModels'
import { createEnemy, instanceModel, loadGameModels, towerModelFor, type GameModels } from './game/models'
import { MusicController } from './game/music'
import { useGameStore } from './gameStore'

type AppPhase = 'menu' | 'intro' | 'playing' | 'ending' | 'result'
type EndingResult = 'win' | 'fail'
const BASE_URL = import.meta.env.BASE_URL
const videoUrl = (file: string) => `${BASE_URL}videos/${file}`

const overlayStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', background: 'rgba(3, 8, 16, .94)', color: '#dffaff' }
const menuPanelStyle: CSSProperties = { width: 'min(680px, 90vw)', padding: '48px', border: '1px solid #28798b', borderRadius: 18, background: 'linear-gradient(145deg, rgba(12, 35, 53, .96), rgba(8, 15, 28, .98))', boxShadow: '0 0 80px rgba(53, 213, 232, .16)', textAlign: 'center' }
const primaryButtonStyle: CSSProperties = { display: 'block', width: 'min(360px, 100%)', margin: '12px auto', padding: '14px 22px', border: '1px solid #35d5e8', borderRadius: 8, background: '#123c4d', color: '#fff', cursor: 'pointer', fontSize: 16 }

function App() {
  const mountRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<THREE.Group | null>(null)
  const modelsRef = useRef<GameModels | null>(null)
  const musicRef = useRef<MusicController | null>(null)
  const [appPhase, setAppPhase] = useState<AppPhase>('menu')
  const [endingResult, setEndingResult] = useState<EndingResult | null>(null)
  const [musicOn, setMusicOn] = useState(true)
  const [musicVolume, setMusicVolume] = useState(0.42)
  const [modelsReady, setModelsReady] = useState(0)
  const [boxOpening, setBoxOpening] = useState(false)
  const state = useGameStore()
  const { levelComplete, cardPhase, chosenCardId, credits, core, wave, running, paused, speed, selectedTower, selectedId, towers, enemies, shots } = state
  const level = LEVELS[1]

  useEffect(() => {
    musicRef.current = new MusicController()
    const savedVolume = Number(localStorage.getItem('cyber-shanghai-volume'))
    if (Number.isFinite(savedVolume) && savedVolume > 0) { setMusicVolume(savedVolume); musicRef.current.setVolume(savedVolume) }
    loadGameModels().then((models) => { modelsRef.current = models; setModelsReady(1) }).catch(() => undefined)
    return () => { musicRef.current?.dispose(); musicRef.current = null }
  }, [])

  useEffect(() => {
    if (appPhase === 'playing' && !running && wave > 0 && (levelComplete || core <= 0)) {
      const result: EndingResult = levelComplete && core > 0 ? 'win' : 'fail'
      setEndingResult(result)
      setAppPhase('ending')
      musicRef.current?.stop()
    }
  }, [appPhase, running, wave, levelComplete, core])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene(); scene.background = new THREE.Color(level.skyColor)
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 300)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.setSize(mount.clientWidth, mount.clientHeight); mount.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight('#bcefff', '#081018', 2.2)); const keyLight = new THREE.DirectionalLight('#ff4ca0', 3); keyLight.position.set(-5, 10, 5); scene.add(keyLight)
    const pmrem = new THREE.PMREMGenerator(renderer); const roomEnvironment = new RoomEnvironment(); const environmentTarget = pmrem.fromScene(roomEnvironment, 0.04); scene.environment = environmentTarget.texture; scene.environmentIntensity = 0.6; pmrem.dispose(); roomEnvironment.dispose()
    const world = new THREE.Group(); worldRef.current = world; scene.add(world)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_SIZE.x, FIELD_SIZE.z), new THREE.MeshStandardMaterial({ color: '#0b2430', roughness: 0.92 })); ground.rotation.x = -Math.PI / 2; world.add(ground)
    world.add(createCampusDecoration(false, false))
    const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 1.1, 6), new THREE.MeshStandardMaterial({ color: '#ff4ca0', emissive: '#c32374', emissiveIntensity: 2 })); coreMesh.position.set(CAMPUS_CORE.x, 0.6, CAMPUS_CORE.z); world.add(coreMesh)
    const centerSlot = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.98, 28), new THREE.MeshBasicMaterial({ color: '#35d5e8', transparent: true, opacity: 0.5, side: THREE.DoubleSide })); centerSlot.rotation.x = -Math.PI / 2; centerSlot.position.set(CENTER_TOWER_SLOT.x, 0.03, CENTER_TOWER_SLOT.z); world.add(centerSlot)
    let cancelled = false
    loadGameModels().then((loaded) => { if (!cancelled) loaded.map.group.visible = false }).catch(() => undefined)
    if (appPhase === 'playing') loadCampusModules().then((campus) => { if (!cancelled) world.add(campus) }).catch(() => undefined)
    const dynamic = new THREE.Group(); world.add(dynamic); world.userData.dynamic = dynamic
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let dragging = false; let moved = false; let downX = 0; let lastX = 0; let lastY = 0; let orbitYaw = 0.68; let orbitPitch = 0.78; let orbitRadius = 132
    const updateCamera = () => { const horizontal = Math.cos(orbitPitch) * orbitRadius; camera.position.set(Math.sin(orbitYaw) * horizontal, Math.sin(orbitPitch) * orbitRadius, Math.cos(orbitYaw) * horizontal); camera.lookAt(0, 0, 0) }; updateCamera()
    const onPointerDown = (event: PointerEvent) => { dragging = true; moved = false; downX = event.clientX; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId) }
    const onPointerMove = (event: PointerEvent) => { if (!dragging) return; if (Math.hypot(event.clientX - downX, event.clientY - lastY) > 6) moved = true; orbitYaw -= (event.clientX - lastX) * 0.008; orbitPitch = Math.max(0.22, Math.min(1.38, orbitPitch - (event.clientY - lastY) * 0.008)); updateCamera(); lastX = event.clientX; lastY = event.clientY }
    const onPointerUp = (event: PointerEvent) => { dragging = false; renderer.domElement.releasePointerCapture(event.pointerId) }
    const onWheel = (event: WheelEvent) => { event.preventDefault(); orbitRadius = Math.max(35, Math.min(180, orbitRadius * (event.deltaY > 0 ? 1.06 : 0.94))); updateCamera() }
    const onClick = (event: MouseEvent) => {
      if (moved || appPhase !== 'playing') return
      const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; raycaster.setFromCamera(pointer, camera)
      const towerHit = raycaster.intersectObjects(dynamic.children.filter((child) => child.userData.towerId !== undefined), true)[0]
      if (towerHit) { let node: THREE.Object3D | null = towerHit.object; while (node && node.userData.towerId === undefined) node = node.parent; if (node && typeof node.userData.towerId === 'number') { useGameStore.getState().selectEntity(node.userData.towerId); return } }
      const hit = raycaster.intersectObject(ground)[0]
      if (hit) useGameStore.getState().buildAt(Math.round(hit.point.x), Math.round(hit.point.z))
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown); renderer.domElement.addEventListener('pointermove', onPointerMove); renderer.domElement.addEventListener('pointerup', onPointerUp); renderer.domElement.addEventListener('wheel', onWheel, { passive: false }); renderer.domElement.addEventListener('click', onClick)
    const resize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight) }; window.addEventListener('resize', resize)
    let frame = 0; const animate = () => { frame = requestAnimationFrame(animate); coreMesh.rotation.y += 0.008; renderer.render(scene, camera) }; animate()
    return () => { cancelled = true; cancelAnimationFrame(frame); window.removeEventListener('resize', resize); renderer.domElement.removeEventListener('pointerdown', onPointerDown); renderer.domElement.removeEventListener('pointermove', onPointerMove); renderer.domElement.removeEventListener('pointerup', onPointerUp); renderer.domElement.removeEventListener('wheel', onWheel); renderer.domElement.removeEventListener('click', onClick); environmentTarget.dispose(); renderer.dispose(); mount.removeChild(renderer.domElement); worldRef.current = null }
  }, [level.skyColor, appPhase])

  useEffect(() => {
    const dynamic = worldRef.current?.userData.dynamic as THREE.Group | undefined
    if (!dynamic) return
    dynamic.clear(); const models = modelsRef.current
    towers.forEach((tower) => { const isCenterSlot = tower.x === CENTER_TOWER_SLOT.x && tower.z === CENTER_TOWER_SLOT.z; const group = models ? instanceModel(isCenterSlot ? models.centerTower : towerModelFor(models, tower.type), 1 + tower.level * 0.1) : new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.1, 8), new THREE.MeshStandardMaterial({ color: TOWER_DATA[tower.type].color })); group.position.set(tower.x, 0, tower.z); group.userData.towerId = tower.id; dynamic.add(group) })
    enemies.forEach((enemy) => { const unit = models ? createEnemy(models, enemy.type) : new THREE.Mesh(new THREE.DodecahedronGeometry(enemy.type === 'boss' ? 0.7 : 0.38), new THREE.MeshStandardMaterial({ color: '#a93649' })); unit.position.set(enemy.position.x, 0.22, enemy.position.z); dynamic.add(unit) })
    shots.forEach((shot) => { const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(shot.fromX, 0.8, shot.fromZ), new THREE.Vector3(shot.toX, 0.65, shot.toZ)]); dynamic.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: shot.color, transparent: true, opacity: Math.min(1, shot.ttl * 9) }))) })
  }, [towers, enemies, shots, selectedId, modelsReady])

  useEffect(() => { const timer = window.setInterval(() => state.tick(0.1), 100); return () => window.clearInterval(timer) }, [state.tick])
  useEffect(() => { if (!boxOpening) return; const timer = window.setTimeout(() => useGameStore.getState().openBlindBox(), 900); return () => window.clearTimeout(timer) }, [boxOpening])
  useEffect(() => { if (cardPhase !== 'draw') setBoxOpening(false) }, [cardPhase])

  const startNewGame = () => { state.reset(); musicRef.current?.stop(); setEndingResult(null); setAppPhase('intro') }
  const continueGame = () => { if (state.loadGame()) { musicRef.current?.start('gameplay'); setAppPhase('playing') } }
  const returnToMenu = () => { state.reset(); musicRef.current?.start('menu'); setEndingResult(null); setAppPhase('menu') }
  const restartGame = () => { state.reset(); musicRef.current?.stop(); setEndingResult(null); setAppPhase('intro') }
  const finishVideo = () => { if (appPhase === 'intro') { musicRef.current?.start('gameplay'); setAppPhase('playing') } else { setAppPhase('result'); musicRef.current?.stop() } }
  const toggleMusic = () => { const enabled = musicRef.current?.toggle() ?? false; setMusicOn(enabled) }
  const changeVolume = (value: number) => { setMusicVolume(value); musicRef.current?.setVolume(value); localStorage.setItem('cyber-shanghai-volume', String(value)) }
  const openBox = () => { if (cardPhase !== 'draw' || boxOpening) return; setBoxOpening(true) }
  const selected = towers.find((tower) => tower.id === selectedId); const selectedConfig = selected ? TOWER_DATA[selected.type] : null; const revealedCard = chosenCardId ? getCard(chosenCardId) : undefined
  const hasSave = typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('cyber-shanghai-save'))

  const videoOverlay = appPhase === 'intro' || appPhase === 'ending' ? <div style={overlayStyle}><video key={appPhase} autoPlay playsInline controls style={{ maxWidth: '90vw', maxHeight: '82vh', background: '#000' }} src={appPhase === 'intro' ? videoUrl('begin.mp4') : videoUrl(endingResult === 'win' ? 'end_win.mp4' : 'end_fail.mp4')} onEnded={finishVideo} /><button style={{ ...primaryButtonStyle, position: 'fixed', right: 24, bottom: 24, width: 'auto' }} onClick={finishVideo}>{appPhase === 'intro' ? '跳过开场' : '跳过结尾'}</button></div> : null
  const menuOverlay = appPhase === 'menu' ? <div style={overlayStyle}><div style={menuPanelStyle}><div className="eyebrow">SHANGHAITECH UNIVERSITY</div><h1 style={{ fontSize: 'clamp(32px, 6vw, 64px)', margin: '18px 0 8px' }}>赛博上科大</h1><p style={{ color: '#8bb6c3', fontSize: 18 }}>保卫校园</p><button style={primaryButtonStyle} onClick={startNewGame}>开始游戏</button><button style={{ ...primaryButtonStyle, opacity: hasSave ? 1 : 0.45 }} disabled={!hasSave} onClick={continueGame}>继续游戏</button><button style={{ ...primaryButtonStyle, background: 'transparent' }} onClick={() => window.alert('完成 8 波防守，保护校园核心。道路两侧可以建造防御塔，敌人包括虫子、机器人和鲸鱼。')}>游戏说明</button><label style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 22, color: '#8bb6c3' }}>音乐音量 <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(event) => changeVolume(Number(event.target.value))} /></label></div></div> : null
  const resultOverlay = appPhase === 'result' ? <div style={overlayStyle}><div style={menuPanelStyle}><div className="eyebrow">CAMPUS DEFENSE REPORT</div><h2 style={{ fontSize: 40, color: endingResult === 'win' ? '#6ee58f' : '#ff6d85' }}>{endingResult === 'win' ? '校园防线守住了' : '校园核心失守'}</h2><p>{endingResult === 'win' ? '上科大校园重新接入城市能源网络。' : `防线在第 ${wave} 波被突破。`}</p><p>最终核心：{core}%　·　剩余资金：¥{credits}</p><button style={primaryButtonStyle} onClick={restartGame}>重新开始</button><button style={{ ...primaryButtonStyle, background: 'transparent' }} onClick={returnToMenu}>返回主菜单</button></div></div> : null

  return <main className="app-shell"><section className="topbar"><div><span className="eyebrow">CYBER SUSTECH // CAMPUS DEFENSE</span><h1>赛博上科大——<em>保卫校园</em></h1><p className="level-subtitle">{level.subtitle}</p></div><div className="stats"><span>核心<b>{core}%</b></span><span>资金<b>¥{credits}</b></span><span>波次<b>{wave}/{level.waves}</b></span></div></section><section className="game-layout"><div className="viewport-wrap"><div ref={mountRef} className="viewport" /><div className="map-label">保卫上科大校园</div><div className="hint">{state.message}</div></div><aside className="panel"><div className="story-card"><strong>{level.title}</strong><p>{level.story}</p><small>任务：{level.objective} · 通关奖励 ¥{level.clearReward}</small></div><div className="panel-heading"><span>防御部署</span><small>BUILD MENU</small></div><div className="tower-list">{(Object.keys(TOWER_DATA) as TowerType[]).map((type) => <button className={`tower-card ${selectedTower === type ? 'active' : ''}`} key={type} onClick={() => state.selectTower(type)}><span className="tower-icon" style={{ borderColor: TOWER_DATA[type].color, color: TOWER_DATA[type].color }}>✦</span><span><strong>{TOWER_DATA[type].label}</strong><small>{TOWER_DATA[type].note}</small></span><b>¥{TOWER_DATA[type].cost}</b></button>)}</div>{selected && selectedConfig && <div className="selection"><strong>{selectedConfig.label} · Lv.{selected.level}</strong><small>坐标 {selected.x}, {selected.z}</small><div className="selection-actions"><button disabled={selected.level >= 3} onClick={() => state.upgradeTower(selected.id)}>升级</button><button onClick={() => state.sellTower(selected.id)}>出售</button></div></div>}<div className="panel-heading"><span>战场状态</span><small>TACTICAL FEED</small></div><div className="feed"><p><i />上科大校园能源网已连接</p><p><i />虫子 / 机器人 / 鲸鱼信号已锁定</p><p><i className="pink" />{towers.length} 座防御塔</p></div><div className="controls"><button onClick={state.togglePause} disabled={!running}>{paused ? '继续' : '暂停'}</button><button className={speed === 2 ? 'chosen' : ''} onClick={() => state.setSpeed(2)}>2x</button><button className={speed === 1 ? 'chosen' : ''} onClick={() => state.setSpeed(1)}>1x</button><button onClick={toggleMusic}>{musicOn ? '音乐开' : '音乐关'}</button><button onClick={() => state.saveGame()}>存档</button></div><label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0', color: '#8bb6c3', fontSize: 11 }}>音量 <input style={{ flex: 1 }} type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(event) => changeVolume(Number(event.target.value))} /></label><button className="wave-button" disabled={running || core === 0 || levelComplete} onClick={() => { musicRef.current?.start('gameplay'); state.startWave() }}>{running ? `第 ${wave} 波进行中` : levelComplete ? '战役完成' : '启动下一波进攻'} <span>→</span></button><button className="reset-button" onClick={restartGame}>重开战役</button></aside></section>{cardPhase !== 'ready' && appPhase === 'playing' && <div className="card-overlay"><div className="card-draw">{cardPhase === 'draw' ? <><span className="eyebrow">FATE BOX</span><h2>开局命运盲盒</h2><p>开出的卡牌会影响整场校园防卫战。</p><div className={`blind-box-stage${boxOpening ? ' opening' : ''}`}><div className="blind-box"><span className="blind-box-glow" /><span className="blind-box-lid" /><span className="blind-box-body"><i>?</i></span></div></div><button className="blind-open-button" onClick={openBox} disabled={boxOpening}>{boxOpening ? '开启中…' : '开启盲盒'}</button></> : revealedCard ? <><span className="eyebrow">FATE BOX // REVEALED</span><h2>命运卡已揭晓</h2><div className="revealed-card" style={{ '--card-color': revealedCard.color } as CSSProperties}><span className="card-art">{revealedCard.icon}</span><strong>{revealedCard.name}</strong><small>{revealedCard.subtitle}</small><p>{revealedCard.description}</p></div><button className="blind-open-button" onClick={state.confirmCard}>进入战斗</button></> : null}</div></div>}{menuOverlay}{videoOverlay}{resultOverlay}</main>
}

export default App
