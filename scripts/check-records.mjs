#!/usr/bin/env node
/* ---------------------------------------------------------
   check-records.mjs — how complete is what we recommend?

   The site, the MCP server and the app all stand on the same records, and
   an agent will repeat whatever a record says with total confidence. So
   this measures the records the guide puts its name to — written from a
   visit, or researched — against the fields that make a recommendation
   usable rather than merely true:

     where      coordinates, so distance and directions work
     when       opening hours, for anything with a door
     how        a link to act on: the place's own site or its booking page
     proof      a source and a date it was last checked, for researched ones
     picture    a photograph, own or free-licensed

   Built with js/record.js, the module the browser runs, so the numbers
   describe the site that ships rather than the files on disk. It reports
   and does not fail: the targets in the plan are coverage, and a failing
   check would only teach people to add empty fields. `--list <field>`
   prints the records missing one field, which is the work list.

   Usage:  HOMEGROUND_CITY=<city> node scripts/check-records.mjs [--list hours]
   --------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import { loadRecord, readDiscovered, dataDir, City } from './shim.mjs';

const read = f => { try { return JSON.parse(fs.readFileSync(path.join(dataDir(), f + '.json'), 'utf8')); } catch { return { items: [] }; } };
const D = {};
for (const n of ['events', 'places', 'nightlife', 'sports', 'food', 'itineraries', 'daytrips',
                 'civic', 'notable', 'editorial', 'notes', 'events-city', 'practices', 'conferences']) D[n] = read(n);
D.discovered = await readDiscovered();

const TODAY = new Date().toISOString().slice(0, 10);
const { Rec } = loadRecord();
const { all, discovered } = Rec.build(D, TODAY);

/* The records the guide vouches for. Routes, trips, fixtures and trails are
   judged on what they are — none of them has a door or opening hours. */
const vouched = [...all, ...discovered].filter(i => ['personal', 'editorial'].includes(i.provenance));
const DOORS = new Set(['cafe', 'bakery', 'restaurant', 'deli', 'dessert', 'market', 'bar', 'jazz',
                       'comedy', 'venue', 'club', 'nightlife', 'museum', 'gallery', 'books', 'shop', 'culture']);
const hasDoor = i => DOORS.has(i.type);

const FIELDS = [
  ['where',   () => true,                       i => Array.isArray(i.coords) && i.coords.length === 2],
  ['hours',   hasDoor,                          i => !!i.hours],
  ['how',     () => true,                       i => !!(i.url || i.booking)],
  ['proof',   i => i.provenance === 'editorial', i => !!(i.source && i.lastVerified)],
  ['picture', () => true,                       i => !!i.image]
];

const pct = (n, d) => (d ? Math.round(100 * n / d) : 100);
console.log(`\n${City.name} — ${vouched.length} records the guide vouches for ` +
  `(${vouched.filter(i => i.provenance === 'personal').length} from a visit, ` +
  `${vouched.filter(i => i.provenance === 'editorial').length} researched)\n`);
for (const [name, applies, ok] of FIELDS) {
  const pool = vouched.filter(applies);
  const have = pool.filter(ok).length;
  const bar = '█'.repeat(Math.round(pct(have, pool.length) / 5)).padEnd(20, '·');
  console.log(`  ${name.padEnd(8)} ${bar} ${String(pct(have, pool.length)).padStart(3)}%  ${have}/${pool.length}`);
}

const li = process.argv.indexOf('--list');
if (li !== -1) {
  const field = process.argv[li + 1];
  const f = FIELDS.find(([n]) => n === field);
  if (!f) { console.error(`\n  no field "${field}" — one of ${FIELDS.map(([n]) => n).join(', ')}\n`); process.exit(1); }
  const [, applies, ok] = f;
  const missing = vouched.filter(i => applies(i) && !ok(i));
  console.log(`\n  missing ${field} (${missing.length}):`);
  missing.forEach(i => console.log(`    ${i.provenance === 'personal' ? '★' : '◆'} ${i.type.padEnd(11)} ${i.title}  ·  ${i.id}`));
}
console.log('');
