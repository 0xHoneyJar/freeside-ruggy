/**
 * freeside-ruggy bot — entry point.
 *
 * V1 pipeline:
 *   1. Load config + persona
 *   2. (If DISCORD_BOT_TOKEN) Login to Discord as Ruggy
 *   3. Schedule cadence (weekly default)
 *   4. On fire: for each zone → composeZoneDigest → deliverZoneDigest
 *   5. Stay up (or exit if cadence=manual)
 */

import { loadConfig, isDryRun, selectedZones, getZoneChannelId } from './config.ts';
import { composeZoneDigest } from './llm/digest.ts';
import { deliverZoneDigest } from './discord/post.ts';
import { scheduleDigest } from './cron/scheduler.ts';
import { loadSystemPrompt } from './persona/loader.ts';
import { getBotClient, shutdownClient } from './discord/client.ts';
import { ZONE_FLAVOR } from './score/types.ts';
import { getCodexLineCount } from './score/codex-context.ts';

const banner = `─── ruggy · freeside-ruggy v0.2.0 ──────────────────────────────`;

async function main(): Promise<void> {
  const config = loadConfig();

  console.log(banner);
  console.log(`data:           ${config.STUB_MODE ? 'STUB (synthetic ZoneDigest)' : 'LIVE (score-mcp)'}`);
  console.log(`llm:            ${describeLlmMode(config)}`);
  console.log(`zones:          ${selectedZones(config).map((z) => `${ZONE_FLAVOR[z].emoji} ${z}`).join(' · ')}`);
  console.log(`cadence:        ${config.DIGEST_CADENCE}` + (config.DIGEST_CADENCE !== 'manual' ? ` · ${config.DIGEST_DAY} ${String(config.DIGEST_HOUR_UTC).padStart(2, '0')}:00 UTC` : ''));
  console.log(`delivery:       ${describeDelivery(config)}`);

  // Sanity check: persona + codex load
  try {
    const prompt = loadSystemPrompt();
    const codexLines = getCodexLineCount();
    console.log(`persona:        loaded (${prompt.length} chars + ${codexLines} codex lines)`);
  } catch (err) {
    console.error('persona/codex load failed:', err);
    process.exit(1);
  }

  // Bot client (if token set)
  if (config.DISCORD_BOT_TOKEN) {
    try {
      const client = await getBotClient(config);
      if (client) {
        console.log(`discord:        bot client connected (${client.user?.tag ?? 'unknown'})`);
      }
    } catch (err) {
      console.error('discord bot client failed to connect:', err);
      process.exit(1);
    }
  }

  console.log('────────────────────────────────────────────────────────────────\n');

  const zones = selectedZones(config);

  const fire = async (): Promise<void> => {
    const t0 = Date.now();
    console.log(`ruggy: digest fire at ${new Date().toISOString()} for ${zones.length} zones`);

    for (const zone of zones) {
      try {
        const tZone = Date.now();
        const { digest, payload } = await composeZoneDigest(config, zone);
        console.log(`ruggy: ${zone} composed (${digest.raw_stats.total_events} events, ${digest.raw_stats.active_wallets} wallets) in ${Date.now() - tZone}ms`);

        const result = await deliverZoneDigest(config, zone, payload);
        if (result.posted) {
          console.log(`ruggy: ${zone} posted via ${result.via}` + (result.messageId ? ` (msg ${result.messageId})` : ''));
        } else if (result.dryRun) {
          console.log(`ruggy: ${zone} dry-run (${result.via})`);
        }
      } catch (err) {
        console.error(`ruggy: ${zone} failed:`, err);
      }
    }

    console.log(`ruggy: full fire complete in ${Date.now() - t0}ms`);
  };

  // schedule
  const handle = scheduleDigest(config, fire);
  if (handle) {
    console.log(`ruggy: scheduled · ${handle.expression}`);
  }

  // Always fire once on boot in dev/manual mode
  if (config.NODE_ENV === 'development' || config.DIGEST_CADENCE === 'manual') {
    console.log('ruggy: firing once on boot (dev/manual mode)');
    await fire();
  }

  if (config.DIGEST_CADENCE === 'manual') {
    console.log('ruggy: manual mode — exiting after single fire');
    await shutdownClient();
    process.exit(0);
  }

  // graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nruggy: ${signal} — shutting down`);
    handle?.stop();
    await shutdownClient();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

function describeLlmMode(config: ReturnType<typeof loadConfig>): string {
  if (config.ANTHROPIC_API_KEY) return `anthropic-direct (${config.ANTHROPIC_MODEL})`;
  if (config.STUB_MODE) return 'STUB (canned digest)';
  if (config.FREESIDE_API_KEY) return `freeside agent-gw (${config.FREESIDE_AGENT_MODEL})`;
  return 'UNCONFIGURED';
}

function describeDelivery(config: ReturnType<typeof loadConfig>): string {
  if (config.DISCORD_BOT_TOKEN) {
    const mapped = (['stonehenge', 'bear-cave', 'el-dorado', 'owsley-lab'] as const).filter((z) =>
      getZoneChannelId(config, z),
    );
    return `BOT (${mapped.length}/4 zones mapped: ${mapped.join(', ')})`;
  }
  if (config.DISCORD_WEBHOOK_URL) {
    return `WEBHOOK (${config.DISCORD_WEBHOOK_URL.slice(0, 50)}...)`;
  }
  return 'DRY-RUN (stdout)';
}

main().catch((err) => {
  console.error('ruggy: fatal:', err);
  shutdownClient().finally(() => process.exit(1));
});
