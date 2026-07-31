import type { MetadataRoute } from "next";
import { abs, CONTENT_MODIFIED } from "@/components/seo/graph";
import { PUBLIC_ROUTES } from "@/lib/content";

/** Build-time guard: the private surface must never reach the sitemap. */
for (const { path } of PUBLIC_ROUTES) {
  if (/^\/(app|api)(\/|$)/.test(path) || path.endsWith("/status")) {
    throw new Error(`sitemap: private route "${path}" is in PUBLIC_ROUTES`);
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Freshness comes from the pinned corpus stamp, never `new Date()`: a value
  // that rolls on every generation — across 49 URLs, five of them `yearly` —
  // teaches crawlers the signal is noise. Shared with the JSON-LD
  // datePublished/dateModified so the two can never disagree.
  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: abs(path),
    lastModified: CONTENT_MODIFIED,
    changeFrequency,
    priority,
  }));
}
