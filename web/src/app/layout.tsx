import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FullCourtVision — Basketball Victoria Analytics",
  description: "Comprehensive basketball analytics covering 57,000+ players and 89,000+ games across Victoria, Australia.",
  keywords: ["basketball", "analytics", "Victoria", "Australia", "PlayHQ", "statistics"],
  openGraph: {
    title: "FullCourtVision — Basketball Victoria Analytics",
    description: "Comprehensive basketball analytics covering 57,000+ players and 89,000+ games across Victoria, Australia.",
    type: "website",
    siteName: "FullCourtVision",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fullcourtvision.com'}/api/og?type=homepage`,
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
    images: [`${process.env.NEXT_PUBLIC_BASE_URL || 'https://fullcourtvision.com'}/api/og?type=homepage`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <Navbar />
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>
        <footer className="border-t border-border bg-card py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm">
            <p>FullCourtVision © 2025 — Basketball Victoria Analytics</p>
            <p className="mt-1">Data sourced from PlayHQ. Not affiliated with Basketball Victoria.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
