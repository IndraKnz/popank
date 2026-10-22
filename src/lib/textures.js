import * as THREE from 'three'

/** Tekstur pasir prosedural: butiran halus + riak gelombang, hampir putih
 *  supaya bisa dikalikan dengan warna vertex tanpa menggelapkan. */
let sandTex = null
export function getSandTexture() {
  if (sandTex) return sandTex
  const size = 512
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  // riak pasir
  for (let i = 0; i < 26; i++) {
    const y = Math.random() * size
    ctx.beginPath()
    ctx.strokeStyle = `rgba(120,90,60,${0.02 + Math.random() * 0.035})`
    ctx.lineWidth = 1 + Math.random() * 2.4
    for (let x = 0; x <= size; x += 8) {
      const yy = y + Math.sin((x / size) * Math.PI * 4 + i) * 6
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }

  // butiran
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 16
    d[i] = Math.min(255, Math.max(0, d[i] + n))
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n))
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)

  sandTex = new THREE.CanvasTexture(c)
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping
  sandTex.repeat.set(26, 26)
  sandTex.colorSpace = THREE.SRGBColorSpace
  sandTex.anisotropy = 4
  return sandTex
}

/** Papan kayu: serat memanjang. */
let woodTex = null
export function getWoodTexture() {
  if (woodTex) return woodTex
  const w = 256
  const h = 256
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * h
    ctx.beginPath()
    ctx.strokeStyle = `rgba(70,40,20,${0.04 + Math.random() * 0.09})`
    ctx.lineWidth = 0.5 + Math.random() * 2
    for (let x = 0; x <= w; x += 6) {
      const yy = y + Math.sin((x / w) * Math.PI * 3 + i * 0.7) * 3
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  woodTex = new THREE.CanvasTexture(c)
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping
  woodTex.colorSpace = THREE.SRGBColorSpace
  return woodTex
}
