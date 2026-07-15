"use client"

import dynamic from "next/dynamic"

const HeroScene3D = dynamic(
  () => import("@/components/three/HeroScene3D").then((mod) => mod.HeroScene3D),
  {
    ssr: false,
    loading: () => <div className="geometric-bg absolute inset-0" />,
  },
)

export function DynamicHero() {
  return <HeroScene3D />
}
