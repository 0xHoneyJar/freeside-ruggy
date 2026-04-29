/**
 * Emojis — in-bot SDK MCP server (V0.5-D, 2026-04-29).
 *
 * Lets ruggy use the Discord guild's custom mibera + ruggy emojis.
 * The LLM can:
 *   - list the catalog (filtered by kind / mood)
 *   - pick an emoji by mood for the current post
 *   - render the discord-syntax string `<:name:id>` ready to drop in prose
 *
 * UNIX boundary: this module exposes the catalog + a render helper.
 * It does NOT decide WHEN to use one — that's the persona prompt's job.
 *
 * Use rule (from persona): emojis are EXPRESSION, not decoration.
 * - 0-1 custom emoji per post is the default
 * - digest tolerates 1 warmth-moment custom + 1 status emoji
 * - micro/lore_drop/question/callout: 0-1 custom OR 0 (silence often
 *   stronger)
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import {
  EMOJIS,
  ALL_MOODS,
  pickByMood,
  findByName,
  renderEmoji,
  type EmojiKind,
  type EmojiMood,
} from './registry.ts';

function ok(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

const KindSchema = z.enum(['mibera', 'ruggy']);
const MoodSchema = z.enum(ALL_MOODS as [EmojiMood, ...EmojiMood[]]);

export const emojisServer = createSdkMcpServer({
  name: 'emojis',
  version: '0.1.0',
  tools: [
    tool(
      'list_moods',
      'Lists all available emoji mood tags. Use this first to see what moods are available, then call pick_by_mood to get the actual emojis.',
      {},
      async () => {
        return ok({ moods: ALL_MOODS });
      },
    ),

    tool(
      'pick_by_mood',
      'Returns custom Discord emojis matching a mood. Pass a `mood` (e.g. "cute", "celebrate", "love", "snark") and optionally narrow by `kind` (mibera | ruggy). Each entry includes the discord-syntax `render` string — drop that directly into prose to use the emoji. NEVER use raw IDs in prose; always use the rendered `<:name:id>` form.',
      {
        mood: MoodSchema.describe('Mood tag to filter by'),
        kind: KindSchema.optional().describe('Optionally narrow to mibera or ruggy emojis only'),
      },
      async ({ mood, kind }) => {
        const matches = pickByMood(mood as EmojiMood, kind as EmojiKind | undefined);
        return ok({
          mood,
          kind: kind ?? 'any',
          count: matches.length,
          emojis: matches.map((e) => ({
            name: e.name,
            kind: e.kind,
            visual: e.visual,
            use_when: e.use_when,
            render: renderEmoji(e), // discord-syntax string
          })),
        });
      },
    ),

    tool(
      'render_by_name',
      'Renders a custom emoji to its discord-syntax string `<:name:id>` for inclusion in prose. Useful when you already know the name (e.g. from a previous pick_by_mood call) and want to use it again.',
      {
        name: z.string().describe('Emoji name (e.g. "ruggy_celebrate", "mibera_heart_eyes")'),
      },
      async ({ name }) => {
        const entry = findByName(name);
        if (!entry) {
          return ok({ found: false, name, hint: 'Call list_moods + pick_by_mood to discover available emojis' });
        }
        return ok({
          found: true,
          name: entry.name,
          render: renderEmoji(entry),
          visual: entry.visual,
          use_when: entry.use_when,
        });
      },
    ),

    tool(
      'list_all',
      'Returns the FULL catalog (all 43 emojis). Heavy — prefer pick_by_mood for most cases. Use only when you want to see everything available.',
      {
        kind: KindSchema.optional(),
      },
      async ({ kind }) => {
        const filtered = kind ? EMOJIS.filter((e) => e.kind === kind) : EMOJIS;
        return ok({
          count: filtered.length,
          emojis: filtered.map((e) => ({
            name: e.name,
            kind: e.kind,
            mood: e.mood,
            visual: e.visual,
            use_when: e.use_when,
            render: renderEmoji(e),
          })),
        });
      },
    ),
  ],
});
