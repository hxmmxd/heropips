'use client';

import { useState } from 'react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { 
  Cpu, 
  ShieldCheck, 
  BarChart3, 
  Bot, 
  Target, 
  Building2, 
  Compass, 
  BookOpen, 
  FileText, 
  Users,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

export const NAV_DROPDOWNS = {
  Platform: [
    { icon: Cpu, iconColor: '#ff3c00', title: 'AI Signal Engine', desc: '12-gate quantitative validation', href: '/landing/signal-engine' },
    { icon: ShieldCheck, iconColor: '#10b981', title: 'Risk Governor', desc: 'Auto position sizing & drawdown guard', href: '#' },
    { icon: BarChart3, iconColor: '#0088cc', title: 'Analytics Dashboard', desc: 'Full performance tracking & journal', href: '#' },
    { icon: Bot, iconColor: '#8b5cf6', title: 'AI Chat Assistant', desc: 'Ask anything, get instant analysis', href: '#' },
  ],
  'For Traders': [
    { icon: Target, iconColor: '#ff3c00', title: 'Prop Firm Traders', desc: 'Pass challenges with governed risk', href: '#' },
    { icon: Building2, iconColor: '#0088cc', title: 'Institutional', desc: 'White-label & API for firms & funds', href: '#' },
    { icon: Compass, iconColor: '#10b981', title: 'Beginners', desc: 'Start with guided, validated signals', href: '#' },
  ],
  Resources: [
    { icon: BookOpen, iconColor: '#0088cc', title: 'Documentation', desc: 'Guides, API refs & tutorials', href: '#' },
    { icon: FileText, iconColor: '#ff3c00', title: 'Blog', desc: 'Strategy breakdowns & market insights', href: '#' },
    { icon: Users, iconColor: '#10b981', title: 'Community', desc: 'Telegram & Discord trader groups', href: '#' },
  ],
};

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileActiveDropdown, setMobileActiveDropdown] = useState<string | null>(null);

  const toggleDropdown = (label: string) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return;
    }
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
          <NavigationMenu.Root className="lp-nav-root">
            <NavigationMenu.List className="lp-nav-links">

              {/* Platform Dropdown */}
              <NavigationMenu.Item className={`lp-nav-item ${activeDropdown === 'Platform' ? 'open' : ''}`}>
                <NavigationMenu.Trigger className="lp-nav-link" onClick={() => toggleDropdown('Platform')}>
                  Platform
                  <ChevronDown className="lp-nav-chevron" size={14} />
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="lp-nav-dropdown lp-dd-platform">
                  <div className="lp-dd-grid">
                    {NAV_DROPDOWNS.Platform.map((item) => (
                      <NavigationMenu.Link key={item.title} asChild>
                        <a href={item.href} className="lp-nav-dropdown-item" onClick={closeAllMenus}>
                          <div className="lp-nav-dd-icon" style={{ color: item.iconColor, background: `${item.iconColor}0c` }}>
                            <item.icon size={18} strokeWidth={2} />
                          </div>
                          <div className="lp-nav-dd-info">
                            <div className="lp-nav-dd-title">{item.title}</div>
                            <div className="lp-nav-dd-desc">{item.desc}</div>
                          </div>
                        </a>
                      </NavigationMenu.Link>
                    ))}
                  </div>
                  <div className="lp-dd-footer">
                    <NavigationMenu.Link asChild>
                      <a href="/landing/signal-engine" className="lp-dd-footer-link" onClick={closeAllMenus}>
                        <span>System Status: 100% Operational (4.8ms)</span>
                        <ArrowRight size={13} />
                      </a>
                    </NavigationMenu.Link>
                  </div>
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              {/* For Traders Dropdown */}
              <NavigationMenu.Item className={`lp-nav-item ${activeDropdown === 'For Traders' ? 'open' : ''}`}>
                <NavigationMenu.Trigger className="lp-nav-link" onClick={() => toggleDropdown('For Traders')}>
                  For Traders
                  <ChevronDown className="lp-nav-chevron" size={14} />
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="lp-nav-dropdown lp-dd-traders">
                  <div className="lp-dd-cols">
                    <div className="lp-dd-col-left">
                      {NAV_DROPDOWNS['For Traders'].map((item) => (
                        <NavigationMenu.Link key={item.title} asChild>
                          <a href={item.href} className="lp-nav-dropdown-item" onClick={closeAllMenus}>
                            <div className="lp-nav-dd-icon" style={{ color: item.iconColor, background: `${item.iconColor}0c` }}>
                              <item.icon size={18} strokeWidth={2} />
                            </div>
                            <div className="lp-nav-dd-info">
                              <div className="lp-nav-dd-title">{item.title}</div>
                              <div className="lp-nav-dd-desc">{item.desc}</div>
                            </div>
                          </a>
                        </NavigationMenu.Link>
                      ))}
                    </div>
                    <div className="lp-dd-col-right">
                      <div className="lp-dd-sidebar-tag">XYRO API</div>
                      <h4 className="lp-dd-sidebar-title">Institutional Feed</h4>
                      <p className="lp-dd-sidebar-desc">Direct websocket execution & raw data streams.</p>
                      <NavigationMenu.Link asChild>
                        <a href="#" className="lp-dd-sidebar-link" onClick={closeAllMenus}>
                          Request API Key <ArrowRight size={11} style={{ marginLeft: 2 }} />
                        </a>
                      </NavigationMenu.Link>
                    </div>
                  </div>
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              {/* Resources Dropdown */}
              <NavigationMenu.Item className={`lp-nav-item ${activeDropdown === 'Resources' ? 'open' : ''}`}>
                <NavigationMenu.Trigger className="lp-nav-link" onClick={() => toggleDropdown('Resources')}>
                  Resources
                  <ChevronDown className="lp-nav-chevron" size={14} />
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="lp-nav-dropdown lp-dd-resources">
                  <div className="lp-dd-grid-single">
                    {NAV_DROPDOWNS.Resources.map((item) => (
                      <NavigationMenu.Link key={item.title} asChild>
                        <a href={item.href} className="lp-nav-dropdown-item" onClick={closeAllMenus}>
                          <div className="lp-nav-dd-icon" style={{ color: item.iconColor, background: `${item.iconColor}0c` }}>
                            <item.icon size={18} strokeWidth={2} />
                          </div>
                          <div className="lp-nav-dd-info">
                            <div className="lp-nav-dd-title">{item.title}</div>
                            <div className="lp-nav-dd-desc">{item.desc}</div>
                          </div>
                        </a>
                      </NavigationMenu.Link>
                    ))}
                  </div>
                  <div className="lp-dd-footer">
                    <NavigationMenu.Link asChild>
                      <a href="#" className="lp-dd-footer-link" onClick={closeAllMenus}>
                        <span>Learn strategies at Xyro Academy</span>
                        <ArrowRight size={13} />
                      </a>
                    </NavigationMenu.Link>
                  </div>
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              {/* Plain links */}
              <NavigationMenu.Item className="lp-nav-item">
                <NavigationMenu.Link asChild>
                  <a href="#" className="lp-nav-link">Signals</a>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
              <NavigationMenu.Item className="lp-nav-item">
                <NavigationMenu.Link asChild>
                  <a href="#" className="lp-nav-link">Pricing</a>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
              <NavigationMenu.Item className="lp-nav-item">
                <NavigationMenu.Link asChild>
                  <a href="#" className="lp-nav-link">Brokers</a>
                </NavigationMenu.Link>
              </NavigationMenu.Item>

              {/* Orange badge pill */}
              <NavigationMenu.Item className="lp-nav-item">
                <NavigationMenu.Link asChild>
                  <a href="#" className="lp-nav-badge">
                    <span className="lp-nav-badge-dot" />
                    Live Signals
                  </a>
                </NavigationMenu.Link>
              </NavigationMenu.Item>

            </NavigationMenu.List>

            {/* Viewport for smooth width/height animations */}
            <div className="lp-nav-viewport-wrapper">
              <NavigationMenu.Viewport className="lp-nav-dropdown-viewport" />
            </div>
          </NavigationMenu.Root>

          {/* Right actions */}
          <div className="lp-nav-actions">
            <a href="#" className="lp-nav-act-link">Contact sales</a>
            <div className="lp-nav-act-sep" />
            <a href="/login" className="lp-nav-act-link" onClick={closeAllMenus}>Log in</a>
            <a href="/login?signup=true" className="lp-nav-act-btn" onClick={closeAllMenus}>Create account</a>
          </div>

          {/* Mobile-only: Create account (visible before hamburger on small screens) */}
          <div className="lp-nav-mobile-actions">
            <a href="/login?signup=true" className="lp-nav-mob-btn" onClick={closeAllMenus}>Create account</a>
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
              <ChevronDown className="lp-nav-chevron" size={14} />
            </button>
            <div className={`lp-nav-mobile-dropdown ${mobileActiveDropdown === label ? 'show' : ''}`}>
              {NAV_DROPDOWNS[label].map((item) => (
                <a 
                  key={item.title} 
                  href={item.href || '#'} 
                  className="lp-nav-mobile-dropdown-item"
                  onClick={closeAllMenus}
                >
                  <span className="lp-nav-mobile-dropdown-icon" style={{ color: item.iconColor }}>
                    <item.icon size={16} />
                  </span>
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
        <a href="/login?signup=true" className="lp-nav-mobile-cta" onClick={closeAllMenus}>Create account</a>
      </div>
    </>
  );
}
