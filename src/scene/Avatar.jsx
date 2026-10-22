import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import {
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  OUTFITS,
  BODY_STYLES,
} from '../lib/content'

const find = (arr, id, fallback) => arr.find((x) => x.id === id)?.hex ?? fallback

/* ==========================================================
   Rambut — semua koordinat LOKAL terhadap kepala (0,0,0)
   ========================================================== */
// three.js SphereGeometry mulai dari phi=0 di sumbu -X, jadi rotasi +90°
// diperlukan agar bukaan cangkang rambut menghadap wajah (+Z).
// CylinderGeometry justru mulai dari +Z, jadi tidak perlu diputar.
const HAIR_ROT = Math.PI / 2

function Hair({ style, color }) {
  const mat = <meshStandardMaterial color={color} roughness={0.56} metalness={0.06} />

  // cangkang rambut: bola terbuka lebar di bagian wajah
  const shell = (r = 0.184, theta = Math.PI * 0.6) => (
    <mesh rotation={[0, HAIR_ROT, 0]} position={[0, 0.004, -0.004]} castShadow>
      <sphereGeometry args={[r, 28, 22, 0.75, Math.PI * 2 - 1.5, 0, theta]} />
      {mat}
    </mesh>
  )

  const topCap = (r = 0.186, theta = Math.PI * 0.3) => (
    <mesh position={[0, 0.006, 0]} castShadow>
      <sphereGeometry args={[r, 28, 14, 0, Math.PI * 2, 0, theta]} />
      {mat}
    </mesh>
  )

  switch (style) {
    case 'buzz':
      return (
        <mesh position={[0, 0.004, 0]} castShadow>
          <sphereGeometry args={[0.174, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
      )
    case 'short':
      return (
        <group>
          {shell(0.184, Math.PI * 0.62)}
          {topCap(0.186, Math.PI * 0.28)}
        </group>
      )
    case 'bob':
      return (
        <group>
          {shell(0.188, Math.PI * 0.66)}
          <mesh position={[0, -0.072, -0.01]} castShadow>
            <cylinderGeometry args={[0.19, 0.212, 0.28, 26, 1, true, 0.46, Math.PI * 2 - 0.92]} />
            {mat}
          </mesh>
          {topCap(0.19, Math.PI * 0.32)}
        </group>
      )
    case 'long':
      return (
        <group>
          {shell(0.186, Math.PI * 0.64)}
          <mesh position={[0, -0.2, -0.05]} castShadow>
            <capsuleGeometry args={[0.125, 0.32, 6, 16]} />
            {mat}
          </mesh>
          {topCap(0.188, Math.PI * 0.3)}
        </group>
      )
    case 'ponytail':
      return (
        <group>
          {shell(0.184, Math.PI * 0.62)}
          <mesh position={[0, -0.09, -0.175]} rotation={[0.5, 0, 0]} castShadow>
            <capsuleGeometry args={[0.062, 0.26, 4, 12]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.045, -0.145]}>
            <sphereGeometry args={[0.065, 12, 10]} />
            {mat}
          </mesh>
          {topCap(0.186, Math.PI * 0.3)}
        </group>
      )
    case 'bun':
      return (
        <group>
          {shell(0.186, Math.PI * 0.64)}
          <mesh position={[0, 0.135, -0.075]} castShadow>
            <sphereGeometry args={[0.088, 16, 12]} />
            {mat}
          </mesh>
          {topCap(0.188, Math.PI * 0.3)}
        </group>
      )
    case 'curly':
      return (
        <group>
          {shell(0.188, Math.PI * 0.66)}
          {Array.from({ length: 14 }).map((_, i) => {
            const a = (i / 14) * Math.PI * 2
            const rr = 0.165
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * rr, 0.05 + Math.sin(i * 2.1) * 0.045, Math.sin(a) * rr - 0.01]}
                castShadow
              >
                <sphereGeometry args={[0.062 + (i % 3) * 0.012, 10, 8]} />
                {mat}
              </mesh>
            )
          })}
        </group>
      )
    default:
      return null
  }
}

/* ==========================================================
   Karakter
   ========================================================== */
export default function Avatar({
  config,
  anim = 'idle',
  moving = false,
  running = false,
  spin = false,
  children,
}) {
  const root = useRef()
  const body = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()

  const phase = useRef(0)
  const animRef = useRef(anim)
  animRef.current = anim

  const skin = find(SKIN_TONES, config.skin, '#EFC3A4')
  const hairColor = find(HAIR_COLORS, config.hairColor, '#4A2E22')
  const eyeColor = find(EYE_COLORS, config.eye, '#8B5E34')
  const outfit = find(OUTFITS, config.outfit, '#F9705A')
  const bodyScale = BODY_STYLES.find((b) => b.id === config.body)?.scale ?? 1
  const style = config.outfitStyle || 'dress'

  const skinMat = useMemo(
    () => <meshStandardMaterial color={skin} roughness={0.66} metalness={0.02} />,
    [skin]
  )
  const outfitMat = useMemo(
    () => <meshStandardMaterial color={outfit} roughness={0.72} metalness={0.02} />,
    [outfit]
  )
  const outfitDark = useMemo(() => {
    const c = new THREE.Color(outfit).multiplyScalar(0.7)
    return <meshStandardMaterial color={c} roughness={0.76} />
  }, [outfit])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    const a = animRef.current

    const targetSpeed = moving ? (running ? 9.5 : 5.6) : 0
    phase.current += d * targetSpeed
    const ph = phase.current

    // rotation.x = ayunan depan-belakang, rotation.z = angkat ke samping.
    // Lengan kiri ada di -x, jadi "keluar" berarti z negatif; lengan kanan kebalikannya.
    let lArmX = 0
    let rArmX = 0
    let lArmZ = -0.3
    let rArmZ = 0.3
    let lLeg = 0
    let rLeg = 0
    let bodyRotZ = 0
    let bodyY = 0
    let headRotX = 0
    let headRotY = 0

    if (moving) {
      const amp = running ? 0.95 : 0.6
      lLeg = Math.sin(ph) * amp
      rLeg = Math.sin(ph + Math.PI) * amp
      lArmX = Math.sin(ph + Math.PI) * amp * 0.75
      rArmX = Math.sin(ph) * amp * 0.75
      bodyY = Math.abs(Math.sin(ph)) * 0.035
      bodyRotZ = Math.sin(ph) * 0.03
    } else {
      bodyY = Math.sin(t * 1.5) * 0.008
      headRotY = Math.sin(t * 0.55) * 0.06
    }

    if (a === 'wave') {
      // lengan kanan terangkat ke atas-samping lalu bergoyang
      rArmZ = 2.42 + Math.sin(t * 9) * 0.17
      rArmX = -0.28
      headRotY = Math.sin(t * 2.2) * 0.12
    } else if (a === 'nod') {
      headRotX = Math.sin(t * 5.2) * 0.22 + 0.05
      bodyY += Math.abs(Math.sin(t * 2.6)) * 0.008
    } else if (a === 'celebrate') {
      // dua lengan terangkat membentuk V
      lArmZ = -2.72 + Math.sin(t * 6) * 0.16
      rArmZ = 2.72 + Math.sin(t * 6 + 1) * 0.16
      bodyY += Math.abs(Math.sin(t * 3.4)) * 0.11
      headRotX = -0.1
    } else if (a === 'dance') {
      bodyRotZ = Math.sin(t * 3.2) * 0.13
      bodyY += Math.abs(Math.sin(t * 3.2)) * 0.045
      lArmZ = -1.7 + Math.sin(t * 3.2) * 0.72
      rArmZ = 1.7 - Math.sin(t * 3.2) * 0.72
      headRotY = Math.sin(t * 1.6) * 0.18
    } else if (a === 'hold') {
      // dua lengan ke depan memegang poster
      lArmX = -0.86 + Math.sin(t * 1.4) * 0.025
      rArmX = -0.86 + Math.sin(t * 1.4 + 0.7) * 0.025
      lArmZ = -0.3
      rArmZ = 0.3
      headRotY = Math.sin(t * 0.8) * 0.07
    } else if (a === 'sit') {
      // duduk di ayunan: kaki ke depan, tangan memegang tali
      lLeg = -1.42
      rLeg = -1.42
      lArmX = -0.62
      rArmX = -0.62
      lArmZ = -0.26
      rArmZ = 0.26
      bodyY = Math.sin(t * 2.1) * 0.006
      headRotX = -0.04
    }

    const lerp = (cur, target, k = 10) => cur + (target - cur) * Math.min(1, d * k)

    if (armL.current) {
      armL.current.rotation.x = lerp(armL.current.rotation.x, lArmX)
      armL.current.rotation.z = lerp(armL.current.rotation.z, lArmZ)
    }
    if (armR.current) {
      armR.current.rotation.x = lerp(armR.current.rotation.x, rArmX)
      armR.current.rotation.z = lerp(armR.current.rotation.z, rArmZ)
    }
    if (legL.current) legL.current.rotation.x = lerp(legL.current.rotation.x, lLeg, 14)
    if (legR.current) legR.current.rotation.x = lerp(legR.current.rotation.x, rLeg, 14)
    if (body.current) {
      body.current.rotation.z = lerp(body.current.rotation.z, bodyRotZ, 8)
      body.current.position.y = lerp(body.current.position.y, bodyY, 12)
    }
    if (head.current) {
      head.current.rotation.x = lerp(head.current.rotation.x, headRotX, 8)
      head.current.rotation.y = lerp(head.current.rotation.y, headRotY, 6)
    }
    if (root.current && spin) {
      // goyangan lembut, bukan putaran penuh — wajah tetap terlihat
      root.current.rotation.y = Math.sin(t * 0.5) * 0.55
    }
  })

  return (
    <group ref={root} scale={bodyScale}>
      <group ref={body}>
        {/* ---------- kaki ---------- */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s === -1 ? legL : legR} position={[s * 0.072, 0.6, 0]}>
            <mesh position={[0, -0.24, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.28, 4, 10]} />
              {style === 'dress' ? skinMat : outfitDark}
            </mesh>
            <mesh position={[0, -0.42, 0.024]} castShadow>
              <boxGeometry args={[0.098, 0.052, 0.155]} />
              <meshStandardMaterial color="#3a2a22" roughness={0.72} />
            </mesh>
          </group>
        ))}

        {/* ---------- rok / celana ---------- */}
        {style === 'dress' ? (
          <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.138, 0.235, 0.46, 26, 1]} />
            {outfitMat}
          </mesh>
        ) : (
          <mesh position={[0, 0.66, 0]} castShadow>
            <capsuleGeometry args={[0.135, 0.14, 4, 14]} />
            {outfitDark}
          </mesh>
        )}

        {/* ---------- torso ---------- */}
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.145, 0.2, 6, 18]} />
          {outfitMat}
        </mesh>

        {/* kerah */}
        <mesh position={[0, 1.175, 0]}>
          <cylinderGeometry args={[0.068, 0.092, 0.04, 16]} />
          <meshStandardMaterial color="#fff3e2" roughness={0.8} />
        </mesh>

        {/* leher */}
        <mesh position={[0, 1.225, 0]}>
          <cylinderGeometry args={[0.048, 0.054, 0.08, 12]} />
          {skinMat}
        </mesh>

        {/* ---------- lengan ---------- */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s === -1 ? armL : armR} position={[s * 0.183, 1.1, 0]}>
            {/* lengan berkulit + lengan baju pendek */}
            <mesh position={[0, -0.17, 0]} castShadow>
              <capsuleGeometry args={[0.042, 0.26, 4, 10]} />
              {skinMat}
            </mesh>
            <mesh position={[0, -0.055, 0]} castShadow>
              <capsuleGeometry args={[0.055, 0.075, 4, 10]} />
              {style === 'tank' ? skinMat : outfitMat}
            </mesh>
            <mesh position={[0, -0.325, 0]} castShadow>
              <sphereGeometry args={[0.05, 12, 10]} />
              {skinMat}
            </mesh>
          </group>
        ))}

        {/* ---------- kepala ---------- */}
        <group ref={head} position={[0, 1.42, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.17, 28, 22]} />
            {skinMat}
          </mesh>

          {/* mata */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.062, -0.006, 0.136]}>
              <mesh scale={[1, 1.2, 0.5]}>
                <sphereGeometry args={[0.036, 14, 12]} />
                <meshStandardMaterial color="#fffdf9" roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.003, 0.022]}>
                <sphereGeometry args={[0.022, 12, 10]} />
                <meshStandardMaterial color={eyeColor} roughness={0.36} />
              </mesh>
              <mesh position={[0, -0.003, 0.036]}>
                <sphereGeometry args={[0.0105, 8, 8]} />
                <meshStandardMaterial color="#171018" roughness={0.3} />
              </mesh>
              <mesh position={[s * 0.008, 0.008, 0.043]}>
                <sphereGeometry args={[0.006, 6, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}

          {/* alis */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.063, 0.056, 0.142]} rotation={[0, 0, s * 0.12]}>
              <boxGeometry args={[0.05, 0.011, 0.011]} />
              <meshStandardMaterial color={hairColor} roughness={0.7} />
            </mesh>
          ))}

          {/* senyum */}
          <mesh position={[0, -0.07, 0.146]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.026, 0.0058, 6, 16, Math.PI]} />
            <meshStandardMaterial color="#a4483f" roughness={0.55} />
          </mesh>

          {/* pipi merona */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.1, -0.044, 0.122]} rotation={[0, s * 0.42, 0]}>
              <circleGeometry args={[0.027, 14]} />
              <meshBasicMaterial color="#ff8f8f" transparent opacity={0.26} />
            </mesh>
          ))}

          <Hair style={config.hair} color={hairColor} />
        </group>

        {/* aksesori yang ikut bergerak bersama badan (mis. poster) */}
        {children}
      </group>
    </group>
  )
}
