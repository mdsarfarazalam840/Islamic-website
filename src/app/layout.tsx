import type { Metadata } from "next"
import { Inter, Playfair_Display, Noto_Naskh_Arabic } from "next/font/google"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { MobileNav } from "@/components/layout/MobileNav"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
})

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
})

export const metadata: Metadata = {
  title: "Noor — Quran & Hadith",
  description:
    "Read the Holy Quran with translations in English, Hindi, and Urdu. Explore authentic Hadith collections and Islamic video library.",
  icons: { icon: "/images/icons/favicon.svg" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Noor — Quran & Hadith",
    url: "https://quran-website.pages.dev",
    description:
      "Read the Holy Quran with translations in English, Hindi, and Urdu. Explore authentic Hadith collections and Islamic video library.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://quran-website.pages.dev/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${notoNaskhArabic.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a1628" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f0ede5" media="(prefers-color-scheme: light)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Noor" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-dvh flex flex-col bg-background text-foreground antialiased" suppressHydrationWarning>
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-secondary focus:text-background focus:rounded-lg focus:font-medium focus:outline-none"
          >
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content" className="flex-1 pt-16 pb-16 md:pb-0" role="main">
            {children}
          </main>
          <Footer />
          <MobileNav />
        </Providers>
      </body>
    </html>
  )
}
