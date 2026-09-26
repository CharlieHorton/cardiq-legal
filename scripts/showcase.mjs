// Refreshes _data/showcase.json, the market data behind the landing page's
// ticker, playable demo card and stats, from the app's public card pool.
//
//   node scripts/showcase.mjs
//
// Runs nightly in .github/workflows/showcase.yml, after the app's ingest.
// Rules mirror the app (src/engine/market.ts, generation.ts): only cards above
// the £1,000 game price cap are quoted or dealt here. No Classic, Daily or pack
// challenge deals from them, so the landing page can't give an answer away.

import { writeFile } from 'node:fs/promises';

const POOL_URL =
  process.env.POOL_URL ??
  'https://mmgshlbohlfbbwvbuezw.supabase.co/storage/v1/object/public/pools/latest.json';
const OUTPUT = new URL('../_data/showcase.json', import.meta.url);

/** GAME_PRICE_CAP in the app. */
const GAME_PRICE_CAP = 1000;
/** DEFAULT_MIN_CONFIDENCE in the app. */
const MIN_CONFIDENCE = 0.8;
const TICKER_LENGTH = 16;
const DEMO_CARDS = 10;
/** Demo cards lead with the Pokémon people search for. */
const HEADLINERS = ['Charizard', 'Pikachu', 'Umbreon', 'Lugia', 'Mew', 'Rayquaza', 'Gengar', 'Mewtwo', 'Espeon', 'Blastoise'];

const response = await fetch(POOL_URL);
if (!response.ok) throw new Error(`Card pool: HTTP ${response.status}`);
const pool = await response.json();
if (pool.source !== 'pokepulse') throw new Error(`Card pool source is "${pool.source}", not pokepulse`);

const eligible = pool.cards.filter(
  (card) => card.price > GAME_PRICE_CAP && card.confidence >= MIN_CONFIDENCE && !card.headlineOnly && card.imageUrl,
);
if (eligible.length < 3) throw new Error(`Only ${eligible.length} cards above £${GAME_PRICE_CAP}`);

/** 30-day change, or null until the ingest has a month of history. */
function change30(card) {
  const prices = card.history?.prices ?? [];
  const base = prices[prices.length - 31];
  return base > 0 ? round((card.price - base) / base, 4) : null;
}

const gbp = (value) => `£${Math.round(value).toLocaleString('en-GB')}`;

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

// The app's ticker: the biggest 30-day movers, then the most valuable cards.
const quotes = eligible.map((card) => ({ card, change: change30(card) }));
const moved = (quote) => quote.change !== null && quote.change !== 0;
const ticker = [
  ...quotes.filter(moved).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
  ...quotes.filter((quote) => !moved(quote)).sort((a, b) => b.card.price - a.card.price),
]
  .slice(0, TICKER_LENGTH)
  .map(({ card, change }) => ({
    label: `${card.name} ${card.number}`.toUpperCase(),
    price: gbp(card.price),
    change: change ? `${change > 0 ? '▲' : '▼'}${(Math.abs(change) * 100).toFixed(1)}%` : null,
    up: change > 0,
  }));

// Demo cards: one per Pokémon, headliners first, most trusted price first.
const headliner = (card) => HEADLINERS.find((name) => new RegExp(`\\b${name}\\b`).test(card.name));
const rank = (card) => {
  const index = HEADLINERS.indexOf(headliner(card));
  return index === -1 ? HEADLINERS.length : index;
};
const seen = new Set();
// Trainer and stadium promos have no finish; they make odd demo cards.
const demo = eligible
  .filter((card) => card.material)
  .sort((a, b) => rank(a) - rank(b) || b.confidence - a.confidence)
  .filter((card) => {
    const key = headliner(card) ?? card.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, DEMO_CARDS)
  .map((card) => ({
    name: card.name,
    set: card.setName,
    number: card.number,
    year: card.releaseDate?.slice(0, 4) ?? null,
    rarity: card.rarity,
    finish: [card.promoInfo, card.material].filter(Boolean).join(' · ') || null,
    image: card.imageUrl,
    price: round(card.price),
    us: card.sources?.us ? round(card.sources.us) : null,
  }));

const years = pool.cards.map((card) => Number(card.releaseDate?.slice(0, 4))).filter(Boolean);
const priceDate = pool.cards.reduce((latest, card) => (card.priceUpdatedAt > latest ? card.priceUpdatedAt : latest), '');

const showcase = {
  priceDate: priceDate.slice(0, 10),
  priceDateLabel: new Date(priceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
  stats: {
    cards: pool.cards.length.toLocaleString('en-GB'),
    sets: new Set(pool.cards.map((card) => card.setId)).size,
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),
  },
  ticker,
  demo,
};

await writeFile(OUTPUT, `${JSON.stringify(showcase, null, 2)}\n`);
console.log(`Wrote ${ticker.length} quotes and ${demo.length} demo cards, prices as of ${showcase.priceDate}`);
