import * as THREE from 'three'

/**
 * Konstanta dunia POPANK.
 * Arah matahari: rendah di atas laut, sedikit ke kanan (-Z adalah arah dermaga).
 */
export const SUN_DIR = new THREE.Vector3(0.34, 0.085, -1).normalize()

/**
 * Arah cahaya utama sengaja dibuat lebih tinggi dari piringan matahari.
 * Matahari di horizon terlihat indah, tetapi kalau benar-benar dipakai
 * sebagai arah lampu, semua permukaan datar jadi gelap.
 */
export const LIGHT_DIR = new THREE.Vector3(0.42, 0.8, -1).normalize()

export const COLORS = {
  sun: '#ffd9a0',
  sunCore: '#fff4d2',
  skyTop: '#2a1d4a',
  skyMid: '#7a3f70',
  skyHorizon: '#ff9a6a',
  skyWarm: '#ffcf9a',
  fog: '#e79a7a',
  waterDeep: '#0c3a4c',
  waterShallow: '#3ea3a9',
  sand: '#f6dbb4',
  sandWet: '#cda379',
  wood: '#8b5a3c',
  woodDark: '#5e3a26',
  leaf: '#3f7a4e',
  leafDark: '#2c5c3c',
  lantern: '#ffb765',
}

const c = (hex) => new THREE.Color(hex).convertSRGBToLinear()

export const LIN = {
  sun: c(COLORS.sun),
  sunCore: c(COLORS.sunCore),
  skyTop: c(COLORS.skyTop),
  skyMid: c(COLORS.skyMid),
  skyHorizon: c(COLORS.skyHorizon),
  skyWarm: c(COLORS.skyWarm),
  fog: c(COLORS.fog),
  waterDeep: c(COLORS.waterDeep),
  waterShallow: c(COLORS.waterShallow),
}

export const ISLAND_RADIUS = 26
export const SHORE_Y = 0

/** Tinggi permukaan pasir (dipakai juga oleh Player untuk berjalan). */
export function groundHeight(x, z) {
  const r = Math.hypot(x, z)
  const t = Math.min(r, ISLAND_RADIUS) / ISLAND_RADIUS
  const base = 1.85 * (1 - Math.pow(t, 1.7)) - 0.34
  // gundukan tengah + bukit kecil supaya tidak terasa datar
  const mound = 0.95 * Math.exp(-Math.pow(r / 13, 2))
  const dune =
    0.3 * Math.sin(x * 0.42) * Math.cos(z * 0.37) * (1 - t) +
    0.1 * Math.sin(x * 0.9 + 1.7) * (1 - t)
  return Math.max(-2.4, base + mound + dune)
}

/** Dermaga */
export const PIER = {
  width: 4.6,
  halfW: 2.3,
  startZ: -15,
  endZ: -46,
  deckY: 1.02,
}

export function isOnPier(x, z) {
  return Math.abs(x) < PIER.halfW - 0.25 && z < PIER.startZ + 0.6 && z > PIER.endZ + 0.4
}

/** Titik interaksi */
export const PODIUM_POS = new THREE.Vector3(0, PIER.deckY, -41.5)

/**
 * Delapan warga pulau yang berdiri berjajar di depan mulut dermaga,
 * masing-masing memegang poster foto. Posisi dibuat simetris dengan
 * celah di tengah agar jalur menuju dermaga tetap terbuka.
 */
export const NPC_RADIUS = 0.62
export const NPC_SPOTS = [-8.05, -6.4, -4.75, -3.1, 3.1, 4.75, 6.4, 8.05].map((x) => ({
  x,
  // melengkung sedikit menjauh di sisi luar, mengikuti garis pantai
  z: -12.2 - 0.028 * x * x,
}))

export const QUALITY = {
  low: { dpr: [0.75, 1], waterSeg: 42, shadows: false, fireflies: 0.35, stars: 300, shadowMap: 512 },
  medium: { dpr: [1, 1.35], waterSeg: 90, shadows: true, fireflies: 0.7, stars: 550, shadowMap: 1024 },
  high: { dpr: [1, 1.9], waterSeg: 150, shadows: true, fireflies: 1, stars: 900, shadowMap: 2048 },
}
