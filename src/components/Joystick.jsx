import { useEffect, useRef, useState } from 'react'
import { input } from '../lib/input'
import { Footprints } from 'lucide-react'

/**
 * Joystick virtual. Menulis langsung ke objek `input` (tanpa state React)
 * supaya tetap 60fps. Knob digerakkan lewat transform.
 */
export default function Joystick() {
  const base = useRef(null)
  const knob = useRef(null)
  const active = useRef(false)
  const [running, setRunning] = useState(false)

  const R = 46

  useEffect(() => {
    const el = base.current
    if (!el) return

    const setKnob = (x, y) => {
      if (knob.current) {
        knob.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
    }

    const start = (e) => {
      active.current = true
      el.setPointerCapture?.(e.pointerId)
      move(e)
    }

    const move = (e) => {
      if (!active.current) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      let dx = e.clientX - cx
      let dy = e.clientY - cy
      const len = Math.hypot(dx, dy)
      if (len > R) {
        dx = (dx / len) * R
        dy = (dy / len) * R
      }
      setKnob(dx, dy)
      input.joy.x = dx / R
      input.joy.y = -dy / R
      const mag = Math.hypot(dx, dy) / R
      if (mag > 0.92 && !input.run) {
        input.run = true
        setRunning(true)
      } else if (mag < 0.75 && input.run) {
        input.run = false
        setRunning(false)
      }
    }

    const end = () => {
      active.current = false
      setKnob(0, 0)
      input.joy.x = 0
      input.joy.y = 0
      if (input.run) {
        input.run = false
        setRunning(false)
      }
    }

    el.addEventListener('pointerdown', start)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    el.addEventListener('pointerleave', end)
    return () => {
      el.removeEventListener('pointerdown', start)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
      el.removeEventListener('pointerleave', end)
    }
  }, [])

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-3">
      <div
        ref={base}
        role="button"
        aria-label="Joystick gerak"
        className="relative grid h-[124px] w-[124px] cursor-grab touch-none place-items-center rounded-full active:cursor-grabbing"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(255,246,235,0.13), rgba(11,14,26,0.5) 70%)',
          border: '1px solid rgba(255,226,200,0.22)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 18px 40px -18px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.16)',
        }}
      >
        <div className="absolute inset-3 rounded-full border border-white/8" />
        <div
          ref={knob}
          className="h-[52px] w-[52px] rounded-full transition-transform duration-75"
          style={{
            background: 'linear-gradient(150deg, #ffe2bd, #ff9d7d 60%, #ff7597)',
            boxShadow:
              '0 8px 20px -6px rgba(255,140,110,0.9), inset 0 1px 0 rgba(255,255,255,0.6)',
          }}
        />
      </div>

      <div
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all duration-200 ${
          running
            ? 'border-amber-300/60 bg-amber-300/20 text-amber-200'
            : 'border-white/12 bg-black/25 text-sand-100/45'
        }`}
      >
        <Footprints className="h-3 w-3" strokeWidth={2.4} />
        {running ? 'Berlari' : 'Dorong jauh'}
      </div>
    </div>
  )
}
