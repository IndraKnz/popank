import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Avatar from './Avatar'
import { groundHeight, NPC_SPOTS } from './palette'
import { getPosterTexture } from './posterTexture'
import { NPC_CROWD, PHOTO_SLOTS, POSTER_LINES } from '../lib/content'
import { playerPos } from '../lib/playerState'
import { useStore } from '../store/useStore'

const TINTS = ['#c8402c', '#c1742a', '#b83f66', '#2f7d8a']

/** Sudut hadap awal: ke arah titik pendaratan pemain. */
const baseYawFor = (x, z) => Math.atan2(-x, 6 - z)

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

/* ---------- satu warga pulau + posternya ---------- */

function Npc({ index, spot, config, texture }) {
  const group = useRef()
  const poster = useRef()

  const y = useMemo(() => groundHeight(spot.x, spot.z) - 0.02, [spot.x, spot.z])
  const baseYaw = useMemo(() => {
    // sedikit variasi sudut supaya barisan tidak terasa kaku
    const jitter = ((index % 5) - 2) * 0.075
    return baseYawFor(spot.x, spot.z) + jitter
  }, [spot.x, spot.z, index])
  const seed = index * 0.83

  useFrame((state) => {
    const t = state.clock.elapsedTime + seed
    const g = group.current
    if (!g) return

    // dekat pemain → badan menoleh & poster diangkat sedikit
    const dx = playerPos.x - spot.x
    const dz = playerPos.z - spot.z
    const dist = Math.hypot(dx, dz)
    const near = Math.max(0, Math.min(1, (12 - dist) / 7))

    g.rotation.y = baseYaw + wrapAngle(Math.atan2(dx, dz) - baseYaw) * 0.6 * near
    g.rotation.z = Math.sin(t * 0.9) * 0.012
    g.position.y = y + Math.abs(Math.sin(t * 1.15)) * 0.01 + near * Math.abs(Math.sin(t * 3.1)) * 0.02

    if (poster.current) {
      poster.current.position.y = 0.9 + near * 0.08 + Math.sin(t * 1.9) * 0.006
      poster.current.rotation.z = Math.sin(t * 1.25) * 0.05
      poster.current.rotation.y = Math.sin(t * 0.7) * 0.05
    }
  })

  return (
    <group ref={group} position={[spot.x, y, spot.z]} rotation={[0, baseYaw, 0]}>
      <Avatar config={config} anim="hold">
        {/* poster foto — menempel di badan agar ikut bergoyang */}
        <group ref={poster} position={[0, 0.9, 0.3]} rotation={[-0.1, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.54, 0.71, 0.014]} />
            <meshStandardMaterial color="#f6e7d2" roughness={0.92} metalness={0} />
          </mesh>
          <mesh position={[0, 0, 0.0095]}>
            <planeGeometry args={[0.54, 0.71]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
        </group>
      </Avatar>
    </group>
  )
}

/* ---------- kerumunan ---------- */

export default function NpcCrowd() {
  const ownPhotos = useStore((s) => s.profile.photos)
  const remotePhotos = useStore((s) => s.remotePhotos)
  const partner = useStore((s) => s.profile.partner || 'Sayang')

  // Foto milik host menang; kalau kosong (pasangan), pakai kiriman lewat kanal.
  const photos = useMemo(() => {
    const own = (ownPhotos || []).filter(Boolean)
    return own.length ? ownPhotos : remotePhotos || []
  }, [ownPhotos, remotePhotos])

  const textures = useMemo(() => {
    const first = photos.find(Boolean) || ''
    return Array.from({ length: PHOTO_SLOTS }, (_, i) =>
      getPosterTexture({
        // slot kosong memakai foto pertama supaya poster tidak pernah kosong
        photo: photos[i] || first,
        headline: POSTER_LINES[i % POSTER_LINES.length],
        name: partner,
        tint: TINTS[i % TINTS.length],
      })
    )
  }, [photos, partner])

  return (
    <group>
      {NPC_SPOTS.map((spot, i) => (
        <Npc
          key={i}
          index={i}
          spot={spot}
          config={NPC_CROWD[i % NPC_CROWD.length]}
          texture={textures[i % textures.length]}
        />
      ))}
    </group>
  )
}
