## Task 12: 3D Utils + KaabaModel + StarParticles

**Files:**
- Create: `src/lib/three/utils.ts`
- Create: `src/components/three/KaabaModel.tsx`
- Create: `src/components/three/StarParticles.tsx`

- [ ] **Step 1: Create 3D utilities**

```tsx
// src/lib/three/utils.ts
export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    return !!(canvas.getContext("webgl") || canvas.getContext("webgl2"))
  } catch {
    return false
  }
}

export function randomPosition(range = 5): [number, number, number] {
  return [
    (Math.random() - 0.5) * range * 2,
    (Math.random() - 0.5) * range * 2,
    (Math.random() - 0.5) * range * 2,
  ]
}

export const GOLD_PALETTE = {
  main: "#c8a45c",
  light: "#e8d4a0",
  dark: "#8b6d30",
  emissive: "#4a3a1a",
}

export const TEAL_PALETTE = {
  main: "#2dd4bf",
  light: "#5eead4",
  dark: "#0f766e",
  emissive: "#134e4a",
}
```

- [ ] **Step 2: Create KaabaModel**

```tsx
// src/components/three/KaabaModel.tsx
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
```

- [ ] **Step 3: Create StarParticles**

```tsx
// src/components/three/StarParticles.tsx
"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, randomPosition, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

function Particles({ count = 100 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const gold = new THREE.Color(GOLD_PALETTE.main)
    const teal = new THREE.Color(TEAL_PALETTE.main)

    for (let i = 0; i < count; i++) {
      const [x, y, z] = randomPosition(8)
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      const c = gold.clone().lerp(teal, Math.random())
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return [pos, col]
  }, [count])

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

export function StarParticles({ className, count = 100 }: { className?: string; count?: number }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 10], fov: 60 }}>
        <Particles count={count} />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

