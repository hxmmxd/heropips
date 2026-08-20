import { z } from 'zod';

// ==========================================
// 1. Search Intent Types & Schema
// ==========================================

export const SearchIntentSchema = z.enum([
  'Transactional',
  'Educational',
  'Informational',
  'Commercial'
]);

export type SearchIntent = z.infer<typeof SearchIntentSchema>;

// ==========================================
// 2. Topic & Pillar Types & Schema
// ==========================================

export const TopicSchema = z.object({
  index: z.number().int().min(1).max(50),
  pillarId: z.number().int().min(1).max(5),
  pillarName: z.string().min(1),
  pillarDescriptor: z.string().min(1),
  pillarDescription: z.string().min(1),
  primaryKeyword: z.string().min(1),
  title: z.string().min(1),
  searchIntent: SearchIntentSchema,
  slug: z.string().min(1),
  targetWordCount: z.number().int().positive().default(1200)
});

export type Topic = z.infer<typeof TopicSchema>;

export const PillarSchema = z.object({
  id: z.number().int().min(1).max(5),
  name: z.string().min(1),
  descriptor: z.string().min(1),
  description: z.string().min(1),
  topics: z.array(TopicSchema)
});

export type Pillar = z.infer<typeof PillarSchema>;

export const TopicCatalogSchema = z.object({
  documentTitle: z.string().min(1),
  totalTopics: z.number().int().min(1),
  pillars: z.array(PillarSchema),
  allTopics: z.array(TopicSchema)
});

export type TopicCatalog = z.infer<typeof TopicCatalogSchema>;

// ==========================================
// 3. Rubric & Evaluation Types & Schema
// ==========================================

export const DimensionScoreSchema = z.object({
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(100),
  critique: z.string(),
  passed: z.boolean().optional(),
  actionable_remediation: z.array(z.string()).optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional()
});

export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

export const HardGatesSchema = z.object({
  min_word_count_met: z.boolean(),
  no_critical_factual_errors: z.boolean(),
  no_hyperbolic_marketing_fluff: z.boolean(),
  valid_markdown_hierarchy: z.boolean(),
  no_llm_boilerplate_artifacts: z.boolean()
});

export type HardGates = z.infer<typeof HardGatesSchema>;

export const IdentifiedIssueSchema = z.object({
  severity: z.enum(['fatal', 'major', 'minor']),
  dimension: z.string(),
  location: z.string(),
  issue_description: z.string(),
  suggested_fix: z.string()
});

export type IdentifiedIssue = z.infer<typeof IdentifiedIssueSchema>;

export const RubricEvaluationResultSchema = z.object({
  evaluation_timestamp: z.string(),
  topic_slug: z.string(),
  topic_index: z.number().int(),
  word_count_actual: z.number().int().nonnegative(),
  overall_score: z.number().min(0).max(100),
  passed: z.boolean(),
  hard_gates: HardGatesSchema,
  dimension_scores: z.object({
    institutional_tone: DimensionScoreSchema,
    financial_crypto_accuracy: DimensionScoreSchema,
    word_count_depth: DimensionScoreSchema,
    markdown_structure: DimensionScoreSchema,
    seo_optimization: DimensionScoreSchema,
    readability_formatting: DimensionScoreSchema
  }),
  identified_issues: z.array(IdentifiedIssueSchema),
  refinement_prompt_guidance: z.string()
});

export type RubricEvaluationResult = z.infer<typeof RubricEvaluationResultSchema>;

// ==========================================
// 4. Frontmatter Metadata Types & Schema
// ==========================================

export const FrontmatterMetadataSchema = z.object({
  title: z.string(),
  slug: z.string(),
  topic_index: z.number().int(),
  pillar_id: z.number().int(),
  pillar_name: z.string(),
  primary_keyword: z.string(),
  search_intent: SearchIntentSchema,
  target_audience: z.string().optional(),
  estimated_reading_time_minutes: z.number().int().positive().optional(),
  word_count: z.number().int().positive().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  rubric_score: z.number().optional(),
  tags: z.array(z.string()).optional()
});

export type FrontmatterMetadata = z.infer<typeof FrontmatterMetadataSchema>;

// ==========================================
// 5. LLM Client & Generation Options Schema
// ==========================================

export const GenerationOptionsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  jsonMode: z.boolean().optional()
});

export type GenerationOptions = z.infer<typeof GenerationOptionsSchema>;

export interface LlmClient {
  generateContent(prompt: string, options?: GenerationOptions): Promise<string>;
}

// ==========================================
// 6. Pipeline Configuration Types & Schema
// ==========================================

export const PipelineConfigSchema = z.object({
  geminiApiKey: z.string().optional(),
  geminiModel: z.string().default('gemini-2.5-flash'),
  concurrency: z.number().int().positive().default(2),
  maxRetries: z.number().int().nonnegative().default(3),
  requestDelayMs: z.number().int().nonnegative().default(1500),
  mockLlm: z.boolean().default(false),
  topicsFilePath: z.string().default('data/seo_50_blog_topics.md'),
  outputDir: z.string().default('output'),
  evalDir: z.string().default('.evaluations'),
  targetTopicIndex: z.number().int().positive().optional(),
  targetPillarId: z.number().int().positive().optional(),
  targetSlug: z.string().optional(),
  force: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  runAll: z.boolean().default(false)
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

