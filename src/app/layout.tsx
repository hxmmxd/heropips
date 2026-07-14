import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { SignalProvider } from '@/contexts/SignalContext';

// Client wrapper for providers (layout.tsx is a server component)
function SignalProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SignalProvider>{children}</SignalProvider>;
}

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'XyroTrade | AI-Powered Trading Signals',
  description: 'Automated AI Trading Terminal & MetaTrader 5 Node Infrastructure Dashboard.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon-icon.png', type: 'image/png' },
    ],
    shortcut: '/favicon-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'XyroTrade',
  },
};


export const viewport: Viewport = {
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
    <html
      lang="en"
      className={`${ibmPlexSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning><SignalProviderWrapper>{children}</SignalProviderWrapper></body>
    </html>
  );
}
