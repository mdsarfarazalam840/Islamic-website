"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import { Float } from "@react-three/drei"
import * as THREE from "three"

// ── Real Kaaba proportions (approx): ~12m x 11m base, ~13.1m tall.
// Scaled model units — width(x) 2.0, depth(z) 2.2, height(y) 2.35
const W = 2.0
const D = 2.2
const H = 2.35
const HALF_H = H / 2

// Pre-allocated for useFrame (never allocate per frame)
const _dummy = new THREE.Object3D()

// ── Gold Hizam calligraphy band texture (canvas) ───────────────
function makeHizamTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas")
  c.width = 1024
  c.height = 128
  const ctx = c.getContext("2d")!
  // Gold cloth ground (the Hizam is a gold band). A vertical gradient
  // gives the woven thread some depth. NOTE: the mesh material samples
  // this map with color=#fff so these colours render true, not multiplied
  // down to black.
  const grad = ctx.createLinearGradient(0, 0, 0, c.height)
  grad.addColorStop(0, "#b8912f")
  grad.addColorStop(0.5, "#e6c66e")
  grad.addColorStop(1, "#a67c22")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, c.width, c.height)
  // top & bottom darker rules that frame the band
  ctx.fillStyle = "#6b4e18"
  ctx.fillRect(0, 6, c.width, 3)
  ctx.fillRect(0, c.height - 9, c.width, 3)
  // embroidered calligraphy (Shahada) repeated — dark thread on gold
  ctx.fillStyle = "#2b1d05"
  ctx.font = "bold 58px 'Noto Naskh Arabic', 'Amiri', serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const phrase = "لَا إِلَٰهَ إِلَّا ٱللَّٰه"
  for (let i = 0; i < 4; i++) {
    ctx.fillText(phrase, (c.width / 4) * (i + 0.5), c.height / 2 + 4)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.repeat.set(3, 1)
  tex.anisotropy = 8
  return tex
}

// ── Kiswah cloth texture: near-black woven with faint gold verse ─
function makeKiswaTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas")
  c.width = 512
  c.height = 512
  const ctx = c.getContext("2d")!
  ctx.fillStyle = "#050505"
  ctx.fillRect(0, 0, c.width, c.height)
  // faint diagonal weave
  ctx.strokeStyle = "rgba(60,50,25,0.15)"
  ctx.lineWidth = 1
  for (let i = -c.height; i < c.width; i += 10) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + c.height, c.height)
    ctx.stroke()
  }
  // faint woven gold script motif
  ctx.fillStyle = "rgba(160,130,60,0.06)"
  ctx.font = "40px 'Noto Naskh Arabic', serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  for (let y = 60; y < c.height; y += 130) {
    for (let x = 90; x < c.width; x += 200) {
      ctx.fillText("ﷲ", x, y)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 2)
  return tex
}

// ── The Kaaba structure ────────────────────────────────────────
export function KaabaStructure() {
  const hizamTex = useMemo(() => makeHizamTexture(), [])
  const kiswaTex = useMemo(() => makeKiswaTexture(), [])
  const clothRef = useRef<THREE.MeshStandardMaterial>(null)

  useEffect(() => {
    return () => {
      hizamTex.dispose()
      kiswaTex.dispose()
    }
  }, [hizamTex, kiswaTex])

  // gentle breathing sheen on the gold band
  const bandRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (bandRef.current) {
      bandRef.current.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 0.6) * 0.15
    }
  })

  const bandY = HALF_H - 0.55 // Hizam sits in upper third

  return (
    <group>
      {/* Kiswah — the black cloth body */}
      <mesh castShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          ref={clothRef}
          map={kiswaTex}
          color="#ffffff"
          metalness={0.15}
          roughness={0.85}
          emissive="#140d02"
          emissiveIntensity={0.06}
        />
      </mesh>

      {/* Hizam — gold calligraphy band (slightly proud of the cloth) */}
      <mesh position={[0, bandY, 0]}>
        <boxGeometry args={[W + 0.02, 0.34, D + 0.02]} />
        <meshStandardMaterial
          ref={bandRef}
          map={hizamTex}
          color="#ffffff"
          metalness={0.85}
          roughness={0.25}
          emissive="#8a6a24"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Corner vertical gold seams */}
      {([[W / 2, D / 2], [-W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]] as const).map(
        ([x, z], i) => (
          <mesh key={i} position={[x, 0, z]}>
            <boxGeometry args={[0.03, H, 0.03]} />
            <meshStandardMaterial
              color="#e8d4a0"
              metalness={0.9}
              roughness={0.15}
              emissive="#8a6a24"
              emissiveIntensity={0.25}
            />
          </mesh>
        ),
      )}

      {/* Gold door on the front (+z) face, raised above ground */}
      <group position={[0.15, -0.15, D / 2 + 0.015]}>
        <mesh>
          <boxGeometry args={[0.62, 1.5, 0.04]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={1}
            roughness={0.08}
            emissive="#b8922e"
            emissiveIntensity={0.4}
          />
        </mesh>
        {/* door inner frame */}
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[0.48, 1.34, 0.02]} />
          <meshStandardMaterial color="#8b6d30" metalness={1} roughness={0.2} />
        </mesh>
      </group>

      {/* Hajar al-Aswad — black stone in silver frame, eastern corner (+x,+z) */}
      <mesh position={[W / 2 - 0.02, -HALF_H + 0.7, D / 2 - 0.02]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.08, 6]} />
        <meshStandardMaterial color="#c0c0c8" metalness={1} roughness={0.25} emissive="#3a3a44" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[W / 2 + 0.01, -HALF_H + 0.7, D / 2 + 0.01]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.11, 6]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Mizab al-Rahmah — gold rain spout on the roof (-x side) */}
      <mesh position={[-W / 2 - 0.12, HALF_H - 0.02, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.35, 0.09, 0.22]} />
        <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.1} emissive="#b8922e" emissiveIntensity={0.35} />
      </mesh>

      {/* Roof cap */}
      <mesh position={[0, HALF_H + 0.015, 0]}>
        <boxGeometry args={[W + 0.04, 0.05, D + 0.04]} />
        <meshStandardMaterial color="#050505" metalness={0.2} roughness={0.9} />
      </mesh>

      {/* Shadharwan — marble base skirt */}
      <mesh position={[0, -HALF_H + 0.12, 0]}>
        <boxGeometry args={[W + 0.22, 0.24, D + 0.22]} />
        <meshStandardMaterial color="#d8cdb4" metalness={0.1} roughness={0.55} />
      </mesh>

      {/* Mataf — polished marble floor */}
      <mesh position={[0, -HALF_H - 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[3.6, 3.6, 0.08, 72]} />
        <meshStandardMaterial color="#efe9dc" metalness={0.05} roughness={0.35} />
      </mesh>
    </group>
  )
}

// ── Tawaf ring: instanced pilgrims circling the Kaaba ───────────
export function TawafRing({ count = 60 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        a: (i / count) * Math.PI * 2,
        r: 2.7 + (i % 5) * 0.16,
        s: 0.05 + ((i * 37) % 10) * 0.004,
      })),
    [count],
  )

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * 0.28
    for (let i = 0; i < count; i++) {
      const { a, r, s } = seeds[i]
      const ang = a + t
      _dummy.position.set(Math.cos(ang) * r, -HALF_H + 0.16, Math.sin(ang) * r)
      _dummy.scale.setScalar(s)
      _dummy.updateMatrix()
      ref.current.setMatrixAt(i, _dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 5]} />
      <meshStandardMaterial color="#f0e6cf" emissive="#c8a45c" emissiveIntensity={0.3} roughness={0.6} />
    </instancedMesh>
  )
}

// ── Full animated Kaaba group (rotating + floating) ─────────────
export function KaabaModelGroup() {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.1
  })
  return (
    <Float speed={0.35} rotationIntensity={0.02} floatIntensity={0.06}>
      <group ref={groupRef}>
        <KaabaStructure />
        <TawafRing />
      </group>
    </Float>
  )
}

export { W, D, H, HALF_H, makeHizamTexture, makeKiswaTexture, _dummy }
