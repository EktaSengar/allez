#!/usr/bin/env node
/* ---------------------------------------------------------
   check-packs.mjs — does every city pack hold up its end?

   The engine asks a pack for things. A pack that does not answer breaks
   exactly one city, only at runtime, and usually only in the one view
   that asked — which is why every phase of the multi-city work found
   another one by accident rather than on purpose:

     `zone.mapSpread` was read by destructuring, so a pack that sensibly
     omits a quest map threw a TypeError before anything rendered.

     `zone.ordinal` was the wrong idea under the wrong name; Bengaluru's
     keys are already names and its version is the identity.

     `displayName` assembled "10e · Canal Saint-Martin" itself, which is
     right in one city and reads as "Indiranagar · Indiranagar" in another.

     "All twenty" and "Hidden ${City.name}" were written into view
     builders, which is fine until the city has ninety-six neighbourhoods
     or a name that takes an article.

   Each of those was found by rendering a second city and looking. This
   file is that habit, written down: it loads every pack, asks it
   everything the engine asks, and fails loudly on anything missing —
   before a browser has to.

   It is deliberately cheap. No network, no browser, and no data files
   beyond each city's own home.json — except for a city held to the
   record contract at the bottom, whose records it builds the way the
   page does. It runs in a few seconds and belongs on every pull request.

   Usage:  node scripts/check-packs.mjs [--verbose]
   --------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCity, cityIds, dataDir, loadModuleFor, readDiscovered } from './shim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');

let failures = 0;
let checks = 0;

const ok = (city, msg) => {
  checks++;
  if (VERBOSE) console.log(`  ok    ${city} · ${msg}`);
};
const bad = (city, msg) => {
  checks++; failures++;
  console.error(`  FAIL  ${city} · ${msg}`);
};
const want = (city, cond, msg) => (cond ? ok(city, msg) : bad(city, msg));

/* ---------- what the engine asks of every pack ----------

   Split by who reads it, because the failure is easier to place when the
   list says which file was going to be disappointed. */

const TOP = {
  id:        'the directory name and the storage namespace',
  name:      'location.js displayName, and any heading naming the city',
  bbox:      'discover.mjs, for what to ask Overpass',
  zone:      'everything about where a record is',
  reach:     'location.js minutes()',
  views:     'app.js, for which tabs exist',
  money:     'app.js, for what a price looks like',
  weather:   'weather.js, for where to ask',
  holidays:  'scoring.js',
  shutsOnHoliday: 'scoring.js'
};

const ZONE = {
  one:       'the singular noun, in prose',
  many:      'the plural',
  label:     'what to write given a zone key and nothing else',
  display:   'how a saved place reads in the location bar',
  fallback:  'when the city does not know where you are',
  centroids: 'where each zone is',
  names:     'what a local calls it',
  allHeading:'the heading over the full list',
  tile:      'a zone in the explore grid'
};

function checkPack(id) {
  let City;
  try { City = loadCity(id); }
  catch (e) { bad(id, `pack will not load: ${e.message}`); return; }

  for (const [k, why] of Object.entries(TOP)) {
    want(id, City[k] !== undefined, `has \`${k}\` — ${why}`);
  }
  if (!City.zone) return;

  for (const [k, why] of Object.entries(ZONE)) {
    want(id, City.zone[k] !== undefined, `zone.${k} — ${why}`);
  }

  /* ---------- the zone tables have to agree ---------- */

  const cent = Object.keys(City.zone.centroids || {});
  const names = Object.keys(City.zone.names || {});
  want(id, cent.length > 0, `declares zones (${cent.length})`);

  const missingName = cent.filter(k => !(k in (City.zone.names || {})));
  want(id, missingName.length === 0,
    `every zone has a name${missingName.length ? ` — missing ${missingName.slice(0, 4).join(', ')}` : ''}`);

  const orphanName = names.filter(k => !(k in (City.zone.centroids || {})));
  want(id, orphanName.length === 0,
    `no name without a position${orphanName.length ? ` — ${orphanName.slice(0, 4).join(', ')}` : ''}`);

  const badCoord = cent.filter(k => {
    const c = City.zone.centroids[k];
    return !Array.isArray(c) || c.length !== 2 || !c.every(Number.isFinite);
  });
  want(id, badCoord.length === 0,
    `every centroid is a [lat, lon]${badCoord.length ? ` — ${badCoord.slice(0, 4).join(', ')}` : ''}`);

  /* ---------- the centroids have to be inside the box ----------

     A zone outside the pack's own bbox is never reached by a discovery
     run, so it can sit in the table for months looking like coverage
     while holding nothing. Cheap to assert and impossible to notice
     otherwise. */
  if (City.bbox) {
    const [s, w, n, e] = String(City.bbox).split(',').map(Number);
    const outside = cent.filter(k => {
      const [la, lo] = City.zone.centroids[k];
      return la < s || la > n || lo < w || lo > e;
    });
    want(id, outside.length === 0,
      `every centroid is inside bbox${outside.length ? ` — ${outside.slice(0, 4).join(', ')}` : ''}`);
  }

  /* ---------- the limit, where a pack declares one ----------

     `zone.limitKm` is how a pack says its zones do not tile its bounding
     box — see the note in shim.mjs. Optional, so this only fires for a
     pack that has opted in, but a limit that is zero, negative or a
     string would silently drop the entire city. */
  if (City.zone.limitKm !== undefined) {
    want(id, Number.isFinite(City.zone.limitKm) && City.zone.limitKm > 0,
      `zone.limitKm is a positive number of kilometres (${City.zone.limitKm})`);
    /* A limit too small for the pack's own spacing would throw away
       places in the middle of the city. The floor is *half* the widest
       gap between neighbouring centroids, not the gap: a point midway
       between two zones 12 km apart is 6 km from both, so 6 is what the
       limit has to clear for that ground to belong to either of them.
       Testing the whole gap fails Half Moon Bay, which is 11.9 km from
       its nearest neighbour up the coast and perfectly well covered. */
    const R = 6371, rad = d => d * Math.PI / 180;
    const km = (a, b) => {
      const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
      const x = Math.sin(dLat / 2) ** 2 +
                Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(x));
    };
    let widest = 0, lonely = null;
    for (const k of cent) {
      let nearest = Infinity;
      for (const j of cent) if (j !== k)
        nearest = Math.min(nearest, km(City.zone.centroids[k], City.zone.centroids[j]));
      if (nearest > widest) { widest = nearest; lonely = k; }
    }
    want(id, City.zone.limitKm >= widest / 2,
      `zone.limitKm covers the ground between zones — needs ${(widest / 2).toFixed(1)} km ` +
      `for the gap at ${lonely}, has ${City.zone.limitKm}`);
  }

  /* ---------- the functions have to actually work ----------

     Declared-but-broken is the failure mode a presence check misses, so
     each one is called with a key the pack itself supplied. */

  const key = cent[0];
  try {
    const l = City.zone.label(key);
    want(id, typeof l === 'string' && l.length > 0, `zone.label(${key}) returns something`);
  } catch (e) { bad(id, `zone.label threw: ${e.message}`); }

  try {
    const d = City.zone.display(key, City.zone.names[key]);
    want(id, typeof d === 'string' && d.length > 0, `zone.display(${key}) returns something`);
    want(id, !/undefined|NaN|\[object/.test(d), `zone.display is clean — "${d}"`);
  } catch (e) { bad(id, `zone.display threw: ${e.message}`); }

  try {
    const t = City.zone.tile(key);
    want(id, typeof t === 'string' && !/undefined|NaN/.test(t), `zone.tile(${key}) is clean`);
  } catch (e) { bad(id, `zone.tile threw: ${e.message}`); }

  /* The quest map is optional and reading it unguarded used to crash a
     pack that sensibly omitted it. If one half is here, so is the other. */
  const hasMap = !!City.zone.map;
  want(id, hasMap === !!City.zone.mapSpread,
    hasMap ? 'has a quest map and its spread' : 'omits the quest map entirely (chips instead)');
  if (hasMap) {
    want(id, !!City.zone.mapQuest, 'names which quest gets the map');
    const off = Object.keys(City.zone.map).filter(k => !(k in City.zone.centroids));
    want(id, off.length === 0, `every mapped zone is a real zone${off.length ? ` — ${off.join(', ')}` : ''}`);
  }

  /* ---------- reach ---------- */

  try {
    const when = new Date('2026-09-16T18:30:00');
    const m = City.reach.minutes(3, when);
    want(id, Number.isFinite(m) && m > 0, `reach.minutes(3km) = ${m}`);
    const far = City.reach.minutes(30, when);
    want(id, Number.isFinite(far) && far > m, `further costs more (30km = ${far})`);
  } catch (e) { bad(id, `reach.minutes threw: ${e.message}`); }

  /* ---------- money ---------- */

  try {
    const p = City.money.format(12);
    want(id, typeof p === 'string' && /12/.test(p), `money.format(12) = ${p}`);
    want(id, Number.isFinite(City.money.cheap), 'money.cheap is a number');
  } catch (e) { bad(id, `money.format threw: ${e.message}`); }

  /* What a price level means here. js/scoring.js places a stated price on
     the scale with `upTo`, and js/plan.js adds up a day with `about`, so
     both have to exist, rise, and start at free. */
  const lv = City.money?.levels;
  const rises = a => Array.isArray(a) && a.every((x, n) => Number.isFinite(x) && (n === 0 || x > a[n - 1]));
  want(id, !!lv && rises(lv.upTo) && lv.upTo.length === 4 && lv.upTo[0] === 0,
    `money.levels.upTo is four rising caps from 0 — ${JSON.stringify(lv?.upTo)}`);
  want(id, !!lv && rises(lv.about) && lv.about.length === 5 && lv.about[0] === 0,
    `money.levels.about is five rising spends from 0 — ${JSON.stringify(lv?.about)}`);

  /* ---------- views, and the nav that shows them ----------

     Two lists on purpose — the tabs are markup so the header is its full
     height before the first paint (invariant 18) — which means they can
     drift, silently. */

  const declared = [...(City.views?.main || []), ...(City.views?.utility || [])];
  want(id, declared.length > 0, `declares views (${declared.length})`);
  want(id, declared.every(v => v.id && v.label), 'every view has an id and a label');

  const html = fs.readFileSync(path.join(ROOT, id, 'index.html'), 'utf8');
  /* Only the nav. The footer carries `.tab-link` buttons with the same
     data-view, and a looser pattern picks those up as two extra views —
     which this check did on its first run. */
  const nav = (html.match(/<nav class="tabs"[\s\S]*?<\/nav>/) || [''])[0];
  const navIds = [...nav.matchAll(/data-view="([^"]+)"/g)].map(m => m[1]);
  want(id, nav.length > 0, 'index.html has a tab nav');
  want(id, navIds.join(',') === declared.map(v => v.id).join(','),
    `the nav matches City.views${navIds.join(',') !== declared.map(v => v.id).join(',')
      ? `\n          pack: ${declared.map(v => v.id).join(',')}\n          nav : ${navIds.join(',')}` : ''}`);

  /* ---------- home ---------- */

  let home;
  try { home = JSON.parse(fs.readFileSync(path.join(dataDir(id), 'home.json'), 'utf8')); }
  catch (e) { bad(id, `home.json unreadable: ${e.message}`); return; }

  const bases = Array.isArray(home.bases) ? home.bases : [home];
  want(id, bases.length > 0, `home declares ${bases.length} base${bases.length > 1 ? 's' : ''}`);

  const [s, w, n, e] = String(City.bbox).split(',').map(Number);
  want(id, [s, w, n, e].every(Number.isFinite) && n > s && e > w, `bbox parses — ${City.bbox}`);

  for (const b of bases) {
    const tag = bases.length > 1 ? `base "${b.label}"` : 'home';
    want(id, Number.isFinite(b.lat) && Number.isFinite(b.lon), `${tag} has coordinates`);
    want(id, b.zone && b.zone in (City.zone.centroids || {}),
      `${tag} sits in a zone this pack declares (${b.zone})`);
    want(id, b.lat >= s && b.lat <= n && b.lon >= w && b.lon <= e,
      `${tag} is inside the bounding box`);
  }

  /* ---------- the optional capabilities, if declared ---------- */

  if (City.air) {
    want(id, !!City.air.weight, 'air declares its weights');
    const modes = ['clean', 'moderate', 'poor', 'bad', 'severe', 'hazardous'];
    const missing = modes.filter(m => !City.air.weight?.[m]);
    want(id, missing.length === 0, `air covers every band${missing.length ? ` — missing ${missing.join(', ')}` : ''}`);
    /* The whole point: it must never be able to clear the page. */
    const worst = Math.min(...modes.map(m => City.air.weight?.[m]?.outdoor ?? 0));
    want(id, Number.isFinite(worst), `air never excludes — worst outdoor penalty is ${worst}`);
  }

  if (City.climate) {
    want(id, Array.isArray(City.climate.stations) && City.climate.stations.length > 1,
      `climate declares ${City.climate.stations?.length} stations`);
    want(id, City.climate.stations.every(st => st.id && Number.isFinite(st.lat) && Number.isFinite(st.lon)),
      'every station has an id and a position');
  }

  if (City.bases || bases.length > 1) {
    want(id, bases.length > 1, 'more than one base, or none declared');
  }
}

/* ---------- the records the guide vouches for ----------

   The Weekend tab's slot tests, the plan builder in js/plan.js and the
   MCP server all read the same few fields off a recommendation, and a
   record without them fails quietly rather than loudly: no hours and
   "open now" cannot be said; no duration and every café is an
   afternoon; no price and a day's spend is a guess; no checked date and
   nobody can tell a fresh card from a stale one.

   check-records.mjs reports how complete every city is, and does not
   fail, because for most cities the honest target is coverage. A pack
   listed here has reached the target and is held to it: a ★ or
   researched record missing one of these fails the build. Adding a city
   is the commitment, so it is a list rather than a default.

   Missing is not the same as not applying. A walk has nothing to book
   and a music hall has no opening hours, and each record says so —
   `booking: false`, an `hoursNote` — rather than leaving the field
   empty, because an empty field cannot be told apart from one nobody
   checked. */

const HELD = new Set(['bay-area']);

const FILES = ['events', 'places', 'nightlife', 'sports', 'food', 'itineraries', 'daytrips',
               'civic', 'notable', 'editorial', 'notes', 'events-city', 'practices', 'conferences'];
/* The kinds that have a door, and so opening hours js/hours.js must be
   able to read. The same list check-records.mjs grades against. */
const DOORS = new Set(['cafe', 'bakery', 'restaurant', 'deli', 'dessert', 'market', 'bar', 'jazz',
                       'comedy', 'venue', 'club', 'latenight', 'nightlife', 'museum', 'gallery', 'books', 'shop', 'culture']);
const SLOT_WORDS = ['morning', 'afternoon', 'evening'];
const TODAY = new Date().toISOString().slice(0, 10);

async function checkRecords(id) {
  const noStore = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const Loc   = loadModuleFor(id, 'location.js', 'Loc', { localStorage: noStore, navigator: {}, Store: {} });
  const Rec   = loadModuleFor(id, 'record.js', 'Rec', { Loc });
  const Hours = loadModuleFor(id, 'hours.js', 'Hours');
  const Near  = loadModuleFor(id, 'nearby.js', 'Near', { Hours });
  const Rank  = loadModuleFor(id, 'scoring.js', 'Rank', { Near, Hours, Store: { rating: () => null } });

  const read = f => {
    try { return JSON.parse(fs.readFileSync(path.join(dataDir(id), f + '.json'), 'utf8')); }
    catch { return { items: [] }; }
  };
  const D = Object.fromEntries(FILES.map(f => [f, read(f)]));
  D.discovered = await readDiscovered(path.join(dataDir(id), 'places'));
  const { all, discovered } = Rec.build(D, TODAY);
  const vouched = [...all, ...discovered].filter(i => ['personal', 'editorial'].includes(i.provenance));

  const isTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');
  const said = s => typeof s === 'string' && s.trim().length > 0;

  const RULES = [
    ['a checked date', i => /^\d{4}-\d{2}-\d{2}$/.test(i.lastVerified || '') && i.lastVerified <= TODAY],
    /* Hours js/hours.js can read, for anything with a door. A dated event
       needs the time it starts. Anything else may state hours the parser
       refuses — "sunrise-sunset" is true, and "we cannot read it" is an
       answer the site already handles — or its start. Or a sentence
       saying why there are none. */
    ['when it is open', i => said(i.hoursNote) || (DOORS.has(i.type) ? Hours.parse(i.hours) !== null
      : i.start ? isTime(i.startTime) : (said(i.hours) || isTime(i.startTime)))],
    ['a part of the day it suits', i => (i.goodFor || []).some(g => SLOT_WORDS.includes(g))],
    ['how long it takes', i => Number.isFinite(i.durationMin) && i.durationMin > 0],
    /* A stated price has to land on the level stated, or the budget
       preference and the day's spend would disagree about the same card. */
    ['a price level', i => Number.isInteger(i.priceLevel) && i.priceLevel >= 0 && i.priceLevel <= 4
      && (typeof i.price !== 'number' || Rank.priceLevel({ price: i.price }) === i.priceLevel)],
    ['indoors or out', i => typeof i.indoor === 'boolean'],
    ['a booking link, or false', i => i.booking === false || /^https:\/\/\S+$/.test(i.booking || '')]
  ];

  want(id, vouched.length > 0, `${vouched.length} records the guide vouches for`);
  for (const [what, ok] of RULES) {
    const missing = vouched.filter(i => !ok(i));
    const list = missing.slice(0, 6).map(i => i.title).join(', ') + (missing.length > 6 ? ', …' : '');
    want(id, missing.length === 0,
      `every ★ and researched record states ${what}${missing.length ? ` — ${missing.length} do not: ${list}` : ''}`);
  }
}

/* ---------- run ---------- */

const ids = cityIds();
console.log(`\nChecking ${ids.length} city packs: ${ids.join(', ')}\n`);
for (const id of ids) {
  checkPack(id);
  if (HELD.has(id)) await checkRecords(id);
}

console.log('');
if (failures) {
  console.error(`${failures} of ${checks} checks failed.`);
  console.error('A pack is not holding up its end of the contract the engine assumes.');
  process.exit(1);
}
console.log(`All ${checks} checks passed across ${ids.length} packs.`);
