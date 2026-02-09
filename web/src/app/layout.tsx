import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CommandPalette } from "@/components/command-palette";
import { BackToTop } from "@/components/back-to-top";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: false, // Only preload primary font
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Critical resource preloads for LCP optimization */}
        <link rel="preload" href="/_next/static/css/d0d2296772cf30ab.css" as="style" />
        <link rel="preload" as="font" href="/fonts/geist-sans.woff2" type="font/woff2" crossOrigin="anonymous" />
        
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fcizsxlgckwjnuhlqhwc.supabase.co" />
        
        {/* DNS prefetch for other resources */}
        <link rel="dns-prefetch" href="https://fullcourtvision.vercel.app" />
        <link rel="dns-prefetch" href="https://vercel.com" />
        
        {/* Module preload for critical JavaScript */}
        <link rel="modulepreload" href="/_next/static/chunks/main-app.js" />
        
        {/* Prevent layout shift with early style injection */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html { font-family: system-ui, sans-serif; }
            body { margin: 0; }
            .lcp-text { 
              font-size: 1.125rem; 
              line-height: 1.75rem; 
              color: rgb(100 116 139); 
              margin-bottom: 2rem; 
              max-width: 42rem;
            }
          `
        }} />
        
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
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
          >
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content" className="min-h-[calc(100vh-64px)]" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <CommandPalette />
          <BackToTop />
        </ThemeProvider>
      </body>
    </html>
  );
}
