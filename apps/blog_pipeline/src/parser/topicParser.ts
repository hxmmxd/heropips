import fs from 'fs';
import path from 'path';
import {
  SearchIntent,
  SearchIntentSchema,
  Topic,
  TopicSchema,
  Pillar,
  TopicCatalog,
  TopicCatalogSchema
} from '../types.js';

/**
 * Deterministically generates canonical slug for a topic.
 * Formula: {paddedIndex}_{snake_case(keyword)}
 * e.g. (1, "AI crypto trading bot") -> "01_ai_crypto_trading_bot"
 * e.g. (36, "EUR/USD trading strategy") -> "36_eur_usd_trading_strategy"
 */
export function generateCanonicalSlug(index: number, primaryKeyword: string): string {
  const paddedIndex = String(index).padStart(2, '0');
  const cleanKeyword = primaryKeyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${paddedIndex}_${cleanKeyword}`;
}

/**
 * Loads markdown content from a file path or returns the raw content string.
 */
function resolveMarkdownContent(filePathOrContent: string): string {
  if (typeof filePathOrContent !== 'string') {
    throw new Error('Expected file path or markdown content string.');
  }

  // If it contains newlines and headers, or doesn't exist as a file, treat as content if file read fails
  try {
    if (fs.existsSync(filePathOrContent) && fs.statSync(filePathOrContent).isFile()) {
      return fs.readFileSync(filePathOrContent, 'utf-8');
    }
  } catch {
    // Fall back to direct content
  }

  return filePathOrContent;
}

/**
 * Parses markdown strategy document into a structured TopicCatalog.
 */
export function parseBlogCatalog(filePathOrContent: string): TopicCatalog {
  const rawContent = resolveMarkdownContent(filePathOrContent);
  const lines = rawContent.split('\n');

  let documentTitle = 'Master SEO Content Strategy: The Road to 100k Daily Traffic';
  const pillarsMap = new Map<number, Pillar>();
  const allTopics: Topic[] = [];

  let currentPillarId = 0;
  let currentPillarName = '';
  let currentPillarDescriptor = '';
  let currentPillarDescription = '';

  const pillarHeadingRegex = /^##\s*Pillar\s*(\d+)\s*:\s*([^(]+?)(?:\s*\((.*?)\))?$/i;
  const h1Regex = /^#\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // 1. Detect Document H1 Title
    const h1Match = line.match(h1Regex);
    if (h1Match && !line.startsWith('##')) {
      documentTitle = h1Match[1].trim();
      continue;
    }

    // 2. Detect Pillar Header: ## Pillar <N>: <Name> (<Descriptor>)
    const pillarMatch = line.match(pillarHeadingRegex);
    if (pillarMatch) {
      currentPillarId = parseInt(pillarMatch[1], 10);
      currentPillarName = pillarMatch[2].trim();
      currentPillarDescriptor = (pillarMatch[3] || '').trim();
      currentPillarDescription = '';

      // Look ahead for italicized summary: *<Description>*
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('*') && nextLine.endsWith('*') && nextLine.length > 2) {
          currentPillarDescription = nextLine.replace(/^\*+|\*+$/g, '').trim();
          break;
        }
        if (nextLine.startsWith('|') || nextLine.startsWith('##')) {
          break;
        }
      }

      if (!pillarsMap.has(currentPillarId)) {
        pillarsMap.set(currentPillarId, {
          id: currentPillarId,
          name: currentPillarName,
          descriptor: currentPillarDescriptor,
          description: currentPillarDescription,
          topics: []
        });
      }
      continue;
    }

    // 3. Detect Table Data Row: | # | Target Keyword | Blog Title | Search Intent |
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length >= 4) {
        const indexNum = parseInt(cells[0], 10);
        if (!isNaN(indexNum) && indexNum >= 1 && indexNum <= 50) {
          const primaryKeyword = cells[1];
          const title = cells[2];
          const rawIntent = cells[3];

          // Validate or coerce search intent
          const intentParsed = SearchIntentSchema.safeParse(rawIntent);
          const searchIntent: SearchIntent = intentParsed.success ? intentParsed.data : 'Informational';

          const topic: Topic = TopicSchema.parse({
            index: indexNum,
            pillarId: currentPillarId || Math.ceil(indexNum / 10),
            pillarName: currentPillarName || `Pillar ${Math.ceil(indexNum / 10)}`,
            pillarDescriptor: currentPillarDescriptor || '',
            pillarDescription: currentPillarDescription || '',
            primaryKeyword,
            title,
            searchIntent,
            slug: generateCanonicalSlug(indexNum, primaryKeyword),
            targetWordCount: 1200
          });

          allTopics.push(topic);

          const pillar = pillarsMap.get(topic.pillarId);
          if (pillar) {
            pillar.topics.push(topic);
          }
        }
      }
    }
  }

  // Sort topics by index
  allTopics.sort((a, b) => a.index - b.index);

  const pillars = Array.from(pillarsMap.values()).sort((a, b) => a.id - b.id);
  pillars.forEach(p => p.topics.sort((a, b) => a.index - b.index));

  const catalog: TopicCatalog = {
    documentTitle,
    totalTopics: allTopics.length,
    pillars,
    allTopics
  };

  return TopicCatalogSchema.parse(catalog);
}

/**
 * Parses markdown strategy document and returns all topics array.
 */
export function parseBlogTopics(filePathOrContent: string): Topic[] {
  const catalog = parseBlogCatalog(filePathOrContent);
  if (catalog.allTopics.length !== 50) {
    throw new Error(`Expected exactly 50 topics, but parsed ${catalog.allTopics.length}`);
  }
  return catalog.allTopics;
}

/**
 * Retrieves a pillar by its ID (1 to 5).
 */
export function getPillarById(catalog: TopicCatalog, pillarId: number): Pillar | undefined {
  return catalog.pillars.find(p => p.id === pillarId);
}

/**
 * Retrieves a topic by its numeric index (1 to 50).
 */
export function getTopicByIndex(topics: Topic[], index: number): Topic | undefined {
  return topics.find(t => t.index === index);
}

/**
 * Retrieves a topic by its canonical slug (e.g. "01_ai_crypto_trading_bot").
 */
export function getTopicBySlug(topics: Topic[], slug: string): Topic | undefined {
  return topics.find(t => t.slug === slug);
}
