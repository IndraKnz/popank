import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from './scene/Scene'
import Intro from './components/Intro'
import Customizer from './components/Customizer'
import HUD from './components/HUD'
import LetterModal from './components/LetterModal'
import SettingsPanel from './components/SettingsPanel'
import SharePanel from './components/SharePanel'
import HelpModal from './components/HelpModal'
import { useStore } from './store/useStore'
import { decodeWorld, roomCodeFrom } from './lib/share'
import { attachKeyboard } from './lib/input'
import { audio } from './lib/audio'
import { net } from './lib/net'
import { DEFAULT_PROFILE, DEFAULT_AVATAR } from './lib/content'

export default function App() {
  const phase = useStore((s) => s.phase)
  const setPhase = useStore((s) => s.setPhase)
  const profile = useStore((s) => s.profile)
  const avatar = useStore((s) => s.avatar)
  const settings = useStore((s) => s.settings)
  const setProfile = useStore((s) => s.setProfile)
  const setAvatar = useStore((s) => s.setAvatar)
  const setRoom = useStore((s) => s.setRoom)
  const setPeerCount = useStore((s) => s.setPeerCount)
  const setUI = useStore((s) => s.setUI)
  const setIsHost = useStore((s) => s.setIsHost)
  const setDisplayName = useStore((s) => s.setDisplayName)
  const setRemotePhotos = useStore((s) => s.setRemotePhotos)

  const [invited, setInvited] = useState(false)
  const started = useRef(false)

  /* ---------- baca tautan undangan ---------- */
  useEffect(() => {
    const read = () => {
      const data = decodeWorld(window.location.hash)
      if (!data) return
      if (data.p) {
        setProfile({
          partner: data.p.partner || DEFAULT_PROFILE.partner,
          from: data.p.from || '',
          message: data.p.message || '',
          date: data.p.date || '',
        })
      }
      if (data.a) setAvatar({ ...DEFAULT_AVATAR, ...data.a })
      setInvited(true)
      setIsHost(false)
      if (data.r) setRoom(data.r)
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [setProfile, setAvatar, setRoom, setIsHost])

  /* ---------- hook debug (hanya saat dev) ---------- */
  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Proxy agar pembacaan selalu memakai state terbaru (getState() = snapshot).
    window.__et = new Proxy(
      {},
      { get: (_, key) => (key === 'state' ? useStore.getState() : useStore.getState()[key]) }
    )
  }, [phase])

  /* ---------- keyboard ---------- */
  useEffect(() => attachKeyboard(), [])

  /* ---------- kode ruang: manual dulu, baru dari nama pasangan ---------- */
  useEffect(() => {
    const manual = (profile.room || '').trim().toUpperCase()
    if (manual) {
      setRoom(manual)
      return
    }
    if (!profile.partner) return
    setRoom(roomCodeFrom(profile.partner))
  }, [profile.partner, profile.room, setRoom])

  /* ---------- volume audio ---------- */
  useEffect(() => {
    audio.setMusicVolume(settings.music)
    audio.setAmbienceVolume(settings.ambience)
  }, [settings.music, settings.ambience])

  /* ---------- jeda audio saat tab disembunyikan ---------- */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) audio.suspend()
      else if (phase === 'world') audio.resume()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [phase])

  /* ---------- hitung peserta ---------- */
  useEffect(() => {
    const unsub = net.subscribe((list) => setPeerCount(list.length))
    return () => unsub()
  }, [setPeerCount])

  /* ---------- terima foto poster dari host ---------- */
  useEffect(() => {
    net.onPhotos = (photos) => setRemotePhotos(photos)
    return () => {
      net.onPhotos = null
    }
  }, [setRemotePhotos])

  const enterWorld = useCallback(async () => {
    if (started.current) return
    started.current = true

    await audio.ensure()
    audio.setMusicVolume(settings.music)
    audio.setAmbienceVolume(settings.ambience)
    audio.startMusic()
    audio.startAmbience()

    const manual = (profile.room || '').trim().toUpperCase()
    const code = manual || roomCodeFrom(profile.partner)
    setRoom(code)

    const host = useStore.getState().isHost
    // host memakai namanya sendiri; pasangan memakai nama yang ia ketik
    // di menu awal (kalau dikosongkan, dipakai nama dari undangan)
    const name =
      (host ? profile.from : useStore.getState().guestName.trim() || profile.partner) || 'Kamu'
    setDisplayName(name)

    net.connect({
      code,
      self: {
        id: useStore.getState().selfId,
        name,
        avatar: useStore.getState().avatar,
      },
      // hanya host yang punya foto; pasangan menerimanya lewat kanal
      photos: host ? useStore.getState().profile.photos || [] : [],
    })

    setPhase('world')
    setUI({ help: false, settings: false, share: false })
  }, [
    profile.partner,
    profile.from,
    profile.room,
    settings.music,
    settings.ambience,
    setPhase,
    setRoom,
    setUI,
    setDisplayName,
  ])

  const start = useCallback(async () => {
    // buka blokir audio pada gestur pertama
    await audio.ensure()
    // pasangan yang membuka undangan langsung masuk — tanpa kustomisasi
    if (useStore.getState().isHost === false) {
      enterWorld()
      return
    }
    setPhase('customize')
  }, [enterWorld, setPhase])

  const canvasCamera = useMemo(
    () => ({ fov: 52, near: 0.1, far: 1400, position: [0, 9, 26] }),
    []
  )

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-ink-900">
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={canvasCamera}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 0.95
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Scene />
      </Canvas>

      {/* vignette sinematik */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(115% 95% at 50% 42%, rgba(0,0,0,0) 42%, rgba(12,7,18,0.34) 78%, rgba(8,4,14,0.6) 100%)',
        }}
      />

      {phase === 'intro' && (
        <Intro
          invited={invited}
          partner={profile.partner}
          onStart={start}
          onHelp={() => setUI({ help: true })}
        />
      )}

      {phase === 'customize' && (
        <Customizer onBack={() => setPhase('intro')} onEnter={enterWorld} />
      )}

      {phase === 'world' && (
        <>
          <HUD />
          <LetterModal />
          <SettingsPanel />
          <SharePanel />
        </>
      )}

      <HelpModal />

      {/* transisi masuk dunia */}
      {phase === 'world' && (
        <div
          className="pointer-events-none absolute inset-0 z-40 bg-ink-950"
          style={{ animation: 'et-fade-out 1.1s ease forwards' }}
        />
      )}
      <style>{`
        @keyframes et-fade-out {
          from { opacity: 1; }
          to { opacity: 0; visibility: hidden; }
        }
      `}</style>
    </div>
  )
}
