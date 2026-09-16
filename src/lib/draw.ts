import type { DrawType, Score } from "./types";

export const NUMBER_MIN = 1;
export const NUMBER_MAX = 45;
export const PICKS = 5;

/**
 * Deterministic PRNG (mulberry32). Simulations must be reproducible: an admin
 * re-running the same draft with the same seed sees the same result, and the
 * published result can be re-derived from the stored seed for an audit.
 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A subscriber's draw numbers are their five retained Stableford scores, which
 * share the draw's 1–45 range. Scores repeat, so duplicates are nudged upward
 * (wrapping at 45) to produce five distinct numbers — deterministic, so the same
 * five scores always yield the same ticket.
 */
export function numbersFromScores(scores: Pick<Score, "score" | "played_on">[]): number[] {
  const ordered = [...scores]
    .sort((a, b) => (a.played_on < b.played_on ? 1 : -1))
    .map((s) => s.score);

  const picked: number[] = [];
  for (const raw of ordered) {
    let n = clampNumber(raw);
    let guard = 0;
    while (picked.includes(n) && guard < NUMBER_MAX) {
      n = n === NUMBER_MAX ? NUMBER_MIN : n + 1;
      guard++;
    }
    picked.push(n);
    if (picked.length === PICKS) break;
  }
  return picked.sort((a, b) => a - b);
}

function clampNumber(n: number) {
  return Math.min(NUMBER_MAX, Math.max(NUMBER_MIN, Math.round(n)));
}

/** Standard lottery-style: five distinct numbers, every number equally likely. */
export function drawRandom(seed: number): number[] {
  const next = rng(seed);
  const pool = Array.from({ length: NUMBER_MAX }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PICKS).sort((a, b) => a - b);
}

/**
 * Algorithmic: each number's weight is how often it appears across this month's
 * entries, so numbers the field actually plays are likelier to come up. A +1
 * smoothing keeps every number reachable even if nobody played it.
 */
export function drawAlgorithmic(entries: number[][], seed: number): number[] {
  const weights = new Map<number, number>();
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) weights.set(n, 1);
  for (const entry of entries) {
    for (const n of entry) weights.set(n, (weights.get(n) ?? 1) + 1);
  }

  const next = rng(seed);
  const remaining = [...weights.entries()];
  const result: number[] = [];

  while (result.length < PICKS && remaining.length > 0) {
    const total = remaining.reduce((sum, [, w]) => sum + w, 0);
    let ticket = next() * total;
    let index = 0;
    for (let i = 0; i < remaining.length; i++) {
      ticket -= remaining[i][1];
      if (ticket <= 0) {
        index = i;
        break;
      }
    }
    result.push(remaining[index][0]);
    remaining.splice(index, 1);
  }
  return result.sort((a, b) => a - b);
}

export function generateWinningNumbers(type: DrawType, entries: number[][], seed: number) {
  return type === "algorithmic" ? drawAlgorithmic(entries, seed) : drawRandom(seed);
}

export function matchCount(entry: number[], winning: number[]) {
  const set = new Set(winning);
  return entry.reduce((count, n) => count + (set.has(n) ? 1 : 0), 0);
}

export interface SimulationEntry {
  user_id: string;
  numbers: number[];
  display_name?: string;
}

export interface TierResult {
  tier: 3 | 4 | 5;
  share_pct: number;
  pool_paise: number;
  winners: { user_id: string; display_name?: string; amount_paise: number; numbers: number[] }[];
  /** True when nobody matched this tier. */
  unclaimed: boolean;
}

export interface SimulationResult {
  winning_numbers: number[];
  entries_count: number;
  total_pool_paise: number;
  tiers: TierResult[];
  /** The 5-match pool carries forward when unclaimed; the other tiers do not. */
  rollover_out_paise: number;
  retained_paise: number;
}

export interface SimulationInput {
  type: DrawType;
  entries: SimulationEntry[];
  poolPaise: number;
  rolloverInPaise: number;
  split: { five: number; four: number; three: number };
  seed: number;
  /** Supply to replay a published draw instead of generating fresh numbers. */
  winningNumbers?: number[];
}

/**
 * Splits the pool across the three tiers, divides each tier equally among its
 * winners, and reports what carries forward. All maths is in paise and the
 * remainder from an uneven split is handed to the first winner, so tier totals
 * always add back up to the pool exactly.
 */
export function simulateDraw(input: SimulationInput): SimulationResult {
  const { type, entries, poolPaise, rolloverInPaise, split, seed } = input;

  const winning =
    input.winningNumbers ??
    generateWinningNumbers(
      type,
      entries.map((e) => e.numbers),
      seed
    );

  const jackpotPool = Math.round((poolPaise * split.five) / 100) + rolloverInPaise;
  const tierPools: Record<3 | 4 | 5, number> = {
    5: jackpotPool,
    4: Math.round((poolPaise * split.four) / 100),
    3: Math.round((poolPaise * split.three) / 100),
  };

  const buckets: Record<3 | 4 | 5, SimulationEntry[]> = { 3: [], 4: [], 5: [] };
  for (const entry of entries) {
    const matched = matchCount(entry.numbers, winning);
    if (matched === 3 || matched === 4 || matched === 5) buckets[matched].push(entry);
  }

  const shares: Record<3 | 4 | 5, number> = { 5: split.five, 4: split.four, 3: split.three };
  const tiers = ([5, 4, 3] as const).map<TierResult>((tier) => {
    const pool = tierPools[tier];
    const group = buckets[tier];
    const each = group.length > 0 ? Math.floor(pool / group.length) : 0;
    const remainder = group.length > 0 ? pool - each * group.length : 0;

    return {
      tier,
      share_pct: shares[tier],
      pool_paise: pool,
      unclaimed: group.length === 0,
      winners: group.map((entry, i) => ({
        user_id: entry.user_id,
        display_name: entry.display_name,
        numbers: entry.numbers,
        amount_paise: each + (i === 0 ? remainder : 0),
      })),
    };
  });

  const jackpot = tiers.find((t) => t.tier === 5)!;
  const rollover = jackpot.unclaimed ? jackpot.pool_paise : 0;
  const retained = tiers
    .filter((t) => t.tier !== 5 && t.unclaimed)
    .reduce((sum, t) => sum + t.pool_paise, 0);

  return {
    winning_numbers: winning,
    entries_count: entries.length,
    total_pool_paise: poolPaise + rolloverInPaise,
    tiers,
    rollover_out_paise: rollover,
    retained_paise: retained,
  };
}

/**
 * How one subscription payment is divided. The charity percentage is the
 * subscriber's choice (10% floor). The prize pool takes its fixed cut from
 * what's left, so a subscriber who gives 100% never pushes the split negative.
 */
export function splitSubscription(amountPaise: number, charityPct: number, prizePoolPct: number) {
  const charity = Math.round((amountPaise * charityPct) / 100);
  const remainder = amountPaise - charity;
  const prizePool = Math.min(Math.round((amountPaise * prizePoolPct) / 100), remainder);
  return { charity_paise: charity, prize_pool_paise: prizePool, platform_paise: remainder - prizePool };
}
