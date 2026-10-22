import { useMemo } from 'react'
import * as THREE from 'three'
import { groundHeight, ISLAND_RADIUS, COLORS } from './palette'
import { getSandTexture, getWoodTexture } from '../lib/textures'
import { getGlowTexture } from '../lib/glow'

/**
 * Geometri pulau: dibuat manual sebagai cincin-cincin (rings) supaya
 * kemiringan pantai mulus dan warnanya bisa digradasi (pasir kering → basah).
 */
function makeIslandGeometry(rings = 46, segs = 108) {
  const positions = []
  const colors = []
  const indices = []
  const R_OUT = 35

  const cDry = new THREE.Color(COLORS.sand)
  const cWet = new THREE.Color(COLORS.sandWet)
  const cDeep = new THREE.Color('#7d6144')
  const tmp = new THREE.Color()

  for (let i = 0; i <= rings; i++) {
    const f = i / rings
    const r = R_OUT * f
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r

      let y
      if (r <= ISLAND_RADIUS) {
        y = groundHeight(x, z)
      } else {
        const edge = groundHeight(
          Math.cos(a) * ISLAND_RADIUS,
          Math.sin(a) * ISLAND_RADIUS
        )
        const t = (r - ISLAND_RADIUS) / (R_OUT - ISLAND_RADIUS)
        y = edge - Math.pow(t, 1.35) * 3.6
      }
      positions.push(x, y, z)

      // gradasi warna: basah dekat air, kering di atas
      const wet = 1 - THREE.MathUtils.smoothstep(y, -0.15, 0.55)
      tmp.copy(cDry).lerp(cWet, wet)
      if (y < -0.4) tmp.lerp(cDeep, 1 - THREE.MathUtils.smoothstep(y, -1.6, -0.4))
      // variasi halus
      const n =
        0.9 +
        0.06 * Math.sin(x * 1.7 + z * 2.1) * Math.cos(z * 0.9) +
        0.04 * Math.sin(x * 0.55 - z * 0.7)
      tmp.multiplyScalar(n)
      colors.push(tmp.r, tmp.g, tmp.b)
    }
  }

  const stride = segs + 1
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * stride + j
      const b = a + 1
      const c = a + stride
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

/** Hati dari batu kerikil di pasir. */
function PebbleHeart({ position = [6.5, 0, -9], scale = 0.33, count = 112 }) {
  const { geo, matrices } = useMemo(() => {
    const g = new THREE.SphereGeometry(0.095, 8, 6)
    const arr = []
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    const p = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2
      const hx = 16 * Math.pow(Math.sin(t), 3)
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      const x = position[0] + hx * scale * 0.42
      const z = position[2] + hy * scale * 0.42
      const y = groundHeight(x, z) + 0.02
      p.set(x, y, z)
      q.setFromEuler(new THREE.Euler(Math.random() * 0.6, Math.random() * 3, Math.random() * 0.6))
      const k = 0.75 + Math.random() * 0.7
      s.set(k, k * 0.55, k)
      m.compose(p, q, s)
      arr.push(m.clone())
    }
    return { geo: g, matrices: arr }
  }, [position[0], position[2], scale, count])

  return (
    <instancedMesh
      args={[geo, undefined, matrices.length]}
      ref={(inst) => {
        if (!inst) return
        matrices.forEach((m, i) => inst.setMatrixAt(i, m))
        inst.instanceMatrix.needsUpdate = true
        inst.castShadow = true
      }}
    >
      <meshStandardMaterial color="#efe3d2" roughness={0.85} metalness={0} />
    </instancedMesh>
  )
}

/** Semak tropis rendah. */
function Bush({ position, scale = 1, seed = 1 }) {
  const blobs = useMemo(() => {
    const out = []
    let s = seed * 9301
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    for (let i = 0; i < 5; i++) {
      out.push({
        p: [(rnd() - 0.5) * 1.3, 0.22 + rnd() * 0.3, (rnd() - 0.5) * 1.3],
        r: 0.35 + rnd() * 0.32,
      })
    }
    return out
  }, [seed])

  return (
    <group position={position} scale={scale}>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p} castShadow>
          <icosahedronGeometry args={[b.r, 0]} />
          <meshStandardMaterial
            color={i % 2 ? COLORS.leaf : COLORS.leafDark}
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

/** Batu-batu di tepi pantai. */
function Rocks() {
  const rocks = useMemo(
    () => [
      { p: [-20.5, 0, 9.5], s: 1.5, r: 0.4 },
      { p: [-22, 0, 6], s: 0.9, r: 1.1 },
      { p: [21, 0, -11], s: 1.2, r: 2.2 },
      { p: [23, 0, -13.5], s: 0.7, r: 0.6 },
      { p: [-13, 0, -19], s: 1.0, r: 3.0 },
      { p: [15.5, 0, 16], s: 1.35, r: 1.7 },
    ],
    []
  )

  return (
    <group>
      {rocks.map((r, i) => (
        <mesh
          key={i}
          position={[r.p[0], groundHeight(r.p[0], r.p[2]) - 0.15, r.p[2]]}
          rotation={[r.r, r.r * 1.7, r.r * 0.6]}
          scale={[r.s, r.s * 0.7, r.s * 1.1]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial color="#8a7f77" roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/* ---------------- properti pantai ---------------- */

function Starfish({ position, rotation = 0, color = '#ff8a6b', scale = 1 }) {
  const y = groundHeight(position[0], position[2])
  return (
    <group position={[position[0], y + 0.02, position[2]]} rotation={[0, rotation, 0]} scale={scale}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.075, 0, Math.sin(a) * 0.075]}
            rotation={[Math.PI / 2, 0, -a + Math.PI / 2]}
          >
            <capsuleGeometry args={[0.022, 0.15, 3, 6]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        )
      })}
      <mesh>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  )
}

function Driftwood({ position, rotation = 0, length = 1.6 }) {
  const y = groundHeight(position[0], position[2])
  const wood = getWoodTexture()
  return (
    <group position={[position[0], y + 0.08, position[2]]} rotation={[0, rotation, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.075, 0.1, length, 9]} />
        <meshStandardMaterial map={wood} color="#b89474" roughness={0.92} />
      </mesh>
      <mesh position={[length * 0.24, 0.06, 0.08]} rotation={[0.2, 0.4, Math.PI / 2.6]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.6, 7]} />
        <meshStandardMaterial color="#a88363" roughness={0.94} />
      </mesh>
    </group>
  )
}

function Towel({ position, rotation = 0 }) {
  const y = groundHeight(position[0], position[2])
  return (
    <group position={[position[0], y + 0.02, position[2]]} rotation={[0, rotation, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.15, 1.85]} />
        <meshStandardMaterial color="#fdf0dd" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {[-0.3, 0.3].map((z) => (
        <mesh key={z} position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.15, 0.16]} />
          <meshStandardMaterial color="#f9705a" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function Surfboard({ position, rotation = 0, color = '#f7a94e' }) {
  const y = groundHeight(position[0], position[2])
  return (
    <group position={[position[0], y, position[2]]} rotation={[0, rotation, 0.16]}>
      <mesh position={[0, 0.82, 0]} scale={[1, 1, 0.28]} castShadow>
        <capsuleGeometry args={[0.24, 1.24, 6, 14]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.82, 0.06]} scale={[0.16, 1.1, 0.03]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#fff3e2" roughness={0.6} />
      </mesh>
    </group>
  )
}

function FirePit({ position }) {
  const y = groundHeight(position[0], position[2])
  const tex = getGlowTexture()
  const stones = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2
        return { x: Math.cos(a) * 0.52, z: Math.sin(a) * 0.52, r: 0.13 + Math.random() * 0.06 }
      }),
    []
  )
  return (
    <group position={[position[0], y, position[2]]}>
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, 0.05, s.z]} castShadow>
          <dodecahedronGeometry args={[s.r, 0]} />
          <meshStandardMaterial color="#8d8178" roughness={0.95} flatShading />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI
        return (
          <mesh key={i} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, a]} castShadow>
            <cylinderGeometry args={[0.055, 0.065, 0.66, 7]} />
            <meshStandardMaterial color="#6b4a33" roughness={0.95} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.09, 0]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#ff8a3d" emissive="#ff6a1e" emissiveIntensity={3} />
      </mesh>
      <sprite position={[0, 0.32, 0]} scale={1.6}>
        <spriteMaterial
          map={tex}
          color="#ff9a4d"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <pointLight position={[0, 0.7, 0]} color="#ff9a4d" intensity={3.2} distance={7} decay={2} />
    </group>
  )
}

export function BeachProps() {
  return (
    <group>
      <FirePit position={[4.6, 0, -3.6]} />
      <Towel position={[-6.4, 0, 4.2]} rotation={0.7} />
      <Towel position={[7.2, 0, 3.4]} rotation={-1.9} />
      <Surfboard position={[-9.4, 0, -1.6]} rotation={0.5} color="#f7a94e" />
      <Surfboard position={[-10.6, 0, -3.1]} rotation={0.2} color="#2e7d8f" />
      <Driftwood position={[10.4, 0, 5.2]} rotation={1.1} length={1.9} />
      <Driftwood position={[-13.2, 0, 7.4]} rotation={2.4} length={1.4} />
      <Starfish position={[3.1, 0, 1.4]} rotation={0.4} scale={1.1} />
      <Starfish position={[-2.6, 0, 6.6]} rotation={2.1} color="#ffb59c" scale={0.85} />
      <Starfish position={[7.6, 0, 1.2]} rotation={4.0} color="#ef4d72" scale={0.9} />
      <group position={[-4.2, groundHeight(-4.2, 1.2) + 0.2, 1.2]}>
        <mesh castShadow>
          <sphereGeometry args={[0.2, 16, 12]} />
          <meshStandardMaterial color="#fdf0dd" roughness={0.5} />
        </mesh>
        <mesh rotation={[0.4, 0, 0.9]}>
          <torusGeometry args={[0.195, 0.03, 8, 24]} />
          <meshStandardMaterial color="#f9705a" roughness={0.55} />
        </mesh>
        <mesh rotation={[-0.7, 0.5, 0.2]}>
          <torusGeometry args={[0.195, 0.028, 8, 24]} />
          <meshStandardMaterial color="#2e7d8f" roughness={0.55} />
        </mesh>
      </group>
    </group>
  )
}

export default function Island() {
  const geo = useMemo(() => makeIslandGeometry(), [])

  return (
    <group>
      <mesh geometry={geo} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          map={getSandTexture()}
          roughness={0.97}
          metalness={0}
        />
      </mesh>

      <PebbleHeart />
      <Rocks />
      <BeachProps />
      <Bush position={[-13.6, groundHeight(-13.6, 11.5), 11.5]} scale={1.15} seed={2} />
      <Bush position={[9.5, groundHeight(9.5, 9.5), 9.5]} scale={0.95} seed={5} />
      <Bush position={[-2, groundHeight(-2, 16), 16]} scale={1.25} seed={7} />
      <Bush position={[17, groundHeight(17, -2), -2]} scale={1.0} seed={11} />
      <Bush position={[-17, groundHeight(-17, -6), -6]} scale={1.1} seed={13} />
    </group>
  )
}
