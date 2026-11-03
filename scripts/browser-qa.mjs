// Browser-only release smoke checks. No production data is touched.
import assert from 'node:assert/strict'
import { copyFile, mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import axe from 'axe-core'

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
  await page.locator('.spot-row[aria-pressed="false"]').first().click()
  const expectedSpot = await page.locator('.spot-row[aria-pressed="false"] .spot-row__label').first().textContent()
  const activeData = await page.evaluate(() => localStorage.getItem('findtrail:data:v3'))
  assert.ok(activeData, 'integrated journey should produce a saved search')
  const searchBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('findtrail:data:v3') || '{}').activeSearch)
  await page.locator('.trail-reset-button').first().click()
  await page.locator('.clear-view .clear-scene img').waitFor()
  await page.waitForFunction(() => {
    const img = document.querySelector('.clear-scene img')
    return img && img.complete && img.naturalWidth > 0
  }, { timeout: 10000 })
  const backdrop = await page.locator('.clear-scene img').evaluate((img) => ({ width: img.naturalWidth, height: img.naturalHeight, visible: getComputedStyle(img).display !== 'none' }))
  assert.ok(backdrop.visible && backdrop.width >= 500 && backdrop.height >= 500, 'CLEAR photographic scene must load')
  await visitScreen(page, '.clear-view', 'clear-390-opening')
  await page.waitForTimeout(6300)
  await page.getByRole('button', { name: /Return to this place|Continue safely|Continue my search/i }).waitFor()
  assert.equal(await page.locator('.clear-place-main').textContent(), expectedSpot, 'CLEAR displays the next genuinely unchecked spot')
  await capture(page, 'clear-390-payoff')
  await page.getByRole('button', { name: /Return to this place|Continue safely|Continue my search/i }).click()
  await page.locator('.trail-view').waitFor()
  assert.equal(await page.locator('.trail-view h1').first().textContent(), trailHeading, 'CLEAR resumes the exact trail heading')
  const searchAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('findtrail:data:v3') || '{}').activeSearch)
  assert.deepEqual(searchAfter, searchBefore, 'CLEAR did not change saved search progress or metadata')
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
  await copyFile(await page.video().path(), 'browser-qa/clear-390-integrated-journey.webm')

  // A separate real-time capture starts on CLEAR itself, with the actual trail
  // produced by the journey above. It also samples frame pacing in Chromium.
  const motion = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, recordVideo: { dir: 'browser-qa', size: { width: 390, height: 844 } } })
  await motion.addInitScript((saved) => {
    localStorage.setItem('findtrail:data:v3', saved)
    localStorage.setItem('findtrail:onboarding-complete-v1', '1')
  }, activeData)
  const motionPage = await motion.newPage()
  await motionPage.goto(URL + '?screen=calm')
  await motionPage.locator('.clear-scene img').evaluate((img) => img.decode())
  await capture(motionPage, 'clear-390-motion-opening')
  const frameTimes = await motionPage.evaluate(() => new Promise((resolve) => {
    const times = []
    const started = performance.now()
    let previous = started
    function frame(now) {
      times.push(now - previous)
      previous = now
      if (now - started < 6600) requestAnimationFrame(frame)
      else resolve(times)
    }
    requestAnimationFrame(frame)
  }))
  await motionPage.locator('.clear-ready').waitFor()
  await capture(motionPage, 'clear-390-motion-final')
  assert.match(await motionPage.locator('[role="status"]').last().textContent(), /Your next useful step is/)
  await motionPage.getByRole('heading', { name: /One place. One useful step/i }).focus()
  await motionPage.keyboard.press('Tab')
  assert.equal(await motionPage.evaluate(() => document.activeElement?.className), 'clear-action', 'primary action follows focus heading')
  const sortedFrames = frameTimes.slice(1).sort((a, b) => a - b)
  console.log('CLEAR frame pacing', JSON.stringify({ samples: sortedFrames.length, medianMs: sortedFrames[Math.floor(sortedFrames.length / 2)], p95Ms: sortedFrames[Math.floor(sortedFrames.length * .95)], over50Ms: sortedFrames.filter((ms) => ms > 50).length }))
  await motion.close()
  await copyFile(await motionPage.video().path(), 'browser-qa/clear-390-full-progression.webm')

  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const still = await reduced.newPage()
  await still.goto(URL)
  await still.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'Reset' }).click()
  await still.locator('.clear-view.clear-ready.clear-reduced').waitFor()
  await still.getByRole('button', { name: 'Begin a search' }).waitFor()
  await capture(still, 'clear-reduced-motion-390')
  await still.evaluate(() => document.documentElement.setAttribute('data-text-size', 'large'))
  await capture(still, 'clear-large-text-390')
  await still.getByRole('button', { name: 'Begin a search' }).click()
  await still.getByRole('heading', { name: 'What went missing?' }).waitFor()
  assert.equal(await still.evaluate(() => document.activeElement?.id), 'item-picker-heading', 'begin action focuses the item picker')
  await reduced.close()

  for (const [width, height] of [[320, 700], [360, 800], [390, 844], [430, 932]]) {
    const mobile = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
    await mobile.addInitScript((saved) => {
      localStorage.setItem('findtrail:data:v3', saved)
      localStorage.setItem('findtrail:onboarding-complete-v1', '1')
    }, activeData)
    const small = await mobile.newPage()
    small.on('pageerror', (error) => issues.push(width + 'px CLEAR runtime: ' + error.message))
    await small.goto(URL + '?screen=calm')
    await small.locator('.clear-view.clear-ready').waitFor()
    await capture(small, 'clear-' + width + '-payoff')
    const layout = await small.evaluate(() => {
      const box = (selector) => document.querySelector(selector).getBoundingClientRect()
      const brand = box('.clear-brand')
      const exit = box('.clear-exit')
      const action = box('.clear-action')
      return { brandRight: brand.right, exitLeft: exit.left, actionLeft: action.left, actionRight: action.right, actionHeight: action.height }
    })
    assert.ok(layout.brandRight + 4 <= layout.exitLeft, width + 'px: CLEAR header controls overlap')
    assert.ok(layout.actionLeft >= 0 && layout.actionRight <= width && layout.actionHeight >= 48, width + 'px: primary action is clipped or too small')
    await small.evaluate(() => document.documentElement.setAttribute('data-text-size', 'large'))
    await capture(small, 'clear-' + width + '-large-text')
    if (width === 390) {
      await small.addScriptTag({ content: axe.source })
      const audit = await small.evaluate(() => window.axe.run(document.querySelector('.clear-view'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }))
      console.log('CLEAR WCAG audit', JSON.stringify({ violations: audit.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length })), incomplete: audit.incomplete.map((check) => ({ id: check.id, nodes: check.nodes.length })) }))
      assert.deepEqual(audit.violations, [], 'CLEAR WCAG 2.1 AA automated audit')
    }
    await mobile.close()
  }

  const interrupted = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await interrupted.addInitScript((saved) => {
    localStorage.setItem('findtrail:data:v3', saved)
    localStorage.setItem('findtrail:onboarding-complete-v1', '1')
  }, activeData)
  const pausedPage = await interrupted.newPage()
  await pausedPage.goto(URL + '?screen=calm')
  await pausedPage.waitForTimeout(1800)
  // Headless Chromium keeps background tabs visible, so dispatch the browser's
  // visibility event with a hidden document to exercise the real page handler.
  await pausedPage.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await pausedPage.waitForTimeout(5000)
  assert.equal(await pausedPage.locator('.clear-ready').count(), 0, 'hidden CLEAR does not advance to final state')
  await pausedPage.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await pausedPage.locator('.clear-ready').waitFor({ timeout: 6000 })
  console.log('CLEAR visibility interruption paused and resumed progression.')
  await interrupted.close()

  const offline = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' })
  await offline.addInitScript((saved) => {
    if (!localStorage.getItem('findtrail:data:v3')) localStorage.setItem('findtrail:data:v3', saved)
    localStorage.setItem('findtrail:onboarding-complete-v1', '1')
  }, activeData)
  const offlinePage = await offline.newPage()
  await offlinePage.goto(URL + '?screen=calm')
  await offlinePage.evaluate(() => navigator.serviceWorker.ready.then(() => navigator.serviceWorker.controller || new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(navigator.serviceWorker.controller), { once: true }))))
  const savedBeforeOffline = await offlinePage.evaluate(() => localStorage.getItem('findtrail:data:v3'))
  await offline.setOffline(true)
  await offlinePage.reload({ waitUntil: 'domcontentloaded' })
  const offlineImage = await offlinePage.locator('.clear-scene img').evaluate(async (img) => { await img.decode(); return img.naturalWidth })
  assert.ok(offlineImage >= 500, 'installed CLEAR photograph should load offline')
  const cachedMedia = await offlinePage.evaluate(async () => {
    const paths = ['/clear-dawn.webp', '/home-memory-trail.webp', '/findtrail-reset-lake.webp', '/findtrail-natural-feather-v2.webp', '/findtrail-water-impact.mp4']
    return Promise.all(paths.map(async (path) => ({ path, status: (await fetch(path)).status })))
  })
  assert.ok(cachedMedia.every((asset) => asset.status === 200), 'all installed photographic and reset media load offline')
  assert.equal(await offlinePage.evaluate(() => localStorage.getItem('findtrail:data:v3')), savedBeforeOffline, 'offline CLEAR does not change saved search')
  await offlinePage.getByRole('button', { name: 'Back to search' }).click()
  await offlinePage.locator('.trail-view').waitFor()
  assert.equal(await offlinePage.locator('.trail-view h1').textContent(), trailHeading, 'interrupted offline CLEAR returns to the exact trail')
  console.log('CLEAR offline reload and media passed:', cachedMedia.map((asset) => asset.path).join(', '))
  await offline.close()
  assert.deepEqual(issues, [], 'runtime console errors')
  console.log('FindTrail browser smoke QA passed.')
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
