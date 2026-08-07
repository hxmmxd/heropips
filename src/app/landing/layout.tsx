import type { Metadata } from 'next';
import '../landing.css';
import LenisProvider from './LenisProvider';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const metadata: Metadata = {
  title: 'HeroPips — AI Trading Signals',
  description: 'Institutional-grade AI signals. 12-gate validation. One platform.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp">
      <LenisProvider>
        <Navbar />
        {children}
        <Footer />
      </LenisProvider>
    </div>
  );
}
