#!/usr/bin/env node
/* ---------------------------------------------------------
   check-location.mjs — does changing location change the answers?

   This exists because the site once passed every eyeball test while
   being completely broken. Point it at the 5th and the Eat tab showed
   Boot Café, Ten Belles, Café Oberkampf and Holybelly — the 10th's
   cafés — each with a correctly recalculated travel time next to it.
   Distance was flowing through the ranking; it was not reaching the
   retrieval, and nothing on screen said so.

   So the test is not "did the numbers change". It is: for a set of
   locations across the city, does the top of each section share names?
   Two locations that return the same five places have not moved,
   whatever the minutes say.

   Runs the real js/ modules against the real data/ files — no mocks, no
   second copy of the logic to drift out of step.

   Usage:  node scripts/check-location.mjs [--verbose]
   --------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModule, readDiscovered, dataDir, City } from './shim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');
const read = f => JSON.parse(fs.readFileSync(path.join(dataDir(), f + '.json'), 'utf8'));

/* ---------- enough of a browser to load the modules ---------- */

const Store = {
  rating: () => null, isDone: () => false, tasteWeights: () => ({}),
  zones: () => [], hasZone: () => false, seenRecently: () => false,
  questDone: () => [], seedQuest: () => {}, setRating: () => null,
  wants: () => [], doneIds: () => [], toggleQuest: () => [], toggleZone: () => false,
  markSeen: () => {}
};
const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const load = (file, name, extra = {}) => loadModule(file, name, {
  Store, localStorage, navigator: {},
  fetch: () => { throw new Error('no network in tests'); },
  ...extra
});

const Loc   = load('location.js', 'Loc');
const Hours = load('hours.js',    'Hours');
const Rec   = load('record.js',   'Rec', { Loc });
const Near  = load('nearby.js',   'Near', { Hours });

const readOpt = f => { try { return read(f); } catch { return { items: [] }; } };

/* ---------- the two layers ----------

   Built by js/record.js, which is the same module the browser runs. This
   file used to assemble them itself, "the way app.js builds them", and
   the two copies had already drifted on `categories` — so the test was
   grading a slightly different site than the one that ships. A test that
   can pass while the site is wrong is the failure this whole script
   exists to catch, so it should not be the thing committing it. */

const D = {};
for (const n of ['events', 'places', 'nightlife', 'sports', 'food', 'itineraries',
                 'daytrips'])
  D[n] = read(n);
D.discovered = await readDiscovered();

for (const n of ['civic', 'notable', 'editorial', 'notes', 'events-city']) D[n] = readOpt(n);

const TODAY = new Date().toISOString().slice(0, 10);
const { all: ALL, discovered: DISCOVERED } = Rec.build(D, TODAY);

const ZONES = City.zone.grid || City.zone.centroids;

/* Somewhere to stand before the first `at()` moves us. This was
   `fromZone(1)`, which is an arrondissement number and the reason this
   file threw on every other pack twelve frames deep. Any real zone will
   do — `at()` overwrites it before anything is measured — so it is the
   first key the pack declares. */
/* ---------- one clock, so a number means one thing ----------

   Coverage is gated on `minutesFromHome`, and a pack's reach model reads
   the clock: Bengaluru's trip east at 11am and at 6pm are different trips.
   In a browser that is correct — the reader's own clock is the one that
   should decide. Here there is no reader, only whatever timezone the
   machine happens to sit in, and the ratchet moved with it. Measured at
   one instant, Bengaluru scored 123 in UTC and 95 in Pacific, because
   19:47 in California falls inside rush hours declared for Bengaluru.

   So the clock is pinned. The components are local, not an epoch, which
   is the point — `new Date(2026, 8, 19, 12, 30)` is half past twelve on
   Saturday whatever timezone reads it, so `getHours()` and `getDay()`
   answer the same everywhere. The rest of the check was already
   deterministic; this was the last thing that was not. */
const PINNED = new Date(2026, 8, 19, 12, 30);

if (City.reach.isPeak && City.reach.isPeak(PINNED)) {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const at = `${DAYS[PINNED.getDay()]} ${String(PINNED.getHours()).padStart(2, '0')}:` +
             String(PINNED.getMinutes()).padStart(2, '0');
  console.error(`\n${City.name} now declares a rush hour at ${at}, which is the`);
  console.error('instant this check pins. Move PINNED to a quiet hour for every pack, and');
  console.error('re-baseline the floors — the numbers before and after are not comparable.\n');
  process.exit(1);
}
Loc.setClock(() => PINNED);

Loc.boot(Loc.fromZone(Object.keys(ZONES).sort()[0]));
Near.use(ALL, DISCOVERED);

function at(zone) {
  Loc.explore(Loc.fromZone(zone));
  [...ALL, ...DISCOVERED].forEach(i => {
    const m = Loc.minutesTo(i);
    if (m != null) i.minutesFromHome = m;
  });
}

/* ---------- what to check ----------

   The third column is how many names two locations may share before it
   stops being a coincidence.

   These are not all zero, and the reasons differ. Markets are the
   sparsest category in the city — a couple of hundred against five
   thousand restaurants — so neighbouring quarters legitimately share the
   two or three destination markets. A museum in the 3rd is genuinely
   fifteen minutes from both the 10th and the 5th.

   The everyday ones went from zero to one when the ring learned to widen
   until it reaches somewhere the guide actually knows about. That is the
   intended behaviour and it has an unavoidable consequence: where only
   one good café is known between two adjacent quarters, both will now
   suggest it. Sharing one entry is the retrieval working. Sharing five
   was the bug this all started with. */
const KINDS = [
  /* Cafés allow two rather than one because the guide knows only a
     handful of them in some corners of the city, and two adjacent
     quarters reaching for the same corner will name the same places —
     the 5th and the 13th share the Mosquée salon de thé and Le Renard
     Café, both hand-written, both physically on the boundary between
     them.

     Anything past these numbers has to be named in SHARED below, with
     the reason and what closes it. The leak itself has its own assertion
     at the bottom of this file. */
  ['cafe',       'walk', 2],
  ['bakery',     'walk', 1],
  ['restaurant', 'walk', 1],
  ['market',     'walk', 2],
  ['books',      'near', 1],
  ['park',       'near', 1],
  ['museum',     'near', 2],
  ['nightlife',  'walk', 2]
];

/* ---------- what each city expects of itself ----------

   This file used to be Paris with Paris's numbers written into it, and
   it crashed on any other pack at the first `Loc.fromZone(1)`. The test
   itself is not Paris-specific — "does moving change the answer, and is
   the answer worth having" is the question everywhere — so what moves
   into a table is only the part that genuinely differs: which corners to
   stand in, which pairs are known to share, and how much of the city is
   currently expected to know something.

   `floor` is the ratchet, and it exists because `THIN` does not scale.
   Paris names every thin cell individually — nine once, none now — which
   works at twenty zones and a guide somebody has been writing for a
   year. Delhi has 272 zones, 81 records above the map layer, and fails
   all 160 scanned cells. Listing them would be a page of noise nobody
   reads, and dropping the assertion would be worse.

   So a city with a `floor` records how many cells clear the bar *today*.
   It fails when that number falls, not when a particular cell does, and
   the number is raised by hand as the tiers fill. Paris has no floor and
   keeps the stricter rule: every cell, every time. Raising a floor is
   the work; lowering one is an admission.

   Both numbers carry a tolerance, and the reason is worth knowing
   before anybody tightens it. In a city whose only events source is a
   rolling fortnight of Luma, the dated records turn over daily without
   anybody touching the code — Delhi went from 13 events to 10 overnight
   and its sharing moved 14 to 16, its coverage 11 to 13, on identical
   data files otherwise. Events compete with places for the top five, so
   fewer of them both raises coverage and makes probes reach for the same
   evergreen records.

   A ratchet that fails on that is a ratchet people learn to ignore,
   which is the failure check-perf.mjs is written to avoid. So drift of
   a couple either way is reported and not failed; a real regression is
   bigger than the feed. */
const DRIFT = 2;
const EXPECT = {
  paris: {
    /* The old home, the quarter in the bug report, somewhere genuinely
       far from both, and two edges. */
    probes: [10, 5, 15, 18, 13],
    lead: 5,
    need: 2,
    shared: {
    /* Three cafés are known within reach of the 13th and all three sit on
       the 5th's side of the boundary. The 13th's own list leads with them
       honestly labelled at 13–18 minutes; it has nothing nearer to lead
       with. Closed by writing up a café in the 13th.

       Five since notable.mjs started resolving the summaries it had been
       losing to rate limits — Paris went from 19 known cafés to 33, and
       Café Voltaire and Aux Tours de Notre-Dame are both central, both
       genuinely good, and both now fill the fourth and fifth slot of the
       5th and the 13th at once.

       Same shape as the nightlife entry below, and the same reading: this
       records the 13th having nothing of its own to lead with, not the
       ranking failing. Every café added in the middle of Paris will keep
       landing in this list until something in the 13th is written up. That
       is still what closes it. */
    'cafe:5/13': 5,
    /* The 15th and the 13th have almost no nightlife the guide can vouch
       for, so both reach into the 1st, 5th and 12th — where the rooms
       actually are. The 18th has two of its own and then reaches the 10th,
       fourteen minutes away. Closed by writing up rooms in the 13th, 15th
       and 18th, and by the city listings covering more than the centre. */
    /* Four since the opera houses were written up, and the fourth is
       Opéra Bastille. The 5th and the 13th already shared Café Universel,
       the Caveau de la Huchette and Supersonic; Bastille is central,
       excellent and reachable from both, so it joined both lists at once.

       That is the same thinness this entry has always recorded rather than
       a new fault — the 13th still has nothing of its own to lead with,
       and adding anything good in the middle of Paris will keep landing in
       its list. Closed the same way: by writing up a room in the 13th. */
    'nightlife:5/13': 4,
    'nightlife:5/15': 3,
    'nightlife:10/18': 3}
  },
  'bay-area': {
    /* One default home, the two densest quarters, the fog side, and the
       Peninsula — which is a different city by the pack's own account. */
    probes: ['north-beach', 'mission', 'outer-sunset', 'palo-alto', 'bernal-heights'],
    lead: 'mission',
    need: 2,
    /* 15 of the 80 pair/kind lists. Every probe reaches the Mission for
       coffee, because that is where the vouched records are. Falls as
       the editorial tier spreads out. */
    overshare: 15,
    /* 137 of 160 on 18 September 2026, the day the editorial tier was
       written. What fails is the Peninsula — San Mateo, Sunnyvale and
       Palo Alto for coffee, bread and markets — which is exactly where
       the guide has three records. 143 on 22 September, after eight
       researched records around University Avenue filled Palo Alto's
       restaurant column; San Mateo and Sunnyvale are what is left. */
    floor: 143
  },
  delhi: {
    probes: ['connaught-place', 'hauz-khas', 'saket', 'karol-bagh', 'dwarka'],
    need: 2,
    /* 23 → 14 as the pack learned to ask Wikidata and OpenStreetMap the
       right questions, 16 when the Luma feed rolled, and then 23 when
       the café and bakery tier was written.

       That last rise is the cost of the coverage and is recorded as one.
       The two measures pull against each other: coverage asks whether
       each colony knows two things, and a small cluster of good records
       satisfies it everywhere; sharing asks whether those things differ,
       and the same cluster fails it. Most of the overlap is books —
       every probe reaches the same three bookshops — and cafés in the
       Lodhi Colony / Connaught Place middle. It falls when colonies get
       records of their own, not when the middle gets more.

       32 on a clean checkout — see the correction on `floor` below; the
       23 first committed here was the same unreproducible reading. Then
       28, from six records written in Saket, Dwarka and Gurgaon: Dwarka
       had been sharing four cafés with Connaught Place, twenty
       kilometres away, for want of any of its own. */
    overshare: 28,
    /* Still zero of 160, and worth understanding rather than explaining
       away. Delhi's sourced tier went from 81 records to 267 when the
       pack declared its own Wikidata classes — but those records are
       tombs, mosques, gurdwaras and gardens, and the cells scanned here
       are coffee, bread, dinner and markets. Wikidata has two
       restaurants in Delhi and no cafés at all.

       So the number is honest and the fix is not another source: it is
       somebody writing down where to eat.

       0 → 11 with eleven editorial records, then 11 → 45 with four
       more. The four were markets and a book street, and the difference
       is the whole lesson: the first eleven were restaurants and
       monuments in categories that already had something, and the next
       four were the only records in a category that had nothing.
       Markets showed a single dot in all forty sampled colonies.

       Find the dead column before writing anything.

       Then 45 → 87 with seven cafés and bakeries: the café and bakery
       columns had been dead in all forty sampled colonies, because a
       cell needs *two* known places in its top five and one Blue Tokai
       could never supply that anywhere.

       A correction worth leaving in. This floor was first committed as
       99, from a measurement that cannot be reproduced against the files
       that were committed with it: 87 on a clean checkout, every run,
       at any clock time, with or without dated events. So the commit
       that set 99 shipped this check failing. The number is what the
       data gives, and a ratchet set from a reading nobody can repeat is
       worse than none.

       91 once Saket, Dwarka and the NCR sectors each got something of
       their own — and sharing fell with it, which is the tell that the
       records went to the edges rather than the middle. */
    floor: 91
  },
  'new-york': {
    /* One per borough, which is how this city is actually divided, plus
       the densest bit of Manhattan. */
    probes: ['west-village', 'williamsburg', 'astoria-central', 'mott-haven-port-morris',
             'midtown-south-flatiron-union-square'],
    lead: 'west-village',
    need: 2,
    /* 68 of 160 with no editorial tier at all — the best any city has
       managed from generated sources alone, because Wikidata holds 4,223
       records here against Paris's 838. Then 109, from sixteen
       hand-written ones.

       Those sixteen were chosen off this check's own output rather than
       from a list of famous places: markets were map-only in all forty
       sampled neighbourhoods, and coffee and bread went dark across the
       Bronx and eastern Queens. Three market records and two Bronx
       bakeries move more cells than sixteen more restaurants in
       Manhattan would have.

       Which is also why over-sharing *fell* here, 26 to 23, where
       Bengaluru's rose: records written at the edges pull probes apart,
       records written in the middle pull them together. */
    floor: 109,
    overshare: 23
  },
  bengaluru: {
    probes: ['indiranagar', 'jayanagar', 'malleswaram', 'whitefield', 'koramangala'],
    need: 2,
    /* 34 → 18 when the pack learned to ask about temples and lakes, then
       back up to 21 when twelve editorial records were written. That
       rise is an admission and worth reading as one: the records are
       good and they are all in Basavanagudi, Malleswaram, Shivajinagar
       and Richmond Town, so every probe now reaches for the same twelve.
       Paris records the same effect one pair at a time — anything good
       added in the middle of a city lands in every list until the
       edges have something of their own.

       It falls when the editorial tier spreads out, not when more is
       added to the centre — and it did: 21 down to 15 once the markets
       and the bakery gave the probes something of their own to reach
       for.

       Then back to 20, when the café tier was written, and this one is
       worth reading carefully. After it, Indiranagar, Jayanagar and
       Koramangala returned the *identical* five cafés — five of five
       shared, eight kilometres apart, which is the founding bug of this
       whole file. Indiranagar had no café of its own and borrowed its
       neighbours'. Two written there brought the worst of it to four of
       five. What closes the rest is a café of its own in each of those
       neighbourhoods, and that is the to-do this number carries.

       18 after Jayanagar got a second café and a restaurant of its own.
       The arithmetic of why it will not reach Paris's level quickly: the
       retrieval ring widens until it holds *four* known places, so a
       neighbourhood with two of its own still reaches next door for the
       other two. Closing it means four per category per neighbourhood —
       Paris density, which is years of somebody going out. */
    overshare: 18,
    /* 18 off the notable tier alone; 28 with twelve editorial records;
       62 with four markets and an Iyengar bakery; 120 with ten cafés and
       bakeries, when those two columns had been dead in all forty sampled
       neighbourhoods; 123 with two more in Jayanagar. */
    floor: 123
  }
};

const PLAN = EXPECT[City.id] || { probes: [], need: 2 };

/* A pack may name a zone this table does not have — a rename, or a guess
   made before the zones existed. Saying so beats `fromZone` throwing
   twelve frames deep. */
const missing = PLAN.probes.filter(z => !ZONES[z]);
if (missing.length) {
  console.error(`\n${City.name}: EXPECT.${City.id}.probes names ${missing.length} ${
    missing.length === 1 ? 'zone' : 'zones'} the pack does not have — ${missing.join(', ')}\n`);
  process.exit(1);
}
if (!PLAN.probes.length) {
  console.error(`\n${City.name} has no entry in EXPECT — add one, or this checks nothing.\n`);
  process.exit(1);
}

const PLACES = PLAN.probes;

const top = {};
for (const zone of PLACES) {
  at(zone);
  top[zone] = {};
  for (const [kind, ringSet] of KINDS) {
    top[zone][kind] = Near
      .pick(Near.KIND[kind], { rings: Near.RINGS[ringSet], want: 6, limit: 5 })
      .items.map(i => i.title);
  }
}

let failures = [];
const thin = [];      // known-thin cells, tracked rather than ignored
const shared = [];    // pairs that legitimately share an answer, and why
const fixed = [];     // known-thin cells that have since been filled in
const pairs = [];
const oversharing = [];
for (let i = 0; i < PLACES.length; i++)
  for (let j = i + 1; j < PLACES.length; j++) pairs.push([PLACES[i], PLACES[j]]);

console.log('\nShared names in the top 5, per pair of locations\n');
const head = pairs.map(([a, b]) => `${a}/${b}`.padStart(7)).join('');
console.log('kind       ' + head + '   max');

/* ---------- where two quarters legitimately share an answer ----------

   Sharing used to be capped by a single number per kind, and that number
   was calibrated against lists that blended the guide with the map. Once
   the sections stopped doing that — recommendations in one list, names
   off OpenStreetMap in their own — the padding went with it, and what
   was left is the truth: in a quarter nobody has written up, the nearest
   places the guide can vouch for are wherever they happen to be, and two
   such quarters reaching into the same well-covered middle will name the
   same places.

   That is thin coverage made visible, not the retrieval failing, and the
   test says which is which by naming each pair and what closes it. The
   count is recorded, so the cell fails the moment it gets worse — and
   these are to-do items, not exemptions. Writing about cafés in the 13th
   is what deletes a line from here. */
const SHARED = PLAN.shared || {};


for (const [kind, , allowed] of KINDS) {
  const counts = pairs.map(([a, b]) =>
    top[a][kind].filter(t => top[b][kind].includes(t)).length);
  counts.forEach((n, k) => {
    if (n <= allowed) return;
    const cell = `${kind}:${pairs[k].join('/')}`;
    const known = SHARED[cell];
    if (known !== undefined && n <= known) {
      shared.push(`${cell}: ${n} of 5 shared — the guide has nothing closer to offer`);
    } else if (PLAN.overshare !== undefined) {
      /* Same ratchet as `floor`, and the same reason: naming each pair
         only works while there are a handful. A city whose vouched
         records all sit in two neighbourhoods will have every probe
         reaching into them, and that is thin coverage made visible
         rather than the retrieval failing — the distinction Paris draws
         one pair at a time. Counted here, and the count only falls. */
      oversharing.push(`${cell}: ${n} of 5`);
    } else {
      failures.push(`${kind}: ${pairs[k].join(' and ')} share ${n} of 5 (max ${
        known === undefined ? allowed : known})`);
    }
  });
  console.log(kind.padEnd(11) + counts.map(n => String(n).padStart(7)).join('') +
              String(allowed).padStart(6));
}

if (VERBOSE) {
  for (const zone of PLACES) {
    console.log(`\n${String(City.zone.tile(zone)).replace(/<[^>]*>/g, '')}`);
    for (const [kind] of KINDS) console.log(`  ${kind.padEnd(11)} ${top[zone][kind].join(', ')}`);
  }
}

/* ---------- are they any good? ----------

   The difference test above only proves the lists moved. It passed
   perfectly while the 5th was being handed the nearest café in walking
   order, which is not a recommendation — so this second test asks
   whether the site knows anything about what it is suggesting.

   Two above `found` in the top five is a low bar on purpose. It is the
   difference between a guide and a phone book, not a standard of
   excellence, and it should hold in every arrondissement rather than
   only the one the catalogue was written in. */

const NEED_KNOWN = PLAN.need;

/* Where the guide is still thin, and why.

   These are not excused failures — they are a to-do list that fails
   loudly the moment it gets longer. Wikidata knows about thirty cafés in
   all of Paris, the city publishes nothing about coffee at all, and the
   editorial pass has not reached these yet. Writing a note in notes.json
   or an entry in editorial.json is what removes a line from here.

   Adding a line to this list should feel like an admission. Removing one
   is the actual work. */
/* Empty, and it should stay that way.

   This held nine arrondissement/category cells where the top five was
   mostly names on a map — places the guide covered thinly, recorded here
   as a to-do list that failed loudly if it grew. All nine closed at once
   on 20 August 2026, when the discovery index went from 13,930 places to
   22,635 and the retrieval layer started guaranteeing that what the site
   knows survives the cut. Every cell now passes: 80 of 80.

   Two things worth keeping in mind if one reopens. Promotion only ever
   reaches inside the ring, so a bakery twenty-five minutes away will
   still not be promoted into a list headed "around you" — that would not
   be true, and closing such a cell means writing about somewhere near
   the middle of that arrondissement rather than loosening the rule. And
   an entry here is a to-do, never an excuse: it says somebody looked and
   decided the honest answer was thin, not that thin is acceptable. */
const THIN = new Set(PLAN.thin || []);
const EVERYDAY = [['cafe', 'walk'], ['bakery', 'walk'], ['restaurant', 'walk'], ['market', 'walk']];

/* Paris has twenty zones and scans all of them. Delhi has 272 and
   Bengaluru 96, and a row per zone there is a page of output nobody
   reads and four thousand retrievals to produce it. Above the cap the
   scan takes an evenly spaced sample of the sorted zone keys — stable
   between runs, so a number that moves means the data moved and not the
   sample. */
const SCAN_CAP = 40;
const ALL_ARRS = (() => {
  const keys = Object.keys(ZONES).sort((a, b) =>
    (/^\d+$/.test(a) && /^\d+$/.test(b)) ? a - b : String(a).localeCompare(b))
    .map(k => (/^\d+$/.test(k) ? Number(k) : k));
  if (keys.length <= SCAN_CAP) return keys;
  const step = keys.length / SCAN_CAP;
  return Array.from({ length: SCAN_CAP }, (_, i) => keys[Math.floor(i * step)]);
})();

console.log(`\nHow much is known about the top 5, per ${City.zone.one}` +
  (ALL_ARRS.length < Object.keys(ZONES).length
    ? ` (${ALL_ARRS.length} of ${Object.keys(ZONES).length}, evenly spaced)` : ''));
console.log('(★ visited · ◆ researched · ◇ on record · · on the map)\n');
const zoneLabel = z => String(City.zone.tile(z)).replace(/<[^>]*>/g, '');
const LABEL_W = Math.max(4, ...ALL_ARRS.map(z => zoneLabel(z).length));
console.log('zone'.padEnd(LABEL_W) + '    ' + EVERYDAY.map(([k]) => k.slice(0, 6).padStart(7)).join('') + '     worst');

const MARK = { personal: '★', editorial: '◆', sourced: '◇', found: '·' };
const beyondByArr = {};
const gaps = [];
let clearing = 0;

for (const zone of ALL_ARRS) {
  at(zone);
  const cells = [];
  let worst = 9;
  for (const [kind, ringSet] of EVERYDAY) {
    const top = Near.pick(Near.KIND[kind], { rings: Near.RINGS[ringSet], want: 6, limit: 5 }).items;
    const known = top.filter(i => Near.tierOf(i) !== 'found').length;
    worst = Math.min(worst, known);
    cells.push(top.map(i => MARK[Near.tierOf(i)]).join('').padStart(7));
    const cell = `${zoneLabel(zone)} ${kind}`;
    if (known < NEED_KNOWN) {
      if (PLAN.floor !== undefined) gaps.push(cell);
      else if (THIN.has(cell)) thin.push(`${cell}: ${known} of 5 known`);
      else failures.push(`${cell}: only ${known} of the top 5 is more than a name on a map (need ${NEED_KNOWN})`);
    } else {
      clearing++;
      if (THIN.has(cell)) fixed.push(cell);
    }
  }
  beyondByArr[zone] = Near.beyond(Near.KIND.cafe, 10).map(i => ({ title: i.title, zone: i.zone }));
  console.log(zoneLabel(zone).padStart(LABEL_W) + '   ' +
    cells.join('') + '   ' + String(worst).padStart(5));
}

/* "Worth the trip" is allowed to repeat itself between locations — the
   best café in Paris is the same café wherever you set out from, and
   demanding otherwise would be demanding a lie. What it must not do is
   what it used to: return three places from one arrondissement, which is
   how "the 10th again" survived the first fix. */
for (const zone of ALL_ARRS) {
  const spread = beyondByArr[zone];
  if (spread.length >= 2 && new Set(spread.map(x => x.zone)).size < 2)
    failures.push(`${String(City.zone.tile(zone)).replace(/<[^>]*>/g, '')} worth-the-trip: all ${spread.length} suggestions are in the same ${City.zone.one}`);
}

/* The specific regression: the names from the original report must not be
   what the 5th is offered for coffee.

   This asks about the top of the list rather than all of it, and the
   change is worth being explicit about, because relaxing the test that
   guards the founding bug is exactly the move that lets the bug back in.

   The report was that the 5th *led* with the 10th's cafés — Boot Café,
   Ten Belles, Café Oberkampf, Holybelly — with nothing local above them.
   The whole-list form of this check passed for a reason that has since
   been removed: the list was mostly anonymous OSM names, and they
   crowded the far ones out of the twenty-four. Now that the list is only
   places the guide can vouch for, two of the four are in it again — Boot
   Café at fifteen minutes and Café Oberkampf at eighteen, in seventh and
   eleventh place, behind five cafés in the 5th, 6th and 4th, under a
   heading that states the radius. Ten Belles and Holybelly are gone
   entirely, being further than the ring reaches.

   A vouched café a fifteen-minute walk away, listed seventh, is a fair
   answer. Leading with it is the bug. So the assertion is on the lead.

   Paris's own, and named as such: the other packs have their own
   founding bugs to find and none of them is this one. The positive half
   below is not Paris-specific at all, so every city gets it — a list
   that reaches across the region for its first suggestion has not
   answered "coffee around here" wherever it is. */
if (City.id === 'paris') {
  at(5);
  const REPORTED = ['Boot Café', 'Ten Belles', 'Café Oberkampf', 'Holybelly 5 & 19'];
  const cafes = Near.pick(Near.KIND.cafe, { rings: Near.RINGS.walk, want: 8, limit: 5 }).items;
  const leaked = REPORTED.filter(r => cafes.some(i => i.title === r));
  if (leaked.length) failures.push(`the 10th's cafés still lead the 5th's coffee: ${leaked.join(', ')}`);
}

/* The positive half of the same claim, which the original test never
   made: the named zone must be led by somewhere within walking distance
   of it. A list that reaches across the region for its first suggestion
   has not answered "coffee around here".

   One zone rather than every probe, and the attempt to generalise it is
   worth recording. Applied to all five of Paris's it fails on the 13th,
   which opens with the Mosquée salon de thé thirteen minutes away — and
   that is not the retrieval failing, it is the thinness `SHARED`
   already documents at `cafe:5/13`. A second assertion saying the same
   thing in a way that cannot be acknowledged is noise. */
if (PLAN.lead) {
  at(PLAN.lead);
  const lead = Near.pick(Near.KIND.cafe, { rings: Near.RINGS.walk, want: 8, limit: 5 }).items[0];
  if (!lead || (lead.minutesFromHome ?? 99) > 10)
    failures.push(`${String(City.zone.tile(PLAN.lead)).replace(/<[^>]*>/g, '')} coffee opens with ${
      lead ? `${lead.title} at ${lead.minutesFromHome} minutes` : 'nothing'}`);
}

if (shared.length) {
  console.log(`\n${shared.length} pairs of locations share most of an answer, already known:`);
  shared.forEach(t => console.log('  · ' + t));
  console.log('  Not the retrieval failing — the guide has nothing nearer to');
  console.log('  suggest there. Writing one up removes its line from SHARED.');
}
if (thin.length) {
  console.log(`\n${thin.length} places the guide is still thin, already known:`);
  thin.forEach(t => console.log('  · ' + t));
  console.log('  Fix one by adding to data/editorial.json or data/notes.json,');
  console.log('  then delete its line from THIN in this file.');
}
if (fixed.length) {
  console.log(`\n${fixed.length} of the known-thin places now pass — remove them from THIN:`);
  fixed.forEach(t => console.log('  ✓ ' + t));
}

if (PLAN.overshare !== undefined) {
  console.log(`\n${oversharing.length} pair/kind lists share more than a coincidence — ` +
    `the vouched records sit in too few ${City.zone.many}.`);
  if (oversharing.length > PLAN.overshare + DRIFT)
    failures.push(`sharing got worse: ${oversharing.length} pair/kind lists overlap, and ${PLAN.overshare} did before ` +
      `(drift of ${DRIFT} allowed for the events feed turning over).`);
  else if (oversharing.length > PLAN.overshare)
    console.log(`  ${oversharing.length - PLAN.overshare} above the ceiling of ${PLAN.overshare}, inside the drift the feed causes.`);
  else if (oversharing.length < PLAN.overshare)
    console.log(`  ${PLAN.overshare - oversharing.length} fewer than the ceiling of ${PLAN.overshare} — lower it in EXPECT.${City.id}.`);
}

/* The ratchet. A number that only moves one way, and says which way. */
if (PLAN.floor !== undefined) {
  const cells = ALL_ARRS.length * EVERYDAY.length;
  console.log(`\n${clearing} of ${cells} ${City.zone.one}/category cells know something about what they suggest.`);
  if (clearing < PLAN.floor - DRIFT)
    failures.push(`coverage fell: ${clearing} cells clear the bar, and ${PLAN.floor} did before ` +
      `(drift of ${DRIFT} allowed). Something that was written up has gone, or the retrieval stopped finding it.`);
  else if (clearing > PLAN.floor)
    console.log(`  ${clearing - PLAN.floor} more than the floor of ${PLAN.floor} — raise it in EXPECT.${City.id}.`);
  else
    console.log(`  exactly the floor. ${gaps.length} cells still answered by the map alone.`);
}

console.log('');
if (failures.length) {
  console.log('FAIL — location is not reaching retrieval:');
  failures.forEach(f => console.log('  ✗ ' + f));
  console.log('');
  process.exit(1);
}
const scanned = ALL_ARRS.length * EVERYDAY.length;
console.log(`OK — ${pairs.length * KINDS.length} location pairs checked, all materially different.`);
if (PLAN.floor === undefined)
  console.log(`     ${scanned - thin.length} of ${scanned} ${City.zone.one}/category pairs know something about what they suggest.\n`);
else
  console.log('');
