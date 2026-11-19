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
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
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
  await visitScreen(page, '.reset-journey', 'reset-390-ready')
  assert.equal(await page.locator('.reset-next').count(), 0, 'the next spot waits until the breathing guide ends')
  const lake = page.locator('.reset-journey__lake')
  await lake.evaluate((image) => image.decode())
  const continueTrail = page.getByRole('button', { name: 'Continue trail' })
  const leaveForHome = page.getByRole('button', { name: 'Back to home' })
  assert.ok(await continueTrail.isVisible() && await leaveForHome.isVisible(), 'both exits stay available during breathing')
  const surface = page.locator('.reset-journey__water--depth')
  const fogSample = () => surface.evaluate((canvas) => {
    const { width, height } = canvas
    const gl = canvas.getContext('webgl')
    if (!gl || !canvas.dataset.motionPhase) return null
    const data = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data)
    let opacity = 0
    let depth = 0
    let aboveWater = 0
    let nearWater = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3]
        opacity += alpha
        depth += alpha * (height - 1 - y)
        if ((height - 1 - y) / height < .34) aboveWater += alpha
        if ((height - 1 - y) / height > .54) nearWater += alpha
      }
    }
    const area = width * height
    return { depth: opacity ? depth / opacity / height : 0, amount: opacity / area, aboveWater: aboveWater / area, nearWater: nearWater / area }
  })
  const waveSample = () => surface.evaluate((canvas) => {
    const { width, height } = canvas
    const gl = canvas.getContext('webgl')
    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    function band(top, bottom) {
      const color = []
      let coverage = 0
      for (let y = Math.round(height * top); y < height * bottom; y += 4) {
        for (let x = Math.round(width * .27); x < width * .76; x += 5) {
          const i = ((height - 1 - y) * width + x) * 4
          coverage += pixels[i + 3]
          color.push(pixels[i] * .30 + pixels[i + 1] * .59 + pixels[i + 2] * .11)
        }
      }
      return { coverage: coverage / color.length, color }
    }
    return { source: band(.67, .76), distance: band(.465, .535) }
  })
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  assert.equal(await surface.getAttribute('data-motion-phase'), null, 'lake opens still')
  await page.getByRole('button', { name: 'Start breathing' }).evaluate((button) => button.click())
  await page.clock.runFor(40)
  await page.clock.fastForward(2060)
  assert.equal(await page.locator('.reset-breathing__phase').textContent(), 'Breathe in')
  assert.equal(await page.locator('.reset-breathing__hint').textContent(), 'Breath 1 of 3')
  const mistFar = await fogSample()
  await page.clock.fastForward(2300)
  const mistNear = await fogSample()
  assert.ok(mistNear.nearWater > mistFar.nearWater + 2, 'the base of the fog moves toward the viewer as the top rises')
  assert.ok(mistNear.aboveWater > mistFar.aboveWater + 2, 'inhale builds visible fog above the water')
  await capture(page, 'reset-inhale-390')
  await page.clock.fastForward(2200)
  assert.equal(await page.locator('.reset-breathing__phase').textContent(), 'Hold gently')
  const held = await fogSample()
  assert.ok(held.amount < mistNear.amount * .60, 'the fog thins as it reaches the foreground')
  await page.clock.fastForward(800)
  assert.deepEqual(await fogSample(), held, 'mist hangs still during the brief hold')
  await page.clock.fastForward(1500)
  assert.equal(await page.locator('.reset-breathing__phase').textContent(), 'Breathe out')
  const returnMist = await fogSample()
  assert.ok(returnMist.aboveWater > held.aboveWater + 1, 'the released fog rolls back out above the water with the ripples')
  const first = await waveSample()
  assert.ok(first.source.coverage > 40, 'new crests start in the foreground')
  await capture(page, 'reset-exhale-390')
  let previous = first
  for (let second = 2; second <= 8; second++) {
    await page.clock.fastForward(second === 8 ? 850 : 1000)
    const current = await waveSample()
    const motion = current.source.color.reduce((sum, shade, index) => sum + Math.abs(shade - previous.source.color[index]), 0) / current.source.color.length
    assert.ok(current.source.coverage > 40 && motion > .45, `fresh ripples remain visible in the source area at second ${second} (change ${motion})`)
    previous = current
  }
  assert.ok(previous.distance.coverage > first.distance.coverage + 30, 'earlier ripples reach farther into the lake')
  const shoreline = await surface.evaluate((canvas) => {
    const gl = canvas.getContext('webgl')
    const program = gl.getParameter(gl.CURRENT_PROGRAM)
    const wave = gl.getUniformLocation(program, 'uWaveTime')
    const time = gl.getUniform(program, wave)
    const { width, height } = canvas
    const readFrame = () => {
      const pixels = new Uint8Array(width * height * 4)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      return pixels
    }
    const active = readFrame()
    let still
    try {
      gl.uniform1f(wave, -1)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      still = readFrame()
    } finally {
      gl.uniform1f(wave, time)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const change = (left, right, top, bottom) => {
      let peak = 0
      for (let y = Math.round(height * top); y < height * bottom; y++) {
        for (let x = Math.round(width * left); x < width * right; x++) {
          const i = ((height - 1 - y) * width + x) * 4
          peak = Math.max(peak, Math.abs(active[i] - still[i]), Math.abs(active[i + 3] - still[i + 3]))
        }
      }
      return peak
    }
    return { farWater: change(.57, .88, .332, .343), dryBank: change(.12, .38, .333, .342) }
  })
  assert.ok(shoreline.farWater > 10, 'crests visibly reach the far waterline')
  assert.equal(shoreline.dryBank, 0, 'the shoreline confines wave motion to the lake')
  const regathered = await fogSample()
  assert.ok(regathered.aboveWater > .08, 'released fog gathers above the distant water')
  await capture(page, 'reset-outward-waves-390')
  await page.clock.fastForward(400)
  assert.equal(await page.locator('.reset-breathing__phase').textContent(), 'Breathe in', 'the next inhale begins after the exhale')
  assert.equal(await page.locator('.reset-breathing__hint').textContent(), 'Breath 2 of 3')
  assert.ok(Math.abs((await fogSample()).aboveWater - regathered.aboveWater) < 1.5, 'gathered fog carries smoothly into the next inhale')
  await page.clock.fastForward(16000)
  assert.equal(await page.locator('.reset-breathing__hint').textContent(), 'Breath 3 of 3')
  await page.clock.fastForward(16000)
  assert.equal(await page.locator('.reset-breathing__phase').textContent(), 'Reset complete')
  assert.equal(await page.locator('.reset-next strong').textContent(), nextSpot, 'finish with the next unchecked spot')
  await capture(page, 'reset-390-next-step')
  await page.clock.resume()
  await continueTrail.click()
  await page.locator('.trail-view').waitFor()
  assert.equal(await page.locator('.trail-view h1').first().textContent(), trailHeading, 'reset resumes the exact trail heading')
  await capture(page, 'trail-390-after-reset')
  await page.locator('.trail-reset-button').first().click()
  await page.getByRole('button', { name: 'Start breathing' }).click()
  await leaveForHome.click()
  await page.getByRole('button', { name: 'Resume trail' }).click()
  assert.equal(await page.locator('.spot-row.is-next .spot-row__label').textContent(), nextSpot, 'leaving for Home keeps checked spots and the current trail')

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
  const lakeSize = await page.evaluate(async () => (await (await fetch('./findtrail-lake-cove.webp')).blob()).size)
  assert.ok(lakeSize > 0, 'lake artwork is available offline')
  await page.getByRole('button', { name: 'Continue search' }).click()
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
  await still.clock.install()
  await still.getByRole('button', { name: 'Start breathing' }).click()
  await still.clock.runFor(10500)
  assert.equal(await still.locator('.reset-breathing__phase').textContent(), 'Breathe out')
  assert.equal(await still.locator('.reset-journey__water[data-motion-phase]').count(), 0)
  await reduced.close()

  const compatible = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await compatible.addInitScript(() => { window.WebGLRenderingContext = undefined })
  const fallback = await compatible.newPage()
  await fallback.goto(URL)
  await fallback.getByRole('navigation', { name: 'Main sections' }).getByRole('button', { name: 'Reset' }).click()
  await fallback.getByRole('button', { name: 'Start breathing' }).click()
  await fallback.locator('.reset-journey__water--fallback[data-motion-phase="inhale"]').waitFor()
  await fallback.getByRole('button', { name: 'Back to home' }).click()
  await fallback.locator('.home-view').waitFor()
  await compatible.close()
  assert.deepEqual(issues, [], 'runtime console errors')
  console.log('FindTrail browser smoke QA passed.')
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
