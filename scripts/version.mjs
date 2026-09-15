#!/usr/bin/env node
/* ---------------------------------------------------------
   version.mjs — content-hash the CSS and JS links in index.html.

   Why this exists: GitHub Pages serves assets with `cache-control:
   max-age=600`. Deploy a change and, for the next ten minutes, a returning
   browser happily pairs the NEW index.html with the OLD cached style.css
   and app.js. The result is a page that is half one version and half
   another — tabs with no spacing, views that render "nothing here"
   because the cached script has never heard of them.

   Stamping each asset with a hash of its own contents means a changed file
   gets a new URL, so it can never be answered from a stale cache, while an
   unchanged file keeps its URL and stays cached.

   The data files have exactly the same problem and, until recently, a
   worse answer: the page asked for all thirty-seven of them with
   `cache: 'no-cache'`, spending a round trip per file, on every visit, to
   be told nothing had changed. So they are hashed too — not into their
   own href, since nothing in the HTML links to them, but into a
   `window.__DV` map the page reads when it builds each data URL. Same
   guarantee, same mechanism: a changed file is unreachable from any
   cache, and an unchanged one costs no network at all.

   Usage:  node scripts/version.mjs [--city ID] [--all] [--check]
           --all    every city, which is almost always what you want —
                    js/ and css/ are shared, so a change to app.js
                    leaves every other city's page pointing at a hash
                    that no longer exists
           --check  exit non-zero if the stamps are out of date (for CI)
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

/* Which city's page to stamp. Every city is a directory at the repo
   root, which is what the domain serves as allez.city/<city>. */
const i = process.argv.indexOf('--city');
const ALL = process.argv.includes('--all');
const CITY = i === -1 ? 'paris' : process.argv[i + 1];
const HTML = path.join(ROOT, CITY, 'index.html');
const DATA_DIR = path.join(ROOT, CITY, 'data');
const HTML_DIR = path.dirname(HTML);

const hash = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);

/* Any local css or js the page links, with or without an existing ?v=.
   Deliberately not anchored to a directory: Paris links `js/app.js` from
   the root, a city pack links `../../js/app.js` and its own `city.js`
   from two levels down, and both have the same staleness problem. Paths
   that start with a scheme or `//` are somebody else's file. */
const ASSET = /(href|src)="(?!https?:|\/\/)([^"?]+\.(?:css|js))(\?v=[^"]*)?"/g;

/* The one line in index.html that carries the data hashes. Rewritten
   whole each run, so the map cannot drift from what is on disk. */
const DV_LINE = /^(\s*)window\.__DV = .*;$/m;

/* Every .json under data/, including the twenty shards, keyed the way the
   page asks for them: "civic", "places/index", "places/11". */
async function dataVersions() {
  const base = DATA_DIR;
  const names = [];
  for (const e of await fs.readdir(base, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.json')) names.push(e.name.slice(0, -5));
    else if (e.isDirectory()) {
      for (const f of await fs.readdir(path.join(base, e.name))) {
        if (f.endsWith('.json')) names.push(`${e.name}/${f.slice(0, -5)}`);
      }
    }
  }
  names.sort();
  const map = {};
  for (const n of names) map[n] = hash(await fs.readFile(path.join(base, `${n}.json`)));
  return map;
}

async function run() {
  const original = await fs.readFile(HTML, 'utf8');
  const missing = [];
  const stamped = [];

  const replacements = [];
  for (const m of original.matchAll(ASSET)) {
    const [full, attr, file] = m;
    /* Relative to the page that links it, not to the repo root. */
    const abs = path.resolve(HTML_DIR, file);
    try {
      const h = hash(await fs.readFile(abs));
      replacements.push([full, `${attr}="${file}?v=${h}"`]);
      stamped.push(`${file} → ${h}`);
    } catch (e) {
      missing.push(file);
    }
  }

  let out = original;
  replacements.forEach(([from, to]) => { out = out.replace(from, to); });

  const dv = await dataVersions();
  if (!DV_LINE.test(out)) {
    console.error('index.html has no `window.__DV = ...;` line to stamp.');
    process.exit(1);
  }
  out = out.replace(DV_LINE, (_, indent) => `${indent}window.__DV = ${JSON.stringify(dv)};`);
  stamped.push(`data/*.json → ${Object.keys(dv).length} hashes`);

  if (missing.length) {
    console.error('Referenced but not found:');
    missing.forEach(f => console.error(`  ✗ ${f}`));
    process.exit(1);
  }

  if (out === original) {
    console.log(`${CITY}: asset stamps already current (${stamped.length} files).`);
    return;
  }

  if (CHECK) {
    console.error(`Asset stamps are out of date. Run: node scripts/version.mjs${CITY === 'paris' ? '' : ' --city ' + CITY}`);
    stamped.forEach(s => console.error(`  · ${s}`));
    process.exit(1);
  }

  await fs.writeFile(HTML, out, 'utf8');
  console.log(`Stamped (${CITY}):`);
  stamped.forEach(s => console.log(`  ✓ ${s}`));
}

/* Every city, which is almost always what you want: the js/ and css/
   files are shared, so a change to app.js leaves three of four pages
   pointing at a hash that no longer exists. Stamping one city and
   forgetting the rest is the easiest mistake in this repo to make, and
   `--check` only tells you afterwards. */
async function everyCity() {
  const dirs = await fs.readdir(ROOT, { withFileTypes: true });
  const found = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    try { await fs.access(path.join(ROOT, d.name, 'city.js')); found.push(d.name); } catch {}
  }
  const ids = ['paris', ...found.filter(n => n !== 'paris').sort()];
  let failed = 0;
  for (const id of ids) {
    const r = await new Promise(res => {
      const p = spawn(process.execPath, [fileURLToPath(import.meta.url),
        '--city', id, ...(CHECK ? ['--check'] : [])],
        { stdio: 'inherit' });
      p.on('close', res);
    });
    if (r) failed++;
  }
  if (failed) process.exit(1);
}

if (ALL) everyCity().catch(e => { console.error(e); process.exit(1); });
else run().catch(e => { console.error(e); process.exit(1); });
