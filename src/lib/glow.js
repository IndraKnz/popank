import * as THREE from 'three'

let glowTex = null

/** Tekstur radial lembut untuk efek cahaya (lentera, kunang-kunang, matahari). */
export function getGlowTexture() {
  if (glowTex) return glowTex
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.22, 'rgba(255,236,205,0.85)')
  g.addColorStop(0.5, 'rgba(255,190,140,0.28)')
  g.addColorStop(1, 'rgba(255,160,110,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  glowTex = new THREE.CanvasTexture(canvas)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}

let smokeTex = null
export function getSoftTexture() {
  if (smokeTex) return smokeTex
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  smokeTex = new THREE.CanvasTexture(canvas)
  smokeTex.colorSpace = THREE.SRGBColorSpace
  return smokeTex
}

let cloudTex = null
/** Awan lembut bergumpal untuk langit senja. */
export function getCloudTexture() {
  if (cloudTex) return cloudTex
  const w = 512
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  const puffs = [
    [0.5, 0.55, 0.30], [0.32, 0.58, 0.22], [0.68, 0.56, 0.24],
    [0.42, 0.44, 0.18], [0.6, 0.42, 0.16], [0.22, 0.62, 0.14],
    [0.78, 0.62, 0.15], [0.5, 0.68, 0.20],
  ]
  for (const [cx, cy, r] of puffs) {
    const g = ctx.createRadialGradient(cx * w, cy * h, 0, cx * w, cy * h, r * w)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.22)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx * w, cy * h, r * w, 0, Math.PI * 2)
    ctx.fill()
  }

  cloudTex = new THREE.CanvasTexture(canvas)
  cloudTex.colorSpace = THREE.SRGBColorSpace
  return cloudTex
}
