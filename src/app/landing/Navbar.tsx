'use client';

import { useState } from 'react';

export const NAV_DROPDOWNS = {
  Platform: [
    { icon: '⚡', title: 'AI Signal Engine', desc: '12-gate quantitative validation', href: '/landing/signal-engine' },
    { icon: '🛡', title: 'Risk Governor', desc: 'Auto position sizing & drawdown guard', href: '#' },
    { icon: '📊', title: 'Analytics Dashboard', desc: 'Full performance tracking & journal', href: '#' },
    { icon: '🤖', title: 'AI Chat Assistant', desc: 'Ask anything, get instant analysis', href: '#' },
  ],
  'For Traders': [
    { icon: '🎯', title: 'Prop Firm Traders', desc: 'Pass challenges with governed risk', href: '#' },
    { icon: '💼', title: 'Institutional', desc: 'White-label & API for firms & funds', href: '#' },
    { icon: '🔰', title: 'Beginners', desc: 'Start with guided, validated signals', href: '#' },
  ],
  Resources: [
    { icon: '📖', title: 'Documentation', desc: 'Guides, API refs & tutorials', href: '#' },
    { icon: '✍️', title: 'Blog', desc: 'Strategy breakdowns & market insights', href: '#' },
    { icon: '💬', title: 'Community', desc: 'Telegram & Discord trader groups', href: '#' },
  ],
};

function ChevronDown() {
  return (
    <svg className="lp-nav-chevron" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="lp-nav">
        <div className="lp-nav-inner">

          {/* Logo */}
          <a href="/landing" className="lp-nav-logo" aria-label="XyroTrade">
            <img
              src="/logos/xyrotrade-logo.png"
              alt="XyroTrade"
              className="lp-nav-logo-img"
            />
          </a>


          {/* Center links */}
          <div className="lp-nav-links">

            {/* Dropdown items */}
            {(Object.keys(NAV_DROPDOWNS) as Array<keyof typeof NAV_DROPDOWNS>).map((label) => (
              <div className="lp-nav-item" key={label}>
                <button className="lp-nav-link">
                  {label}
                  <ChevronDown />
                </button>
                <div className="lp-nav-dropdown">
                  {NAV_DROPDOWNS[label].map((item) => (
                    <a key={item.title} href={item.href || '#'} className="lp-nav-dropdown-item">
                      <div className="lp-nav-dd-icon">{item.icon}</div>
                      <div>
                        <div className="lp-nav-dd-title">{item.title}</div>
                        <div className="lp-nav-dd-desc">{item.desc}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}

            {/* Plain links */}
            <a href="#" className="lp-nav-link">Signals</a>
            <a href="#" className="lp-nav-link">Pricing</a>
            <a href="#" className="lp-nav-link">Brokers</a>

            {/* Orange badge pill */}
            <a href="#" className="lp-nav-badge">
              <span className="lp-nav-badge-dot" />
              Live Signals
            </a>
          </div>

          {/* Right actions */}
          <div className="lp-nav-actions">
            <a href="#" className="lp-nav-act-link">Contact sales</a>
            <div className="lp-nav-act-sep" />
            <a href="/login" className="lp-nav-act-link">Log in</a>
            <a href="/login" className="lp-nav-act-btn">Create account</a>
          </div>

          {/* Mobile-only: Create account (visible before hamburger on small screens) */}
          <div className="lp-nav-mobile-actions">
            <a href="/login" className="lp-nav-mob-btn">Create account</a>
          </div>

          {/* Hamburger */}
          <button
            className={`lp-nav-hamburger${mobileOpen ? ' open' : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>

        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`lp-nav-mobile${mobileOpen ? ' open' : ''}`}>
        <a href="/landing/signal-engine">Platform</a>
        <a href="#">For Traders</a>
        <a href="#">Resources</a>
        <a href="#">Signals</a>
        <a href="#">Pricing</a>
        <a href="#">Brokers</a>
        <div className="lp-nav-mobile-sep" />
        <a href="/login">Log in</a>
        <a href="/login" className="lp-nav-mobile-cta">Create account</a>
      </div>
    </>
  );
}
