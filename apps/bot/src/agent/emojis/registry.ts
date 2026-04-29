/**
 * Custom emoji registry for the Mibera Discord guild.
 *
 * Operator dropped 43 emoji IDs (2026-04-29) — 26 mibera + 17 ruggy.
 * I fetched each PNG from `https://cdn.discordapp.com/emojis/{id}.png`
 * and tagged each by visual mood/expression. Naming is provisional —
 * operator refines as ruggy uses them in the wild.
 *
 * Discord render syntax: `<:name:id>` (or `<a:name:id>` for animated).
 * The `name` slot is cosmetic — Discord matches by ID. Using descriptive
 * names here just makes prose readable when ruggy authors a post.
 *
 * Usage rule (per persona): emojis are EXPRESSION, not decoration.
 * 0-1 per post is the default. A pop-in might lean on one custom
 * emoji as the punchline; a digest leans on regular emoji + maybe
 * one custom at warmth moment.
 */

export type EmojiKind = 'mibera' | 'ruggy';

export type EmojiMood =
  | 'cute'
  | 'shocked'
  | 'love'
  | 'celebrate'
  | 'snark'
  | 'cry'
  | 'confused'
  | 'angry'
  | 'cool'
  | 'dazed'
  | 'shy'
  | 'wave'
  | 'peace'
  | 'hands-up'
  | 'flex'
  | 'mining'
  | 'dapper'
  | 'honey'
  | 'psychedelic'
  | 'concerned'
  | 'shrug'
  | 'pls'
  | 'nope'
  | 'eyes';

export interface EmojiEntry {
  id: string;
  kind: EmojiKind;
  /** Provisional handle. Operator will refine. */
  name: string;
  /** Best-fit mood tag for `pick_by_mood`. */
  mood: EmojiMood;
  /** What ruggy "sees" — visual notes the LLM can read. */
  visual: string;
  /** When to use it — context cue for LLM picking. */
  use_when: string;
  animated: boolean;
}

export const EMOJIS: EmojiEntry[] = [
  // ─── mibera (26) ─────────────────────────────────────────────────
  {
    id: '1450229316255355010',
    kind: 'mibera',
    name: 'mibera_bear_peek',
    mood: 'cute',
    visual: 'brown bear-hooded mibera peeking out, soft cute eyes',
    use_when: 'warm welcome, soft acknowledgement, "henlo" energy',
    animated: false,
  },
  {
    id: '1448669925076893776',
    kind: 'mibera',
    name: 'mibera_wide_eyes',
    mood: 'shocked',
    visual: 'blue-haired mibera, big surprised wide eyes',
    use_when: 'genuine surprise — a real spike, an unexpected wallet move',
    animated: false,
  },
  {
    id: '1448667662958858422',
    kind: 'mibera',
    name: 'mibera_peace',
    mood: 'peace',
    visual: 'mibera in colorful fedora, peace fingers ✌',
    use_when: 'casual sign-off, "all good", chill vibe',
    animated: false,
  },
  {
    id: '1448669964692230226',
    kind: 'mibera',
    name: 'mibera_sparkle_eyes',
    mood: 'cute',
    visual: 'dark-skinned mibera with sparkly anime eyes',
    use_when: 'admiration, "respect", noting something beautiful',
    animated: false,
  },
  {
    id: '1448670055947567136',
    kind: 'mibera',
    name: 'mibera_could_be_shittin',
    mood: 'snark',
    visual: 'mibera in cap reading "I could be shittin\'", defiant',
    use_when: 'playful skepticism, "ngl", honest take',
    animated: false,
  },
  {
    id: '1450228983638655062',
    kind: 'mibera',
    name: 'mibera_ninja',
    mood: 'eyes',
    visual: 'mibera with face-mask/ninja covering, only eyes showing',
    use_when: 'stealth move, quiet stacking, "just appeared"',
    animated: false,
  },
  {
    id: '1448670251519574138',
    kind: 'mibera',
    name: 'mibera_glasses',
    mood: 'cool',
    visual: 'dark-skinned mibera with oversized green glasses',
    use_when: 'analyst mode, looking carefully, "let me peep that"',
    animated: false,
  },
  {
    id: '1448669989208068116',
    kind: 'mibera',
    name: 'mibera_look_up',
    mood: 'shocked',
    visual: 'blue-haired mibera looking up, big eyes',
    use_when: 'gentle "oh!", noticing something',
    animated: false,
  },
  {
    id: '1450228846602358836',
    kind: 'mibera',
    name: 'mibera_heart_eyes',
    mood: 'love',
    visual: 'pink-haired mibera with heart eyes',
    use_when: 'love for a move, beautiful play, fren energy',
    animated: false,
  },
  {
    id: '1450228890390761492',
    kind: 'mibera',
    name: 'mibera_clown_red',
    mood: 'snark',
    visual: 'mibera in red cap, slight clown vibe',
    use_when: 'playful jab, "lol that\'s wild", roast-but-friendly',
    animated: false,
  },
  {
    id: '1450228956560097320',
    kind: 'mibera',
    name: 'mibera_dark_eyes',
    mood: 'angry',
    visual: 'mibera with dark intense eye-glow, almost menacing',
    use_when: 'spotlight an anomaly, "watch this one carefully"',
    animated: false,
  },
  {
    id: '1448670207936696431',
    kind: 'mibera',
    name: 'mibera_writing',
    mood: 'mining',
    visual: 'green-haired mibera scribbling/writing with marker',
    use_when: 'noting something, recording, "ruggy\'s logging this"',
    animated: false,
  },
  {
    id: '1448670128110571601',
    kind: 'mibera',
    name: 'mibera_bear_hood',
    mood: 'cute',
    visual: 'brown bear-hooded mibera, classic cute',
    use_when: 'warm sign-off, soft "stay groovy" alternative',
    animated: false,
  },
  {
    id: '1448670014076092562',
    kind: 'mibera',
    name: 'mibera_pls',
    mood: 'pls',
    visual: 'blue-haired mibera with text "PLS"',
    use_when: 'begging, "pls show up this week", playful ask',
    animated: false,
  },
  {
    id: '1448670356167463075',
    kind: 'mibera',
    name: 'mibera_oh_no',
    mood: 'shocked',
    visual: 'blue-bandana mibera with hands on cheeks, shocked',
    use_when: 'mild "oh no", a wallet slipping, gentle dismay',
    animated: false,
  },
  {
    id: '1450229012923416616',
    kind: 'mibera',
    name: 'mibera_punk',
    mood: 'angry',
    visual: 'clown-y mibera with text "you fuckin a punk", aggro',
    use_when: 'rare — only when calling out clear disrespect; sparingly',
    animated: false,
  },
  {
    id: '1450228781636915344',
    kind: 'mibera',
    name: 'mibera_cry',
    mood: 'cry',
    visual: 'teal-haired mibera with tearful eyes',
    use_when: 'genuine ouch, a hard drop, fren slipping',
    animated: false,
  },
  {
    id: '1450228913996431382',
    kind: 'mibera',
    name: 'mibera_palm',
    mood: 'nope',
    visual: 'red palm/hand-up mibera, stop gesture',
    use_when: '"hold up", "wait, peep this", gentle stop',
    animated: false,
  },
  {
    id: '1448670378808311971',
    kind: 'mibera',
    name: 'mibera_dazed',
    mood: 'dazed',
    visual: 'grey-toned mibera with spiral eyes, zoned out',
    use_when: 'overwhelmed by a wild week, "the spiral", confusion',
    animated: false,
  },
  {
    id: '1450228868232515655',
    kind: 'mibera',
    name: 'mibera_innocent',
    mood: 'shy',
    visual: 'blonde wide-eyed mibera, innocent look',
    use_when: 'soft ask, naive question, gentle observation',
    animated: false,
  },
  {
    id: '1450228934796116029',
    kind: 'mibera',
    name: 'mibera_sign',
    mood: 'pls',
    visual: 'green-haired mibera holding a small red sign',
    use_when: 'making a statement, drawing attention, "look here"',
    animated: false,
  },
  {
    id: '1448670327533207692',
    kind: 'mibera',
    name: 'mibera_face_palm',
    mood: 'concerned',
    visual: 'mibera in bear hat with hands at face',
    use_when: 'embarrassment, secondhand cringe, "yikes" moment',
    animated: false,
  },
  {
    id: '1450228703660609708',
    kind: 'mibera',
    name: 'mibera_bear_classic',
    mood: 'cute',
    visual: 'brown bear-hooded mibera, classic peek pose',
    use_when: 'classic warm bear energy, default friendly',
    animated: false,
  },
  {
    id: '1448670279978188901',
    kind: 'mibera',
    name: 'mibera_question',
    mood: 'confused',
    visual: 'white panda mibera with red question mark above',
    use_when: 'genuine question post, "anyone know?", uncertainty',
    animated: false,
  },
  {
    id: '1448670300404318350',
    kind: 'mibera',
    name: 'mibera_rugged',
    mood: 'cute',
    visual: 'mibera in blue rug-pattern hood',
    use_when: 'reference to rugging culture, warm self-aware nod',
    animated: false,
  },
  {
    id: '1448670229839482921',
    kind: 'mibera',
    name: 'mibera_concerned',
    mood: 'concerned',
    visual: 'blonde mibera with concerned/worried face',
    use_when: 'worry, caution flag, "watch this carefully"',
    animated: false,
  },

  // ─── ruggy (17) ──────────────────────────────────────────────────
  {
    id: '1138775429482819645',
    kind: 'ruggy',
    name: 'ruggy_neutral',
    mood: 'cute',
    visual: 'ruggy face, neutral squinting bear',
    use_when: 'default ruggy presence, "ruggy here"',
    animated: false,
  },
  {
    id: '1142034838124253185',
    kind: 'ruggy',
    name: 'ruggy_squint',
    mood: 'cool',
    visual: 'ruggy with yellow accent, squinting',
    use_when: 'analytical look, "peeping", watching carefully',
    animated: false,
  },
  {
    id: '1141258308737585162',
    kind: 'ruggy',
    name: 'ruggy_celebrate',
    mood: 'celebrate',
    visual: 'ruggy in suit holding champagne/drink',
    use_when: 'celebration, big-week wins, "we did it" moment',
    animated: false,
  },
  {
    id: '1142035114008772608',
    kind: 'ruggy',
    name: 'ruggy_lets_go',
    mood: 'celebrate',
    visual: 'ruggy chibi in yellow shirt jumping/excited',
    use_when: 'hyped moment, "let\'s go", momentum',
    animated: false,
  },
  {
    id: '1143652000110747720',
    kind: 'ruggy',
    name: 'ruggy_hands_up',
    mood: 'hands-up',
    visual: 'ruggy raising arms — crowd / cheer',
    use_when: 'crowd celebration, "the og crew showed up", communal',
    animated: false,
  },
  {
    id: '1142014493476532234',
    kind: 'ruggy',
    name: 'ruggy_dripped',
    mood: 'honey',
    visual: 'ruggy with melting/dripping yellow honey',
    use_when: 'honey reference, sticky-good, "henlock" energy',
    animated: false,
  },
  {
    id: '1142020693123420223',
    kind: 'ruggy',
    name: 'ruggy_aura',
    mood: 'celebrate',
    visual: 'ruggy with yellow burst behind, illuminated',
    use_when: 'spotlight moment, eureka, "this hit different"',
    animated: false,
  },
  {
    id: '1142029237994389534',
    kind: 'ruggy',
    name: 'ruggy_flex',
    mood: 'flex',
    visual: 'ruggy in yellow shirt, flex/gym pose',
    use_when: 'wallet flexing big numbers, "stacking", strong move',
    animated: false,
  },
  {
    id: '1142514520032555189',
    kind: 'ruggy',
    name: 'ruggy_psychedelic',
    mood: 'psychedelic',
    visual: 'ruggy with rainbow/tie-dye background',
    use_when: 'owsley-lab vibes, late-night, acidhouse moments',
    animated: false,
  },
  {
    id: '1144175906412314634',
    kind: 'ruggy',
    name: 'ruggy_love',
    mood: 'love',
    visual: 'ruggy in pink/heart pose',
    use_when: 'fren love, deep respect, warm ack',
    animated: false,
  },
  {
    id: '1141009764864770068',
    kind: 'ruggy',
    name: 'ruggy_chibi',
    mood: 'cute',
    visual: 'small ruggy chibi, shy bear',
    use_when: 'soft moment, low-key, "a little" qualifier',
    animated: false,
  },
  {
    id: '1143651985208385628',
    kind: 'ruggy',
    name: 'ruggy_treasure',
    mood: 'mining',
    visual: 'ruggy with bear pendant/key/treasure',
    use_when: 'el-dorado vibes, treasure-hunt, mints stacking',
    animated: false,
  },
  {
    id: '1141256545779331123',
    kind: 'ruggy',
    name: 'ruggy_pickaxe',
    mood: 'mining',
    visual: 'ruggy holding pickaxe, mining',
    use_when: 'el-dorado mining, grinding, "putting in the work"',
    animated: false,
  },
  {
    id: '1142014302040104991',
    kind: 'ruggy',
    name: 'ruggy_dapper',
    mood: 'dapper',
    visual: 'ruggy in suit, dapper, sophisticated pose',
    use_when: 'formal observation, "ruggy reports", weekly digest tone',
    animated: false,
  },
  {
    id: '1142020697376444497',
    kind: 'ruggy',
    name: 'ruggy_grin',
    mood: 'cute',
    visual: 'ruggy big grinning face, happy',
    use_when: 'genuine smile, warm moment, "love to see it"',
    animated: false,
  },
  {
    id: '1148914343291928619',
    kind: 'ruggy',
    name: 'ruggy_dark',
    mood: 'eyes',
    visual: 'ruggy face simple, darker tone',
    use_when: 'serious moment, late-night observation, owsley-lab',
    animated: false,
  },
  {
    id: '1143937395998331071',
    kind: 'ruggy',
    name: 'ruggy_honey',
    mood: 'honey',
    visual: 'ruggy with golden/honey blob, holding it',
    use_when: 'honey reference, $HENLO/$BGT, treasure moment',
    animated: false,
  },
];

// ─── helpers ─────────────────────────────────────────────────────────

export function renderEmoji(entry: EmojiEntry): string {
  const prefix = entry.animated ? 'a' : '';
  return `<${prefix}:${entry.name}:${entry.id}>`;
}

export function findById(id: string): EmojiEntry | null {
  return EMOJIS.find((e) => e.id === id) ?? null;
}

export function findByName(name: string): EmojiEntry | null {
  return EMOJIS.find((e) => e.name === name) ?? null;
}

export function pickByMood(mood: EmojiMood, kind?: EmojiKind): EmojiEntry[] {
  return EMOJIS.filter((e) => e.mood === mood && (kind ? e.kind === kind : true));
}

export const ALL_MOODS: EmojiMood[] = [
  'cute',
  'shocked',
  'love',
  'celebrate',
  'snark',
  'cry',
  'confused',
  'angry',
  'cool',
  'dazed',
  'shy',
  'wave',
  'peace',
  'hands-up',
  'flex',
  'mining',
  'dapper',
  'honey',
  'psychedelic',
  'concerned',
  'shrug',
  'pls',
  'nope',
  'eyes',
];
