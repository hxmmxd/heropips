import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parseBlogTopics,
  parseBlogCatalog,
  generateCanonicalSlug,
  getPillarById,
  getTopicByIndex,
  getTopicBySlug
} from '../src/parser/topicParser.js';
import {
  TopicSchema,
  TopicCatalogSchema,
  SearchIntentSchema
} from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE_PATH = path.resolve(__dirname, '../data/seo_50_blog_topics.md');

describe('Canonical Slug Generator', () => {
  it('should format index 1 with lowercase snake_case', () => {
    const slug = generateCanonicalSlug(1, 'AI crypto trading bot');
    expect(slug).toBe('01_ai_crypto_trading_bot');
  });

  it('should handle slashes and hyphens correctly', () => {
    const slug = generateCanonicalSlug(36, 'EUR/USD trading strategy');
    expect(slug).toBe('36_eur_usd_trading_strategy');
  });

  it('should handle acronyms and short keywords', () => {
    const slug = generateCanonicalSlug(20, 'PPI vs CPI');
    expect(slug).toBe('20_ppi_vs_cpi');
  });

  it('should handle single digit padding and index 50', () => {
    const slug50 = generateCanonicalSlug(50, 'Trading consistency');
    expect(slug50).toBe('50_trading_consistency');
  });

  it('should strip special characters, redundant spaces and leading/trailing underscores', () => {
    const slug = generateCanonicalSlug(9, '  Why You Don\'t Need Python!  ');
    expect(slug).toBe('09_why_you_don_t_need_python');
  });
});

describe('Markdown Topic Table Parser', () => {
  it('should parse exactly 50 topics from data/seo_50_blog_topics.md', () => {
    const topics = parseBlogTopics(DATA_FILE_PATH);
    expect(topics).toHaveLength(50);
    expect(topics.every(t => TopicSchema.safeParse(t).success)).toBe(true);
  });

  it('should parse structured catalog with 5 pillars and exactly 10 topics per pillar', () => {
    const catalog = parseBlogCatalog(DATA_FILE_PATH);
    const parsed = TopicCatalogSchema.safeParse(catalog);
    expect(parsed.success).toBe(true);

    expect(catalog.pillars).toHaveLength(5);
    expect(catalog.allTopics).toHaveLength(50);

    for (let p = 1; p <= 5; p++) {
      const pillar = getPillarById(catalog, p);
      expect(pillar).toBeDefined();
      expect(pillar?.id).toBe(p);
      expect(pillar?.topics).toHaveLength(10);
      expect(pillar?.name).toBeTruthy();
      expect(pillar?.descriptor).toBeTruthy();
      expect(pillar?.description).toBeTruthy();
    }
  });

  it('should verify pillar 1 metadata and topics', () => {
    const catalog = parseBlogCatalog(DATA_FILE_PATH);
    const pillar1 = getPillarById(catalog, 1);
    expect(pillar1).toBeDefined();
    expect(pillar1?.name).toBe('AI Trading & Algorithmic Automation');
    expect(pillar1?.descriptor).toBe('High CPC / High Trend');
    expect(pillar1?.description).toBe('Capturing the massive surge in retail traders looking to automate their income.');

    const topic1 = pillar1?.topics[0];
    expect(topic1?.index).toBe(1);
    expect(topic1?.primaryKeyword).toBe('AI crypto trading bot');
    expect(topic1?.title).toBe('The Ultimate Guide to AI Crypto Trading Bots in 2026');
    expect(topic1?.searchIntent).toBe('Transactional');
    expect(topic1?.slug).toBe('01_ai_crypto_trading_bot');
    expect(topic1?.targetWordCount).toBe(1200);
  });

  it('should verify pillar 2 metadata and topics', () => {
    const catalog = parseBlogCatalog(DATA_FILE_PATH);
    const pillar2 = getPillarById(catalog, 2);
    expect(pillar2).toBeDefined();
    expect(pillar2?.name).toBe('Macroeconomics & The Fed');
    expect(pillar2?.descriptor).toBe('Evergreen / High Volume');
    expect(pillar2?.description).toBe('Capturing millions of monthly searches surrounding economic news events.');

    const topic11 = pillar2?.topics[0];
    expect(topic11?.index).toBe(11);
    expect(topic11?.primaryKeyword).toBe('How CPI affects crypto');
    expect(topic11?.searchIntent).toBe('Educational');
    expect(topic11?.slug).toBe('11_how_cpi_affects_crypto');
  });

  it('should verify pillar 3 metadata and topics', () => {
    const catalog = parseBlogCatalog(DATA_FILE_PATH);
    const pillar3 = getPillarById(catalog, 3);
    expect(pillar3).toBeDefined();
    expect(pillar3?.name).toBe('Crypto Market Analysis & Alpha');
    expect(pillar3?.descriptor).toBe('Massive Retail Volume');
    expect(pillar3?.description).toBe('Capturing the crypto-native audience looking for edge and alpha.');

    const topic21 = pillar3?.topics[0];
    expect(topic21?.index).toBe(21);
    expect(topic21?.primaryKeyword).toBe('Crypto order book reading');
    expect(topic21?.searchIntent).toBe('Educational');
    expect(topic21?.slug).toBe('21_crypto_order_book_reading');
  });

  it('should verify pillar 4 metadata and topics', () => {
    const catalog = parseBlogCatalog(DATA_FILE_PATH);
    const pillar4 = getPillarById(catalog, 4);
    expect(pillar4).toBeDefined();
    expect(pillar4?.name).toBe('Smart Money Concepts & Forex');
    expect(pillar4?.descriptor).toBe('High Intent / High Conversion');
    expect(pillar4?.description).toBe('Targeting serious traders looking for advanced methodologies (SMC, ICT).');

    const topic36 = pillar4?.topics[5];
    expect(topic36?.index).toBe(36);
    expect(topic36?.primaryKeyword).toBe('EUR/USD trading strategy');
    expect(topic36?.title).toBe('EUR/USD Masterclass: The Only Currency Pair You Need to Master');
    expect(topic36?.searchIntent).toBe('Educational');
    expect(topic36?.slug).toBe('36_eur_usd_trading_strategy');
  });

  it('should verify pillar 5 metadata and topics', () => {
    const catalog = parseBlogCatalog(DATA_FILE_PATH);
    const pillar5 = getPillarById(catalog, 5);
    expect(pillar5).toBeDefined();
    expect(pillar5?.name).toBe('Trading Psychology & Prop Firms');
    expect(pillar5?.descriptor).toBe('High Engagement / Retention');
    expect(pillar5?.description).toBe('Lower search volume, but extremely high time-on-page and shareability.');

    const topic50 = pillar5?.topics[9];
    expect(topic50?.index).toBe(50);
    expect(topic50?.primaryKeyword).toBe('Trading consistency');
    expect(topic50?.title).toBe('From Boom and Bust to Consistent: The Quant Approach to Equity Curves');
    expect(topic50?.searchIntent).toBe('Informational');
    expect(topic50?.slug).toBe('50_trading_consistency');
  });

  it('should validate all search intents against SearchIntentSchema', () => {
    const topics = parseBlogTopics(DATA_FILE_PATH);
    const allowedIntents = ['Transactional', 'Educational', 'Informational', 'Commercial'];
    for (const t of topics) {
      expect(allowedIntents).toContain(t.searchIntent);
      expect(SearchIntentSchema.safeParse(t.searchIntent).success).toBe(true);
    }
  });

  it('should retrieve topic by index and slug', () => {
    const topics = parseBlogTopics(DATA_FILE_PATH);
    const topic1 = getTopicByIndex(topics, 1);
    expect(topic1?.slug).toBe('01_ai_crypto_trading_bot');

    const topic36 = getTopicBySlug(topics, '36_eur_usd_trading_strategy');
    expect(topic36?.index).toBe(36);
    expect(topic36?.primaryKeyword).toBe('EUR/USD trading strategy');
  });

  it('should throw error when parsing incomplete markdown with parseBlogTopics', () => {
    const badMarkdown = `
# Incomplete Strategy
## Pillar 1: Test
| # | Target Keyword | Blog Title | Search Intent |
| :--- | :--- | :--- | :--- |
| 1 | Test Keyword | Test Title | Educational |
`;
    expect(() => parseBlogTopics(badMarkdown)).toThrow(/Expected exactly 50 topics/);
  });
});
