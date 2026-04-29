# freeside-ruggy

Persona-layer Discord bot for the Honey Jar ecosystem. Watches mibera-dimensions activity through score-mcp, composes posts through a tripartite construct stack (rosenzu · arneson · cabal-gygax + codex + emojis + freeside_auth), and posts in Ruggy's voice to four festival-zone channels in the THJ Discord.

See `README.md` for the full picture. This file is for agents working IN this repo.

## Critical context

- **Persona name**: `ruggy` (lowercase, voice surface)
- **Repo name**: `freeside-ruggy` (this repo)
- **Discord username**: `Ruggy` (proper case; bot user `Ruggy#1157` is live)
- **Layer**: persona (per `vault/wiki/concepts/two-layer-bot-model.md`)
- **NOT the freeside operations bot** — sietch (`loa-freeside/themes/sietch`) handles `/verify`, `/onboard`, `/score`, `/agent`, `/buy-credits`. Don't add utility commands here.
- **Ruggy is one consumer of score** — siblings will exist (other personas, other surfaces, other worlds). Architectural decisions should preserve extractability.

## Stack (V0.5-E, current)

- **Runtime**: Bun
- **Language**: TypeScript (strict)
- **LLM**: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) via `agent/orchestrator.ts` — direct anthropic auth in production
- **Discord delivery**: `discord.js` Gateway (channel.send) — webhook + dry-run as fallbacks
- **Schedule**: `node-cron` — three concurrent cadences (digest backbone · pop-in random · weaver weekly)
- **Validation**: Zod
- **Stubs**: `LLM_PROVIDER=stub` for canned outputs; `STUB_MODE=true` for synthetic ZoneDigests (defaults on)

## When working in this repo

### Persona is sacred

The canonical persona at `apps/bot/src/persona/ruggy.md` is the source of truth for Ruggy's voice. Changes require:
1. Update the canonical doc at `~/bonfire/grimoires/bonfire/context/ruggy-canonical-persona-2026-04-28.md` first
2. Sync into this repo
3. Update `vault/wiki/entities/ruggy.md` if the change affects identity

Never edit `apps/bot/src/persona/ruggy.md` without syncing back to bonfire grimoires.

### Discord-as-Material rules

The persona doc has a "Discord-as-Material" section that's NON-NEGOTIABLE. The `format/sanitize.ts` and `format/embed.ts` modules implement those rules. Don't bypass them. Specifically:

- **Underscore escape is mandatory** before sending any text to Discord (`format/sanitize.ts`). Onchain identifiers like `mibera_acquire` will italicize-mid-word otherwise.
- **`message.content` ALWAYS populated** when sending an embed (graceful fallback for users with embeds disabled).
- **Mobile word-wrap is ~40 chars** in code blocks. Don't generate ANSI lines wider than that.

### Voice rules (LLM follows these via system prompt; YOU should too in code comments / commits)

- Lowercase invariant — comments, commit messages, log lines
- No corporate-bot tells in user-facing strings (banned: 🚀💯🎉🔥🤑💎🙌💪⚡️✨🌟 — use the 43-emoji catalog in `agent/emojis/registry.ts`)
- Numbers from data, voice from persona — never hardcode example figures in production paths
- In-character errors only — "cables got crossed" not "I apologize for the inconvenience"

### Construct boundaries

The agent loop pulls from each construct at compose time. Maintain UNIX-like single-discipline boundaries:

| Construct | Owns | Doesn't own |
|---|---|---|
| `rosenzu` | Lynch primitives, KANSEI vectors, threshold transitions, per-fire variance via `furnish_kansei` | data triggers, identity, lore |
| `arneson` (skill) | scene-gen rules, sensory layering, in-character error register | data fetching, code paths |
| `cabal-gygax` (subagent) | lens rotation (9 phantom-player archetypes) — picks ONE per fire | composing the post itself |
| `emojis` | THJ guild emoji catalog, mood tags, recent-used cache | non-emoji formatting |
| `freeside_auth` | wallet → handle/discord/mibera_id resolution against `midi_profiles` | issuing JWTs (gateway), verifying credentials (Dynamic), caching score data (rosenzu/score-mcp) |
| `score` (remote MCP) | activity digests, factor catalogs, dimension catalogs | persona, voice, lore |
| `codex` (text prelude) | always-loaded lore, archetypes, trait vocabulary | data triggers, runtime queries |

If a new concern arises that doesn't fit any construct — ask if it's a new construct or a feature inside an existing one. The default answer should be "extend an existing construct"; new constructs need justification.

## Two-layer-bot model invariants

- This bot has its own Discord application (own user, own token, own per-zone channels)
- Sietch lives separately in `loa-freeside/themes/sietch` — handles auth/onboard/score-lookup
- No command overlap between sietch and ruggy
- `/agent` stays in sietch (generic LLM); ruggy's voice is scoped to channels only

## Don't do

- Add slash commands here (`/ruggy …`) — that crosses into sietch's surface. Persona-layer bots are channel-post-only.
- Add a database (state lives in score-mcp, midi_profiles, and `.run/` jsonl caches)
- Re-implement score logic locally (always call score-mcp)
- Re-implement LLM logic locally (always go through `agent/orchestrator.ts` via Claude Agent SDK)
- Generate persona content in code (always load from `persona/ruggy.md`)
- Hardcode emoji choices (always go through `mcp__emojis__*`)
- Cite raw `0x…` wallets in prose without first calling `mcp__freeside_auth__resolve_wallet`
- Compose without first calling rosenzu (spatial blindness — guarded against in arneson skill)

## Deploy posture

- **Bot user**: Ruggy#1157 (Discord application registered, token in `.env`)
- **Per-zone channels**: 4 channels in THJ guild, IDs in `.env.example`
- **Production data path**: score-mcp (zerker, `score-api-production.up.railway.app/mcp`)
- **Production LLM path**: Claude Agent SDK with `ANTHROPIC_API_KEY` (direct, no freeside-gateway routing currently)
- **Hosting**: see `docs/DEPLOY.md` — ECS via loa-freeside is the target; Railway is a faster fallback

## RFC + doctrine refs

- Topology + score-vault: [loa-freeside#191](https://github.com/0xHoneyJar/loa-freeside/issues/191)
- Persona doctrine: `vault/wiki/entities/ruggy.md`
- Two-layer model: `vault/wiki/concepts/two-layer-bot-model.md`
- Naming: `vault/wiki/concepts/loa-org-naming-conventions.md`
- Score contracts: `vault/wiki/concepts/score-vault.md`
- Construct ontology: `vault/wiki/concepts/construct-ontology.md`
- Source RFC: `~/bonfire/grimoires/bonfire/context/freeside-bot-topology-score-vault-rfc-2026-04-28.md`
- Creative direction seed (V0.5-E onward): `~/bonfire/grimoires/bonfire/context/ruggy-creative-direction-seed-2026-04-29.md`

## Test the loop locally

```bash
bun install
cp .env.example .env

# pure stub — no external deps, ICE skipped, canned outputs
LLM_PROVIDER=stub bun run digest:once

# anthropic-direct — real LLM, stub data, canned ZoneDigest
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-… STUB_MODE=true bun run digest:once

# real path — score-mcp + anthropic LLM + Discord (or webhook fallback or stdout)
LLM_PROVIDER=anthropic \
  ANTHROPIC_API_KEY=… \
  STUB_MODE=false MCP_KEY=… \
  bun run digest:once
```

Validate the entire pipeline before touching production cron cadences. The `digest:once` CLI fires one post per zone and exits — useful for voice-iteration without waiting for Sunday midnight.
