import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildGenerationPrompt,
  generateInitialDraft,
  MockLlmClient,
  createLlmClient,
  countWords,
  extractFrontmatter,
  validateMarkdownStructure,
  Topic
} from '../src/index.js';

const MOCK_TOPIC_1: Topic = {
  index: 1,
  pillarId: 1,
  pillarName: 'AI Trading & Algorithmic Automation',
  pillarDescriptor: 'High CPC / High Trend',
  pillarDescription: 'Institutional traders seeking systematic automation',
  primaryKeyword: 'AI crypto trading bot',
  title: 'The Ultimate Guide to AI Crypto Trading Bots in 2026',
  searchIntent: 'Transactional',
  slug: '01_ai_crypto_trading_bot',
  targetWordCount: 1200
};

const MOCK_TOPIC_36: Topic = {
  index: 36,
  pillarId: 4,
  pillarName: 'Forex Mastery & Major Currency Pairs',
  pillarDescriptor: 'Evergreen Volume',
  pillarDescription: 'Traders seeking currency pair masterclasses',
  primaryKeyword: 'EUR/USD trading strategy',
  title: 'EUR/USD Trading Strategy: The Complete 2026 Guide',
  searchIntent: 'Educational',
  slug: '36_eur_usd_trading_strategy',
  targetWordCount: 1200
};

describe('Content Generation Subsystem (Milestone 2)', () => {
  let mockClient: MockLlmClient;

  beforeEach(() => {
    mockClient = new MockLlmClient();
  });

  describe('Prompt Construction (buildGenerationPrompt)', () => {
    it('includes all topic metadata: index, pillar, primary keyword, title, slug, and word count quota', () => {
      const prompt = buildGenerationPrompt(MOCK_TOPIC_1);

      expect(prompt).toContain('Topic Specification');
      expect(prompt).toContain('1');
      expect(prompt).toContain('AI Trading & Algorithmic Automation');
      expect(prompt).toContain('AI crypto trading bot');
      expect(prompt).toContain('The Ultimate Guide to AI Crypto Trading Bots in 2026');
      expect(prompt).toContain('01_ai_crypto_trading_bot');
      expect(prompt).toContain('1,200 words');
    });

    it('enforces institutional tone and strictly bans marketing buzzwords and AI conversational artifacts', () => {
      const prompt = buildGenerationPrompt(MOCK_TOPIC_1);

      expect(prompt).toContain('Senior Quantitative Strategist');
      expect(prompt).toContain('STRICTLY PROHIBITED');
      expect(prompt).toContain('ZERO AI CONVERSATIONAL FILLER');
      expect(prompt).toContain('YAML Frontmatter');
    });

    it('mandates required structural elements: H1, >=5 H2 sections, tables, math formulas, and FAQ block', () => {
      const prompt = buildGenerationPrompt(MOCK_TOPIC_36);

      expect(prompt).toContain('Single H1 Title');
      expect(prompt).toContain('At Least 5 Distinct H2 Sections');
      expect(prompt).toContain('At Least 1 Comprehensive Markdown Table');
      expect(prompt).toContain('Frequently Asked Questions (FAQ)');
      expect(prompt).toContain('Compliance & Risk Disclosure');
    });
  });

  describe('Draft Generation (generateInitialDraft)', () => {
    it('generates an authentic institutional markdown draft via MockLlmClient', async () => {
      const draft = await generateInitialDraft(mockClient, MOCK_TOPIC_1);

      expect(draft).toBeTruthy();
      expect(draft).toContain('# The Ultimate Guide to AI Crypto Trading Bots in 2026');
      expect(mockClient.callCount).toBe(1);
    });

    it('passes generation temperature and maxTokens options correctly to the client', async () => {
      await generateInitialDraft(mockClient, MOCK_TOPIC_1, { temperature: 0.8, maxTokens: 5000 });

      expect(mockClient.callHistory).toHaveLength(1);
      expect(mockClient.callHistory[0].options?.temperature).toBe(0.8);
      expect(mockClient.callHistory[0].options?.maxTokens).toBe(5000);
    });

    it('generated draft contains valid YAML frontmatter matching topic specification', async () => {
      const draft = await generateInitialDraft(mockClient, MOCK_TOPIC_1);
      const frontmatter = extractFrontmatter(draft);

      expect(frontmatter.slug).toBe('01_ai_crypto_trading_bot');
      expect(frontmatter.target_keyword).toBe('AI crypto trading bot');
      expect(frontmatter.category).toBe('AI Trading & Algorithmic Automation');
    });

    it('generated draft satisfies institutional structural criteria (H1, H2s, Table, FAQ, Disclaimer)', async () => {
      const draft = await generateInitialDraft(mockClient, MOCK_TOPIC_1);
      const structure = validateMarkdownStructure(draft);

      expect(structure.hasFrontmatter).toBe(true);
      expect(structure.h1Count).toBe(1);
      expect(structure.h2Count).toBeGreaterThanOrEqual(4);
      expect(structure.tableCount).toBeGreaterThanOrEqual(1);
      expect(structure.hasFaq).toBe(true);
      expect(structure.hasDisclaimer).toBe(true);
      expect(structure.isValidHierarchy).toBe(true);
    });

    it('generated draft exceeds the 1,200-word substantive body requirement', async () => {
      const draft = await generateInitialDraft(mockClient, MOCK_TOPIC_1);
      const words = countWords(draft);

      expect(words).toBeGreaterThanOrEqual(1200);
    });

    it('throws descriptive error if the LLM returns an empty string', async () => {
      mockClient.queueResponse('');

      await expect(generateInitialDraft(mockClient, MOCK_TOPIC_1)).rejects.toThrow(
        'Content generation failed: received empty response'
      );
    });
  });

  describe('LLM Client Provider & Factory (createLlmClient)', () => {
    it('creates a MockLlmClient when mockLlm flag is true', () => {
      const client = createLlmClient({ mockLlm: true });
      expect(client instanceof MockLlmClient).toBe(true);
    });

    it('creates a MockLlmClient gracefully when no API keys are provided', () => {
      const client = createLlmClient({});
      expect(client instanceof MockLlmClient).toBe(true);
    });

    it('MockLlmClient supports response queuing and call history inspection', async () => {
      mockClient.queueResponse('# Queued Response');
      const res = await mockClient.generateContent('test');

      expect(res).toBe('# Queued Response');
      expect(mockClient.callCount).toBe(1);
      expect(mockClient.callHistory[0].prompt).toBe('test');
    });

    it('MockLlmClient simulates rate limit exhaustion error in rate_limit_once scenario', async () => {
      mockClient.setScenario('rate_limit_once');

      await expect(mockClient.generateContent('test')).rejects.toThrow('HTTP 429');
      // Second call succeeds
      const res = await mockClient.generateContent('test 2');
      expect(res).toBeTruthy();
    });
  });
});
