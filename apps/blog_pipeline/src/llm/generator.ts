import { Topic, LlmClient, GenerationOptions } from '../types.js';

/**
 * Builds an institutional content generation prompt enforcing deep financial/crypto domain rigor,
 * >=1,200 substantive words, structured markdown hierarchy, tables, equations, and FAQ sections.
 */
export function buildGenerationPrompt(topic: Topic, options?: GenerationOptions): string {
  return `You are a Senior Quantitative Strategist and Institutional Content Director for HeroPips, an elite research firm specializing in algorithmic trading, market microstructure, and quantitative finance.

Write a definitive, institutional-grade, comprehensive technical article for the following topic:

### TOPIC SPECIFICATION
- **Index**: ${topic.index}
- **Pillar**: ${topic.pillarName} (${topic.pillarDescriptor})
- **Pillar Strategy**: ${topic.pillarDescription}
- **Primary Target Keyword**: "${topic.primaryKeyword}"
- **Exact Blog Title**: "${topic.title}"
- **Search Intent**: ${topic.searchIntent}
- **Slug**: "${topic.slug}"
- **Target Body Word Count**: 1,300 – 1,600 substantive words (ABSOLUTE MINIMUM: 1,200 words)

---

### MANDATORY EDITORIAL & STRUCTURAL DIRECTIVES

1. **VOICE & TONE**:
   - Write from the perspective of an institutional quantitative trader and derivatives strategist.
   - Authoritative, precise, analytical, and objective.
   - STRICTLY PROHIBITED: Marketing buzzwords, retail clichés, get-rich-quick claims, guaranteed win rates, exclamation marks, or promotional hype (e.g., "to the moon", "100x gains", "game changer", "secret trick").
   - ZERO AI CONVERSATIONAL FILLER: Never output phrases like "In this article we will delve into", "As an AI language model", "Certainly! Here is the blog post", or "Let's dive in!". Start immediately with the YAML frontmatter.

2. **ARTICLE STRUCTURE & LAYOUT**:
   - **YAML Frontmatter**: Include complete metadata at the top:
     \`\`\`yaml
     ---
     title: "${topic.title.replace(/"/g, '\\"')}"
     slug: "${topic.slug}"
     index: ${topic.index}
     target_keyword: "${topic.primaryKeyword}"
     secondary_keywords:
       - "<relevant LSI keyword 1>"
       - "<relevant LSI keyword 2>"
       - "<relevant LSI keyword 3>"
     category: "${topic.pillarName}"
     search_intent: "${topic.searchIntent}"
     target_audience: "Institutional allocators, quantitative traders, desk leads"
     estimated_reading_time_minutes: <number>
     word_count: <number>
     status: "draft"
     ---
     \`\`\`
   - **Single H1 Title**: Exactly matches "${topic.title}".
   - **Lead Section**: 150–200 words defining the structural mechanics, institutional relevance, and naturally integrating "${topic.primaryKeyword}".
   - **At Least 5 Distinct H2 Sections**: Each section must contain 200–350 substantive words with detailed H3 subsections.
   - **At Least 1 Comprehensive Markdown Table**: Comparing strategies, metrics, execution models, or parameters.
   - **Mathematical Models & Formulations**: Include formal formulas using LaTeX ($...$ or $$...$$) and clean ASCII diagrams/code blocks where appropriate (e.g., Sharpe ratio, Order Book Imbalance, Kelly Criterion, volatility surfaces).
   - **Frequently Asked Questions (FAQ)**: Exactly formatted with an H2 heading "## Frequently Asked Questions (FAQ)" containing at least 3 deep, technical questions as H3 headers with quantitative answers.
   - **Compliance & Risk Disclosure**: Standard institutional disclaimer at the very end.

3. **DOMAIN DEPTH**:
   - Provide concrete parameters, order types, latency benchmarks, and statistical risk controls.
   - Discuss adverse selection, order book imbalance, queue position, slippage models, and risk management (VaR, CVaR, drawdown limits).

Generate the entire complete Markdown article now:`;
}

/**
 * Generates an initial candidate blog draft using the provided LLM client.
 */
export async function generateInitialDraft(
  client: LlmClient,
  topic: Topic,
  options?: GenerationOptions
): Promise<string> {
  const prompt = buildGenerationPrompt(topic, options);
  const genOptions: GenerationOptions = {
    temperature: options?.temperature ?? 0.7,
    maxTokens: options?.maxTokens ?? 4000,
    ...options
  };

  const draft = await client.generateContent(prompt, genOptions);
  if (!draft || typeof draft !== 'string' || draft.trim().length === 0) {
    throw new Error(`Content generation failed: received empty response from LLM for topic ${topic.slug}`);
  }

  return draft.trim();
}
