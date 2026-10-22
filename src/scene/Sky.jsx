import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { LIN, SUN_DIR, COLORS } from './palette'

const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const frag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uWarm;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uTime;
  varying vec3 vDir;

  vec3 aces(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    vec3 d = normalize(vDir);
    float y = max(d.y, -0.05);

    // Gradien vertikal: jingga di horizon → lembayung → indigo
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.15, y));
    col = mix(col, uTop, smoothstep(0.05, 0.48, y));

    // Pendar matahari
    float sd = max(dot(d, uSunDir), 0.0);
    col = mix(col, uWarm, pow(sd, 3.4) * 0.5);
    col += uSunColor * pow(sd, 26.0) * 0.45;
    col += uSunColor * pow(sd, 140.0) * 1.9;

    // Piringan matahari
    float disc = smoothstep(0.99942, 0.99972, sd);
    col = mix(col, uSunColor * 2.6, disc);

    // Awan tipis bergerak sangat pelan
    float drift = uTime * 0.02;
    float band = sin(y * 42.0 + sin(d.x * 3.4 + drift) * 2.4 + drift * 2.0);
    float cloudMask = smoothstep(0.30, 0.02, y) * smoothstep(-0.02, 0.05, y);
    col += vec3(0.045, 0.024, 0.018) * cloudMask * (band * 0.5 + 0.5);

    gl_FragColor = vec4(pow(aces(col), vec3(1.0 / 2.2)), 1.0);
  }
`

function Stars({ count = 700 }) {
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const tmp = new THREE.Color()
    for (let i = 0; i < count; i++) {
      // sebar di belahan atas, condong ke arah langit tinggi
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(0.05 + Math.random() * 0.95)
      const r = 430
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.cos(phi) * 1.1
      const z = r * Math.sin(phi) * Math.sin(theta)
      pos.set([x, Math.abs(y), z], i * 3)
      const b = 0.25 + Math.pow(Math.random(), 3) * 0.9
      const warm = Math.random() * 0.35
      tmp.setRGB(1, 0.92 - warm * 0.2, 0.85 - warm * 0.3).multiplyScalar(b)
      col.set([tmp.r, tmp.g, tmp.b], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [count])

  return (
    <points geometry={geometry} renderOrder={-9} frustumCulled={false}>
      <pointsMaterial
        size={1.9}
        sizeAttenuation={false}
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </points>
  )
}

export default function Sky({ quality = 'high' }) {
  const mat = useRef()
  const uniforms = useMemo(
    () => ({
      uTop: { value: LIN.skyTop.clone() },
      uMid: { value: LIN.skyMid.clone() },
      uHorizon: { value: LIN.skyHorizon.clone() },
      uWarm: { value: LIN.skyWarm.clone() },
      uSunColor: { value: LIN.sun.clone() },
      uSunDir: { value: SUN_DIR.clone() },
      uTime: { value: 0 },
    }),
    []
  )

  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  const starCount = quality === 'low' ? 300 : quality === 'medium' ? 550 : 900

  return (
    <>
      <mesh renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[460, 40, 26]} />
        <shaderMaterial
          ref={mat}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          depthTest={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <Stars count={starCount} />
    </>
  )
}
