import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { Open_Sans } from "next/font/google"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
  weight: ["400", "600", "700", "900"],
})

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Arcent - Celebrate Every Win | Achievement Tracking App",
  description:
    "Track and celebrate your personal achievements with Arcent. Build positive momentum, document your wins, and develop a habit of celebrating success. Download for Android.",
  keywords:
    "achievement tracking, personal development, goal tracking, motivation app, celebrate wins, android app, productivity, self improvement",
  authors: [{ name: "Arcent Team" }],
  creator: "Mohamed Ahmed Magdy Ahmed (Latebrix)",
  publisher: "Arcent Team",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://arcent.tech"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Arcent - Celebrate Every Win",
    description:
      "Track and celebrate your personal achievements with Arcent. Build positive momentum and develop a habit of celebrating success.",
    url: "https://arcent.tech",
    siteName: "Arcent",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Arcent - Celebrate Every Win",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arcent - Celebrate Every Win",
    description:
      "Track and celebrate your personal achievements with Arcent. Build positive momentum and develop a habit of celebrating success.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <head>
        <script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
        <noscript>
          <img
            src="https://queue.simpleanalyticscdn.com/noscript.gif"
            alt=""
            referrerPolicy="no-referrer-when-downgrade"
          />
        </noscript>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Arcent",
              description:
                "Track and celebrate your personal achievements with Arcent. Build positive momentum and develop a habit of celebrating success.",
              applicationCategory: "ProductivityApplication",
              operatingSystem: "Android",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Person",
                name: "Mohamed Ahmed Magdy Ahmed",
              },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
