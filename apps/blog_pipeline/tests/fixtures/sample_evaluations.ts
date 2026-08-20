/**
 * Fixture: Sample LLM Judge evaluation results (Pass, Fail, Refinement Critique).
 */

export interface DimensionScore {
  score: number;
  passed: boolean;
  weight: number;
  critique: string;
  actionable_remediation: string[];
}

export interface RubricEvaluationResult {
  evaluation_timestamp: string;
  topic_slug: string;
  topic_index: number;
  word_count_actual: number;
  overall_score: number;
  passed: boolean;
  hard_gates: {
    min_word_count_met: boolean;
    no_critical_factual_errors: boolean;
    no_hyperbolic_marketing_fluff: boolean;
    valid_markdown_hierarchy: boolean;
    no_llm_boilerplate_artifacts: boolean;
  };
  dimension_scores: {
    institutional_tone: DimensionScore;
    financial_crypto_accuracy: DimensionScore;
    word_count_depth: DimensionScore;
    markdown_structure: DimensionScore;
    seo_optimization: DimensionScore;
    readability_formatting: DimensionScore;
  };
  identified_issues: Array<{
    severity: 'fatal' | 'major' | 'minor';
    dimension: string;
    location: string;
    issue_description: string;
    suggested_fix: string;
  }>;
  refinement_prompt_guidance: string;
}

export const SAMPLE_PASSING_EVALUATION: RubricEvaluationResult = {
  evaluation_timestamp: '2026-08-19T01:30:00.000Z',
  topic_slug: '01_ai_crypto_trading_bot',
  topic_index: 1,
  word_count_actual: 1465,
  overall_score: 95.2,
  passed: true,
  hard_gates: {
    min_word_count_met: true,
    no_critical_factual_errors: true,
    no_hyperbolic_marketing_fluff: true,
    valid_markdown_hierarchy: true,
    no_llm_boilerplate_artifacts: true
  },
  dimension_scores: {
    institutional_tone: {
      score: 96,
      passed: true,
      weight: 0.25,
      critique: 'Authoritative, analytical, and objective tone throughout. Zero marketing fluff.',
      actionable_remediation: []
    },
    financial_crypto_accuracy: {
      score: 95,
      passed: true,
      weight: 0.25,
      critique: 'Exemplary market microstructure depth, accurate mathematical models for OBI and micro-price.',
      actionable_remediation: []
    },
    word_count_depth: {
      score: 98,
      passed: true,
      weight: 0.15,
      critique: 'Exceeds 1,200 word threshold with 1,465 substantive words across 5 core sections.',
      actionable_remediation: []
    },
    markdown_structure: {
      score: 94,
      passed: true,
      weight: 0.15,
      critique: 'Clean H1 -> H2 -> H3 hierarchy, complete frontmatter, comprehensive table, and FAQ block.',
      actionable_remediation: []
    },
    seo_optimization: {
      score: 92,
      passed: true,
      weight: 0.10,
      critique: 'Primary keyword naturally integrated into H1, lead paragraph, H2 headings, and frontmatter.',
      actionable_remediation: []
    },
    readability_formatting: {
      score: 95,
      passed: true,
      weight: 0.10,
      critique: 'Clear paragraph length, mathematical expressions formatted clearly, clean markdown tables.',
      actionable_remediation: []
    }
  },
  identified_issues: [],
  refinement_prompt_guidance: 'Article meets all institutional grade criteria. Approved for publication.'
};

export const SAMPLE_FAILING_EVALUATION: RubricEvaluationResult = {
  evaluation_timestamp: '2026-08-19T01:31:00.000Z',
  topic_slug: '01_ai_crypto_trading_bot',
  topic_index: 1,
  word_count_actual: 540,
  overall_score: 52.0,
  passed: false,
  hard_gates: {
    min_word_count_met: false,
    no_critical_factual_errors: true,
    no_hyperbolic_marketing_fluff: false,
    valid_markdown_hierarchy: false,
    no_llm_boilerplate_artifacts: true
  },
  dimension_scores: {
    institutional_tone: {
      score: 45,
      passed: false,
      weight: 0.25,
      critique: 'Contains retail hype words and promotional claims ("guaranteed 95% win rate").',
      actionable_remediation: [
        'Eliminate promotional language and replace with probabilistic risk analysis.',
        'Remove exclamation marks and hyperbolic claims.'
      ]
    },
    financial_crypto_accuracy: {
      score: 60,
      passed: false,
      weight: 0.25,
      critique: 'Superficial descriptions of trading strategies lacking microstructure or risk mechanics.',
      actionable_remediation: [
        'Add quantitative models for order book dynamics and execution latency.',
        'Explain adverse selection and market maker inventory risk.'
      ]
    },
    word_count_depth: {
      score: 35,
      passed: false,
      weight: 0.15,
      critique: 'Body word count is only 540 words, failing the 1,200 word minimum.',
      actionable_remediation: [
        'Expand technical sections to add 700+ words of quantitative depth.'
      ]
    },
    markdown_structure: {
      score: 65,
      passed: false,
      weight: 0.15,
      critique: 'Missing comparison matrix table and structured FAQ section.',
      actionable_remediation: [
        'Add comparison table contrasting statistical arbitrage vs market making.',
        'Add 3 technical FAQ entries.'
      ]
    },
    seo_optimization: {
      score: 70,
      passed: false,
      weight: 0.10,
      critique: 'Secondary keywords not integrated.',
      actionable_remediation: ['Include secondary LSI keywords.']
    },
    readability_formatting: {
      score: 70,
      passed: false,
      weight: 0.10,
      critique: 'Lacks technical sub-headings and code/math callouts.',
      actionable_remediation: ['Add LaTeX equations and ASCII architecture diagrams.']
    }
  },
  identified_issues: [
    {
      severity: 'fatal',
      dimension: 'word_count_depth',
      location: 'Full Document',
      issue_description: 'Word count (540) is below the mandatory 1,200-word threshold.',
      suggested_fix: 'Expand technical discussion across 5 distinct H2 sections to achieve >= 1,350 words.'
    },
    {
      severity: 'fatal',
      dimension: 'institutional_tone',
      location: 'Section 1',
      issue_description: 'Promotional hype and unrealistic win rate claims detected.',
      suggested_fix: 'Remove all claims of guaranteed profits; frame within risk-adjusted return paradigms.'
    }
  ],
  refinement_prompt_guidance: 'CRITICAL FIXES REQUIRED: 1) Expand body text from 540 to 1,400+ words. 2) Eliminate marketing hype and replace with rigorous institutional analysis. 3) Add a comparison table and 3 technical FAQs.'
};
