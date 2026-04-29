/**
 * Orchestrator — Claude Agent SDK execution layer (V0.5-A).
 *
 * Wraps a single LLM call through `@anthropic-ai/claude-agent-sdk`'s
 * `query()` runtime. This is the V0.5 successor to V0.4.5's manual
 * `invokeAnthropicDirect` fetch in `agent-gateway.ts` — the SDK gives us
 * the loop primitives (mcpServers, settingSources, permissionMode,
 * subagents) that V0.5-B and V0.5-C will lean on.
 *
 * V0.5-A scope (this file):
 *   - Single-turn query, no tool calls (preserves V0.4.5 voice/output)
 *   - Digest data is still pre-fetched by `score/client.ts` and embedded
 *     in the user message (zero behavior change vs V0.4.5)
 *   - mcpServers config is wired but the LLM has no reason to invoke
 *     them yet — persona prompt doesn't direct tool use
 *
 * V0.5-B will:
 *   - Add Arneson skill via `.claude/skills/arneson/SKILL.md`
 *   - Add Rosenzu HTTP MCP alongside score
 *   - Update persona to call `mcp__rosenzu__get_current_district` +
 *     `mcp__rosenzu__furnish_kansei` before scene-gen
 *   - Then `score/client.ts` prefetch can be retired in favor of LLM
 *     calling `mcp__score__get_zone_digest` directly
 *
 * V0.5-C will:
 *   - Add Gygax subagent via `agents` config
 *   - Wire `/memories` via `settingSources: ['project']`
 */

import { query, type McpServerConfig, type Options } from '@anthropic-ai/claude-agent-sdk';
import type { Config } from '../config.ts';
import type { ZoneId } from '../score/types.ts';
import type { PostType } from '../llm/post-types.ts';

export interface OrchestratorRequest {
  systemPrompt: string;
  userMessage: string;
  zone: ZoneId;
  postType: PostType;
}

export interface OrchestratorResponse {
  text: string;
  meta?: Record<string, unknown>;
}

/**
 * Build the mcpServers map for the SDK query options.
 *
 * V0.5-A registers `score` (zerker's score-mcp) when MCP_KEY is set so
 * V0.5-B's persona-prompt update is a one-line activation. The LLM does
 * not invoke score tools in V0.5-A — digest data arrives pre-fetched in
 * the user message.
 */
function buildMcpServers(config: Config): Record<string, McpServerConfig> {
  const servers: Record<string, McpServerConfig> = {};

  if (!config.STUB_MODE && config.MCP_KEY) {
    servers.score = {
      type: 'http',
      url: `${config.SCORE_API_URL}/mcp`,
      headers: { 'X-MCP-Key': config.MCP_KEY },
    };
  }

  return servers;
}

/**
 * Allowed tool whitelist for headless safety.
 *
 * `permissionMode: 'dontAsk'` denies anything not pre-approved. We
 * whitelist `mcp__<server>__*` for each registered MCP server.
 */
function buildAllowedTools(mcpServers: Record<string, McpServerConfig>): string[] {
  return Object.keys(mcpServers).map((name) => `mcp__${name}__*`);
}

/**
 * Build the env passed to the SDK subprocess.
 *
 * When ruggy runs inside another Claude Code session (e.g. during dev),
 * inheriting `CLAUDECODE=1` + `CLAUDE_CODE_ENTRYPOINT` etc. flips the
 * SDK into bridge-mode auth, which then fails ("Invalid API key"). We
 * scrub those vars so the SDK uses direct Anthropic API auth via
 * `ANTHROPIC_API_KEY` in production and dev alike.
 */
function buildSdkEnv(config: Config): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('CLAUDE_CODE_') || k === 'CLAUDECODE' || k === 'CLAUDE_PLUGIN_DATA') {
      continue;
    }
    env[k] = v;
  }
  env.ANTHROPIC_API_KEY = config.ANTHROPIC_API_KEY!;
  return env;
}

export async function runOrchestratorQuery(
  config: Config,
  req: OrchestratorRequest,
): Promise<OrchestratorResponse> {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error(
      'orchestrator: ANTHROPIC_API_KEY required for SDK path. Set it or switch LLM_PROVIDER to stub/freeside.',
    );
  }

  const mcpServers = buildMcpServers(config);
  const allowedTools = buildAllowedTools(mcpServers);

  const options: Options = {
    systemPrompt: req.systemPrompt,
    model: config.ANTHROPIC_MODEL,
    mcpServers,
    allowedTools,
    permissionMode: 'dontAsk',
    // V0.5-A: empty — don't load project CLAUDE.md / skills (would change
    // voice). V0.5-B flips this to ['project'] to load Arneson skill.
    settingSources: [],
    tools: [],
    maxTurns: 1,
    env: buildSdkEnv(config),
    stderr: (data) => {
      if (config.LOG_LEVEL === 'debug') {
        console.error(`[sdk] ${data.trimEnd()}`);
      }
    },
  };

  let text = '';
  let usage: Record<string, unknown> | undefined;

  for await (const message of query({ prompt: req.userMessage, options })) {
    if (message.type !== 'result') continue;

    if (message.subtype === 'success') {
      text = message.result;
      usage = {
        duration_ms: message.duration_ms,
        duration_api_ms: message.duration_api_ms,
        num_turns: message.num_turns,
        total_cost_usd: message.total_cost_usd,
        ...message.usage,
      };
      break;
    }

    throw new Error(
      `orchestrator: SDK error subtype=${message.subtype}` +
        (message.errors?.length ? ` errors=${message.errors.join('; ')}` : ''),
    );
  }

  if (!text) {
    throw new Error('orchestrator: SDK query completed without an assistant text response');
  }

  return { text, meta: usage };
}
