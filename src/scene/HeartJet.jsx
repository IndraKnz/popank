import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { getSoftTexture } from '../lib/glow'
import { SKY } from '../lib/skyMoment'

/* ==========================================================
   Jet romantis: terbang menggambar hati dari asap di langit.
   Dipicu bersamaan dengan "Lihat ke Langit", muncul beberapa
   detik setelah pesawat banner lewat, lalu menelusuri kurva
   hati paraméterik sambil menyemburkan asap yang berumur panjang —
   jejaknya membentuk hati raksasa di ufuk.
   ========================================================== */

// Diletakkan di atas jalur pesawat banner (y ≈ 16) supaya banner tidak
// memotong bentuk hati; kamera menahan pandangan ke atas selama SKY.hold
// detik agar seluruh bentuknya terlihat (lihat lib/skyMoment.js).
const HEART = { cx: 4, cy: 35, cz: -72, s: 0.95 }
const LOOP = SKY.loop // detik untuk satu putaran penuh hati
const DELAY = SKY.delay // jeda setelah skyMoment (menunggu pesawat banner lewat)
const EXIT_TIME = SKY.exit // detik terbang menjauh setelah hati selesai
const SMOKE_N = 1600
const SMOKE_LIFE = 26
const SMOKE_RATE = 45 // gumpalan per detik — cukup untuk 12 dtk + ekor keluar

/* palet asap romantis: putih lembut ke arah mawar */
const SMOKE_COLORS = [
  new THREE.Color('#fff7fa'),
  new THREE.Color('#ffe9f1'),
  new THREE.Color('#ffd9e6'),
  new THREE.Color('#ffc9dc'),
  new THREE.Color('#ffffff'),
]

/** Kurva hati klasik (x = 16·sin³t, y = 13cos t − 5cos 2t − 2cos 3t − cos 4t). */
function heartPoint(t, out) {
  const x = 16 * Math.pow(Math.sin(t), 3)
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  out.set(HEART.cx + x * HEART.s, HEART.cy + y * HEART.s, HEART.cz)
  return out
}

function heartTangent(t, out) {
  const x = 48 * Math.pow(Math.sin(t), 2) * Math.cos(t)
  const y = -13 * Math.sin(t) + 10 * Math.sin(2 * t) + 6 * Math.sin(3 * t) + 4 * Math.sin(4 * t)
  out.set(x * HEART.s, y * HEART.s, 0)
  return out
}

/* ---------- shader titik asap ---------- */

const SMOKE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uScale;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (uScale / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const SMOKE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    float a = tex.a * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`

function useSmoke() {
  const points = useRef()
  const { size } = useThree()

  const sys = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(SMOKE_N * 3)
    const col = new Float32Array(SMOKE_N * 3)
    const alp = new Float32Array(SMOKE_N)
    const siz = new Float32Array(SMOKE_N)
    for (let i = 0; i < SMOKE_N; i++) pos[i * 3 + 1] = -999
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1).setUsage(THREE.DynamicDrawUsage))

    const mat = new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      uniforms: {
        uMap: { value: getSoftTexture() },
        uScale: { value: 800 },
      },
      transparent: true,
      depthWrite: false,
    })

    return {
      geo: g,
      mat,
      vel: new Float32Array(SMOKE_N * 3),
      age: new Float32Array(SMOKE_N),
      life: new Float32Array(SMOKE_N).fill(0),
      size0: new Float32Array(SMOKE_N),
      cursor: 0,
      acc: 0,
      alive: 0,
    }
  }, [])

  const spawn = (x, y, z, vx, vy, vz) => {
    const s = sys
    const i = s.cursor
    s.cursor = (s.cursor + 1) % SMOKE_N
    const i3 = i * 3
    s.geo.attributes.position.array[i3] = x + (Math.random() - 0.5) * 0.5
    s.geo.attributes.position.array[i3 + 1] = y + (Math.random() - 0.5) * 0.5
    s.geo.attributes.position.array[i3 + 2] = z + (Math.random() - 0.5) * 0.5
    s.vel[i3] = vx + (Math.random() - 0.5) * 0.6
    s.vel[i3 + 1] = vy + (Math.random() - 0.5) * 0.6
    s.vel[i3 + 2] = vz + (Math.random() - 0.5) * 0.6
    s.age[i] = 0
    s.life[i] = SMOKE_LIFE * (0.85 + Math.random() * 0.3)
    s.size0[i] = 1.6 + Math.random() * 1.2
    const c = SMOKE_COLORS[(Math.random() * SMOKE_COLORS.length) | 0]
    s.geo.attributes.aColor.array[i3] = c.r
    s.geo.attributes.aColor.array[i3 + 1] = c.g
    s.geo.attributes.aColor.array[i3 + 2] = c.b
    s.geo.attributes.aColor.needsUpdate = true
  }

  const update = (d, emitting, ox, oy, oz, tvx, tvy, tvz, px, py, pz, dAcc = d) => {
    const s = sys
    if (emitting) {
      // Emisi berbasis waktu, bukan per frame: kerapatan jejak tetap sama di
      // 30 maupun 120 fps. Gumpalan disebar di sepanjang lintasan yang baru
      // ditempuh supaya jejak tidak putus saat pesawat melaju cepat.
      const step = 1 / SMOKE_RATE
      s.acc += dAcc
      let n = 0
      while (s.acc >= step && n < 6) {
        s.acc -= step
        n++
      }
      if (s.acc > step * 6) s.acc = 0 // tab lama tidak aktif: jangan menyembur borongan
      const dx = ox - px
      const dy = oy - py
      const dz = oz - pz
      for (let k = 1; k <= n; k++) {
        const f = k / n
        spawn(
          px + dx * f - tvx * 3.2,
          py + dy * f - tvy * 3.2,
          pz + dz * f - tvz * 3.2,
          -tvx * 0.5,
          -tvy * 0.5,
          -tvz * 0.5
        )
      }
    } else {
      s.acc = 0
    }

    const pos = s.geo.attributes.position.array
    const alp = s.geo.attributes.aAlpha.array
    const siz = s.geo.attributes.aSize.array
    let alive = 0
    for (let i = 0; i < SMOKE_N; i++) {
      if (s.life[i] === 0) continue
      s.age[i] += d
      if (s.age[i] >= s.life[i]) {
        s.life[i] = 0
        alp[i] = 0
        continue
      }
      alive++
      const i3 = i * 3
      // hanyut pelan + naik tipis seperti asap sungguhan
      const drag = Math.pow(0.94, d * 60)
      s.vel[i3] *= drag
      s.vel[i3 + 1] = s.vel[i3 + 1] * drag + 0.05 * d
      s.vel[i3 + 2] *= drag
      pos[i3] += s.vel[i3] * d
      pos[i3 + 1] += s.vel[i3 + 1] * d
      pos[i3 + 2] += s.vel[i3 + 2] * d

      const age = s.age[i]
      const life = s.life[i]
      const fadeIn = Math.min(age / 0.6, 1)
      const fadeOut = 1 - Math.min(Math.max((age - life * 0.55) / (life * 0.45), 0), 1)
      alp[i] = 0.42 * fadeIn * fadeOut
      siz[i] = s.size0[i] * (1 + age * 0.3)
    }
    s.alive = alive
    s.geo.attributes.position.needsUpdate = true
    s.geo.attributes.aAlpha.needsUpdate = true
    s.geo.attributes.aSize.needsUpdate = true
  }

  // skala titik mengikuti tinggi viewport & fov kamera (52°)
  useEffect(() => {
    sys.mat.uniforms.uScale.value = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(26)))
  }, [size, sys])

  return { points, sys, update }
}

/* ---------- jet + hati asap ---------- */

const MODE = { IDLE: 0, WAIT: 1, HEART: 2, EXIT: 3, GONE: 4 }
const _pos = new THREE.Vector3()
const _tan = new THREE.Vector3()
const _prevTan = new THREE.Vector3()
const _xAxis = new THREE.Vector3(1, 0, 0)
const _q = new THREE.Quaternion()
const _roll = new THREE.Quaternion()

export default function HeartJet() {
  const jet = useRef()
  const skyMoment = useStore((s) => s.skyMoment)

  const mode = useRef(MODE.IDLE)
  const waitUntil = useRef(0)
  const heartStart = useRef(0)
  const exitStart = useRef(0)
  const t = useRef(0)
  const bank = useRef(0)
  const prevAng = useRef(0)
  const prevPos = useRef(new THREE.Vector3())

  const smoke = useSmoke()

  /* hook debug (hanya saat dev) — didaftarkan sekali, bukan tiap frame */
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__etJet = () => {
      mode.current = MODE.WAIT
      waitUntil.current = Date.now()
      t.current = 0
    }
    window.__etJetState = () => ({
      mode: mode.current,
      t: +t.current.toFixed(2),
      alive: smoke.sys.alive,
    })
  }, [smoke])

  useEffect(() => {
    if (!skyMoment) return
    t.current = 0
    // jeda memakai jam dinding: di perangkat lambat, dt ter-clamp sehingga
    // hitung mundur berbasis frame akan jauh lebih lama dari yang dimaksud
    waitUntil.current = Date.now() + DELAY * 1000
    exitStart.current = 0
    bank.current = 0
    prevAng.current = Math.PI / 2 // singgungan awal kurva menunjuk ke kanan
    mode.current = MODE.WAIT
  }, [skyMoment])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    const dAcc = Math.min(dt, 0.25) // untuk emisi asap: jangan ter-clamp 0.05
    const g = jet.current

    if (!g) return

    if (mode.current === MODE.IDLE || mode.current === MODE.GONE) {
      g.visible = false
      smoke.update(d, false)
      return
    }

    if (mode.current === MODE.WAIT) {
      smoke.update(d, false)
      if (Date.now() < waitUntil.current) return
      mode.current = MODE.HEART
      heartStart.current = Date.now()
      heartPoint(0, _pos)
      heartTangent(0, _tan)
      _prevTan.copy(_tan)
      prevPos.current.copy(_pos)
    }

    if (mode.current === MODE.HEART) {
      // progres memakai jam dinding supaya durasi tetap sama di semua perangkat
      t.current = ((Date.now() - heartStart.current) / 1000) * ((Math.PI * 2) / LOOP)
      if (t.current >= Math.PI * 2) {
        t.current = Math.PI * 2
        mode.current = MODE.EXIT
        exitStart.current = Date.now()
      }
      heartPoint(Math.min(t.current, Math.PI * 2), _pos)
      heartTangent(Math.min(t.current, Math.PI * 2), _tan)
      if (_tan.lengthSq() < 1e-6) _tan.copy(_prevTan)
      _tan.normalize()
    } else if (mode.current === MODE.EXIT) {
      const exitT = (Date.now() - exitStart.current) / 1000
      // menjauh ke atas-belakang (bukan ke arah kamera) supaya asap tidak
      // melewati lensa dan tidak menambah ekor di atas hati
      _tan.set(_pos.x - HEART.cx, _pos.y - HEART.cy + 8, -16).normalize()
      const speed = 20 + exitT * 6
      _pos.addScaledVector(_tan, speed * d)
      if (exitT >= EXIT_TIME) mode.current = MODE.GONE
    }

    // orientasi: hidung (+x lokal) mengikuti singgungan, plus bank saat belok
    const ang = Math.atan2(_tan.y, _tan.x)
    let da = ang - prevAng.current
    if (da > Math.PI) da -= Math.PI * 2
    if (da < -Math.PI) da += Math.PI * 2
    prevAng.current = ang
    const target = THREE.MathUtils.clamp((da / Math.max(d, 0.001)) * 0.45, -0.8, 0.8)
    bank.current += (target - bank.current) * Math.min(1, d * 3)

    g.position.copy(_pos)
    _q.setFromUnitVectors(_xAxis, _tan)
    _roll.setFromAxisAngle(_xAxis, bank.current)
    g.quaternion.copy(_q).multiply(_roll)

    // memudar di akhir fase keluar
    if (mode.current === MODE.EXIT) {
      const exitT = (Date.now() - exitStart.current) / 1000
      const k = 1 - Math.min(Math.max((exitT - EXIT_TIME * 0.5) / (EXIT_TIME * 0.5), 0), 1)
      g.scale.setScalar(2.0 * (0.4 + 0.6 * k))
      g.visible = k > 0.01
    } else {
      g.scale.setScalar(2.0)
      g.visible = true
    }

    // asap disemburkan sepanjang segmen prevPos → _pos, hanya selama
    // menggambar hati — saat keluar tidak, agar bentuk hati tetap bersih
    const flying = mode.current === MODE.HEART
    smoke.update(
      d,
      flying,
      _pos.x,
      _pos.y,
      _pos.z,
      _tan.x,
      _tan.y,
      _tan.z,
      prevPos.current.x,
      prevPos.current.y,
      prevPos.current.z,
      dAcc
    )
    prevPos.current.copy(_pos)
    void state
  })

  return (
    <>
      {/* jet ramping — hidung ke +x, mengikuti singgungan kurva hati */}
      <group ref={jet} visible={false} scale={2.0}>
        {/* badan utama: mutiara hangat dengan kilau mawar */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.26, 2.6, 6, 14]} />
          <meshStandardMaterial
            color="#fff2ee"
            roughness={0.35}
            metalness={0.25}
            emissive="#ff9db8"
            emissiveIntensity={0.14}
          />
        </mesh>

        {/* hidung lancip rose-gold */}
        <mesh position={[1.62, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.26, 0.72, 14]} />
          <meshStandardMaterial
            color="#e88aa4"
            roughness={0.3}
            metalness={0.4}
            emissive="#e88aa4"
            emissiveIntensity={0.25}
          />
        </mesh>

        {/* kanopi kokpit gelap */}
        <mesh position={[0.55, 0.19, 0]} scale={[1.9, 0.7, 0.9]}>
          <sphereGeometry args={[0.15, 12, 10]} />
          <meshStandardMaterial color="#413a5c" roughness={0.12} metalness={0.5} />
        </mesh>

        {/* sayap menyapu ke belakang */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-0.3, -0.02, s * 0.95]} rotation={[0, -s * 0.58, 0]} castShadow>
            <boxGeometry args={[1.4, 0.05, 1.9]} />
            <meshStandardMaterial
              color="#ffe4ec"
              roughness={0.45}
              metalness={0.15}
              emissive="#ffb9cd"
              emissiveIntensity={0.18}
            />
          </mesh>
        ))}
        {/* aksen ujung sayap */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-1.05, -0.02, s * 1.62]} rotation={[0, -s * 0.58, 0]}>
            <boxGeometry args={[0.42, 0.055, 0.34]} />
            <meshStandardMaterial color="#e88aa4" roughness={0.4} emissive="#e88aa4" emissiveIntensity={0.3} />
          </mesh>
        ))}

        {/* sirip ekor vertikal */}
        <mesh position={[-1.42, 0.32, 0]} rotation={[0, 0, -0.32]} castShadow>
          <boxGeometry args={[0.55, 0.78, 0.06]} />
          <meshStandardMaterial color="#e88aa4" roughness={0.45} emissive="#e88aa4" emissiveIntensity={0.2} />
        </mesh>
        {/* stabilizer horizontal */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-1.32, 0.04, s * 0.5]} rotation={[0, s * 0.35, 0]}>
            <boxGeometry args={[0.5, 0.045, 0.95]} />
            <meshStandardMaterial color="#ffe4ec" roughness={0.5} emissive="#ffb9cd" emissiveIntensity={0.12} />
          </mesh>
        ))}

        {/* mesin + nyala embun rose */}
        <mesh position={[-1.58, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.19, 0.23, 0.4, 12]} />
          <meshStandardMaterial color="#8a6a78" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[-1.8, 0, 0]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshBasicMaterial color="#ffc2d6" toneMapped={false} />
        </mesh>
        <sprite position={[-1.95, 0, 0]} scale={[1.5, 1.5, 1]}>
          <spriteMaterial
            map={getSoftTexture()}
            color="#ff9db8"
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>

      {/* asap hati — titik shader dengan tekstur lembut */}
      <points ref={smoke.points} geometry={smoke.sys.geo} material={smoke.sys.mat} frustumCulled={false} renderOrder={5} />
    </>
  )
}
