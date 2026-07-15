"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE } from "@/lib/three/utils"

function Lantern() {
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
    if (lightRef.current) {
      lightRef.current.intensity = 0.6 + Math.sin(clock.elapsedTime * 1.5) * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      {/* Lantern body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 1.5, 12]} />
        <meshPhysicalMaterial
          color="#2a2a4a"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.7}
          emissive={GOLD_PALETTE.emissive}
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 0.9, 0]}>
        <coneGeometry args={[0.5, 0.3, 12]} />
        <meshStandardMaterial color={GOLD_PALETTE.main} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Bottom base */}
      <mesh position={[0, -0.85, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.15, 12]} />
        <meshStandardMaterial color={GOLD_PALETTE.main} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Ring handle */}
      <mesh position={[0, 1.15, 0]}>
        <torusGeometry args={[0.25, 0.04, 8, 16]} />
        <meshStandardMaterial color={GOLD_PALETTE.light} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Glow light */}
      <pointLight ref={lightRef} position={[0, 0, 0]} intensity={0.8} color={GOLD_PALETTE.light} distance={4} />
      {/* Decorative dots */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.55, Math.sin(i) * 0.3 - 0.2, Math.sin(angle) * 0.55]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={GOLD_PALETTE.light} emissive={GOLD_PALETTE.light} emissiveIntensity={1} />
          </mesh>
        )
      })}
    </group>
  )
}

export function LanternGlow({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 3.5], fov: 40 }}>
        <ambientLight intensity={0.1} />
        <Lantern />
      </Canvas>
    </div>
  )
}
