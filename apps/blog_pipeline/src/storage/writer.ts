import fs from 'fs';
import path from 'path';
import { Topic, RubricEvaluationResult } from '../types.js';
import { stripFrontmatter, countWords } from '../rubric/deterministic.js';

export interface SavePostOptions {
  outputDir: string;
  evalDir?: string;
  topic: Topic;
  content: string;
  evaluation: RubricEvaluationResult;
  modelUsed?: string;
  statusOverride?: string;
}

export interface SaveResult {
  postPath: string;
  evalPath?: string;
  wordCount: number;
  score: number;
  status: 'approved' | 'needs_manual_review' | string;
}

/**
 * Generates canonical YAML frontmatter for an institutional Markdown blog post.
 * Merges topic metadata, search intent, word count, evaluation score, and approval status.
 */
export function formatFrontmatter(
  topic: Topic,
  content: string,
  evaluation: RubricEvaluationResult,
  modelUsed?: string
): string {
  // Strip any existing frontmatter from draft before attaching new canonical header
  const cleanBody = stripFrontmatter(content).trim();
  const wordCount = countWords(cleanBody);
  const isApproved = evaluation.passed && evaluation.overall_score >= 85;
  const status = isApproved ? 'approved' : 'needs_manual_review';
  const timestamp = evaluation.evaluation_timestamp || new Date().toISOString();

  const escapedTitle = topic.title.replace(/"/g, '\\"');
  const escapedKeyword = topic.primaryKeyword.replace(/"/g, '\\"');
  const escapedPillar = topic.pillarName.replace(/"/g, '\\"');
  const escapedPillarDesc = topic.pillarDescriptor.replace(/"/g, '\\"');

  const lines = [
    '---',
    `title: "${escapedTitle}"`,
    `slug: "${topic.slug}"`,
    `index: ${topic.index}`,
    `topic_index: ${topic.index}`,
    `primary_keyword: "${escapedKeyword}"`,
    `target_keyword: "${escapedKeyword}"`,
    `pillar_id: ${topic.pillarId}`,
    `pillar_name: "${escapedPillar}"`,
    `category: "${escapedPillar}"`,
    `pillar_descriptor: "${escapedPillarDesc}"`,
    `search_intent: "${topic.searchIntent}"`,
    `target_word_count: ${topic.targetWordCount || 1200}`,
    `word_count: ${wordCount}`,
    `evaluation_score: ${evaluation.overall_score}`,
    `rubric_score: ${evaluation.overall_score}`,
    `status: "${status}"`,
    !isApproved ? 'review_required: true' : null,
    `created_at: "${timestamp}"`,
    `updated_at: "${timestamp}"`,
    modelUsed ? `model_used: "${modelUsed}"` : null,
    '---',
    '',
    cleanBody
  ].filter((line) => line !== null);

  return lines.join('\n');
}

/**
 * Saves the evaluation audit trail JSON to the designated evaluation directory.
 * Writes with atomic temp file swap and recursive folder creation.
 */
export async function saveEvaluationAudit(
  evalDir: string,
  topic: Topic,
  evaluation: RubricEvaluationResult
): Promise<string> {
  await fs.promises.mkdir(evalDir, { recursive: true });

  const evalPath = path.join(evalDir, `${topic.slug}.eval.json`);
  const jsonContent = JSON.stringify(evaluation, null, 2);

  // Atomic write to avoid partial/corrupted writes
  const tempPath = `${evalPath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
  await fs.promises.writeFile(tempPath, jsonContent, 'utf-8');
  await fs.promises.rename(tempPath, evalPath);

  // Also write non-.eval format for convenience and cross-compatibility
  const altEvalPath = path.join(evalDir, `${topic.slug}.json`);
  if (altEvalPath !== evalPath) {
    try {
      await fs.promises.writeFile(altEvalPath, jsonContent, 'utf-8');
    } catch {
      // Non-fatal if secondary alias write fails
    }
  }

  return evalPath;
}

/**
 * Saves an approved (or fallback quarantined) post to disk as Markdown with frontmatter.
 * Ensures destination directory exists and uses atomic rename operations.
 */
export async function saveApprovedPost(options: SavePostOptions): Promise<SaveResult> {
  const { outputDir, evalDir, topic, content, evaluation, modelUsed } = options;

  await fs.promises.mkdir(outputDir, { recursive: true });

  const postPath = path.join(outputDir, `${topic.slug}.md`);
  const formattedPost = formatFrontmatter(topic, content, evaluation, modelUsed);
  const wordCount = countWords(formattedPost);
  const isApproved = evaluation.passed && evaluation.overall_score >= 85;
  const status = isApproved ? 'approved' : 'needs_manual_review';

  // Atomic write: write to temp file then rename
  const tempPath = `${postPath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
  await fs.promises.writeFile(tempPath, formattedPost, 'utf-8');
  await fs.promises.rename(tempPath, postPath);

  let evalPath: string | undefined;
  if (evalDir) {
    evalPath = await saveEvaluationAudit(evalDir, topic, evaluation);
  }

  return {
    postPath,
    evalPath,
    wordCount,
    score: evaluation.overall_score,
    status
  };
}

/**
 * Checks whether a topic has already been successfully generated, approved, and saved to disk.
 * Used for idempotency and resuming interrupted batch runs.
 */
export async function isPostAlreadyApproved(
  outputDir: string,
  topic: Topic,
  evalDir?: string
): Promise<boolean> {
  const postPath = path.join(outputDir, `${topic.slug}.md`);

  try {
    const stats = await fs.promises.stat(postPath);
    if (!stats.isFile()) return false;

    const fileContent = await fs.promises.readFile(postPath, 'utf-8');
    const words = countWords(fileContent);
    if (words < (topic.targetWordCount ? Math.min(topic.targetWordCount, 1200) : 1200)) {
      return false;
    }

    // Inspect frontmatter status
    if (fileContent.includes('review_required: true') || fileContent.includes('status: "needs_manual_review"')) {
      return false;
    }

    if (fileContent.includes('status: "approved"')) {
      // If evalDir is supplied, check if evaluation file also exists
      if (evalDir) {
        const evalPath1 = path.join(evalDir, `${topic.slug}.eval.json`);
        const evalPath2 = path.join(evalDir, `${topic.slug}.json`);
        const evalExists = fs.existsSync(evalPath1) || fs.existsSync(evalPath2);
        return evalExists;
      }
      return true;
    }

    return true;
  } catch {
    return false;
  }
}
