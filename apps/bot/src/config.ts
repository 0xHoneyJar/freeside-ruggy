import { z } from 'zod';
import type { ZoneId } from './score/types.ts';

const ConfigSchema = z.object({
  // ─── stub mode (data side; LLM side flips on key presence) ────────────
  STUB_MODE: z.string().default('true').transform((v) => v === 'true'),

  // ─── score-mcp (zerker — production path) ─────────────────────────────
  SCORE_API_URL: z.string().url().default('https://score-api-production.up.railway.app'),
  SCORE_API_KEY: z.string().optional(),
  /** X-MCP-Key header for /mcp endpoint (when score-mcp deploys to prod). */
  MCP_KEY: z.string().optional(),

  // ─── freeside agent-gateway (jani — production LLM path) ──────────────
  FREESIDE_BASE_URL: z.string().url().default('https://api.freeside.0xhoneyjar.xyz'),
  FREESIDE_API_KEY: z.string().optional(),
  FREESIDE_AGENT_MODEL: z.enum(['cheap', 'fast-code', 'reviewer', 'reasoning', 'architect']).default('reasoning'),

  // ─── anthropic-direct (V0 testing — bypasses freeside) ────────────────
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),

  // ─── discord delivery — bot client OR webhook fallback ────────────────
  /** Bot user token from Discord Developer Portal. When set, posts via Gateway client. */
  DISCORD_BOT_TOKEN: z.string().optional(),
  /** Webhook URL (V0 testing path; used when bot token unset). */
  DISCORD_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),

  // ─── per-zone channel mapping (used when DISCORD_BOT_TOKEN is set) ────
  DISCORD_CHANNEL_STONEHENGE: z.string().optional(),
  DISCORD_CHANNEL_BEAR_CAVE: z.string().optional(),
  DISCORD_CHANNEL_EL_DORADO: z.string().optional(),
  DISCORD_CHANNEL_OWSLEY_LAB: z.string().optional(),

  // ─── target ───────────────────────────────────────────────────────────
  /** When ZONES is unset, fires all 4 zones. Otherwise comma-separated subset. */
  ZONES: z.string().optional(),
  DIGEST_CADENCE: z.enum(['weekly', 'daily', 'manual']).default('weekly'),
  DIGEST_DAY: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).default('sunday'),
  DIGEST_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(0),

  // ─── meta ─────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('config validation failed:', parsed.error.format());
    process.exit(1);
  }
  return parsed.data;
}

export function isDryRun(config: Config): boolean {
  if (config.DISCORD_BOT_TOKEN) return false;
  return !config.DISCORD_WEBHOOK_URL || config.DISCORD_WEBHOOK_URL === '';
}

export function getZoneChannelId(config: Config, zone: ZoneId): string | undefined {
  switch (zone) {
    case 'stonehenge':
      return config.DISCORD_CHANNEL_STONEHENGE;
    case 'bear-cave':
      return config.DISCORD_CHANNEL_BEAR_CAVE;
    case 'el-dorado':
      return config.DISCORD_CHANNEL_EL_DORADO;
    case 'owsley-lab':
      return config.DISCORD_CHANNEL_OWSLEY_LAB;
  }
}

export function selectedZones(config: Config): ZoneId[] {
  const all: ZoneId[] = ['stonehenge', 'bear-cave', 'el-dorado', 'owsley-lab'];
  if (!config.ZONES) return all;
  const requested = config.ZONES.split(',').map((s) => s.trim()).filter(Boolean) as ZoneId[];
  return requested.filter((z) => all.includes(z));
}
