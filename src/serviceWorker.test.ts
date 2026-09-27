import { describe, expect, it, vi } from 'vitest'
import source from '../public/sw.js?raw'

function worker() {
  const handlers: Record<string, (event: { request: Request; respondWith: (response: Promise<Response>) => void }) => void> = {}
  const cached = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  const network = vi.fn()
  const self = {
    registration: { scope: 'https://example.com/findtrail/' },
    location: { origin: 'https://example.com' },
    addEventListener: (name: string, callback: typeof handlers[string]) => { handlers[name] = callback },
  }
  new Function('self', 'caches', 'fetch', source)(self, { match: async () => new Response(cached) }, network)
  return async (range: string) => {
    let result: Promise<Response> | undefined
    handlers.fetch({ request: new Request('https://example.com/findtrail/findtrail-water-impact.mp4', { headers: { Range: range } }), respondWith: response => { result = response } })
    return result!
  }
}

describe('offline reset video', () => {
  it.each([
    ['bytes=2-5', [2, 3, 4, 5], 'bytes 2-5/10'],
    ['bytes=7-', [7, 8, 9], 'bytes 7-9/10'],
    ['bytes=-3', [7, 8, 9], 'bytes 7-9/10'],
  ])('serves cached media range %s', async (range, bytes, contentRange) => {
    const response = await worker()(range as string)
    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe(contentRange)
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual(bytes)
  })

  it('rejects an out-of-bounds media range', async () => {
    const response = await worker()('bytes=15-20')
    expect(response.status).toBe(416)
    expect(response.headers.get('Content-Range')).toBe('bytes */10')
  })
})
