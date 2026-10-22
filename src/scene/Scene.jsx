import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import Sky from './Sky'
import Ocean from './Ocean'
import Island from './Island'
import { PalmGrove } from './Palm'
import Pier from './Pier'
import LetterPodium from './LetterPodium'
import BannerPlane from './BannerPlane'
import { Fireflies, SkyLanterns, Fireworks, Clouds, Petals } from './Atmosphere'
import Player, { IntroCamera } from './Player'
import RemotePlayers from './RemotePlayers'
import NpcCrowd from './NpcCrowd'
import Garden from './Garden'
import HeartJet from './HeartJet'
import { LIGHT_DIR, QUALITY } from './palette'
import { useStore } from '../store/useStore'

function Perf() {
  const quality = useStore((s) => s.settings.quality)
  const { gl, setDpr } = useThree()

  useEffect(() => {
    const q = QUALITY[quality] ?? QUALITY.high
    const target = Math.min(window.devicePixelRatio || 1, q.dpr[1])
    setDpr(target)
    gl.shadowMap.enabled = q.shadows
    gl.shadowMap.type = THREE.PCFSoftShadowMap
    gl.shadowMap.needsUpdate = true
  }, [quality, gl, setDpr])

  return null
}

export default function Scene() {
  const quality = useStore((s) => s.settings.quality)
  const phase = useStore((s) => s.phase)
  const q = QUALITY[quality] ?? QUALITY.high

  return (
    <>
      <fog attach="fog" args={['#e7a184', 95, 430]} />

      {/* cahaya: matahari rendah + pantulan langit */}
      <hemisphereLight args={['#ffd9bd', '#3d6b78', 0.95]} />
      <directionalLight
        position={[LIGHT_DIR.x * 80, LIGHT_DIR.y * 80, LIGHT_DIR.z * 80]}
        intensity={2.05}
        color="#ffd0a8"
        castShadow={q.shadows}
        shadow-mapSize-width={q.shadowMap}
        shadow-mapSize-height={q.shadowMap}
        shadow-camera-left={-21}
        shadow-camera-right={21}
        shadow-camera-top={21}
        shadow-camera-bottom={-21}
        shadow-camera-near={1}
        shadow-camera-far={170}
        shadow-bias={-0.0002}
        shadow-normalBias={0.012}
      />
      {/* isi cahaya dingin dari arah berlawanan */}
      <directionalLight position={[-40, 22, 50]} intensity={0.75} color="#8fa8dd" />
      <ambientLight intensity={0.17} color="#ffd9c4" />

      <Sky quality={quality} />
      <Clouds count={quality === 'low' ? 5 : 9} />
      <Ocean quality={quality} />
      <Island />
      <PalmGrove />
      <Pier quality={quality} />
      <Garden />
      <NpcCrowd />
      <LetterPodium />
      <BannerPlane />
      <HeartJet />
      <SkyLanterns count={quality === 'low' ? 8 : 16} />
      <Fireflies quality={quality} />
      <Petals count={quality === 'low' ? 18 : 46} />
      <Fireworks />
      <RemotePlayers />

      {phase === 'world' ? <Player quality={quality} /> : <IntroCamera />}
      <Perf />
    </>
  )
}
