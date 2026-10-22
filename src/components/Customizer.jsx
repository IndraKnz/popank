import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Shuffle,
  Sparkles,
  Heart,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import Avatar from '../scene/Avatar'
import { useStore } from '../store/useStore'
import { fileToPhoto } from '../lib/photo'
import {
  SKIN_TONES,
  HAIR_COLORS,
  HAIR_STYLES,
  EYE_COLORS,
  OUTFITS,
  OUTFIT_STYLES,
  BODY_STYLES,
  PHOTO_SLOTS,
} from '../lib/content'

/* ---------- kontrol kecil ---------- */

function Swatches({ items, value, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-2.5" role="group" aria-label={label}>
      {items.map((c) => {
        const active = value === c.id
        return (
          <button
            key={c.id}
            type="button"
            aria-label={c.label}
            aria-pressed={active}
            onClick={() => onChange(c.id)}
            className={`relative grid h-9 w-9 cursor-pointer place-items-center rounded-full transition-all duration-200 ${
              active ? 'scale-110' : 'hover:scale-105'
            }`}
            style={{
              background: c.hex,
              boxShadow: active
                ? `0 0 0 2px #0b0e1a, 0 0 0 4px ${c.hex}, 0 6px 16px -6px rgba(0,0,0,0.8)`
                : '0 0 0 1px rgba(255,255,255,0.18) inset, 0 4px 10px -6px rgba(0,0,0,0.7)',
            }}
          >
            {active && (
              <Check
                className="h-4 w-4"
                strokeWidth={3}
                style={{ color: isLight(c.hex) ? '#2a2018' : '#fff' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

function isLight(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 165
}

function Chips({ items, value, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          aria-pressed={value === it.id}
          onClick={() => onChange(it.id)}
          className={`cursor-pointer rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-all duration-200 ${
            value === it.id
              ? 'border-amber-300/70 bg-amber-300/18 text-amber-100'
              : 'border-white/12 bg-white/5 text-sand-100/60 hover:border-white/25 hover:text-sand-50'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function Seg({ items, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          data-active={value === it.id}
          onClick={() => onChange(it.id)}
          className="seg-item"
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function Field({ label, children, hint }) {
  return (
    <section className="border-t border-white/8 pt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sand-100/55">
          {label}
        </h3>
        {hint && <span className="text-[10.5px] text-sand-100/35">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

/* ---------- preview 3D ---------- */

function Preview({ config }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.0, 3.0], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.85} color="#fff4ea" />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff6ec" />
      <directionalLight position={[-3.5, 2.5, -1]} intensity={0.95} color="#cfe0ff" />
      <pointLight position={[0, 0.4, 2.2]} intensity={1.0} color="#ffd9b8" distance={5} />
      <pointLight position={[0, 1.4, -2.4]} intensity={1.4} color="#ffb07a" distance={5} />

      <group position={[0, -0.84, 0]}>
        <Avatar config={config} spin />
      </group>

      {/* alas bundar */}
      <mesh position={[0, -0.9, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.92, 64]} />
        <meshBasicMaterial color="#ffca9b" transparent opacity={0.09} />
      </mesh>
      <mesh position={[0, -0.895, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.86, 0.9, 64]} />
        <meshBasicMaterial color="#ffc07a" transparent opacity={0.45} />
      </mesh>
    </Canvas>
  )
}

/* ---------- delapan foto poster (khusus host) ---------- */

function PhotoGrid({ photos, onSet, onClear }) {
  const inputRef = useRef(null)
  const startIdx = useRef(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const filled = photos.filter(Boolean).length

  const open = (i) => {
    startIdx.current = i
    inputRef.current?.click()
  }

  const pick = async (e) => {
    const files = [...(e.target.files || [])].slice(0, PHOTO_SLOTS)
    e.target.value = ''
    if (!files.length) return
    setErr('')
    setBusy(true)
    const base = startIdx.current
    try {
      // dikonversi paralel supaya delapan foto selesai hampir bersamaan
      const urls = await Promise.all(files.map((f) => fileToPhoto(f)))
      urls.forEach((url, k) => onSet((base + k) % PHOTO_SLOTS, url))
    } catch (ex) {
      setErr(ex?.message || 'Gagal memuat foto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2.5">
        {Array.from({ length: PHOTO_SLOTS }).map((_, i) => {
          const url = photos[i]
          return (
            <div key={i} className="relative">
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={`Foto poster ${i + 1}`}
                className={`group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-xl border transition-colors ${
                  url
                    ? 'border-white/22 hover:border-amber-300/60'
                    : 'border-dashed border-white/18 bg-white/4 hover:border-amber-300/50'
                }`}
              >
                {url ? (
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-sand-100/28 transition-colors group-hover:text-amber-200/70">
                    <ImagePlus className="h-4 w-4" />
                  </span>
                )}
                <span className="absolute bottom-1 left-1.5 rounded bg-ink-950/45 px-1 text-[9px] font-semibold text-white/85">
                  {i + 1}
                </span>
              </button>

              {url && (
                <button
                  type="button"
                  onClick={() => onSet(i, '')}
                  aria-label={`Hapus foto ${i + 1}`}
                  className="absolute -top-1.5 -right-1.5 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-ink-900 text-sand-100/70 ring-1 ring-white/20 transition-colors hover:text-rose-200"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="text-[10.5px] leading-relaxed text-sand-100/45">
          {filled > 0
            ? `${filled} dari ${PHOTO_SLOTS} poster terisi. Slot kosong memakai foto pertama.`
            : 'Ketuk kotak untuk mengunggah — boleh pilih beberapa foto sekaligus.'}
        </p>
        {filled > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-medium text-sand-100/45 transition-colors hover:text-rose-200"
          >
            <Trash2 className="h-3 w-3" />
            Kosongkan
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={pick}
      />
      {busy && (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-amber-200/80">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Menyiapkan poster…
        </p>
      )}
      {err && <p className="mt-2 text-[11px] text-rose-300">{err}</p>}
    </div>
  )
}

/* ---------- halaman kustomisasi ---------- */

export default function Customizer({ onBack, onEnter }) {
  const avatar = useStore((s) => s.avatar)
  const profile = useStore((s) => s.profile)
  const setAvatar = useStore((s) => s.setAvatar)
  const setProfile = useStore((s) => s.setProfile)
  const setPhotoAt = useStore((s) => s.setPhotoAt)
  const clearPhotos = useStore((s) => s.clearPhotos)
  const randomize = useStore((s) => s.randomizeAvatar)
  const [showMessage, setShowMessage] = useState(!!profile.message)

  const canEnter = profile.partner.trim().length > 0

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-ink-950/72 backdrop-blur-2xl">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden lg:flex-row">
        {/* -------- preview -------- */}
        <div className="relative h-[34vh] min-h-[220px] shrink-0 lg:h-auto lg:flex-1">
          <div className="absolute inset-0">
            <Preview config={avatar} />
          </div>

          {/* pendar hangat di belakang avatar */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 55% at 50% 62%, rgba(255,150,110,0.20), transparent 70%)',
            }}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center">
            <div className="script text-[clamp(1.6rem,4vw,2.4rem)] leading-none text-sand-50/90">
              {profile.from?.trim() || 'Kamu'}
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/70">
              Pratinjau
            </div>
          </div>

          <button
            onClick={onBack}
            className="icon-btn absolute top-4 left-4"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <button
            onClick={randomize}
            className="icon-btn absolute top-4 right-4"
            aria-label="Acak penampilan"
            title="Acak penampilan"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        </div>

        {/* -------- kontrol -------- */}
        <div className="relative flex min-h-0 flex-1 flex-col border-t border-white/10 lg:w-[430px] lg:flex-none lg:border-t-0 lg:border-l">
          <div className="scroll-thin flex-1 overflow-y-auto px-5 pt-6 pb-4 sm:px-7">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="eyebrow">Ciptakan dirimu</span>
            </div>
            <h2 className="display mt-3 text-[clamp(1.7rem,4vw,2.1rem)] text-sand-50">
              Siapa yang akan berjalan di pantai ini?
            </h2>

            {/* nama */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-sand-100/50">
                  Namamu
                </span>
                <input
                  className="field"
                  value={profile.from}
                  maxLength={24}
                  placeholder="mis. Ardan"
                  onChange={(e) => setProfile({ from: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-sand-100/50">
                  Nama pasangan
                </span>
                <input
                  className="field"
                  value={profile.partner}
                  maxLength={24}
                  placeholder="mis. Laras"
                  onChange={(e) => setProfile({ partner: e.target.value })}
                />
              </label>
            </div>

            <div className="mt-6 space-y-5">
              <Field label="Bentuk tubuh">
                <Seg
                  items={BODY_STYLES}
                  value={avatar.body}
                  onChange={(v) => setAvatar({ body: v })}
                  label="Bentuk tubuh"
                />
              </Field>

              <Field label="Warna kulit">
                <Swatches
                  items={SKIN_TONES}
                  value={avatar.skin}
                  onChange={(v) => setAvatar({ skin: v })}
                  label="Warna kulit"
                />
              </Field>

              <Field label="Gaya rambut">
                <Chips
                  items={HAIR_STYLES}
                  value={avatar.hair}
                  onChange={(v) => setAvatar({ hair: v })}
                  label="Gaya rambut"
                />
              </Field>

              <Field label="Warna rambut">
                <Swatches
                  items={HAIR_COLORS}
                  value={avatar.hairColor}
                  onChange={(v) => setAvatar({ hairColor: v })}
                  label="Warna rambut"
                />
              </Field>

              <Field label="Warna mata">
                <Swatches
                  items={EYE_COLORS}
                  value={avatar.eye}
                  onChange={(v) => setAvatar({ eye: v })}
                  label="Warna mata"
                />
              </Field>

              <Field label="Pakaian">
                <div className="space-y-3">
                  <Seg
                    items={OUTFIT_STYLES}
                    value={avatar.outfitStyle}
                    onChange={(v) => setAvatar({ outfitStyle: v })}
                    label="Model pakaian"
                  />
                  <Swatches
                    items={OUTFITS}
                    value={avatar.outfit}
                    onChange={(v) => setAvatar({ outfit: v })}
                    label="Warna pakaian"
                  />
                </div>
              </Field>

              <Field label="Foto poster" hint={`${PHOTO_SLOTS} slot · khusus host`}>
                <PhotoGrid
                  photos={profile.photos || []}
                  onSet={(i, url) => setPhotoAt(i, url)}
                  onClear={clearPhotos}
                />
              </Field>

              <Field label="Surat untuknya" hint={`${profile.message.length}/900`}>
                {showMessage ? (
                  <textarea
                    className="field scroll-thin min-h-[110px] resize-none leading-relaxed"
                    maxLength={900}
                    value={profile.message}
                    placeholder="Tulis sesuatu yang akan ia baca di ujung dermaga…"
                    onChange={(e) => setProfile({ message: e.target.value })}
                  />
                ) : (
                  <button
                    onClick={() => setShowMessage(true)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-dashed border-white/20 px-4 py-3.5 text-left text-[13px] text-sand-100/55 transition-colors hover:border-amber-300/40 hover:text-sand-100"
                  >
                    <Heart className="h-4 w-4 text-rose-400" />
                    Tulis surat sendiri (opsional) — jika kosong, kami siapkan kata-kata indah.
                  </button>
                )}
              </Field>
            </div>
          </div>

          {/* footer aksi */}
          <div className="shrink-0 border-t border-white/10 bg-ink-950/50 px-5 py-4 sm:px-7">
            <button
              onClick={onEnter}
              disabled={!canEnter}
              className="btn-primary w-full py-3.5 text-[15px]"
            >
              {canEnter ? `Masuk ke Pulau` : 'Isi nama pasangan dulu'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-2.5 text-center text-[10.5px] text-sand-100/35">
              Kamu bisa mengubah penampilan kapan saja lewat menu pengaturan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
