"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { Preload, Environment } from "@react-three/drei"
import { hasWebGL, GOLD_PALETTE } from "@/lib/three/utils"
import { KaabaModelGroup } from "./KaabaMesh"

export function KaabaModel({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ position: [3.6, 2, 5.4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <hemisphereLight args={["#f0e6cf", "#1a1508", 0.4]} />
          <pointLight position={[4, 6, 4]} intensity={1.4} color={GOLD_PALETTE.light} castShadow />
          <pointLight position={[-5, -2, -4]} intensity={0.4} color="#2dd4bf" />
          <pointLight position={[0, 5, 0]} intensity={0.6} color={GOLD_PALETTE.main} />
          <KaabaModelGroup />
          <Environment preset="night" />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  )
}
