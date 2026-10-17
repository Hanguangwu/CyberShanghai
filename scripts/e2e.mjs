import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { request } from 'node:http'
import { pathToFileURL } from 'node:url'
import * as THREE from 'three'

let playwrightModule
try { playwrightModule = await import('playwright') } catch { playwrightModule = await import(pathToFileURL('C:/Users/tianh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js').href) }
const { default: playwright } = playwrightModule
const { chromium } = playwright
const node = process.execPath
const server = spawn(node, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173'], { stdio: 'ignore' })
const waitForServer = () => new Promise((resolve, reject) => {
  const started = Date.now()
  const check = () => request({ host: '127.0.0.1', port: 4173, path: '/' }, (response) => { response.resume(); resolve() }).on('error', () => { if (Date.now() - started > 10000) reject(new Error('preview server did not start')); else setTimeout(check, 100) }).end()
  check()
})

try {
  await waitForServer()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  // 模型加载必须在真实浏览器里被验证：pioche.glb 是本次接入的中央主塔模型。
  const waitForModel = (file) => page.waitForResponse((response) => response.url().endsWith(file) && response.status() === 200, { timeout: 30000 })
  const centerTowerModel = waitForModel('pioche.glb')
  const towerModel = waitForModel('flametower_pbr.glb')
  const enemyModel = waitForModel('patrol-robot.glb')

  await page.goto('http://127.0.0.1:4173/')
  assert.equal(await page.getByRole('heading', { name: '赛博沪上：野猪围城' }).isVisible(), true)
  assert.equal(await page.getByText('第 1 关 · 第一章 · 雾港警报').isVisible(), true)
  assert.equal(await page.getByText('外滩能源环线', { exact: true }).isVisible(), true)
  for (const name of ['脉冲炮', '电弧塔', '冰霜塔', '磁轨炮', '毒雾塔', '黑客塔']) assert.equal(await page.getByRole('button', { name: new RegExp(name) }).isVisible(), true)
  assert.equal(await page.getByRole('button', { name: '护城河' }).count(), 0)

  await page.evaluate(() => localStorage.clear())

  // 开局改为盲盒：玩家不能选卡，只能开盒。
  assert.equal(await page.getByRole('button', { name: /抽取此卡/ }).count(), 0, 'ora the blind box must not offer a choice')
  assert.equal(await page.getByRole('button', { name: '开启盲盒' }).count(), 1, 'there must be exactly one blind-box button')
  await page.getByRole('button', { name: '开启盲盒' }).click()
  await page.getByRole('button', { name: '进入战斗' }).click()
  assert.equal(await page.locator('.card-overlay').count(), 0, 'confirming the card must dismiss the overlay')

  await Promise.all([centerTowerModel, towerModel, enemyModel])

  // 回归：已建造的炮塔必须能再次被选中（否则无法升级/出售）。
  const canvas = page.locator('canvas')
  const box = await canvas.boundingBox()
  assert.ok(box, 'the 3D canvas must be present')
  const toScreen = (x, y, z) => {
    const camera = new THREE.PerspectiveCamera(42, box.width / box.height, 0.1, 100)
    camera.position.set(9, 12, 13); camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
    const ndc = new THREE.Vector3(x, y, z).project(camera)
    return { x: box.x + (ndc.x * 0.5 + 0.5) * box.width, y: box.y + (-ndc.y * 0.5 + 0.5) * box.height }
  }
  const clickWorld = async (x, y, z) => {
    const point = toScreen(x, y, z)
    assert.ok(point.x > box.x && point.x < box.x + box.width && point.y > box.y && point.y < box.y + box.height, `world point ${x},${y},${z} must be inside the canvas`)
    await page.mouse.click(point.x, point.y)
  }
  await clickWorld(2, 0, 3)
  await clickWorld(4, 0, 3)
  assert.equal((await page.locator('.selection small').innerText()).includes('4, 3'), true, 'the freshly built tower should be selected')
  for (const height of [0.9, 0.5, 0.25]) await clickWorld(2, height, 3)
  assert.equal((await page.locator('.selection small').innerText()).includes('2, 3'), true, 'an already built tower must be selectable again')
  assert.equal(await page.getByRole('button', { name: '升级' }).isVisible(), true)
  assert.equal(await page.getByRole('button', { name: '出售' }).isVisible(), true)

  await page.getByRole('button', { name: '音乐关' }).click()
  await page.getByRole('button', { name: '启动下一波进攻' }).click()
  assert.equal(await page.getByRole('button', { name: '暂停' }).isEnabled(), true)
  await page.getByRole('button', { name: '暂停' }).click()
  assert.equal(await page.getByRole('button', { name: '继续' }).isVisible(), true)
  await page.getByRole('button', { name: '存档' }).click()
  await page.reload()
  assert.equal(await page.getByText('本地存档已恢复。').isVisible(), true)
  assert.equal((await page.locator('.stats').innerText()).includes('1/6'), true)
  assert.deepEqual(errors, [])
  await browser.close()
  console.log('e2e: all assertions passed')
} finally { server.kill() }
