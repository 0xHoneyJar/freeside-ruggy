/**
 * Score-MCP contract types — mirrors zerker's `feature/score-mcp` branch
 * at score-api/src/mcp/schemas/raw-stats.ts (RAW_STATS_SCHEMA_VERSION 1.0.0).
 *
 * These types are kept in sync until the score-vault repo lands and we can
 * import from `@score-vault/ports`. Until then, these mirror what zerker's
 * MCP server returns from `get_zone_digest`.
 */

export const RAW_STATS_SCHEMA_VERSION = '1.0.0';

// ──────────────────────────────────────────────────────────────────────
// Zones (festival metaphor — zerker's flavor choice)
// ──────────────────────────────────────────────────────────────────────

export type ZoneId = 'stonehenge' | 'bear-cave' | 'el-dorado' | 'owsley-lab';
export type DimensionId = 'og' | 'nft' | 'onchain';
export type ZoneDimension = DimensionId | 'overall';

export const ZONE_IDS: readonly ZoneId[] = [
  'stonehenge',
  'bear-cave',
  'el-dorado',
  'owsley-lab',
] as const;

export const ZONE_TO_DIMENSION = {
  stonehenge: 'overall',
  'bear-cave': 'og',
  'el-dorado': 'nft',
  'owsley-lab': 'onchain',
} as const satisfies Record<ZoneId, ZoneDimension>;

export const ZONE_FLAVOR = {
  stonehenge: { emoji: '🗿', name: 'stonehenge', dimension: 'overall' },
  'bear-cave': { emoji: '🐻', name: 'bear-cave', dimension: 'og' },
  'el-dorado': { emoji: '⛏️', name: 'el-dorado', dimension: 'nft' },
  'owsley-lab': { emoji: '🧪', name: 'owsley-lab', dimension: 'onchain' },
} as const satisfies Record<ZoneId, { emoji: string; name: string; dimension: ZoneDimension }>;

export function isZoneId(value: unknown): value is ZoneId {
  return typeof value === 'string' && (ZONE_IDS as readonly string[]).includes(value);
}

// ──────────────────────────────────────────────────────────────────────
// raw_stats v1.0.0 (mirrors score-api raw-stats.ts)
// ──────────────────────────────────────────────────────────────────────

export interface TopMover {
  wallet: string;        // 0x[40 hex chars]
  rank_delta: number;    // signed int
  dimension: DimensionId;
  prior_rank: number | null;
  current_rank: number | null;
  ens?: string;
}

export interface Spotlight {
  wallet: string;
  reason: 'rank_climb' | 'new_badge';
  details: Record<string, unknown>;
}

export interface FactorTrend {
  factor_id: string;     // 'og:sets', 'nft:mibera', 'onchain:lp_provide'
  current_count: number;
  baseline_avg: number;
  multiplier: number;    // current vs baseline
}

export interface RecentEvent {
  event_id: string;      // uuid
  wallet: string;
  factor_id: string;
  raw_value: number;
  timestamp: string;     // ISO-8601
}

export interface RankChanges {
  climbed: TopMover[];
  dropped: TopMover[];
  entered_top_tier: TopMover[];
  exited_top_tier: TopMover[];
}

export interface RawStats {
  schema_version: '1.0.0';
  total_events: number;
  active_wallets: number;
  top_movers: TopMover[];
  top_events: RecentEvent[];
  spotlight: Spotlight | null;
  rank_changes: RankChanges;
  factor_trends: FactorTrend[];
}

// ──────────────────────────────────────────────────────────────────────
// Narrative shape (score-analyst's pre-written measured voice)
// ──────────────────────────────────────────────────────────────────────

export type NarrativeSectionKind = 'movers' | 'spotlight' | 'trend';

export interface NarrativeSection {
  kind: NarrativeSectionKind;
  body: string;          // ≤80 words, may contain {{stats.<path>}} placeholders post-substituted
}

export interface NarrativeShape {
  headline: string;      // ≤100 chars
  sections: NarrativeSection[];
}

// ──────────────────────────────────────────────────────────────────────
// MCP tool: get_zone_digest response
// ──────────────────────────────────────────────────────────────────────

export interface ZoneDigest {
  zone: ZoneId;
  window: 'weekly';
  computed_at: string;            // ISO-8601
  window_start: string;
  window_end: string;
  stale: boolean;
  schema_version: string;
  /** Score-analyst's first-pass narrative — already number-substituted, fact-checked */
  narrative: NarrativeShape | null;
  narrative_error?: string | null;
  narrative_error_hint?: string | null;
  /** Deterministic data; ruggy can cite anything here without inventing */
  raw_stats: RawStats;
}

// ──────────────────────────────────────────────────────────────────────
// MCP tool: get_zone_digest input
// ──────────────────────────────────────────────────────────────────────

export interface GetZoneDigestArgs {
  zone: ZoneId;
  window?: 'weekly';
}
