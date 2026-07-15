"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float } from "@react-three/drei"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

function Mosque() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {/* Dome */}
      <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.15}>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={GOLD_PALETTE.main} metalness={0.6} roughness={0.2} />
        </mesh>
      </Float>
      {/* Base */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[3.5, 0.5, 3.5]} />
        <meshStandardMaterial color="#2a2a4a" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Minarets */}
      {[-2.2, 2.2].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.2, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 2.4, 8]} />
            <meshStandardMaterial color="#3a3a5a" metalness={0.3} roughness={0.5} />
          </mesh>
          <mesh position={[x, 2.5, 0]}>
            <coneGeometry args={[0.25, 0.3, 8]} />
            <meshStandardMaterial color={GOLD_PALETTE.main} metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Archways */}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x, -0.2, 1.76]}>
          <torusGeometry args={[0.4, 0.08, 8, 16, Math.PI]} />
          <meshStandardMaterial color={GOLD_PALETTE.light} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      {/* Ambient glow */}
      <pointLight position={[0, 2, 0]} intensity={0.5} color={GOLD_PALETTE.light} />
    </group>
  )
}

export function MosqueScene({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1, 5], fov: 50 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[3, 4, 3]} intensity={0.6} color={TEAL_PALETTE.light} />
        <Mosque />
      </Canvas>
    </div>
  )
}
