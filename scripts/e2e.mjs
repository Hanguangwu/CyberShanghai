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
  const modelFiles = ['pioche.glb', 'machinegun_pbr.glb', 'flametower_pbr.glb', 'ice_tower_pbr.glb', 'rail_gun_pbr.glb', 'gas_tower_pbr.glb', 'hacker_tower_pbr.glb', 'army_beetle_pbr.glb', 'patrol-robot.glb', 'deepseek_whale_pbr.glb', 'mapv0_pbr.glb']
  const modelLoads = modelFiles.map((file) => page.waitForResponse((response) => response.url().endsWith(file) && response.status() === 200, { timeout: 30000 }))
  await page.goto('http://127.0.0.1:4173/CyberShanghaiTech/')
  assert.equal(await page.getByRole('button', { name: /开始游戏/ }).isVisible(), true)
  await page.evaluate(() => localStorage.clear())
  await page.getByRole('button', { name: /开始游戏/ }).click()
  assert.equal(await page.locator('video[src*="begin.mp4"]').count(), 1, 'begin video must play before the game')
  await page.getByRole('button', { name: /跳过开场/ }).click()
  await page.getByRole('button', { name: /开启盲盒/ }).click()
  await page.getByRole('button', { name: /进入战斗/ }).click()
  await Promise.all(modelLoads)
  const canvas = page.locator('canvas'); const box = await canvas.boundingBox(); assert.ok(box)
  const toScreen = (x, y, z) => { const camera = new THREE.PerspectiveCamera(42, box.width / box.height, 0.1, 300); camera.position.set(72.5, 91.8, 94.5); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); const ndc = new THREE.Vector3(x, y, z).project(camera); return { x: box.x + (ndc.x * 0.5 + 0.5) * box.width, y: box.y + (-ndc.y * 0.5 + 0.5) * box.height } }
  const clickWorld = async (x, y, z) => { const point = toScreen(x, y, z); await page.mouse.click(point.x, point.y) }
  await clickWorld(48, 0, 0); await clickWorld(36, 0, 0)
  assert.equal(await page.locator('.selection').count(), 1, 'tower must be selectable after building')
  await page.getByRole('button', { name: /启动下一波进攻/ }).click()
  assert.equal(await page.getByRole('button', { name: /暂停/ }).isEnabled(), true)
  await page.getByRole('button', { name: /暂停/ }).click()
  await page.getByRole('button', { name: /存档/ }).click()
  await page.reload()
  await page.getByRole('button', { name: /继续游戏/ }).click()
  assert.equal(await page.getByRole('button', { name: /启动下一波进攻/ }).isVisible(), true)
  assert.deepEqual(errors, [])
  await browser.close()
  console.log('e2e: all assertions passed')
} finally { server.kill() }
