import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./mobile.css";
import { Providers } from "@/components/providers/Providers";
import { ErrorBoundary } from '@/components/ErrorBoundary';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'TruthVote - Community Predictions Platform',
  description: 'Vote on predictions, earn points, and compete with the community. Make your predictions on politics, sports, technology, and more.',
  keywords: ['predictions', 'voting', 'community', 'leaderboard', 'gamification', 'polls', 'forecasting'],
  authors: [{ name: 'TruthVote' }],
  openGraph: {
    title: 'TruthVote - Community Predictions Platform',
    description: 'Vote on predictions, earn points, and compete with the community.',
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
    title: 'TruthVote - Community Predictions Platform',
    description: 'Vote on predictions, earn points, and compete with the community.',
    images: ['/og-image.png'],
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#00649c',
  icons: {
    icon: '/assets/truthvote_logo.png',
    apple: '/assets/truthvote_logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
