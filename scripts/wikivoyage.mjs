#!/usr/bin/env node
/* ---------------------------------------------------------
   wikivoyage.mjs — where to eat, from people who wrote it down.

   Every other source this site reads is silent on the question India
   most needs answered. Wikidata holds two restaurants in Delhi and no
   cafés; no government portal in India describes food at all; Zomato
   closed its public API. Wikivoyage is the exception, measured on
   21 September 2026:

     Delhi       1,159 listings across 51 pages, 762 with coordinates,
                 227 of them eat or drink, 83 more than a sentence long
     Bangalore     492 listings across 11 pages, 232 with coordinates,
                 182 eat or drink, 77 more than a sentence long

   and edited within the month. Keyless, through the MediaWiki API.

   What it is not, stated so nobody expects it: a critic. Listings are
   written for travellers, unevenly, and "Italian style food." is a
   real entry. So only listings with a position *and* more than a line
   of text are kept, and they land in the `sourced` tier beside the
   Wikipedia records — somebody wrote it down and a link says where,
   which is a fact, not an opinion of ours.

   Licence: CC BY-SA 4.0, the same as the Wikipedia text notable.json
   already carries. Every record keeps its page link as attribution.

   It APPENDS to notable.json and removes its own previous records
   first, so it is idempotent — but notable.mjs rewrites that file
   whole, so this must run after it. The workflow does.

   Usage:  HOMEGROUND_CITY=<city> node scripts/wikivoyage.mjs [--dry]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDir, City, zoneFinder } from './shim.mjs';

const DATA = dataDir();
const DRY  = process.argv.includes('--dry');
const UA   = 'allez/1.0 (https://github.com/EktaSengar/allez)';
const API  = 'https://en.wikivoyage.org/w/api.php';
const ROOTS = City.wikivoyage || [];

/* Inside the box *and* near a zone. zoneFinder alone is not a test of
   being in the city: a pack that declares no `limitKm` gets the nearest
   zone for any point on earth, and the first run of this filed a café
   in Denbigh, in Wales, and a raspberry farm in Tasmania under Delhi
   colonies. practices.mjs had already learned this and this file should
   have borrowed it rather than rediscovering it. */
const zoneOf = zoneFinder(City);
const [BOX_S, BOX_W, BOX_N, BOX_E] = String(City.bbox).split(',').map(Number);
const inCity = (lat, lon) =>
  lat >= BOX_S && lat <= BOX_N && lon >= BOX_W && lon <= BOX_E && zoneOf(lat, lon) != null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Enough of a MediaWiki reader to turn a listing's text into a
   sentence: links keep their label, emphasis and templates go. */
const plain = s => String(s || '')
  .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
  .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1')
  .replace(/\{\{[^}]*\}\}/g, '')
  .replace(/'{2,}/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/^[\s–—-]+/, '')
  .trim();

const field = (body, key) => {
  const m = new RegExp('\\|\\s*' + key + '\\s*=\\s*([^|]*)', 'i').exec('|' + body);
  return m ? m[1].trim() : '';
};

/* Which of the site's categories a listing belongs in, read off the
   *name* first. The first version read the description as well, and a
   sample of twenty showed why that is wrong: "Jayanagar Shopping
   Complex" became a bakery because its entry mentions Iyengar bakeries
   in passing, and Anokhi — a clothes shop — became a market because it
   is in one. A description is evidence about a place; the name is the
   place.

   `buy` listings are shops, and the site's `market` means food, flea
   and flower. So a buy listing is kept only if its name says market and
   its text says it sells something to eat or grow — which is what
   keeps Nehru Place, an IT hardware complex, and Bhagirath Palace,
   wholesale electricals, out of a section about markets. */
const BAKERY = /\b(bakery|bakers|patisserie|p[aâ]tisserie|pastry|cake|confection|mithai|sweets?|halwai)\b/i;
const CAFE   = /\b(caf[eé]|coffee|tea ?(house|room|stall|bar)|chai|espresso|roasters?)\b/i;
const MARKET_NAME = /\b(market|bazaar|bazar|haat|mandi)\b/i;
const FOOD_TEXT   = /\b(food|vegetables?|fruits?|flowers?|spices?|produce|fish|meat|grocer(y|ies)|snacks?|street food|chaat)\b/i;

function kindOf(type, name, text) {
  if (type === 'buy') return MARKET_NAME.test(name) && FOOD_TEXT.test(text) ? 'market' : null;
  if (BAKERY.test(name)) return 'bakery';
  if (CAFE.test(name)) return 'cafe';
  if (type === 'drink') return CAFE.test(text) ? 'cafe' : 'nightlife';
  return 'restaurant';
}

/* A line of text is a mention; two are a description. Below this the
   listing says less than the name does. */
const MIN_TEXT = 90;

async function get(params) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API}?${new URLSearchParams({ format: 'json', ...params })}`,
        { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
      if (res.status === 429 || res.status >= 500) { await sleep(3000 * (attempt + 1)); continue; }
      return await res.json();
    } catch { await sleep(2000); }
  }
  throw new Error('Wikivoyage unreachable');
}

/* `prefixsearch` is the search box's typeahead, not a prefix match: it
   is fuzzy, and asked for "Delhi/" it also returned pages about
   somewhere in Wales. `allpages` with `apprefix` is the strict one. */
async function pagesUnder(root) {
  const r = await get({ action: 'query', list: 'allpages', apprefix: `${root}/`, aplimit: '200' });
  return [root, ...(r.query?.allpages || []).map(p => p.title).filter(t => t.startsWith(`${root}/`))];
}

async function run() {
  if (!ROOTS.length) { console.log(`\n${City.name} declares no Wikivoyage pages — nothing to do.\n`); return; }
  console.log(`\n${City.name} — Wikivoyage: ${ROOTS.join(', ')}\n`);

  const file = path.join(DATA, 'notable.json');
  const doc = JSON.parse(await fs.readFile(file, 'utf8'));
  const kept = (doc.items || []).filter(r => r.src !== 'Wikivoyage');

  const steps = { listings: 0, typed: 0, placed: 0, inCity: 0, described: 0 };
  const out = [];
  const seen = new Set();

  for (const root of ROOTS) {
    const pages = await pagesUnder(root);
    for (const page of pages) {
      const d = await get({ action: 'parse', page, prop: 'wikitext' });
      const text = d.parse?.wikitext?.['*'] || '';
      for (const m of text.matchAll(/\{\{\s*(eat|drink|buy)\s*\|([\s\S]*?)\}\}/gi)) {
        steps.listings++;
        const type = m[1].toLowerCase(), body = m[2];
        const name = plain(field(body, 'name'));
        const about = plain(field(body, 'content'));
        const c = kindOf(type, name, about);
        if (!name || !c) continue;
        steps.typed++;
        const lat = Number(field(body, 'lat')), lon = Number(field(body, 'long'));
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !lat || !lon) continue;
        steps.placed++;
        if (!inCity(lat, lon)) continue;
        const a = zoneOf(lat, lon);
        steps.inCity++;
        if (about.length < MIN_TEXT) continue;
        steps.described++;

        const key = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        out.push({
          n: name.slice(0, 70),
          c,
          lat: +lat.toFixed(5),
          lon: +lon.toFixed(5),
          a,
          why: about.slice(0, 340),
          w: `https://en.wikivoyage.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`,
          src: 'Wikivoyage',
          /* A travel guide's listing is a mention, not a distinction —
             below Wikipedia's 4, and the everyday sections will still
             rank it above a bare name on a map, which is the point. */
          q: 3,
          u: 3
        });
      }
      await sleep(250);
    }
  }

  console.log(`  ${String(steps.listings).padStart(5)}  eat, drink and buy listings`);
  console.log(`  ${String(steps.typed).padStart(5)}  in a category the site has`);
  console.log(`  ${String(steps.placed).padStart(5)}  with a position`);
  console.log(`  ${String(steps.inCity).padStart(5)}  inside the city`);
  console.log(`  ${String(steps.described).padStart(5)}  described in more than a line`);
  const by = {}; out.forEach(r => { by[r.c] = (by[r.c] || 0) + 1; });
  console.log(`\n  ${out.length} kept · ${Object.entries(by).map(([k, n]) => `${k}:${n}`).join(' ')}`);

  if (DRY) { console.log('\n  --dry, nothing written\n'); return; }
  if (!out.length) { console.log('\n  nothing came back — leaving notable.json exactly as it was\n'); return; }

  doc.items = kept.concat(out);
  doc.source = String(doc.source || '').includes('Wikivoyage')
    ? doc.source : `${doc.source} · Wikivoyage (CC BY-SA 4.0)`;
  await fs.writeFile(file, JSON.stringify(doc) + '\n', 'utf8');
  console.log(`\n  notable.json — ${kept.length} Wikidata + ${out.length} Wikivoyage\n`);
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
