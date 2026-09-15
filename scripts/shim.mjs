#!/usr/bin/env node
/* ---------------------------------------------------------
   shim.mjs — run a browser module in Node.

   The js/ files are plain scripts, not ES modules: each one wraps an
   IIFE and leaves a single const behind for the next script tag to use.
   That is deliberate — no build step, no bundler, nothing between the
   editor and the page.

   It does mean Node cannot `import` them, and the Node scripts need to,
   because the alternative is a second copy of the logic that drifts out
   of step with the first. So they are evaluated in a function whose
   parameters stand in for whichever globals the module expects, and the
   const is handed back.

   Nothing is mocked beyond what a module actually reaches for. If a
   script needs `Store` or `fetch`, it passes its own stub and decides
   what the stub does.
   --------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readShards } from './shard.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'js');

function evaluate(src, name, globals) {
  const keys = ['console', ...Object.keys(globals)];
  const vals = [console, ...Object.values(globals)];
  return new Function(...keys, `${src}\n; return ${name};`)(...vals);
}

/* ---------- the city pack ----------

   In the browser this is a script tag ahead of every other one, because
   location.js, scoring.js, weather.js and app.js all read `City` as they
   evaluate. Node needs it for the same reason and in the same order, so
   it is loaded once here and handed to every module below — a script
   that forgets to pass it would fail in a way the browser never would,
   which is exactly the drift shim.mjs exists to prevent.

   Which city: `HOMEGROUND_CITY` if it is set, Paris otherwise, because
   Paris is what every existing script builds and none of them should
   have to say so. A script that works on one city reads `City.id`; a
   script that works on several calls `loadCity()` per pack. */
export const loadCity = id =>
  evaluate(fs.readFileSync(path.join(ROOT, id, 'city.js'), 'utf8'), 'City', {});

export const City = loadCity(process.env.HOMEGROUND_CITY || 'paris');

/* Where a city's data sits. Every city is a directory at the repo root
   now — `/paris`, `/delhi`, `/bengaluru`, `/bay-area` — which is what the
   custom domain serves as allez.city/paris and the rest. Paris used to be
   the exception, living at the root because it was the live site at a live
   URL; the domain move is what let that go. */
export const dataDir = (cityId = City.id) => path.join(ROOT, cityId, 'data');

/* The discovery index ships as twenty files so the browser can paint
   before it has all of them. Nothing in Node has any reason to care, so
   this is the one place that reassembles it.

   It reads the city this process was told to build, which it did not
   used to: this was `export const readDiscovered = readShards`, and
   `readShards` defaulted to Paris. Every caller relies on the default —
   `editorial.mjs`, `draft.mjs`, `check-hours.mjs`, `check-location.mjs` —
   so all four read Paris however `HOMEGROUND_CITY` was set. That is why
   a Bay Area editorial record could not resolve: `editorial.mjs` was
   matching "Tartine" against the Paris index and correctly finding
   nothing. The default is the city, not a city. */
export const readDiscovered = (dir = path.join(dataDir(), 'places')) => readShards(dir);

/* Every pack, for the scripts that work across all of them. */
export const cityIds = () =>
  fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(ROOT, d.name, 'city.js')))
    .map(d => d.name)
    .sort((a, b) => (a === 'paris' ? -1 : b === 'paris' ? 1 : a.localeCompare(b)));

/* Storage names. `keys.js` reads City.id and touches localStorage as it
   evaluates — carrying the old single-city keys over — so Node hands it
   somewhere harmless to write to and nothing carries over. state.js and
   location.js both read `Keys` at evaluation time, so it is injected
   alongside City for the same reason. */
const noStore = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const Keys = evaluate(
  fs.readFileSync(path.join(JS, 'keys.js'), 'utf8'), 'Keys',
  { City, localStorage: noStore });

export function loadModule(file, name, globals = {}) {
  const src = fs.readFileSync(path.join(JS, file), 'utf8');
  return evaluate(src, name, { City, Keys, ...globals });
}

/* The same module against a different pack, which is the only way to
   find out whether the engine is actually city-blind or merely has not
   been asked yet. */
export function loadModuleFor(cityId, file, name, globals = {}) {
  const c = loadCity(cityId);
  const k = evaluate(fs.readFileSync(path.join(JS, 'keys.js'), 'utf8'), 'Keys',
                     { City: c, localStorage: noStore });
  return evaluate(fs.readFileSync(path.join(JS, file), 'utf8'), name,
                  { City: c, Keys: k, ...globals });
}

/* ---------- which zone a point is in, and whether it is in the city ----------

   `discover.mjs` and `notable.mjs` both had their own copy of this, both
   spelled "nearest centroid wins", and both unconditional — every point
   inside the bounding box came back with the name of the nearest zone
   however far away that zone was.

   For Paris that is harmless: the box is tight around a city that fills
   it. For the Bay Area it is not. The pack says in its own words that it
   is "SF down to Mountain View, deliberately not the whole nine
   counties" — and a rectangle cannot say that, because the bay runs
   diagonally through it. So 2,766 East Bay places arrived inside the box
   and were each labelled with the nearest San Francisco zone across the
   water: Montclair Branch Library, in Oakland, came back as Rincon Hill,
   16.5 km and a bridge away.

   A pack that knows its zones do not tile its bounding box says so with
   `zone.limitKm`, and a point further than that from its zone is not in
   the city at all. Measured on the Bay index, 10 km drops 2,325 records
   and not one of them is in scope; the nearest in-scope records to the
   line are the hill places above Woodside at 8–9 km, genuinely that far
   from anywhere with a name, and they stay. A pack that omits it behaves
   exactly as before, which is why Paris, Delhi and Bengaluru are
   untouched by this.

   **Two different measures, deliberately.** Selection is the squared
   degrees both copies already used, so no city's existing labels move.
   The limit is `Loc.km`, the browser's own, because a threshold written
   in kilometres has to be measured in kilometres — at this latitude a
   degree of longitude is 88 km against 111 for latitude, so squared
   degrees stretch the east-west axis by a quarter and "10" would quietly
   mean two different distances depending on which way you went.

   Switching selection to true distance as well is defensible and is not
   done here: it is geometrically the better rule, it scores identically
   against sixteen Paris landmarks whose arrondissement is a matter of
   record (15/16 either way), and it would relabel 2,997 Paris places,
   197 in Delhi and 268 in Bengaluru. That is a change worth making on
   its own evidence, not as a side effect of a bounding box. It would
   move 16 of the Bay Area's 9,170 records, which is the measure of how
   little the distinction matters here.

   The cost of the split, stated rather than hidden: for those few
   records near the line the limit is measured against the centroid
   squared degrees picked, which is not always the truly nearest one. */
let _loc = null;
const locale = () => (_loc ??= loadModule('location.js', 'Loc',
  { localStorage: noStore, navigator: {}, Store: {} }));

export function zoneFinder(city = City) {
  /* The pack's `grid` where it has one, because an evenly spaced table
     approximates real boundaries better than one pulled towards the
     shops; its ordinary centroids otherwise, which is what a city with
     no polygons to approximate has anyway. */
  const table = city.zone.grid || city.zone.centroids;
  const limit = city.zone.limitKm ?? null;
  const km = limit == null ? null : locale().km;
  /* Object.keys() always hands back strings. Paris's zones really are
     numbers and its records store them as numbers, so they are converted
     back; Bengaluru's are slugs and must not be. Coercing
     unconditionally turned every Bengaluru zone into NaN and put all
     7,268 places in one shard. */
  const key = k => (/^\d+$/.test(k) ? Number(k) : k);

  return (lat, lon) => {
    let best = null, coords = null, bd = Infinity;
    for (const [n, c] of Object.entries(table)) {
      const d = (c[0] - lat) ** 2 + (c[1] - lon) ** 2;
      if (d < bd) { bd = d; best = key(n); coords = c; }
    }
    if (limit != null && coords && km([lat, lon], coords) > limit) return null;
    return best;
  };
}

/* The two the record layer needs, in the order they depend on each
   other. Every script that reads data/ and wants it in the shape the
   browser sees should start here. */
export function loadRecord() {
  const Loc = loadModule('location.js', 'Loc',
    { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      navigator: {}, Store: {} });
  return { Loc, Rec: loadModule('record.js', 'Rec', { Loc }) };
}
