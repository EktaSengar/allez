#!/usr/bin/env node
/* ---------------------------------------------------------
   check-hours.mjs — how much of the city's opening hours can we read?

   js/hours.js implements a subset of the OpenStreetMap opening-hours
   syntax and returns null for everything outside it. That is the right
   design and it makes one number matter: what fraction of the real
   strings fall inside the subset. A parser that handles the textbook
   cases and a tenth of Paris is worse than useless, because the site
   would confidently tell you a shop is shut on the strength of it.

   So this reads the actual dictionary out of data/discovered.json,
   parses every distinct string, and reports coverage weighted by how
   many places use each one. It fails below a floor, and prints the
   commonest strings it could not read — which is the to-do list for
   extending the subset.

   Usage:  node scripts/check-hours.mjs [--verbose]
   --------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModule, readDiscovered } from './shim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');
const Hours = loadModule('hours.js', 'Hours');

/* Below this, the "is it open" filter is not trustworthy enough to act
   on and the honest move would be to stop using it. */
const FLOOR = 0.80;

/* ---------- strings whose meaning is settled ----------

   Coverage says how much the parser reads; these say it reads them
   right. Each was once read wrongly, so each is a regression test. A
   comma before a weekday adds to the rules before it rather than
   replacing them — Darbar's weekday lunch vanished under its dinner
   rule — and `Su off` alone says nothing about the other six days. */
const SETTLED = [
  ['Mo-Fr 11:00-14:30, Sa 11:30-14:30, Su-We 17:00-21:30, Th-Sa 17:00-22:00', new Date(2026, 8, 21, 12, 0), true],
  ['Mo-Fr 11:00-14:30, Sa 11:30-14:30, Su-We 17:00-21:30, Th-Sa 17:00-22:00', new Date(2026, 8, 21, 16, 0), false],
  ['Tu-Fr 12:00-13:30, Tu-Sa 19:00-21:30', new Date(2026, 8, 25, 12, 30), true],
  ['Mo-Sa 10:00-20:00; Su 10:00-13:00', new Date(2026, 8, 27, 12, 0), true],
  ['Mo-Su 09:00-18:00; We off', new Date(2026, 8, 23, 12, 0), false],
  ['Fr 20:00-02:00', new Date(2026, 8, 26, 1, 0), true],
  ['Su off', new Date(2026, 8, 21, 12, 0), null]
];
const unsettled = SETTLED.filter(([s, when, want]) => Hours.isOpen(s, when) !== want);
unsettled.forEach(([s, when, want]) =>
  console.error(`  ✗ "${s}" at ${when.toString().slice(0, 21)} should be ${want}, reads ${Hours.isOpen(s, when)}`));
if (unsettled.length) {
  console.error(`\n✗ ${unsettled.length} settled strings read wrongly — the parser has regressed.\n`);
  process.exit(1);
}

const doc = await readDiscovered();

/* Weight by usage: one unreadable string on four hundred bakeries
   matters four hundred times more than one on a single museum. */
const uses = new Map();
for (const p of doc.items) if (p.oh) uses.set(p.oh, (uses.get(p.oh) || 0) + 1);

const strings = [...uses.keys()];
if (!strings.length) {
  console.error('\nNo opening hours in data/discovered.json — run scripts/discover.mjs\n');
  process.exit(1);
}

let readable = 0, total = 0, readableStrings = 0;
const failures = [];

strings.forEach(str => {
  const n = uses.get(str) || 0;
  total += n;
  if (Hours.parse(str)) { readable += n; readableStrings++; }
  else if (n) failures.push([n, str]);
});

failures.sort((a, b) => b[0] - a[0]);

const pct = total ? readable / total : 0;
const withHours = doc.items.filter(p => p.oh).length;

console.log(`\nOpening hours — ${new Date().toISOString().slice(0, 10)}`);
console.log(`  ${withHours} of ${doc.items.length} places carry hours (${Math.round(withHours / doc.items.length * 100)}%)`);
console.log(`  ${strings.length} distinct strings, ${readableStrings} readable`);
console.log(`  ${Math.round(pct * 100)}% of places with hours can be answered`);

if (failures.length) {
  console.log(`\n  commonest strings outside the subset:`);
  failures.slice(0, VERBOSE ? 40 : 10)
    .forEach(([n, str]) => console.log(`    ${String(n).padStart(4)} × ${str.slice(0, 70)}`));
}

/* A spot check that the parser agrees with itself: every readable string
   must give a definite answer for all seven days. */
let incoherent = 0;
for (const str of strings) {
  if (!Hours.parse(str)) continue;
  const shut = Hours.closedDays(str);
  if (!Array.isArray(shut) || shut.length === 7) incoherent++;
}
if (incoherent) console.log(`\n  ${incoherent} strings parse but are never open — suspicious`);

if (pct < FLOOR) {
  console.error(`\n✗ ${Math.round(pct * 100)}% is below the ${Math.round(FLOOR * 100)}% floor — `
    + `the "is it open" filter is not safe to act on.\n`);
  process.exit(1);
}
console.log('\nGood enough to act on.\n');
