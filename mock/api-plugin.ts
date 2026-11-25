// Local mock API for `vite` and `vite preview`. Serve-only: it adds no build transforms,
// so it does not take part in the five-plugin chain under test.
import type { Connect, Plugin } from 'vite'
import { activityFor, detailFor, generateItems } from './data.ts'

// Fixed artificial latency per endpoint (ms). Reported alongside every timing.
export const DELAY = { list: 30, item: 40, activity: 150, save: 40 } as const

const items = generateItems()
const byId = new Map(items.map((item) => [item.id, item]))
const listBody = JSON.stringify(items)

export const middleware: Connect.NextHandleFunction = (req, res, next) => {
  const url = req.url ?? ''
  if (!url.startsWith('/api/')) return next()
  const path = url.split('?')[0]!
  const send = (status: number, body: string, delay: number) => {
    setTimeout(() => {
      res.statusCode = status
      res.setHeader('content-type', 'application/json')
      res.setHeader('cache-control', 'no-store')
      res.end(body)
    }, delay)
  }
  if (path === '/api/items') return send(200, listBody, DELAY.list)
  const match = /^\/api\/items\/(\d+)(\/activity)?$/.exec(path)
  const item = match && byId.get(match[1]!)
  if (!match || !item) return send(404, '{"error":"not found"}', 0)
  if (match[2]) return send(200, JSON.stringify(activityFor(item.id)), DELAY.activity)
  if (req.method === 'POST') {
    // Stateless echo: the mock never mutates, so repeated benchmark runs see identical data.
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => send(200, JSON.stringify({ ...detailFor(item), ...JSON.parse(raw || '{}') }), DELAY.save))
    return
  }
  return send(200, JSON.stringify(detailFor(item)), DELAY.item)
}

export function mockApi(): Plugin {
  return {
    name: 'mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
