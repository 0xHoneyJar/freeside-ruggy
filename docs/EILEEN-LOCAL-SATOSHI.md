# Eileen's local-satoshi setup (in design — placeholder doc)

> **Status (2026-04-30)**: this is a stub. The Bedrock LLM provider isn't
> built yet. Eileen will share her Bedrock model spec; we'll wire the
> provider + a one-command launcher in the next session.

## What this is for

Eileen has been given a private Amazon Bedrock API key and wants to run
satoshi on her own machine using Bedrock for inference. The freeside-characters
runtime currently supports `LLM_PROVIDER=stub | anthropic | freeside | auto`;
adding `bedrock` is a small extension to `compose/reply.ts` and `compose/agent-gateway.ts`.

Goal: she clones the repo, sets a few env vars, runs one command, and
satoshi is alive in the project-purupuru staging guild — using HER bedrock
key, on HER machine, isolated from operator's Railway deploy.

## What's pending

| Item | Owner | Notes |
|---|---|---|
| Bedrock provider in chat-mode pipeline | operator + agent | `LLM_PROVIDER=bedrock` · `@aws-sdk/client-bedrock-runtime` · single-turn invoke · ~1 hour lift |
| Bedrock model spec | Eileen | She'll share which model IDs her access covers (anthropic.claude-* on Bedrock) |
| Easy-launch script | operator + agent | `bun run satoshi:dev` · starts tunnel + bot + prints Discord portal URL · ~1 hour |
| Discord app architecture | decision | Hand over freeside-characters portal URL temporarily vs. Eileen creates her own "satoshi-local" Discord app |
| `.dockerignore` `.claude` recursion fix | low priority | Currently `.claude` excludes recursively; `apps/bot/.claude/skills/arneson/SKILL.md` doesn't make it into Railway image. Doesn't affect Eileen's local run. |

## Setup flow (when bedrock provider lands)

This is the target shape, not yet wired:

```bash
# 1. Clone + install
git clone https://github.com/0xHoneyJar/freeside-characters
cd freeside-characters
bun install

# 2. Copy + edit env
cp .env.example .env

# Required for Eileen's setup:
#   AWS_ACCESS_KEY_ID=...           (her bedrock creds)
#   AWS_SECRET_ACCESS_KEY=...
#   AWS_REGION=us-east-1            (or whichever region her bedrock access covers)
#   BEDROCK_MODEL_ID=anthropic.claude-opus-4-7-...   (per her spec)
#   LLM_PROVIDER=bedrock
#
#   DISCORD_BOT_TOKEN=...           (operator hands over OR Eileen registers her own bot)
#   DISCORD_PUBLIC_KEY=...          (matches her Discord app)
#   CHARACTERS=satoshi              (just satoshi, not ruggy, for her solo experiments)

# 3. One-command launcher (TODO — not built yet)
bun run satoshi:dev
# → starts ngrok tunnel
# → starts bot with --watch
# → prints "set Discord portal URL to: https://<tunnel>/webhooks/discord"
# → tails bot logs
```

## What Eileen's agent should know now

Until the bedrock provider lands, Eileen's agent can study the existing
infrastructure to plan the bedrock integration:

1. **Read [`AGENTS.md`](AGENTS.md) first** — the orientation doc for any
   incoming agent. Maps the rest of the docs.
2. **Read [`ARCHITECTURE.md`](ARCHITECTURE.md)** — full architectural picture.
   Key for understanding where the bedrock provider would slot in
   (`compose/agent-gateway.ts` resolver + `compose/reply.ts` chat path).
3. **Read [`MULTI-REGISTER.md`](MULTI-REGISTER.md)** — voice register doctrine.
   Especially relevant if Eileen iterates on satoshi's voice using bedrock-served Claude.
4. **Read `apps/character-satoshi/persona.md`** — satoshi's full voice
   specification. The "VOICE REGISTER LOCK (affirmative anchor)" section
   added 2026-04-30 is the operator-iterated layer; everything above it is
   gumi-locked.
5. **Look at `packages/persona-engine/src/compose/reply.ts`** — the chat-mode
   pipeline. The bedrock provider is a sibling to `invokeChatAnthropicSdk`
   in this file (or extracted into `compose/agent-gateway.ts` for symmetry).

## Why local-only (and not on Railway prod-ruggy)

- **Cost isolation** — Eileen's bedrock key is private; she shouldn't fund
  operator's prod-ruggy traffic.
- **Voice iteration speed** — local `--watch` restart on code edit beats
  Railway redeploy for tight voice-tuning loops.
- **Identity isolation** — operator's Discord application has prod-ruggy's
  identity; running Eileen's local satoshi against the same app would
  conflict on the global Interactions Endpoint URL.

## Discord app architecture options

The freeside-characters Discord application has ONE Interactions Endpoint URL.
While Eileen's local bot is running, slash invocations from project-purupuru
need to route to HER local, not to operator's Railway. Three paths:

| Option | Trade |
|---|---|
| **A. Hand over the freeside-characters URL during her sessions** | Simple · prod /satoshi blackout while Eileen is running locally |
| **B. Eileen creates her own "satoshi-local" Discord app + bot** | Two `/satoshi` commands appear in the autocomplete (one per app) · she manages her own bot identity |
| **C. Run side-by-side via different guilds** | Doesn't work — Discord routes per app, not per guild |

Recommend **A for the first couple of sessions** (paired iteration with
operator), then **B once she's running solo** so the prod path stays clean.

## Tomorrow's session

Operator + agent + (optionally) Eileen pair on:

1. Read her bedrock spec
2. Wire `LLM_PROVIDER=bedrock` in `compose/reply.ts` + `agent-gateway.ts`
3. Add `BEDROCK_MODEL_ID` + AWS creds to `config.ts`
4. Write `apps/bot/scripts/satoshi-dev.ts` launcher
5. Update this doc with the actual setup walkthrough (replace placeholders)
6. Eileen test-runs it with operator on standby
7. Hand over portal URL or Eileen registers her own app per option above

## Coordination

When Eileen's spec arrives or this doc needs updates: ping operator (soju).
The build doc roadmap is in `~/bonfire/grimoires/bonfire/specs/listener-router-substrate.md` (operator's planning vault).
