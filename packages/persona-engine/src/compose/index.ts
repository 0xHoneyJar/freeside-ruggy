/**
 * Unified compose entrypoint (V0.7-A.2).
 *
 * Single function the substrate exposes for "make a character utter
 * something." Branches on `invocation.type` to dispatch to the right
 * downstream primitive (`composeZonePost` for cron, `composeReply` for
 * chat). Surface unifies; the post-LLM flows (embed building vs chunk
 * splitting) remain in their respective primitives until V0.7-A.3+ for
 * deeper unification.
 *
 * Pattern: this is the operator's stated reframe — "chat and digest
 * should be the same thing" — at the API surface. Callers see one
 * function; the discriminated `Invocation` union encodes which kind of
 * utterance this is. Voice fidelity is preserved because per-PostType
 * fragments stay where they are (Eileen + gumi tuning untouched).
 *
 * V0.7-A.2 Phase C scope: dispatcher + thin shim wiring. Phase E
 * (deferrable) collapses the internal primitives.
 */

import type { Config } from '../config.ts';
import type { CharacterConfig } from '../types.ts';
import type { ZoneId } from '../score/types.ts';
import type { PostType } from './post-types.ts';
import type { ToolUseEvent } from '../orchestrator/index.ts';
import type { RecentMessage } from './environment.ts';
import type { PostComposeResult } from './composer.ts';
import type { ReplyComposeResult } from './reply.ts';
import { composeZonePost } from './composer.ts';
import { composeReply } from './reply.ts';

/**
 * Discriminated invocation union — what kind of utterance this is. Each
 * variant carries the metadata its downstream primitive needs (zone +
 * postType for cron; channel + ephemeral for slash-reply; future
 * variants for V0.7-A.3+ message-create / DM / etc.).
 */
export type Invocation =
  | {
      type: 'cron-digest';
      zone: ZoneId;
      postType: Exclude<PostType, 'reply'>;
    }
  | {
      type: 'cron-pop-in';
      zone: ZoneId;
      postType: Exclude<PostType, 'reply'>;
    }
  | {
      type: 'cron-weaver';
      zone: ZoneId;
      postType: 'weaver';
    }
  | {
      type: 'slash-reply';
      channelId: string;
      ephemeral: boolean;
    };

export interface ComposeEnvironment {
  invocation: Invocation;
  /** Resolved zone (from channelId for slash-reply, or invocation for cron). Optional for non-zone channels (DM). */
  zone?: ZoneId;
  /** Recent ledger snapshot (slash-reply) — passed through to env-context builder. */
  recentMessages?: RecentMessage[];
  /** Other characters loaded into the same Discord shell (CHARACTERS env minus self). */
  otherCharactersHere?: string[];
  /** Optional override for "now" — deterministic snapshot tests. */
  nowMs?: number;
}

export interface ComposeArgs {
  config: Config;
  character: CharacterConfig;
  environment: ComposeEnvironment;
  /**
   * The "user message" payload. For cron paths this is unused (the
   * downstream primitive fetches its own ZoneDigest); for slash-reply
   * this is the user's prompt text.
   */
  prompt?: string;
  /** Slash-reply caller metadata — used for ledger entries. */
  invoker?: { id: string; username: string };
  options?: {
    /** Slash-reply: how many recent ledger entries to feed the prompt. */
    historyDepth?: number;
  };
  /**
   * V0.7-A.1: optional callback fired on each `tool_use` block from the
   * orchestrator stream. Slash-reply callers (the dispatcher) PATCH the
   * deferred Discord message with progress; cron callers can log to
   * trajectory or ignore.
   */
  onToolUse?: (event: ToolUseEvent) => void;
}

/**
 * Discriminated result union — caller knows which shape it asked for via
 * the `invocation.type` it passed in. Cron returns `PostComposeResult`
 * (digest payload + voice + ZoneDigest); slash-reply returns
 * `ReplyComposeResult` (text + chunks for Discord delivery). Both share
 * the underlying orchestrator + persona primitives; only the post-LLM
 * shape differs.
 */
export type ComposeResult =
  | { kind: 'cron'; result: PostComposeResult | null }
  | { kind: 'reply'; result: ReplyComposeResult | null };

/**
 * Single substrate entrypoint for "make a character utter something."
 * Dispatches on `args.environment.invocation.type` to the right primitive.
 *
 * Cron paths (digest/pop-in/weaver) → `composeZonePost`
 * Slash-reply path → `composeReply`
 *
 * The `Invocation` discriminator encodes "what kind of utterance" at the
 * type level; callers select shape by passing the right variant. Voice
 * fidelity is preserved because per-PostType fragments stay where they
 * are — only the dispatch unified.
 */
export async function compose(args: ComposeArgs): Promise<ComposeResult> {
  const { invocation } = args.environment;

  switch (invocation.type) {
    case 'cron-digest':
    case 'cron-pop-in':
    case 'cron-weaver': {
      const result = await composeZonePost(
        args.config,
        args.character,
        invocation.zone,
        invocation.postType,
      );
      return { kind: 'cron', result };
    }
    case 'slash-reply': {
      if (!args.prompt || !args.invoker) {
        throw new Error(
          'compose: slash-reply invocation requires `prompt` and `invoker` fields',
        );
      }
      const result = await composeReply({
        config: args.config,
        character: args.character,
        prompt: args.prompt,
        channelId: invocation.channelId,
        zone: args.environment.zone,
        otherCharactersHere: args.environment.otherCharactersHere,
        authorId: args.invoker.id,
        authorUsername: args.invoker.username,
        onToolUse: args.onToolUse,
        options: {
          historyDepth: args.options?.historyDepth,
          ephemeral: invocation.ephemeral,
        },
      });
      return { kind: 'reply', result };
    }
  }
}
