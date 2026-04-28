/**
 * Persona loader — extracts Ruggy's system prompt from the canonical
 * persona doc at `apps/bot/src/persona/ruggy.md`, substitutes the
 * runtime placeholders, and returns the system + user prompt pair.
 *
 * Placeholders the persona doc uses:
 *   {{CODEX_PRELUDE}}       — Mibera Codex llms.txt (loaded at runtime)
 *   {{ZONE_ID}}             — current zone (stonehenge / bear-cave / …)
 *   {{ZONE_DIGEST_JSON}}    — score-mcp ZoneDigest payload
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { ZoneId } from '../score/types.ts';
import { loadCodexPrelude } from '../score/codex-context.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PERSONA_PATH = resolve(__dirname, 'ruggy.md');

const SECTION_HEADER = '## System prompt template';

let cachedTemplate: string | null = null;

function loadTemplate(): string {
  if (cachedTemplate) return cachedTemplate;

  const raw = readFileSync(PERSONA_PATH, 'utf8');
  const sectionStart = raw.indexOf(SECTION_HEADER);
  if (sectionStart === -1) {
    throw new Error(`persona loader: could not find "${SECTION_HEADER}" in ruggy.md`);
  }

  const sectionBody = raw.slice(sectionStart);
  const fenceMatch = sectionBody.match(/^````([^\n]*)\n([\s\S]+?)\n````/m);
  if (!fenceMatch) {
    throw new Error('persona loader: could not extract fenced code block from system prompt section');
  }

  cachedTemplate = fenceMatch[2]!.trim();
  return cachedTemplate;
}

export function loadSystemPrompt(): string {
  return loadTemplate();
}

export interface BuildPromptArgs {
  zoneId: ZoneId;
  zoneDigestJson: string;
}

/**
 * Compose the system + user prompt pair for an LLM call.
 *
 * The placeholders are split between the two roles intentionally:
 *   • System prompt: identity + voice + zone awareness + codex prelude
 *   • User message: the runtime ZoneDigest payload
 *
 * This lets the system prompt stay cacheable while the user message
 * varies per call.
 */
export function buildPromptPair(args: BuildPromptArgs): {
  systemPrompt: string;
  userMessage: string;
} {
  const template = loadTemplate();
  const codex = loadCodexPrelude();

  // Substitute zone + codex into the system part. Split at the INPUT PAYLOAD
  // marker so the runtime data goes into the user message.
  const inputPayloadMarker = '═══ INPUT PAYLOAD ═══';
  const idx = template.indexOf(inputPayloadMarker);
  if (idx === -1) {
    throw new Error(`persona loader: could not find INPUT PAYLOAD marker in template`);
  }

  const systemHalf = template
    .slice(0, idx)
    .replace(/\{\{ZONE_ID\}\}/g, args.zoneId)
    .replace(/\{\{CODEX_PRELUDE\}\}/g, codex)
    .trimEnd();

  const userHalf = template
    .slice(idx)
    .replace(/\{\{ZONE_ID\}\}/g, args.zoneId)
    .replace(/\{\{ZONE_DIGEST_JSON\}\}/g, args.zoneDigestJson)
    .trim();

  return {
    systemPrompt: systemHalf,
    userMessage: userHalf,
  };
}
