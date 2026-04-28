/**
 * Discord embed builder for per-zone weekly digests.
 *
 * Per persona "Discord-as-Material" rules:
 * - ALWAYS populate `message.content` as graceful fallback
 * - Sidebar color carries direction (or zone-flavored)
 * - Footer in subtext for muted metadata
 * - One embed per post (lean, no thumbnails, no author)
 */

import type { ZoneDigest, ZoneId } from '../score/types.ts';
import { ZONE_FLAVOR } from '../score/types.ts';
import { escapeDiscordMarkdown } from './sanitize.ts';

const DIRECTION_COLORS = {
  green: 0x2ecc71,
  red: 0xe74c3c,
  gray: 0x95a5a6,
  yellow: 0xf39c12,
} as const;

/** Per-zone signature colors (used when direction is flat/unknown) */
const ZONE_COLORS: Record<ZoneId, number> = {
  stonehenge: 0x808890, // weathered stone gray
  'bear-cave': 0x9b6a3f, // warm cave brown
  'el-dorado': 0xc9a44c, // muted gold
  'owsley-lab': 0x6f4ea1, // owsley purple (acid-house lineage)
};

export interface DigestPayload {
  content: string;
  embeds: DiscordEmbed[];
}

export interface DiscordEmbed {
  color?: number;
  description?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
}

export function buildZoneEmbedPayload(
  digest: ZoneDigest,
  voice: string,
): DigestPayload {
  const flavor = ZONE_FLAVOR[digest.zone];
  const stats = digest.raw_stats;

  // Direction inferred from spotlight + climbers
  const hasSpike = stats.spotlight !== null || stats.factor_trends.some((t) => t.multiplier > 2);
  const isThin = !digest.narrative && digest.narrative_error !== null;
  const hasDrops = stats.rank_changes.dropped.length > 0;

  const color = isThin
    ? DIRECTION_COLORS.yellow
    : hasSpike
      ? DIRECTION_COLORS.green
      : hasDrops && stats.rank_changes.climbed.length === 0
        ? DIRECTION_COLORS.red
        : ZONE_COLORS[digest.zone];

  // Plain-text fallback above embed (graceful degradation)
  const fallback = `${flavor.emoji} ${flavor.name} · ${stats.total_events} events · ${stats.active_wallets} wallets`;

  // Sanitize the LLM's voice output (escape underscores in identifiers etc.)
  const description = escapeDiscordMarkdown(voice);

  // Footer carries deterministic provenance
  const footerText = `computed at ${digest.computed_at} · score-mcp · zone:${digest.zone}`;

  return {
    content: fallback,
    embeds: [
      {
        color,
        description,
        footer: { text: footerText },
      },
    ],
  };
}
