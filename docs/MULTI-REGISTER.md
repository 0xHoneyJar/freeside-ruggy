# Multi-register doctrine

> **Eileen on Purupuru's daemon voice across 5 surfaces** (vault:
> `storytelling-game-social-convergence.md`):
> *"Whisper · Tactician · Companion · Broadcaster · Witness — same character,
> different registers. The player moves between rooms and the daemon is
> already there, remembering what happened in the last room."*

A character is **multi-register by design**. One identity, N voices. The
register depends on the surface, the moment, and the data shape. This is the
forcing function that makes "one bot, N characters" the right shape — and
why the Discord 50-bot limit is a feature, not a constraint.

## How it manifests in `freeside-characters`

Each character carries TWO axes of register variation:

### Axis 1: Post-type registers (character-supplied)

Each character's `persona.md` declares fragment blocks for the 6 post-types.
Each fragment is a register shift. The same character speaks differently in
each:

| Post-type | Register shift |
|---|---|
| `digest` | structured, stat-quoting, weekly-review register |
| `micro` | casual drop-in, observation-only, no greeting/closing |
| `weaver` | cross-zone connection-naming, gentle synthesis register |
| `lore_drop` | head-nod-to-regulars, codex-anchored, light-touch reference |
| `question` | open-ended invitation, low-pressure, no-answer-expected |
| `callout` | calm voice over alarm-shaped data, lead-with-🚨 |

These are character-defined — Ruggy's six registers will differ from Satoshi's
six. The substrate doesn't prescribe what each register sounds like; it just
guarantees the right fragment is in scope when the right post-type fires.

### Axis 2: Cabal-gygax archetype lens (substrate-supplied)

Before each compose, the substrate dispatches the cabal-gygax subagent. It
picks 1 of 9 phantom-player archetypes:

| Archetype | When it picks |
|---|---|
| **Optimizer** | factor multipliers spike; someone gaming the system |
| **Newcomer** | data has educational hook; "if you're new to X…" register fits |
| **Storyteller** | a multi-week climb is surfacing; drama from data sequence |
| **Rules-Lawyer** | numbers ARE the story; clean stats with no ambiguity |
| **Chaos-Agent** | data is ambiguous; signal uncertainty is genuine |
| **GM** | weaver post; cross-zone correlation; bird's-eye |
| **Anxious-Player** | quiet weeks, drops; "should I be worried" register |
| **Veteran** | data echoes a prior pattern; long-tenured eye |
| **Explorer** | a zone is flat/empty; the absence IS the observation |

The chosen archetype shifts the character's register for that one post. The
character's `persona.md` typically has a `VOICE LENS REGISTER` section
mapping each archetype to a register shift specific to that character.

This is universal — the same 9 archetypes apply to every character. Each
character interprets them through their own voice.

### The product: 6 × 9 = 54 register slots

Each character has 6 post-type registers × 9 cabal lens archetypes = 54
distinct register slots. Plus randomness in word choice, exemplar selection,
emoji pick. The combinatorics keep voice from collapsing into "Ruggy posts the
same thing in micro form every Tuesday."

## Why this matters

### "The strongest dNFT is the most meaningful companion"

Per Eileen (`puruhani-as-spine.md`), the goal isn't autonomous mibera-agent. It
is a **meaningful companion** that miberas (community members) actually build
relationship with. Voice fidelity across registers is the load-bearing
capability — recognizing that the digest-Ruggy and the micro-Ruggy and the
callout-Ruggy are all the same Ruggy, just speaking in different shapes.

If a character flattens to one register ("ruggy says the same thing every
time"), it stops being a companion and becomes a feed. The multi-register
doctrine prevents that flattening.

### Cross-character co-existence

When V0.6-C lands satoshi alongside ruggy, they don't compete for "the bot's
voice" — they each carry their own register-set. Same Discord bot identity,
two characters, each with their own 6 × 9 register slots. Eileen explicit:
*"if ruggy say something, can satoshi read/write?"* — that's V0.6-D, the
cross-character interaction layer that the multi-register architecture
makes possible.

## What the substrate enforces

The substrate guarantees:

- The right post-type fragment is loaded for each fire (no leakage between
  post-types)
- The cabal-gygax dispatch happens BEFORE compose, so the lens is in the
  prompt context (not retrofit)
- Exemplars are sampled per-character per-post-type (no cross-character voice
  contamination)

The substrate does NOT prescribe:

- What each character's 6 registers sound like (character supplies)
- How a character interprets each cabal archetype (character's
  `VOICE LENS REGISTER` section)
- Which registers a character even uses (a future character could override
  post-type-spec to omit `callout`, for example)

## V0.6 → V0.7 trajectory

In V0.6 (character-stage), registers are LLM-driven with rule-based + ICE
guidance. In V0.7+ (daemon-stage, per `puruhani-daemon.md`), registers
elevate to **designed-voice templates** with LLM as final-pass voice-in-context.
The multi-register architecture survives the transition unchanged — what
changes is the substitution mechanism (templates instead of system-prompt
fragments).
