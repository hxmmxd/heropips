/**
 * The one date the five legal routes assert, in both forms.
 *
 * Its own zero-dependency module so `app/sitemap.ts` can read the ISO value
 * for real per-route `lastmod` stamps without importing LegalShell — which
 * would drag @heropips/ui and the JSON-LD components into the sitemap route
 * for one string. Change both constants together.
 */
export const LEGAL_EFFECTIVE_ISO = "2026-07-28";
export const LEGAL_EFFECTIVE_DATE = "Effective date: July 28, 2026";
