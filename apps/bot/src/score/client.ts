/**
 * Score-MCP client — calls zerker's `get_zone_digest` tool over MCP.
 *
 * Routing:
 *   STUB_MODE=true       → generate synthetic ZoneDigest (no MCP needed)
 *   MCP_KEY set          → real MCP call to {SCORE_API_URL}/mcp
 *
 * MCP transport is StreamableHTTP (per @modelcontextprotocol/sdk). For V1
 * we POST a single JSON-RPC envelope with the tool call — keeps deps minimal
 * until we add the SDK proper. Session reuse + GC are server-side.
 */

import type { Config } from '../config.ts';
import type { ZoneDigest, ZoneId, RawStats, NarrativeShape } from './types.ts';
import { ZONE_TO_DIMENSION } from './types.ts';

export async function fetchZoneDigest(
  config: Config,
  zone: ZoneId,
): Promise<ZoneDigest> {
  if (config.STUB_MODE && !config.MCP_KEY) {
    return generateStubZoneDigest(zone);
  }

  if (!config.MCP_KEY) {
    throw new Error(
      'MCP_KEY required for live score-mcp calls; or set STUB_MODE=true for synthetic data',
    );
  }

  // V1 minimal MCP call — JSON-RPC tool invocation over HTTP.
  // Each request is a fresh "initialize → tools/call" pair (server handles
  // per-session state). When the @modelcontextprotocol/sdk dependency lands,
  // swap this for StreamableHTTPClientTransport.
  const url = `${config.SCORE_API_URL}/mcp`;
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get_zone_digest',
      arguments: { zone, window: 'weekly' },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-MCP-Key': config.MCP_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`score-mcp error: ${response.status} ${await response.text()}`);
  }

  const envelope = (await response.json()) as {
    result?: { content?: Array<{ type: string; text?: string }> };
    error?: unknown;
  };

  if (envelope.error) {
    throw new Error(`score-mcp tool error: ${JSON.stringify(envelope.error)}`);
  }

  const text = envelope.result?.content?.[0]?.text;
  if (!text) {
    throw new Error('score-mcp returned empty content');
  }

  return JSON.parse(text) as ZoneDigest;
}

// ──────────────────────────────────────────────────────────────────────
// Stub generator — synthetic ZoneDigest matching zerker's schema
// ──────────────────────────────────────────────────────────────────────

export function generateStubZoneDigest(zone: ZoneId): ZoneDigest {
  const now = Date.now();
  const dow = new Date(now).getUTCDay();
  const dimension = ZONE_TO_DIMENSION[zone];

  // Vary shape by day-of-week for predictable test variance
  // Sun=normal · Mon=quiet · Tue=spike · Wed=thin
  const shapes: Record<number, ShapeSpec> = {
    0: { multiplier: 1, label: 'normal', notable: 1, climbers: 1, narrative: true },
    1: { multiplier: 0.1, label: 'quiet', notable: 0, climbers: 0, narrative: true },
    2: { multiplier: 4.5, label: 'spike', notable: 3, climbers: 3, narrative: true },
    3: { multiplier: 0.2, label: 'thin', notable: 0, climbers: 0, narrative: false }, // narrative_error
  };
  const shape = shapes[dow] ?? shapes[0]!;

  // Per-zone factor mix (lighter on stonehenge cross-zone, focused on the others)
  const factorBaselines: Record<ZoneId, Array<{ factor_id: string; baseline: number }>> = {
    stonehenge: [
      { factor_id: 'og:sets', baseline: 38 },
      { factor_id: 'nft:mibera', baseline: 51 },
      { factor_id: 'onchain:lp_provide', baseline: 24 },
      { factor_id: 'nft:honeycomb', baseline: 18 },
    ],
    'bear-cave': [
      { factor_id: 'og:sets', baseline: 38 },
      { factor_id: 'og:henlocked', baseline: 22 },
      { factor_id: 'og:cubquests', baseline: 17 },
    ],
    'el-dorado': [
      { factor_id: 'nft:mibera', baseline: 51 },
      { factor_id: 'nft:honeycomb', baseline: 18 },
      { factor_id: 'nft:gen3', baseline: 12 },
    ],
    'owsley-lab': [
      { factor_id: 'onchain:lp_provide', baseline: 24 },
      { factor_id: 'onchain:liquid_backing', baseline: 15 },
      { factor_id: 'onchain:shadow_minter', baseline: 8 },
    ],
  };

  const factors = factorBaselines[zone];

  const factorTrends = factors.map((f) => ({
    factor_id: f.factor_id,
    current_count: Math.floor(f.baseline * shape.multiplier),
    baseline_avg: f.baseline,
    multiplier: shape.multiplier,
  }));

  const totalEvents = factorTrends.reduce((s, t) => s + t.current_count, 0);
  const activeWallets = Math.max(1, Math.floor(totalEvents * 0.22));

  const climbed = Array.from({ length: shape.climbers }, (_, i) => ({
    wallet: synthAddress(i, 'climb'),
    rank_delta: 30 + i * 12,
    dimension: dimension === 'overall' ? 'og' : (dimension as 'og' | 'nft' | 'onchain'),
    prior_rank: 84 - i * 20,
    current_rank: 41 - i * 15,
  }));

  const topEvents = factorTrends.flatMap((trend, i) =>
    Array.from({ length: Math.min(2, trend.current_count) }, (_, j) => ({
      event_id: synthUUID(i, j),
      wallet: synthAddress(i + j, 'event'),
      factor_id: trend.factor_id,
      raw_value: 1 + j,
      timestamp: new Date(now - (i * 3600 + j * 600) * 1000).toISOString(),
    })),
  );

  const rawStats: RawStats = {
    schema_version: '1.0.0',
    total_events: shape.label === 'thin' ? 89 : totalEvents,
    active_wallets: shape.label === 'thin' ? 12 : activeWallets,
    top_movers: climbed,
    top_events: topEvents,
    spotlight:
      shape.label === 'spike'
        ? {
            wallet: synthAddress(99, 'spotlight'),
            reason: 'rank_climb',
            details: { dimension, rank_delta: 77, prior_rank: 84, current_rank: 7 },
          }
        : null,
    rank_changes: {
      climbed,
      dropped: [],
      entered_top_tier: shape.label === 'spike' ? climbed.slice(0, 2) : [],
      exited_top_tier: [],
    },
    factor_trends: factorTrends,
  };

  // Score-analyst-style narrative (server pre-writes; ruggy rewrites)
  const narrative: NarrativeShape | null = shape.narrative
    ? buildStubNarrative(zone, shape.label, rawStats)
    : null;

  const windowEnd = new Date(now);
  const windowStart = new Date(now - 7 * 24 * 60 * 60 * 1000);

  return {
    zone,
    window: 'weekly',
    computed_at: new Date(now).toISOString(),
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    stale: false,
    schema_version: '1.0.0',
    narrative,
    narrative_error: shape.narrative ? null : 'narrative_unavailable',
    narrative_error_hint: shape.narrative
      ? null
      : 'Score-analyst narrative pipeline returned partial data this window. Surface raw_stats only.',
    raw_stats: rawStats,
  };
}

function buildStubNarrative(zone: ZoneId, label: string, stats: RawStats): NarrativeShape {
  const totalEvents = stats.total_events;
  const activeWallets = stats.active_wallets;
  const topFactor = stats.factor_trends[0];

  const headlines: Record<string, string> = {
    normal: `${zone} held steady this week — ${totalEvents} events, ${activeWallets} active wallets`,
    quiet: `${zone} quiet this week — ${totalEvents} events across ${activeWallets} wallets, holding pattern`,
    spike: `${zone} elevated activity — ${totalEvents} events from ${activeWallets} wallets`,
  };

  const sections: NarrativeShape['sections'] = [];

  if (topFactor) {
    sections.push({
      kind: 'movers',
      body: `${topFactor.factor_id} led the week with ${topFactor.current_count} events, multiplier ${topFactor.multiplier.toFixed(2)}× baseline. Behavior-focused observation: factor concentration was ${stats.factor_trends.length > 2 ? 'distributed' : 'narrow'}.`,
    });
  }

  if (stats.rank_changes.climbed.length > 0) {
    const top = stats.rank_changes.climbed[0]!;
    sections.push({
      kind: 'movers',
      body: `Wallet ${top.wallet} climbed from rank ${top.prior_rank} to ${top.current_rank} (${top.rank_delta}-place delta) on the ${top.dimension} ledger.`,
    });
  }

  if (stats.spotlight) {
    sections.push({
      kind: 'spotlight',
      body: `Spotlight: wallet ${stats.spotlight.wallet} flagged for ${stats.spotlight.reason.replace('_', ' ')}.`,
    });
  }

  return {
    headline: headlines[label] ?? headlines.normal!,
    sections,
  };
}

interface ShapeSpec {
  multiplier: number;
  label: 'normal' | 'quiet' | 'spike' | 'thin';
  notable: number;
  climbers: number;
  narrative: boolean;
}

function synthAddress(seed: number, kind: string): string {
  const base = `${kind}${seed}`;
  let hash = 0;
  for (const ch of base) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hex = hash.toString(16).padStart(8, '0').repeat(5).slice(0, 40);
  return `0x${hex}`;
}

function synthUUID(i: number, j: number): string {
  const seed = `${i}-${j}-${Date.now()}`;
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hex = hash.toString(16).padStart(8, '0');
  return `${hex}-0000-4000-8000-${hex}0000`;
}
