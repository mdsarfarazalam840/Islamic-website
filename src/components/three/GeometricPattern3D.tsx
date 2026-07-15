"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

function StarShape({ radius = 2 }: { radius?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const shape = useMemo(() => {
    const s = new THREE.Shape()
    const points = 8
    const outerR = radius
    const innerR = radius * 0.4
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 === 0 ? outerR : innerR
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    }
    s.closePath()
    return s
  }, [radius])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.2
    }
  })

  return (
    <mesh ref={meshRef}>
      <extrudeGeometry args={[shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 }]} />
      <meshStandardMaterial
        color={GOLD_PALETTE.main}
        metalness={0.7}
        roughness={0.2}
        emissive={GOLD_PALETTE.emissive}
        emissiveIntensity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function RotatingRing() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.x += delta * 0.3
  })
  return (
    <mesh ref={ref} rotation={[Math.PI / 3, 0, 0]}>
      <ringGeometry args={[2.5, 2.8, 64]} />
      <meshBasicMaterial color={TEAL_PALETTE.main} transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function GeometricPattern3D({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[2, 3, 4]} intensity={0.5} />
        <StarShape />
        <RotatingRing />
      </Canvas>
    </div>
  )
}
