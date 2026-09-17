#!/usr/bin/env node
/* ---------------------------------------------------------
   civic-bay.mjs — what San Francisco publishes about its own facilities.

   The counterpart of civic.mjs, which reads the Mairie de Paris. Same
   idea and a different city: OpenStreetMap gives coverage and no
   judgement, Wikipedia gives judgement but only about the famous, and
   between them sits what the city records about the things it runs.

   Two datasets on data.sfgov.org, both keyless:

     ib5c-xgwu   Recreation and Parks facilities — 2,676 of them, typed.
                 Tennis courts, pools, rec centres, community gardens,
                 dog runs. The direct analogue of Paris's
                 lieux-municipaux.

     8i3s-ih2a   Our415 again, for the half neither of the other two
                 collectors takes. events-bay.mjs reads its library
                 events; practices.mjs reads its dance and art classes;
                 this reads the sixty free drop-in sport sessions that
                 are the largest block of genuinely useful recurring
                 things in any Bay feed — basketball on a Saturday
                 morning, table tennis on a Thursday night, free.

   That last one is why this script earns its place, and it is the same
   reason civic.mjs earns its: "Betty Ann Ong Rec Center" is a name.
   "Free drop-in basketball there, Saturdays 09:00–13:00" is a plan, and
   nothing else in the data can say it. Markets in Paris carry their days
   and hours for exactly this reason; a drop-in session is the same kind
   of fact.

   Nothing here is an opinion. These land in the `sourced` tier, which
   ranks below anything a person wrote and above a bare name on a map.

   Usage:  HOMEGROUND_CITY=bay-area node scripts/civic-bay.mjs [--dry]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDir, City, zoneFinder } from './shim.mjs';

const DATA = dataDir();
const DRY  = process.argv.includes('--dry');
const UA   = 'allez/1.0 (https://github.com/EktaSengar/allez)';
const TODAY = new Date().toISOString().slice(0, 10);

const zoneOf = zoneFinder(City);
const clean = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const flat  = s => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* ---------- which facilities are worth putting in front of somebody ----------

   The same judgement civic.mjs makes about Paris, and mostly the same
   answer. Everything absent from this table is real and none of our
   business: 448 hardscaped areas, 425 landscaped ones, 188 cargo
   containers, the maintenance yards, the restrooms and the car parks.

   Children's play areas are left out for the reason the other
   collectors leave out children's events, and picnic areas because a
   hundred of them are sub-features of parks that are already in the
   index under their own names. */
const FACILITY = {
  'Basketball Court':            ['sport',  '🏀', 'Basketball court'],
  'Tennis Court':                ['sport',  '🎾', 'Tennis courts'],
  'Tennis/Pickleball Court':     ['sport',  '🎾', 'Tennis and pickleball courts'],
  'Pickleball Courts':           ['sport',  '🏓', 'Pickleball courts'],
  'Badminton Courts':            ['sport',  '🏸', 'Badminton courts'],
  'Volleyball Court':            ['sport',  '🏐', 'Volleyball court'],
  'Handball/Racquetball Court':  ['sport',  '🎾', 'Handball and racquetball courts'],
  'Multi-Use Court':             ['sport',  '🏀', 'Multi-use court'],
  'Swimming Pool':               ['sport',  '🏊', 'Public pool'],
  'Rec Center':                  ['sport',  '🏃', 'Recreation centre'],
  'Rec Center/Pool':             ['sport',  '🏊', 'Recreation centre and pool'],
  'Clubhouse/Pool':              ['sport',  '🏊', 'Clubhouse and pool'],
  'Fieldhouse':                  ['sport',  '🏃', 'Fieldhouse'],
  'Ball Field':                  ['sport',  '⚾', 'Ball field'],
  'Soccer Field':                ['sport',  '⚽', 'Soccer field'],
  'Outdoor Sports Complex':      ['sport',  '🏟️', 'Outdoor sports complex'],
  'Stadium':                     ['sport',  '🏟️', 'Stadium'],
  'Skatepark':                   ['sport',  '🛹', 'Skate park'],
  'Bike Park':                   ['sport',  '🚲', 'Bike park'],
  'Adult Fitness Court/Course':  ['sport',  '💪', 'Open-air fitness course'],
  'Golf Facility':               ['sport',  '⛳', 'Golf course'],
  'Disc Golf':                   ['sport',  '🥏', 'Disc golf course'],
  'Archery Field':               ['sport',  '🏹', 'Archery field'],
  'Bocce Ball Court':            ['sport',  '🎯', 'Bocce court'],
  'Petanque Court':              ['sport',  '🎯', 'Pétanque court'],
  'Horseshoe Pit':               ['sport',  '🎯', 'Horseshoe pit'],
  'Bowling Green':               ['sport',  '🎳', 'Bowling green'],
  'Croquet Lawn':                ['sport',  '🎯', 'Croquet lawn'],
  'Community Garden':            ['park',   '🌱', 'Community garden'],
  'Ornamental Garden':           ['park',   '🌸', 'Ornamental garden'],
  'Dog Play Area':               ['park',   '🐕', 'Dog run'],
  'Nature Exploration Area':     ['park',   '🌳', 'Nature area'],
  'Arts/Activity Center':        ['culture','🎨', 'Arts and activity centre'],
  'Performance Space':           ['culture','🎭', 'Performance space']
};

/* 245 of the 452 facilities worth keeping are named after their own
   type — "Tennis Courts", "Basketball Courts" — and a few are
   abbreviations the dataset never expands ("DPA" for a dog play area).
   A row named for its type is not a name, so it takes the site's own
   label and the park it stands in: "Tennis courts, Glen Canyon Park".
   A row with a real name of its own keeps it, unqualified — "Glen
   Canyon Rec Center" already says where it is. */
function facilityName(f, label) {
  const own = clean(f.facility_name), prop = clean(f.property_name);
  const type = flat(f.facility_type);
  const named = own.length > 4 && flat(own) !== type && flat(own) !== `${type}s` &&
                !type.includes(flat(own));
  if (named) return own;
  return prop ? `${label}, ${prop}` : label;
}

async function facilities(log) {
  const res = await fetch('https://data.sfgov.org/resource/ib5c-xgwu.json?%24limit=50000',
    { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Rec & Park facilities → ${res.status}`);
  const rows = await res.json();

  const step = (label, list) => { log.push([list.length, label]); return list; };
  let kept = step(`${rows.length} facilities in the dataset`, rows);
  kept = step('somewhere you would actually go',
    kept.filter(f => FACILITY[f.facility_type]));
  kept = step('has a position', kept.filter(f => f.latitude && f.longitude));
  kept = step('inside the city',
    kept.filter(f => zoneOf(+f.latitude, +f.longitude) != null));

  return kept.map(f => {
    const [c, emoji, label] = FACILITY[f.facility_type];
    const lat = +f.latitude, lon = +f.longitude;
    const where = clean(f.property_name);
    return {
      n: facilityName(f, label).slice(0, 70),
      c,
      lat: +lat.toFixed(5),
      lon: +lon.toFixed(5),
      a: zoneOf(lat, lon),
      ...(clean(f.address) ? { s: clean(f.address).slice(0, 60) } : {}),
      why: where ? `${label} in ${where}, run by SF Rec & Park.`
                 : `${label}, run by SF Rec & Park.`,
      emoji,
      q: 4,
      u: 2
    };
  });
}

/* ---------- the drop-in sessions ----------

   Our415's Rec & Park half, which practices.mjs deliberately leaves
   behind: of its seventy recurring adult rows, sixty are sport, and a
   basketball session is not a practice you take up in the sense that
   file means. It is a thing that is on, at a place, on a weekday — which
   is what this file has always been for.

   `days` is the field the ranking already understands, so a Thursday
   session goes quiet on a Monday, and `oh` is the same times in the
   opening-hours syntax js/hours.js reads, so a card can say whether it
   is on right now. Neither is invented: the feed states both. */
const DOW = { su: 0, sun: 0, m: 1, mo: 1, mon: 1, t: 2, tu: 2, tue: 2, w: 3, we: 3, wed: 3,
              th: 4, thu: 4, f: 5, fr: 5, fri: 5, sa: 6, sat: 6 };
const OSM_DAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const LONG_DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function weekdays(raw) {
  const out = new Set();
  for (const part of String(raw || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)) {
    const ends = part.split('-').map(x => DOW[x.trim()]);
    if (!ends.length || !ends.every(Number.isInteger) || ends.length > 2) return null;
    if (ends.length === 1) { out.add(ends[0]); continue; }
    for (let d = ends[0]; ; d = (d + 1) % 7) { out.add(d); if (d === ends[1]) break; }
  }
  return out.size ? [...out].sort((a, b) => a - b) : null;
}

const hhmm = t => (/^(\d{2}):(\d{2})/.exec(t || '') || []).slice(1, 3).join(':') || null;
const listWords = xs => xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0];

/* Anything that is not a session somebody can turn up to: league
   fixtures, a staff away-day, a family open day. */
const NOT_A_DROP_IN = /\b(league|championship|tournament|retreat|family day|open house|@work)\b/i;

async function dropIns(log) {
  const res = await fetch('https://data.sfgov.org/resource/8i3s-ih2a.json?%24limit=50000',
    { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Our415 → ${res.status}`);
  const rows = await res.json();

  const step = (label, list) => { log.push([list.length, label]); return list; };
  const day = x => (x ? String(x).slice(0, 10) : null);

  let kept = step(`${rows.length} rows in the dataset`, rows);
  kept = step('Rec & Park, not the library', kept.filter(e => e.org_name === 'SF Rec Park'));
  kept = step('adults are part of the intended audience',
    kept.filter(e => /all ages|adult|senior/i.test(e.age_group_eligibility_tags || '')));
  kept = step('runs on weekdays the feed states', kept.filter(e => weekdays(e.days_of_week)));
  kept = step('still running', kept.filter(e => (day(e.event_end_date) || day(e.event_start_date)) >= TODAY));
  kept = step('something to turn up to', kept.filter(e => !NOT_A_DROP_IN.test(e.event_name || '')));
  kept = step('has a position and a time',
    kept.filter(e => e.latitude && e.longitude && hhmm(e.start_time) && hhmm(e.end_time)));
  kept = step('inside the city',
    kept.filter(e => zoneOf(+e.latitude, +e.longitude) != null));

  return kept.map(e => {
    const days = weekdays(e.days_of_week);
    const [from, to] = [hhmm(e.start_time), hhmm(e.end_time)];
    const lat = +e.latitude, lon = +e.longitude;
    const what = clean(e.event_name).replace(/^Drop-?in:\s*/i, '');
    const where = clean(e.site_location_name).toLowerCase()
      .replace(/(^|[\s\-\/(])(\w)/g, (m, a, c) => a + c.toUpperCase());
    const free = e.fee === false || e.fee === 'false';
    return {
      n: `${what}, ${where}`.slice(0, 70),
      c: 'sport',
      lat: +lat.toFixed(5),
      lon: +lon.toFixed(5),
      a: zoneOf(lat, lon),
      why: `${free ? 'Free drop-in' : 'Drop-in'} ${what.toLowerCase()} at ${where}. ` +
           `${listWords(days.map(d => LONG_DAY[d]))}, ${from}–${to}.`,
      days,
      /* The same times in the syntax js/hours.js already reads. */
      oh: `${days.map(d => OSM_DAY[d]).join(',')} ${from}-${to}`,
      emoji: '🤾',
      q: 4,
      u: 3
    };
  });
}

async function run() {
  console.log(`\n${City.name} — what the city runs\n`);

  const file = path.join(DATA, 'civic.json');
  let previous = { items: [] };
  try { previous = JSON.parse(await fs.readFile(file, 'utf8')); } catch { /* first run */ }

  const results = {}; let failures = 0;
  const HALVES = [['facilities', facilities], ['drop-ins', dropIns]];

  for (const [name, fn] of HALVES) {
    const log = [];
    console.log(`  ${name}`);
    try {
      results[name] = await fn(log);
      log.forEach(([n, label]) => console.log(`  ${String(n).padStart(6)}  ${label}`));
    } catch (e) {
      /* One dataset going away is not a reason to lose the other, and
         never a reason to publish an empty file. */
      failures++;
      results[name] = [];
      console.log(`         unreachable (${e.message}) — this half is empty this run`);
    }
    console.log('');
  }

  if (failures === HALVES.length) {
    console.log('  both datasets failed — leaving the file exactly as it was\n');
    return;
  }

  const items = [...results.facilities, ...results['drop-ins']].filter(r => r.n && r.a != null);
  const counts = {};
  items.forEach(r => { counts[r.c] = (counts[r.c] || 0) + 1; });
  const spread = new Set(items.map(r => r.a));

  console.log(`  ${items.length} kept · ${Object.entries(counts).map(([k, n]) => `${k}:${n}`).join(' ')}`);
  console.log(`  across ${spread.size}/${Object.keys(City.zone.centroids).length} ${City.zone.many}`);

  if (DRY) { console.log('\n  --dry, nothing written\n'); return; }

  const doc = {
    generated: TODAY,
    source: 'SF Recreation & Parks facilities (ib5c-xgwu) · Our415 (8i3s-ih2a) · data.sfgov.org',
    note: 'What the city publishes about the things it runs. Facts with a source and no opinion — these land in the "sourced" tier. The drop-in sessions carry `days` and opening hours because "free basketball there on Saturday morning" is a plan and the name of a rec centre is not.',
    counts,
    items
  };
  await fs.writeFile(file, JSON.stringify(doc, null, 1) + '\n', 'utf8');
  console.log(`\n  wrote data/civic.json — ${Math.round(JSON.stringify(doc).length / 1024)} KB\n`);
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
