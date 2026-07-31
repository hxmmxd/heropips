import { SITE_URL } from "@/lib/content";

const OG_IMAGE = {
  url: "/media/hero-poster.jpg",
  width: 1600,
  height: 900,
  alt: "HeroPips — decision intelligence, simulated output",
};

/**
 * openGraph + twitter metadata for a marketing page. Next.js replaces (not
 * deep-merges) these top-level fields when a page defines them, so key pages
 * spread this to keep the hero image and siteName alongside their own copy.
 *
 * Pages that ship their own `opengraph-image.tsx` MUST pass
 * `{ ownOgImage: true }`: an explicit `images` list here would override the
 * file-convention image, so we omit it and let Next wire the generated art.
 */
export function socialMeta(
  title: string,
  description: string,
  path: string,
  opts: { ownOgImage?: boolean } = {},
) {
  return {
    openGraph: {
      type: "website" as const,
      siteName: "HeroPips",
      url: `${SITE_URL}${path}`,
      title,
      description,
      ...(opts.ownOgImage ? {} : { images: [OG_IMAGE] }),
    },
    twitter: {
      card: "summary_large_image" as const,
      site: "@heropips",
      title,
      description,
    },
  };
}
