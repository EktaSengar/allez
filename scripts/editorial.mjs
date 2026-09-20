#!/usr/bin/env node
/* ---------------------------------------------------------
   editorial.mjs — resolve researched recommendations against real places.

   data/editorial.json is written by hand, and hand-written data rots in
   two specific ways: coordinates get mistyped, and places get recommended
   that do not exist. So the file carries neither. Each record says only
   which place it is talking about —

       "match": { "name": "Ten Belles", "zone": 10, "type": "cafe" }

   — and this fills in the id, the coordinates and the official link from
   the discovery index. A record that matches nothing is reported and
   dropped rather than shipped, which makes inventing a café impossible
   by construction.

   Run it after editing editorial.json. It rewrites the file in place,
   keeping every hand-written field exactly as written.

   Usage:  node scripts/editorial.mjs [--check]
           --check   report and exit non-zero, change nothing (for CI)
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRecord, readDiscovered, dataDir, City } from './shim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = dataDir();
const CHECK = process.argv.includes('--check');

const read = async f => JSON.parse(await fs.readFile(path.join(DATA, f + '.json'), 'utf8'));
const flat = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/* Not a copy of the browser's id rule — the browser's id rule. Every
   note in data/notes.json is keyed by it, so a second implementation
   drifting by one character silently orphans them all. */
const { Rec } = loadRecord();
const compactId = Rec.compactId;

/* Exact name first, then a contains match, then the same words in any
   order — enough slack for "Boulangerie Utopie" vs "Utopie", not enough
   to match a different shop. */
/* A record whose `match` names no zone, in a city where that name
   exists more than once, is a coin toss the writer did not know they
   were making — and it has gone wrong twice: 'Bukhara' resolved to a
   restaurant in Noida rather than the one in Chanakyapuri, and Lloyd's
   Carrot Cake to the Harlem branch of a shop the card describes in
   Riverdale. Both read as correct in the output, because both are real
   places with the right name.

   So an ambiguous match is reported. It is not an error — plenty of
   names are unique enough not to need a zone — but it is the one thing
   this file cannot check for itself. */
const ambiguous = [];

function findPlace(pool, m) {
  const want = flat(m.name);
  if (m.zone == null) {
    const sameName = pool.filter(p => flat(p.n) === want &&
      (m.type == null || p.c === m.type));
    if (sameName.length > 1)
      ambiguous.push(`${m.name} — ${sameName.length} of them (${
        [...new Set(sameName.map(p => p.a))].slice(0, 4).join(', ')})`);
  }
  const inArr = pool.filter(p => (m.zone == null || p.a === m.zone) &&
                                 (m.type == null || p.c === m.type));
  const exact = inArr.find(p => flat(p.n) === want);
  if (exact) return exact;
  const partial = inArr.filter(p => flat(p.n).includes(want) || want.includes(flat(p.n)));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    /* Prefer the one whose name is closest in length to what was asked for. */
    return partial.sort((a, b) =>
      Math.abs(flat(a.n).length - want.length) - Math.abs(flat(b.n).length - want.length))[0];
  }
  const words = want.split(' ').filter(w => w.length > 2);
  const loose = inArr.filter(p => words.length && words.every(w => flat(p.n).includes(w)));
  return loose.length === 1 ? loose[0] : null;
}

async function run() {
  const doc = await read('editorial');
  const disc = await readDiscovered();
  const pool = disc.items || [];

  const missed = [];
  let resolved = 0;

  const items = doc.items.map(rec => {
    if (!rec.match) { missed.push(`${rec.title || rec.id || '?'} — no "match" block`); return rec; }
    const hit = findPlace(pool, rec.match);
    /* `${zone}e` is an arrondissement and reads as "10e" in Paris and as
       "undefinede" in a city whose zones have names and whose records
       often do not name one at all. The zone is a hint for narrowing the
       search, not part of the record, so it is printed only when given. */
    if (!hit) {
      const where = [rec.match.zone == null ? null : City.zone.label(rec.match.zone),
                     rec.match.type].filter(Boolean).join(' ');
      missed.push(where ? `${rec.match.name} (${where})` : rec.match.name);
      return null;
    }
    resolved++;

    /* Hand-written fields win; the machine only fills in what it knows. */
    const { match, ...written } = rec;
    return {
      id: compactId(hit),
      title: hit.n,
      type: hit.c,
      zone: hit.a,
      coords: [hit.lat, hit.lon],
      area: hit.s || null,
      url: hit.w || null,
      cuisine: hit.k || null,
      categories: [['cafe','bakery','restaurant','market','deli'].includes(hit.c) ? 'food' : hit.c],
      match,
      ...written
    };
  }).filter(Boolean);

  const byArr = {}, byType = {};
  items.forEach(i => { byArr[i.zone] = (byArr[i.zone] || 0) + 1; byType[i.type] = (byType[i.type] || 0) + 1; });

  console.log(`\n  ${resolved} of ${doc.items.length} resolved against the discovery index`);
  if (ambiguous.length) {
    console.log(`\n  ${ambiguous.length} matched a name the city has more than one of — pin a zone:`);
    ambiguous.forEach(a => console.log('    ? ' + a));
  }
  if (Object.keys(byType).length) console.log('  by kind:', Object.entries(byType).map(([k, n]) => `${k}:${n}`).join(' '));
  if (Object.keys(byArr).length) console.log(`  per ${City.zone.one}:`, Object.entries(byArr)
    .sort((a, b) => a[0] - b[0]).map(([a, n]) => `${a}:${n}`).join(' '));

  if (missed.length) {
    console.log(`\n  ${missed.length} could not be matched and were dropped:`);
    missed.forEach(m => console.log('    ✗ ' + m));
    console.log('\n  Either the name is wrong, or OpenStreetMap has never heard of the place.');
    console.log('  The second happens more than you would think — newer independent shops');
    console.log('  are the weak spot. A handwritten note in notes.json is the way in.\n');
  } else {
    console.log('  every record matched a real place\n');
  }

  if (CHECK) { process.exit(missed.length ? 1 : 0); }

  doc.generated = new Date().toISOString().slice(0, 10);
  doc.items = items;
  await fs.writeFile(path.join(DATA, 'editorial.json'), JSON.stringify(doc, null, 1) + '\n', 'utf8');
  console.log('  wrote data/editorial.json\n');
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
