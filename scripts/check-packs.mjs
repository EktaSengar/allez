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

   It is deliberately cheap. No network, no browser, no data files beyond
   each city's own home.json. It runs in a second and belongs on every
   pull request.

   Usage:  node scripts/check-packs.mjs [--verbose]
   --------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCity, cityIds, dataDir } from './shim.mjs';

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

/* ---------- run ---------- */

const ids = cityIds();
console.log(`\nChecking ${ids.length} city packs: ${ids.join(', ')}\n`);
for (const id of ids) checkPack(id);

console.log('');
if (failures) {
  console.error(`${failures} of ${checks} checks failed.`);
  console.error('A pack is not holding up its end of the contract the engine assumes.');
  process.exit(1);
}
console.log(`All ${checks} checks passed across ${ids.length} packs.`);
