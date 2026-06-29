import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'XyroTrade — AI-Powered Trading Signals',
  description:
    'Institutional-grade AI analysis, 12-gate confluence signals, and one-click MT5 execution. Switch to AI-powered asset trading.',
  openGraph: {
    title: 'XyroTrade — AI-Powered Trading Signals',
    description:
      'Institutional-grade AI analysis, 12-gate confluence signals, and one-click MT5 execution.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="landing-root">{children}</div>;
}
