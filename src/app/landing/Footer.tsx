'use client';

export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-top">
        <h2 className="lp-footer-cta-title">Try XyroTrade today</h2>
        <p className="lp-footer-cta-sub">Free to start. No commitments.</p>
        <a href="/login?signup=true" className="lp-footer-btn">Start for Free</a>
      </div>

      <div className="lp-footer-middle">
        <div className="lp-footer-nav">
          <a href="#">Pricing</a>
          <a href="#">Terms & Conditions</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Help</a>
          <a href="#">Partner Program</a>
          <a href="#">Changelog</a>
        </div>
        <div className="lp-footer-socials">
          <a href="#" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
          <a href="#" aria-label="LinkedIn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </a>
          <a href="#" aria-label="YouTube">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
              <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
            </svg>
          </a>
        </div>
      </div>

      <div className="lp-footer-divider" />

      <div className="lp-footer-bottom">
        <p className="lp-footer-copyright">
          © 2026 XyroTrade. Built with precision for quantitative systems.
        </p>
      </div>

      <div className="lp-footer-brand-huge">
        XYRO TRADE
      </div>
    </footer>
  );
}
