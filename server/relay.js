/**
 * Ever Tide — relay multiplayer.
 *
 * Satu proses, dua tugas:
 *   1. Menyajikan hasil build (`dist/`) sebagai situs statis.
 *   2. Menjadi relay WebSocket di `/room?room=KODE` — meneruskan pesan JSON
 *      ke semua klien lain di ruang yang sama.
 *
 * Protokol klien (lihat src/lib/net.js):
 *   { t:'s',  id, n, a, p:[x,y,z], r, an }  posisi 10×/detik
 *   { t:'ph', id, ph:[dataUrl,…] }          delapan foto poster, sekali
 *   { t:'bye', id }                          keluar
 *
 * Jalankan: PORT=8080 node server/relay.js
 */

import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(HERE, '..', 'dist')
const PORT = Number(process.env.PORT) || 8080
const HOST = process.env.HOST || '0.0.0.0'

/* Pesan terbesar: 8 foto × ~150 KB base64 masih di bawah 2 MB; 8 MB beri ruang. */
const MAX_PAYLOAD = 8 * 1024 * 1024
const MAX_PER_ROOM = Number(process.env.MAX_PER_ROOM) || 16
const HEARTBEAT_MS = 30_000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

/* ---------------------------------------------------------------- ruang */

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const rooms = new Map()

const roomOf = (ws) => ws.roomCode
const countIn = (code) => rooms.get(code)?.size ?? 0

function joinRoom(ws, code) {
  if (countIn(code) >= MAX_PER_ROOM) return false
  if (!rooms.has(code)) rooms.set(code, new Set())
  rooms.get(code).add(ws)
  ws.roomCode = code
  return true
}

function leaveRoom(ws) {
  const code = roomOf(ws)
  if (!code) return
  const set = rooms.get(code)
  if (!set) return
  set.delete(ws)
  if (set.size === 0) rooms.delete(code)
  ws.roomCode = null
}

/** Teruskan ke semua klien lain di ruang yang sama (pengirim tidak dikirimi). */
function relay(ws, payload) {
  const set = rooms.get(roomOf(ws))
  if (!set) return
  for (const peer of set) {
    if (peer === ws) continue
    if (peer.readyState !== 1) continue
    peer.send(payload)
  }
}

/* ------------------------------------------------------------- websocket */

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const code = (url.searchParams.get('room') || 'PUBLIC').toUpperCase().slice(0, 16) || 'PUBLIC'

  if (!joinRoom(ws, code)) {
    ws.close(1013, 'room penuh')
    return
  }

  ws.isAlive = true
  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', (raw, isBinary) => {
    if (isBinary) return
    if (raw.length > MAX_PAYLOAD) return

    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return
    // klien wajib punya id pendek; selain itu abaikan (cegah pesan aneh)
    if (typeof msg.id !== 'string' || msg.id.length === 0 || msg.id.length > 32) return

    if (msg.t === 'bye') {
      relay(ws, raw.toString())
      leaveRoom(ws)
      ws.close(1000, 'bye')
      return
    }
    if (msg.t !== 's' && msg.t !== 'ph') return

    relay(ws, raw.toString())
  })

  ws.on('close', () => leaveRoom(ws))
  ws.on('error', () => leaveRoom(ws))
})

/* Buang koneksi yang mati tanpa pamit (HP masuk kantong, wifi putus, …). */
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      leaveRoom(ws)
      ws.terminate()
      continue
    }
    ws.isAlive = false
    try {
      ws.ping()
    } catch {}
  }
}, HEARTBEAT_MS)
wss.on('close', () => clearInterval(heartbeat))

/* ------------------------------------------------------------------ http */

async function resolveFile(pathname) {
  // cegah path traversal: normalisasi lalu pastikan masih di dalam ROOT
  const safe = normalize(pathname).replace(/^([/\\])+/, '')
  const target = resolve(join(ROOT, safe))
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null

  try {
    const info = await stat(target)
    if (info.isFile()) return target
    if (info.isDirectory()) {
      const index = join(target, 'index.html')
      const idxInfo = await stat(index)
      if (idxInfo.isFile()) return index
    }
  } catch {}
  return null
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')

  if (url.pathname === '/health') {
    const list = [...rooms.entries()].map(([code, set]) => ({ code, count: set.size }))
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true, rooms: list, clients: wss.clients.size }))
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end('Method Not Allowed')
    return
  }

  const file = await resolveFile(decodeURIComponent(url.pathname))
  // SPA: rute tanpa ekstensi jatuh ke index.html
  const fallback = extname(url.pathname) ? null : await resolveFile('/index.html')
  const target = file || fallback

  if (!target) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(
      file
        ? 'Not found'
        : 'Belum ada hasil build. Jalankan `npm run build` dulu, lalu buka lagi.'
    )
    return
  }

  const ext = extname(target).toLowerCase()
  const isHtml = ext === '.html'
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    // aset ber-hash boleh di-cache lama, html jangan
    'cache-control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(target).pipe(res)
})

server.on('upgrade', (req, socket, head) => {
  let url
  try {
    url = new URL(req.url, 'http://localhost')
  } catch {
    socket.destroy()
    return
  }
  if (url.pathname !== '/room') {
    socket.destroy()
    return
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

server.listen(PORT, HOST, () => {
  console.log(`Ever Tide relay → http://${HOST}:${PORT}  (websocket: /room?room=KODE)`)
  console.log(`Menyajikan hasil build dari: ${ROOT}`)
})
