import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PIER, COLORS } from './palette'
import { getGlowTexture } from '../lib/glow'

const WOOD = { color: COLORS.wood, roughness: 0.88, metalness: 0.02 }
const WOOD_DARK = { color: COLORS.woodDark, roughness: 0.92, metalness: 0.02 }

/** Papan dek dermaga (instanced supaya 1 draw call). */
function Deck() {
  const count = Math.floor((PIER.startZ - PIER.endZ) / 0.63)

  const { mesh, matrices, colors } = useMemo(() => {
    const g = new THREE.BoxGeometry(PIER.width, 0.13, 0.56)
    const m = new THREE.Matrix4()
    const arr = []
    const col = []
    const base = new THREE.Color(COLORS.wood)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const z = PIER.startZ - i * 0.63
      const rot = (Math.random() - 0.5) * 0.012
      m.compose(
        new THREE.Vector3((Math.random() - 0.5) * 0.05, PIER.deckY - 0.07, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)),
        new THREE.Vector3(1, 1, 1)
      )
      arr.push(m.clone())
      c.copy(base).multiplyScalar(0.82 + Math.random() * 0.35)
      col.push(c.clone())
    }
    return { mesh: g, matrices: arr, colors: col }
  }, [count])

  return (
    <instancedMesh
      args={[mesh, undefined, count]}
      receiveShadow
      castShadow
      ref={(inst) => {
        if (!inst) return
        matrices.forEach((m, i) => inst.setMatrixAt(i, m))
        colors.forEach((c, i) => inst.setColorAt(i, c))
        inst.instanceMatrix.needsUpdate = true
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true
      }}
    >
      <meshStandardMaterial {...WOOD} />
    </instancedMesh>
  )
}

function Post({ x, z, tall = false }) {
  const top = PIER.deckY + (tall ? 2.35 : 0.95)
  const bottom = -2.4
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, (top + bottom) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, top - bottom, 8]} />
        <meshStandardMaterial {...WOOD_DARK} />
      </mesh>
      {tall && (
        <>
          <mesh position={[0, top + 0.04, 0]} castShadow>
            <boxGeometry args={[0.24, 0.12, 0.24]} />
            <meshStandardMaterial {...WOOD} />
          </mesh>
        </>
      )}
    </group>
  )
}

/** Lampu gantung di sepanjang dermaga (satu Points untuk semua glow). */
function StringLights({ quality }) {
  const { bulbs, glowGeo, wireGeo } = useMemo(() => {
    const bulbs = []
    const wirePts = []
    const sides = [-1, 1]
    const zStart = PIER.startZ - 1.2
    const zEnd = PIER.endZ + 1.4
    const segs = 46

    for (const s of sides) {
      const x = s * (PIER.halfW - 0.18)
      const y = PIER.deckY + 2.3
      const pts = []
      for (let i = 0; i <= segs; i++) {
        const t = i / segs
        const z = zStart + (zEnd - zStart) * t
        // lengkung kabel (catenary sederhana)
        const sag = Math.sin(t * Math.PI) * 0.45
        pts.push(new THREE.Vector3(x, y - sag, z))
      }
      wirePts.push(pts)

      const n = Math.round(segs / 2.6)
      for (let i = 1; i < n; i++) {
        const t = i / n
        const sag = Math.sin(t * Math.PI) * 0.45
        bulbs.push(new THREE.Vector3(x, y - sag - 0.16, zStart + (zEnd - zStart) * t))
      }
    }

    const pos = new Float32Array(bulbs.length * 3)
    bulbs.forEach((b, i) => pos.set([b.x, b.y, b.z], i * 3))
    const glowGeo = new THREE.BufferGeometry()
    glowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))

    // kabel sebagai satu geometry gabungan
    const positions = []
    for (const pts of wirePts) {
      const curve = new THREE.CatmullRomCurve3(pts)
      const g = new THREE.TubeGeometry(curve, 60, 0.012, 4, false)
      positions.push(g)
    }
    // gabung manual
    const merged = positions.reduce((acc, g, i) => {
      const p = g.attributes.position.array
      const idx = g.index.array
      const offset = acc.pos.length / 3
      acc.pos.push(...p)
      idx.forEach((v) => acc.idx.push(v + offset))
      return acc
    }, { pos: [], idx: [] })
    const wireGeo = new THREE.BufferGeometry()
    wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(merged.pos, 3))
    wireGeo.setIndex(merged.idx)

    return { bulbs, glowGeo, wireGeo }
  }, [])

  const tex = useMemo(() => getGlowTexture(), [])

  return (
    <group>
      <mesh geometry={wireGeo}>
        <meshBasicMaterial color="#2b2118" />
      </mesh>

      <points geometry={glowGeo}>
        <pointsMaterial
          map={tex}
          size={1.15}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#ffb877"
          opacity={0.95}
        />
      </points>

      {/* bohlam fisik kecil */}
      <instancedMesh
        args={[undefined, undefined, bulbs.length]}
        ref={(inst) => {
          if (!inst) return
          const m = new THREE.Matrix4()
          bulbs.forEach((b, i) => {
            m.makeTranslation(b.x, b.y, b.z)
            inst.setMatrixAt(i, m)
          })
          inst.instanceMatrix.needsUpdate = true
        }}
      >
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshStandardMaterial
          color="#ffe3b0"
          emissive="#ffb265"
          emissiveIntensity={2.6}
          roughness={0.4}
        />
      </instancedMesh>

      {quality !== 'low' && (
        <>
          <pointLight position={[-1.6, PIER.deckY + 2.0, -21]} color="#ffb066" intensity={9} distance={16} decay={2} />
          <pointLight position={[1.6, PIER.deckY + 2.0, -30]} color="#ffb066" intensity={9} distance={16} decay={2} />
          <pointLight position={[0, PIER.deckY + 2.4, -40]} color="#ffc07a" intensity={11} distance={18} decay={2} />
        </>
      )}
    </group>
  )
}

export default function Pier({ quality = 'high' }) {
  const posts = useMemo(() => {
    const out = []
    const step = 4.2
    let i = 0
    for (let z = PIER.startZ - 1; z >= PIER.endZ + 0.5; z -= step) {
      const tall = i % 2 === 0
      out.push({ x: -PIER.halfW + 0.16, z, tall })
      out.push({ x: PIER.halfW - 0.16, z, tall })
      i++
    }
    return out
  }, [])

  const railY = PIER.deckY + 0.82
  const railLen = PIER.startZ - PIER.endZ

  return (
    <group>
      <Deck />

      {/* balok penyangga memanjang */}
      {[-1.55, 1.55].map((x) => (
        <mesh key={x} position={[x, PIER.deckY - 0.26, (PIER.startZ + PIER.endZ) / 2]} castShadow>
          <boxGeometry args={[0.18, 0.22, railLen + 1]} />
          <meshStandardMaterial {...WOOD_DARK} />
        </mesh>
      ))}

      {posts.map((p, i) => (
        <Post key={i} x={p.x} z={p.z} tall={p.tall} />
      ))}

      {/* pagar rendah */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            position={[s * (PIER.halfW - 0.12), railY, (PIER.startZ + PIER.endZ) / 2]}
            castShadow
          >
            <boxGeometry args={[0.1, 0.09, railLen]} />
            <meshStandardMaterial {...WOOD} />
          </mesh>
          <mesh
            position={[s * (PIER.halfW - 0.12), railY - 0.42, (PIER.startZ + PIER.endZ) / 2]}
          >
            <boxGeometry args={[0.07, 0.06, railLen]} />
            <meshStandardMaterial {...WOOD_DARK} />
          </mesh>
        </group>
      ))}

      <StringLights quality={quality} />
    </group>
  )
}
