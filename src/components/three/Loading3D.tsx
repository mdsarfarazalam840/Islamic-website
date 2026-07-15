"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE } from "@/lib/three/utils"

function IcosahedronSpinner() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 1.5
      meshRef.current.rotation.y += delta * 2
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.05
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.2, 0]} />
      <meshStandardMaterial
        color={GOLD_PALETTE.main}
        metalness={0.6}
        roughness={0.2}
        wireframe
        emissive={GOLD_PALETTE.emissive}
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

export function Loading3D({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4], fov: 40 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[3, 3, 3]} intensity={0.8} color={GOLD_PALETTE.light} />
        <IcosahedronSpinner />
      </Canvas>
    </div>
  )
}
