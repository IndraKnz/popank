import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_AVATAR, DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../lib/content'

/**
 * Store global Ever Tide.
 * - phase      : 'intro' | 'customize' | 'world'
 * - settings   : dipersist ke localStorage
 * - avatar     : dipersist (biar tidak perlu atur ulang)
 * - transient  : state runtime (surat terbuka, momen langit, dsb.)
 */
export const useStore = create(
  persist(
    (set, get) => ({
      phase: 'intro',
      ready: false,

      /** true = orang yang menyiapkan pulau, false = pasangan yang membuka undangan */
      isHost: true,

      /** nama tampilan pemain yang membuka undangan (bisa diubah di menu awal) */
      guestName: '',

      profile: { ...DEFAULT_PROFILE },
      avatar: { ...DEFAULT_AVATAR },
      settings: { ...DEFAULT_SETTINGS },

      // foto poster milik host yang diterima lewat kanal ruang
      remotePhotos: [],

      /** nama yang tampil di dunia (dipakai untuk presence multiplayer) */
      displayName: '',

      // UI
      ui: {
        settings: false,
        share: false,
        letter: false,
        help: false,
        reactions: false,
      },

      // Runtime
      nearLetter: false,
      nearSwing: false,
      onSwing: false,
      letterRead: false,
      skyMoment: 0,
      roomCode: '',
      peerCount: 0,
      selfId: Math.random().toString(36).slice(2, 9),
      lastReaction: null,
      reactionAt: 0,
      toast: null,

      // ---------- actions ----------
      setPhase: (phase) => set({ phase }),
      setReady: (ready) => set({ ready }),

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      setGuestName: (guestName) => set({ guestName }),

      /* ---------- foto poster (khusus host) ---------- */
      setIsHost: (isHost) => set({ isHost }),
      setDisplayName: (displayName) => set({ displayName }),
      setPhotoAt: (index, dataUrl) =>
        set((s) => {
          const photos = [...(s.profile.photos || [])]
          while (photos.length < 8) photos.push('')
          photos[index] = dataUrl
          return { profile: { ...s.profile, photos } }
        }),
      clearPhotos: () => set((s) => ({ profile: { ...s.profile, photos: [] } })),
      setRemotePhotos: (photos) => {
        if (!Array.isArray(photos) || !photos.length) return
        const clean = photos.slice(0, 8).map((p) => (typeof p === 'string' ? p : ''))
        const cur = get().remotePhotos
        if (cur.length === clean.length && cur.every((p, i) => p === clean[i])) return
        set({ remotePhotos: clean })
      },

      setAvatar: (patch) => set((s) => ({ avatar: { ...s.avatar, ...patch } })),
      randomizeAvatar: () =>
        set(() => {
          const pick = (arr) => arr[Math.floor(Math.random() * arr.length)].id
          return {
            avatar: {
              body: pick([{ id: 'petite' }, { id: 'classic' }, { id: 'tall' }]),
              skin: pick([
                { id: 'porcelain' },
                { id: 'peach' },
                { id: 'honey' },
                { id: 'amber' },
                { id: 'chestnut' },
                { id: 'cocoa' },
              ]),
              hair: pick([
                { id: 'short' },
                { id: 'bob' },
                { id: 'long' },
                { id: 'ponytail' },
                { id: 'bun' },
                { id: 'curly' },
                { id: 'buzz' },
              ]),
              hairColor: pick([
                { id: 'raven' },
                { id: 'espresso' },
                { id: 'chestnut' },
                { id: 'honey' },
                { id: 'sand' },
                { id: 'rose' },
                { id: 'plum' },
                { id: 'silver' },
              ]),
              eye: pick([
                { id: 'hazel' },
                { id: 'amber' },
                { id: 'olive' },
                { id: 'ocean' },
                { id: 'storm' },
                { id: 'violet' },
              ]),
              outfit: pick([
                { id: 'sunset' },
                { id: 'coral' },
                { id: 'rose' },
                { id: 'amber' },
                { id: 'lagoon' },
                { id: 'mint' },
                { id: 'lavender' },
                { id: 'cream' },
                { id: 'ink' },
              ]),
              outfitStyle: pick([{ id: 'dress' }, { id: 'shirt' }, { id: 'tank' }]),
            },
          }
        }),

      setSetting: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),

      setUI: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
      closeAllUI: () =>
        set({ ui: { settings: false, share: false, letter: false, help: false, reactions: false } }),

      setNearLetter: (near) => {
        if (get().nearLetter !== near) set({ nearLetter: near })
      },
      setNearSwing: (near) => {
        if (get().nearSwing !== near) set({ nearSwing: near })
      },
      setOnSwing: (onSwing) => {
        if (get().onSwing !== onSwing) set({ onSwing })
      },
      openLetter: () => set((s) => ({ ui: { ...s.ui, letter: true }, letterRead: true })),
      closeLetter: () => set((s) => ({ ui: { ...s.ui, letter: false } })),

      triggerSky: () => set({ skyMoment: Date.now() }),
      triggerReaction: (id) =>
        set({ lastReaction: id, reactionAt: Date.now() }),

      setRoom: (roomCode) => set({ roomCode }),
      setPeerCount: (peerCount) => set({ peerCount }),

      showToast: (toast) => {
        set({ toast })
        const t = setTimeout(() => {
          if (get().toast?.id === toast.id) set({ toast: null })
        }, 2600)
        return () => clearTimeout(t)
      },
    }),
    {
      name: 'ever-tide-v1',
      partialize: (s) => ({
        profile: s.profile,
        avatar: s.avatar,
        settings: s.settings,
        letterRead: s.letterRead,
        remotePhotos: s.remotePhotos,
        guestName: s.guestName,
      }),
      // migrasi dari versi satu-foto (`profile.photo`) ke delapan slot
      merge: (persisted, current) => {
        const next = { ...current, ...persisted }
        next.profile = { ...current.profile, ...(persisted?.profile || {}) }
        const old = next.profile.photo
        if (old && !(next.profile.photos || []).some(Boolean)) {
          next.profile.photos = [old]
        }
        delete next.profile.photo
        if (!Array.isArray(next.profile.photos)) next.profile.photos = []
        if (!Array.isArray(next.remotePhotos)) next.remotePhotos = []
        return next
      },
    }
  )
)

export const useSettings = () => useStore((s) => s.settings)
export const useAvatar = () => useStore((s) => s.avatar)
export const useProfile = () => useStore((s) => s.profile)
