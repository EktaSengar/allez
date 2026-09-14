#!/usr/bin/env node
/* ---------------------------------------------------------
   check-views.mjs — did the page still say exactly the same thing?

   The August 2026 optimisation was held to byte-identical rendered
   output across every view, and the performance skill asks for that bar
   to be re-cleared by anything touching the render path. Until now that
   comparison was done by hand each time. This is it, written down.

   It renders all ten views in a headless browser and records a hash of
   what each one actually drew — `#view` markup, the four header lines,
   and the counts that make a diff readable when a hash moves. Run it
   before a change, run it after, and compare:

       node scripts/check-views.mjs --save before.json
       …edit…
       node scripts/check-views.mjs --compare before.json

   **Determinism is the whole job**, because four things make the same
   commit draw two different pages:

     the date        the epigraph and the day plan rotate by week, and
                     events expire against today
     the forecast    weatherMode feeds the ranking, so a rainy morning
                     is a different page from a fine one
     localStorage    ratings, quests and a saved home all change the order
     Math.random     only `surprise()` uses it, but seeding costs nothing
                     and removes the question

   All four are pinned below, before any page script evaluates. The date
   is frozen rather than mocked away because the page is *supposed* to
   depend on it; what a test cannot have is it changing underfoot.

   Usage:
     node scripts/check-views.mjs [--save FILE] [--compare FILE]
                                  [--date YYYY-MM-DD] [--port N] [--verbose]
   --------------------------------------------------------- */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : (argv[i + 1] ?? true);
};
const VERBOSE = argv.includes('--verbose');
const SAVE    = flag('--save');
const COMPARE = flag('--compare');
const PORT    = Number(flag('--port', 4399));

/* A Wednesday in a fully-stocked part of the year: events live, no
   public holiday, nothing seasonal collapsed. Changing this changes
   every hash, so a baseline and its comparison must share one. */
const DATE = String(flag('--date', '2026-09-16'));

const VIEWS = ['today', 'nights', 'weekend', 'eat', 'sport',
               'regulars', 'explore', 'away', 'quests', 'saved'];

const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

/* ---------- the site, served the way the browser expects ---------- */

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
};

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, url === '/' ? 'index.html' : url);
      if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
        res.writeHead(200, {
          'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
          'cache-control': 'no-store'
        }).end(buf);
      });
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

/* ---------- a forecast that never changes ----------

   Open-Meteo's real answer would make every run a different page. This
   is a fixed eight-day fine spell in the shape the real endpoint sends,
   so `Weather.mode()` lands on 'fine' and stays there. */
function forecast() {
  const days = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(DATE + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return {
    current: { temperature_2m: 19.4, weather_code: 1, precipitation: 0 },
    daily: {
      time: days,
      weather_code: days.map(() => 1),
      temperature_2m_max: days.map(() => 21.3),
      temperature_2m_min: days.map(() => 12.1),
      precipitation_probability_max: days.map(() => 8)
    }
  };
}

/* ---------- pinning the page's four sources of drift ---------- */

function pin(dateISO) {
  /* Runs before any page script. Everything here is deliberately plain
     ES5-ish: it is serialised into the page, not bundled. */
  const FIXED = new Date(dateISO + 'T10:30:00').getTime();

  const _Date = Date;
  function FrozenDate(...args) {
    if (!(this instanceof FrozenDate)) return new _Date(FIXED).toString();
    return args.length ? new _Date(...args) : new _Date(FIXED);
  }
  FrozenDate.prototype = _Date.prototype;
  FrozenDate.now = () => FIXED;
  FrozenDate.parse = _Date.parse;
  FrozenDate.UTC = _Date.UTC;
  window.Date = FrozenDate;

  /* mulberry32 — small, seeded, and good enough that two runs agree. */
  let seed = 0x9e3779b9;
  Math.random = function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  try { localStorage.clear(); } catch (e) {}

  /* The service worker would serve a previous run's copy of anything
     hashed, which is exactly the drift this script exists to catch. */
  if (navigator.serviceWorker) {
    navigator.serviceWorker.register = () => Promise.reject(new Error('disabled in tests'));
  }
}

/* ---------- waiting for the page to stop moving ----------

   The page fills in after the first paint on purpose (hero photograph,
   then civic + notable, then sixteen shards), so snapshotting early
   catches a half-drawn view and snapshotting on a timer catches a
   different half each run. Poll instead, and accept only a view that
   has been identical for a stretch. */
async function settle(page, { quiet = 900, floor = 2500, cap = 40000 } = {}) {
  const started = Date.now();
  let last = null, since = 0;
  for (;;) {
    const now = await page.evaluate(() => {
      const v = document.getElementById('view');
      return v ? v.innerHTML.length + ':' + v.children.length : '0:0';
    });
    if (now === last) { if (Date.now() - since >= quiet && Date.now() - started >= floor) return true; }
    else { last = now; since = Date.now(); }
    if (Date.now() - started > cap) return false;
    await new Promise(r => setTimeout(r, 150));
  }
}

/* ---------- what a view is, for comparison purposes ---------- */

async function capture(page, view) {
  return page.evaluate(v => {
    const q = s => document.querySelector(s);
    const view$ = document.getElementById('view');
    const html = view$ ? view$.innerHTML : '';
    const text = view$ ? (view$.innerText || '').replace(/\s+/g, ' ').trim() : '';
    return {
      view: v,
      html,
      text,
      header: [
        (q('#dateline')   || {}).textContent || '',
        (q('#epigraph')   || {}).textContent || '',
        (q('#conditions') || {}).textContent || '',
        (q('#lede')       || {}).textContent || ''
      ].join(' ¶ '),
      /* Chosen by what this markup actually emits, not by what a card
         is usually called: `article` is the record card, `.row` the
         compact list line, and the headings are how sections announce
         themselves. A hash says "different"; these say where. */
      counts: {
        chars:    html.length,
        children: view$ ? view$.children.length : 0,
        cards:    document.querySelectorAll('#view article').length,
        rows:     document.querySelectorAll('#view .row, #view .row-name').length,
        images:   document.querySelectorAll('#view img').length,
        links:    document.querySelectorAll('#view a').length,
        headings: document.querySelectorAll('#view h2, #view h3, #view h4').length,
        chips:    document.querySelectorAll('#view .chip').length
      }
    };
  }, view);
}

/* ---------- run ---------- */

async function run() {
  let puppeteer;
  try { puppeteer = (await import('puppeteer-core')).default; }
  catch {
    console.error('needs puppeteer-core:  npm install --no-save puppeteer-core');
    process.exit(2);
  }

  const chrome = process.env.CHROME_PATH;
  if (!chrome || !fs.existsSync(chrome)) {
    console.error('set CHROME_PATH to the Chrome binary — see the paris-performance skill');
    process.exit(2);
  }

  const srv = await serve();
  const browser = await puppeteer.launch({
    executablePath: chrome,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const out = { date: DATE, generated: new Date().toISOString(), views: {} };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 823, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(pin, DATE);

    await page.setRequestInterception(true);
    const wx = JSON.stringify(forecast());
    page.on('request', req => {
      const url = req.url();
      if (url.includes('api.open-meteo.com')) {
        return req.respond({ status: 200, contentType: 'application/json', body: wx });
      }
      /* Photographs are cross-origin and slow and never change the
         markup — the <img src> is already in the HTML either way. */
      if (url.includes('upload.wikimedia.org')) return req.abort();
      return req.continue();
    });

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    for (const view of VIEWS) {
      await page.evaluate(v => {
        const t = document.querySelector(`.tab[data-view="${v}"]`);
        if (t) t.click();
      }, view);
      const ok = await settle(page);
      const snap = await capture(page, view);
      out.views[view] = {
        hash: sha(snap.html),
        textHash: sha(snap.text),
        headerHash: sha(snap.header),
        counts: snap.counts,
        settled: ok
      };
      if (VERBOSE) out.views[view].header = snap.header;
      const c = snap.counts;
      process.stdout.write(
        `  ${view.padEnd(9)} ${out.views[view].hash}  ` +
        `${String(c.chars).padStart(7)} chars  ${String(c.cards).padStart(3)} cards  ` +
        `${String(c.rows).padStart(4)} rows  ${String(c.headings).padStart(3)} hd  ${String(c.images).padStart(3)} img` +
        `${ok ? '' : '   ← NEVER SETTLED'}\n`);
    }
  } finally {
    await browser.close();
    srv.close();
  }

  return out;
}

function compare(before, after) {
  const names = [...new Set([...Object.keys(before.views), ...Object.keys(after.views)])];
  let bad = 0;

  if (before.date !== after.date) {
    console.error(`\n  baseline was taken on ${before.date}, this run on ${after.date} —`);
    console.error('  every hash depends on the date, so these are not comparable.');
    process.exit(2);
  }

  console.log('');
  for (const n of names) {
    const b = before.views[n], a = after.views[n];
    if (!b || !a) { console.log(`  ${n.padEnd(9)} MISSING from ${b ? 'after' : 'before'}`); bad++; continue; }
    if (b.hash === a.hash) { console.log(`  ${n.padEnd(9)} identical`); continue; }

    bad++;
    console.log(`  ${n.padEnd(9)} CHANGED  ${b.hash} → ${a.hash}`);
    /* A hash on its own says nothing about what moved. The counts turn
       "different" into a lead worth following. */
    for (const k of Object.keys(a.counts)) {
      const x = b.counts[k], y = a.counts[k];
      if (x !== y) console.log(`             ${k.padEnd(9)} ${x} → ${y}  (${y > x ? '+' : ''}${y - x})`);
    }
    if (b.textHash === a.textHash) console.log('             text identical — markup changed, wording did not');
    if (b.headerHash !== a.headerHash) console.log('             header lines also changed');
  }

  console.log('');
  if (bad) {
    console.log(`  ${bad} of ${names.length} views differ.`);
    console.log('  A refactor that was meant to change nothing has changed something.');
  } else {
    console.log(`  All ${names.length} views byte-identical.`);
  }
  return bad;
}

const result = await run();

if (SAVE) {
  fs.writeFileSync(path.isAbsolute(SAVE) ? SAVE : path.join(ROOT, SAVE), JSON.stringify(result, null, 2) + '\n');
  console.log(`\n  saved → ${SAVE}`);
}

if (COMPARE) {
  const before = JSON.parse(fs.readFileSync(path.isAbsolute(COMPARE) ? COMPARE : path.join(ROOT, COMPARE), 'utf8'));
  const bad = compare(before, result);
  process.exit(bad ? 1 : 0);
}
