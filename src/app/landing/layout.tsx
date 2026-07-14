import type { Metadata } from 'next';
import '../landing.css';

export const metadata: Metadata = {
  title: 'XyroTrade — AI Trading Signals',
  description: 'Institutional-grade AI signals. 12-gate validation. One platform.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className="lp">{children}</div>;
}
