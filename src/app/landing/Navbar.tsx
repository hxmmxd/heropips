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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileActiveDropdown, setMobileActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (label: string) => {
    setActiveDropdown(activeDropdown === label ? null : label);
  };

  const closeAllMenus = () => {
    setActiveDropdown(null);
    setMobileOpen(false);
    setMobileActiveDropdown(null);
  };

  return (
    <>
      {activeDropdown && (
        <div 
          className="lp-nav-backdrop" 
          onClick={() => setActiveDropdown(null)} 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 190,
            background: 'transparent'
          }}
        />
      )}

      <nav className="lp-nav">
        <div className="lp-nav-inner">

          {/* Logo */}
          <a href="/landing" className="lp-nav-logo" aria-label="XyroTrade" onClick={closeAllMenus}>
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
              <div className={`lp-nav-item ${activeDropdown === label ? 'open' : ''}`} key={label}>
                <button className="lp-nav-link" onClick={() => toggleDropdown(label)}>
                  {label}
                  <ChevronDown />
                </button>
                <div className="lp-nav-dropdown">
                  {NAV_DROPDOWNS[label].map((item) => (
                    <a 
                      key={item.title} 
                      href={item.href || '#'} 
                      className="lp-nav-dropdown-item"
                      onClick={closeAllMenus}
                    >
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
            <a href="/login" className="lp-nav-act-link" onClick={closeAllMenus}>Log in</a>
            <a href="/login" className="lp-nav-act-btn" onClick={closeAllMenus}>Create account</a>
          </div>

          {/* Mobile-only: Create account (visible before hamburger on small screens) */}
          <div className="lp-nav-mobile-actions">
            <a href="/login" className="lp-nav-mob-btn" onClick={closeAllMenus}>Create account</a>
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
        {/* Dropdown items for mobile */}
        {(Object.keys(NAV_DROPDOWNS) as Array<keyof typeof NAV_DROPDOWNS>).map((label) => (
          <div className="lp-nav-mobile-group" key={label}>
            <button 
              className={`lp-nav-mobile-toggle ${mobileActiveDropdown === label ? 'active' : ''}`}
              onClick={() => setMobileActiveDropdown(mobileActiveDropdown === label ? null : label)}
            >
              {label}
              <ChevronDown />
            </button>
            <div className={`lp-nav-mobile-dropdown ${mobileActiveDropdown === label ? 'show' : ''}`}>
              {NAV_DROPDOWNS[label].map((item) => (
                <a 
                  key={item.title} 
                  href={item.href || '#'} 
                  className="lp-nav-mobile-dropdown-item"
                  onClick={closeAllMenus}
                >
                  <span className="lp-nav-mobile-dropdown-icon">{item.icon}</span>
                  <div className="lp-nav-mobile-dropdown-info">
                    <div className="lp-nav-mobile-dropdown-title">{item.title}</div>
                    <div className="lp-nav-mobile-dropdown-desc">{item.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}

        <a href="#" onClick={closeAllMenus}>Signals</a>
        <a href="#" onClick={closeAllMenus}>Pricing</a>
        <a href="#" onClick={closeAllMenus}>Brokers</a>
        <div className="lp-nav-mobile-sep" />
        <a href="/login" onClick={closeAllMenus}>Log in</a>
        <a href="/login" className="lp-nav-mobile-cta" onClick={closeAllMenus}>Create account</a>
      </div>
    </>
  );
}
