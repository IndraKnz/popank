/**
 * Konten & preset desain untuk Ever Tide.
 * Semua teks yang bisa dipersonalisasi ada di sini agar mudah diubah.
 */

export const SKIN_TONES = [
  { id: 'porcelain', label: 'Porselen', hex: '#F6D9C4' },
  { id: 'peach', label: 'Persik', hex: '#EFC3A4' },
  { id: 'honey', label: 'Madu', hex: '#DDA578' },
  { id: 'amber', label: 'Amber', hex: '#C48555' },
  { id: 'chestnut', label: 'Kastanye', hex: '#9A5F3B' },
  { id: 'cocoa', label: 'Kakao', hex: '#6B3D26' },
]

export const HAIR_COLORS = [
  { id: 'raven', label: 'Raven', hex: '#211A1F' },
  { id: 'espresso', label: 'Espresso', hex: '#4A2E22' },
  { id: 'chestnut', label: 'Kastanye', hex: '#7B4A2C' },
  { id: 'honey', label: 'Madu', hex: '#B67A3C' },
  { id: 'sand', label: 'Pasir', hex: '#D9B27C' },
  { id: 'rose', label: 'Rose', hex: '#B4566B' },
  { id: 'plum', label: 'Plum', hex: '#5B3B6B' },
  { id: 'silver', label: 'Perak', hex: '#C9C3CE' },
]

export const HAIR_STYLES = [
  { id: 'short', label: 'Pendek' },
  { id: 'bob', label: 'Bob' },
  { id: 'long', label: 'Panjang' },
  { id: 'ponytail', label: 'Kuncir' },
  { id: 'bun', label: 'Sanggul' },
  { id: 'curly', label: 'Keriting' },
  { id: 'buzz', label: 'Cepak' },
]

export const EYE_COLORS = [
  { id: 'hazel', label: 'Hazel', hex: '#8B5E34' },
  { id: 'amber', label: 'Amber', hex: '#C98A3E' },
  { id: 'olive', label: 'Zaitun', hex: '#5E7A3A' },
  { id: 'ocean', label: 'Samudra', hex: '#3C7E93' },
  { id: 'storm', label: 'Badai', hex: '#5A6B7B' },
  { id: 'violet', label: 'Violet', hex: '#6B4E8E' },
]

export const OUTFITS = [
  { id: 'sunset', label: 'Sunset', hex: '#F9705A' },
  { id: 'coral', label: 'Koral', hex: '#FF9D7D' },
  { id: 'rose', label: 'Rose', hex: '#EF4D72' },
  { id: 'amber', label: 'Amber', hex: '#F7A94E' },
  { id: 'lagoon', label: 'Laguna', hex: '#2E7D8F' },
  { id: 'mint', label: 'Mint', hex: '#6FBBA5' },
  { id: 'lavender', label: 'Lavender', hex: '#8E7BC4' },
  { id: 'cream', label: 'Krem', hex: '#F3E2CB' },
  { id: 'ink', label: 'Tinta', hex: '#2A2E45' },
]

export const OUTFIT_STYLES = [
  { id: 'dress', label: 'Gaun' },
  { id: 'shirt', label: 'Kemeja' },
  { id: 'tank', label: 'Kaos' },
]

export const BODY_STYLES = [
  { id: 'petite', label: 'Mungil', scale: 0.94 },
  { id: 'classic', label: 'Klasik', scale: 1 },
  { id: 'tall', label: 'Tinggi', scale: 1.07 },
]

export const DEFAULT_AVATAR = {
  body: 'classic',
  skin: 'peach',
  hair: 'long',
  hairColor: 'chestnut',
  eye: 'hazel',
  outfit: 'sunset',
  outfitStyle: 'dress',
}

export const DEFAULT_PROFILE = {
  partner: 'Sayang',
  from: '',
  message: '',
  date: '',
  /** nama tampilan untuk multiplayer (diisi di menu awal) */
  nick: '',
  /** kode ruang manual — untuk bergabung ke sesi orang lain */
  room: '',  /**
   * Delapan foto poster (indeks 0–7 = urutan NPC).
   * Hanya host yang mengunggah; pasangan menerimanya lewat kanal ruang.
   */
  photos: [],
}

export const DEFAULT_SETTINGS = {
  quality: 'high',
  music: 0.4,
  ambience: 0.55,
  sensitivity: 1,
  showNames: true,
  fireflies: true,
}

export const REACTIONS = [
  { id: 'wave', label: 'Melambai', hint: 'Hai!' },
  { id: 'nod', label: 'Setuju', hint: 'Iya' },
  { id: 'celebrate', label: 'Merayakan', hint: 'Hore!' },
  { id: 'dance', label: 'Menari', hint: 'Dansa' },
]

/**
 * Delapan warga pulau yang berbaris menyambut di pantai.
 * Mereka memegang poster berisi foto pasangan.
 */
export const NPC_CROWD = [
  { body: 'classic', skin: 'honey', hair: 'bob', hairColor: 'raven', eye: 'hazel', outfit: 'lagoon', outfitStyle: 'dress' },
  { body: 'tall', skin: 'chestnut', hair: 'buzz', hairColor: 'raven', eye: 'amber', outfit: 'cream', outfitStyle: 'shirt' },
  { body: 'petite', skin: 'porcelain', hair: 'long', hairColor: 'honey', eye: 'ocean', outfit: 'rose', outfitStyle: 'dress' },
  { body: 'classic', skin: 'amber', hair: 'ponytail', hairColor: 'espresso', eye: 'olive', outfit: 'mint', outfitStyle: 'tank' },
  { body: 'classic', skin: 'peach', hair: 'curly', hairColor: 'plum', eye: 'violet', outfit: 'amber', outfitStyle: 'dress' },
  { body: 'tall', skin: 'cocoa', hair: 'bun', hairColor: 'raven', eye: 'storm', outfit: 'lavender', outfitStyle: 'shirt' },
  { body: 'petite', skin: 'honey', hair: 'short', hairColor: 'sand', eye: 'hazel', outfit: 'coral', outfitStyle: 'tank' },
  { body: 'classic', skin: 'peach', hair: 'long', hairColor: 'rose', eye: 'amber', outfit: 'sunset', outfitStyle: 'dress' },
]

/** Tiga variasi judul poster, dipakai bergantian oleh 8 NPC. */
export const POSTER_LINES = ['Selamat Ulang Tahun', 'Kami Sayang Kamu', 'Bahagia Selalu']

/** Jumlah poster yang bisa diisi host. */
export const PHOTO_SLOTS = 8

/** Surat default bila pengguna tidak menulis pesan sendiri. */
export function buildLetter(profile) {
  const to = profile.partner?.trim() || 'Sayang'
  const from = profile.from?.trim()
  if (profile.message?.trim()) return profile.message.trim()

  return `Hari ini laut berwarna lebih hangat dari biasanya, dan aku tahu kenapa — karena semesta sedang ikut merayakanmu.

Terima kasih sudah ada, sudah bertahan, dan sudah menjadi tempat paling tenang yang pernah aku temukan. Kalau waktu boleh berhenti, mungkin aku akan memilih berhenti di senja seperti ini: langit jingga, ombak pelan, dan kamu di sebelahku.

Selamat ulang tahun, ${to}. Semoga tahun ini lembut padamu, seperti pasir yang menerima setiap langkah. Dan semoga kamu selalu tahu: di mana pun aku berada, aku akan selalu kembali ke tepi laut yang sama — padamu.`
}

export const LETTER_SIGN = 'Dengan segenap hati,'
