import { X, Keyboard, Smartphone, Mail, Share2, Settings, Sparkles, Image } from 'lucide-react'
import { useStore } from '../store/useStore'

const ITEMS = [
  {
    icon: Keyboard,
    title: 'Desktop',
    rows: [
      ['W A S D / panah', 'Berjalan'],
      ['Shift', 'Berlari'],
      ['Klik & geser', 'Melihat sekeliling'],
      ['Scroll', 'Zoom kamera'],
      ['E', 'Buka surat / naik ayunan'],
    ],
  },
  {
    icon: Smartphone,
    title: 'Seluler',
    rows: [
      ['Joystick kiri', 'Berjalan'],
      ['Dorong penuh', 'Otomatis berlari'],
      ['Geser layar', 'Melihat sekeliling'],
      ['Ketuk prompt', 'Buka surat / naik ayunan'],
    ],
  },
]

export default function HelpModal() {
  const open = useStore((s) => s.ui.help)
  const setUI = useStore((s) => s.setUI)
  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/65 backdrop-blur-md"
        onClick={() => setUI({ help: false })}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cara bermain"
        className="panel anim-rise relative max-h-[86vh] w-full max-w-[520px] overflow-y-auto rounded-[24px] p-6 sm:p-7 scroll-thin"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Panduan singkat</div>
            <h2 className="display mt-1.5 text-2xl text-sand-50">Cara menjelajah pulau</h2>
          </div>
          <button
            onClick={() => setUI({ help: false })}
            className="icon-btn h-9 w-9"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {ITEMS.map((it) => (
            <div key={it.title} className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-sand-50">
                <it.icon className="h-3.5 w-3.5 text-amber-300" />
                {it.title}
              </div>
              <dl className="mt-3 space-y-2">
                {it.rows.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="font-mono text-[10.5px] text-sand-100/85">{k}</dt>
                    <dd className="text-right text-[11px] text-sand-100/85">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            [Mail, 'Temukan surat', 'Berjalan ke ujung dermaga, lalu ketuk podium kayu.'],
            [Image, 'Poster foto', 'Delapan warga pulau memegang postermu — unggah delapan fotonya di halaman kustomisasi.'],
            [Sparkles, 'Taman kecil', 'Ada ayunan di sisi barat pulau. Dekati lalu tekan E untuk duduk dan berayun.'],
            [Sparkles, 'Lihat ke Langit', 'Dari dalam surat, pesawat kecil akan melintas membawa ucapanmu.'],
            [Share2, 'Bagikan', 'Tekan ikon bagikan untuk mengirim tautan undangan ke pasangan.'],
            [Settings, 'Atur suasana', 'Kualitas grafis, volume musik, dan suara ombak ada di pengaturan.'],
          ].map(([Icon, title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/7 text-amber-300">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="text-[12px] leading-relaxed text-sand-100/75">
                <b className="font-semibold text-sand-50/90">{title}.</b> {desc}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-6 border-t border-white/8 pt-4 text-[10.5px] leading-relaxed text-sand-100/45">
          Dibangun dengan React, Three.js, dan React Three Fiber. Seluruh suara dibangkitkan
          dengan Web Audio API.
        </p>
      </div>
    </div>
  )
}
