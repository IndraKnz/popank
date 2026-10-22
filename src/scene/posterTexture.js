import * as THREE from 'three'
import { loadImage } from '../lib/photo'

/**
 * Poster foto yang dipegang kerumunan NPC.
 * Digambar di canvas (bukan aset unduhan) lalu dipakai sebagai tekstur.
 *
 * Kalau pengguna belum mengunggah foto, poster diisi ilustrasi senja
 * bergaya potret siluet — supaya tetap terlihat seperti "foto",
 * bukan kotak kosong.
 */

const W = 640
const H = 840
const PAD = 52
const PHOTO_H = 560

/**
 * Kanvas digambar pada ruang desain 640×840, lalu diskalakan ke tekstur
 * lebih kecil. Delapan poster sekaligus = delapan tekstur, jadi ukuran
 * perlu ditekan agar hemat memori GPU di ponsel.
 */
const SCALE = 0.8

const cache = new Map()

/* ---------- helper kanvas ---------- */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function heartPath(ctx, cx, cy, s) {
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.42)
  ctx.bezierCurveTo(cx - s * 0.95, cy - s * 0.3, cx - s * 0.48, cy - s * 1.02, cx, cy - s * 0.4)
  ctx.bezierCurveTo(cx + s * 0.48, cy - s * 1.02, cx + s * 0.95, cy - s * 0.3, cx, cy + s * 0.42)
  ctx.closePath()
}

function mulberry(seed) {
  let a = seed * 1013904223
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function spacedText(ctx, text, cx, y, spacing) {
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
  let x = cx - total / 2
  const align = ctx.textAlign
  ctx.textAlign = 'left'
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y)
    x += widths[i] + spacing
  })
  ctx.textAlign = align
}

/* ---------- ilustrasi pengganti foto ---------- */

function drawSilhouette(ctx, cx, baseY, h, hair = 1) {
  const headR = h * 0.082
  const headY = baseY - h + headR * 1.1

  ctx.fillStyle = 'rgba(41,24,44,0.92)'

  // badan
  ctx.beginPath()
  ctx.moveTo(cx - h * 0.115, baseY)
  ctx.lineTo(cx - h * 0.092, baseY - h * 0.44)
  ctx.quadraticCurveTo(cx - h * 0.128, baseY - h * 0.63, cx - h * 0.058, baseY - h * 0.7)
  ctx.lineTo(cx + h * 0.058, baseY - h * 0.7)
  ctx.quadraticCurveTo(cx + h * 0.128, baseY - h * 0.63, cx + h * 0.092, baseY - h * 0.44)
  ctx.lineTo(cx + h * 0.115, baseY)
  ctx.closePath()
  ctx.fill()

  // leher
  ctx.fillRect(cx - headR * 0.32, headY + headR * 0.5, headR * 0.64, h * 0.09)

  // kepala
  ctx.beginPath()
  ctx.arc(cx, headY, headR, 0, Math.PI * 2)
  ctx.fill()

  // rambut
  ctx.beginPath()
  ctx.ellipse(cx, headY + headR * 0.15, headR * 1.1, headR * (0.72 + hair * 0.85), 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawFallback(ctx, x, y, w, h, seed = 3) {
  const rnd = mulberry(seed)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()

  // langit
  const sky = ctx.createLinearGradient(0, y, 0, y + h)
  sky.addColorStop(0, '#2b1c4a')
  sky.addColorStop(0.3, '#6b3a6d')
  sky.addColorStop(0.55, '#c05c74')
  sky.addColorStop(0.72, '#ff9d6c')
  sky.addColorStop(0.84, '#ffd3a4')
  sky.addColorStop(1, '#f5c295')
  ctx.fillStyle = sky
  ctx.fillRect(x, y, w, h)

  const horizon = y + h * 0.66
  const sunX = x + w * 0.68
  const sunY = horizon - 6

  // pendar matahari
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, w * 0.55)
  glow.addColorStop(0, 'rgba(255,244,214,0.95)')
  glow.addColorStop(0.22, 'rgba(255,205,150,0.5)')
  glow.addColorStop(1, 'rgba(255,150,110,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x, y, w, h)

  // piringan matahari
  ctx.fillStyle = '#fff5d4'
  ctx.beginPath()
  ctx.arc(sunX, sunY, w * 0.055, 0, Math.PI * 2)
  ctx.fill()

  // laut
  const sea = ctx.createLinearGradient(0, horizon, 0, y + h)
  sea.addColorStop(0, '#ffb78c')
  sea.addColorStop(0.18, '#c98a95')
  sea.addColorStop(0.55, '#6a4a68')
  sea.addColorStop(1, '#372a4c')
  ctx.fillStyle = sea
  ctx.fillRect(x, horizon, w, y + h - horizon)

  // kilau di permukaan
  for (let i = 0; i < 30; i++) {
    const p = i / 30
    const yy = horizon + p * (h * 0.24)
    const ww = (26 + p * 78) * (0.55 + rnd() * 0.9)
    ctx.globalAlpha = 0.34 * (1 - p)
    ctx.fillStyle = '#ffe6bc'
    ctx.beginPath()
    ctx.ellipse(sunX + (rnd() - 0.5) * 26, yy, ww, 1.4 + p * 1.8, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // pasir
  ctx.fillStyle = '#e6bd93'
  ctx.beginPath()
  ctx.moveTo(x, y + h)
  ctx.lineTo(x, y + h - 24)
  ctx.quadraticCurveTo(x + w * 0.5, y + h - 46, x + w, y + h - 16)
  ctx.lineTo(x + w, y + h)
  ctx.closePath()
  ctx.fill()

  // dua siluet berpegangan
  const baseY = y + h - 26
  drawSilhouette(ctx, x + w * 0.385, baseY, h * 0.47, 0.95)
  drawSilhouette(ctx, x + w * 0.6, baseY, h * 0.42, 1.35)

  // hati di antara mereka
  ctx.fillStyle = 'rgba(255,124,132,0.92)'
  heartPath(ctx, x + w * 0.493, baseY - h * 0.31, w * 0.032)
  ctx.fill()

  // bokeh hangat
  for (let i = 0; i < 16; i++) {
    const bx = x + rnd() * w
    const by = y + rnd() * h * 0.55
    const r = 2 + rnd() * 5
    ctx.globalAlpha = 0.06 + rnd() * 0.12
    ctx.fillStyle = '#ffd9a8'
    ctx.beginPath()
    ctx.arc(bx, by, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  ctx.restore()
}

/* ---------- bingkai & teks ---------- */

function drawBase(ctx, tint) {
  const paper = ctx.createLinearGradient(0, 0, 0, H)
  paper.addColorStop(0, '#fffaf2')
  paper.addColorStop(1, '#ffeacf')
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(200,64,44,0.16)'
  ctx.lineWidth = 3
  roundRect(ctx, 14, 14, W - 28, H - 28, 10)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(200,64,44,0.10)'
  ctx.lineWidth = 1.5
  roundRect(ctx, 24, 24, W - 48, H - 48, 6)
  ctx.stroke()
}

function drawPhoto(ctx, img) {
  const x = PAD
  const y = PAD
  const w = W - PAD * 2
  const h = PHOTO_H

  ctx.save()
  roundRect(ctx, x, y, w, h, 6)
  ctx.clip()

  if (img) {
    const s = Math.max(w / img.width, h / img.height)
    const dw = img.width * s
    const dh = img.height * s
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  } else {
    drawFallback(ctx, x, y, w, h)
  }

  // vignette lembut supaya menyatu dengan kertas
  const vg = ctx.createRadialGradient(x + w / 2, y + h / 2, w * 0.3, x + w / 2, y + h / 2, w * 0.78)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(60,30,20,0.22)')
  ctx.fillStyle = vg
  ctx.fillRect(x, y, w, h)
  ctx.restore()

  // garis tepi foto
  ctx.strokeStyle = 'rgba(120,70,45,0.22)'
  ctx.lineWidth = 2
  roundRect(ctx, x, y, w, h, 6)
  ctx.stroke()
}

function drawCaption(ctx, { headline, name, tint }) {
  // judul script
  ctx.fillStyle = tint
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 62
  ctx.font = `400 ${size}px "Great Vibes", "Cormorant Infant", cursive`
  while (ctx.measureText(headline).width > W - PAD * 2 - 24 && size > 26) {
    size -= 3
    ctx.font = `400 ${size}px "Great Vibes", "Cormorant Infant", cursive`
  }
  ctx.fillText(headline, W / 2, 676)

  // garis pemisah
  ctx.strokeStyle = `${tint}55`
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(W / 2 - 58, 716)
  ctx.lineTo(W / 2 - 14, 716)
  ctx.moveTo(W / 2 + 14, 716)
  ctx.lineTo(W / 2 + 58, 716)
  ctx.stroke()

  // hati kecil di tengah garis
  ctx.fillStyle = `${tint}cc`
  heartPath(ctx, W / 2, 714, 7)
  ctx.fill()

  // nama
  if (name) {
    ctx.fillStyle = '#5c3a30'
    ctx.textBaseline = 'middle'
    let ns = 30
    ctx.font = `700 ${ns}px Manrope, system-ui, sans-serif`
    while (ctx.measureText(name).width + 6 * name.length > W - PAD * 2 - 30 && ns > 14) {
      ns -= 1
      ctx.font = `700 ${ns}px Manrope, system-ui, sans-serif`
    }
    spacedText(ctx, name.toUpperCase(), W / 2, 752, 5.5)
  }

  // tanda kecil
  ctx.fillStyle = 'rgba(120,80,60,0.42)'
  ctx.font = '600 15px Manrope, system-ui, sans-serif'
  spacedText(ctx, 'DARI KAMI SEMUA', W / 2, 796, 3.4)
}

/* ---------- API ---------- */

/**
 * Tekstur poster (di-cache per kombinasi foto + teks + warna).
 * @returns {THREE.CanvasTexture}
 */
export function getPosterTexture({ photo = '', headline = 'Selamat Ulang Tahun', name = '', tint = '#c8402c' }) {
  const key = `${photo ? `${photo.length}:${photo.slice(-46)}` : 'none'}|${headline}|${name}|${tint}`
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * SCALE)
  canvas.height = Math.round(H * SCALE)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)

  const paint = (img) => {
    ctx.clearRect(0, 0, W, H)
    drawBase(ctx, tint)
    drawPhoto(ctx, img)
    drawCaption(ctx, { headline, name, tint })
  }

  paint(null)

  // gambar asli dimuat asinkron; begitu siap, poster digambar ulang
  if (photo) {
    loadImage(photo)
      .then((img) => {
        paint(img)
        tex.needsUpdate = true
      })
      .catch(() => {
        /* biarkan ilustrasi pengganti yang tampil */
      })
  }

  return tex
}
