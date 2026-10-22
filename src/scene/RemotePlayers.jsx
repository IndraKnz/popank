import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import Avatar from './Avatar'
import { net } from '../lib/net'
import { useStore } from '../store/useStore'
import { DEFAULT_AVATAR } from '../lib/content'

function RemoteAvatar({ peer }) {
  const group = useRef()
  const cur = useRef({ x: 0, y: 0, z: 0, r: 0, init: false })
  const [state, setState] = useState({ moving: false, running: false, anim: 'idle' })
  const showNames = useStore((s) => s.settings.showNames)

  useFrame((_, dt) => {
    const live = net.peers.get(peer.id)
    if (!live || !group.current) return
    const d = Math.min(dt, 0.05)
    const k = 1 - Math.pow(0.0001, d)
    const c = cur.current

    if (!c.init) {
      c.x = live.p[0]
      c.y = live.p[1]
      c.z = live.p[2]
      c.r = live.r
      c.init = true
    } else {
      c.x += (live.p[0] - c.x) * k
      c.y += (live.p[1] - c.y) * k
      c.z += (live.p[2] - c.z) * k
      let diff = live.r - c.r
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      c.r += diff * k
    }

    group.current.position.set(c.x, c.y, c.z)
    group.current.rotation.y = c.r

    const isMoving = live.an === 'walk' || live.an === 'run'
    const anim = isMoving ? 'idle' : live.an
    if (
      state.moving !== isMoving ||
      state.running !== (live.an === 'run') ||
      state.anim !== anim
    ) {
      setState({ moving: isMoving, running: live.an === 'run', anim })
    }
  })

  return (
    <group ref={group}>
      <Avatar
        config={peer.avatar || DEFAULT_AVATAR}
        anim={state.anim}
        moving={state.moving}
        running={state.running}
      />
      {showNames && (
        // Tanpa distanceFactor: label berukuran tetap di layar, seperti
        // papan nama pemain pada umumnya (distanceFactor membuatnya
        // membesar berlebihan saat pemain lain dekat kamera).
        <Html position={[0, 2.0, 0]} center zIndexRange={[20, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap rounded-full border border-white/20 bg-ink-900/75 px-2 py-0.5 text-[10px] font-semibold text-sand-100/95 backdrop-blur-sm">
            {peer.name}
          </div>
        </Html>
      )}
    </group>
  )
}

export default function RemotePlayers() {
  const [peers, setPeers] = useState([])
  const phase = useStore((s) => s.phase)

  useEffect(() => {
    const unsub = net.subscribe(setPeers)
    return () => unsub()
  }, [])

  if (phase !== 'world') return null

  return (
    <>
      {peers.map((p) => (
        <RemoteAvatar key={p.id} peer={p} />
      ))}
    </>
  )
}
