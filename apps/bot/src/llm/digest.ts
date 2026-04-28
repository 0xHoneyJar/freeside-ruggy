/**
 * Digest composer — orchestrates the per-zone pipeline:
 *   1. Fetch ZoneDigest from score-mcp (or stub)
 *   2. Build prompt pair (system w/ zone + codex; user w/ digest JSON)
 *   3. Invoke LLM (anthropic-direct or freeside or stub)
 *   4. Build Discord payload (embed + graceful fallback content)
 *
 * One pipeline per zone. The cron scheduler fires composeZoneDigest()
 * for each of the 4 zones in turn.
 */

import type { Config } from '../config.ts';
import { fetchZoneDigest } from '../score/client.ts';
import type { ZoneDigest, ZoneId } from '../score/types.ts';
import { ZONE_FLAVOR } from '../score/types.ts';
import { invoke } from './agent-gateway.ts';
import { buildPromptPair } from '../persona/loader.ts';
import { buildZoneEmbedPayload, type DigestPayload } from '../format/embed.ts';

export interface ZoneComposeResult {
  zone: ZoneId;
  digest: ZoneDigest;
  voice: string;
  payload: DigestPayload;
}

export async function composeZoneDigest(
  config: Config,
  zone: ZoneId,
): Promise<ZoneComposeResult> {
  // 1. Fetch ZoneDigest (real MCP or stub)
  const digest = await fetchZoneDigest(config, zone);

  // 2. Build prompt pair
  const { systemPrompt, userMessage } = buildPromptPair({
    zoneId: zone,
    zoneDigestJson: JSON.stringify(digest, null, 2),
  });

  // 3. Invoke LLM
  const { text: voice } = await invoke(config, {
    systemPrompt,
    userMessage,
    modelAlias: config.FREESIDE_AGENT_MODEL,
    zoneHint: zone,
  });

  // 4. Build Discord payload (zone-flavored embed)
  const payload = buildZoneEmbedPayload(digest, voice);

  return { zone, digest, voice, payload };
}

export const ALL_ZONES: ZoneId[] = ['stonehenge', 'bear-cave', 'el-dorado', 'owsley-lab'];

export function describeZone(zone: ZoneId): string {
  const flavor = ZONE_FLAVOR[zone];
  return `${flavor.emoji} ${flavor.name} (${flavor.dimension})`;
}
