import { chromium } from 'playwright'
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const output = new URL('../docs/feather-preview/', import.meta.url).pathname
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
})
const url = process.env.FINDTRAIL_URL || 'http://127.0.0.1:5173/?screen=calm'
const times = [
  ['release', .4], ['free-drift', 4.4], ['approach', 9.4],
  ['before-contact', 11.85], ['first-contact', 12.25],
  ['settled', 13.4], ['floating', 17.5],
]

async function tipError(page) {
  return page.evaluate(() => {
    const scene = document.querySelector('.horizon-ripples')
    const anchor = document.querySelector('.calm-feather-anchor')
    const feather = document.querySelector('.calm-feather')
    if (!(scene instanceof HTMLElement) || !(anchor instanceof HTMLElement) || !(feather instanceof HTMLImageElement)) throw new Error('Reset is missing')
    const width = feather.offsetWidth
    const height = feather.offsetHeight
    const origin = { x: width * .52, y: height * .54 }
    const point = new DOMPoint(width * .543 - origin.x, height * .934 - origin.y)
      .matrixTransform(new DOMMatrix(getComputedStyle(feather).transform))
    const box = anchor.getBoundingClientRect()
    const sceneBox = scene.getBoundingClientRect()
    const actual = { x: box.left + origin.x + point.x, y: box.top + origin.y + point.y }
    const target = { x: sceneBox.left + sceneBox.width / 2, y: sceneBox.top + parseFloat(getComputedStyle(scene.parentElement).getPropertyValue('--water-touch-y')) }
    return { actual, target, errorPx: Math.hypot(actual.x - target.x, actual.y - target.y) }
  })
}

async function capture(width, height, record) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    ...(record ? { recordVideo: { dir: output, size: { width, height } } } : {}),
  })
  const page = await context.newPage()
  await page.goto(url)
  await page.locator('.calm-feather').waitFor({ state: 'visible' })
  await page.waitForTimeout(500) // scene entrance, before the Begin clock
  await page.getByRole('button', { name: 'Begin breathing reset' }).click()
  const start = await page.evaluate(() => performance.now())
  const samples = []
  for (const [name, second] of times) {
    const elapsed = (await page.evaluate(() => performance.now()) - start) / 1000
    await page.waitForTimeout(Math.max(0, (second - elapsed) * 1000))
    await page.screenshot({ path: join(output, `${width}-${name}.png`) })
    if (name === 'first-contact' || name === 'settled' || name === 'floating') {
      samples.push({ width, state: name, ...(await tipError(page)) })
    }
  }
  if (record) {
    const video = page.video()
    await context.close()
    if (video) {
      const webm = join(output, `${width}-realtime.webm`)
      renameSync(await video.path(), webm)
      const result = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', webm, '-c:v', 'libx264', '-preset', 'medium', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(output, `${width}-realtime.mp4`)], { stdio: 'inherit' })
      if (result.status !== 0) throw new Error('Could not encode the real-time preview')
      unlinkSync(webm)
    }
  } else await context.close()
  return samples
}

try {
  const results = (await Promise.all([capture(360, 780, false), capture(390, 844, true)])).flat()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(url)
  await page.locator('.calm-feather').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Begin breathing reset' }).click()
  await page.waitForTimeout(12_300)
  await page.setViewportSize({ width: 360, height: 720 })
  await page.waitForTimeout(100)
  results.push({ width: 360, state: 'live-resize', ...(await tipError(page)) })
  await page.close()
  writeFileSync(join(output, 'geometry.json'), JSON.stringify(results, null, 2) + '\n')
  if (results.some((entry) => entry.errorPx > 4)) throw new Error('Quill and ripple are more than 4 px apart')
  console.log(results)
} finally {
  await browser.close()
}
