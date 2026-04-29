# Changelog

## [unreleased] — 2026-04-29

### Docs
- Rewrote `README.md` to reflect V0.5-E reality — superseded V1-era webhook + polling framing.
  Surfaces: persona-layer-bot positioning (vs sietch operations layer), tripartite construct
  composition (rosenzu · arneson · cabal-gygax + codex + emojis + freeside_auth + score),
  six post types + three cadences, four festival zones, the "Ruggy is one consumer of score,
  not the only one" framing, and the extractability story for sibling personas.
- Rewrote `CLAUDE.md` agent guidance — V0.5-E stack (Claude Agent SDK, in-bot MCPs,
  discord.js Gateway), construct boundaries table, "don't do" updated for the persona-layer
  invariants.
- Rewrote `docs/ARCHITECTURE.md` — V0.5-E architecture diagram with SDK runtime, in-bot MCPs,
  cabal-gygax subagent, arneson skill loading. Module responsibilities, dependency rules,
  swap-out matrix, future shape, and a construct-extractability checklist.
- Updated GitHub repo description + topics to surface the persona-layer + reference-implementation framing for discoverability.
- **Smol+weaver pass** (2026-04-29) — README + ARCHITECTURE.md ASCII diagrams converted to
  Mermaid (interactive on GitHub since 2022, mobile-friendly, follows the rendering-mermaid
  skill's portability rules — middle-dot inline separators, classDef vocabulary). Prose
  tightened to lowercase casual register. Repo layout collapsed into `<details>`. Construct
  table emoji-anchored. Added `construct-extractability` Mermaid for the sibling-persona
  scaffold/variable split.

## [0.1.0] — 2026-04-28

### Added
- Initial scaffold (`apps/bot/` + `packages/protocol/` + `docs/`)
- Canonical persona at `apps/bot/src/persona/ruggy.md` (distilled from 5 prior repos + Discord-as-Material gemini research)
- Stub mode for local dev (`STUB_MODE=true`) — synthetic `ActivitySummary` + canned LLM digest
- Webhook-based Discord delivery (no `discord.js` dependency in V1)
- Weekly cron schedule (Sunday UTC midnight, configurable via env)
- Discord markdown sanitization (underscore escape per persona doc rules)
- Embed builder with graceful `message.content` fallback
- Persona loader that builds the system prompt from `ruggy.md`

### Architecture decisions
- V1 = polling (no NATS). When zerker's `GET /v1/activity-summary` ships, swap stub for real call.
- V1 = webhook delivery (no Gateway send, no MCI privilege required).
- V1 = no slash commands. `/ruggy digest`, `/ruggy silence` defer to V2.

### Known stubs (waiting on)
- score-api `GET /v1/activity-summary` (zerker, RFC #191)
- freeside agent-gateway integration (jani, already shipped — needs API key)
- Discord application registration + webhook URL (soju)

### Refs
- [loa-freeside#191](https://github.com/0xHoneyJar/loa-freeside/issues/191) — score-vault RFC
- `~/bonfire/grimoires/bonfire/context/freeside-bot-topology-score-vault-rfc-2026-04-28.md` — full RFC
- `~/bonfire/grimoires/bonfire/context/ruggy-canonical-persona-2026-04-28.md` — persona source
