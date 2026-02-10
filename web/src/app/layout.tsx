import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Use optimized navbar for better LCP
import { NavbarOptimized as Navbar } from "@/components/navbar-optimized";
// Lazy load non-critical layout components
import dynamic from "next/dynamic";

const Footer = dynamic(() => import("@/components/footer").then(m => ({ default: m.Footer })), {
  loading: () => <div className="h-20 bg-background" />,
});

const CommandPalette = dynamic(() => import("@/components/command-palette").then(m => ({ default: m.CommandPalette })), {
  loading: () => null,
});

const BackToTop = dynamic(() => import("@/components/back-to-top").then(m => ({ default: m.BackToTop })), {
  loading: () => null,
});
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  adjustFontFallback: false, // Better fallback handling
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: false, // Only preload primary font
  adjustFontFallback: false,
  fallback: ['Consolas', 'Monaco', 'monospace'],
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
        <link rel="preload" as="font" href="/_next/static/media/geist-sans.woff2" type="font/woff2" crossOrigin="anonymous" />
        
        {/* Preconnect to critical domains only - moved Supabase to dns-prefetch for better LCP */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for non-critical resources */}
        <link rel="dns-prefetch" href="https://fcizsxlgckwjnuhlqhwc.supabase.co" />
        <link rel="dns-prefetch" href="https://fullcourtvision.vercel.app" />
        <link rel="dns-prefetch" href="https://vercel.com" />
        
        {/* Early hints for critical resources */}
        <link rel="modulepreload" href="/_next/static/chunks/main.js" />
        
        {/* Critical styles for LCP - enhanced for better performance */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html { 
              font-family: system-ui, -apple-system, sans-serif; 
              font-display: swap;
            }
            body { 
              margin: 0; 
              line-height: 1.5;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .hero-heading { 
              font-size: clamp(2.25rem, 5vw, 3.75rem); 
              font-weight: 700; 
              letter-spacing: -0.025em; 
              margin-bottom: 1.5rem; 
              line-height: 1.1;
              contain: layout style;
            }
            .lcp-text { 
              font-size: 1.125rem; 
              line-height: 1.75rem; 
              color: rgb(100 116 139); 
              margin-bottom: 2rem; 
              max-width: 42rem;
              contain: layout style;
            }
            @media (min-width: 768px) { 
              .hero-heading { font-size: clamp(3.75rem, 8vw, 6rem); }
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
