"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, randomPosition, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

const seededRandom = () => {
  let seed = 42
  return () => {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed - 1) / 2147483646
  }
}

function Particles({ count = 100 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const rand = seededRandom()
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const gold = new THREE.Color(GOLD_PALETTE.main)
    const teal = new THREE.Color(TEAL_PALETTE.main)

    for (let i = 0; i < count; i++) {
      const r = rand()
      const [x, y, z] = randomPosition(8)
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      const c = gold.clone().lerp(teal, r)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return [pos, col]
  }, [count])

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

export function StarParticles({ className, count = 100 }: { className?: string; count?: number }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 10], fov: 60 }}>
        <Particles count={count} />
      </Canvas>
    </div>
  )
}
