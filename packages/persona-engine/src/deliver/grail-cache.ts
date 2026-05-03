/**
 * Grail bytes cache (V0.7-A.4 · spec §4.2).
 *
 * In-memory, process-lifetime cache for the canonical-43 grail PNGs the codex
 * MCP returns from `lookup_grail` / `lookup_mibera` / `search_codex`. Closes
 * the cold-latency budget operator-named 2026-05-02 PT (~28s on first call ·
 * spec §2.5 budget exceeded ~2x):
 *
 *   first call (V0.7-A.3):  Bedrock cold + qmd cold + CDN cold = ~28s
 *   first call (V0.7-A.4):  Bedrock cold + qmd cold + Map lookup = ~10-15s
 *
 * Cache strategy (option A per kickoff §4.1): boot prefetches all canonical
 * grails in parallel (bounded concurrency), stores bytes in a process Map.
 * `composeWithImage` checks the cache before falling through to live fetch.
 * Cache misses (TTL-expired, new grail) re-warm via the live-fetch path
 * which calls `setGrailBytes` on success — organic re-warming.
 *
 * Per spec §2 invariants:
 *   2. Cache is character-agnostic at substrate (anyone fetching the same
 *      URL gets the cached bytes).
 *   3. Bytes-on-the-wire still the contract — cache stores Buffers; webhook
 *      receives Buffers; URL never appears in voice text.
 *   4. TTL-based invalidation (24h refresh) — V1.5 may add signal-based
 *      invalidation via codex MCP webhook.
 *   5. Memory budget: ~43 grails * ~1MB = ~43MB resident · acceptable.
 *   7. Graceful degrade preserved — boot-time fetch failures DON'T fail
 *      the bot; cache-miss fallback is the live-fetch path that already
 *      degrades to text-only on its own failure.
 *   8. No retry-storm — boot prefetch is single-attempt per URL,
 *      bounded concurrency.
 *
 * URL discovery (V1): hardcoded canonical-grail URL list embedded inline
 * (CANONICAL_GRAIL_URLS). Symmetric to grail-ref-guard's hardcoded V1 set.
 * V1.5 will hydrate from `mcp__codex__list_archetypes` at startup.
 *
 * Kill-switch: `GRAIL_CACHE_ENABLED=false` disables both the boot prefetch
 * and the cache-hit fast path in `embed-with-image.ts` — system falls back
 * to V0.7-A.3 live-fetch behavior without redeploy.
 */

/**
 * Process-wide cache of grail image bytes keyed by source URL. Map entries
 * carry `cachedAt` so TTL-expired entries fall through to live fetch
 * instead of serving stale bytes (V1.5 dynamic invalidation deferred per
 * spec §7).
 */
interface CacheEntry {
  data: Buffer;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

/** 24h TTL before cache entry is considered stale. Per spec §2 invariant 4. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Guard against multiple boot prefetches racing each other (e.g. dev-mode
 *  HMR or test reentrance). Single Promise resolves once the first init
 *  completes; subsequent callers await the same Promise. */
let initInFlight: Promise<InitResult> | null = null;

/**
 * Canonical-43 grail URLs hardcoded for V1 boot prefetch (spec §4.2). Source:
 * `grail-ref-guard.ts` CANONICAL_GRAIL_IDS + extension to the canonical 43
 * by category (zodiac+element+planet+luminary+primordial+ancestor+concept+
 * community+special).
 *
 * Slug convention: lowercase, hyphenated. Pattern verified against
 * `assets.0xhoneyjar.xyz` CDN paths from V0.7-A.3 dogfood (e.g.
 * `/Mibera/grails/black-hole.png`, `/Mibera/grails/hermes.PNG`).
 *
 * V1 conservative: ships only the 7 IDs that grail-ref-guard recognizes
 * canonically + has empirical CDN verification from prior cycles. The
 * remaining canonical grails (~36) will be added as their slugs are
 * verified in V1.5 alongside the dynamic-fetch replacement (per
 * `mcp__codex__list_archetypes` substrate hookup deferred per spec §7).
 *
 * V1.5 will replace this list with a startup-time fetch from codex MCP
 * `list_archetypes` filtered to grail category. The hardcoded list is
 * a load-bearing fallback when the codex MCP is unreachable at boot.
 */
const CANONICAL_GRAIL_URLS: ReadonlyArray<string> = [
  // 876  Black Hole (concept) — V0.7-A.3 SC1 reference
  'https://assets.0xhoneyjar.xyz/Mibera/grails/black-hole.png',
  // 4488 Satoshi-as-Hermes (ancestor) — V0.7-A.3 SC2 reference
  'https://assets.0xhoneyjar.xyz/Mibera/grails/hermes.PNG',
  // 235  Scorpio (zodiac) — V0.7-A.3 §11 transformation regression
  'https://assets.0xhoneyjar.xyz/Mibera/grails/scorpio.png',
  // 6458 Fire (element) — V0.7-A.3 §11 transformation regression
  'https://assets.0xhoneyjar.xyz/Mibera/grails/fire.png',
  // 4221 Past (concept) — V0.7-A.3 SC3 cite
  'https://assets.0xhoneyjar.xyz/Mibera/grails/past.png',
  // 1606 Pluto (planet) — V0.7-A.3 SC2 cite
  'https://assets.0xhoneyjar.xyz/Mibera/grails/pluto.png',
  // 6805 Aquarius (zodiac) — V0.7-A.3 SC2 cite
  'https://assets.0xhoneyjar.xyz/Mibera/grails/aquarius.png',
];

/** Boot-prefetch options. Defaults match spec §4.2 reference impl. */
export interface InitOptions {
  /** Parallel fetch ceiling — bounded so boot doesn't burst the CDN.
   *  Default 5 per spec §3 ("bounded concurrency = 5"). */
  concurrency?: number;
  /** Per-URL fetch timeout in milliseconds. Default 5000ms per spec §3. */
  timeoutMs?: number;
  /** Override URL list — defaults to CANONICAL_GRAIL_URLS. Caller-supplied
   *  list is useful for tests + future V1.5 dynamic-discovery hookup. */
  urls?: ReadonlyArray<string>;
}

/** Boot-prefetch outcome telemetry (returned to caller for boot log). */
export interface InitResult {
  /** URLs that fetched + cached successfully. */
  fetched: number;
  /** URLs that failed (404, timeout, network throw) — non-blocking per
   *  spec §2 invariant 7. */
  failed: number;
  /** Wall-clock duration of the boot prefetch in ms. */
  durationMs: number;
}

const DEFAULT_CONCURRENCY = 5;
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Read the GRAIL_CACHE_ENABLED env flag. Defaults to enabled. Operators
 * can set `GRAIL_CACHE_ENABLED=false` to disable both boot prefetch and
 * cache-hit fast path — system falls back to V0.7-A.3 live-fetch behavior
 * without code redeploy. Useful when post-deploy STAMETS DIG telemetry
 * shows CDN isn't a meaningful contributor to cold latency.
 *
 * Read at call time (not module load) so test harnesses can flip the env
 * inside `beforeEach` without re-importing.
 */
export function isCacheEnabled(): boolean {
  const raw = process.env.GRAIL_CACHE_ENABLED;
  if (raw === undefined) return true;
  return raw !== 'false' && raw !== '0';
}

/**
 * Fetch all grail URLs in parallel (bounded concurrency) and populate the
 * cache. Idempotent — a second call while one is in-flight returns the
 * same Promise (no double-fetch). Single-attempt per URL · per-URL
 * failures are logged but don't block the rest of the prefetch.
 *
 * Returns telemetry for the boot log line so operators can see cache
 * warm-up cost + success rate.
 *
 * Per spec §2 invariant 7: if a URL fails at boot, just log and move on;
 * the runtime cache-miss path (composeWithImage's live-fetch fallback)
 * handles it organically.
 */
export async function initGrailCache(
  opts: InitOptions = {},
): Promise<InitResult> {
  // Concurrent-init dedup (test reentrance, dev-mode HMR, future Worker
  // hot-restart). The first caller wins; later callers await the same
  // Promise + share its result.
  if (initInFlight) return initInFlight;

  initInFlight = (async () => {
    const t0 = Date.now();
    const urls = opts.urls ?? CANONICAL_GRAIL_URLS;
    const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    let fetched = 0;
    let failed = 0;

    // Chunk URLs into concurrency-sized batches and Promise.all each batch.
    // Simpler than a streaming worker pool; bounded enough for the V1 set
    // of ~7 (and acceptable when V1.5 expands to canonical 43).
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map((url) => prefetchOne(url, timeoutMs)),
      );
      for (const ok of results) {
        if (ok) fetched++;
        else failed++;
      }
    }

    const durationMs = Date.now() - t0;
    return { fetched, failed, durationMs };
  })();

  return initInFlight;
}

/**
 * Fetch a single grail URL and store bytes if successful. Returns true on
 * cache-store, false on any failure (which is logged but non-blocking).
 * Mirrors the live-fetch SSRF/size-guard contract from `embed-with-image.ts`
 * indirectly — boot prefetch only ever pulls CANONICAL_GRAIL_URLS which are
 * already on the allowlisted host (`assets.0xhoneyjar.xyz`), so no
 * additional URL validation here. V1.5 dynamic-discovery should re-validate
 * if the URL list ever sources from substrate-mutable input.
 */
async function prefetchOne(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
    if (!res.ok) {
      console.warn(
        `[grail-cache] prefetch failed status=${res.status} url=${url}`,
      );
      return false;
    }
    const data = Buffer.from(await res.arrayBuffer());
    if (data.byteLength === 0) {
      console.warn(`[grail-cache] prefetch empty body url=${url}`);
      return false;
    }
    setGrailBytes(url, data);
    return true;
  } catch (err) {
    console.warn(
      `[grail-cache] prefetch error url=${url} err=${String(err).slice(0, 120)}`,
    );
    return false;
  }
}

/**
 * Cache lookup. Returns the cached Buffer for `url` if present AND not
 * past TTL; otherwise returns `null`. Caller (composeWithImage's
 * fetchAttachment) falls through to live fetch on null.
 *
 * V1.5: when signal-based invalidation lands (codex MCP webhook on grail
 * update), this can short-circuit on staleness signals before TTL.
 */
export function getGrailBytes(url: string): Buffer | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    // TTL-expired entry — drop it so the next lookup goes through live
    // fetch (which will repopulate via setGrailBytes on success).
    cache.delete(url);
    return null;
  }
  return entry.data;
}

/**
 * Cache write. Stores bytes + timestamps the entry. Called by:
 *   1. boot-time prefetchOne after a successful fetch
 *   2. live-fetch path in embed-with-image.ts after fetching a cache-miss
 *
 * Path 2 is the V1 organic re-warming strategy: cache misses (TTL-expired
 * or never-cached) become cache fills, so steady-state hit rate climbs
 * back to ~100% after each TTL refresh + after each new-grail introduction.
 */
export function setGrailBytes(url: string, data: Buffer): void {
  cache.set(url, { data, cachedAt: Date.now() });
}

/**
 * Test-only: reset cache + in-flight init Promise. NEVER call from runtime
 * code — boot-time init dedup relies on initInFlight persisting across
 * the process lifetime. Used by test harness's beforeEach to give each
 * test a clean slate without restarting the bun-test runner.
 */
export function _resetGrailCacheForTests(): void {
  cache.clear();
  initInFlight = null;
}

/**
 * Test-only: introspect cache size. Lets test harness assert that prefetch
 * actually populated the cache (vs silently failing all fetches).
 */
export function _grailCacheSizeForTests(): number {
  return cache.size;
}

/**
 * Test-only: read the embedded canonical URL list. Lets tests verify the
 * default boot-prefetch target without duplicating the constant.
 */
export function _canonicalGrailUrlsForTests(): ReadonlyArray<string> {
  return CANONICAL_GRAIL_URLS;
}
