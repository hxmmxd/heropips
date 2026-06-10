import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SignalProvider } from '@/contexts/SignalContext';

// Client wrapper for providers (layout.tsx is a server component)
function SignalProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SignalProvider>{children}</SignalProvider>;
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TradeGPT | Institutional AI',
  description: 'Automated AI Trading Terminal & MetaTrader 5 Node Infrastructure Dashboard.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TradeGPT',
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
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning><SignalProviderWrapper>{children}</SignalProviderWrapper></body>
    </html>
  );
}
