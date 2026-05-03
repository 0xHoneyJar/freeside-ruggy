/**
 * Grail-ref guard (V0.7-A.3 · spec §11.2 anti-hallucination validator).
 *
 * Post-process character reply text for grail references — `@g<digits>`
 * or `#<digits>` — and partition into valid (canonical/session) vs
 * invalid (unverified). The composer-side companion to the persona
 * instructions in spec §11.1: persona tells the LLM to cite literal
 * canonical refs; this guard catches the cases where it didn't.
 *
 * V1: warning-only — caller may append a footer when invalid.length > 0.
 * V1.5: stripping + character-side reinforcement (per spec §11.2).
 *
 * Canonical set source: codex MCP `list_archetypes` would be the
 * authoritative source if this codebase had a synchronous read against
 * it; for V1, we embed a curated set of refs that the spec + dogfood
 * captures explicitly named (operator-attested) plus structural counts
 * for the categories. This is honest about its scope: the V1 set is
 * intentionally conservative — refs NOT in this set fall to `invalid`,
 * which means new canonical grails will be flagged until either added
 * here OR passed via the `sessionRefs` override (refs returned by tool
 * results in the active session, which the caller can pre-collect).
 *
 * Per spec §11 the canonical 43 are categorized as:
 *   zodiac(12) + element(4) + planet(7) + luminary(2) + primordial(2)
 *   + ancestor(11) + concept(3) + community(1) + special(1) = 43
 *
 * V1.5 ROADMAP: replace CANONICAL_GRAIL_IDS with a startup-time fetch
 * from `mcp__codex__list_archetypes` (or similar) cached for process
 * lifetime. See bonfire/grimoires/bonfire/specs/build-env-aware-image-
 * composition-v07a3.md §11 V1.5 deferred.
 */

export interface GrailRefValidation {
  /** Refs that matched the canonical set OR a sessionRefs override. */
  valid: string[];
  /** Refs that didn't match either source. */
  invalid: string[];
}

/**
 * V1 hardcoded canonical grail ID set.
 *
 * Sources for inclusions:
 *   - 876   Black Hole (concept) — spec §0, §3, §4.4 reference
 *   - 4488  Satoshi-as-Hermes — apps/character-satoshi/codex-anchors.md
 *   - 235   Scorpio (zodiac) — spec §11 transformation regression
 *   - 6458  Fire (element) — spec §11 transformation regression
 *   - 4221  Past (concept) — MEMORY.md SC3 cite
 *   - 1606  Pluto (planet) — MEMORY.md SC2 cite
 *   - 6805  Aquarius (zodiac) — MEMORY.md SC2 cite
 *
 * All other canonical IDs MUST be passed via `sessionRefs` until V1.5
 * adds dynamic resolution. This is intentionally conservative — false
 * positives (canonical-but-unlisted-in-V1) DEGRADE to a warning footer,
 * not a strip; the behavior is observable but non-blocking.
 */
const CANONICAL_GRAIL_IDS = new Set<string>([
  '876',
  '4488',
  '235',
  '6458',
  '4221',
  '1606',
  '6805',
]);

/** Match `@g<digits>` (preferred citation form per spec §11.1). */
const REF_AT_PATTERN = /@g(\d+)/g;
/** Match `#<digits>` (alternative citation form per spec §11.2). */
const REF_HASH_PATTERN = /#(\d+)/g;

/**
 * Validate grail references in a character reply text.
 *
 * Refs are accepted as canonical when EITHER:
 *   - they're in the embedded V1 hardcoded set, OR
 *   - they're listed in `sessionRefs` (caller-supplied refs from the
 *     active session's tool results — bypasses the V1 conservative cap).
 *
 * Returns both lists in original-text order, deduplicated by full-ref
 * shape (so `@g876` and `#876` are distinct entries even though they
 * resolve to the same grail — citation form carries voice register).
 */
export function validateGrailRefs(
  text: string,
  sessionRefs?: string[],
): GrailRefValidation {
  const sessionSet = new Set<string>(
    (sessionRefs ?? []).map((r) => r.replace(/^[@#]g?/, '')),
  );

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(REF_AT_PATTERN)) {
    const fullRef = match[0]!;
    if (seen.has(fullRef)) continue;
    seen.add(fullRef);
    const id = match[1]!;
    if (CANONICAL_GRAIL_IDS.has(id) || sessionSet.has(id)) {
      valid.push(fullRef);
    } else {
      invalid.push(fullRef);
    }
  }

  for (const match of text.matchAll(REF_HASH_PATTERN)) {
    const fullRef = match[0]!;
    if (seen.has(fullRef)) continue;
    seen.add(fullRef);
    const id = match[1]!;
    if (CANONICAL_GRAIL_IDS.has(id) || sessionSet.has(id)) {
      valid.push(fullRef);
    } else {
      invalid.push(fullRef);
    }
  }

  return { valid, invalid };
}

/**
 * Composer-side post-processing footer (V1: warning-only). Appended to
 * reply text when `invalid.length > 0`. V1.5: strip the unverified refs
 * and reinforce persona instruction (spec §11.2 deferred).
 *
 * Footer surface chosen to be (a) operator-readable in trajectory logs,
 * (b) low-friction for end users (not gated; just labeled), (c) parseable
 * by any future analytics pass mining unverified refs as V1.5 corpus
 * expansion candidates.
 */
export const GRAIL_REF_GUARD_FOOTER =
  '\n\n_[KEEPER: contains unverified ref(s) · captured for V1.5 corpus signal]_';

/**
 * Apply the validator and append a warning footer when warranted.
 * Returns the original text unchanged when all refs are valid (or no
 * refs surfaced at all).
 */
export function appendGrailRefGuardFooter(
  text: string,
  sessionRefs?: string[],
): { text: string; validation: GrailRefValidation } {
  const validation = validateGrailRefs(text, sessionRefs);
  if (validation.invalid.length === 0) {
    return { text, validation };
  }
  return { text: text + GRAIL_REF_GUARD_FOOTER, validation };
}
