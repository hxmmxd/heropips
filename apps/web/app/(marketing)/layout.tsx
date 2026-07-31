import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";

/** Marketing chrome: top nav + footer. The platform route group ships its own shell. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
