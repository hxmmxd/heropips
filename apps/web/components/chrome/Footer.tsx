import Link from "next/link";
import { Disclaimer, LevelUpMark } from "@heropips/ui";

const cols: Array<{ title: string; items: Array<[string, string]> }> = [
  { title: "Product", items: [["/product", "Overview"], ["/product/intelligence", "Intelligence"], ["/product/automation", "Automation"], ["/product/trade-guard", "Trade Guard"], ["/pricing", "Pricing"], ["/app/login", "Member app"]] },
  { title: "Learn", items: [["/academy", "Academy"], ["/faq", "FAQ"], ["/early-access", "Early access"], ["/founding", "Founding Hero"]] },
  { title: "Partners", items: [["/affiliates", "Affiliates & IBs"]] },
  { title: "Legal", items: [["/legal/terms", "Terms"], ["/legal/privacy", "Privacy"], ["/legal/risk", "Risk disclosure"], ["/legal/refunds", "Refund policy"], ["/legal/ltd-terms", "Founding Hero terms"]] },
];

export function Footer() {
  return (
    <footer className="hp-footer">
      <div className="container hp-footer-inner">
        <div className="hp-footer-grid">
          <div className="hp-footer-brand">
            <div className="hp-footer-mark">
              <LevelUpMark size={24} />
              <span className="hp-footer-word">heropips</span>
            </div>
            <p className="hp-footer-tag">Learn → paper → automate. Your rules, enforced.</p>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h3 className="hp-footer-col-title">{c.title}</h3>
              <ul className="hp-linklist hp-linklist--muted">
                {c.items.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="hp-footer-legal">
          <Disclaimer />
          <p className="hp-footer-fine">© 2026 HeroPips · heropips.com · Beta December 2026</p>
        </div>
      </div>
    </footer>
  );
}
