# Deploy

Deploy goes through Freeside ECS, matching the `world-mibera.tf` pattern from honeyroad. Railway is a faster fallback (see end of this doc).

> **Status (V0.5-E)**: Ruggy#1157 is registered + live in 4 THJ Discord channels. Production runtime is currently operator-supervised (local + cron); ECS migration is queued per the `loa-freeside` tracker. This doc captures the target shape.

## Prerequisites

1. **Discord application registered** — `Ruggy` bot user (`Ruggy#1157`), bot token saved
2. **Per-zone channel IDs** — 4 channels in THJ guild (stonehenge / bear-cave / el-dorado / owsley-lab), IDs in `.env.example`
3. **score-mcp access** — `MCP_KEY` for zerker's `score-api/mcp` endpoint
4. **Anthropic API key** — `ANTHROPIC_API_KEY` for the Claude Agent SDK runtime (currently the production LLM path; freeside agent-gw remains as a configurable fallback)
5. **Postgres access** — `RAILWAY_MIBERA_DATABASE_URL` for `midi_profiles` (wallet → identity resolution via `freeside_auth` MCP)
6. **AWS access** to apply terraform in `loa-freeside` (when ECS migration lands)

## Local validation (before deploy)

```bash
cd freeside-ruggy
bun install
cp .env.example .env

# 1. Pure stub — no external deps, end-to-end
LLM_PROVIDER=stub STUB_MODE=true bun run digest:once

# 2. Real LLM, stub data — voice validation without burning score-mcp quota
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=… STUB_MODE=true bun run digest:once

# 3. Real everything except Discord — dry-run output to stdout
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=… \
  STUB_MODE=false MCP_KEY=… \
  RAILWAY_MIBERA_DATABASE_URL=postgres://… \
  bun run digest:once

# 4. Full live path — bot.send() to per-zone channels
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=… \
  STUB_MODE=false MCP_KEY=… \
  RAILWAY_MIBERA_DATABASE_URL=postgres://… \
  DISCORD_BOT_TOKEN=… \
  DISCORD_CHANNEL_STONEHENGE=… \
  DISCORD_CHANNEL_BEAR_CAVE=… \
  DISCORD_CHANNEL_EL_DORADO=… \
  DISCORD_CHANNEL_OWSLEY_LAB=… \
  bun run digest:once
```

## ECS deploy (when ready)

Steps mirror the honeyroad migration (per `~/bonfire/grimoires/bonfire/NOTES.md` 2026-04-18 close):

1. **Add `world-freeside-ruggy.tf`** to `loa-freeside/infrastructure/terraform/`:
   ```hcl
   module "world_freeside_ruggy" {
     source = "./modules/world"
     name   = "freeside-ruggy"
     repo   = "0xHoneyJar/freeside-ruggy"
     # smaller compute — bot is low-traffic
     cpu    = 256
     memory = 512
     # bot is a long-running process, not a request handler
     desired_count = 1
   }
   ```

2. **Author `world-freeside-ruggy-secrets.tf`** with the env keys ruggy needs (V0.5-E):
   - `ANTHROPIC_API_KEY` (production LLM path)
   - `MCP_KEY` (score-mcp gate)
   - `RAILWAY_MIBERA_DATABASE_URL` (freeside_auth → midi_profiles)
   - `DISCORD_BOT_TOKEN` (Gateway client)
   - `DISCORD_CHANNEL_STONEHENGE`, `DISCORD_CHANNEL_BEAR_CAVE`, `DISCORD_CHANNEL_EL_DORADO`, `DISCORD_CHANNEL_OWSLEY_LAB` (per-zone routing)
   - `SCORE_API_URL` (default `https://score-api-production.up.railway.app`)
   - `LLM_PROVIDER=anthropic`, `STUB_MODE=false` (production overrides)
   - Optional: `DISCORD_WEBHOOK_URL` (fallback path), `FREESIDE_BASE_URL` + `FREESIDE_API_KEY` (when freeside agent-gw replaces direct anthropic)

3. **`scripts/load-freeside-ruggy-secrets.sh`** — fork from `loa-freeside/scripts/load-honeyroad-secrets.sh`, populate from operator's local config

4. **Author Dockerfile** in this repo (Bun-based, multi-stage):
   ```dockerfile
   FROM oven/bun:1.1-alpine AS builder
   WORKDIR /app
   COPY . .
   RUN bun install --frozen-lockfile

   FROM oven/bun:1.1-alpine
   WORKDIR /app
   COPY --from=builder /app .
   CMD ["bun", "run", "apps/bot/src/index.ts"]
   ```

5. **CI workflow** — fork `loa-freeside/ci-templates/world-deploy.yml` into `.github/workflows/deploy.yml`, set `AWS_DEPLOY_ROLE_ARN` GHA secret

6. **`terraform plan` + `terraform apply`** in loa-freeside — creates ECS service + ECR repo + ALB rule + secrets manager entries (NOTE: bot doesn't need ALB; may need module variant for non-HTTP services — coordinate with jani)

7. **Push image** — first deploy via GHA workflow_dispatch

8. **Validate** — bot logs visible in CloudWatch; first digest fires per cron sweep across the 4 per-zone channels

## Smaller-than-honeyroad considerations

Ruggy doesn't need:
- ALB (no inbound HTTP)
- public subnet (only outbound to score-api + freeside + Discord)
- ACM cert
- Route53 A-record (no domain)

May need a module variant: `modules/world-bot` instead of `modules/world` — file as a follow-up issue. For initial migration, can deploy via `modules/world` and ignore the unused ALB resources, or use a simpler standalone ECS task definition.

## Alternative: Railway deploy

If ECS coordination delays the migration, Railway is a faster path matching `score-api`'s deploy pattern:

```bash
railway link
railway up
# set env vars via Railway dashboard
```

Easier ops; no Freeside infra coupling. Migration to Freeside ECS happens once the runtime is stable in Railway. Operator's call.
