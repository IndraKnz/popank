/**
 * Utilitas tautan berbagi.
 * Seluruh "dunia" (nama, pesan, avatar) dikodekan ke dalam hash URL,
 * jadi penerima tautan langsung melihat dunia yang sama — tanpa server.
 */

const enc = (obj) => {
  const json = JSON.stringify(obj)
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const dec = (str) => {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

export function encodeWorld({ profile, avatar, room }) {
  return enc({
    v: 1,
    p: {
      partner: profile.partner?.slice(0, 40) || '',
      from: profile.from?.slice(0, 40) || '',
      message: profile.message?.slice(0, 900) || '',
      date: profile.date || '',
    },
    a: avatar,
    r: room || '',
  })
}

export function decodeWorld(hash) {
  if (!hash) return null
  const raw = hash.replace(/^#\/?w\/?/, '')
  if (!raw) return null
  const data = dec(raw)
  if (!data || data.v !== 1) return null
  return data
}

export function buildShareUrl({ profile, avatar, room }) {
  const payload = encodeWorld({ profile, avatar, room })
  const url = new URL(window.location.href)
  url.hash = `/w/${payload}`
  return url.toString()
}

/** Kode ruang pendek & stabil dari nama pasangan. */
export function roomCodeFrom(name) {
  const s = (name || 'evertide').toLowerCase().trim()
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  const alphabet = 'ACDEFGHJKLMNPQRTUVWXY3479'
  let out = ''
  let n = Math.abs(h)
  for (let i = 0; i < 6; i++) {
    out += alphabet[n % alphabet.length]
    n = Math.floor(n / alphabet.length) + 7
  }
  return out
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}

export function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
