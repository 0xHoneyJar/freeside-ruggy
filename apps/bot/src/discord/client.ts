/**
 * Discord bot client (discord.js Gateway).
 *
 * V1 use:
 *   • Login as the Ruggy bot user
 *   • Send digest payloads to per-zone channels via channel.send()
 *   • Stay connected (cron triggers fire posts)
 *   • Graceful shutdown on SIGINT/SIGTERM
 *
 * No interaction handlers in V1 (slash commands defer to V2).
 *
 * If DISCORD_BOT_TOKEN is unset, the bot client is unavailable; the
 * post layer falls back to webhook delivery.
 */

import { Client, GatewayIntentBits, Events } from 'discord.js';
import type { TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
import type { Config } from '../config.ts';

let cachedClient: Client | null = null;
let readyPromise: Promise<Client> | null = null;

export async function getBotClient(config: Config): Promise<Client | null> {
  if (!config.DISCORD_BOT_TOKEN) return null;
  if (cachedClient && cachedClient.isReady()) return cachedClient;
  if (readyPromise) return readyPromise;

  readyPromise = startClient(config);
  cachedClient = await readyPromise;
  return cachedClient;
}

async function startClient(config: Config): Promise<Client> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    client.once(Events.ClientReady, (c) => {
      if (settled) return;
      settled = true;
      console.log(`ruggy: discord client ready as ${c.user.tag}`);
      resolve(client);
    });

    client.on(Events.Error, fail);

    client.login(config.DISCORD_BOT_TOKEN!).catch(fail);
  });
}

export async function postToChannel(
  client: Client,
  channelId: string,
  payload: { content: string; embeds: object[] },
): Promise<{ posted: true; messageId: string }> {
  const channel = await client.channels.fetch(channelId);
  if (!channel) throw new Error(`channel not found: ${channelId}`);
  if (!isSendable(channel)) {
    throw new Error(`channel ${channelId} is not text-sendable (kind: ${channel.type})`);
  }

  // discord.js types want a specific embed shape; we cast since the embed
  // is already valid Discord JSON.
  const message = await channel.send({
    content: payload.content,
    embeds: payload.embeds as never,
  });

  return { posted: true, messageId: message.id };
}

function isSendable(
  channel: unknown,
): channel is TextChannel | NewsChannel | ThreadChannel {
  if (typeof channel !== 'object' || channel === null) return false;
  return 'send' in channel && typeof (channel as { send: unknown }).send === 'function';
}

export async function shutdownClient(): Promise<void> {
  if (cachedClient) {
    await cachedClient.destroy();
    cachedClient = null;
    readyPromise = null;
  }
}
