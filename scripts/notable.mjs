#!/usr/bin/env node
/* ---------------------------------------------------------
   notable.mjs — the places that are a matter of record.

   Between "somebody went and wrote it up" and "a name on a map" sits a
   third kind of place: one with a verifiable distinction. An article, a
   heritage listing, a date of founding. Not an opinion, but far more
   than a position.

   Three keyless sources, in order:

     Wikidata SPARQL   which of the city's places have an entry at all
     Wikipedia REST    a factual sentence about each one
     Pageviews API     how famous — which is not the same as how good

   That last one is the important one, and it is why this script is more
   careful than it looks. A pure notability signal recommends Le Procope
   and La Tour d'Argent: places that are genuinely notable and genuinely
   not where you want to be sent for coffee. Monthly pageviews separate
   the landmark from the local place that happens to have an article, and
   landmarks get flagged so the everyday sections push them down while
   Culture and "Worth the trip" can still use them.

   Nothing here writes an opinion. Every record carries its source and
   the date it was checked, and lands in the `sourced` tier.

   Usage:  node scripts/notable.mjs [--dry] [--limit N]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDir, City, zoneFinder } from './shim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = dataDir();
const DRY  = process.argv.includes('--dry');
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i === -1 ? 0 : Number(process.argv[i + 1]); })();
const UA = 'allez/1.0 (https://github.com/EktaSengar/allez)';

/* Wikidata classes worth having, mapped onto the site's own categories.
   Kept deliberately short: this is the layer that risks turning a
   neighbourhood guide into a sightseeing list, so it takes the kinds of
   place the site already has sections for and nothing else. */
const CLASSES = [
  ['wd:Q30022',   'cafe'],        // café
  ['wd:Q11707',   'restaurant'],  // restaurant
  ['wd:Q2360219', 'restaurant'],  // bistro
  ['wd:Q7075',    'books'],       // library
  ['wd:Q1367454', 'books'],       // bookshop
  ['wd:Q33506',   'museum'],      // museum
  ['wd:Q207694',  'museum'],      // art museum
  ['wd:Q187456',  'nightlife'],   // bar — Q22687, which sat here, is `bank`
  ['wd:Q41253',   'culture'],     // movie theatre
  ['wd:Q24354',   'culture'],     // theatre
  ['wd:Q22698',   'park'],        // park
  ['wd:Q483110',  'sport'],       // stadium
  ['wd:Q2143825', 'bakery'],      // pastry shop
  ['wd:Q274393',  'bakery']       // bakery
].concat(City.notable?.classes || []);

/* A pack may add to that list, and two of them have to.

   The list above is what Wikidata knows about a European city, and it
   was written against Paris. Asked about Bengaluru it returns almost
   nothing — measured on 18 September 2026, the whole bounding box holds
   791 hotels, 483 petrol stations and 210 HDFC Bank branches, against
   three cafés. The classes the site asks for barely exist there, which
   is why Bengaluru had 31 records and Delhi 81 where Paris has 838.

   What those cities do have is a different vocabulary of destination:
   Delhi's is 59 tombs, 41 mosques, 17 gurdwaras; Bengaluru's is 31
   temples and 22 lakes, the lakes being what it has instead of parks.
   None of that is exotic — it is simply what somebody there would tell
   you to go and see, and the pack is where a city says what it is. */

/* P576 is the date a thing stopped existing. Without this filter the
   query cheerfully returns a hippodrome demolished in 1900, and the site
   recommends an empty plot of land. */
/* This asked `wdt:P131* wd:Q90` until the packs arrived — everything
   administratively inside Paris. That shape cannot express every pack we
   have: `P131*` descends from one authority, and the Bay Area pack is two
   of them, San Francisco and Palo Alto, forty miles apart. A box has no
   such trouble, it is what photos.mjs already asks, and the boundary it
   draws — where a resident would say the city stops — is arguably the
   better one for a guide anyway.

   Unpadded, unlike photos.mjs. A photograph landing slightly outside the
   line costs nothing, because matching there is by exact coordinate and a
   stray row simply never matches. These rows become recommendations, and
   recommending somewhere well outside the city is a worse failure than
   missing it. */
const [BOX_S, BOX_W, BOX_N, BOX_E] = String(City.bbox).split(',').map(Number);
const corner = (lon, lat) => `"Point(${lon.toFixed(3)} ${lat.toFixed(3)})"^^geo:wktLiteral`;

/* English first, then whatever the city actually labels things in. */
const LABEL_LANG = ['en', City.notable?.lang].filter(Boolean).join(',');

const SPARQL = `
SELECT ?item ?itemLabel ?desc ?cls ?coord ?article ?heritage ?inception WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerWest ${corner(BOX_W, BOX_S)} .
    bd:serviceParam wikibase:cornerEast ${corner(BOX_E, BOX_N)} .
  }
  ?item wdt:P31/wdt:P279* ?cls .
  VALUES ?cls { ${[...new Set(CLASSES.map(c => c[0]))].join(' ')} }
  FILTER NOT EXISTS { ?item wdt:P576 ?dissolved }
  FILTER NOT EXISTS { ?item wdt:P582 ?ended }
  OPTIONAL { ?item wdt:P1435 ?heritage }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "en") }
  OPTIONAL {
    ?article schema:about ?item ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "${LABEL_LANG}". }
}`;

const CAT_OF = Object.fromEntries(CLASSES.map(([q, c]) => [q.replace('wd:', ''), c]));

/* Nearest centroid, not point-in-polygon: good enough to print next to a
   name, never used for distance. Literally the same rule as
   discover.mjs now rather than merely the same idea — both call
   `zoneFinder`, so a notable record and a discovered one on the same
   street cannot disagree about where they are.

   The table used to be written out here, and it was the twenty Paris
   arrondissements — identical, key for key, to what `paris/city.js`
   already declared as `zone.grid`. Reading the pack instead changes
   nothing for Paris and stops the other three cities being told they are
   in the 12th.

   It answers `null` where the pack declares `zone.limitKm` and the point
   is further than that from every centroid, which is how the Bay Area
   says that a rectangle reaching Mountain View also reaches Oakland and
   it did not mean to. */
const nearestArr = zoneFinder(City);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, opts = {}, attempt = 0) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, ...(opts.headers || {}) },
      signal: AbortSignal.timeout(opts.timeout || 60000)
    });
    if (res.status === 429 || res.status >= 500) {
      /* Wikipedia says how long to wait when it is being throttled, and
         guessing instead is how a run gets itself banned rather than
         merely delayed. */
      const after = Number(res.headers.get('retry-after'));
      const e = new Error(String(res.status));
      e.retryAfter = Number.isFinite(after) && after > 0 ? after * 1000 : null;
      throw e;
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch (e) {
    /* Was 2s/4s/6s, which is not a backoff so much as three more ways to
       be told 429. Exponential, and honour the header when there is one. */
    if (attempt < 4) {
      await sleep(e.retryAfter ?? 1500 * 2 ** attempt);
      return get(url, opts, attempt + 1);
    }
    throw e;
  }
}

/* ---------- 1. who exists ---------- */

async function fromWikidata() {
  process.stdout.write('  Wikidata… ');
  const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(SPARQL);
  const body = await get(url, { headers: { Accept: 'application/sparql-results+json' }, timeout: 120000 });

  const byId = new Map();
  for (const b of body.results.bindings) {
    const qid = b.item.value.split('/').pop();
    const label = b.itemLabel?.value || '';
    if (!label || /^Q\d+$/.test(label)) continue;             // unlabelled
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord?.value || '');
    if (!m) continue;
    const lon = +m[1], lat = +m[2];
    const cat = CAT_OF[b.cls.value.split('/').pop()];
    if (!cat) continue;

    const prev = byId.get(qid);
    byId.set(qid, {
      qid, name: label, lat, lon, cat: prev?.cat || cat,
      desc: b.desc?.value || prev?.desc || null,
      article: b.article?.value ? decodeURIComponent(b.article.value.split('/wiki/').pop()) : (prev?.article || null),
      heritage: !!(b.heritage?.value) || prev?.heritage || false,
      inception: b.inception?.value?.slice(0, 4) || prev?.inception || null
    });
  }
  console.log(`${byId.size} places`);
  return [...byId.values()];
}

/* ---------- 2. what is true about them ---------- */

async function summaries(list) {
  process.stdout.write('  Wikipedia summaries… ');
  let done = 0, tried = 0, failed = 0;
  for (const p of list) {
    if (!p.article) continue;
    tried++;
    let d = null;
    try {
      d = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.article)}`);
    } catch {
      /* One article that will not load is not a reason to throw away the
         other fourteen hundred — the record still has its Wikidata
         description to fall back on. A *lot* of them failing is different,
         and the check after this loop is where that becomes fatal. */
      failed++;
    }
    if (d && d.extract) {
      /* The first sentence or two — enough to say what the place is and
         why anybody wrote it down, and no more. */
      /* Splitting on every full stop turned "a 2.6-acre square" into
         "a 2." and "former U.S. Army post" into "former U. S.". Both
         shipped, and both read as a broken site rather than a terse one.

         A sentence ends when the stop follows a word or a closing bracket
         and the next thing is a capital: that leaves the decimal alone,
         because nothing there is a space, and leaves "U.S." alone,
         because the character before the stop is itself a capital. */
      const flat = d.extract.replace(/\s+/g, ' ').trim();
      const sentences = flat.split(/(?<=[a-z0-9)\]'"])[.!?]+\s+(?=[A-Z("'])/)
                            .filter(Boolean);
      const two = sentences.slice(0, 2).join('. ').trim();
      p.extract = (/[.!?]$/.test(two) ? two : two + '.').slice(0, 300);
      p.thumb = d.thumbnail?.source || null;
    }
    if (++done % 40 === 0) process.stdout.write('.');
    /* 60ms was ~16 requests a second, which was survivable when the query
       was Paris-only and is not now the box returns half again as many
       candidates per city. */
    await sleep(150);
  }
  /* Degrading quietly to "no city has any descriptions this week" is the
     one outcome worse than stopping, because the site would render it. */
  if (failed > 20 && failed > tried * 0.1)
    throw new Error(`Wikipedia refused ${failed} of ${tried} summaries — stopping rather than shipping a thin file`);
  console.log(` ${list.filter(p => p.extract).length} with text` +
              (failed ? ` (${failed} of ${tried} failed)` : ''));
}

/* ---------- 3. famous, or good? ---------- */

/* Above this many views a month, a place is a landmark rather than a
   local secret. Tuned against known cases: Le Procope ~2.4k, Berthillon
   ~0.4k. The point is not precision — it is keeping coach parties out of
   the coffee section. */
const LANDMARK_VIEWS = 1500;

async function fame(list) {
  process.stdout.write('  pageviews… ');
  const to = new Date(), from = new Date(to.getTime() - 180 * 86400000);
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '') + '00';
  let done = 0;
  for (const p of list) {
    if (!p.article) continue;
    const url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia'
      + `/all-access/user/${encodeURIComponent(p.article)}/monthly/${fmt(from)}/${fmt(to)}`;
    const d = await get(url).catch(() => null);
    const items = d?.items || [];
    if (items.length) p.views = Math.round(items.reduce((a, x) => a + x.views, 0) / items.length);
    if (++done % 40 === 0) process.stdout.write('.');
    await sleep(60);
  }
  const flagged = list.filter(p => (p.views || 0) >= LANDMARK_VIEWS).length;
  console.log(` ${flagged} flagged as landmarks`);
}

/* ---------- assemble ---------- */

/* Wikidata labels a lot of listed buildings by what the heritage
   register recorded, which is an address or a trade rather than a name.
   "34 avenue de Choisy, Paris" and "boulangerie-pâtisserie-confiserie"
   are both perfectly good database keys and useless things to send
   somebody to for breakfast.

   Rejecting these is not tidying. A recommendation whose name is a
   street address tells the reader nothing and makes the whole list look
   automated, which is exactly what it must not look like. */

/* The vocabulary is the city's, not the script's.

   These lists were written out here when there was one city, and they are
   French: `rue`, `boulangerie`. Handing them to Delhi would filter nothing
   while appearing to filter something, which is the worse failure of the
   two. So a pack that has not declared its own gets no vocabulary test
   rather than somebody else's — the leading-digit and "…, <city>" tests
   below still do real work on every city, and a pack with no list is a gap
   somebody can fill rather than a wrong answer already shipped. */
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const STREET  = City.notable?.street || '';
const GENERIC = new Set(City.notable?.generic || []);

const RE_ADDRESS  = STREET ? new RegExp(`^(${STREET})\\s`, 'i') : null;
const RE_HOUSE_NO = STREET ? new RegExp(`,\\s*\\d+\\s*(${STREET})\\b`, 'i') : null;
const RE_IN_CITY  = new RegExp(`,\\s*${esc(City.name)}\\b`, 'i');

/* Wikidata's one-line description is often just category plus location,
   which reads as a fact and carries nothing. The trailing group used to be
   `,\s*france`; any region works now, so Ile-de-France and Karnataka are
   caught by the rule that caught France. */
const PLACES = [City.name, ...(City.notable?.places || [])].filter(Boolean).map(esc).join('|');
const RE_BARE_LOCATION = new RegExp(
  `^(a |an )?[\\w\\s'’-]{0,34}\\s+in\\s+(${PLACES})(,\\s*[\\w\\s'’-]+)?\\.?$`, 'i');

function unusableName(raw) {
  const n = (raw || '').trim();
  if (!n || n.length < 3) return true;
  if (/^\d/.test(n)) return true;                                  // "34 avenue de Choisy"
  if (RE_IN_CITY.test(n)) return true;                             // "…, Paris"
  if (RE_ADDRESS && RE_ADDRESS.test(n)) return true;               // "rue de …"
  if (RE_HOUSE_NO && RE_HOUSE_NO.test(n)) return true;             // "Boulangerie, 16 rue …"
  const flat = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[-–—&]/g, ' ').replace(/\s+/g, ' ').trim();
  return GENERIC.has(flat);
}

function toRecord(p) {
  if (unusableName(p.name)) return null;
  const bits = [];
  if (p.extract) bits.push(p.extract);
  else {
    /* No article — say the little we do know rather than nothing, and
       nothing rather than something invented. */
    if (p.desc) bits.push(p.desc[0].toUpperCase() + p.desc.slice(1) + '.');
    if (p.heritage) bits.push('A listed building.');
    if (p.inception) bits.push(`Established ${p.inception}.`);
    if (!bits.length) return null;
  }
  if (p.heritage && p.extract && !/listed|monument historique|heritage/i.test(p.extract))
    bits.push('A listed building.');

  const why = bits.join(' ').slice(0, 340);

  /* "Cafe in Paris, France." is a true sentence that tells the reader
     nothing, and a card carrying it is a database row wearing a
     recommendation's clothes. If the only thing we can say about a place
     is its own category, it has no distinction — so it is not in this
     tier. It stays in the map layer, where a bare name is honest. */
  if (RE_BARE_LOCATION.test(why.trim())) return null;

  /* Further from every zone than the pack allows is not in this city,
     however comfortably it sits inside the bounding box. Wikidata is
     where this hurt most: a box drawn from San Francisco to Mountain
     View also contains Oakland and Berkeley, and 387 of the Bay Area's
     1,496 records came from there — each stamped with the nearest zone
     on the far side of the water. */
  const a = nearestArr(p.lat, p.lon);
  if (a == null && City.zone.limitKm != null) return null;

  return {
    n: p.name.slice(0, 70),
    c: p.cat,
    lat: +p.lat.toFixed(5),
    lon: +p.lon.toFixed(5),
    a,
    why,
    w: p.article ? `https://en.wikipedia.org/wiki/${encodeURIComponent(p.article)}` : null,
    src: p.article ? 'Wikipedia' : 'Wikidata',
    ...(p.views ? { v: p.views } : {}),
    ...((p.views || 0) >= LANDMARK_VIEWS ? { landmark: 1 } : {}),
    /* Being written about is not the same as being good, so the ceiling
       here is deliberately below what a curated record can reach. */
    q: 4,
    u: p.heritage || (p.inception && +p.inception < 1900) ? 5 : 4
  };
}

async function run() {
  console.log('\nFinding the places that are a matter of record…\n');

  let list = await fromWikidata();
  if (LIMIT) list = list.slice(0, LIMIT);

  await summaries(list);
  await fame(list);

  const items = list.map(toRecord).filter(Boolean);

  const byCat = {}, byArr = {};
  items.forEach(p => { byCat[p.c] = (byCat[p.c] || 0) + 1; byArr[p.a] = (byArr[p.a] || 0) + 1; });

  console.log(`\n  ${items.length} records with something to say`);
  console.log('  by kind:', Object.entries(byCat).map(([k, n]) => `${k}:${n}`).join(' '));
  console.log('  per zone:', Object.entries(byArr)
    .sort((a, b) => a[0] - b[0]).map(([a, n]) => `${a}:${n}`).join(' '));
  console.log('  landmarks (demoted in everyday sections):', items.filter(i => i.landmark).length);

  if (DRY) {
    console.log('\n  --dry, nothing written. A sample:\n');
    items.slice(0, 6).forEach(i => console.log(`   • ${i.n} (${typeof i.a === 'number' ? i.a + 'e' : i.a}, ${i.c})${i.landmark ? ' [landmark]' : ''}\n     ${i.why.slice(0, 150)}\n`));
    return;
  }

  const doc = {
    generated: new Date().toISOString().slice(0, 10),
    source: 'Wikidata + Wikipedia (CC BY-SA) · pageviews via the Wikimedia REST API',
    note: 'Places with a verifiable distinction. Facts, never opinion — these land in the "sourced" tier. `landmark` marks somewhere famous enough that it is a sight rather than a recommendation, and the ranking pushes those down in everyday sections.',
    counts: byCat,
    items
  };
  await fs.writeFile(path.join(DATA, 'notable.json'), JSON.stringify(doc) + '\n', 'utf8');
  const kb = Math.round((await fs.stat(path.join(DATA, 'notable.json'))).size / 1024);
  console.log(`\n  wrote data/notable.json — ${kb} KB\n`);
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
