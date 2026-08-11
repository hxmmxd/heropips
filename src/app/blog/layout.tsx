import type { Metadata } from 'next';
import '../landing.css';
import LenisProvider from '../landing/LenisProvider';
import { Navbar } from '../landing/Navbar';
import { Footer } from '../landing/Footer';

export const metadata: Metadata = {
  title: 'Blog | HeroPips',
  description: 'Deep dives into market structure, AI trading, and institutional-grade strategies.',
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
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
