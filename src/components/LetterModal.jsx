import { useEffect } from 'react'
import { ArrowUpRight, Heart, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { buildLetter, LETTER_SIGN } from '../lib/content'
import { audio } from '../lib/audio'

const fmtDate = () =>
  new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

export default function LetterModal() {
  const open = useStore((s) => s.ui.letter)
  const profile = useStore((s) => s.profile)
  const closeLetter = useStore((s) => s.closeLetter)
  const triggerSky = useStore((s) => s.triggerSky)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && closeLetter()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeLetter])

  if (!open) return null

  const body = buildLetter(profile)
  const to = profile.partner?.trim() || 'Sayang'
  const from = profile.from?.trim()

  const lookUp = () => {
    triggerSky()
    audio.whoosh()
    audio.sparkle()
    closeLetter()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-md"
        onClick={closeLetter}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Surat untuk ${to}`}
        className="anim-rise relative flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[26px]"
        style={{
          background:
            'radial-gradient(120% 90% at 20% 0%, #fffaf1 0%, #fff3e3 45%, #fbe6cd 100%)',
          boxShadow:
            '0 40px 100px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.5) inset, 0 0 0 7px rgba(255,246,235,0.08)',
        }}
      >
        {/* garis tepi dekoratif */}
        <div className="pointer-events-none absolute inset-3 rounded-[18px] border border-coral-500/25" />
        <div className="pointer-events-none absolute inset-4 rounded-[15px] border border-coral-500/12" />

        <button
          onClick={closeLetter}
          aria-label="Tutup surat"
          className="absolute top-5 right-5 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-[#3a2a22]/8 text-[#5c4033] transition-colors hover:bg-[#3a2a22]/16"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="scroll-thin relative overflow-y-auto px-7 pt-10 pb-6 sm:px-12 sm:pt-12">
          <div className="text-center">
            <div className="text-[10px] font-semibold tracking-[0.34em] text-[#b1705a] uppercase">
              Sebuah surat kecil
            </div>
            <h2 className="script mt-2 text-[clamp(2rem,6vw,2.9rem)] leading-tight text-[#c0392b]">
              Untuk {to}
            </h2>
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-[#c0392b]/25" />
              <Heart className="h-3 w-3 fill-[#e2543f]/70 text-[#e2543f]/70" />
              <span className="h-px w-10 bg-[#c0392b]/25" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {body.split('\n').filter(Boolean).map((para, i) => (
              <p
                key={i}
                className="text-[15px] leading-[1.85] text-[#4a372e] sm:text-[15.5px]"
                style={{ fontFamily: "'Cormorant Infant', Georgia, serif", fontSize: '17px' }}
              >
                {para}
              </p>
            ))}
          </div>

          <div className="mt-8 text-right">
            <div className="text-[11px] tracking-[0.12em] text-[#8a6a58]">{LETTER_SIGN}</div>
            <div className="script mt-1 text-[26px] leading-tight text-[#a4483f]">
              {from || 'Seseorang yang menyayangimu'}
            </div>
            <div className="mt-2 text-[10.5px] tracking-[0.14em] text-[#a98b78] uppercase">
              {fmtDate()}
            </div>
          </div>
        </div>

        {/* aksi */}
        <div className="relative flex shrink-0 items-center gap-2.5 border-t border-[#c0392b]/12 px-6 py-4 sm:px-10">
          <button
            onClick={lookUp}
            className="btn flex-1 gap-2 bg-gradient-to-br from-[#e2543f] to-[#c0392b] py-3 text-[13.5px] text-[#fff6ea] shadow-[0_12px_28px_-12px_rgba(192,57,43,0.9)] hover:brightness-105"
          >
            <ArrowUpRight className="h-4 w-4" />
            Lihat ke Langit
          </button>
          <button
            onClick={closeLetter}
            className="btn border border-[#c0392b]/20 px-4 py-3 text-[13.5px] text-[#8a6a58] hover:bg-[#3a2a22]/6"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
