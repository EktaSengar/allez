#!/usr/bin/env node
/* ---------------------------------------------------------
   check-plan.mjs — does the plan still come back in the shape promised?

   js/plan.js is read by three things: the Weekend tab, which draws it,
   and the MCP server and the app, which take it as data and build
   nothing of their own. A change that renames a field or drops a stop's
   travel time breaks the two that are not on the page, and nothing on
   the page would say so. This builds a weekend in every city, from every
   base, and holds each one to the contract:

     two days, Saturday then Sunday, each a date the plan says
     no record twice across the weekend, and slots in order
     every stop with a travel time (or an honest null), an open block
     from a known basis, at least one reason ending in `not-done`, and a
     spend that is a number or null — never undefined
     day totals that add up

   And one date rule that is easy to get wrong and hard to see: the
   weekend of a day must survive a daylight-saving night.

   Runs the real js/ modules against the real data, offline.

   Usage:  node scripts/check-plan.mjs [--verbose]
   --------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import { cityIds, dataDir, loadModuleFor, readDiscovered } from './shim.mjs';

const VERBOSE = process.argv.includes('--verbose');
const FILES = ['events', 'places', 'nightlife', 'sports', 'food', 'itineraries', 'daytrips',
               'civic', 'notable', 'editorial', 'notes', 'events-city', 'practices', 'regulars', 'conferences'];
/* A Wednesday, well inside every city's data, with a weekend that is not
   a holiday anywhere. */
const DATE = '2026-09-16';
const SLOTS = ['morning', 'afternoon', 'evening'];
const BASES = ['hours', 'start', 'unknown'];

let failures = 0, checks = 0;
const want = (cond, msg) => { checks++; if (!cond) { failures++; console.error(`  FAIL  ${msg}`); } else if (VERBOSE) console.log(`  ok    ${msg}`); };

for (const id of cityIds()) {
  const noStore = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const Store = { rating: () => null, isDone: () => false };
  const g = { localStorage: noStore, navigator: {}, Store };
  const Loc   = loadModuleFor(id, 'location.js', 'Loc', g);
  const Hours = loadModuleFor(id, 'hours.js', 'Hours');
  const Rec   = loadModuleFor(id, 'record.js', 'Rec', { Loc });
  const Near  = loadModuleFor(id, 'nearby.js', 'Near', { Hours });
  const Rank  = loadModuleFor(id, 'scoring.js', 'Rank', { Near, Hours, Store });
  const Plan  = loadModuleFor(id, 'plan.js', 'Plan', { Rank, Near, Loc, Hours });

  const read = f => { try { return JSON.parse(fs.readFileSync(path.join(dataDir(id), f + '.json'), 'utf8')); } catch { return { items: [] }; } };
  const D = Object.fromEntries(FILES.map(f => [f, read(f)]));
  D.discovered = await readDiscovered(path.join(dataDir(id), 'places'));
  const home = read('home');
  const bases = Array.isArray(home.bases) ? home.bases : [home];
  const { all, discovered } = Rec.build(D, DATE);
  Near.use(all, discovered);
  const pool = all.concat(discovered.filter(i => Near.tierOf(i) !== 'found' && i.tells));

  for (const b of bases) {
    const where = { lat: b.lat, lon: b.lon, zone: b.zone, area: b.label, label: b.label };
    Loc.boot(where);
    Loc.explore(where);
    [...all, ...discovered].forEach(i => { const m = Loc.minutesTo(i); if (m != null) i.minutesFromHome = m; });
    const tag = `${id}${bases.length > 1 ? ` from ${b.label}` : ''}`;

    const plan = Plan.weekend(pool, {
      date: DATE, origin: b, weather: null,
      rank: { today: DATE, weatherMode: null, taste: {}, exploredZones: [], homeZone: b.zone }
    });
    const { sat, sun } = Plan.weekendOf(DATE);
    want(plan.sat === sat && plan.sun === sun, `${tag} · the weekend of ${DATE} is ${sat} and ${sun}`);
    want(plan.days.length === 2 && plan.days[0].date === sat && plan.days[1].date === sun, `${tag} · two days, Saturday first`);

    const stops = plan.days.flatMap(d => d.stops);
    want(stops.length > 0, `${tag} · the plan has stops (${stops.length})`);
    const ids = stops.map(s => s.item.id);
    want(new Set(ids).size === ids.length, `${tag} · no record is planned twice`);

    for (const d of plan.days) {
      const order = d.stops.map(s => SLOTS.indexOf(s.slot));
      want(order.every((n, k) => n >= 0 && (k === 0 || n > order[k - 1])), `${tag} · ${d.date} slots in order`);
      const known = d.stops.filter(s => s.spend != null);
      want(d.spend.total === known.reduce((t, s) => t + s.spend, 0) && d.spend.unknown === d.stops.length - known.length,
        `${tag} · ${d.date} spend adds up`);
    }
    const bad = stops.filter(s => !(
      (s.travel.minutes === null || (Number.isFinite(s.travel.minutes) && s.travel.minutes >= 0)) &&
      BASES.includes(s.open.basis) && 'from' in s.open && 'to' in s.open && 'fits' in s.open &&
      s.reasons.length > 0 && s.reasons.at(-1).code === 'not-done' &&
      (s.spend === null || Number.isFinite(s.spend)) &&
      s.window && s.window.from && s.window.to));
    want(bad.length === 0, `${tag} · every stop carries travel, open block, reasons and spend` +
      (bad.length ? ` — not: ${bad.map(s => s.item.title).join(', ')}` : ''));
    want(stops[0].travel.from === null, `${tag} · the first leg is measured from where the day starts`);
    want(plan.picks.length > 0 && plan.picks[0].key === 'best', `${tag} · the picks lead with the best overall`);

    /* Saturday already under way in the city: at half past five
       there, the morning and afternoon slots are over and only the
       evening is planned; Sunday is untouched. */
    const four = Hours.instant(sat, 17 * 60 + 30);
    const late = Plan.weekend(pool, {
      date: DATE, origin: b, weather: null, now: four,
      rank: { today: DATE, weatherMode: null, taste: {}, exploredZones: [], homeZone: b.zone }
    });
    want(late.days[0].stops.every(s => s.slot === 'evening'),
      `${tag} · at 17:30 on ${sat} only the evening is planned that day`);
  }
}

/* ---------- a family with a dog ----------

   Built on a small pool of our own, so the answer is known: with a dog only
   the places that say they take one are planned, a child of six is not
   sent somewhere for ages nine and up, a sunset place is planned for the
   evening with a time to be there by, and a family with dinner planned
   gets ice cream after it. With nothing said, the same pool plans exactly
   as before. */
{
  const id = 'bay-area';
  const g = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, navigator: {}, Store: { rating: () => null, isDone: () => false } };
  const Loc = loadModuleFor(id, 'location.js', 'Loc', g);
  const Hours = loadModuleFor(id, 'hours.js', 'Hours');
  const Rec = loadModuleFor(id, 'record.js', 'Rec', { Loc });
  const Near = loadModuleFor(id, 'nearby.js', 'Near', { Hours });
  const Rank = loadModuleFor(id, 'scoring.js', 'Rank', { Near, Hours, Store: g.Store });
  const Plan = loadModuleFor(id, 'plan.js', 'Plan', { Rank, Near, Loc, Hours });
  Near.use([], []);
  const c = [37.4479, -122.1601];
  const mk = (title, extra) => Object.assign({ id: title, title, type: 'cafe', zone: 'palo-alto', coords: c, categories: [], goodFor: ['morning', 'afternoon', 'evening'],
    durationMin: 90, quality: 4, uniqueness: 3, minutesFromHome: 5, provenance: 'editorial', lastVerified: DATE }, extra);
  const pool = [
    mk('Dog trail', { type: 'hike', dogs: 'trail-leash', dogsChecked: DATE, kids: [0, 17] }),
    mk('No-dog trail', { type: 'hike', dogs: false, dogsChecked: DATE, quality: 5 }),
    mk('Silent trail', { type: 'hike', quality: 5 }),
    mk('Teen thing', { dogs: 'patio', dogsChecked: DATE, kids: [9, 17], quality: 5 }),
    mk('Sunset ridge', { type: 'hike', dogs: 'trail-leash', dogsChecked: DATE, setting: ['sunset'], goodFor: ['evening'], quality: 5, durationMin: 120 }),
    mk('Dinner', { type: 'restaurant', dogs: 'patio', dogsChecked: DATE, goodFor: ['evening'], quality: 5 }),
    mk('Gelato', { categories: ['dessert'], dogs: 'patio', dogsChecked: DATE, goodFor: ['evening'], durationMin: 30 })
  ];
  const ctx = prefs => ({ date: DATE, origin: { lat: c[0], lon: c[1] }, prefs,
    weather: Object.fromEntries(['2026-09-19', '2026-09-20'].map(d => [d, { mode: 'fine', sunset: '19:05', cloud: 10 }])),
    rank: { today: DATE, weatherMode: 'fine', taste: {}, exploredZones: [], homeZone: 'palo-alto' } });
  const titles = p => p.days.flatMap(d => d.stops.map(s => s.item.title));

  const dog = Plan.weekend(pool, ctx({ dog: true, kidAge: 6, company: ['family'] }));
  const dogStops = dog.days.flatMap(d => d.stops);
  want(dogStops.length > 0, 'a family with a dog still gets a plan');
  want(dogStops.every(s => s.item.dogs), `with a dog, every stop says it takes one (${titles(dog).join(', ')})`);
  want(!titles(dog).includes('Teen thing'), 'a child of six is not sent somewhere for nine and up');
  const dusk = dogStops.find(s => s.item.title === 'Sunset ridge');
  want(!!dusk && dusk.slot === 'evening' && dusk.sunset === '19:05' && dusk.arriveBy === '18:35', 'the sunset place is planned for the evening, with the time to be there by');
  const dessert = dogStops.filter(s => s.kind === 'dessert');
  const dinnerDays = dog.days.filter(d => d.stops.some(s => s.item.title === 'Dinner'));
  want(dinnerDays.length > 0 && dessert.length === dinnerDays.length, 'ice cream follows a planned dinner, only for a family');

  const none = Plan.weekend(pool, ctx({}));
  want(titles(none).includes('Silent trail') || titles(none).includes('No-dog trail'), 'with nothing said, the dog changes nothing');
  want(none.days.flatMap(d => d.stops).every(s => s.kind === undefined), 'and no dessert is added');
}

/* ---------- without the car ----------

   From one point: a café a few minutes' walk away, a park a bike ride
   away, a museum fifteen kilometres off, a place with no position and a
   day trip. Car-free keeps the first two and nothing else, in the plan
   and in the picks, and says how each leg is made. A café at the far end
   of a trail is reached along it. With nothing said, no leg claims a
   mode. */
{
  const id = 'bay-area';
  const g = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, navigator: {}, Store: { rating: () => null, isDone: () => false } };
  const Loc = loadModuleFor(id, 'location.js', 'Loc', g);
  const Hours = loadModuleFor(id, 'hours.js', 'Hours');
  const Near = loadModuleFor(id, 'nearby.js', 'Near', { Hours });
  const Rank = loadModuleFor(id, 'scoring.js', 'Rank', { Near, Hours, Store: g.Store });
  const Plan = loadModuleFor(id, 'plan.js', 'Plan', { Rank, Near, Loc, Hours });
  Near.use([], []);
  const c = [37.4479, -122.1601];
  const at = dLat => [+(c[0] + dLat).toFixed(5), c[1]];
  const mk = (title, extra) => Object.assign({ id: title, title, type: 'cafe', zone: 'palo-alto', coords: c, categories: [],
    goodFor: ['morning', 'afternoon', 'evening'], durationMin: 90, quality: 3, uniqueness: 3, minutesFromHome: 5,
    provenance: 'editorial', lastVerified: DATE }, extra);
  const pool = [
    mk('Near café', { coords: at(0.004) }),
    mk('Bike park', { type: 'park', coords: at(0.027) }),
    mk('Far museum', { type: 'museum', coords: at(0.14), quality: 5, uniqueness: 5 }),
    mk('No position', { coords: undefined, zone: undefined, quality: 5, uniqueness: 5 }),
    mk('Day trip', { type: 'daytrip', coords: undefined, zone: undefined, minutesFromHome: 40, quality: 5, uniqueness: 5 })
  ];
  const ctx = prefs => ({ date: DATE, origin: { lat: c[0], lon: c[1] }, prefs, weather: null,
    rank: { today: DATE, weatherMode: null, taste: {}, exploredZones: [], homeZone: 'palo-alto' } });
  const titles = p => p.days.flatMap(d => d.stops.map(s => s.item.title));

  const free = Plan.weekend(pool, ctx({ carFree: true }));
  const legs = free.days.flatMap(d => d.stops.map(s => s.travel));
  want(titles(free).length > 0 && titles(free).every(t => ['Near café', 'Bike park'].includes(t)),
    `car-free plans only what can be walked or cycled to (${titles(free).join(', ')})`);
  want(legs.every(t => ['walk', 'bike'].includes(t.mode) && t.minutes <= 20), 'every car-free leg says walk or bike, twenty minutes at most');
  want(free.picks.every(p => ['Near café', 'Bike park'].includes(p.item.title)), 'the picks are car-free too — no day trip');
  const near = Loc.activeLeg(c, at(0.004)), park = Loc.activeLeg(c, at(0.027));
  want(near && near.mode === 'walk' && park && park.mode === 'bike' && Loc.activeLeg(c, at(0.14)) === null,
    'a few hundred metres is a walk, three kilometres a ride, fifteen neither');

  const trail = mk('Trail', { type: 'ride', coords: c, routeEnd: at(0.03), goodFor: [], durationMin: 60 });
  const end = mk('Trail-end café', { coords: [at(0.028)[0], c[1] + 0.002], goodFor: ['morning'] });
  const day = Plan.day([trail, end], Object.assign(ctx({ carFree: true }), { date: '2026-09-19' }));
  const via = day.stops.find(s => s.item.title === 'Trail-end café');
  want(via && via.travel.mode === 'bike' && via.travel.via && via.travel.via.id === 'Trail',
    'a bike leg along a trail says which trail it follows');

  const any = Plan.weekend(pool, ctx({}));
  want(legs.length && any.days.flatMap(d => d.stops).every(s => !s.travel.mode), 'with nothing said, no leg claims a mode');
}

/* ---------- a daylight-saving night ----------

   America's clocks go forward on 14 March 2027 and back on 1 November
   2026; France's on 28 March 2027 and 25 October 2026. The weekend is
   worked out from noon, so it must come out the same whatever zone this
   runs in. */
const Plan = loadModuleFor('paris', 'plan.js', 'Plan', { Rank: {}, Near: {}, Loc: {}, Hours: {} });
for (const [day, sat, sun] of [['2027-03-13', '2027-03-13', '2027-03-14'], ['2027-03-14', '2027-03-13', '2027-03-14'],
                               ['2026-10-31', '2026-10-31', '2026-11-01'], ['2026-11-01', '2026-10-31', '2026-11-01'],
                               ['2027-03-27', '2027-03-27', '2027-03-28'], ['2026-10-23', '2026-10-24', '2026-10-25']]) {
  const w = Plan.weekendOf(day);
  want(w.sat === sat && w.sun === sun, `the weekend of ${day} is ${sat} and ${sun} (got ${w.sat}, ${w.sun})`);
}

console.log('');
if (failures) {
  console.error(`${failures} of ${checks} checks failed — the plan is not the shape the app and the MCP server read.`);
  process.exit(1);
}
console.log(`All ${checks} plan checks passed.`);
