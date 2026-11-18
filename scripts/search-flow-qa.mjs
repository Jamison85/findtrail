// Production-build browser checks. Uses isolated, synthetic browser storage.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')

const URL = 'http://127.0.0.1:4173/'
const output = 'qa/search-flow'
const errors = []
await mkdir(output, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' })
let browser

async function capture(page, label) {
  const layout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
  assert.ok(layout.document <= layout.viewport + 1 && layout.body <= layout.viewport + 1, `${label}: horizontal overflow ${JSON.stringify(layout)}`)
  await page.screenshot({ path: `${output}/${label}.png`, fullPage: true, animations: 'disabled' })
}

async function saved(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('findtrail:data:v3')).activeSearch)
}

async function advance(page) {
  await page.locator('.trail-action-dock__main .button--primary').click()
}

async function checkRecoveryContrast(page) {
  const pairs = await page.evaluate(() => [
    ['.recovery-step--priority p', '.recovery-step--priority'],
    ['.recovery-step--priority .recovery-step__number', '.recovery-step--priority .recovery-step__number'],
    ['.recovery-choice h2', '.recovery-choice'],
    ['.skipped-places__list button', '.skipped-places__list button'],
  ].map(([text, surface]) => ({ text, color: getComputedStyle(document.querySelector(text)).color, background: getComputedStyle(document.querySelector(surface)).backgroundColor })))
  const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
    const channel = value / 255
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
  for (const pair of pairs) {
    const values = [luminance(pair.color), luminance(pair.background)].sort((a, b) => b - a)
    const ratio = (values[0] + .05) / (values[1] + .05)
    assert.ok(ratio >= 4.5, `${pair.text}: contrast ${ratio.toFixed(2)} below 4.5:1`)
  }
}

try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(URL)).ok) break } catch { /* server starting */ }
    if (i === 59) throw new Error('Preview server did not start')
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
  for (const [width, height] of [[320, 700], [360, 800], [390, 844], [412, 915], [430, 932], [768, 1024]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(`${width}px: ${error.message}`))
    await page.goto(URL)
    await page.getByRole('button', { name: /^Keys/ }).click()
    assert.equal(await page.getByRole('button', { name: 'Start with likely places' }).count(), 0, 'essential item question cannot be bypassed')
    await page.getByRole('button', { name: 'House keys', exact: true }).click()
    await page.getByRole('heading', { name: 'Where do you last remember having them?' }).waitFor()
    const shortcut = page.getByRole('button', { name: 'Start with likely places' })
    await capture(page, `quick-start-${width}`)
    assert.ok((await shortcut.boundingBox()).y < height, 'quick start is visible without scrolling')
    await shortcut.focus()
    await page.keyboard.press('Enter')
    await page.locator('.trail-view').waitFor()
    const original = await saved(page)
    assert.deepEqual(original.answers, { itemDetail: 'house' }, 'unanswered clues are not invented')
    await page.locator('.spot-row').first().click()
    const checked = (await saved(page)).checkedSpots
    await page.reload()
    await page.getByRole('button', { name: 'Resume trail' }).click()
    assert.deepEqual((await saved(page)).checkedSpots, checked, 'checked progress survives reload')
    await capture(page, `trail-${width}`)

    // Mark a whole area and rebuild with the same clues. It must not reappear.
    await page.getByRole('button', { name: 'Search tools' }).click()
    await page.getByRole('button', { name: 'Already checked this whole area' }).click()
    await page.getByRole('button', { name: 'Edit clues', exact: true }).click()
    await page.getByRole('button', { name: 'House keys', exact: true }).click()
    await page.getByRole('button', { name: 'Start with likely places' }).click()
    const rerouted = await saved(page)
    assert.equal(rerouted.id, original.id, 'changing clues preserves search identity')
    assert.ok(!rerouted.stops.some((stop) => stop.id === original.stops[0].id), 'completed area stays out of rebuilt passes')
    assert.ok(rerouted.previousStops.some((stop) => stop.id === original.stops[0].id), 'completed area remains in history')

    for (let i = 0; i < 3; i++) await advance(page)
    await page.locator('.widen-view').waitFor()
    await capture(page, `wider-checkpoint-${width}`)
    await page.getByRole('button', { name: 'Save trail and return home' }).click()
    await page.getByText('Your first pass is saved. Choose whether to search wider.').waitFor()
    await capture(page, `resume-wider-${width}`)
    await page.reload()
    await page.getByRole('button', { name: 'Resume trail' }).click()
    await page.getByRole('heading', { name: 'Pause before going wider.' }).waitFor()
    await page.getByRole('button', { name: /^Search these/ }).click()
    // Reach the recovery checkpoint, retaining skipped and unfinished areas.
    for (let i = 0; i < 4; i++) await advance(page)
    await page.locator('.end-view').waitFor()
    await checkRecoveryContrast(page)
    await capture(page, `recovery-${width}`)
    await page.getByRole('button', { name: 'Save trail and return home' }).click()
    await page.getByText('Your route is saved. Choose your next move.').waitFor()
    await capture(page, `resume-recovery-${width}`)
    await page.getByRole('button', { name: 'Resume trail' }).click()
    await page.locator('.end-view').waitFor()
    await page.getByRole('button', { name: 'Update clues' }).click()
    await page.getByRole('button', { name: 'House keys', exact: true }).click()
    // Exercise browser text enlargement without modifying persisted preferences.
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    assert.equal(await page.locator('.choice-list').first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length), 1, 'enlarged clue choices reflow to a single readable column')
    await capture(page, `quick-start-large-text-${width}`)
    await context.close()
    console.log(`Search flow passed at ${width}px, including large text and reloads.`)
  }

  // Real animation timing: quick start cancels an in-flight clue handoff.
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(URL)
  await page.getByRole('button', { name: /^Keys/ }).click()
  await page.getByRole('button', { name: 'House keys', exact: true }).click()
  await page.getByRole('heading', { name: 'Where do you last remember having them?' }).waitFor()
  // Tap the shortcut without waiting for the 220ms selection animation.
  await page.getByRole('button', { name: /At home/ }).click()
  await page.getByRole('button', { name: 'Start with likely places' }).click()
  await page.locator('.trail-view').waitFor()
  await page.waitForTimeout(350)
  assert.equal((await saved(page)).answers.lastPlace, 'home', 'pending clue answer is retained')
  assert.equal(await page.locator('.clue-view').count(), 0, 'pending timer cannot return to clues')
  await context.close()
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log('FindTrail search flow browser QA passed.')
} catch (error) {
  for (const context of browser?.contexts() ?? []) {
    for (const page of context.pages()) {
      if (page.isClosed()) continue
      await page.screenshot({ path: `${output}/failure-${page.viewportSize()?.width ?? 'unknown'}.png`, fullPage: true }).catch(() => {})
      console.error('Failed-page state:', await page.evaluate(() => ({
        heading: document.querySelector('h1')?.textContent,
        motion: document.documentElement.dataset.motion,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        spot: (() => {
          const element = document.querySelector('.spot-row')
          if (!element) return null
          const style = getComputedStyle(element)
          return { rect: element.getBoundingClientRect().toJSON(), transform: style.transform, animation: style.animation }
        })(),
      })).catch(() => null))
    }
  }
  throw error
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
