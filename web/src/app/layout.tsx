import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fullcourtvision.vercel.app"),
  title: {
    default: "FullCourtVision — Basketball Victoria Analytics",
    template: "%s | FullCourtVision",
  },
  description: "Comprehensive basketball analytics covering 57,000+ players and 89,000+ games across Victoria, Australia. Player stats, team rankings, leaderboards and more.",
  keywords: ["basketball", "analytics", "Victoria", "Australia", "PlayHQ", "statistics", "Basketball Victoria", "player stats", "team rankings"],
  openGraph: {
    title: "FullCourtVision — Basketball Victoria Analytics",
    description: "Comprehensive basketball analytics covering 57,000+ players and 89,000+ games across Victoria, Australia.",
    type: "website",
    siteName: "FullCourtVision",
    locale: "en_AU",
    images: [
      {
        url: "/api/og?type=homepage",
        width: 1200,
        height: 630,
        alt: "FullCourtVision - Basketball Victoria Analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FullCourtVision — Basketball Victoria Analytics",
    description: "Comprehensive basketball analytics covering 57,000+ players and 89,000+ games across Victoria, Australia.",
    images: ["/api/og?type=homepage"],
  },
  alternates: {
    canonical: "https://fullcourtvision.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FCV" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#0f172a" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "FullCourtVision",
              url: "https://fullcourtvision.vercel.app",
              description:
                "Comprehensive basketball analytics covering 57,000+ players and 89,000+ games across Victoria, Australia.",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    "https://fullcourtvision.vercel.app/search?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsOrganization",
              name: "FullCourtVision",
              url: "https://fullcourtvision.vercel.app",
              sport: "Basketball",
              description:
                "Basketball Victoria analytics platform covering players, teams, and competitions.",
              areaServed: {
                "@type": "State",
                name: "Victoria",
                containedInPlace: {
                  "@type": "Country",
                  name: "Australia",
                },
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <Navbar />
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
