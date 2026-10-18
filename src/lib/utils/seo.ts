import type { Metadata } from "next"
import { siteConfig } from "@/config/site"

interface SeoProps {
  title: string
  description?: string
  path?: string
  image?: string
}

export function generateMetadata({
  title,
  description,
  path = "",
  image,
}: SeoProps): Metadata {
  const url = `${siteConfig.url}${path}`
  const ogImage = image || siteConfig.ogImage

  return {
    title: `${title} | ${siteConfig.name}`,
    description: description || siteConfig.description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description: description || siteConfig.description,
      url,
      siteName: siteConfig.name,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description: description || siteConfig.description,
      images: [ogImage],
    },
    alternates: { canonical: url },
  }
}

/** Serialize JSON-LD without allowing data to terminate the script element. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}
