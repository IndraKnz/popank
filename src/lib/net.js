/**
 * Lapisan kehadiran (presence) sederhana untuk Ever Tide.
 *
 * Strategi:
 *  1. BroadcastChannel  → sinkron instan antar-tab di browser yang sama.
 *  2. WebSocket         → room online lintas perangkat. Build produksi memakai
 *                         origin yang sama (`/room`), karena `npm start`
 *                         menyajikan situs + relay dari satu proses.
 *                         Saat `npm run dev`, isi VITE_ROOM_WS (mis.
 *                         ws://localhost:8080/room) untuk ikut online.
 *
 * Pesan: { t:'s', id, n:name, a:avatar, p:[x,y,z], r:rotY, an:anim, ts }
 * Pesan foto: { t:'ph', id, ph:[dataUrl,...] }  (dikirim sekali, bukan 10×/detik)
 * Pesan keluar juga menyertakan 'bye' saat keluar.
 */

const SEND_HZ = 10
const TTL = 4000
const MAX_RETRY = 5

/**
 * Alamat relay WebSocket.
 *  - VITE_ROOM_WS menang kalau diisi (mis. saat `npm run dev`).
 *  - Build produksi memakai origin yang sama (`/room`), karena `npm start`
 *    menyajikan situs dan relay dari satu proses.
 *  - Saat dev tanpa VITE_ROOM_WS, cukup BroadcastChannel.
 */
function resolveWsUrl() {
  const explicit = import.meta.env.VITE_ROOM_WS
  if (explicit) return explicit
  if (import.meta.env.DEV) return ''
  if (typeof window === 'undefined') return ''
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/room`
}

class RoomNet {
  constructor() {
    this.code = null
    this.self = null
    this.photos = []
    this.onPhotos = null
    this.peers = new Map()
    this.listeners = new Set()
    this.channel = null
    this.ws = null
    this.wsUrl = ''
    this.online = false
    this.retry = 0
    this.retryTimer = null
    this.sendTimer = null
    this.pruneTimer = null
    this.lastState = null
    this.enabled = false
  }

  connect({ code, self, photos = [] }) {
    if (this.code === code && this.enabled) return
    this.disconnect()
    this.code = code
    this.self = self
    this.photos = Array.isArray(photos) ? photos : []
    this.enabled = true
    this.retry = 0

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`evertide:${code}`)
      this.channel.onmessage = (e) => this.#onMessage(e.data)
    }

    this.wsUrl = resolveWsUrl()
    if (this.wsUrl) this.#openSocket()

    this.sendTimer = setInterval(() => {
      if (this.lastState) this.#broadcast(this.lastState)
    }, 1000 / SEND_HZ)

    this.pruneTimer = setInterval(() => this.#prune(), 1200)

    // kirim foto poster ke peserta lain setelah kanal siap
    setTimeout(() => this.sendPhotos(), 400)
  }

  #openSocket() {
    if (!this.enabled || !this.wsUrl) return
    let socket
    try {
      const url = new URL(this.wsUrl)
      url.searchParams.set('room', this.code)
      socket = new WebSocket(url)
    } catch {
      return
    }
    this.ws = socket

    socket.onopen = () => {
      if (this.ws !== socket) return
      this.retry = 0
      this.online = true
      // sambungkan ulang → kabari posisi terakhir & foto
      if (this.lastState) this.#broadcast(this.lastState)
      this.sendPhotos()
    }
    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        this.#onMessage(msg?.data ?? msg)
      } catch {}
    }
    socket.onerror = () => {}
    socket.onclose = () => {
      if (this.ws !== socket) return
      this.ws = null
      this.online = false
      // putus tak sengaja → coba sambung lagi (backoff, berhenti setelah MAX_RETRY)
      if (this.enabled && this.retry < MAX_RETRY) {
        const wait = Math.min(15000, 1000 * 2 ** this.retry)
        this.retry++
        clearTimeout(this.retryTimer)
        this.retryTimer = setTimeout(() => this.#openSocket(), wait)
      }
    }
  }

  /** Bagikan delapan foto poster (host) — sekali saja, bukan tiap frame. */
  sendPhotos(photos) {
    if (photos) this.photos = photos
    if (!this.enabled || !this.photos?.some(Boolean)) return
    this.#broadcast({ t: 'ph', id: this.self?.id, ph: this.photos })
  }

  updateState(state) {
    this.lastState = { ...state, t: 's', id: this.self?.id, n: this.self?.name, a: this.self?.avatar }
    if (!this.enabled) return
    this.#broadcast(this.lastState)
  }

  #broadcast(msg) {
    try {
      this.channel?.postMessage(msg)
    } catch {}
    if (this.ws?.readyState === 1) {
      try {
        this.ws.send(JSON.stringify(msg))
      } catch {}
    }
  }

  #onMessage(msg) {
    if (!msg || !msg.id) return
    if (msg.id === this.self?.id) return

    // foto poster dari peserta lain (biasanya host)
    if (msg.t === 'ph') {
      if (Array.isArray(msg.ph) && this.onPhotos) this.onPhotos(msg.ph)
      return
    }

    if (msg.t !== 's') return
    const prev = this.peers.get(msg.id)
    this.peers.set(msg.id, {
      id: msg.id,
      name: msg.n || 'Teman',
      avatar: msg.a || null,
      p: msg.p || [0, 0, 0],
      r: msg.r || 0,
      an: msg.an || 'idle',
      ts: Date.now(),
      isNew: !prev,
    })
    if (!prev) {
      this.#emit()
      // peserta baru bergabung → kirim ulang foto agar ia ikut melihatnya
      this.sendPhotos()
    }
  }

  #prune() {
    const now = Date.now()
    let changed = false
    for (const [id, peer] of this.peers) {
      if (now - peer.ts > TTL) {
        this.peers.delete(id)
        changed = true
      }
    }
    if (changed) this.#emit()
  }

  #emit() {
    const list = [...this.peers.values()].map(({ id, name, avatar }) => ({ id, name, avatar }))
    this.listeners.forEach((fn) => fn(list))
  }

  subscribe(fn) {
    this.listeners.add(fn)
    fn([...this.peers.values()].map(({ id, name, avatar }) => ({ id, name, avatar })))
    return () => this.listeners.delete(fn)
  }

  disconnect() {
    // matikan dulu supaya onclose tidak memicu sambung ulang
    this.enabled = false
    this.online = false
    clearInterval(this.sendTimer)
    clearInterval(this.pruneTimer)
    clearTimeout(this.retryTimer)
    this.retryTimer = null
    if (this.channel) {
      try {
        this.#broadcast({ t: 'bye', id: this.self?.id })
        this.channel.close()
      } catch {}
    }
    const socket = this.ws
    this.ws = null
    try {
      socket?.close()
    } catch {}
    this.channel = null
    this.peers.clear()
  }
}

export const net = new RoomNet()
