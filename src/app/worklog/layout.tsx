import type { Metadata } from 'next';
import './changelog.css';

export const metadata: Metadata = {
  title: 'Work Log | TradeGPT',
  description: 'Internal team updates — daily progress, features shipped, and development milestones.',
};

export default function WorkLogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
