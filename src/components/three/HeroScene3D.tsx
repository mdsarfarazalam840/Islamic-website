'use client'

import { useEffect, useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sparkles, Preload, Environment } from '@react-three/drei'
import { KaabaModelGroup } from './KaabaMesh'

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#f0e6cf', '#1a1508', 0.4]} />
      <pointLight position={[4, 6, 4]} intensity={1.6} color="#e8d4a0" castShadow />
      <pointLight position={[-5, -2, -4]} intensity={0.4} color="#2dd4bf" />
      <pointLight position={[0, 5, 0]} intensity={0.7} color="#c8a45c" />
      <spotLight position={[0, 8, 2]} angle={0.5} penumbra={0.8} intensity={0.6} color="#fff4d6" />
      <KaabaModelGroup />
      <Sparkles count={40} scale={7} size={0.4} speed={0.18} color="#e8d4a0" opacity={0.4} />
      <Environment preset="night" />
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
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ position: [3.8, 2.2, 5.5], fov: 46 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
