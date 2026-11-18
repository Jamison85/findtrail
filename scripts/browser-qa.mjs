// Browser-only release smoke checks. No production data is touched.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')

const URL = 'http://127.0.0.1:4173/'
const sizes = [[320, 700], [360, 800], [390, 844], [412, 915], [430, 932], [768, 1024]]
await mkdir('browser-qa', { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' })
let browser
let issues = []

async function ready() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(URL)).ok) return } catch { /* server starting */ }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('Preview server did not start')
}
async function check(page, label) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    rootWidth: document.getElementById('root')?.scrollWidth,
    headings: [...document.querySelectorAll('h1')].map((e) => e.textContent?.trim()),
  }))
  console.log(label, JSON.stringify(result))
  assert.ok(result.documentWidth <= result.viewport + 1, label + ': horizontal document overflow')
  assert.ok(result.bodyWidth <= result.viewport + 1, label + ': horizontal body overflow')
  const focus = await page.evaluate(() => document.activeElement?.tagName)
  assert.ok(focus !== 'IFRAME', label + ': unexpected focus trap')
}
async function capture(page, label) {
  await check(page, label)
  await page.screenshot({ path: 'browser-qa/' + label + '.png', fullPage: true, animations: 'disabled' })
}
async function visitScreen(page, selector, label) {
  await page.locator(selector).waitFor({ timeout: 5000 })
  await capture(page, label)
}
try {
  await ready()
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    page.on('pageerror', (error) => issues.push(width + 'px runtime: ' + error.message))
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.locator('.home-view').waitFor({ timeout: 12000 })
    assert.equal(await page.locator('.item-button').count(), 8, 'all common item choices remain available')
    await capture(page, 'home-' + width)
    await page.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'Reset' }).click()
    await capture(page, 'reset-root-' + width)
    await context.close()
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.on('pageerror', (error) => issues.push('journey runtime: ' + error.message))
  await page.goto(URL)
  await page.locator('.home-view').waitFor()
  await page.locator('.item-button').first().click()
  await page.locator('.clue-view').waitFor()
  await capture(page, 'clue-390')
  for (let i = 0; i < 3; i++) {
    const option = page.locator('.clue-view .choice-button').first()
    await option.click()
    if (i < 2) await page.waitForTimeout(360)
  }
  await page.getByRole('button', { name: 'Build my search trail' }).click()
  await visitScreen(page, '.trail-view', 'trail-390')
  const nextAction = page.locator('.trail-action-dock .button--primary')
  const target = await nextAction.boundingBox()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2)
  await page.mouse.down()
  await page.waitForFunction(() => {
    const button = document.querySelector('.trail-action-dock .button--primary')
    return button && new DOMMatrix(getComputedStyle(button).transform).m42 >= 2.8
  })
  await page.mouse.move(1, 1)
  await page.mouse.up()
  const trailHeading = await page.locator('.trail-view h1').first().textContent()
  await page.locator('.spot-row').first().click()
  const nextSpot = await page.locator('.spot-row.is-next .spot-row__label').textContent()
  await page.locator('.trail-reset-button').first().click()
  await visitScreen(page, '.reset-journey', 'reset-390-next-step')
  assert.equal(await page.locator('.reset-next strong').textContent(), nextSpot, 'Reset shows the next unchecked spot immediately')
  await page.getByRole('button', { name: 'Back to search' }).click()
  await page.locator('.trail-view').waitFor()
  assert.equal(await page.locator('.trail-view h1').first().textContent(), trailHeading, 'reset resumes the exact trail heading')
  await capture(page, 'trail-390-after-reset')

  await page.getByRole('button', { name: 'Found it', exact: true }).click()
  await page.getByRole('textbox', { name: 'Exact place' }).fill('Blue bowl by the door')
  await page.getByRole('checkbox', { name: /make this the usual spot/i }).check()
  await visitScreen(page, '.found-view', 'found-390')
  await page.getByRole('button', { name: 'Save this spot' }).click()
  await page.getByRole('button', { name: 'Find another item' }).click()
  await page.getByRole('button', { name: 'Keys', exact: true }).click()
  await page.getByRole('heading', { name: 'Blue bowl by the door' }).waitFor()
  await capture(page, 'saved-spot-390')
  await page.getByRole('button', { name: 'Keep searching' }).click()
  await page.getByRole('heading', { name: 'Which keys are missing?' }).waitFor()

  // Check offline navigation after assets and the shell have been cached.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await context.setOffline(true)
  await page.goto(URL)
  await page.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'Reset' }).click()
  await page.locator('.reset-journey').waitFor()
  const lakeSize = await page.evaluate(async () => (await (await fetch('./findtrail-lake-dawn.webp')).blob()).size)
  assert.ok(lakeSize > 0, 'lake artwork is available offline')
  await page.getByRole('button', { name: 'Back to search' }).click()
  await context.setOffline(false)

  await page.goto(URL)
  await page.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'History' }).click()
  await visitScreen(page, '.history-view', 'history-390')
  await page.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'Search' }).click()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await visitScreen(page, '.settings-view', 'settings-390')
  await page.evaluate(() => document.documentElement.setAttribute('data-text-size', 'large'))
  await capture(page, 'settings-large-text-390')
  await context.close()

  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const still = await reduced.newPage()
  await still.goto(URL)
  await still.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'Reset' }).click()
  await still.getByRole('button', { name: 'Back to home' }).waitFor()
  await capture(still, 'reset-reduced-motion-390')
  await reduced.close()
  assert.deepEqual(issues, [], 'runtime console errors')
  console.log('FindTrail browser smoke QA passed.')
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
