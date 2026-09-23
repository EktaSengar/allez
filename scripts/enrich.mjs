#!/usr/bin/env node
/* ---------------------------------------------------------
   enrich.mjs — fill in what the map knows about hand-written places.

   The curated files (places, nightlife, food) are written by a person,
   and a person writing about Ettan writes why it is worth booking, not
   its opening hours. The map usually has them. This looks each record up
   in OpenStreetMap and fills the fields that are empty — never one that
   was written by hand, which always wins.

   How a record is found, most certain first:
     1. an OSM id it already names — "osm way/132746454" in `coordsFrom`
        or `source`, put there when the place was confirmed to exist;
     2. the same name within 150 m in the weekly discovery index.
   A record that matches neither is left alone and listed, rather than
   matched on a guess.

   What it fills: `hours` (OSM `opening_hours`, the format js/hours.js
   reads) and `phone`. Each filled field records where it came from, so
   a later reader can tell the map's hours from somebody's.

   Usage:  HOMEGROUND_CITY=<city> node scripts/enrich.mjs [--dry]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDir, readDiscovered, loadRecord, City } from './shim.mjs';

const DATA = dataDir();
const DRY = process.argv.includes('--dry');
const UA = 'allez/1.0 (https://github.com/EktaSengar/allez)';
const FILES = ['places', 'nightlife', 'food'];
const DOORS = new Set(['cafe', 'bakery', 'restaurant', 'deli', 'dessert', 'market', 'bar', 'jazz',
                       'comedy', 'venue', 'club', 'nightlife', 'museum', 'gallery', 'books', 'shop', 'culture', 'class']);

const { Rec } = loadRecord();
const flat = Rec.flatten;
const km = (a, b) => {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b[0] - a[0]), dLon = r(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const osmRef = i => {
  const m = /\b(node|way|relation)\/(\d+)/.exec(`${i.coordsFrom || ''} ${i.source || ''}`);
  return m ? `${m[1]}/${m[2]}` : null;
};

async function overpassTags(refs) {
  if (!refs.length) return new Map();
  const by = { node: [], way: [], relation: [] };
  refs.forEach(r => { const [t, id] = r.split('/'); by[t].push(id); });
  const q = '[out:json][timeout:60];(' +
    Object.entries(by).filter(([, ids]) => ids.length).map(([t, ids]) => `${t}(id:${ids.join(',')});`).join('') +
    ');out tags;';
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const res = await fetch(host, { method: 'POST', headers: { 'user-agent': UA }, body: q, signal: AbortSignal.timeout(90000) });
      if (!res.ok) continue;
      const out = new Map();
      (await res.json()).elements.forEach(e => out.set(`${e.type}/${e.id}`, e.tags || {}));
      return out;
    } catch { /* the other mirror */ }
  }
  throw new Error('Overpass unreachable — nothing written');
}

async function run() {
  const disc = await readDiscovered();
  const index = disc.items || [];
  const docs = {};
  const todo = [];
  for (const f of FILES) {
    const file = path.join(DATA, f + '.json');
    let text;
    try { text = await fs.readFile(file, 'utf8'); } catch { continue; }
    const doc = JSON.parse(text);
    const indent = (/\n( +)"/.exec(text) || [, '  '])[1].length;
    docs[f] = { file, doc, indent };
    for (const i of doc.items || []) {
      if (!DOORS.has(i.type)) continue;
      if (i.hours && i.phone) continue;
      todo.push(i);
    }
  }

  const refs = [...new Set(todo.map(osmRef).filter(Boolean))];
  const tags = await overpassTags(refs);
  const today = new Date().toISOString().slice(0, 10);
  let filledHours = 0, filledPhone = 0;
  const unmatched = [];

  for (const i of todo) {
    let hours = null, phone = null, from = null;
    const ref = osmRef(i);
    if (ref && tags.has(ref)) {
      const t = tags.get(ref);
      hours = t.opening_hours || null; phone = t.phone || t['contact:phone'] || null; from = `openstreetmap ${ref}`;
    } else if (i.coords) {
      const want = flat(i.title);
      const hit = index.find(p => flat(p.n) === want && km([p.lat, p.lon], i.coords) < 0.15);
      if (hit) { hours = hit.oh || null; phone = hit.ph || null; from = 'openstreetmap (discovery index)'; }
    }
    if (!from) { unmatched.push(i.title); continue; }
    if (!i.hours && hours) { i.hours = hours.slice(0, 160); i.hoursFrom = from; i.hoursChecked = today; filledHours++; }
    if (!i.phone && phone) { i.phone = phone; filledPhone++; }
  }

  console.log(`\n${City.name} — ${todo.length} hand-written places missing hours or a phone`);
  console.log(`  looked up ${refs.length} by OSM id; filled hours on ${filledHours}, phone on ${filledPhone}`);
  if (unmatched.length) console.log(`  no map entry found for ${unmatched.length}: ${unmatched.slice(0, 12).join(', ')}${unmatched.length > 12 ? '…' : ''}`);

  if (DRY) { console.log('  --dry, nothing written\n'); return; }
  for (const { file, doc, indent } of Object.values(docs)) {
    await fs.writeFile(file, JSON.stringify(doc, null, indent) + '\n', 'utf8');
  }
  console.log('');
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
