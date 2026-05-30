import type { Metadata } from 'next';
import './changelog.css';

export const metadata: Metadata = {
  title: 'Changelog | TradeGPT',
  description: 'Every feature, fix, and improvement shipped in TradeGPT — documented and organized by version.',
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
