import { useEffect, useState } from 'react'
import {
  Share2,
  SlidersHorizontal,
  HelpCircle,
  Hand,
  ThumbsUp,
  PartyPopper,
  Music2,
  Mail,
  Users,
  Sparkles,
  Move,
  ArrowDown,
} from 'lucide-react'
import Joystick from './Joystick'
import { useStore } from '../store/useStore'
import { audio } from '../lib/audio'
import { REACTIONS } from '../lib/content'

const ICONS = {
  wave: Hand,
  nod: ThumbsUp,
  celebrate: PartyPopper,
  dance: Music2,
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <defs>
          <linearGradient id="et-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFE6B8" />
            <stop offset="1" stopColor="#FF8A6B" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="14" r="7" fill="url(#et-sun)" opacity="0.95" />
        <path
          d="M2 21c3.2 0 3.2 2.4 6.4 2.4S11.6 21 14.8 21s3.2 2.4 6.4 2.4S24.4 21 27.6 21"
          stroke="#7CC4C9"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M4 26c3 0 3 2 6 2s3-2 6-2 3 2 6 2 3-2 6-2"
          stroke="#7CC4C9"
          strokeWidth="1.4"
          opacity="0.55"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <div className="leading-none">
        <div className="display text-[17px] tracking-wide text-sand-50">POPANK</div>
        <div className="mt-0.5 text-[8.5px] font-semibold tracking-[0.3em] text-sand-100/40 uppercase">
          Senja yang tinggal
        </div>
      </div>
    </div>
  )
}

function ReactionBar() {
  const triggerReaction = useStore((s) => s.triggerReaction)
  const lastReaction = useStore((s) => s.lastReaction)

  return (
    <div className="glass-soft pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
      {REACTIONS.map((r) => {
        const Icon = ICONS[r.id]
        const active = lastReaction === r.id
        return (
          <button
            key={r.id}
            onClick={() => {
              triggerReaction(r.id)
              if (r.id === 'celebrate') audio.sparkle()
              else audio.chime()
            }}
            title={r.label}
            aria-label={r.label}
            className={`group relative grid h-10 w-10 cursor-pointer place-items-center rounded-full transition-all duration-200 ${
              active
                ? 'bg-gradient-to-br from-amber-300 to-coral-400 text-ink-900'
                : 'text-sand-100/70 hover:bg-white/10 hover:text-sand-50'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            <span className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded-lg bg-ink-950/90 px-2 py-1 text-[10px] text-sand-100/80 group-hover:block">
              {r.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Toast() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  return (
    <div className="anim-rise pointer-events-none absolute top-20 left-1/2 -translate-x-1/2">
      <div className="glass flex items-center gap-2 rounded-full px-4 py-2 text-[12px] text-sand-50">
        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
        {toast.text}
      </div>
    </div>
  )
}

function Objective() {
  const letterRead = useStore((s) => s.letterRead)
  const [hidden, setHidden] = useState(letterRead)

  useEffect(() => {
    if (letterRead) {
      setHidden(true)
      return
    }
    const t = setTimeout(() => setHidden(true), 14000)
    return () => clearTimeout(t)
  }, [letterRead])

  if (hidden) return null

  return (
    <div className="anim-fade pointer-events-none absolute top-[74px] left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-white/12 bg-ink-950/55 px-3.5 py-1.5 text-[11px] text-sand-100/70 backdrop-blur-md">
        <Move className="h-3 w-3 text-amber-300/80" />
        Berjalanlah ke ujung dermaga — ada surat untukmu
      </div>
    </div>
  )
}

export default function HUD() {
  const ui = useStore((s) => s.ui)
  const setUI = useStore((s) => s.setUI)
  const nearLetter = useStore((s) => s.nearLetter)
  const nearSwing = useStore((s) => s.nearSwing)
  const onSwing = useStore((s) => s.onSwing)
  const setOnSwing = useStore((s) => s.setOnSwing)
  const openLetter = useStore((s) => s.openLetter)
  const peerCount = useStore((s) => s.peerCount)
  const roomCode = useStore((s) => s.roomCode)
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      {/* ---------- bar atas ---------- */}
      <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="glass flex items-center gap-3 rounded-full py-2 pr-4 pl-3">
            <Logo />
          </div>
          {roomCode && (
            <div className="hidden items-center gap-1.5 rounded-full border border-white/12 bg-ink-950/45 px-3 py-2 text-[10.5px] text-sand-100/55 backdrop-blur-md sm:flex">
              <Users className="h-3 w-3 text-lagoon-300" />
              <span className="font-mono tracking-[0.14em] text-amber-200/80">{roomCode}</span>
              <span className="text-sand-100/30">·</span>
              {peerCount + 1}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUI({ share: true })}
            className="icon-btn"
            aria-label="Bagikan undangan"
            title="Bagikan undangan"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setUI({ settings: true })}
            className="icon-btn"
            aria-label="Pengaturan"
            title="Pengaturan"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            onClick={() => setUI({ help: true })}
            className="icon-btn"
            aria-label="Bantuan"
            title="Cara bermain"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      <Toast />
      <Objective />

      {/* ---------- bawah kiri: joystick / hint keyboard ---------- */}
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
        {isTouch ? (
          <Joystick />
        ) : (
          <div className="pointer-events-none flex flex-col gap-1.5 text-[11px] text-sand-100/45">
            <div className="flex items-center gap-2">
              <kbd className="rounded-md border border-white/15 bg-ink-950/50 px-1.5 py-0.5 font-mono text-[10px] text-sand-100/70">
                W A S D
              </kbd>
              berjalan
            </div>
            <div className="flex items-center gap-2">
              <kbd className="rounded-md border border-white/15 bg-ink-950/50 px-1.5 py-0.5 font-mono text-[10px] text-sand-100/70">
                Shift
              </kbd>
              berlari
            </div>
            <div className="flex items-center gap-2">
              <kbd className="rounded-md border border-white/15 bg-ink-950/50 px-1.5 py-0.5 font-mono text-[10px] text-sand-100/70">
                Geser
              </kbd>
              lihat sekeliling
            </div>
          </div>
        )}
      </div>

      {/* ---------- bawah kanan: reaksi ---------- */}
      <div className="pointer-events-none absolute right-4 bottom-4 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6">
        <ReactionBar />
        <div className="hidden text-[10px] tracking-[0.16em] text-sand-100/30 uppercase sm:block">
          Reaksi
        </div>
      </div>

      {/* ---------- prompt interaksi ---------- */}
      {nearSwing && !onSwing && !ui.letter && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 sm:bottom-28">
          <button
            onClick={() => {
              audio.chime()
              setOnSwing(true)
            }}
            className="pointer-events-auto anim-float flex cursor-pointer items-center gap-2.5 rounded-full border border-emerald-300/40 bg-ink-950/70 py-2.5 pr-5 pl-3 text-[12.5px] font-medium text-sand-50 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors hover:border-emerald-300/70 hover:bg-ink-950/85"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-lagoon text-ink-900">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            Duduk di ayunan
            <kbd className="ml-1 hidden rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-sand-100/50 sm:inline">
              E
            </kbd>
          </button>
        </div>
      )}

      {onSwing && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 sm:bottom-28">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-ink-950/60 px-4 py-2 text-[11.5px] text-sand-100/70 backdrop-blur-md">
            <ArrowDown className="h-3.5 w-3.5 text-emerald-200/80" />
            Gerakkan joystick atau tekan <kbd className="rounded border border-white/15 px-1 font-mono text-[10px]">E</kbd> untuk turun
          </div>
        </div>
      )}

      {nearLetter && !ui.letter && !nearSwing && (
        <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 sm:bottom-28">
          <button
            onClick={() => {
              audio.chime()
              openLetter()
            }}
            className="pointer-events-auto anim-float flex cursor-pointer items-center gap-2.5 rounded-full border border-amber-300/40 bg-ink-950/70 py-2.5 pr-5 pl-3 text-[12.5px] font-medium text-sand-50 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors hover:border-amber-300/70 hover:bg-ink-950/85"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-coral-400 text-ink-900">
              <Mail className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            Buka surat
            <kbd className="ml-1 hidden rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-sand-100/50 sm:inline">
              E
            </kbd>
          </button>
        </div>
      )}
    </div>
  )
}
