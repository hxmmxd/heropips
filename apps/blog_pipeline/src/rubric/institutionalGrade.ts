import { Topic, RubricEvaluationResult, RubricEvaluationResultSchema } from '../types.js';

export const RUBRIC_WEIGHTS = {
  institutional_tone: 0.25,
  financial_crypto_accuracy: 0.25,
  word_count_depth: 0.15,
  markdown_structure: 0.15,
  seo_optimization: 0.10,
  readability_formatting: 0.10
} as const;

export const PASSING_SCORE_THRESHOLD = 85;

/**
 * Calculates weighted composite score from dimension scores.
 * Formula: sum(score_i * weight_i) / sum(weight_i)
 */
export function calculateCompositeScore(
  dimensions: Record<string, { score: number; weight?: number }>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, dim] of Object.entries(dimensions)) {
    const weight = dim.weight ?? (RUBRIC_WEIGHTS as Record<string, number>)[key] ?? 0;
    weightedSum += dim.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Builds the LLM-as-a-Judge evaluation prompt for grading candidate drafts.
 */
export function buildJudgePrompt(topic: Topic, draftMarkdown: string): string {
  return `You are the Chief Editorial Auditor and Quantitative Review Board for HeroPips, an elite quantitative finance and algorithmic trading institution.

Your assignment is to strictly evaluate the following candidate blog draft for Topic #${topic.index} against our Institutional Grade Rubric.

### TOPIC METADATA
- **Topic Index**: ${topic.index}
- **Pillar**: ${topic.pillarName} (${topic.pillarDescriptor})
- **Pillar Description**: ${topic.pillarDescription}
- **Primary Keyword**: "${topic.primaryKeyword}"
- **Title**: "${topic.title}"
- **Search Intent**: ${topic.searchIntent}
- **Slug**: "${topic.slug}"
- **Target Word Count**: >= ${topic.targetWordCount || 1200} substantive body words

---

### EVALUATION RUBRIC CRITERIA

#### 1. 5 MANDATORY HARD GATES (All MUST be true for approval)
1. **min_word_count_met**: Body text (excluding frontmatter and code fences) MUST be at least 1,200 words.
2. **no_critical_factual_errors**: Financial mathematics, order book microstructure, derivatives mechanics, risk formulas, or macroeconomic relationships MUST be strictly accurate.
3. **no_hyperbolic_marketing_fluff**: ZERO promotional hype, get-rich-quick claims, guaranteed win rates, rocket emojis, or retail clichés (e.g., "to the moon", "100x gains", "guaranteed profits").
4. **valid_markdown_hierarchy**: Clean markdown heading hierarchy (exactly 1 H1, at least 4 H2s, no skipped heading levels like H1->H3).
5. **no_llm_boilerplate_artifacts**: ZERO AI conversational filler (e.g., "In this article we will delve into", "As an AI language model", "Certainly! Here is...", "Let's dive in!").

#### 2. 6 WEIGHTED DIMENSIONS (0 - 100 scale)
1. **institutional_tone** (Weight: 25%): Authoritative, analytical, probabilistic tone suitable for hedge fund analysts, systematic traders, and institutional allocators.
2. **financial_crypto_accuracy** (Weight: 25%): Rigorous mathematical definitions (Sharpe, Calmar, Order Book Imbalance, Kelly Criterion, slippage models, latency arbitrage mechanics).
3. **word_count_depth** (Weight: 15%): Substantive technical detail across all sections with 1,200–1,600 body words.
4. **markdown_structure** (Weight: 15%): Valid YAML frontmatter, 1 H1, >=4 H2s, H3 sub-headers, >=1 comprehensive Markdown comparison table, and structured FAQ section.
5. **seo_optimization** (Weight: 10%): Natural placement of primary keyword "${topic.primaryKeyword}" in H1, first 150 words, H2 headings, and frontmatter without keyword stuffing.
6. **readability_formatting** (Weight: 10%): LaTeX / ASCII formulas, callout blocks, clear tables, and compliance risk disclosure.

---

### CANDIDATE DRAFT TO AUDIT
\`\`\`markdown
${draftMarkdown}
\`\`\`

---

### REQUIRED JSON OUTPUT FORMAT
You MUST respond with a single, valid, raw JSON object (and no surrounding text or markdown fences) strictly adhering to the schema below:

{
  "evaluation_timestamp": "${new Date().toISOString()}",
  "topic_slug": "${topic.slug}",
  "topic_index": ${topic.index},
  "word_count_actual": <integer count of substantive body words>,
  "overall_score": <weighted composite score between 0.0 and 100.0>,
  "passed": <true if overall_score >= 85.0 AND all 5 hard_gates are true, otherwise false>,
  "hard_gates": {
    "min_word_count_met": <boolean>,
    "no_critical_factual_errors": <boolean>,
    "no_hyperbolic_marketing_fluff": <boolean>,
    "valid_markdown_hierarchy": <boolean>,
    "no_llm_boilerplate_artifacts": <boolean>
  },
  "dimension_scores": {
    "institutional_tone": {
      "score": <0-100>,
      "passed": <boolean>,
      "weight": 0.25,
      "critique": "<Specific analysis of tone, voice, and presence of promotional fluff>",
      "actionable_remediation": ["<Actionable instruction if score < 85>"]
    },
    "financial_crypto_accuracy": {
      "score": <0-100>,
      "passed": <boolean>,
      "weight": 0.25,
      "critique": "<Analysis of mathematical rigor and domain precision>",
      "actionable_remediation": ["<Actionable instruction if score < 85>"]
    },
    "word_count_depth": {
      "score": <0-100>,
      "passed": <boolean>,
      "weight": 0.15,
      "critique": "<Analysis of depth and word count compliance>",
      "actionable_remediation": ["<Actionable instruction if score < 85>"]
    },
    "markdown_structure": {
      "score": <0-100>,
      "passed": <boolean>,
      "weight": 0.15,
      "critique": "<Analysis of H1-H3 hierarchy, tables, and FAQ block>",
      "actionable_remediation": ["<Actionable instruction if score < 85>"]
    },
    "seo_optimization": {
      "score": <0-100>,
      "passed": <boolean>,
      "weight": 0.10,
      "critique": "<Analysis of keyword integration and semantic relevance>",
      "actionable_remediation": ["<Actionable instruction if score < 85>"]
    },
    "readability_formatting": {
      "score": <0-100>,
      "passed": <boolean>,
      "weight": 0.10,
      "critique": "<Analysis of tables, equations, and visual layout>",
      "actionable_remediation": ["<Actionable instruction if score < 85>"]
    }
  },
  "identified_issues": [
    {
      "severity": "fatal" | "major" | "minor",
      "dimension": "<dimension_name>",
      "location": "<Section or line reference>",
      "issue_description": "<Exact description of defect>",
      "suggested_fix": "<Concrete instruction on how to resolve>"
    }
  ],
  "refinement_prompt_guidance": "<Comprehensive guidance for the refiner LLM summarizing all required improvements>"
}
`;
}
