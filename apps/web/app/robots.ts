import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/content";

/**
 * Private platform, BFF and noindex utility pages — off limits for everyone.
 * Bare prefixes on purpose: "/app" also covers "/app/…", which "/app/" does not.
 * /unsubscribe carries a one-click token in the query string.
 */
const DISALLOW = [
  "/app",
  "/api",
  "/founding/status",
  "/early-access/status",
  "/unsubscribe",
  "/offline",
];

/**
 * AI crawlers and answer engines we explicitly welcome, under the same rules as
 * everyone else. Naming them is the consent signal operators actually read, and
 * it keeps them allowed the day the `*` group tightens.
 */
const AI_CRAWLERS = [
  // OpenAI: training, live browsing, ChatGPT search index.
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  // Anthropic: crawler, legacy user-agent, legacy training agent.
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  // Perplexity: index + on-demand fetch.
  "PerplexityBot",
  "Perplexity-User",
  // Common Crawl — the corpus most open models are trained on.
  "CCBot",
  // Google Gemini / AI Overviews opt-in (separate from Googlebot).
  "Google-Extended",
  // Apple: Siri/Spotlight index + Apple Intelligence training opt-in.
  "Applebot",
  "Applebot-Extended",
  // Amazon (Alexa/Rufus), Meta AI, Meta link preview.
  "Amazonbot",
  "meta-externalagent",
  "FacebookBot",
  // ByteDance (Doubao), Cohere, Diffbot knowledge graph.
  "Bytespider",
  "cohere-ai",
  "Diffbot",
  // You.com, Timpi, Webz.io/Omgili — answer engines and LLM data brokers.
  "YouBot",
  "Timpibot",
  "Omgilibot",
  // Bing powers Copilot's index.
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
