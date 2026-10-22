import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { groundHeight } from './palette'
import { getGlowTexture } from '../lib/glow'
import { GARDEN, GARDEN_YAW, SWING, swingRig } from '../lib/gardenState'
import { useStore } from '../store/useStore'

/**
 * Taman kecil untuk bermain di sisi barat pulau:
 * pagar kayu, gapura bunga, ayunan, jungkat-jungkit, bak pasir,
 * tikar piknik, dan lentera. Semua prosedural.
 */

const WOOD = '#8a5a3c'
const WOOD_DARK = '#5e3a26'
const WOOD_LIGHT = '#c39264'
const CREAM = '#f4e6d1'

const FLOWERS = ['#f9705a', '#ef4d72', '#f7a94e', '#f3e2cb', '#b98ad6', '#ff9d7d']

/** Setengah lebar mulut taman (radian) — dipakai pagar dan gapura. */
const GAP = 0.34

function rng(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/* ---------- pagar kayu ---------- */

function Fence({ radius = GARDEN.r, gap = GAP }) {
  const ref = useRef()

  const { pickets, rails } = useMemo(() => {
    const arr = []
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const rand = rng(7)

    const step = 0.062
    for (let a = gap; a <= Math.PI * 2 - gap; a += step) {
      const x = Math.cos(a) * radius
      const z = Math.sin(a) * radius
      const h = 0.44 + rand() * 0.05
      p.set(x, h / 2 - 0.03, z)
      q.setFromEuler(new THREE.Euler(0, -a, 0))
      s.set(1, h / 0.44, 1)
      m.compose(p, q, s)
      arr.push(m.clone())
    }

    // dua rel mengikuti busur (tabung, jadi tidak perlu matematika rotasi)
    const makeRail = (y) => {
      const pts = []
      for (let a = gap; a <= Math.PI * 2 - gap + 0.001; a += 0.08) {
        pts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius))
      }
      return new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts),
        Math.max(24, pts.length),
        0.022,
        5,
        false
      )
    }

    return { pickets: arr, rails: [makeRail(0.16), makeRail(0.33)] }
  }, [radius, gap])

  return (
    <group>
      <instancedMesh
        ref={(inst) => {
          if (!inst) return
          pickets.forEach((mm, i) => inst.setMatrixAt(i, mm))
          inst.instanceMatrix.needsUpdate = true
          inst.castShadow = true
        }}
        args={[undefined, undefined, pickets.length]}
      >
        <boxGeometry args={[0.032, 0.44, 0.075]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.85} />
      </instancedMesh>

      {rails.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial color={WOOD} roughness={0.88} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- gapura bunga ---------- */

function Arch() {
  const r = GARDEN.r

  const { archGeo, blossoms } = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 18; i++) {
      const t = i / 18
      const a = -GAP + t * GAP * 2
      pts.push(new THREE.Vector3(Math.cos(a) * r, 1.3 + Math.sin(t * Math.PI) * 0.34, Math.sin(a) * r))
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.04, 6, false)

    const rand = rng(21)
    const out = []
    for (let i = 0; i < 20; i++) {
      const t = i / 19
      const a = -GAP + t * GAP * 2
      out.push({
        x: Math.cos(a) * (r + (rand() - 0.5) * 0.12),
        y: 1.3 + Math.sin(t * Math.PI) * 0.34 + (rand() - 0.5) * 0.08,
        z: Math.sin(a) * (r + (rand() - 0.5) * 0.12),
        s: 0.055 + rand() * 0.04,
        c: FLOWERS[Math.floor(rand() * FLOWERS.length)],
      })
    }
    return { archGeo: geo, blossoms: out }
  }, [r])

  return (
    <group>
      {[-GAP, GAP].map((a) => (
        <mesh
          key={a}
          position={[Math.cos(a) * r, 0.65, Math.sin(a) * r]}
          rotation={[0, -a, 0]}
          castShadow
        >
          <boxGeometry args={[0.1, 1.34, 0.1]} />
          <meshStandardMaterial color={WOOD} roughness={0.86} />
        </mesh>
      ))}

      <mesh geometry={archGeo} castShadow>
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>

      {blossoms.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]} castShadow>
          <icosahedronGeometry args={[b.s, 0]} />
          <meshStandardMaterial color={b.c} roughness={0.72} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- hamparan bunga ---------- */

function FlowerBeds() {
  const stems = useRef()
  const heads = useRef()

  const data = useMemo(() => {
    const rand = rng(13)
    const out = []
    for (let c = 0; c < 12; c++) {
      const a = 1.05 + (c / 12) * (Math.PI * 2 - 2.1)
      const cr = GARDEN.r - 0.72 - rand() * 0.3
      const cx = Math.cos(a) * cr
      const cz = Math.sin(a) * cr
      const n = 5 + Math.floor(rand() * 5)
      for (let i = 0; i < n; i++) {
        const ang = rand() * Math.PI * 2
        const rad = rand() * 0.32
        out.push({
          x: cx + Math.cos(ang) * rad,
          z: cz + Math.sin(ang) * rad,
          h: 0.2 + rand() * 0.22,
          s: 0.075 + rand() * 0.045,
          c: FLOWERS[Math.floor(rand() * FLOWERS.length)],
        })
      }
    }
    return out
  }, [])

  return (
    <group>
      <instancedMesh
        ref={(inst) => {
          if (!inst) return
          const m = new THREE.Matrix4()
          const q = new THREE.Quaternion()
          const p = new THREE.Vector3()
          const s = new THREE.Vector3()
          data.forEach((f, i) => {
            p.set(f.x, f.h / 2, f.z)
            s.set(1, f.h / 0.3, 1)
            m.compose(p, q, s)
            inst.setMatrixAt(i, m)
          })
          inst.instanceMatrix.needsUpdate = true
        }}
        args={[undefined, undefined, data.length]}
      >
        <cylinderGeometry args={[0.008, 0.012, 0.3, 4]} />
        <meshStandardMaterial color="#4f7a46" roughness={0.9} />
      </instancedMesh>

      <instancedMesh
        ref={(inst) => {
          if (!inst) return
          const m = new THREE.Matrix4()
          const q = new THREE.Quaternion()
          const p = new THREE.Vector3()
          const s = new THREE.Vector3()
          const col = new THREE.Color()
          data.forEach((f, i) => {
            p.set(f.x, f.h + f.s * 0.5, f.z)
            s.setScalar(f.s / 0.06)
            m.compose(p, q, s)
            inst.setMatrixAt(i, m)
            inst.setColorAt(i, col.set(f.c))
          })
          inst.instanceMatrix.needsUpdate = true
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true
          inst.castShadow = true
        }}
        args={[undefined, undefined, data.length]}
      >
        <icosahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </group>
  )
}

/* ---------- ayunan (bisa dinaiki) ---------- */

function Swing() {
  const carriage = useRef()
  const seatRef = useRef()
  const angle = useRef(0)
  const riding = useStore((s) => s.onSwing)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)

    // ayunan makin lebar saat dinaiki
    const amp = riding ? 0.52 : 0.1
    const target = amp * Math.sin(t * (riding ? 2.3 : 1.15))
    angle.current += (target - angle.current) * Math.min(1, d * 3.2)

    if (carriage.current) carriage.current.rotation.z = angle.current

    if (seatRef.current) {
      seatRef.current.getWorldPosition(swingRig.seat)
      swingRig.ready = true
    }
  })

  const ropeH = SWING.len
  return (
    <group position={[SWING.x, 0, SWING.z]}>
      {/* tiang A di dua sisi */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * 0.95]}>
          {[-1, 1].map((d) => (
            <mesh
              key={d}
              position={[d * 0.2, SWING.pivotY / 2, 0]}
              rotation={[0, 0, -d * 0.16]}
              castShadow
            >
              <cylinderGeometry args={[0.045, 0.055, SWING.pivotY, 6]} />
              <meshStandardMaterial color={WOOD} roughness={0.88} />
            </mesh>
          ))}
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[0.42, 0.06, 0.06]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* balok atas */}
      <mesh position={[0, SWING.pivotY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.05, 8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>

      {/* bagian yang berayun */}
      <group ref={carriage} position={[0, SWING.pivotY, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, -ropeH / 2, s * 0.42]}>
            <cylinderGeometry args={[0.012, 0.012, ropeH, 5]} />
            <meshStandardMaterial color="#d8c3a4" roughness={0.95} />
          </mesh>
        ))}
        <group ref={seatRef} position={[0, -ropeH, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.62, 0.055, 0.52]} />
            <meshStandardMaterial color="#c9743f" roughness={0.8} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, 0.14, s * 0.42]}>
              <cylinderGeometry args={[0.012, 0.012, 0.28, 5]} />
              <meshStandardMaterial color="#d8c3a4" roughness={0.95} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

/* ---------- jungkat-jungkit ---------- */

function SeeSaw() {
  const plank = useRef()
  useFrame((state) => {
    if (plank.current) plank.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.85) * 0.07
  })

  return (
    <group position={[0.9, 0, 1.55]} rotation={[0, 0.5, 0]}>
      {/* penumpu */}
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.22, 0.48, 8]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>

      <group ref={plank} position={[0, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2.1, 0.07, 0.28]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.82} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.86, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.14, 5]} />
            <meshStandardMaterial color={WOOD} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ---------- bak pasir + mainan ---------- */

function Sandbox() {
  const y = 0.06
  return (
    <group position={[1.15, 0, -1.5]} rotation={[0, -0.3, 0]}>
      {/* dinding kayu */}
      {[
        [0, 0, 0.85, 1.7, 0.2],
        [0, 0, -0.85, 1.7, 0.2],
        [0.85, 0.85, 0, 0.2, 1.7],
        [-0.85, 0.85, 0, 0.2, 1.7],
      ].map(([x, w, z, sx, sz], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={[sx || 1.7, 0.16, sz || 0.2]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.86} />
        </mesh>
      ))}

      {/* pasir */}
      <mesh position={[0, y + 0.02, 0]} receiveShadow>
        <boxGeometry args={[1.62, 0.1, 1.62]} />
        <meshStandardMaterial color="#f2d7ac" roughness={1} />
      </mesh>

      {/* ember + sekop */}
      <mesh position={[0.34, y + 0.14, 0.28]} castShadow>
        <cylinderGeometry args={[0.11, 0.09, 0.16, 12]} />
        <meshStandardMaterial color="#f9705a" roughness={0.65} />
      </mesh>
      <mesh position={[0.34, y + 0.23, 0.28]}>
        <torusGeometry args={[0.1, 0.012, 4, 12]} />
        <meshStandardMaterial color="#ef4d72" roughness={0.6} />
      </mesh>
      <mesh position={[-0.3, y + 0.11, -0.16]} rotation={[0, 0.6, 0.35]} castShadow>
        <boxGeometry args={[0.05, 0.05, 0.3]} />
        <meshStandardMaterial color="#2e7d8f" roughness={0.6} />
      </mesh>
      <mesh position={[-0.3, y + 0.11, 0.0]} rotation={[0, 0.6, 0.35]}>
        <boxGeometry args={[0.13, 0.02, 0.15]} />
        <meshStandardMaterial color="#2e7d8f" roughness={0.6} />
      </mesh>
    </group>
  )
}

/* ---------- tikar piknik ---------- */

function Picnic() {
  return (
    <group position={[-0.55, 0, 2.0]} rotation={[0, 0.35, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.62, 1.14]} />
        <meshStandardMaterial color="#c9a173" roughness={0.96} />
      </mesh>
      {[-0.5, -0.16, 0.18, 0.52].map((x) => (
        <mesh key={x} position={[x, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.13, 1.14]} />
          <meshStandardMaterial color="#a85541" roughness={0.96} />
        </mesh>
      ))}

      {/* keranjang */}
      <mesh position={[0.1, 0.14, -0.16]} castShadow>
        <boxGeometry args={[0.32, 0.22, 0.24]} />
        <meshStandardMaterial color="#b1793f" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, 0.27, -0.16]} rotation={[0, 0, 0.1]}>
        <torusGeometry args={[0.11, 0.014, 4, 12, Math.PI]} />
        <meshStandardMaterial color="#8a5a3c" roughness={0.9} />
      </mesh>

      {/* bantal */}
      {[-0.52, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.09, 0.3]} rotation={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.3, 0.13, 0.3]} />
          <meshStandardMaterial color="#8e7bc4" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- lentera taman ---------- */

function GardenLanterns() {
  const tex = useMemo(() => getGlowTexture(), [])
  const spots = [
    [0.75, 3.55],
    [2.5, 3.5],
    [-2.3, 3.4],
  ]
  return (
    <group>
      {spots.map(([a, r], i) => {
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.55, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.045, 1.1, 6]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.14, 0]}>
              <boxGeometry args={[0.14, 0.18, 0.14]} />
              <meshStandardMaterial
                color="#ffd9a0"
                emissive="#ffb765"
                emissiveIntensity={1.4}
                roughness={0.4}
              />
            </mesh>
            <sprite position={[0, 1.14, 0]} scale={0.9}>
              <spriteMaterial
                map={tex}
                color="#ffb765"
                transparent
                opacity={0.5}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          </group>
        )
      })}
      <pointLight position={[0, 1.4, 0]} color="#ffb765" intensity={2.2} distance={9} decay={2} />
    </group>
  )
}

/* ---------- bak burung di tengah taman ---------- */

function BirdBath() {
  const ring = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return {
          x: Math.cos(a) * 0.56,
          z: Math.sin(a) * 0.56,
          c: FLOWERS[i % FLOWERS.length],
          h: 0.16 + (i % 3) * 0.03,
        }
      }),
    []
  )

  return (
    <group position={[-0.2, 0, -0.2]}>
      {ring.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          <mesh position={[0, f.h / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.016, f.h, 4]} />
            <meshStandardMaterial color="#4f7a46" roughness={0.9} />
          </mesh>
          <mesh position={[0, f.h + 0.05, 0]} castShadow>
            <icosahedronGeometry args={[0.075, 0]} />
            <meshStandardMaterial color={f.c} roughness={0.7} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.24, 0.4, 14]} />
        <meshStandardMaterial color="#ddd0bd" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.26, 20]} />
        <meshStandardMaterial color="#a9d7da" roughness={0.25} metalness={0.15} />
      </mesh>
    </group>
  )
}

/* ---------- papan nama ---------- */

function makeSignTexture() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f4e6d1'
  ctx.fillRect(0, 0, 512, 256)
  ctx.strokeStyle = 'rgba(138,90,60,0.5)'
  ctx.lineWidth = 8
  ctx.strokeRect(14, 14, 484, 228)
  ctx.fillStyle = '#8a5a3c'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '400 96px "Great Vibes", "Cormorant Infant", cursive'
  ctx.fillText('Taman Kecil', 256, 112)
  ctx.font = '600 30px Manrope, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(138,90,60,0.72)'
  ctx.fillText('SILAKAN BERMAIN', 256, 190)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function Sign() {
  const tex = useMemo(() => makeSignTexture(), [])
  return (
    <group position={[Math.cos(1.12) * (GARDEN.r + 0.55), 0, Math.sin(1.12) * (GARDEN.r + 0.55)]} rotation={[0, -1.12 + Math.PI / 2, 0]}>
      <mesh position={[-0.34, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.84, 6]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[0.34, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.84, 6]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.66, 0.02]} castShadow>
        <boxGeometry args={[0.9, 0.46, 0.03]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.66, 0.04]}>
        <planeGeometry args={[0.88, 0.44]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------- perakitan ---------- */

export default function Garden() {
  const y = useMemo(() => groundHeight(GARDEN.x, GARDEN.z) - 0.04, [])

  // Kemiringan tanah di titik taman — supaya pagar, tikar, dan ayunan
  // benar-benar menempel di pasir, bukan melayang di satu sisi.
  const tilt = useMemo(() => {
    const h = 1.4
    const hx =
      (groundHeight(GARDEN.x + h, GARDEN.z) - groundHeight(GARDEN.x - h, GARDEN.z)) / (2 * h)
    const hz =
      (groundHeight(GARDEN.x, GARDEN.z + h) - groundHeight(GARDEN.x, GARDEN.z - h)) / (2 * h)
    return [-Math.atan(hz), 0, Math.atan(hx)]
  }, [])

  return (
    <group position={[GARDEN.x, y, GARDEN.z]} rotation={tilt}>
      <group rotation={[0, GARDEN_YAW, 0]}>
        <Fence />
        <Arch />
        <FlowerBeds />
        <Swing />
        <SeeSaw />
        <Sandbox />
        <Picnic />
        <BirdBath />
        <GardenLanterns />
        <Sign />
      </group>
    </group>
  )
}
