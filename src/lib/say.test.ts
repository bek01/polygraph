import { strict as assert } from 'node:assert';
import test from 'node:test';
import { ASSETS, parseDirection, parseSettlement, parseStrike } from './assets';
import { readCrowd } from './say';
import type { PredictionMarket } from './types';

/**
 * The question parser is the single most fragile part of Polygraph: every
 * number downstream depends on correctly reading a sentence written by
 * Polymarket's market creators. These cases are all real questions returned by
 * the live screener, plus the edge cases that broke the first version.
 *
 * Run: npm test
 */

const BTC = ASSETS.find((a) => a.symbol === 'BTC')!;
const ETH = ASSETS.find((a) => a.symbol === 'ETH')!;

test('parses strikes with commas, k-suffixes and decimals', () => {
  assert.equal(parseStrike('Will Bitcoin reach $80,000 in September?', BTC.strikeRange), 80000);
  assert.equal(parseStrike('Will the price of Bitcoin be above $82,000 on September 16?', BTC.strikeRange), 82000);
  assert.equal(parseStrike('Will Ethereum reach $2,700 in September?', ETH.strikeRange), 2700);
  assert.equal(parseStrike('Will Bitcoin hit $105K this year?', BTC.strikeRange), 105000);
  assert.equal(parseStrike('Will Bitcoin reach $1.2 million?', BTC.strikeRange), 1_200_000);
});

test('rejects out-of-range numbers rather than inventing a strike', () => {
  // "$5" is a fee, not a Bitcoin strike.
  assert.equal(parseStrike('Will the $5 fee proposal pass?', BTC.strikeRange), null);
  assert.equal(parseStrike('Will Bitcoin flip gold?', BTC.strikeRange), null);
});

test('rejects range questions, which are not ladder rungs', () => {
  // Two in-range strikes means "between X and Y" — not a single threshold.
  assert.equal(
    parseStrike('Will Bitcoin close between $80,000 and $90,000?', BTC.strikeRange),
    null,
  );
});

test('reads direction, preferring the more specific downside phrasing', () => {
  assert.equal(parseDirection('Will Bitcoin reach $80,000 in September?'), 'above');
  assert.equal(parseDirection('Will Bitcoin dip to $65,000 in September?'), 'below');
  assert.equal(parseDirection('Will ETH be above $2,800 on the 16th?'), 'above');
  assert.equal(parseDirection('Will ETH fall to $1,900?'), 'below');
  assert.equal(parseDirection('Will something happen?'), null);
});

test('distinguishes barrier settlement from close settlement', () => {
  // This distinction is the whole reason the first belief curve was wrong.
  assert.equal(parseSettlement('Will Bitcoin reach $80,000 in September?'), 'touch');
  assert.equal(parseSettlement('Will Bitcoin dip to $65,000 in September?'), 'touch');
  assert.equal(parseSettlement('Will the price of Bitcoin be above $82,000 on September 16?'), 'terminal');
});

// ---------------------------------------------------------------------------

function market(over: Partial<PredictionMarket> & { question: string; last_trade_price: number }): PredictionMarket {
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
  return {
    market_id: Math.random().toString(36).slice(2),
    slug: '',
    event_id: '',
    event_title: '',
    active: true,
    closed: false,
    end_date: inDays(30),
    neg_risk: false,
    tags: [],
    volume: 0,
    volume_24hr: 0,
    volume_1wk: 0,
    volume_1mo: 0,
    liquidity: 0,
    volume_change_pct: null,
    open_interest: 1000,
    best_bid: null,
    best_ask: null,
    one_day_price_change: null,
    unique_traders_24h: 0,
    created_at: inDays(-30),
    age_hours: 720,
    ...over,
  };
}

test('a close-settled ladder yields an implied median between the bracketing strikes', () => {
  const markets = [
    market({ question: 'Will Ethereum be above $2,200 on October 15?', last_trade_price: 0.9 }),
    market({ question: 'Will Ethereum be above $2,400 on October 15?', last_trade_price: 0.62 }),
    market({ question: 'Will Ethereum be above $2,600 on October 15?', last_trade_price: 0.38 }),
    market({ question: 'Will Ethereum be above $2,800 on October 15?', last_trade_price: 0.15 }),
  ];
  const { say } = readCrowd(markets, ETH, 2400);

  assert.equal(say.method, 'terminal-median');
  assert.ok(say.impliedMedian !== null);
  assert.ok(
    say.impliedMedian! > 2400 && say.impliedMedian! < 2600,
    `expected median between 2400 and 2600, got ${say.impliedMedian}`,
  );
  // Crowd implies a higher price than spot, so the stance must be positive.
  assert.ok(say.stance > 0);
});

test('barrier markets are never collapsed into a survival curve', () => {
  // These two are jointly consistent — running max and running min are
  // different variables — but a naive normaliser reads them as contradictory.
  const markets = [
    market({ question: 'Will Ethereum reach $2,750 in October?', last_trade_price: 0.63 }),
    market({ question: 'Will Ethereum reach $3,000 in October?', last_trade_price: 0.43 }),
    market({ question: 'Will Ethereum dip to $2,250 in October?', last_trade_price: 0.69 }),
    market({ question: 'Will Ethereum dip to $2,000 in October?', last_trade_price: 0.39 }),
  ];
  const { say } = readCrowd(markets, ETH, 2400);

  assert.equal(say.method, 'barrier-asymmetry');
  // No implied price level is claimed, because barriers cannot give one.
  assert.equal(say.impliedMedian, null);
  assert.equal(say.impliedMovePct, null);
  assert.ok(say.asymmetry.length > 0);
});

test('an empty or unreadable book produces no reading rather than a guess', () => {
  const { say } = readCrowd([], ETH, 2400);
  assert.equal(say.method, 'none');
  assert.equal(say.stance, 0);
});

test('expired markets are excluded', () => {
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const markets = [
    market({ question: 'Will Ethereum be above $2,200 on October 15?', last_trade_price: 0.9, end_date: past }),
    market({ question: 'Will Ethereum be above $2,400 on October 15?', last_trade_price: 0.62, end_date: past }),
    market({ question: 'Will Ethereum be above $2,600 on October 15?', last_trade_price: 0.38, end_date: past }),
    market({ question: 'Will Ethereum be above $2,800 on October 15?', last_trade_price: 0.15, end_date: past }),
  ];
  const { say } = readCrowd(markets, ETH, 2400);
  assert.equal(say.method, 'none');
});
