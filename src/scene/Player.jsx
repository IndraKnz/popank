import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import Avatar from './Avatar'
import { PALM_TRUNKS } from './Palm'
import {
  groundHeight,
  isOnPier,
  PIER,
  PODIUM_POS,
  ISLAND_RADIUS,
  NPC_SPOTS,
  NPC_RADIUS,
} from './palette'
import { input, readMove, isRunning, clampLook, cameraBasis } from '../lib/input'
import { playerPos } from '../lib/playerState'
import { SWING_SPOT, swingRig } from '../lib/gardenState'
import { SKY, SKY_LOOK_UP } from '../lib/skyMoment'
import { useStore } from '../store/useStore'
import { net } from '../lib/net'

const WALK = 3.0
const RUN = 6.4
const CAM_DIST = 7.2

function walkable(x, z) {
  const r = Math.hypot(x, z)
  if (r < ISLAND_RADIUS - 1.6) return true
  if (isOnPier(x, z)) return true
  return false
}

function surfaceY(x, z) {
  return isOnPier(x, z) ? PIER.deckY : groundHeight(x, z)
}

export default function Player({ quality }) {
  const group = useRef()
  const avatarCfg = useStore((s) => s.avatar)
  const profileName = useStore((s) => s.displayName) || 'Kamu'
  const setNearLetter = useStore((s) => s.setNearLetter)
  const openLetter = useStore((s) => s.openLetter)
  const lastReaction = useStore((s) => s.lastReaction)
  const reactionAt = useStore((s) => s.reactionAt)
  const onSwing = useStore((s) => s.onSwing)
  const setOnSwing = useStore((s) => s.setOnSwing)
  const setNearSwing = useStore((s) => s.setNearSwing)
  const sensitivity = useStore((s) => s.settings.sensitivity)
  const skyMoment = useStore((s) => s.skyMoment)
  const { camera, gl } = useThree()

  const [anim, setAnim] = useState('idle')
  const [moving, setMoving] = useState(false)
  const [running, setRunning] = useState(false)

  const pos = useRef(new THREE.Vector3(0, 0, 6))
  const rotY = useRef(Math.PI)
  const camY = useRef(1)
  const netTimer = useRef(0)
  const movingRef = useRef(false)
  const runningRef = useRef(false)
  const animRef = useRef('idle')
  animRef.current = anim
  const sensRef = useRef(sensitivity)
  sensRef.current = sensitivity

  /* -------- momen langit: kamera mendongak, tapi pemain tetap bisa ambil alih -------- */
  const skyAbort = useRef(false)
  const skyLook0 = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    if (!skyMoment) return
    skyAbort.current = false
    skyLook0.current = { yaw: input.look.yaw, pitch: input.look.pitch }
  }, [skyMoment])

  /* -------- gestur look (drag / swipe) -------- */
  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let last = { x: 0, y: 0 }
    let pid = null

    const down = (e) => {
      if (e.button !== undefined && e.button !== 0) return
      dragging = true
      pid = e.pointerId
      last = { x: e.clientX, y: e.clientY }
      input.pointerDown = true
      el.style.cursor = 'grabbing'
    }
    const move = (e) => {
      if (!dragging || (pid !== null && e.pointerId !== pid)) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      last = { x: e.clientX, y: e.clientY }
      const s = sensRef.current
      input.look.yaw -= dx * 0.0042 * s
      input.look.pitch = clampLook(input.look.pitch + dy * 0.0032 * s)
      input.moved = true
    }
    const up = () => {
      dragging = false
      pid = null
      input.pointerDown = false
      el.style.cursor = ''
    }

    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)

    // zoom kamera dengan roda mouse
    const wheel = (e) => {
      e.preventDefault()
      input.zoom = THREE.MathUtils.clamp((input.zoom ?? 1) + e.deltaY * 0.0008, 0.7, 1.5)
    }
    el.addEventListener('wheel', wheel, { passive: false })

    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  /* -------- reaksi avatar -------- */
  useEffect(() => {
    if (!reactionAt || !lastReaction) return
    setAnim(lastReaction)
    const t = setTimeout(() => setAnim('idle'), 3400)
    return () => clearTimeout(t)
  }, [reactionAt, lastReaction])

  /* -------- tombol E untuk surat -------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'KeyE') return
      const s = useStore.getState()
      if (s.onSwing) {
        s.setOnSwing(false)
        pos.current.set(SWING_SPOT.x, pos.current.y, SWING_SPOT.z)
      } else if (s.nearSwing) {
        s.setOnSwing(true)
      } else if (s.nearLetter) {
        openLetter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openLetter])

  /* -------- registrasi ke jaringan -------- */
  useEffect(() => {
    net.self = { id: useStore.getState().selfId, name: profileName, avatar: avatarCfg }
    return () => {
      net.self = null
    }
  }, [profileName, avatarCfg])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    const mv = readMove()
    const run = isRunning()
    const movingNow = mv.len > 0.06

    const runNow = run && movingNow
    if (movingRef.current !== movingNow) {
      movingRef.current = movingNow
      setMoving(movingNow)
    }
    if (runningRef.current !== runNow) {
      runningRef.current = runNow
      setRunning(runNow)
    }

    /* -------- duduk di ayunan taman -------- */
    if (onSwing) {
      if (swingRig.ready) {
        pos.current.set(swingRig.seat.x, swingRig.seat.y - 0.57, swingRig.seat.z)
        let dy = swingRig.yaw - rotY.current
        while (dy > Math.PI) dy -= Math.PI * 2
        while (dy < -Math.PI) dy += Math.PI * 2
        rotY.current += dy * Math.min(1, d * 6)
      }
      // dorong joystick / tekan tombol arah → turun dari ayunan
      if (mv.len > 0.55) {
        setOnSwing(false)
        pos.current.set(SWING_SPOT.x, pos.current.y, SWING_SPOT.z)
      }
      movingRef.current = false
      runningRef.current = false
      if (moving) setMoving(false)
      if (running) setRunning(false)
      playerPos.copy(pos.current)

      if (group.current) {
        group.current.position.copy(pos.current)
        group.current.rotation.y = rotY.current
      }
    } else {
      const basis = cameraBasis(input.look.yaw)
      const dx = basis.forward.x * mv.y + basis.right.x * mv.x
      const dz = basis.forward.z * mv.y + basis.right.z * mv.x
      const len = Math.hypot(dx, dz)

      if (len > 0.001) {
        const speed = run ? RUN : WALK
        const nx = pos.current.x + (dx / len) * speed * d
        const nz = pos.current.z + (dz / len) * speed * d

        // geser dengan sliding bila menabrak batas
        if (walkable(nx, nz)) {
          pos.current.x = nx
          pos.current.z = nz
        } else if (walkable(nx, pos.current.z)) {
          pos.current.x = nx
        } else if (walkable(pos.current.x, nz)) {
          pos.current.z = nz
        }

        const targetRot = Math.atan2(dx, dz)
        let diff = targetRot - rotY.current
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        rotY.current += diff * Math.min(1, d * 12)
      }

      // jangan menembus kerumunan NPC yang memegang poster
      for (let i = 0; i < NPC_SPOTS.length; i++) {
        const s = NPC_SPOTS[i]
        const ox = pos.current.x - s.x
        const oz = pos.current.z - s.z
        const od = Math.hypot(ox, oz)
        if (od < NPC_RADIUS && od > 1e-4) {
          pos.current.x = s.x + (ox / od) * NPC_RADIUS
          pos.current.z = s.z + (oz / od) * NPC_RADIUS
        }
      }

      // bagikan posisi ke komponen lain (kerumunan NPC menoleh ke pemain)
      playerPos.copy(pos.current)

      // tinggi permukaan (diperhalus)
      const sy = surfaceY(pos.current.x, pos.current.z)
      pos.current.y += (sy - pos.current.y) * Math.min(1, d * 14)
    }

    if (import.meta.env.DEV) {
      window.__etPos = pos.current
      window.__etTeleport = (x, z) => pos.current.set(x, 0, z)
    }
    if (group.current) {
      group.current.position.copy(pos.current)
      group.current.rotation.y = rotY.current
    }

    /* -------- kamera orang ketiga -------- */
    const yaw = input.look.yaw
    const pitch = input.look.pitch
    const zoom = input.zoom ?? 1
    const dist = CAM_DIST * zoom
    const focus = new THREE.Vector3(pos.current.x, pos.current.y + 1.35, pos.current.z)

    const offX = Math.sin(yaw) * Math.cos(pitch) * dist
    const offZ = Math.cos(yaw) * Math.cos(pitch) * dist
    const offY = Math.sin(pitch) * dist + 0.85

    const desired = new THREE.Vector3(focus.x + offX, focus.y + offY, focus.z + offZ)

    // jangan sampai kamera masuk ke batang palem: tarik kamera ke depan pohon
    const dirX = desired.x - focus.x
    const dirZ = desired.z - focus.z
    const segLen = Math.hypot(dirX, dirZ)
    if (segLen > 0.05) {
      let minT = 1
      for (let i = 0; i < PALM_TRUNKS.length; i++) {
        const t = PALM_TRUNKS[i]
        const ox = t.x - focus.x
        const oz = t.z - focus.z
        const proj = (ox * dirX + oz * dirZ) / (segLen * segLen)
        if (proj <= 0.08 || proj >= minT) continue
        const cx = focus.x + dirX * proj
        const cz = focus.z + dirZ * proj
        const d = Math.hypot(t.x - cx, t.z - cz)
        if (d < 0.9) {
          const back = Math.sqrt(Math.max(0, 0.81 - d * d)) / segLen
          minT = Math.min(minT, Math.max(0.18, proj - back))
        }
      }
      if (minT < 1) {
        desired.x = focus.x + dirX * minT
        desired.z = focus.z + dirZ * minT
      }
    }

    // jangan tembus pasir
    const floor = groundHeight(desired.x, desired.z) + 0.6
    if (desired.y < floor) desired.y = floor

    const k = 1 - Math.pow(0.001, d)
    camera.position.lerp(desired, k)

    // "Lihat ke Langit": kamera menahan pandangan ke atas selama hati digambar
    let lookTarget = focus
    if (skyMoment && !skyAbort.current) {
      const age = (Date.now() - skyMoment) / 1000
      // pemain menggeser kamera sendiri → lepaskan kendali sinematik
      if (
        Math.abs(input.look.yaw - skyLook0.current.yaw) > 0.05 ||
        Math.abs(input.look.pitch - skyLook0.current.pitch) > 0.05
      ) {
        skyAbort.current = true
      }
      const total = SKY.hold + SKY.fadeOut
      const g =
        age < total
          ? Math.min(1, age / SKY.fadeIn) * Math.min(1, Math.max(0, (total - age) / SKY.fadeOut))
          : 0
      if (g > 0) {
        const lift = Math.tan(THREE.MathUtils.degToRad(SKY_LOOK_UP)) * 58
        lookTarget = focus
          .clone()
          .lerp(new THREE.Vector3(pos.current.x, pos.current.y + lift, pos.current.z - 58), g)
      }
    }
    camera.lookAt(lookTarget)

    /* -------- proximity podium -------- */
    const distToPodium = Math.hypot(
      pos.current.x - PODIUM_POS.x,
      pos.current.z - PODIUM_POS.z
    )
    setNearLetter(distToPodium < 3.6)

    /* -------- proximity ayunan -------- */
    const distToSwing = Math.hypot(
      pos.current.x - SWING_SPOT.x,
      pos.current.z - SWING_SPOT.z
    )
    setNearSwing(!onSwing && distToSwing < 2.5)

    /* -------- sinkronisasi multiplayer -------- */
    netTimer.current += d
    if (netTimer.current > 0.1) {
      netTimer.current = 0
      net.updateState({
        p: [
          +pos.current.x.toFixed(2),
          +pos.current.y.toFixed(2),
          +pos.current.z.toFixed(2),
        ],
        r: +rotY.current.toFixed(2),
        an: movingNow ? (run ? 'run' : 'walk') : animRef.current,
      })
    }
  })

  return (
    <group ref={group}>
      <Avatar
        config={avatarCfg}
        anim={onSwing ? 'sit' : anim}
        moving={moving && !onSwing}
        running={running && !onSwing}
      />
    </group>
  )
}

/** Kamera sinematik untuk layar intro & kustomisasi. */
export function IntroCamera() {
  const { camera } = useThree()
  const target = useMemo(() => new THREE.Vector3(0, 3.6, -10), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime * 0.055
    // Radius cukup jauh supaya mahkota palem terdekat tetap masuk frame.
    const r = 37
    const x = Math.sin(t) * r
    const z = Math.cos(t) * r + 2
    const y = 8.6 + Math.sin(t * 1.7) * 1.8
    camera.position.lerp(new THREE.Vector3(x, y, z), Math.min(1, dt * 1.4))
    camera.lookAt(target)
  })

  return null
}
