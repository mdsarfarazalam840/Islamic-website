## Task 14: Scene3D + Loading3D + Integrate 3D Components

**Files:**
- Create: `src/components/three/Scene3D.tsx`
- Create: `src/components/three/Loading3D.tsx`

- [ ] **Step 1: Create Scene3D (orchestrator component)**

```tsx
// src/components/three/Scene3D.tsx
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
```

- [ ] **Step 2: Create Loading3D**

```tsx
// src/components/three/Loading3D.tsx
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
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

