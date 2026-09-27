#!/usr/bin/env node
/* ---------------------------------------------------------
   check-taste.mjs — does the taste engine still learn what it should?

   `Store.weigh()` in js/state.js turns ratings and stated preferences
   into the weights js/scoring.js reads, and the app and the MCP server
   will call it with their own ratings. Each case below is one promise
   the README makes about it: a rating fades by half in 180 days, a
   "want" teaches nothing, saying "jazz" outweighs loving one jazz club,
   novelty switches on only once something has been tried, and a
   preference the engine does not understand is dropped rather than
   stored.

   And the one that matters most for the page as it is today: with
   nothing rated and nothing said, there are no weights at all, so the
   ranking is exactly what it was before any of this existed.

   Usage:  node scripts/check-taste.mjs
   --------------------------------------------------------- */

import { loadModule, Keys } from './shim.mjs';

let failures = 0, checks = 0;
const same = (got, want, msg) => {
  checks++;
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a !== b) { failures++; console.error(`  FAIL  ${msg}\n        got  ${a}\n        want ${b}`); }
};

const storeWith = saved => {
  const mem = saved ? { [Keys.store]: JSON.stringify(saved) } : {};
  const localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
  return { Store: loadModule('state.js', 'Store', { localStorage }), mem };
};

const items = [
  { id: 'a', type: 'cafe', labels: ['outdoor'], categories: ['food', 'cafe'] },
  { id: 'b', type: 'jazz', labels: ['couple'], categories: ['nightlife'] }
];
const { Store } = storeWith();
const T = '2026-09-25';

same(Store.weigh({}, items, T), {}, 'nothing rated and nothing said: no weights');
same(Store.weigh({ ratings: { a: 'loved' }, rated: { a: T } }, items, T),
     { outdoor: 2, 'cat:food': 2, 'cat:cafe': 2, '@novelty': 1.5, 'tried:cafe': 1 }, 'a fresh love counts in full');
same(+Store.weigh({ ratings: { a: 'loved' }, rated: { a: '2026-03-29' } }, items, T).outdoor.toFixed(3), 1,
     'a love 180 days old counts for half');
same(Store.weigh({ ratings: { a: 'want' } }, items, T), {}, 'wanting is not trying');
same(Store.weigh({ ratings: { a: 'meh' } }, items, T), { '@novelty': 1.5, 'tried:cafe': 1 }, 'meh is tried and teaches no liking');
same(Store.weigh({ ratings: { a: 'good' }, prefs: { novelty: 0 } }, items, T),
     { outdoor: 1, 'cat:food': 1, 'cat:cafe': 1 }, 'the novelty dial at 0 turns it off');
same(Store.weigh({ prefs: { interests: ['Jazz'], company: 'couple', budget: 2, reach: 25, diet: 'vegetarian', bogus: 1 } }, items, T),
     { jazz: 3, 'cat:jazz': 3, 'good:jazz': 3, 'good:couple': 2, 'good:romantic': 2,
       'diet:vegetarian': 1, '@diet': 1, '@budget': 2, '@reach': 25 }, 'stated preferences, cleaned');
same(Store.setPrefs({ budget: 9, company: 'crowd', reach: -3, interests: [] }), {}, 'nonsense is dropped, not stored');

/* A store written before ratings carried dates is dated on load, and
   weighs exactly what it weighed before. */
const old = storeWith({ ratings: { a: 'loved' }, quests: {}, zones: [3], seen: {} });
const kept = JSON.parse(old.mem[Keys.store]);
same(Object.keys(kept.rated), ['a'], 'an old store has its ratings dated on load');
same(kept.zones, [3], 'and keeps everything else');
same(old.Store.tasteWeights(items).outdoor, 2, 'and a dated-today rating weighs in full');

console.log('');
if (failures) { console.error(`${failures} of ${checks} taste checks failed.`); process.exit(1); }
console.log(`All ${checks} taste checks passed.`);
