import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { LIN, SUN_DIR, QUALITY } from './palette'

const vert = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNrm;
  varying float vH;

  float waveH(vec2 p, float t) {
    float h = 0.0;
    h += sin(p.x * 0.26 + t * 0.80) * 0.30;
    h += sin(p.y * 0.21 - t * 0.62) * 0.24;
    h += sin((p.x * 0.52 + p.y * 0.37) + t * 1.05) * 0.11;
    h += sin((p.x * 1.15 - p.y * 0.85) - t * 1.60) * 0.045;
    float r = length(p);
    h += sin(r * 0.42 - t * 1.15) * 0.04 * (1.0 - smoothstep(18.0, 90.0, r));
    return h;
  }

  void main() {
    vec3 pos = position;
    vec2 p = pos.xy;
    float h = waveH(p, uTime);
    pos.z += h;

    float e = 0.8;
    float hx = waveH(p + vec2(e, 0.0), uTime);
    float hy = waveH(p + vec2(0.0, e), uTime);
    vec3 n = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 1.0));

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    vNrm = normalize(mat3(modelMatrix) * n);
    vH = h;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const frag = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uHorizon;
  uniform vec3 uFog;
  uniform float uTime;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vWorld;
  varying vec3 vNrm;
  varying float vH;

  vec3 aces(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    vec3 N = normalize(vNrm);
    vec3 V = normalize(cameraPosition - vWorld);
    float dist = length(vWorld.xz);

    float shallow = 1.0 - smoothstep(19.0, 75.0, dist);
    vec3 base = mix(uDeep, uShallow, shallow * 0.95);
    base += vec3(0.015, 0.028, 0.02) * smoothstep(0.0, 0.55, vH);

    // Pantulan langit memakai arah cermin datar supaya gradasinya mulus
    // (memakai normal gelombang langsung membuat air "belang").
    vec3 Rv = reflect(-V, vec3(0.0, 1.0, 0.0));
    float ry = clamp(Rv.y, 0.0, 1.0);
    vec3 skyRef = mix(uHorizon * 0.92, vec3(0.045, 0.075, 0.165), smoothstep(0.0, 0.13, ry));

    vec3 rFlat = normalize(vec3(Rv.x, 0.0, Rv.z) + vec3(1e-4));
    vec3 sFlat = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
    float rAz = max(dot(rFlat, sFlat), 0.0);
    skyRef = mix(skyRef, uSunColor, pow(rAz, 8.0) * 0.55);

    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
    vec3 col = mix(base, skyRef, 0.28 + 0.24 * fres);

    // riak halus untuk kilau yang hidup
    float d1 = sin(vWorld.x * 3.1 + uTime * 1.9) * cos(vWorld.z * 2.7 - uTime * 1.4);
    float d2 = sin((vWorld.x + vWorld.z) * 4.3 - uTime * 2.3);
    N = normalize(N + vec3(d1 * 0.06, 0.0, d2 * 0.06));

    // kilau matahari
    vec3 H = normalize(uSunDir + V);
    col += uSunColor * pow(max(dot(N, H), 0.0), 150.0) * 1.7;

    // jalur cahaya matahari di permukaan laut
    vec3 flatDir = normalize(vec3(vWorld.x, 0.0, vWorld.z) + vec3(1e-4));
    float az = max(dot(flatDir, sFlat), 0.0);
    col += uSunColor * pow(az, 60.0) * 0.22;

    // buih di garis pantai
    float ring = (1.0 - smoothstep(23.0, 27.5, dist)) * smoothstep(19.5, 22.5, dist);
    float wob = 0.55 + 0.45 * sin(dist * 2.0 - uTime * 1.4 + sin(atan(vWorld.z, vWorld.x) * 7.0) * 1.7);
    col = mix(col, vec3(1.0, 0.96, 0.9), ring * wob * 0.34);

    // kabut horizon
    float fogF = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
    col = mix(col, uFog, fogF * 0.92);

    gl_FragColor = vec4(pow(aces(col), vec3(1.0 / 2.2)), 1.0);
  }
`

export default function Ocean({ quality = 'high' }) {
  const mat = useRef()
  const seg = QUALITY[quality]?.waterSeg ?? 120

  const uniforms = useMemo(
    () => ({
      uDeep: { value: LIN.waterDeep.clone() },
      uShallow: { value: LIN.waterShallow.clone() },
      uSunDir: { value: SUN_DIR.clone() },
      uSunColor: { value: LIN.sun.clone() },
      uHorizon: { value: LIN.skyHorizon.clone() },
      uFog: { value: LIN.fog.clone() },
      uTime: { value: 0 },
      uFogNear: { value: 85 },
      uFogFar: { value: 420 },
    }),
    []
  )

  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} frustumCulled={false} receiveShadow={false}>
      <planeGeometry args={[900, 900, seg, seg]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        toneMapped={false}
      />
    </mesh>
  )
}
