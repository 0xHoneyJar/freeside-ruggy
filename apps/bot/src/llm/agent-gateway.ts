/**
 * LLM gateway — three routes:
 *   STUB_MODE=true (no keys)  → canned digest matching ZoneDigest input
 *   ANTHROPIC_API_KEY set     → anthropic-direct (V0 testing path)
 *   FREESIDE_API_KEY set      → freeside agent-gateway (production)
 *
 * Order: anthropic key wins (V0 voice testing); else stub; else freeside.
 */

import type { Config } from '../config.ts';
import type { ZoneDigest, ZoneId } from '../score/types.ts';
import { ZONE_FLAVOR } from '../score/types.ts';

export interface InvokeRequest {
  systemPrompt: string;
  userMessage: string;
  modelAlias?: 'cheap' | 'fast-code' | 'reviewer' | 'reasoning' | 'architect';
  zoneHint?: ZoneId;
}

export interface InvokeResponse {
  text: string;
  meta?: Record<string, unknown>;
}

export async function invoke(config: Config, req: InvokeRequest): Promise<InvokeResponse> {
  if (config.ANTHROPIC_API_KEY) {
    return invokeAnthropicDirect(config, req);
  }
  if (config.STUB_MODE) {
    return generateStubDigest(req);
  }
  if (config.FREESIDE_API_KEY) {
    return invokeFreeside(config, req);
  }
  throw new Error(
    'no LLM provider configured: set STUB_MODE=true, or ANTHROPIC_API_KEY, or FREESIDE_API_KEY',
  );
}

// ──────────────────────────────────────────────────────────────────────
// Production path — freeside agent-gateway
// ──────────────────────────────────────────────────────────────────────

async function invokeFreeside(config: Config, req: InvokeRequest): Promise<InvokeResponse> {
  const url = `${config.FREESIDE_BASE_URL}/api/agents/invoke`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.FREESIDE_API_KEY && { 'x-api-key': config.FREESIDE_API_KEY }),
    },
    body: JSON.stringify({
      agent: 'default',
      modelAlias: req.modelAlias ?? config.FREESIDE_AGENT_MODEL,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userMessage },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`freeside agent-gateway error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { text: string; usage?: Record<string, unknown> };
  return { text: data.text, meta: data.usage };
}

// ──────────────────────────────────────────────────────────────────────
// Testing path — anthropic-direct (Claude Messages API)
// ──────────────────────────────────────────────────────────────────────

async function invokeAnthropicDirect(
  config: Config,
  req: InvokeRequest,
): Promise<InvokeResponse> {
  const url = 'https://api.anthropic.com/v1/messages';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': config.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`anthropic api error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
    usage?: Record<string, unknown>;
  };

  const text = data.content
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text)
    .join('\n');

  return { text, meta: data.usage };
}

// ──────────────────────────────────────────────────────────────────────
// Stub digest — matches the ZoneDigest input shape (reads JSON, voices it)
// ──────────────────────────────────────────────────────────────────────

function generateStubDigest(req: InvokeRequest): InvokeResponse {
  const digest = extractZoneDigestFromUserMessage(req.userMessage);
  if (!digest) {
    return {
      text: 'yo team — stub digest could not parse the ZoneDigest input.',
    };
  }

  const flavor = ZONE_FLAVOR[digest.zone];
  const stats = digest.raw_stats;
  const totalEvents = stats.total_events;
  const wallets = stats.active_wallets;
  const factors = stats.factor_trends;

  // Honor the narrative_error case (analyst couldn't write — partial data)
  if (!digest.narrative) {
    return {
      text: [
        `hey ${flavor.name} team — quick check-in but with a caveat`,
        '',
        `> partial snapshot.`,
        '',
        `score-mibera reported partial data for ${flavor.name} this window. ${totalEvents} events confirmed, but the analyst pipeline returned an error.`,
        '',
        `ruggy'll repost when the snapshot completes. probably tomorrow.`,
      ].join('\n'),
    };
  }

  // Quiet week
  if (totalEvents < 100) {
    const lead = factors[0];
    return {
      text: [
        `henlo ${flavor.name}, week check-in`,
        '',
        `> ${totalEvents} events · ${wallets} wallets · ${factors.length} factors moved`,
        '',
        `quiet one. ${lead ? `\`${lead.factor_id}\` carried most of it (${lead.current_count} events). nothing else really moved.` : 'nothing notable moved.'}`,
        '',
        `low-energy week's still a week. see you next sunday.`,
      ].join('\n'),
    };
  }

  // Spike week (multiplier high or spotlight present)
  const isSpike =
    (factors[0]?.multiplier ?? 1) > 3 || stats.spotlight !== null;

  if (isSpike) {
    const lead = factors[0];
    const climbed = stats.rank_changes.climbed[0];
    const spotlight = stats.spotlight;
    return {
      text: [
        `ooga booga ${flavor.name} team, big week`,
        '',
        `> ${totalEvents.toLocaleString()} events · ${wallets} wallets · ${factors.length} factors moved`,
        '',
        lead
          ? `\`${lead.factor_id}\` ate the leaderboard — ${lead.current_count} events at ${lead.multiplier.toFixed(1)}× baseline. ngl, this is wild.`
          : 'big week across the board.',
        '',
        spotlight
          ? `🚨 spotlight — \`${spotlight.wallet}\` flagged for ${spotlight.reason.replace('_', ' ')}. someone's making moves.`
          : climbed
            ? `🟢 \`${climbed.wallet}\` climbed from #${climbed.prior_rank} → #${climbed.current_rank}. that's the vibe.`
            : '',
        '',
        `stay groovy 🐻`,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  // Normal week
  const lead = factors[0];
  const climbed = stats.rank_changes.climbed[0];

  return {
    text: [
      `yo ${flavor.name} team, week check-in time`,
      '',
      `> ${totalEvents} events · ${wallets} wallets · ${factors.length} factors moved`,
      '',
      lead
        ? `\`${lead.factor_id}\` carried the week (${lead.current_count} events). ${factors[1] ? `\`${factors[1].factor_id}\` had a quiet rebound.` : 'the og crew kept it steady.'}`
        : 'steady week, no surprises.',
      '',
      climbed
        ? `🟢 peep \`${climbed.wallet}\` — climbed from #${climbed.prior_rank} → #${climbed.current_rank}. solid stack.`
        : '',
      '',
      `stay groovy 🐻`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function extractZoneDigestFromUserMessage(userMessage: string): ZoneDigest | null {
  const jsonMatch = userMessage.match(/\{[\s\S]+\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as ZoneDigest;
  } catch {
    return null;
  }
}
