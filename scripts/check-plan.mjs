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
  }
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
