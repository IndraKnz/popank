/**
 * Utilitas foto: memuat gambar & mengecilkan foto unggahan
 * sebelum disimpan sebagai data URL di localStorage.
 */

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gambar tidak bisa dibaca.'))
    img.src = src
  })
}

/**
 * Ubah berkas gambar menjadi data URL JPEG yang ringan.
 * Sisi terpanjang dibatasi `max` px supaya aman untuk localStorage.
 */
export async function fileToPhoto(file, max = 560, quality = 0.82) {
  if (!file) return ''
  if (!file.type?.startsWith('image/')) throw new Error('Berkas harus berupa gambar.')
  if (file.size > 12 * 1024 * 1024) throw new Error('Ukuran foto melebihi 12 MB.')

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
