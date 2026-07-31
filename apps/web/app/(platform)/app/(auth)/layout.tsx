import Link from "next/link";
import { BrandLockup } from "@/components/chrome/BrandLockup";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Frame for /app/login and /app/redeem (and the group's error + loading
 * states). Owns everything the two screens share so neither page re-implements
 * a shell: the skip link, the brand bar — which is also the only route back to
 * heropips.com from an unauthenticated screen — the <main> landmark, and the
 * legal footer.
 *
 * Pages render exactly two children into <main>: an <aside class="ap-auth-rail">
 * (≥960px only) and the <div class="ap-auth-card"> form.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ap-auth">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="ap-auth-bar">
        <BrandLockup />
        <ThemeToggle />
      </header>
      <main id="main" className="ap-auth-main">
        {children}
      </main>
      <footer className="ap-auth-foot">
        <span>© 2026 HeroPips</span>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/risk">Risk disclosure</Link>
        <Link href="/faq">Support</Link>
      </footer>
    </div>
  );
}
