'use client'

import { useRef, useMemo, useEffect, useState, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sparkles, Preload } from '@react-three/drei'
import * as THREE from 'three'

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

const DOT_COUNT = 6
const DOT_RADIUS = 1.5

function Rings() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.x += delta * 0.04
      groupRef.current.rotation.y += delta * 0.06
      groupRef.current.rotation.z += delta * 0.02
    }
  })

  const [ringConfigs, dotPositions] = useMemo(() => {
    const rings = [
      { args: [1.2, 1.4, 64] as const, rotation: [0, 0, 0], opacity: 0.2 },
      { args: [1.6, 1.7, 64] as const, rotation: [Math.PI / 3, 0.2, 0], opacity: 0.12 },
      { args: [0.8, 0.85, 48] as const, rotation: [-Math.PI / 4, 0.4, Math.PI / 6], opacity: 0.25 },
    ] as const
    const dots = Array.from({ length: DOT_COUNT }, (_, i) => {
      const angle = (i / DOT_COUNT) * Math.PI * 2
      return [Math.cos(angle) * DOT_RADIUS, Math.sin(angle) * DOT_RADIUS, 0] as const
    })
    return [rings, dots]
  }, [])

  return (
    <group ref={groupRef}>
      {ringConfigs.map((config, i) => (
        <mesh key={i} rotation={config.rotation}>
          <ringGeometry args={config.args} />
          <meshStandardMaterial
            color="#c8a45c"
            metalness={0}
            roughness={0.6}
            transparent
            opacity={config.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.1]}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial
          color="#c8a45c"
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>
      {dotPositions.map((pos, i) => (
        <mesh key={`dot-${i}`} position={pos}>
          <circleGeometry args={[0.02, 8]} />
          <meshBasicMaterial color="#c8a45c" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 3]} intensity={0.4} />
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <Rings />
      </Float>
      <Sparkles
        count={40}
        scale={6}
        size={0.015}
        speed={0.2}
        color="#c8a45c"
        opacity={0.3}
      />
      <Preload all />
    </>
  )
}

export function HeroScene3D() {
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="absolute inset-0 geometric-bg" />
  if (!hasWebGL()) return <div className="absolute inset-0 geometric-bg" />

  return (
    <div className="absolute inset-0">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
