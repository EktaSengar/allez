#!/usr/bin/env node
/* ---------------------------------------------------------
   shard.mjs — split the discovery index by arrondissement.

   22,635 places is 3.3 MB of JSON, and every visitor fetched all of it
   before the page could say anything — including the nineteen
   arrondissements they were not standing in.

   Worth being accurate about the cost, because the raw number overstates
   it: Pages serves this gzipped, so the wire cost is 778 KB rather than
   3.3 MB. Still the largest thing the site asks for by a wide margin,
   still ahead of the first paint, and still mostly irrelevant to the
   question being asked.

   So the index is written as twenty files and the browser fetches the
   ones it needs first — about 150 KB compressed — paints, and then pulls
   the rest in the background. What it must never do is *stay* partial:
   a section quietly returning fewer results because a file has not
   arrived is the same class of bug as location not reaching retrieval,
   and it would not look like a bug. See the note in js/app.js.

   Only the `found` layer is split. The tiers that carry judgement are
   small and every one of them is needed city-wide — `beyond()` answers
   "worth the trip" from them and would be wrong with a partial file.

   Usage:  node scripts/shard.mjs [--dry]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY  = process.argv.includes('--dry');

/* There is no default directory, and that is the whole point.

   Writing used to default to Paris, and a Bengaluru discovery run
   therefore wrote seven thousand Bengaluru places into Paris's shard
   directory and deleted all twenty of Paris's on the way. `shard()` was
   given a required directory; `readShards()` was not, and kept the same
   default — so reading was still wrong in exactly the way writing had
   been, only silently.

   What that cost: `editorial.mjs`, `draft.mjs`, `check-hours.mjs` and
   `check-location.mjs` all call it with no argument. Every one of them
   read Paris no matter which city it had been told to build, which is
   why a Bay Area editorial record could never resolve — it was being
   matched against the Paris index — and `discover.mjs --only` would have
   spliced Paris places into another city's shards.

   A missing directory is now an error rather than a guess. */
const needDir = dir => {
  if (!dir) throw new Error(
    'shard.mjs: a directory is required — pass <city>/data/places. ' +
    'There is no default; see the note at the top of this file.');
  return dir;
};

/* Places with no zone — a handful, on the edge of the bbox — go here
   rather than being dropped. Loaded with the first batch. */
const ORPHANS = 'x';

/* One file per zone works while a city has twenty of them. Delhi has
   267 colonies, which came out as 194 shard files holding 99 KB between
   them: nine times Paris's request count for an eighth of its data, and
   a first batch of four covering a fraction of the ground it covers in
   Paris.

   So the shard key stops being the zone. Above this many zones, records
   are bucketed into a grid over the city's bounding box instead, sized
   so the file count lands near Paris's. A record keeps its own `a` for
   display — only the grouping changes, and nothing downstream reads the
   shard key for anything but "which file is this in". */
const MAX_SHARDS = 24;

/* Each shard carries its own centroid now. It used to be looked up from
   the zone table by number, which silently did nothing for a city whose
   zone keys are names — `shardOrder()` returned -1 for every one of
   them and the "nearest first" ordering was not ordering at all. */
function centroidOf(items) {
  let la = 0, lo = 0, n = 0;
  for (const p of items) {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) { la += p.lat; lo += p.lon; n++; }
  }
  return n ? [+(la / n).toFixed(5), +(lo / n).toFixed(5)] : null;
}

export async function shard(doc, outDir, opts = {}) {
  needDir(outDir);
  const { zones = null, bbox = null, max = MAX_SHARDS } = opts;

  /* Passed in rather than imported, because shim.mjs already imports
     this file and a cycle between the two is not worth the tidiness. */
  const zoneCount = zones ? Object.keys(zones).length : 0;
  const grid = zoneCount > max && bbox ? gridder(bbox, max) : null;

  const by = new Map();
  for (const p of doc.items) {
    const key = grid ? grid(p) : (p.a ? String(p.a) : ORPHANS);
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(p);
  }

  const shards = {};
  for (const [key, items] of by) {
    /* Prefer the city's own centroid for that zone where there is one,
       so a city that was already sharding by zone keeps the exact
       ordering it had. Otherwise the mean of what is in the file. */
    const own = zones && zones[key];
    /* `b` is the file's own size. The first batch used to be a count of
       four shards, which only means anything while shards are a uniform
       size — and bucketing made them anything but. Records are a poor
       stand-in too: Paris averages 36 bytes a record gzipped and Delhi
       25, so a record budget over-fetches by nearly half in one city to
       be right in the other. Bytes are what actually cost, so bytes are
       what the budget counts. */
    const body = JSON.stringify({ a: key, items }) + '\n';
    shards[key] = { n: items.length, b: Buffer.byteLength(body), c: own || centroidOf(items) };
  }

  const manifest = {
    generated: doc.generated,
    source: doc.source,
    note: doc.note,
    counts: doc.counts,
    shards
  };

  if (DRY) return { manifest, by };

  await fs.mkdir(outDir, { recursive: true });
  /* Clear first: a zone that empties out between runs must not leave
     last week's file behind for the browser to find.

     Read the directory being written, not the default one. Reading OUT
     here while writing outDir listed one city's shards and unlinked
     those names from another's — which fails loudly in one direction
     and deletes the wrong city's data in the other. */
  for (const f of await fs.readdir(outDir).catch(() => [])) {
    if (f.endsWith('.json')) await fs.unlink(path.join(outDir, f));
  }

  for (const [key, items] of by) {
    await fs.writeFile(path.join(outDir, `${key}.json`),
      JSON.stringify({ a: key, items }) + '\n', 'utf8');
  }
  await fs.writeFile(path.join(outDir, 'index.json'),
    JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  return { manifest, by };
}

/* Read every shard back as one document — for the Node scripts, which
   have no reason to care that the browser fetches it in pieces. */
/* A square-ish grid over the bounding box, with as many cells as will
   fit under the cap. Deterministic and boring on purpose: a clustering
   pass would group more evenly and would also mean a record could change
   file because a different record moved, which makes every rebuild a
   bigger diff than it needs to be. */
function gridder(bbox, max) {
  const [s, w, n, e] = String(bbox).split(',').map(Number);
  const side = Math.max(1, Math.floor(Math.sqrt(max)));
  const dLat = (n - s) / side, dLon = (e - w) / side;
  return p => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return ORPHANS;
    const r = Math.min(side - 1, Math.max(0, Math.floor((p.lat - s) / dLat)));
    const c = Math.min(side - 1, Math.max(0, Math.floor((p.lon - w) / dLon)));
    return `g${r}${c}`;
  };
}

export async function readShards(outDir) {
  needDir(outDir);
  const manifest = JSON.parse(await fs.readFile(path.join(outDir, 'index.json'), 'utf8'));
  const items = [];
  for (const key of Object.keys(manifest.shards)) {
    const doc = JSON.parse(await fs.readFile(path.join(outDir, `${key}.json`), 'utf8'));
    items.push(...doc.items);
  }
  return { ...manifest, items };
}

/* This file used to be runnable on its own, to split a city's
   `data/discovered.json` into shards and then delete it. That migration
   has happened in all four cities and none of them has the file any
   more, so the block read a path that cannot exist, passed no directory
   to `shard()`, and referred to an `outDir` that was never in scope.

   `discover.mjs` writes the shards now, and it is the only thing that
   should. Nothing here runs by itself. */
