import { RotateCcw, X, Sparkles, Music4, Waves, Gauge, Eye } from 'lucide-react'
import { useStore } from '../store/useStore'

function Slider({ label, icon, value, onChange, format = (v) => `${Math.round(v * 100)}%` }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12.5px] text-sand-100/75">
          {icon}
          {label}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-sand-100/45">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider"
        style={{ '--fill': `${value * 100}%` }}
        aria-label={label}
      />
    </label>
  )
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-1 py-2 text-left"
    >
      <span>
        <span className="block text-[12.5px] text-sand-100/80">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-sand-100/38">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-gradient-to-r from-amber-300 to-coral-400' : 'bg-white/12'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export default function SettingsPanel() {
  const open = useStore((s) => s.ui.settings)
  const settings = useStore((s) => s.settings)
  const setSetting = useStore((s) => s.setSetting)
  const resetSettings = useStore((s) => s.resetSettings)
  const setUI = useStore((s) => s.setUI)

  if (!open) return null

  return (
    <>
      <div
        className="anim-fade absolute inset-0 z-40 bg-ink-950/45"
        onClick={() => setUI({ settings: false })}
        aria-hidden
      />
      <aside
        className="anim-rise absolute top-0 right-0 z-50 flex h-full w-full max-w-[380px] flex-col border-l border-white/12"
        style={{
          background:
            'linear-gradient(180deg, rgba(14,17,30,0.94), rgba(9,11,20,0.97))',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          animationDuration: '0.45s',
        }}
        aria-label="Pengaturan"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="eyebrow">Pengaturan</div>
            <h2 className="display mt-1 text-xl text-sand-50">Suasana & performa</h2>
          </div>
          <button
            onClick={() => setUI({ settings: false })}
            className="icon-btn h-9 w-9"
            aria-label="Tutup pengaturan"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="scroll-thin flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-sand-100/50 uppercase">
              <Gauge className="h-3.5 w-3.5" /> Kualitas grafis
            </div>
            <div className="seg">
              {[
                { id: 'low', label: 'Rendah' },
                { id: 'medium', label: 'Sedang' },
                { id: 'high', label: 'Tinggi' },
              ].map((q) => (
                <button
                  key={q.id}
                  data-active={settings.quality === q.id}
                  onClick={() => setSetting({ quality: q.id })}
                  className="seg-item"
                >
                  {q.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-sand-100/38">
              Turunkan ke <b className="text-sand-100/60">Rendah</b> bila perangkat terasa panas
              atau gerakan tersendat. Bayangan & detail air akan dikurangi.
            </p>
          </section>

          <section className="space-y-5 border-t border-white/8 pt-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-sand-100/50 uppercase">
              <Music4 className="h-3.5 w-3.5" /> Audio
            </div>
            <Slider
              label="Musik latar"
              icon={<Music4 className="h-3.5 w-3.5 text-amber-300/70" />}
              value={settings.music}
              onChange={(v) => setSetting({ music: v })}
            />
            <Slider
              label="Suara ombak"
              icon={<Waves className="h-3.5 w-3.5 text-lagoon-300/80" />}
              value={settings.ambience}
              onChange={(v) => setSetting({ ambience: v })}
            />
            <p className="text-[11px] leading-relaxed text-sand-100/35">
              Musik dan ombak dibangkitkan secara prosedural oleh Web Audio API — tidak ada file
              audio yang diunduh.
            </p>
          </section>

          <section className="space-y-4 border-t border-white/8 pt-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-sand-100/50 uppercase">
              <Eye className="h-3.5 w-3.5" /> Kontrol & tampilan
            </div>
            <Slider
              label="Sensitivitas geser"
              icon={<Sparkles className="h-3.5 w-3.5 text-rose-400/70" />}
              value={(settings.sensitivity - 0.4) / 1.6}
              onChange={(v) => setSetting({ sensitivity: 0.4 + v * 1.6 })}
              format={(v) => `${(0.4 + v * 1.6).toFixed(1)}×`}
            />
            <Toggle
              label="Kunang-kunang"
              hint="Partikel cahaya di sekitar pantai"
              checked={settings.fireflies}
              onChange={(v) => setSetting({ fireflies: v })}
            />
            <Toggle
              label="Nama pemain lain"
              hint="Tampilkan label di atas avatar tamu"
              checked={settings.showNames}
              onChange={(v) => setSetting({ showNames: v })}
            />
          </section>

          <section className="border-t border-white/8 pt-5">
            <button
              onClick={resetSettings}
              className="btn-ghost w-full py-2.5 text-[12.5px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Kembalikan ke awal
            </button>
          </section>
        </div>
      </aside>
    </>
  )
}
