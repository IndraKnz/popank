import { ArrowRight, Compass, Mail, Share2, Users, Volume2 } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function Intro({ invited, partner, onStart, onHelp }) {
  // nama tampilan di dunia: host memakai profilnya, tamu undangan bisa mengetik sendiri
  const from = useStore((s) => s.profile.from)
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)
  const guestName = useStore((s) => s.guestName)
  const setGuestName = useStore((s) => s.setGuestName)

  const nameValue = invited ? guestName : from
  const onNameChange = (e) => {
    const v = e.target.value.slice(0, 20)
    if (invited) setGuestName(v)
    else setProfile({ from: v })
  }

  const room = profile.room || ''
  const onRoomChange = (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setProfile({ room: v })
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      {/* scrim supaya teks terbaca di atas senja */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/82 via-ink-950/42 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950/85 to-transparent" />

      <div className="relative flex flex-1 items-center px-6 sm:px-10 lg:px-16">
        <div className="max-w-xl">
          <div className="anim-rise flex items-center gap-3">
            <span className="h-px w-8 bg-amber-300/70" />
            <span className="eyebrow">
              {invited ? 'Sebuah undangan untukmu' : 'Sebuah perayaan senja'}
            </span>
          </div>

          <h1
            className="display anim-rise mt-6 text-[clamp(2.6rem,7vw,4.6rem)] text-sand-50"
            style={{ animationDelay: '80ms' }}
          >
            {invited ? (
              <>
                Ada dunia kecil
                <br />
                yang menunggumu,
                <br />
                <span className="script text-sunset text-[1.15em]">{partner || 'Sayang'}</span>
              </>
            ) : (
              <>
                Senja yang selalu
                <br />
                kembali ke tepi
                <br />
                <span className="script text-sunset text-[1.15em]">yang sama</span>
              </>
            )}
          </h1>

          <p
            className="anim-rise mt-6 max-w-md text-[15px] leading-relaxed text-sand-100/75 sm:text-base"
            style={{ animationDelay: '160ms' }}
          >
            {invited
              ? 'Seseorang menyiapkan pulau kecil ini untukmu — pasir hangat, dermaga berlampu, dan sebuah surat yang menunggu dibuka. Masuk, dan lihat sendiri.'
              : 'Jelajahi pulau tropis saat matahari terbenam, temukan surat di ujung dermaga, dan biarkan langit menyampaikan hal yang sulit diucapkan.'}
          </p>

          {/* nama tampilan + kode ruang — dipakai saat main berdua secara daring */}
          <div
            className="anim-rise pointer-events-auto mt-7 grid max-w-lg gap-3 sm:grid-cols-[1fr_auto]"
            style={{ animationDelay: '240ms' }}
          >
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide text-sand-100/55">
                <Users className="h-3.5 w-3.5 text-amber-300/80" />
                Nama kamu di pulau ini
              </span>
              <input
                className="field"
                value={nameValue}
                onChange={onNameChange}
                placeholder={invited ? (partner ? `mis. ${partner}` : 'Ketik namamu…') : 'Ketik namamu…'}
                maxLength={20}
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] tracking-wide text-sand-100/55">
                <Share2 className="h-3.5 w-3.5 text-amber-300/80" />
                Kode ruang
              </span>
              <input
                className="field font-mono tracking-[0.18em] uppercase"
                value={room}
                onChange={onRoomChange}
                placeholder="ABC123"
                maxLength={8}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          </div>

          <p className="anim-rise mt-2 max-w-lg text-[10.5px] leading-relaxed text-sand-100/35">
            Nama ini yang dilihat pemain lain. Kode ruang dipakai untuk bergabung
            ke sesi yang sama dari perangkat lain — kosongkan untuk memakai kode
            otomatis dari nama pasangan.
          </p>

          <div
            className="anim-rise pointer-events-auto mt-6 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '300ms' }}
          >
            <button onClick={onStart} className="btn-primary group px-6 py-3.5 text-[15px]">
              {invited ? 'Buka Undangan' : 'Masuk ke Pulau'}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <button onClick={onHelp} className="btn-ghost px-5 py-3.5 text-[15px]">
              Cara bermain
            </button>
          </div>

          <div
            className="anim-rise mt-8 flex items-center gap-2 text-[11px] text-sand-100/45"
            style={{ animationDelay: '320ms' }}
          >
            <Volume2 className="h-3.5 w-3.5" />
            Suara ombak & musik dibuat langsung di browser — pakai headphone untuk hasil terbaik.
          </div>
        </div>
      </div>

      {/* fitur ringkas di bawah */}
      <div className="relative px-6 pb-8 sm:px-10 lg:px-16">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-[11px] text-sand-100/55">
          <span className="flex items-center gap-2">
            <Compass className="h-3.5 w-3.5 text-amber-300/80" /> Berjalan bebas di pulau
          </span>
          <span className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-amber-300/80" /> Surat rahasia di dermaga
          </span>
          <span className="flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5 text-amber-300/80" /> Bagikan tautan ke pasangan
          </span>
          <span className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-amber-300/80" /> Main berdua daring dari jarak jauh
          </span>
        </div>
      </div>
    </div>
  )
}
