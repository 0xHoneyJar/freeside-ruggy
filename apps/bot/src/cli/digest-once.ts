/**
 * digest-once — fire one full sweep (all configured zones) and exit.
 *
 * Useful for: local validation, manual cadence runs, CI smoke tests,
 * external cron triggers (Trigger.dev, GHA workflow_dispatch, EventBridge).
 *
 * Filter zones via the ZONES env var:
 *   ZONES=stonehenge bun run digest:once
 *   ZONES=bear-cave,el-dorado bun run digest:once
 */

import { loadConfig, isDryRun, selectedZones } from '../config.ts';
import { composeZoneDigest } from '../llm/digest.ts';
import { deliverZoneDigest } from '../discord/post.ts';
import { ZONE_FLAVOR } from '../score/types.ts';
import { getBotClient, shutdownClient } from '../discord/client.ts';

async function main(): Promise<void> {
  const config = loadConfig();
  const zones = selectedZones(config);

  const llmMode = config.ANTHROPIC_API_KEY
    ? `anthropic-direct (${config.ANTHROPIC_MODEL})`
    : config.STUB_MODE
      ? 'STUB (canned)'
      : config.FREESIDE_API_KEY
        ? `freeside (${config.FREESIDE_AGENT_MODEL})`
        : 'UNCONFIGURED';

  const deliveryMode = config.DISCORD_BOT_TOKEN
    ? 'BOT'
    : config.DISCORD_WEBHOOK_URL
      ? 'WEBHOOK'
      : 'DRY-RUN';

  console.log('ruggy: digest-once · firing immediately');
  console.log(`data: ${config.STUB_MODE ? 'STUB' : 'LIVE'} · llm: ${llmMode} · delivery: ${deliveryMode}`);
  console.log(`zones: ${zones.map((z) => `${ZONE_FLAVOR[z].emoji} ${z}`).join(' · ')}`);
  console.log();

  // Connect bot if token set
  if (config.DISCORD_BOT_TOKEN) {
    try {
      const client = await getBotClient(config);
      if (client) {
        console.log(`bot: connected as ${client.user?.tag ?? 'unknown'}`);
      }
    } catch (err) {
      console.error('bot client failed:', err);
      process.exit(1);
    }
  }

  let totalMs = 0;
  let posted = 0;
  let failed = 0;

  for (const zone of zones) {
    const t0 = Date.now();
    try {
      const { digest, payload } = await composeZoneDigest(config, zone);
      const compMs = Date.now() - t0;
      console.log(
        `\n[${zone}] composed in ${compMs}ms · ${digest.raw_stats.total_events} events · ${digest.raw_stats.active_wallets} wallets · narrative ${digest.narrative ? 'present' : 'null'}`,
      );

      const result = await deliverZoneDigest(config, zone, payload);
      if (result.posted) {
        posted++;
        console.log(`[${zone}] posted via ${result.via}` + (result.messageId ? ` (msg ${result.messageId})` : ''));
      } else if (result.dryRun) {
        console.log(`[${zone}] dry-run (${result.via})`);
      }

      totalMs += Date.now() - t0;
    } catch (err) {
      failed++;
      console.error(`[${zone}] failed:`, err);
    }
  }

  console.log(`\nruggy: ${zones.length} zones · ${posted} posted · ${failed} failed · ${totalMs}ms total`);
  await shutdownClient();
}

main().catch(async (err) => {
  console.error('ruggy digest-once failed:', err);
  await shutdownClient();
  process.exit(1);
});
