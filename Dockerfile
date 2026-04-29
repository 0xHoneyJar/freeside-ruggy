# freeside-ruggy — Discord persona bot (Bun runtime)
#
# Builds a long-running bot service. Same image deploys to test +
# production Railway services; environment splits per-service via env.
#
# Memory: discord.js + pg pool + claude-agent-sdk subprocess. Allocate
# at least 512MB; 1GB headroom is comfortable.

FROM oven/bun:1.3-alpine AS base

WORKDIR /app

# Workspace metadata first — keeps layer cache hot when source changes
# but deps don't. Root package.json declares `workspaces: ["apps/*", "packages/*"]`
# and bun.lock has @freeside-ruggy/protocol resolved, so its package.json
# must be copied before `bun install --frozen-lockfile` or install fails
# on missing workspace.
COPY package.json bun.lock ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/protocol/package.json ./packages/protocol/

# Install production deps only. claude-agent-sdk pulls a Claude Code
# bundle (~25MB) — needed at runtime for the SDK subprocess.
RUN bun install --frozen-lockfile --production

# Copy source after deps. Includes:
#   - apps/bot/src        TypeScript source (Bun runs .ts directly)
#   - apps/bot/.claude    skills loaded via SDK settingSources: ['project']
#   - apps/bot/src/persona/ruggy.md  system prompt template
#   - apps/bot/tsconfig.json
#   - packages/protocol   placeholder workspace (no runtime code yet, but
#                         declared in bun.lock — keep it in image for
#                         workspace-resolution consistency)
COPY apps/bot ./apps/bot
COPY packages/protocol ./packages/protocol
COPY tsconfig.json ./

ENV NODE_ENV=production

# Default command — run the bot's index.ts via Bun. The bot opens a
# Discord gateway connection + schedules cron + serves digest fires.
# Logs go to stdout; Railway captures them.
CMD ["bun", "run", "apps/bot/src/index.ts"]
