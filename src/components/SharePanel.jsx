import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Link2, Users, X, ExternalLink, Radio } from 'lucide-react'
import { useStore } from '../store/useStore'
import { buildShareUrl, copyText } from '../lib/share'
import { net } from '../lib/net'

export default function SharePanel() {
  const open = useStore((s) => s.ui.share)
  const setUI = useStore((s) => s.setUI)
  const profile = useStore((s) => s.profile)
  const avatar = useStore((s) => s.avatar)
  const roomCode = useStore((s) => s.roomCode)
  const showToast = useStore((s) => s.showToast)
  const [peers, setPeers] = useState([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    return net.subscribe(setPeers)
  }, [open])

  const link = useMemo(
    () => (open ? buildShareUrl({ profile, avatar, room: roomCode }) : ''),
    [open, profile, avatar, roomCode]
  )

  if (!open) return null

  const copy = async () => {
    const ok = await copyText(link)
    if (ok) {
      setCopied(true)
      showToast({ id: Date.now(), text: 'Tautan undangan disalin', tone: 'ok' })
      setTimeout(() => setCopied(false), 1800)
    } else {
      showToast({ id: Date.now(), text: 'Gagal menyalin, salin manual ya', tone: 'warn' })
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/60 backdrop-blur-md"
        onClick={() => setUI({ share: false })}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bagikan undangan"
        className="panel anim-rise relative w-full max-w-[460px] overflow-hidden rounded-[24px]"
      >
        <header className="flex items-start justify-between px-6 pt-6">
          <div>
            <div className="eyebrow">Undang seseorang</div>
            <h2 className="display mt-1.5 text-2xl text-sand-50">Bagikan dunia ini</h2>
          </div>
          <button
            onClick={() => setUI({ share: false })}
            className="icon-btn h-9 w-9"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-6 pt-5 pb-6">
          <p className="text-[12.5px] leading-relaxed text-sand-100/60">
            Tautan ini membawa nama, pesan, dan penampilan avatar-mu. Siapa pun yang membukanya
            akan langsung masuk ke pulau yang sama.
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/12 bg-ink-950/45 p-1.5 pl-3.5">
            <Link2 className="h-4 w-4 shrink-0 text-amber-300/70" />
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 bg-transparent py-2 text-[11.5px] text-sand-100/70 outline-none"
              aria-label="Tautan undangan"
            />
            <button
              onClick={copy}
              className="btn shrink-0 gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[12px] text-sand-50 hover:bg-white/16"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Tersalin' : 'Salin'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-white/10 bg-white/4 px-3.5 py-3">
              <div className="text-[10px] tracking-[0.2em] text-sand-100/40 uppercase">
                Kode ruang
              </div>
              <div className="mt-1 font-mono text-[15px] tracking-[0.18em] text-amber-200">
                {roomCode || '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/4 px-3.5 py-3">
              <div className="text-[10px] tracking-[0.2em] text-sand-100/40 uppercase">
                Di pulau
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[15px] text-sand-50">
                <Users className="h-3.5 w-3.5 text-lagoon-300" />
                {peers.length + 1}
                <span className="text-[11px] text-sand-100/40">orang</span>
              </div>
            </div>
          </div>

          {peers.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {peers.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl bg-white/4 px-3 py-2 text-[12px] text-sand-100/75"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {p.name}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-lagoon-400/20 bg-lagoon-500/10 px-3.5 py-3">
            <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lagoon-300" />
            <p className="text-[11px] leading-relaxed text-sand-100/55">
              Kehadiran realtime berjalan lewat <b className="text-sand-100/75">BroadcastChannel</b>{' '}
              (antar-tab di perangkat yang sama). Untuk room online lintas perangkat, isi{' '}
              <code className="rounded bg-black/30 px-1 py-0.5 text-[10.5px] text-amber-200/80">
                VITE_ROOM_WS
              </code>{' '}
              dengan alamat WebSocket-mu.
            </p>
          </div>

          <div className="mt-5 flex gap-2.5">
            <button onClick={copy} className="btn-primary flex-1 py-3 text-[13.5px]">
              <Copy className="h-4 w-4" />
              Salin tautan undangan
            </button>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-4 py-3"
              aria-label="Buka tautan di tab baru"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
