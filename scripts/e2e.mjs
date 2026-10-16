import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { request } from 'node:http'
import { pathToFileURL } from 'node:url'

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
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:4173/')
  assert.equal(await page.getByRole('heading', { name: '\u8d5b\u535a\u6caa\u4e0a\uff1a\u91ce\u732a\u56f4\u57ce' }).isVisible(), true)
  assert.equal(await page.getByText('\u7b2c 1 \u5173 \u00b7 \u7b2c\u4e00\u7ae0 \u00b7 \u96fe\u6e2f\u8b66\u62a5').isVisible(), true)
  assert.equal(await page.getByText('\u5916\u6ee9\u80fd\u6e90\u73af\u7ebf', { exact: true }).isVisible(), true)
  for (const name of ['\u8109\u51b2\u70ae', '\u7535\u5f27\u5854', '\u51b0\u971c\u5854', '\u78c1\u8f68\u70ae', '\u6bd2\u96fe\u5854', '\u9ed1\u5ba2\u5854']) assert.equal(await page.getByRole('button', { name: new RegExp(name) }).isVisible(), true)
  await page.evaluate(() => localStorage.clear())
  await page.getByRole('button', { name: '\u97f3\u4e50\u5173' }).click()
  await page.getByRole('button', { name: '\u542f\u52a8\u4e0b\u4e00\u6ce2\u8fdb\u653b' }).click()
  assert.equal(await page.getByRole('button', { name: '\u6682\u505c' }).isEnabled(), true)
  await page.getByRole('button', { name: '\u6682\u505c' }).click()
  assert.equal(await page.getByRole('button', { name: '\u7ee7\u7eed' }).isVisible(), true)
  await page.getByRole('button', { name: '\u5b58\u6863' }).click()
  await page.reload()
  assert.equal(await page.getByText('\u672c\u5730\u5b58\u6863\u5df2\u6062\u590d\u3002').isVisible(), true)
  assert.equal((await page.locator('.stats').innerText()).includes('1/6'), true)
  assert.deepEqual(errors, [])
  await browser.close()
  console.log('e2e: all assertions passed')
} finally { server.kill() }
