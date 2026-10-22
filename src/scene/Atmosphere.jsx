import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getGlowTexture, getCloudTexture } from '../lib/glow'
import { playerPos } from '../lib/playerState'
import { useStore } from '../store/useStore'

/* ------------------------------------------------------------------
   Kunang-kunang / serbuk cahaya di sekitar pantai
------------------------------------------------------------------ */
export function Fireflies({ count = 120, quality = 'high' }) {
  const enabled = useStore((s) => s.settings.fireflies)
  const n = Math.round(count * (quality === 'low' ? 0.4 : quality === 'medium' ? 0.7 : 1))

  const { geo, seeds } = useMemo(() => {
    const pos = new Float32Array(n * 3)
    const seeds = new Float32Array(n * 4)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 4 + Math.random() * 22
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = 0.35 + Math.random() * 2.4
      pos[i * 3 + 2] = Math.sin(a) * r
      seeds[i * 4] = Math.random() * 6.28
      seeds[i * 4 + 1] = 0.25 + Math.random() * 0.7
      seeds[i * 4 + 2] = 0.4 + Math.random() * 1.2
      seeds[i * 4 + 3] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { geo: g, seeds }
  }, [n])

  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])
  const tex = useMemo(() => getGlowTexture(), [])

  useFrame((state) => {
    if (!enabled) return
    const t = state.clock.elapsedTime
    const arr = geo.attributes.position.array
    for (let i = 0; i < n; i++) {
      const s = seeds[i * 4]
      const sp = seeds[i * 4 + 1]
      const amp = seeds[i * 4 + 2]
      arr[i * 3] = base[i * 3] + Math.sin(t * sp * 0.6 + s) * amp
      arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * sp * 0.9 + s * 2) * amp * 0.5
      arr[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * sp * 0.5 + s * 1.7) * amp
    }
    geo.attributes.position.needsUpdate = true
  })

  if (!enabled) return null

  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial
        map={tex}
        color="#ffd9a0"
        size={0.13}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

/* ------------------------------------------------------------------
   Lentera kertas yang naik ke langit
------------------------------------------------------------------ */
export function SkyLanterns({ count = 16 }) {
  const group = useRef()
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.random() - 0.5) * 70,
        z: -35 - Math.random() * 80,
        speed: 0.35 + Math.random() * 0.55,
        phase: Math.random() * 40,
        sway: 0.6 + Math.random() * 1.4,
        scale: 0.5 + Math.random() * 0.5,
      })),
    [count]
  )
  const tex = useMemo(() => getGlowTexture(), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!group.current) return
    group.current.children.forEach((child, i) => {
      const d = data[i]
      if (!d) return
      const y = ((t * d.speed + d.phase) % 46) + 1.2
      child.position.set(
        d.x + Math.sin(t * 0.25 + d.phase) * d.sway,
        y,
        d.z + Math.cos(t * 0.2 + d.phase) * d.sway
      )
      child.rotation.z = Math.sin(t * 0.4 + d.phase) * 0.12
      const fade = Math.min(1, y / 6) * Math.min(1, (46 - y) / 12)
      child.children.forEach((c) => {
        if (c.material) c.material.opacity = fade * 0.95
      })
    })
  })

  return (
    <group ref={group}>
      {data.map((d, i) => (
        <group key={i} scale={d.scale}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.22, 0.5, 8]} />
            <meshStandardMaterial
              color="#ffcf94"
              emissive="#ff9a4d"
              emissiveIntensity={1.8}
              transparent
              opacity={0.95}
              roughness={0.6}
            />
          </mesh>
          <sprite scale={1.7}>
            <spriteMaterial
              map={tex}
              color="#ffab5e"
              transparent
              opacity={0.45}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------
   Kembang api lembut (dipicu oleh "Lihat ke Langit" / reaksi Merayakan)
------------------------------------------------------------------ */
export function Fireworks() {
  const skyMoment = useStore((s) => s.skyMoment)
  const POOL = 720
  const BURSTS = 6
  const PER = Math.floor(POOL / BURSTS)

  const { geo, state } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POOL * 3), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(POOL * 3), 3))
    const st = {
      vel: new Float32Array(POOL * 3),
      life: new Float32Array(POOL),
      max: new Float32Array(POOL),
      start: new Float32Array(POOL).fill(1e9),
      hue: new Float32Array(POOL * 3),
      active: false,
      t: 0,
    }
    return { geo: g, state: st }
  }, [])

  const tex = useMemo(() => getGlowTexture(), [])

  const spawnBurst = (origin, t0) => {
    // Warna sengaja di luar palet langit (magenta / sian / emas / putih)
    // supaya tetap "meletup" di atas langit oranye yang terang.
    const palette = [
      [1.0, 0.22, 0.52],
      [0.32, 0.86, 1.0],
      [1.0, 0.86, 0.34],
      [1.0, 0.98, 0.92],
      [0.72, 0.42, 1.0],
      [1.0, 0.55, 0.28],
    ]
    const pos = geo.attributes.position.array
    for (let b = 0; b < BURSTS; b++) {
      const base = b * PER
      const ox = origin.x + (Math.random() - 0.5) * 90
      const oy = origin.y + Math.random() * 26
      const oz = origin.z - Math.random() * 45
      const col = palette[b % palette.length]
      for (let i = 0; i < PER; i++) {
        const idx = base + i
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        // sebaran seragam di dalam bola supaya bentuknya bulat penuh
        const speed = 3.2 + Math.pow(Math.random(), 0.5) * 10.0
        state.vel[idx * 3] = Math.sin(phi) * Math.cos(theta) * speed
        state.vel[idx * 3 + 1] = Math.cos(phi) * speed
        state.vel[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
        state.hue[idx * 3] = col[0]
        state.hue[idx * 3 + 1] = col[1]
        state.hue[idx * 3 + 2] = col[2]
        state.life[idx] = 0
        state.max[idx] = 1.9 + Math.random() * 1.5
        state.start[idx] = t0 + b * 0.32
        pos[idx * 3] = ox
        pos[idx * 3 + 1] = oy
        pos[idx * 3 + 2] = oz
      }
    }
    state.active = true
    state.t = t0
    geo.attributes.position.needsUpdate = true
  }

  useEffect(() => {
    if (!skyMoment) return
    spawnBurst({ x: 0, y: 46, z: -98 }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skyMoment])

  useFrame((_, dt) => {
    if (!state.active) return
    const d = Math.min(dt, 0.05)
    state.t += d
    const pos = geo.attributes.position.array
    const col = geo.attributes.color.array
    let alive = 0

    for (let i = 0; i < POOL; i++) {
      // belum waktunya meledak
      if (state.t < state.start[i]) {
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0
        alive++
        continue
      }
      if (state.life[i] >= state.max[i] || state.max[i] === 0) {
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0
        continue
      }
      alive++
      state.life[i] += d
      const drag = Math.pow(0.965, d * 60)
      state.vel[i * 3] *= drag
      state.vel[i * 3 + 1] = state.vel[i * 3 + 1] * drag - 2.4 * d
      state.vel[i * 3 + 2] *= drag

      pos[i * 3] += state.vel[i * 3] * d
      pos[i * 3 + 1] += state.vel[i * 3 + 1] * d
      pos[i * 3 + 2] += state.vel[i * 3 + 2] * d

      const life = state.life[i]
      const f = Math.max(0, 1 - life / state.max[i])
      const tw = 0.7 + 0.3 * Math.sin(life * 26 + i)
      // kilatan putih panas tepat setelah ledakan, lalu memudar ke warna aslinya
      const hot = Math.max(0, 1 - life / 0.28)
      const k = (f * f * 0.9 + f * 0.5) * tw
      col[i * 3] = Math.min(1, state.hue[i * 3] * k + hot * 0.9)
      col[i * 3 + 1] = Math.min(1, state.hue[i * 3 + 1] * k + hot * 0.9)
      col[i * 3 + 2] = Math.min(1, state.hue[i * 3 + 2] * k + hot * 0.9)
    }

    geo.attributes.position.needsUpdate = true
    geo.attributes.color.needsUpdate = true
    if (alive === 0) state.active = false
  })

  return (
    <points geometry={geo} frustumCulled={false} renderOrder={5}>
      <pointsMaterial
        map={tex}
        size={2.1}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

/* ------------------------------------------------------------------
   Kelopak mawar yang terbawa angin — mengitari pemain
------------------------------------------------------------------ */
export function Petals({ count = 46 }) {
  const group = useRef()
  const mesh = useRef()

  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 30,
        z: (Math.random() - 0.5) * 30,
        y: Math.random() * 14,
        vy: 0.3 + Math.random() * 0.45,
        phase: Math.random() * 6.28,
        spin: (Math.random() - 0.5) * 2.2,
        rot: Math.random() * 6.28,
        s: 0.8 + Math.random() * 0.6,
      })),
    [count]
  )

  const colors = useMemo(
    () => ['#f7b8c4', '#f6e2d6', '#f2a0a8', '#ef8fa6', '#fbe6ea'].map((c) => new THREE.Color(c)),
    []
  )

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    const t = state.clock.elapsedTime
    const g = group.current
    const inst = mesh.current
    if (!g || !inst) return

    // kelopak mengikuti pemain supaya selalu terlihat di sekitar
    g.position.set(playerPos.x, 0, playerPos.z)

    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const sc = new THREE.Vector3()

    for (let i = 0; i < data.length; i++) {
      const d0 = data[i]
      d0.y -= d0.vy * d
      d0.rot += d0.spin * d
      if (d0.y < 0.15) {
        d0.y = 12 + Math.random() * 3
        d0.x = (Math.random() - 0.5) * 30
        d0.z = (Math.random() - 0.5) * 30
      }
      const sway = Math.sin(t * 0.9 + d0.phase)
      p.set(d0.x + sway * 0.5, d0.y, d0.z + Math.cos(t * 0.7 + d0.phase) * 0.5)
      e.set(d0.rot * 0.7, d0.rot, sway * 0.5)
      q.setFromEuler(e)
      sc.set(d0.s, d0.s, d0.s)
      m.compose(p, q, sc)
      inst.setMatrixAt(i, m)
    }
    inst.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group}>
      <instancedMesh
        ref={(inst) => {
          if (!inst) return
          const col = new THREE.Color()
          data.forEach((_, i) => {
            inst.setColorAt(i, col.copy(colors[i % colors.length]))
          })
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true
          inst.frustumCulled = false
        }}
        args={[undefined, undefined, count]}
      >
        <sphereGeometry args={[0.11, 8, 6]} />
        <meshStandardMaterial roughness={0.85} metalness={0} />
      </instancedMesh>
    </group>
  )
}

/* ------------------------------------------------------------------
   Awan senja — sprite lembut yang mengapung pelan di dekat horizon
------------------------------------------------------------------ */
export function Clouds({ count = 9 }) {
  const group = useRef()
  const tex = useMemo(() => getCloudTexture(), [])
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const r = 230 + Math.random() * 130
        return {
          x: Math.cos(a) * r,
          z: Math.sin(a) * r,
          y: 26 + Math.random() * 62,
          scale: 70 + Math.random() * 90,
          speed: 0.008 + Math.random() * 0.02,
          phase: Math.random() * 6.28,
          warm: Math.random(),
        }
      }),
    [count]
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!group.current) return
    group.current.children.forEach((c, i) => {
      const d = data[i]
      c.position.x = d.x + Math.sin(t * d.speed * 4 + d.phase) * 14
      c.position.y = d.y + Math.sin(t * 0.07 + d.phase) * 1.6
    })
  })

  return (
    <group ref={group}>
      {data.map((d, i) => (
        <sprite key={i} position={[d.x, d.y, d.z]} scale={[d.scale, d.scale * 0.42, 1]}>
          <spriteMaterial
            map={tex}
            color={d.warm > 0.5 ? '#ffd0a4' : '#f3b6a8'}
            transparent
            opacity={0.34}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}
