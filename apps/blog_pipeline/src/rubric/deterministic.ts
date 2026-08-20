/**
 * Deterministic Pre-Check and Markdown Structural Analysis Engine.
 * Provides zero-latency local validation for word counts, frontmatter, and heading hierarchy.
 */

export interface MarkdownStructureResult {
  hasFrontmatter: boolean;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  tableCount: number;
  hasFaq: boolean;
  hasDisclaimer: boolean;
  isValidHierarchy: boolean;
  headings: Array<{ level: number; text: string; line: number }>;
  errors: string[];
}

export interface DeterministicPreCheckResult {
  passed: boolean;
  wordCount: number;
  wordCountPassed: boolean;
  structurePassed: boolean;
  structure: MarkdownStructureResult;
  errors: string[];
}

/**
 * Strips YAML frontmatter block from Markdown text.
 */
export function stripFrontmatter(markdown: string): string {
  if (!markdown) return '';
  const trimmed = markdown.trimStart();
  if (trimmed.startsWith('---')) {
    const endIdx = trimmed.indexOf('\n---', 3);
    if (endIdx !== -1) {
      return trimmed.slice(endIdx + 4).trim();
    }
  }
  return markdown.trim();
}

/**
 * Extracts and parses YAML frontmatter as key-value pairs.
 */
export function extractFrontmatter(markdown: string): Record<string, any> {
  if (!markdown) return {};
  const trimmed = markdown.trimStart();
  if (!trimmed.startsWith('---')) return {};

  const endIdx = trimmed.indexOf('\n---', 3);
  if (endIdx === -1) return {};

  const frontmatterStr = trimmed.slice(3, endIdx).trim();
  const lines = frontmatterStr.split('\n');
  const result: Record<string, any> = {};

  let currentKey = '';
  let inArray = false;
  let arrayValues: string[] = [];

  for (const line of lines) {
    const rawTrimmed = line.trim();
    if (!rawTrimmed || rawTrimmed.startsWith('#')) continue;

    if (inArray) {
      if (rawTrimmed.startsWith('- ')) {
        const item = rawTrimmed.slice(2).replace(/^["']|["']$/g, '').trim();
        arrayValues.push(item);
        continue;
      } else {
        result[currentKey] = arrayValues;
        inArray = false;
        arrayValues = [];
      }
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();

      if (val === '') {
        currentKey = key;
        inArray = true;
        arrayValues = [];
      } else {
        let parsedVal: any = val.replace(/^["']|["']$/g, '');
        if (parsedVal === 'true') parsedVal = true;
        else if (parsedVal === 'false') parsedVal = false;
        else if (!isNaN(Number(parsedVal)) && parsedVal !== '') parsedVal = Number(parsedVal);
        result[key] = parsedVal;
      }
    }
  }

  if (inArray && currentKey) {
    result[currentKey] = arrayValues;
  }

  return result;
}

/**
 * Alias for extractFrontmatter returning both metadata and stripped body.
 */
export function parseFrontmatter(markdown: string): {
  data: Record<string, any>;
  content: string;
  hasFrontmatter: boolean;
} {
  const data = extractFrontmatter(markdown);
  const content = stripFrontmatter(markdown);
  const hasFrontmatter = Object.keys(data).length > 0;
  return { data, content, hasFrontmatter };
}

/**
 * Robust word counter excluding frontmatter, code fences, and punctuation tokens.
 */
export function countWords(markdown: string): number {
  if (!markdown) return 0;
  const body = stripFrontmatter(markdown);
  
  // Remove markdown code fences, inline code, and syntax delimiters
  const cleanBody = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#*`_~>[\]()|\\+=$-]/g, ' ')
    .trim();

  if (!cleanBody) return 0;
  const words = cleanBody.split(/\s+/).filter((w) => w.length > 0);
  return words.length;
}

/**
 * Validates markdown structural components, heading hierarchy, tables, FAQ, and disclaimers.
 */
export function validateMarkdownStructure(markdown: string): MarkdownStructureResult {
  const errors: string[] = [];
  const hasFrontmatter = markdown.trimStart().startsWith('---') && markdown.indexOf('\n---', 3) !== -1;

  const lines = markdown.split('\n');
  const headings: Array<{ level: number; text: string; line: number }> = [];
  let tableCount = 0;
  let hasFaq = false;
  let hasDisclaimer = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        headings.push({ level, text, line: i + 1 });

        const lower = text.toLowerCase();
        if (lower.includes('frequently asked questions') || lower.includes('faq') || lower.includes('faqs')) {
          hasFaq = true;
        }
      }
    }

    if (
      line.includes('| --- |') ||
      line.includes('|:---|') ||
      line.includes('|:---:|') ||
      line.includes('|---:|') ||
      line.includes('| :--- |') ||
      line.includes('| :---: |') ||
      line.includes('| ---: |')
    ) {
      tableCount++;
    }

    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes('disclaimer') ||
      lowerLine.includes('risk disclosure') ||
      lowerLine.includes('does not constitute financial') ||
      lowerLine.includes('educational purposes only')
    ) {
      hasDisclaimer = true;
    }
  }

  const h1List = headings.filter((h) => h.level === 1);
  const h2List = headings.filter((h) => h.level === 2);
  const h3List = headings.filter((h) => h.level === 3);

  if (h1List.length !== 1) {
    errors.push(`Expected exactly 1 H1 heading, found ${h1List.length}`);
  }

  if (h2List.length < 4) {
    errors.push(`Expected at least 4 H2 headings, found ${h2List.length}`);
  }

  // Hierarchy check: No heading should jump levels (e.g., H1 -> H3 without H2)
  let isValidHierarchy = true;
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level;
    const curr = headings[i].level;
    if (curr > prev + 1) {
      isValidHierarchy = false;
      errors.push(`Invalid heading jump from H${prev} to H${curr} at line ${headings[i].line} ("${headings[i].text}")`);
    }
  }

  return {
    hasFrontmatter,
    h1Count: h1List.length,
    h2Count: h2List.length,
    h3Count: h3List.length,
    tableCount,
    hasFaq,
    hasDisclaimer,
    isValidHierarchy: isValidHierarchy && h1List.length === 1 && h2List.length >= 4,
    headings,
    errors
  };
}

/**
 * Fast deterministic pre-check combining word count and structure validation.
 */
export function deterministicPreCheck(
  markdown: string,
  minWordCount = 1200
): DeterministicPreCheckResult {
  const wordCount = countWords(markdown);
  const structure = validateMarkdownStructure(markdown);

  const wordCountPassed = wordCount >= minWordCount;
  const structurePassed = structure.isValidHierarchy && structure.h1Count === 1 && structure.h2Count >= 4;

  const errors: string[] = [...structure.errors];
  if (!wordCountPassed) {
    errors.push(`Body word count (${wordCount}) is below the required minimum (${minWordCount})`);
  }

  return {
    passed: wordCountPassed && structurePassed,
    wordCount,
    wordCountPassed,
    structurePassed,
    structure,
    errors
  };
}
