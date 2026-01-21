import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./mobile.css";
import { Providers } from "@/components/providers/Providers";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'TruthVote - Public Opinion Platform',
  description: 'Vote on anything. Public opinion, tracked over time.',
  keywords: ['voting', 'polls', 'public opinion', 'community', 'surveys', 'trends', 'tracking'],
  authors: [{ name: 'TruthVote' }],
  openGraph: {
    title: 'TruthVote - Public Opinion Platform',
    description: 'Vote on anything. Public opinion, tracked over time.',
    type: 'website',
    url: 'https://project-cebe8bab-ec36-4869-931.web.app',
    siteName: 'TruthVote',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TruthVote - Community Predictions Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TruthVote - Public Opinion Platform',
    description: 'Vote on anything. Public opinion, tracked over time.',
    images: ['/og-image.png'],
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#082a5c',
  icons: {
    icon: [
      { url: '/assets/tv_logo_icon_transparent.png', sizes: 'any' },
      { url: '/assets/tv_logo_icon_transparent.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/tv_logo_icon_transparent.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/assets/tv_logo_icon_transparent.png',
    shortcut: '/assets/tv_logo_icon_transparent.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark:bg-[#0f1419]">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ErrorBoundary>
          <Providers>
            {children}
            <MobileBottomNav />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
