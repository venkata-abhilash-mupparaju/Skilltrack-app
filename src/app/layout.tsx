import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { InstallPromptBanner } from '@/components/pwa/InstallPromptBanner';
import { MobileNavBar } from '@/components/layout/MobileNavBar';

export const metadata: Metadata = {
  title: 'SkillTrack - Mobile PWA & Cloud Push Reminders',
  description:
    'Mobile-first habit and DSA tracker with server-triggered cloud notifications that work when your laptop is turned off.',
  applicationName: 'SkillTrack',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SkillTrack',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" translate="no">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Language" content="en" />
      </head>
      <body className="bg-surface-950 text-surface-50 min-h-screen flex flex-col font-sans antialiased selection:bg-primary-500 selection:text-white pb-20 md:pb-6">
        <ServiceWorkerRegister />
        <InstallPromptBanner />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {children}
        </main>
        <MobileNavBar />
      </body>
    </html>
  );
}
