
import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE = 'https://api.api-tennis.com/tennis/'
const DEFAULT_TZ = 'Australia/Sydney'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const APIKEY = process.env.TENNIS_API_KEY
  if (!APIKEY) return res.status(500).json({ success: false, error: 'Missing TENNIS_API_KEY on server' })

  const allowed = new Set(['get_livescore','get_fixtures','get_H2H'])
  const method = String(req.query.method || '')
  if (!allowed.has(method)) return res.status(400).json({ success: false, error: 'Unsupported method' })

  const url = new URL(BASE)
  url.searchParams.set('APIkey', APIKEY)
  url.searchParams.set('timezone', DEFAULT_TZ)
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'method') continue
    if (typeof v === 'string') url.searchParams.set(k, v)
  }
  url.searchParams.set('method', method)

  try {
    const upstream = await fetch(url.toString())
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (e: any) {
    res.status(502).json({ success: false, error: e?.message || 'Upstream error' })
  }
}
