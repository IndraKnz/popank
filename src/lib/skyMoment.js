/**
 * Sinkronisasi "momen langit": kembang api, pesawat banner, dan jet hati
 * dipicu bersama oleh triggerSky(). Semua durasi di sini supaya kamera
 * (Player) dan jet (HeartJet) tidak pernah berbeda hitungan.
 */
export const SKY = {
  delay: 2, // jet mulai terbang setelah momen langit
  loop: 12, // detik untuk menggambar satu hati penuh
  exit: 4.5, // terbang menjauh setelah hati selesai
  hold: 20, // kamera menahan pandangan ke langit (loop + ~6 dtk menikmati hati)
  fadeIn: 0.9,
  fadeOut: 1.8,
}

/** Tinggi pandangan saat mendongak (derajat di atas horizon). */
export const SKY_LOOK_UP = 24
