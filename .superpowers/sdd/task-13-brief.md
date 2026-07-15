## Task 13: MosqueScene + GeometricPattern3D + LanternGlow

**Files:**
- Create: `src/components/three/MosqueScene.tsx`
- Create: `src/components/three/GeometricPattern3D.tsx`
- Create: `src/components/three/LanternGlow.tsx`

- [ ] **Step 1: Create MosqueScene**

```tsx
// src/components/three/MosqueScene.tsx
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
```

- [ ] **Step 2: Create GeometricPattern3D**

```tsx
// src/components/three/GeometricPattern3D.tsx
"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { hasWebGL, GOLD_PALETTE, TEAL_PALETTE } from "@/lib/three/utils"

function StarShape({ radius = 2 }: { radius?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const shape = useMemo(() => {
    const s = new THREE.Shape()
    const points = 8
    const outerR = radius
    const innerR = radius * 0.4
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 === 0 ? outerR : innerR
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    }
    s.closePath()
    return s
  }, [radius])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.2
    }
  })

  return (
    <mesh ref={meshRef}>
      <extrudeGeometry args={[shape, { depth: 0.3, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05 }]} />
      <meshStandardMaterial
        color={GOLD_PALETTE.main}
        metalness={0.7}
        roughness={0.2}
        emissive={GOLD_PALETTE.emissive}
        emissiveIntensity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function RotatingRing() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.x += delta * 0.3
  })
  return (
    <mesh ref={ref} rotation={[Math.PI / 3, 0, 0]}>
      <ringGeometry args={[2.5, 2.8, 64]} />
      <meshBasicMaterial color={TEAL_PALETTE.main} transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function GeometricPattern3D({ className }: { className?: string }) {
  if (!hasWebGL()) return null

  return (
    <div className={className} aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[2, 3, 4]} intensity={0.5} />
        <StarShape />
        <RotatingRing />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 3: Create LanternGlow**

```tsx
// src/components/three/LanternGlow.tsx
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
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Clean build

---

