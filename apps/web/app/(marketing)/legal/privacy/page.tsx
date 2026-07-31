import type { Metadata } from "next";
import { socialMeta } from "@/components/seo/meta";
import { LegalShell } from "../LegalShell";

const TITLE = "Privacy Policy";
const DESCRIPTION =
  "What HeroPips collects (and what it never sees), the processors we use — NOWPayments, SendGrid, PostHog — data retention, and your GDPR rights.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/legal/privacy" },
  ...socialMeta(TITLE, DESCRIPTION, "/legal/privacy"),
};

export default function PrivacyPage() {
  return (
    <LegalShell
      slug="privacy"
      description={DESCRIPTION}
      title="Privacy Policy"
      intro="What we collect, why, who processes it, and the rights you keep. Short version: we collect the minimum needed to run an early access list, a checkout and — at launch — a trading product; we never see your broker passwords or your wallet keys."
      sections={[
        {
          h: "Data we collect",
          list: [
            "Early access list: email address, optional referral code, UTM parameters, timestamps.",
            "Founding Hero checkout: email, order ID, payment status and amounts reported by our payment processor. We never receive or store your wallet private keys or full payment credentials.",
            "Affiliate applications: name, email, channel URL, audience size, geography and any note you include.",
            "Site analytics: pseudonymous product analytics events (pages, referrers, device class). No advertising trackers.",
            "At launch: account profile, encrypted trade-scope broker API keys, and trading configuration you create.",
          ],
        },
        {
          h: "Why we process it",
          paras: [
            "Legal bases under GDPR: performance of a contract (early-access list membership, checkout, the service itself), legitimate interest (product analytics, abuse prevention), and consent where required (marketing email). We do not sell personal data, and we do not use it for third-party advertising.",
          ],
        },
        {
          h: "Processors we use",
          list: [
            "NOWPayments — crypto payment processing for Founding Hero orders.",
            "SendGrid — transactional and early-access email delivery.",
            "PostHog — product analytics, configured without cross-site tracking.",
            "Cloud infrastructure providers hosting our services and databases.",
          ],
          after: [
            "Each processor receives only the data needed for its function, under a data-processing agreement.",
          ],
        },
        {
          h: "Retention",
          paras: [
            "Early access list data is kept until launch invitations complete or you ask us to remove you. Order records are kept as long as tax and accounting law requires. Analytics are aggregated or deleted within 24 months. Encrypted broker keys are deleted immediately when you disconnect a broker or close your account.",
          ],
        },
        {
          h: "Your rights (GDPR and equivalents)",
          list: [
            "Access and export: request a machine-readable copy of your data.",
            "Deletion: request erasure of your data, subject to legally required retention.",
            "Rectification: correct inaccurate data.",
            "Objection and restriction: object to legitimate-interest processing.",
            "Portability and complaint: receive your data and lodge a complaint with your supervisory authority.",
          ],
          after: ["Exercise any right by emailing privacy@heropips.com. We respond within 30 days."],
        },
        {
          h: "Security",
          paras: [
            "Data in transit is encrypted with TLS; sensitive data at rest — including broker API keys — is encrypted. Access is role-restricted and logged. Withdrawal-enabled broker keys are rejected at setup by design.",
          ],
        },
        {
          h: "Contact",
          paras: ["Data controller: HeroPips. Privacy questions: privacy@heropips.com."],
        },
      ]}
    />
  );
}
