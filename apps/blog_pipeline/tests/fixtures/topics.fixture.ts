/**
 * Fixture: Sample Topics representing different pillars, intents, and edge cases.
 */

export interface TopicFixture {
  index: number;
  pillarId: number;
  pillarName: string;
  pillarDescriptor: string;
  pillarDescription: string;
  primaryKeyword: string;
  title: string;
  searchIntent: 'Transactional' | 'Educational' | 'Informational' | 'Commercial';
  slug: string;
  targetWordCount: number;
}

export const SAMPLE_TOPIC_1: TopicFixture = {
  index: 1,
  pillarId: 1,
  pillarName: 'AI Trading & Algorithmic Automation',
  pillarDescriptor: 'High CPC / High Trend',
  pillarDescription: 'Capturing the massive surge in retail traders looking to automate their income.',
  primaryKeyword: 'AI crypto trading bot',
  title: 'The Ultimate Guide to AI Crypto Trading Bots in 2026',
  searchIntent: 'Transactional',
  slug: '01_ai_crypto_trading_bot',
  targetWordCount: 1200
};

export const SAMPLE_TOPIC_11_MACRO: TopicFixture = {
  index: 11,
  pillarId: 2,
  pillarName: 'Macroeconomics & The Fed',
  pillarDescriptor: 'Evergreen / High Volume',
  pillarDescription: 'Capturing millions of monthly searches surrounding economic news events.',
  primaryKeyword: 'How CPI affects crypto',
  title: 'The CPI Cheat Sheet: How Inflation Data Triggers Crypto Liquidations',
  searchIntent: 'Educational',
  slug: '11_how_cpi_affects_crypto',
  targetWordCount: 1200
};

export const SAMPLE_TOPIC_21_CRYPTO: TopicFixture = {
  index: 21,
  pillarId: 3,
  pillarName: 'Crypto Market Analysis & Alpha',
  pillarDescriptor: 'Massive Retail Volume',
  pillarDescription: 'Capturing the crypto-native audience looking for edge and alpha.',
  primaryKeyword: 'Crypto order book reading',
  title: 'How to Read Crypto Order Books Like an Institutional Market Maker',
  searchIntent: 'Educational',
  slug: '21_crypto_order_book_reading',
  targetWordCount: 1200
};

export const SAMPLE_TOPIC_36_SPECIAL_CHARS: TopicFixture = {
  index: 36,
  pillarId: 4,
  pillarName: 'Smart Money Concepts & Forex',
  pillarDescriptor: 'High Intent / High Conversion',
  pillarDescription: 'Targeting serious traders looking for advanced methodologies (SMC, ICT).',
  primaryKeyword: 'EUR/USD trading strategy',
  title: 'EUR/USD Masterclass: The Only Currency Pair You Need to Master',
  searchIntent: 'Educational',
  slug: '36_eur_usd_trading_strategy',
  targetWordCount: 1200
};

export const SAMPLE_TOPIC_44_RATIO: TopicFixture = {
  index: 44,
  pillarId: 5,
  pillarName: 'Trading Psychology & Prop Firms',
  pillarDescriptor: 'High Engagement / Retention',
  pillarDescription: 'Lower search volume, but extremely high time-on-page and shareability.',
  primaryKeyword: 'Risk reward ratio',
  title: 'Why a 1:3 Risk-Reward Ratio is Plunging Retail Traders into Drawdown',
  searchIntent: 'Informational',
  slug: '44_risk_reward_ratio',
  targetWordCount: 1200
};

export const SAMPLE_TOPIC_24_QUOTES: TopicFixture = {
  index: 24,
  pillarId: 3,
  pillarName: 'Crypto Market Analysis & Alpha',
  pillarDescriptor: 'Massive Retail Volume',
  pillarDescription: 'Capturing the crypto-native audience looking for edge and alpha.',
  primaryKeyword: 'Crypto liquidation map',
  title: 'Using Liquidation Maps to Trade the "Squeeze" Before It Happens',
  searchIntent: 'Educational',
  slug: '24_crypto_liquidation_map',
  targetWordCount: 1200
};

export const SAMPLE_TOPIC_50: TopicFixture = {
  index: 50,
  pillarId: 5,
  pillarName: 'Trading Psychology & Prop Firms',
  pillarDescriptor: 'High Engagement / Retention',
  pillarDescription: 'Lower search volume, but extremely high time-on-page and shareability.',
  primaryKeyword: 'Trading consistency',
  title: 'From Boom and Bust to Consistent: The Quant Approach to Equity Curves',
  searchIntent: 'Informational',
  slug: '50_trading_consistency',
  targetWordCount: 1200
};

export const RAW_MARKDOWN_SAMPLE = `# Master SEO Content Strategy: The Road to 100k Daily Traffic

To achieve **100,000 organic visitors per day**, we cannot rely on luck. We must build a **Topical Authority Matrix**.

---

## Pillar 1: AI Trading & Algorithmic Automation (High CPC / High Trend)
*Capturing the massive surge in retail traders looking to automate their income.*

| # | Target Keyword | Blog Title | Search Intent |
| :--- | :--- | :--- | :--- |
| 1 | AI crypto trading bot | The Ultimate Guide to AI Crypto Trading Bots in 2026 | Transactional |
| 2 | Algorithmic trading for beginners | Algorithmic Trading for Beginners: Building Your First Quant Model | Educational |
`;

export const RAW_MARKDOWN_MALFORMED_ROW = `# Malformed Test
| # | Target Keyword | Blog Title | Search Intent |
| :--- | :--- | :--- | :--- |
| invalid_num | Missing Keyword | Title Only |
| 3 | Incomplete Row |
`;
