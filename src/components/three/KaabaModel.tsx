"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, Sparkles } from "@react-three/drei"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

function Kaaba() {
  const meshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15
    }
    if (edgesRef.current) {
      edgesRef.current.rotation.y += delta * 0.15
    }
  })

  return (
    <Float speed={0.5} rotationIntensity={0.05} floatIntensity={0.1}>
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2.5, 2]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.3}
          emissive={GOLD_PALETTE.emissive}
          emissiveIntensity={0.1}
        />
      </mesh>
      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(2, 2.5, 2)]} />
        <lineBasicMaterial color={GOLD_PALETTE.main} linewidth={2} />
      </lineSegments>
      <Sparkles count={20} scale={3} size={0.5} speed={0.3} color={GOLD_PALETTE.light} />
    </Float>
  )
}

export function KaabaModel({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color={GOLD_PALETTE.light} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} color={TEAL_PALETTE.main} />
        <Kaaba />
      </Canvas>
    </div>
  )
}
