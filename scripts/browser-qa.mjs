// Browser-only release smoke checks. No production data is touched.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

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
  browser = await chromium.launch({ headless: true })
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    page.on('pageerror', (error) => issues.push(width + 'px runtime: ' + error.message))
    await page.goto(URL, { waitUntil: 'domcontentloaded' })
    await page.locator('.home-view').waitFor({ timeout: 12000 })
    assert.equal(await page.locator('.item-button').count(), 8, 'all common item choices remain available')
    await capture(page, 'home-' + width)
    await context.close()
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, recordVideo: { dir: 'browser-qa', size: { width: 390, height: 844 } } })
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
  const trailHeading = await page.locator('.trail-view h1').first().textContent()
  const checkedBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('findtrail:data:v3') || '{}').activeSearch?.checkedSpots)
  await page.locator('.trail-reset-button').first().click()
  await visitScreen(page, '.clear-view', 'clear-390-opening')
  await page.waitForTimeout(6300)
  await page.getByRole('button', { name: /Return to this place|Continue safely|Continue my search/i }).waitFor()
  await capture(page, 'clear-390-payoff')
  await page.getByRole('button', { name: /Return to this place|Continue safely|Continue my search/i }).click()
  await page.locator('.trail-view').waitFor()
  assert.equal(await page.locator('.trail-view h1').first().textContent(), trailHeading, 'CLEAR resumes the exact trail heading')
  const checkedAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('findtrail:data:v3') || '{}').activeSearch?.checkedSpots)
  assert.deepEqual(checkedAfter, checkedBefore, 'CLEAR did not change checked spots')
  await capture(page, 'trail-390-after-clear')

  // Test other root screens without changing stored data.
  await page.goto(URL)
  await page.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'History' }).click()
  await visitScreen(page, '.history-view', 'history-390')
  await page.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'Settings' }).click()
  await visitScreen(page, '.settings-view', 'settings-390')
  await page.evaluate(() => document.documentElement.setAttribute('data-text-size', 'large'))
  await capture(page, 'settings-large-text-390')
  await context.close()

  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const still = await reduced.newPage()
  await still.goto(URL)
  await still.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'Reset' }).click()
  await still.locator('.clear-view.clear-ready.clear-reduced').waitFor()
  await still.getByRole('button', { name: 'Begin a search' }).waitFor()
  await capture(still, 'clear-reduced-motion-390')
  await still.evaluate(() => document.documentElement.setAttribute('data-text-size', 'large'))
  await capture(still, 'clear-large-text-390')
  await reduced.close()

  for (const width of [320, 360]) {
    const mobile = await browser.newContext({ viewport: { width, height: 700 }, reducedMotion: 'reduce' })
    const small = await mobile.newPage()
    small.on('pageerror', (error) => issues.push(width + 'px CLEAR runtime: ' + error.message))
    await small.goto(URL + '?screen=calm')
    await small.locator('.clear-view.clear-ready').waitFor()
    await capture(small, 'clear-' + width + '-payoff')
    await mobile.close()
  }
  assert.deepEqual(issues, [], 'runtime console errors')
  console.log('FindTrail browser smoke QA passed.')
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
