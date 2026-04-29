/**
 * In-Context Exemplar (ICE) loader for Ruggy's voice.
 *
 * Per Gemini research 2026-04-28: rule-based persona prompts trigger
 * RLHF-default-assistant register. ICE bypasses this by injecting 3-5
 * past high-quality posts into the LLM context — the model matches the
 * exemplars' token-probability distribution rather than following rules.
 *
 * This loader scans `exemplars/<post_type>/*.md` and returns up to N
 * exemplar bodies (frontmatter stripped) to inject into the prompt.
 *
 * Empty folder = ICE skipped (falls back to rule-based guidance).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PostType } from '../llm/post-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXEMPLARS_DIR = resolve(__dirname, 'exemplars');

const DEFAULT_MAX_EXEMPLARS = 5;

export interface Exemplar {
  /** filename slug (e.g., "2026-04-28-stonehenge-real") */
  slug: string;
  /** body text (frontmatter stripped) */
  body: string;
}

const cache = new Map<PostType, Exemplar[]>();

/**
 * Load all exemplars for a given post type from disk.
 * Cached after first call; restart bot to reload.
 */
export function loadExemplars(postType: PostType): Exemplar[] {
  if (cache.has(postType)) return cache.get(postType)!;

  const dir = join(EXEMPLARS_DIR, postType);
  let files: string[];
  try {
    const stat = statSync(dir);
    if (!stat.isDirectory()) {
      cache.set(postType, []);
      return [];
    }
    files = readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('.') && f !== 'README.md');
  } catch {
    cache.set(postType, []);
    return [];
  }

  const exemplars: Exemplar[] = files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const raw = readFileSync(join(dir, filename), 'utf8');
    return {
      slug,
      body: stripFrontmatter(raw).trim(),
    };
  });

  cache.set(postType, exemplars);
  return exemplars;
}

/**
 * Pick up to N exemplars for ICE injection. Random selection when more
 * than N available — variety across calls keeps the model from
 * over-fitting to a specific exemplar's quirks.
 */
export function selectExemplars(
  postType: PostType,
  max: number = DEFAULT_MAX_EXEMPLARS,
): Exemplar[] {
  const all = loadExemplars(postType);
  if (all.length <= max) return all;

  // Fisher-Yates shuffle, take first N
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, max);
}

/**
 * Build the ICE block for injection into the system prompt. Returns
 * empty string if no exemplars exist for the post type.
 */
export function buildExemplarBlock(postType: PostType): string {
  const exemplars = selectExemplars(postType);
  if (exemplars.length === 0) return '';

  const numbered = exemplars
    .map((ex, i) => `── EXEMPLAR ${i + 1} (${ex.slug}) ──\n${ex.body}`)
    .join('\n\n');

  return [
    '═══ VOICE EXEMPLARS — past Ruggy posts in the voice we want ═══',
    'These are REAL past posts. You are writing in this voice. Match the',
    'cadence, register, and rhythm — NOT the specific content. The voice is',
    'in HOW these read; your job is to write a NEW post about the data below',
    'in the same way these were written.',
    '',
    numbered,
    '',
    '═══ END EXEMPLARS ═══',
  ].join('\n');
}

/** Strip optional `--- ... ---` YAML frontmatter from an exemplar file. */
function stripFrontmatter(raw: string): string {
  if (!raw.startsWith('---\n')) return raw;
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return raw;
  return raw.slice(end + 5);
}

export function exemplarStats(): Record<PostType, number> {
  const types: PostType[] = ['digest', 'micro', 'weaver', 'lore_drop', 'question', 'callout'];
  return Object.fromEntries(types.map((t) => [t, loadExemplars(t).length])) as Record<PostType, number>;
}
