import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store/useStore'

/* ==========================================================
   Banner: digambar di canvas resolusi tinggi (2560×560)
   ========================================================== */

const BANNER_W = 2560
const BANNER_H = 560

const FLAG_COLORS = ['#e2543f', '#f7a94e', '#6fb1a5', '#ef4d72', '#b78ae0']

function heartPath(ctx, cx, cy, s) {
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.36)
  ctx.bezierCurveTo(cx - s, cy - s * 0.5, cx - s * 0.5, cy - s * 1.1, cx, cy - s * 0.45)
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.1, cx + s, cy - s * 0.5, cx, cy + s * 0.36)
  ctx.closePath()
  ctx.fill()
}

function makeBannerTexture(text) {
  const w = BANNER_W
  const h = BANNER_H
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  // kertas krem hangat
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#fffaf0')
  grad.addColorStop(0.55, '#ffeacd')
  grad.addColorStop(1, '#ffd9b2')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // bingkai ganda
  ctx.strokeStyle = 'rgba(214,72,52,0.72)'
  ctx.lineWidth = 10
  ctx.strokeRect(22, 22, w - 44, h - 44)
  ctx.strokeStyle = 'rgba(214,72,52,0.22)'
  ctx.lineWidth = 3
  ctx.strokeRect(44, 44, w - 88, h - 88)

  // umbul-umbul di sepanjang tepi atas
  const fw = 104
  for (let i = 0, x = 60; x < w - 60; i++, x += fw) {
    const c = FLAG_COLORS[i % FLAG_COLORS.length]
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.moveTo(x, 46)
    ctx.lineTo(x + fw * 0.86, 46)
    ctx.lineTo(x + fw * 0.43, 130)
    ctx.closePath()
    ctx.fill()
    // tali
    ctx.strokeStyle = 'rgba(120,70,50,0.35)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, 46)
    ctx.lineTo(x + fw * 0.86, 46)
    ctx.stroke()
  }

  // teks
  const label = text || 'Selamat Ulang Tahun'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 178
  const maxW = w - 520
  ctx.font = `600 ${size}px "Cormorant Infant", Georgia, serif`
  while (ctx.measureText(label).width > maxW && size > 60) {
    size -= 6
    ctx.font = `600 ${size}px "Cormorant Infant", Georgia, serif`
  }

  // bayangan tipis supaya teks tetap tegas saat kecil di layar
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText(label, w / 2 + 3, h / 2 + 62)
  ctx.fillStyle = '#b8371f'
  ctx.fillText(label, w / 2, h / 2 + 58)

  // hati di kedua ujung
  ctx.fillStyle = 'rgba(226,84,63,0.78)'
  heartPath(ctx, 132, h / 2 + 40, 30)
  heartPath(ctx, w - 132, h / 2 + 40, 30)

  // bintang kecil di sudut bawah
  ctx.fillStyle = 'rgba(226,84,63,0.4)'
  for (let i = 0; i < 10; i++) {
    const x = 150 + i * ((w - 300) / 9)
    ctx.beginPath()
    ctx.arc(x, h - 72, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/* ==========================================================
   Konfeti yang jatuh dari ekor pesawat
   ========================================================== */

const CONF_N = 130
const CONF_COLORS = ['#ff8a5c', '#ffd166', '#6fd3c7', '#f26b8a', '#b78ae0', '#fff2d8']

/** Kecepatan lintas (p per detik) — 0,36 → 1,0 dalam ±10 detik. */
const FLY_SPEED = 0.062

function useConfetti() {
  const mesh = useRef()
  const state = useMemo(
    () => ({
      pos: new Float32Array(CONF_N * 3),
      vel: new Float32Array(CONF_N * 3),
      rot: new Float32Array(CONF_N * 3),
      spin: new Float32Array(CONF_N * 3),
      life: new Float32Array(CONF_N),
      max: new Float32Array(CONF_N),
      cursor: 0,
      acc: 0,
      ready: false,
    }),
    []
  )

  // warna per instance cukup di-set sekali
  useEffect(() => {
    const inst = mesh.current
    if (!inst) return
    const col = new THREE.Color()
    const m = new THREE.Matrix4().makeScale(0, 0, 0)
    for (let i = 0; i < CONF_N; i++) {
      inst.setMatrixAt(i, m)
      inst.setColorAt(i, col.set(CONF_COLORS[i % CONF_COLORS.length]))
    }
    inst.instanceMatrix.needsUpdate = true
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true
    state.ready = true
  }, [state])

  const spawn = (x, y, z, count) => {
    const s = state
    for (let k = 0; k < count; k++) {
      const i = s.cursor
      s.cursor = (s.cursor + 1) % CONF_N
      const i3 = i * 3
      s.pos[i3] = x + (Math.random() - 0.5) * 1.1
      s.pos[i3 + 1] = y + (Math.random() - 0.5) * 0.7
      s.pos[i3 + 2] = z + (Math.random() - 0.5) * 1.1
      s.vel[i3] = -0.8 + Math.random() * 1.6
      s.vel[i3 + 1] = 0.4 + Math.random() * 1.1
      s.vel[i3 + 2] = (Math.random() - 0.5) * 1.4
      s.rot[i3] = Math.random() * 6.28
      s.rot[i3 + 1] = Math.random() * 6.28
      s.rot[i3 + 2] = Math.random() * 6.28
      s.spin[i3] = (Math.random() - 0.5) * 7
      s.spin[i3 + 1] = (Math.random() - 0.5) * 7
      s.spin[i3 + 2] = (Math.random() - 0.5) * 7
      s.life[i] = 0
      s.max[i] = 2.6 + Math.random() * 2.2
    }
  }

  const update = (d, origin) => {
    const inst = mesh.current
    if (!inst || !state.ready) return
    const s = state

    // origin null = tidak memunculkan konfeti baru (pesawat sedang tidak terbang)
    if (origin) {
      s.acc += d
      const every = 1 / 24
      while (s.acc > every) {
        s.acc -= every
        spawn(origin.x - 5.8, origin.y + 0.6, origin.z, 1)
      }
    } else {
      s.acc = 0
    }

    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const p = new THREE.Vector3()
    const sc = new THREE.Vector3()

    for (let i = 0; i < CONF_N; i++) {
      const i3 = i * 3
      if (s.max[i] === 0 || s.life[i] >= s.max[i]) {
        m.makeScale(0, 0, 0)
        inst.setMatrixAt(i, m)
        continue
      }
      s.life[i] += d
      const drag = Math.pow(0.9, d * 60)
      s.vel[i3] *= drag
      s.vel[i3 + 1] = s.vel[i3 + 1] * drag - 1.5 * d
      s.vel[i3 + 2] *= drag
      s.pos[i3] += s.vel[i3] * d
      s.pos[i3 + 1] += s.vel[i3 + 1] * d
      s.pos[i3 + 2] += s.vel[i3 + 2] * d
      s.rot[i3] += s.spin[i3] * d
      s.rot[i3 + 1] += s.spin[i3 + 1] * d
      s.rot[i3 + 2] += s.spin[i3 + 2] * d

      const k = 1 - Math.max(0, (s.life[i] - s.max[i] * 0.7) / (s.max[i] * 0.3))
      p.set(s.pos[i3], s.pos[i3 + 1], s.pos[i3 + 2])
      e.set(s.rot[i3], s.rot[i3 + 1], s.rot[i3 + 2])
      q.setFromEuler(e)
      sc.setScalar(k)
      m.compose(p, q, sc)
      inst.setMatrixAt(i, m)
    }
    inst.instanceMatrix.needsUpdate = true
  }

  return { mesh, update }
}

/* ==========================================================
   Pesawat + banner
   ========================================================== */

/**
 * Pesawat yang melintasi ufuk sambil menyeret banner ucapan.
 * TIDAK muncul sendiri: baru terbang setelah "Lihat ke Langit" dipicu,
 * lalu bersembunyi lagi setelah selesai melintas.
 */
export default function BannerPlane() {
  const group = useRef()
  const prop = useRef()
  const balloons = useRef()
  const bannerMat = useRef()
  const p = useRef(0.36)
  const flying = useRef(false)
  const text = useStore((s) => s.profile.partner)
  const skyMoment = useStore((s) => s.skyMoment)

  const label = useMemo(() => {
    const to = (text || '').trim()
    if (!to) return 'Selamat Ulang Tahun'
    return `Selamat Ulang Tahun, ${to}`
  }, [text])

  const texture = useMemo(() => makeBannerTexture(label), [label])
  const confetti = useConfetti()

  // Font web kadang belum siap saat canvas digambar → gambar ulang sekali.
  useEffect(() => {
    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (cancelled) return
      const t = makeBannerTexture(label)
      if (bannerMat.current) {
        bannerMat.current.map?.dispose()
        bannerMat.current.map = t
        bannerMat.current.needsUpdate = true
      }
    })
    return () => {
      cancelled = true
    }
  }, [label])

  useEffect(() => {
    if (!skyMoment) return
    // pesawat hanya muncul saat "Lihat ke Langit":
    // mulai sedikit kiri dari tengah supaya langsung terlihat
    p.current = 0.36
    flying.current = true
  }, [skyMoment])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    const t = state.clock.elapsedTime
    const g = group.current

    if (import.meta.env.DEV) {
      window.__etBanner = (v) => {
        p.current = v
        flying.current = true
      }
      window.__etPlaneState = () => ({
        flying: flying.current,
        visible: !!g?.visible,
        p: +p.current.toFixed(3),
      })
    }

    // diam total (tidak terlihat) sampai momen langit dipicu
    if (!g || !flying.current) {
      if (g) g.visible = false
      confetti.update(d, null)
      if (prop.current) prop.current.rotation.x += d * 34
      return
    }

    // sekali melintas ±10 detik dari tengah kiri ke kanan
    p.current += d * FLY_SPEED
    // selesai melintas → sembunyikan lagi
    if (p.current >= 0.995) {
      p.current = 1
      flying.current = false
    }
    const u = p.current

    const x = -100 + u * 200
    const z = -54 - Math.sin(u * Math.PI) * 8
    const y = 16 + Math.sin(u * Math.PI * 2) * 1.2
    g.position.set(x, y, z)
    g.rotation.z = Math.sin(u * Math.PI) * 0.05
    g.rotation.y = 0
    g.visible = true
    confetti.update(d, g.position)

    if (prop.current) prop.current.rotation.x += d * 34
    if (balloons.current) balloons.current.rotation.z = Math.sin(t * 1.1) * 0.03
  })

  const BALLOONS = [
    [-2.8, '#ef4d72'],
    [-7.9, '#f7a94e'],
    [-13.0, '#6fb1a5'],
  ]

  return (
    <>
      <group ref={group} scale={2.1} visible={false}>
        {/* pesawatnya sendiri — sayap tinggi + bank tipis agar siluetnya terbaca */}
        <group scale={1.5} rotation={[0.14, 0, 0]}>
          {/* badan pesawat */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <capsuleGeometry args={[0.27, 2.2, 6, 14]} />
            <meshStandardMaterial
              color="#fdf1e0"
              roughness={0.5}
              metalness={0.08}
              emissive="#ffe6cf"
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* hidung */}
          <mesh position={[1.36, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.27, 0.5, 14]} />
            <meshStandardMaterial
              color="#e2543f"
              roughness={0.5}
              emissive="#e2543f"
              emissiveIntensity={0.15}
            />
          </mesh>

          {/* garis merah di badan */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.275, 0.275, 0.42, 14, 1, true]} />
            <meshStandardMaterial color="#e2543f" roughness={0.55} side={THREE.DoubleSide} />
          </mesh>

          {/* kanopi kokpit */}
          <mesh position={[0.42, 0.2, 0]} scale={[1.8, 0.7, 0.85]}>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial color="#3a4a6b" roughness={0.15} metalness={0.4} />
          </mesh>

          {/* sayap tinggi */}
          <mesh position={[0.18, 0.42, 0]} castShadow>
            <boxGeometry args={[0.95, 0.075, 4.5]} />
            <meshStandardMaterial
              color="#ffe8cd"
              roughness={0.6}
              emissive="#ffe8cd"
              emissiveIntensity={0.5}
            />
          </mesh>
          {/* ujung sayap merah */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.18, 0.42, s * 2.15]} castShadow>
              <boxGeometry args={[0.98, 0.08, 0.3]} />
              <meshStandardMaterial
                color="#e2543f"
                roughness={0.6}
                emissive="#e2543f"
                emissiveIntensity={0.35}
              />
            </mesh>
          ))}
          {/* penyangga sayap */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.3, 0.21, s * 1.1]} rotation={[s * 0.9, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.5, 5]} />
              <meshStandardMaterial color="#8a6a52" roughness={0.8} />
            </mesh>
          ))}

          {/* ekor */}
          <mesh position={[-1.62, 0.42, 0]} castShadow>
            <boxGeometry args={[0.42, 0.82, 0.08]} />
            <meshStandardMaterial
              color="#e2543f"
              roughness={0.6}
              emissive="#e2543f"
              emissiveIntensity={0.12}
            />
          </mesh>
          <mesh position={[-1.58, 0.06, 0]} castShadow>
            <boxGeometry args={[0.44, 0.06, 1.5]} />
            <meshStandardMaterial
              color="#ffe8cd"
              roughness={0.6}
              emissive="#ffe8cd"
              emissiveIntensity={0.16}
            />
          </mesh>

          {/* baling-baling + kabut putaran */}
          <group position={[1.62, 0, 0]}>
            <mesh ref={prop}>
              <boxGeometry args={[0.05, 1.3, 0.09]} />
              <meshStandardMaterial color="#3a3a44" roughness={0.6} />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <circleGeometry args={[0.62, 24]} />
              <meshBasicMaterial
                color="#fff4e2"
                transparent
                opacity={0.16}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.09, 8, 6]} />
              <meshStandardMaterial color="#e2543f" />
            </mesh>
          </group>
        </group>

        {/* tiang banner */}
        <mesh position={[-2.5, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 3.4, 6]} />
          <meshStandardMaterial color="#5e3a26" />
        </mesh>
        <mesh position={[-13.3, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 3.4, 6]} />
          <meshStandardMaterial color="#5e3a26" />
        </mesh>

        {/* banner */}
        <mesh position={[-7.9, 0, 0.02]}>
          <planeGeometry args={[10.6, 2.32]} />
          {/*
            Material tanpa pencahayaan: banner harus tetap terbaca jelas
            di langit yang sangat terang (cahaya utama + emissive akan
            membuat kertasnya "blown out" dan teksnya pudar).
          */}
          <meshBasicMaterial
            ref={bannerMat}
            map={texture}
            color="#fff6ea"
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* balon yang diikat ke banner */}
        <group ref={balloons}>
          {BALLOONS.map(([bx, color], i) => (
            <group key={i} position={[bx, 0, 0]}>
              <mesh position={[0, 2.12, 0]} castShadow>
                <sphereGeometry args={[0.34, 12, 10]} />
                <meshStandardMaterial
                  color={color}
                  roughness={0.35}
                  metalness={0.05}
                  emissive={color}
                  emissiveIntensity={0.18}
                />
              </mesh>
              <mesh position={[0, 1.8, 0]}>
                <coneGeometry args={[0.07, 0.14, 6]} />
                <meshStandardMaterial color={color} roughness={0.5} />
              </mesh>
              <mesh position={[0, 1.48, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.62, 4]} />
                <meshBasicMaterial color="#8a6a52" />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* konfeti di ruang dunia (tidak ikut bergerak dengan pesawat) */}
      <instancedMesh
        ref={confetti.mesh}
        args={[undefined, undefined, CONF_N]}
        frustumCulled={false}
        renderOrder={4}
      >
        <planeGeometry args={[0.52, 0.72]} />
        <meshBasicMaterial
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
          opacity={0.96}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  )
}
