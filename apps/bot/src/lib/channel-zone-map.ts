/**
 * channel-zone-map — canonical channel↔zone reverse map (Sprint 1 / Phase B).
 *
 * The forward direction (`zone → channelId`) lives at
 * `packages/persona-engine/src/config.ts:166-177` (`getZoneChannelId`). The
 * reverse direction (`channelId → ZoneId`) was missing — without it, no chat
 * handler could answer "which codex location am I in?" without a hand-rolled
 * lookup. This module fills that gap.
 *
 * Pure TypeScript, no runtime deps. Both functions are pure and synchronous.
 *
 * Spec: grimoires/loa/specs/build-environment-substrate-v07a1.md (Phase B)
 */

import type { Config, ZoneId } from '@freeside-characters/persona-engine';
import {
  ALL_ZONES,
  ZONE_FLAVOR,
  getZoneChannelId,
} from '@freeside-characters/persona-engine';

/**
 * Resolve a Discord channel ID to its codex zone, if any.
 *
 * Delegates to `getZoneChannelId` in a single-pass scan over `ALL_ZONES` so
 * the forward map (config.ts) stays the single source of truth. If a future
 * env-key rename happens, only `getZoneChannelId` needs updating.
 *
 * Returns `undefined` for channels outside the four codex-mapped zones.
 */
export function getZoneForChannel(config: Config, channelId: string): ZoneId | undefined {
  return ALL_ZONES.find((zone) => getZoneChannelId(config, zone) === channelId);
}

/**
 * Return zone metadata (emoji + display name + dimension) for prompt-block
 * grounding. Sync read from `ZONE_FLAVOR` in `score/types.ts`.
 *
 * Task 1.2 decision (V1): sync constant. The async-MCP variant
 * (codex-mcp `lookup_zone`) becomes available only once chat-mode wires
 * through the orchestrator (Phase D / Sprint 3); until then, `ZONE_FLAVOR`
 * is the canonical zone-anchor source. When codex-mcp lands as a chat-mode
 * tool, callers can choose to refine this metadata at compose time —
 * environment.ts will own that decision; this accessor stays sync.
 */
export function getCodexAnchorForZone(
  zone: ZoneId,
): { name: string; dimension: string; emoji: string } {
  return ZONE_FLAVOR[zone];
}
