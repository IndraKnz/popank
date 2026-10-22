/**
 * Lapisan kehadiran (presence) sederhana untuk Ever Tide.
 *
 * Strategi:
 *  1. BroadcastChannel  → sinkron instan antar-tab/perangkat di browser yang sama
 *                          (sangat berguna untuk menguji multiplayer).
 *  2. WebSocket opsional → isi VITE_ROOM_WS (mis. wss://server-kamu/room) untuk
 *                          room online lintas perangkat. Protokol pesan identik.
 *
 * Pesan: { t:'s', id, n:name, a:avatar, p:[x,y,z], r:rotY, an:anim, ts }
 * Pesan foto: { t:'ph', id, ph:[dataUrl,...] }  (dikirim sekali, bukan 10×/detik)
 * Pesan keluar juga menyertakan 'bye' saat keluar.
 */

const SEND_HZ = 10
const TTL = 4000

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

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`evertide:${code}`)
      this.channel.onmessage = (e) => this.#onMessage(e.data)
    }

    const wsUrl = import.meta.env.VITE_ROOM_WS
    if (wsUrl) {
      try {
        const url = new URL(wsUrl)
        url.searchParams.set('room', code)
        this.ws = new WebSocket(url)
        this.ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data)
            this.#onMessage(msg?.data ?? msg)
          } catch {}
        }
        this.ws.onopen = () => {
          if (this.lastState) this.#broadcast(this.lastState)
          this.sendPhotos()
        }
      } catch {
        this.ws = null
      }
    }

    this.sendTimer = setInterval(() => {
      if (this.lastState) this.#broadcast(this.lastState)
    }, 1000 / SEND_HZ)

    this.pruneTimer = setInterval(() => this.#prune(), 1200)

    // kirim foto poster ke peserta lain setelah kanal siap
    setTimeout(() => this.sendPhotos(), 400)
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
    clearInterval(this.sendTimer)
    clearInterval(this.pruneTimer)
    if (this.channel) {
      try {
        this.#broadcast({ t: 'bye', id: this.self?.id })
        this.channel.close()
      } catch {}
    }
    try {
      this.ws?.close()
    } catch {}
    this.channel = null
    this.ws = null
    this.peers.clear()
    this.enabled = false
  }
}

export const net = new RoomNet()
