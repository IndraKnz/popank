import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { PODIUM_POS, COLORS } from './palette'
import { getGlowTexture } from '../lib/glow'
import { useStore } from '../store/useStore'
import { audio } from '../lib/audio'

/**
 * Podium surat di ujung dermaga.
 * Objek interaktif: klik (atau tekan E saat dekat) → membuka surat.
 */
export default function LetterPodium() {
  const envelope = useRef()
  const glow = useRef()
  const ring = useRef()
  const openLetter = useStore((s) => s.openLetter)
  const tex = getGlowTexture()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (envelope.current) {
      envelope.current.rotation.y = t * 0.5
      envelope.current.position.y = 1.62 + Math.sin(t * 1.4) * 0.07
      envelope.current.rotation.z = Math.sin(t * 0.8) * 0.05
    }
    if (glow.current) {
      const s = 2.1 + Math.sin(t * 2.0) * 0.22
      glow.current.scale.setScalar(s)
      glow.current.material.opacity = 0.55 + Math.sin(t * 2.0) * 0.12
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.35
      ring.current.material.opacity = 0.35 + Math.sin(t * 1.6) * 0.1
    }
  })

  const onClick = (e) => {
    e.stopPropagation()
    audio.chime()
    openLetter()
  }

  return (
    <group
      position={[PODIUM_POS.x, PODIUM_POS.y, PODIUM_POS.z]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
    >
      {/* alas kayu */}
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.92, 1.02, 0.18, 24]} />
        <meshStandardMaterial color={COLORS.woodDark} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 0.9, 16]} />
        <meshStandardMaterial color={COLORS.wood} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.46, 0.36, 0.14, 24]} />
        <meshStandardMaterial color={COLORS.wood} roughness={0.75} />
      </mesh>

      {/* pendar */}
      <sprite ref={glow} position={[0, 1.6, 0]} scale={2.1}>
        <spriteMaterial
          map={tex}
          color="#ffb579"
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <pointLight position={[0, 1.75, 0]} color="#ffb066" intensity={5} distance={8} decay={2} />

      {/* amplop mengambang */}
      <group ref={envelope} position={[0, 1.62, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.86, 0.58, 0.045]} />
          <meshStandardMaterial
            color="#fff3e2"
            emissive="#ffcf9b"
            emissiveIntensity={0.35}
            roughness={0.7}
          />
        </mesh>
        {/* lipatan amplop */}
        <mesh position={[0, 0.145, 0.03]} rotation={[0.05, 0, 0]}>
          <boxGeometry args={[0.86, 0.3, 0.012]} />
          <meshStandardMaterial color="#ffe7cb" roughness={0.75} />
        </mesh>
        {/* segel lilin */}
        <mesh position={[0, -0.02, 0.04]}>
          <cylinderGeometry args={[0.085, 0.085, 0.02, 16]} />
          <meshStandardMaterial
            color="#e2543f"
            emissive="#c0392b"
            emissiveIntensity={0.4}
            roughness={0.6}
          />
        </mesh>
      </group>

      {/* cincin cahaya di lantai */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.2, 0]}>
        <ringGeometry args={[0.95, 1.16, 48]} />
        <meshBasicMaterial
          color="#ffc07a"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* partikel kecil mengorbit */}
      <OrbitSparks />
    </group>
  )
}

function OrbitSparks() {
  const ref = useRef()
  const count = 26
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) seeds[i] = Math.random()
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.userData.seeds = seeds
    return g
  })

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const arr = geo.attributes.position.array
    const seeds = geo.userData.seeds
    for (let i = 0; i < count; i++) {
      const s = seeds[i]
      const a = t * (0.3 + s * 0.5) + s * 6.28
      const r = 0.75 + Math.sin(t * 0.7 + s * 5) * 0.25
      arr[i * 3] = Math.cos(a) * r
      arr[i * 3 + 1] = 1.15 + Math.sin(t * 0.9 + s * 9) * 0.55 + s * 0.4
      arr[i * 3 + 2] = Math.sin(a) * r
    }
    geo.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        map={getGlowTexture()}
        color="#ffd7a3"
        size={0.22}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
