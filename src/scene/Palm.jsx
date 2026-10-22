import { useMemo } from 'react'
import * as THREE from 'three'
import { COLORS, groundHeight } from './palette'

/** Batang kelapa: silinder yang dibengkokkan + riak ring. */
function makeTrunkGeometry(len, lean, seed = 1) {
  const g = new THREE.CylinderGeometry(0.155, 0.3, len, 9, 20, false)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    // clamp: galat pembulatan bisa membuat t sedikit negatif → Math.pow(−ε, 1.9) = NaN
    const t = Math.max(0, (y + len / 2) / len)
    const bend = lean * Math.pow(t, 1.9) * len
    const ripple = 1 + 0.055 * Math.sin(t * 26 + seed)
    pos.setX(i, x * ripple + bend)
    pos.setZ(i, z * ripple)
  }
  g.computeVertexNormals()
  return g
}

/** Satu pelepah: pita melengkung dengan tepi bergerigi. */
function frondVerts(len, rise, droop, width, segs, out) {
  const start = out.pos.length / 3
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const x = len * t
    const y = rise * Math.sin(t * Math.PI * 0.62) - droop * t * t
    const serr = 1 + 0.13 * Math.sin(t * 44)
    const w = width * Math.sin(Math.PI * Math.min(1, t * 1.3)) * serr
    out.pos.push(x, y, w, x, y - w * 0.42, 0, x, y, -w)
    out.uv.push(t, 1, t, 0.5, t, 0)
  }
  for (let i = 0; i < segs; i++) {
    const a = start + i * 3
    const b = a + 3
    out.idx.push(a, b, a + 1, a + 1, b, b + 1)
    out.idx.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2)
  }
}

function makeCrownGeometry(seed = 1) {
  let s = seed * 7919
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }

  const out = { pos: [], idx: [], uv: [] }
  const count = 11 + Math.floor(rnd() * 3)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()

  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rnd() * 0.35
    const tilt = 0.45 + rnd() * 0.55
    const len = 2.9 + rnd() * 1.5
    const rise = 0.85 + rnd() * 0.5
    const droop = 1.25 + rnd() * 0.85

    const tmp = { pos: [], idx: [], uv: [] }
    frondVerts(len, rise, droop, 0.33 + rnd() * 0.08, 12, tmp)

    e.set(0, ang, -tilt + 0.85, 'YXZ')
    q.setFromEuler(e)
    m.compose(new THREE.Vector3(0, 0, 0), q, new THREE.Vector3(1, 1, 1))

    const base = out.pos.length / 3
    const v = new THREE.Vector3()
    for (let k = 0; k < tmp.pos.length; k += 3) {
      v.set(tmp.pos[k], tmp.pos[k + 1], tmp.pos[k + 2]).applyMatrix4(m)
      out.pos.push(v.x, v.y, v.z)
    }
    out.uv.push(...tmp.uv)
    tmp.idx.forEach((ix) => out.idx.push(ix + base))
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2))
  g.setIndex(out.idx)
  g.computeVertexNormals()
  return g
}

const TRUNK_MAT = { color: COLORS.wood, roughness: 0.92, metalness: 0, flatShading: false }

export default function Palm({ position, height = 1, lean = 0.2, rotation = 0, seed = 1 }) {
  const len = 6.2 * height

  const trunk = useMemo(() => makeTrunkGeometry(len, lean, seed), [len, lean, seed])
  const crown = useMemo(() => makeCrownGeometry(seed), [seed])

  const coconuts = useMemo(() => {
    const out = []
    let s = seed * 331
    const rnd = () => {
      s = (s * 1103515245 + 12345) % 2147483648
      return s / 2147483648
    }
    for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI * 2
      out.push({
        p: [Math.cos(a) * 0.24, -0.22 - rnd() * 0.15, Math.sin(a) * 0.24],
        r: 0.13 + rnd() * 0.04,
      })
    }
    return out
  }, [seed])

  const topX = lean * len
  const crownY = len / 2

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={trunk} castShadow receiveShadow position={[0, len / 2, 0]}>
        <meshStandardMaterial {...TRUNK_MAT} />
      </mesh>

      <group position={[topX, crownY, 0]}>
        <mesh geometry={crown} castShadow>
          <meshStandardMaterial
            color={COLORS.leaf}
            roughness={0.82}
            metalness={0}
            side={THREE.DoubleSide}
            flatShading={false}
          />
        </mesh>
        {coconuts.map((c, i) => (
          <mesh key={i} position={c.p} castShadow>
            <sphereGeometry args={[c.r, 10, 8]} />
            <meshStandardMaterial color="#5a4126" roughness={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

const PALMS = [
  { p: [-10.5, -9.5], height: 1.0, lean: 0.16, rotation: 0.4, seed: 1 },
  { p: [11, -8], height: 1.12, lean: -0.2, rotation: 1.2, seed: 2 },
  { p: [-16.5, 2.5], height: 0.88, lean: 0.28, rotation: 2.1, seed: 3 },
  { p: [15, 5.5], height: 1.05, lean: -0.14, rotation: 3.4, seed: 4 },
  { p: [-7.5, 12.5], height: 1.1, lean: 0.1, rotation: 4.2, seed: 5 },
  { p: [7, 15.5], height: 0.95, lean: -0.26, rotation: 5.0, seed: 6 },
  { p: [19.5, -3], height: 1.2, lean: -0.3, rotation: 0.9, seed: 7 },
  { p: [-19, -4.5], height: 1.0, lean: 0.32, rotation: 2.7, seed: 8 },
  { p: [2.5, 19], height: 1.15, lean: -0.08, rotation: 1.9, seed: 9 },
]

/** Posisi batang palem di dunia — dipakai kamera agar tidak menembus pohon. */
export const PALM_TRUNKS = PALMS.map((t) => ({ x: t.p[0], z: t.p[1] }))

export function PalmGrove() {
  return (
    <group>
      {PALMS.map((t, i) => (
        <Palm
          key={i}
          position={[t.p[0], groundHeight(t.p[0], t.p[1]) - 0.12, t.p[1]]}
          height={t.height}
          lean={t.lean}
          rotation={t.rotation}
          seed={t.seed}
        />
      ))}
    </group>
  )
}
