import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Instrument_Sans, JetBrains_Mono, Inter } from 'next/font/google';
import './globals.css';
import '../components/ReferralHub.css';
import '../components/terminal/TerminalTab.css';
import '../components/manager/Manager.css';
import { SignalProvider } from '@/contexts/SignalContext';
import { cn } from "@/lib/utils";

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans' });


// Client wrapper for providers (layout.tsx is a server component)
function SignalProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SignalProvider>{children}</SignalProvider>;
}

const fontDisplay = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const fontBody = Instrument_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const fontMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'HeroPips | AI-Powered Trading Signals',
  description: 'Automated AI Trading Terminal & MetaTrader 5 Node Infrastructure Dashboard.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HeroPips',
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
      className={cn("h-full", "antialiased", fontDisplay.variable, fontBody.variable, fontMono.variable, "font-sans", fontSans.variable)}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body" suppressHydrationWarning><SignalProviderWrapper>{children}</SignalProviderWrapper></body>
    </html>
  );
}
