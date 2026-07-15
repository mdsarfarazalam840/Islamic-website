"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { hasWebGL } from "@/lib/three/utils"

interface Scene3DProps {
  children: React.ReactNode
  className?: string
  cameraPosition?: [number, number, number]
  fov?: number
  dpr?: [number, number]
}

export function Scene3D({
  children,
  className,
  cameraPosition = [0, 0, 5],
  fov = 50,
  dpr = [1, 1.5],
}: Scene3DProps) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={dpr} camera={{ position: cameraPosition, fov }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.5} />
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  )
}
