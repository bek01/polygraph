export interface AssetDef {
  symbol: string;
  name: string;
  /** Chain + token address used for the onchain ("DO") side. */
  chain: string;
  tokenAddress: string;
  /** Polymarket tags that scope the market screener. */
  tags: string[];
  /** Lower-cased names that may appear in a market question. */
  aliases: string[];
  /** Sanity bounds for a parsed strike, to reject "$5 gas fee" style numbers. */
  strikeRange: [number, number];
  accent: string;
}

/**
 * Only assets that have BOTH a liquid Polymarket strike ladder AND a Nansen
 * flow-intelligence surface make it in. Assets with one or two thin markets
 * produce a meaningless implied median, so they are deliberately excluded
 * rather than shipped as noise.
 */
export const ASSETS: AssetDef[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    chain: 'ethereum',
    tokenAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    tags: ['Bitcoin'],
    aliases: ['bitcoin', 'btc'],
    strikeRange: [1_000, 10_000_000],
    accent: '#f7931a',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    chain: 'ethereum',
    tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    tags: ['Ethereum'],
    aliases: ['ethereum', 'ether', 'eth'],
    strikeRange: [100, 100_000],
    accent: '#8a92ff',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    chain: 'solana',
    tokenAddress: 'So11111111111111111111111111111111111111112',
    tags: ['Solana'],
    aliases: ['solana', 'sol'],
    strikeRange: [5, 10_000],
    accent: '#25d6a3',
  },
];

export function findAsset(symbol: string): AssetDef | undefined {
  return ASSETS.find((a) => a.symbol.toLowerCase() === symbol.toLowerCase());
}

// ---------------------------------------------------------------------------
// Question parsing
//
// This is the part that decides whether the crowd's belief curve is real or
// garbage. Two distinctions matter and both are easy to get wrong:
//
//   1. DIRECTION — "reach $80k" prices P(>= 80k); "dip to $65k" prices
//      P(<= 65k). Both must be normalised to the same quantity.
//
//   2. SETTLEMENT STYLE — "will BTC REACH $80k in September" is a *barrier*
//      (touch) question: it pays if the price ever trades there. "Will BTC BE
//      ABOVE $80k ON September 16" is a *terminal* question: only the closing
//      value counts. Touch probabilities are strictly higher than terminal
//      ones for the same strike and horizon, so mixing the two produces a
//      non-monotonic curve and a meaningless median. They are kept apart.
// ---------------------------------------------------------------------------

export type SettlementStyle = 'terminal' | 'touch';

const BELOW_WORDS = ['dip to', 'fall to', 'drop to', 'below', 'under', 'less than'];
const ABOVE_WORDS = ['reach', 'hit', 'above', 'over', 'exceed', 'at least', 'more than'];

/** Verbs that imply a barrier rather than a close. */
const TOUCH_WORDS = ['reach', 'hit', 'dip to', 'fall to', 'drop to', 'touch'];

/**
 * Extracts a USD strike from a Polymarket question.
 * Handles "$82,000", "$2.7k", "$105K", "$1.2 million".
 */
export function parseStrike(question: string, range: [number, number]): number | null {
  const q = question.replace(/,/g, '');
  const re = /\$\s?(\d+(?:\.\d+)?)\s*(k|m|million|thousand)?/gi;
  const candidates: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(q)) !== null) {
    let v = parseFloat(m[1]);
    const suffix = (m[2] ?? '').toLowerCase();
    if (suffix === 'k' || suffix === 'thousand') v *= 1_000;
    if (suffix === 'm' || suffix === 'million') v *= 1_000_000;
    if (v >= range[0] && v <= range[1]) candidates.push(v);
  }
  if (candidates.length !== 1) {
    // Zero strikes means we could not read it; two or more means a range
    // question ("between $80k and $90k"), which is not a ladder rung.
    return null;
  }
  return candidates[0];
}

export function parseDirection(question: string): 'above' | 'below' | null {
  const q = question.toLowerCase();
  for (const w of BELOW_WORDS) if (q.includes(w)) return 'below';
  for (const w of ABOVE_WORDS) if (q.includes(w)) return 'above';
  return null;
}

export function parseSettlement(question: string): SettlementStyle {
  const q = question.toLowerCase();
  return TOUCH_WORDS.some((w) => q.includes(w)) ? 'touch' : 'terminal';
}

/**
 * Markets whose probability does not describe a price level at all:
 * legislation, corporate treasuries, ETF approvals, candle direction,
 * and asset-vs-asset comparisons.
 */
const LADDER_BLOCKLIST = [
  'up or down',
  'clarity act',
  'microstrategy',
  'etf',
  'flip',
  'higher than',
  'vs.',
  ' vs ',
  'all-time high',
  'new ath',
  'between',
  'strategy buy',
  'saylor',
];

export function isLadderCandidate(question: string): boolean {
  const q = question.toLowerCase();
  return !LADDER_BLOCKLIST.some((b) => q.includes(b));
}

export function matchesAsset(question: string, asset: AssetDef): boolean {
  const q = question.toLowerCase();
  return asset.aliases.some((a) => new RegExp(`\\b${a}\\b`).test(q));
}

// ---------------------------------------------------------------------------
// Horizon bucketing
//
// A $1,600 strike expiring in December and a $1,500 strike expiring tomorrow
// are not two points on one curve — the December market can legitimately price
// higher. Rungs are therefore grouped by time to expiry and only one coherent
// horizon is ever used to compute a median.
// ---------------------------------------------------------------------------

export interface Horizon {
  key: string;
  label: string;
  maxDays: number;
}

export const HORIZONS: Horizon[] = [
  { key: 'intraday', label: 'today', maxDays: 2 },
  { key: 'week', label: 'this week', maxDays: 10 },
  { key: 'month', label: 'this month', maxDays: 45 },
  { key: 'quarter', label: 'this quarter', maxDays: 120 },
  { key: 'year', label: 'this year and beyond', maxDays: Number.POSITIVE_INFINITY },
];

export function horizonFor(endDate: string, now = Date.now()): Horizon {
  const days = (new Date(endDate).getTime() - now) / 86_400_000;
  return HORIZONS.find((h) => days <= h.maxDays) ?? HORIZONS[HORIZONS.length - 1];
}
