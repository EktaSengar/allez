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

/* The discovery index ships as twenty files so the browser can paint
   before it has all of them. Nothing in Node has any reason to care, so
   this is the one place that reassembles it. */
export const readDiscovered = readShards;

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
  evaluate(fs.readFileSync(path.join(ROOT, 'cities', id, 'city.js'), 'utf8'), 'City', {});

export const City = loadCity(process.env.HOMEGROUND_CITY || 'paris');

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

/* The two the record layer needs, in the order they depend on each
   other. Every script that reads data/ and wants it in the shape the
   browser sees should start here. */
export function loadRecord() {
  const Loc = loadModule('location.js', 'Loc',
    { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      navigator: {}, Store: {} });
  return { Loc, Rec: loadModule('record.js', 'Rec', { Loc }) };
}
