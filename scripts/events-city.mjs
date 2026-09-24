#!/usr/bin/env node
/* ---------------------------------------------------------
   events-city.mjs — what is on, from whichever sources a city has.

   Not `events.mjs` with a second URL in it, and the reason is that the
   Bay has no analogue of what that script reads. Paris has one municipal
   feed carrying 2,200 cultural listings with coordinates, dates, price
   and a link. San Francisco publishes plenty of open data and none of it
   is that: DataSF's only events dataset is Our415, which is the Rec &
   Park and Public Library programme calendar and is mostly for children.

   So the Bay is three sources, none of them a listings magazine, and
   between them they answer the question for the two halves of the
   region:

     events.stanford.edu   Localist, keyless. The Cantor's exhibitions,
                           gallery tours, author talks, film series and
                           concerts. **This is the Peninsula's only
                           source** — without it Palo Alto, Menlo Park
                           and Mountain View have nothing dated at all.

     data.sfgov.org        Our415 (8i3s-ih2a), keyless. 2,435 rows of
                           which about fifty are library events an adult
                           would go to: plant swaps, fix-it clinics,
                           book awards, screenings.

     luma.com/sf           Luma's discovery calendar, keyless iCal. The
                           evenings that are not tech — reading in the
                           park, a makers market, a transit art fair. The
                           tech and AI ones go to practices.json, which is
                           where Paris files them; LUMA_TECH in ics.mjs is
                           the one line both scripts read, from opposite
                           sides, so an evening lands in exactly one file.

   In Paris, Luma's non-tech evenings can be thrown away, because the
   city's own feed already carries that kind of thing. Nothing does here.
   Measured on 16 September 2026: of the 44 in-city events in the SF
   calendar, 25 were tech and 19 were not — and before this half existed
   those 19 reached no file at all.

   These are `sourced` records: facts with a source, no opinion. `why`
   carries the source's own description of itself and never a claim
   about whether the two of you would enjoy it. That claim is what
   events.json is for, and no script can make it.

   **The halves fail independently and neither may empty the file.** A
   Stanford outage must not delete fifty library events, and vice versa;
   see run(). This is the rule practices.mjs holds and the reason it is
   written down twice.

   Each half runs only where the pack asks for it — `City.events` names
   the ones that are somebody's local institution, and `City.luma` is
   read by any city that has a discovery calendar. Bengaluru and Delhi
   have only the last of those, and it is most of what either has.

   Usage:  HOMEGROUND_CITY=<city> node scripts/events-city.mjs [--dry] [--days N]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDir, City, zoneFinder } from './shim.mjs';
import { lumaFeed, lumaParts, icsDate, icsGeo, unescapeICS, LUMA_TECH } from './ics.mjs';

const DATA = dataDir();
const DRY  = process.argv.includes('--dry');
const DAYS = (() => { const i = process.argv.indexOf('--days'); return i === -1 ? 60 : Number(process.argv[i + 1]); })();
const UA   = 'allez/1.0 (https://github.com/EktaSengar/allez)';

const TODAY = new Date().toISOString().slice(0, 10);
/* Luma stamps are UTC; the day an evening falls on is the city's. */
const TZ = City.weather?.tz;
const UNTIL = new Date(Date.now() + DAYS * 86400000).toISOString().slice(0, 10);

const zoneOf = zoneFinder(City);
const strip  = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* Both feeds hand back HTML entities in plain-text fields — "BTS &amp;
   ARMY Creative Lounge" is what Our415 actually stores. */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#8217': '’' };
const unent = s => strip(s).replace(/&(#?\w+);/g, (m, k) => ENTITIES[k] ?? m);

const day = s => (s ? String(s).slice(0, 10) : null);

/* ======================================================================
   Stanford — events.stanford.edu, the Localist API

   Localist is keyless and paginated at 100. What it is not is one row
   per event: it returns one row **per occurrence**, so a Cantor
   exhibition running from August to December arrives forty times. Left
   alone that is forty cards for one show, which is the failure the
   per-venue cap exists to catch in Paris and would swamp everything
   else here.

   So rows are collapsed by event id and the run is stated as a span —
   `first_date` to `last_date` — which is what a reader planning a visit
   actually wants and is a fact the feed already published.
   ====================================================================== */

const STANFORD = `${(City.events || {}).localist || ''}/api/2/events`;

/* What Stanford calls a kind of event, and what the site calls it.
   Everything absent from this table is dropped: `Academic Dates`,
   `Meeting`, `Class/Seminar`, `Conference/Symposium` are real and none
   of them is an evening out. */
const TYPES = {
  'Exhibition':                 ['art',     '🖼️'],
  'Performance':                ['music',   '🎵'],
  'Concert':                    ['music',   '🎵'],
  'Film/Screening':             ['film',    '🎬'],
  'Lecture/Presentation/Talk':  ['learn',   '🎤'],
  'Reading':                    ['books',   '📚'],
  'Tour':                       ['walk',    '🚶'],
  'Festival':                   ['festival','🎉']
};

/* A university calendar is a workplace noticeboard as well as a
   programme, and the audience tag does not separate the two: "Pediatric
   Grand Rounds (CME)" is filed as General Public because in a literal
   sense anybody may attend. Nobody is going.

   Matched on the title rather than the subject, because the subject tag
   is too blunt — dropping everything filed under Medicine would also
   drop a public lecture on the history of anaesthesia, which is exactly
   the kind of thing worth knowing about. */
const SOMEBODY_S_JOB = new RegExp('(' + [
  'grand rounds', '\\bCME\\b', 'colloquium', 'seminar series', 'webinar',
  'info(rmation)? session', 'orientation', 'advising', 'office hours',
  'admissions', 'dissertation', 'thesis defense', 'faculty meeting',
  'summer program', 'career fair', 'workshop series'
].join('|') + ')', 'i');

/* A run this long is a fixture rather than something that is on. The
   Hoover carillon is listed from 2023 to 2026 and "JANE!" until May
   2028 — both real, neither an answer to what to do this weekend, and a
   countdown on either is a lie. Six months is generous for a museum
   show and short enough to exclude the permanent collection. */
const LONGEST_RUN_DAYS = 185;

async function stanford(log) {
  const rows = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${STANFORD}?days=${DAYS}&pp=100&page=${page}`,
      { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Stanford ${res.status}`);
    const doc = await res.json();
    rows.push(...(doc.events || []).map(e => e.event));
    if (!doc.page?.next_page) break;
  }

  const steps = [];
  const step = (label, list) => { steps.push([list.length, label]); return list; };

  /* One row per occurrence — collapse before anything else, so every
     count below is a count of events rather than of dates. */
  const byId = new Map();
  for (const e of rows) if (!byId.has(e.id)) byId.set(e.id, e);
  let kept = step(`${rows.length} rows collapse to distinct events`, [...byId.values()]);

  const f = (e, k) => ((e.filters && e.filters[k]) || []).map(x => x.name);

  kept = step('open to the public', kept.filter(e =>
    f(e, 'event_audience').some(a => /general public|everyone/i.test(a))));
  kept = step('a reason to go, not a kind of admin', kept.filter(e =>
    f(e, 'event_types').some(t => TYPES[t])));
  kept = step('not somebody at work', kept.filter(e => !SOMEBODY_S_JOB.test(e.title)));
  kept = step('not cancelled', kept.filter(e =>
    e.status !== 'canceled' && !/^\s*\[?cancell?ed\]?/i.test(e.title)));
  kept = step('has a position', kept.filter(e => e.geo?.latitude && e.geo?.longitude));
  kept = step('inside the city', kept.filter(e => zoneOf(+e.geo.latitude, +e.geo.longitude) != null));
  kept = step('running now or soon', kept.filter(e => {
    const s = day(e.first_date), n = day(e.last_date) || day(e.first_date);
    return s && n >= TODAY && s <= UNTIL;
  }));
  kept = step(`a run, not a fixture (under ${LONGEST_RUN_DAYS} days)`, kept.filter(e => {
    const s = new Date(day(e.first_date)), n = new Date(day(e.last_date) || day(e.first_date));
    return (n - s) / 86400000 <= LONGEST_RUN_DAYS;
  }));

  /* The Cantor alone would otherwise take a dozen rows with its own
     tours. One programme per venue, which is the cap Paris uses and for
     the same reason: a museum's season is a venue, not twelve events. */
  const seen = new Map();
  kept = step('at most two per venue', kept.filter(e => {
    const v = e.location_name || e.location || e.id;
    if ((seen.get(v) || 0) >= 2) return false;
    seen.set(v, (seen.get(v) || 0) + 1);
    return true;
  }));

  steps.forEach(([n, label]) => log.push([n, label]));

  return kept.map(e => {
    const type = f(e, 'event_types').find(t => TYPES[t]);
    const [cat, emoji] = TYPES[type];
    const lat = +e.geo.latitude, lon = +e.geo.longitude;
    const start = day(e.first_date), end = day(e.last_date) || start;
    return {
      id: `stanford-${e.id}`,
      title: unent(e.title).slice(0, 120),
      emoji,
      type: 'event',
      categories: [cat],
      zone: zoneOf(lat, lon),
      area: unent(e.location_name || e.location || '').slice(0, 80) || null,
      coords: [lat, lon],
      start,
      end: end < start ? start : end,
      ...(e.free ? { price: 0, priceNote: 'Free' }
                 : e.ticket_cost ? { priceNote: unent(e.ticket_cost).slice(0, 60) } : {}),
      why: unent(e.description_text || '').slice(0, 320) || `${type} at Stanford.`,
      url: e.localist_url,
      source: 'Stanford Events — events.stanford.edu',
      lastVerified: TODAY,
      indoor: type !== 'Tour',
      quality: 3,
      uniqueness: 3
    };
  });
}

/* ======================================================================
   Our415 — data.sfgov.org, dataset 8i3s-ih2a

   Two organisations publish into it, SF Rec & Park and SF Public
   Library, and they want different things done with them. Rec & Park's
   rows are recurring drop-ins — badminton on a Tuesday, table tennis on
   a Thursday — which is a *practice*, not an event, and belongs in
   practices.json with `days` on it. Only the library half is read here.

   The age tags are the gate and they are unusually honest: an event for
   adults says "All Ages" or names an adult bracket, and the 2,300 rows
   that do not are genuinely for babies, toddlers, children and teens.
   ====================================================================== */

const OUR415 = 'https://data.sfgov.org/resource/8i3s-ih2a.json?%24limit=50000';

/* Library rows title themselves "Kind: Name" — "Workshop: Bike Repair
   Fix-it Clinic", "Film: October Sky" — which is a category the feed
   states and the dataset does not otherwise carry. */
const PREFIX = {
  'Workshop':    ['learn',  '🛠️'],
  'Film':        ['film',   '🎬'],
  'Performance': ['music',  '🎵'],
  'Concert':     ['music',  '🎵'],
  'Author':      ['books',  '📚'],
  'Reading':     ['books',  '📚'],
  'Presentation':['learn',  '🎤'],
  'Panel':       ['learn',  '🎤'],
  'Talk':        ['learn',  '🎤'],
  'Celebration': ['festival','🎉'],
  'Social':      ['community', '🫂'],
  'Activity':    ['learn',  '🎨'],
  'Exhibit':     ['art',    '🖼️']
};

async function our415(log) {
  const res = await fetch(OUR415, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Our415 ${res.status}`);
  const rows = await res.json();

  const steps = [];
  const step = (label, list) => { steps.push([list.length, label]); return list; };

  let kept = step(`${rows.length} rows in the dataset`, rows);
  kept = step('the library, not the rec centre',
    kept.filter(e => e.org_name === 'SF Public Library'));
  kept = step('adults are part of the intended audience',
    kept.filter(e => /all ages|adult|senior/i.test(e.age_group_eligibility_tags || '')));
  kept = step('not already full', kept.filter(e => !/^\s*FULL\b/i.test(e.event_name || '')));
  kept = step('running now or soon', kept.filter(e => {
    const s = day(e.event_start_date), n = day(e.event_end_date) || day(e.event_start_date);
    return s && n >= TODAY && s <= UNTIL;
  }));
  kept = step('has a position and a link',
    kept.filter(e => e.latitude && e.longitude && e.more_info));
  kept = step('inside the city',
    kept.filter(e => zoneOf(+e.latitude, +e.longitude) != null));

  steps.forEach(([n, label]) => log.push([n, label]));

  return kept.map(e => {
    const name = unent(e.event_name);
    const m = /^([^:]{3,14}):\s*(.+)$/.exec(name);
    const [cat, emoji] = (m && PREFIX[m[1]]) || ['learn', '📚'];
    const lat = +e.latitude, lon = +e.longitude;
    const start = day(e.event_start_date), end = day(e.event_end_date) || start;
    return {
      id: `our415-${e.id}`,
      title: (m ? m[2] : name).slice(0, 120),
      emoji,
      type: 'event',
      categories: [cat],
      zone: zoneOf(lat, lon),
      area: unent(e.site_location_name || '').slice(0, 80) || null,
      coords: [lat, lon],
      start,
      end: end < start ? start : end,
      ...(e.fee === false || e.fee === 'false' ? { price: 0, priceNote: 'Free' } : {}),
      why: unent(e.event_description || '').slice(0, 320) || 'An event at the San Francisco Public Library.',
      url: e.more_info,
      source: 'Our415 — SF Public Library, data.sfgov.org',
      lastVerified: TODAY,
      indoor: true,
      quality: 3,
      uniqueness: 3
    };
  });
}

/* ======================================================================
   Permits — data.cityofnewyork.us, dataset tvpp-9vvx

   NYC Permitted Event Information: every street closure, park booking
   and plaza programme the city has signed off, 30,000 rows running into
   2027. It is the one live municipal feed New York has — the Parks
   listing that looks like one stopped in 2019 — and it is a permit
   register, not a programme, which decides almost everything below.

   **Most of it is not for anybody.** Measured on 22 September 2026 over
   sixty days: 26,000 of 30,000 rows are youth and adult league bookings
   of a ballfield. "Special Event" is 3,265 rows of Parks administration
   — lawn closures, gazebo construction, and private "Celebration"
   bookings of a pavilion. "Street Event" is mostly health outreach vans.
   Block parties are the neighbours' own afternoon. What is left, and
   what is kept, is the kind of thing a stranger may walk into: the
   greenmarkets, parades, street festivals, plaza programmes and Open
   Streets.

   **It carries no coordinates.** `event_location` is free text in a
   handful of shapes — "AVENUE M between EAST 45 STREET and EAST 46
   STREET", "VANDERBILT AVENUE - ATLANTIC AVENUE to PARK PLACE", or a
   plaza name followed by one of those. The block is placed by asking
   OpenStreetMap where the named street crosses its two cross streets,
   and averaging. Street names repeat across boroughs, so a crossing is
   accepted only when it lands in a zone whose `side` is the permit's
   borough. Every answer, including "not found", is cached in
   scripts/permit-places.json, because Overpass takes five to ten seconds
   a question and the same greenmarket asks it every week.

   **One row per occurrence**, like Localist. A greenmarket open on
   Tuesdays and Fridays arrives eighteen times in sixty days. Rows are
   collapsed by name and place into one record with a span and `days`,
   which is what the scoring reads to show it only on the right
   weekdays.

   There is no link. The permit knows where and when and nothing else,
   so the card links to the spot on the map, and `why` says plainly that
   this is a permit and not a listing.
   ====================================================================== */

const PERMITS = id => `https://data.cityofnewyork.us/resource/${id}.json`;

const PERMIT_KINDS = {
  'Farmers Market':            ['market',    '🥕'],
  'Parade':                    ['festival',  '🎉'],
  'Street Festival':           ['festival',  '🎉'],
  'Single Block Festival':     ['festival',  '🎉'],
  'Plaza Event':               ['community', '🫂'],
  'Plaza Partner Event':       ['community', '🫂'],
  'Open Street Partner Event': ['community', '🫂']
};

/* Inside the kept kinds, the rows that are still somebody at work or a
   private occasion. Read off the name, because that is all there is. */
const PERMIT_NOT_FOR_US = /\b(wellness|outreach|distribution|enrol+ment|wedding|closure|closed|construction|renovation|clean.?up|e-?waste|recycling|afterschool|after school|meeting|vaccin\w*|flu shot|health fair|voter|memorial|funeral|structure|load.?in|filming)\b/i;

const PERMIT_CACHE = new URL('./permit-places.json', import.meta.url);

/* "EAST   37 STREET" → "East 37th Street"; "10 AVENUE" → "10th Avenue";
   "FT WASHINGTON AVENUE" → "Fort Washington Avenue". OpenStreetMap
   spells New York's numbered streets with ordinals and in full, and the
   permit register spells them neither way. */
const ORD = n => n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
const WORD = { e: 'East', w: 'West', n: 'North', s: 'South', ft: 'Fort', st: 'Street', ave: 'Avenue',
               av: 'Avenue', pl: 'Place', rd: 'Road', blvd: 'Boulevard', pkwy: 'Parkway', dr: 'Drive',
               ln: 'Lane', ct: 'Court', ter: 'Terrace', hwy: 'Highway', sq: 'Square' };
/* "Second Avenue" is how people and some permits say it; the map says
   "2nd Avenue". Avenue of the Americas is 6th Avenue on the map. */
const NUMWORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
                  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12 };
const ALIAS = { 'avenue of americas': '6th Avenue', 'avenue of the americas': '6th Avenue' };
function osmStreet(raw) {
  const plain = String(raw).replace(/[.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (ALIAS[plain.toLowerCase()]) return ALIAS[plain.toLowerCase()];
  const words = plain.split(' ').filter(Boolean);
  return words.map((w, i) => {
    const lw = w.toLowerCase();
    if (NUMWORD[lw] && i < words.length - 1) return ORD(NUMWORD[lw]);
    if (/^\d+$/.test(w) && i < words.length - 1) return ORD(+w);
    if (/^\d+(st|nd|rd|th)$/i.test(w)) return ORD(parseInt(w, 10));   // "32rd" is in the data
    /* A single letter is Avenue M, not an abbreviation; "St" first is Saint. */
    if (WORD[lw] && !(lw === 'st' && i === 0) && !(lw.length === 1 && i > 0)) return WORD[lw];
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join(' ');
}

/* The first block the text names, as [street, from, to], or null. A
   parade route lists several — the first is where it forms up. */
function firstBlock(text) {
  const t = String(text).replace(/\s+/g, ' ');
  let m = /(?:^|[:,)]\s*|\b[A-Z][a-z]+ Plaza\)?\s+)?([A-Za-z0-9 .'-]+?) between ([A-Za-z0-9 .'-]+?) and ([A-Za-z0-9 .'-]+?)(?:,|$| [A-Z][a-z]+:)/.exec(t);
  if (!m) m = /([A-Za-z0-9 .'-]+?) - ([A-Za-z0-9 .'-]+?) to ([A-Za-z0-9 .'-]+?)(?::|,|$)/.exec(t);
  if (!m) return null;
  /* A plaza prefix leaves its own name glued to the street: "Avenue C
     Plaza MCDONALD AVENUE". The street is the upper-case run at the end,
     or failing that the last two or three words. */
  const tidy = s => { const up = /([A-Z0-9][A-Z0-9 .'-]+)$/.exec(s.trim()); return (up && up[1].trim().length > 3 ? up[1] : s).trim(); };
  return [tidy(m[1]).replace(/^.*\bPlaza\)?\s+(?=\S)/i, ''), m[2].trim(), m[3].trim()].map(osmStreet);
}

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Where each block's street meets its two cross streets, for many
   blocks in one Overpass request. One question per block was the first
   version, and it did not survive contact: the public instance answers
   504 whenever it is busy, which in the evening is often, and a
   ten-second query times two hundred is a long time to be lucky.

   A `make` element between groups marks where one block's answer ends
   and the next begins, so a single reply can be split back apart. */
const PER_REQUEST = 15;

async function crossings(blocks) {
  const [s, w, n, e] = City.bbox.split(',');
  const bb = `(${s},${w},${n},${e})`;
  const q = '[out:json][timeout:120];\n' + blocks.map(([street, from, to], i) =>
    `way[highway][~"^(name|alt_name|old_name)$"~"^${escRe(street)}$",i]${bb}->.a;\n` +
    `way[highway][~"^(name|alt_name|old_name)$"~"^(${escRe(from)}|${escRe(to)})$",i]${bb}->.b;\n` +
    `node(w.a)(w.b);out skel;\nmake block i=${i};out;`).join('\n');
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
      try {
        const res = await fetch(host, { method: 'POST', headers: { 'user-agent': UA }, body: q,
                                        signal: AbortSignal.timeout(180000) });
        if (!res.ok) continue;
        const out = blocks.map(() => []);
        let cur = [];
        for (const el of (await res.json()).elements) {
          if (el.type === 'block') { out[+el.tags.i] = cur; cur = []; }
          else cur.push([el.lat, el.lon]);
        }
        return out;
      } catch { /* the other mirror, then wait */ }
    }
    await new Promise(r => setTimeout(r, 20000 * (attempt + 1)));
  }
  return null;
}

async function permits(log) {
  let cache = {};
  try { cache = JSON.parse(await fs.readFile(PERMIT_CACHE, 'utf8')); } catch { /* first run */ }

  const kinds = Object.keys(PERMIT_KINDS).map(k => `'${k}'`).join(',');
  const url = `${PERMITS(City.events.permits)}?$limit=50000&$where=` + encodeURIComponent(
    `start_date_time between '${TODAY}' and '${UNTIL}T23:59:59' AND event_type in (${kinds})`);
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`permits ${res.status}`);
  const rows = await res.json();

  const steps = [];
  const step = (label, list) => { steps.push([list.length, label]); return list; };

  let kept = step(`${rows.length} permits of a kind a stranger could walk into`, rows);
  kept = step('not somebody at work, or a private occasion',
    kept.filter(r => !PERMIT_NOT_FOR_US.test(r.event_name || '')));

  /* Collapse occurrences: one market, one record, with its weekdays. */
  const groups = new Map();
  for (const r of kept) {
    const k = `${(r.event_name || '').trim().toLowerCase()}|${r.event_location}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  kept = step('distinct events once the dates are collapsed', [...groups.values()]);

  const todo = new Map();
  const want = kept.map(occ => {
    const r = occ[0];
    const block = firstBlock(r.event_location);
    if (!block) return null;
    const key = `${r.event_borough}|${block.join('|')}`;
    if (!(key in cache)) todo.set(key, [block, r.event_borough]);
    return [occ, key];
  }).filter(Boolean);
  steps.push([want.length, 'name a block that can be looked for']);

  /* Keep only crossings in the permit's own borough — "East 37th
     Street" is in Manhattan and in Brooklyn — then take the middle of
     what is left. Nothing left is cached as null, so a street the map
     does not know is asked about once rather than weekly. A batch that
     fails is not cached at all, and is asked again next run; the rest
     of the run carries on without it. */
  const pending = [...todo.entries()];
  let unanswered = 0;
  for (let i = 0; i < pending.length; i += PER_REQUEST) {
    const batch = pending.slice(i, i + PER_REQUEST);
    const got = await crossings(batch.map(([, [block]]) => block));
    if (!got) { unanswered += batch.length; continue; }
    batch.forEach(([key, [, borough]], j) => {
      const mine = got[j].filter(([la, lo]) => {
        const z = zoneOf(la, lo); return z != null && City.zone.side?.[z] === borough;
      });
      /* A street that meets a cross street many times — 12th Avenue
         merging in and out of the West Side Highway — averages to
         somewhere between them all, which is nowhere. Crossings more
         than three kilometres apart are not one block, and are left
         unplaced rather than placed wrongly. */
      const spread = mine.length && Math.max(
        ...mine.map(a => Math.max(...mine.map(b => Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 84)))));
      cache[key] = mine.length && spread <= 3
        ? [+(mine.reduce((a, p) => a + p[0], 0) / mine.length).toFixed(5),
           +(mine.reduce((a, p) => a + p[1], 0) / mine.length).toFixed(5)]
        : null;
    });
    await fs.writeFile(PERMIT_CACHE, JSON.stringify(
      Object.fromEntries(Object.entries(cache).sort()), null, 1) + '\n', 'utf8');
  }
  const placed = want.filter(([, key]) => cache[key]).map(([occ, key]) => [occ, cache[key]]);
  if (pending.length && unanswered === pending.length && !placed.length)
    throw new Error('Overpass unreachable');
  steps.push([placed.length, `placed on the map (${pending.length - unanswered} blocks newly looked up` +
    (unanswered ? `, ${unanswered} unanswered and left for next run)` : ')')]);

  /* The cache is written as it fills, and even on --dry: it is a record of
     OpenStreetMap's answers, not output, and should not be paid for twice. */

  steps.forEach(([n, label]) => log.push([n, label]));

  return placed.map(([occ, [lat, lon]]) => {
    const r = occ[0];
    const [cat, emoji] = PERMIT_KINDS[r.event_type];
    const dates = occ.map(o => day(o.start_date_time)).sort();
    const start = dates[0], end = day(occ.map(o => o.end_date_time).sort().pop()) || start;
    /* A weekly market lists its weekdays; a one-day parade does not
       need to. getUTCDay on a bare date is the weekday of that date. */
    const days = occ.length > 1
      ? [...new Set(dates.map(d => new Date(d + 'T00:00:00Z').getUTCDay()))].sort() : undefined;
    const block = firstBlock(r.event_location);
    const title = unent(r.event_name).replace(/\s+/g, ' ');
    return {
      id: `permits-${r.event_id}`,
      title: (/[a-z]/.test(title) ? title : title.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())).slice(0, 120),
      emoji,
      type: 'event',
      categories: [cat],
      zone: zoneOf(lat, lon),
      area: `${block[0]}, ${block[1]} to ${block[2]}`.slice(0, 80),
      coords: [lat, lon],
      start,
      end: end < start ? start : end,
      ...(days ? { days } : {}),
      why: `${r.event_type} on ${block[0]} in ${r.event_borough}, permitted by the ${r.event_agency}. ` +
           'This is the city\'s permit, not a listing — it says where and when, and nothing about what it is like.',
      url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`,
      source: 'NYC Permitted Event Information — data.cityofnewyork.us',
      lastVerified: TODAY,
      indoor: false,
      quality: 3,
      uniqueness: 3
    };
  });
}

/* ======================================================================
   Luma — the evenings that are not tech
   ====================================================================== */

/* Luma's discovery calendar is approved rather than open, which is a
   mild quality signal in itself, but it is still a notice board for some
   things nobody goes to for an evening. These are the ones it carried on
   the day this was written: a school board candidate forum, and a
   venture fund's portfolio showcase. */
const LUMA_NOT_FOR_US = /\b(candidate forum|board of education|town hall|portfolio\b.{0,20}\b(showcase|day)|demo day|investor|office hours|hiring|recruit(ing|ment)|career fair|info session)\b/i;

/* An iCal feed carries no tags, so the kind of evening is read off its
   title — and only the title. Reading the description as well filed four
   meetups as food on the first run, because a meetup's blurb promises
   dinner. Ordered, first match wins: a "Bakery Run" is a running club
   that finishes at a bakery, and it is a run. A title that says none of
   these is a gathering, and is called one rather than guessed at. */
const LUMA_KIND = [
  [/\b(run|running|hike|hiking|walk|bike ride|cycling|yoga)\b/i, 'sport',     '🏃'],
  [/\b(read(ing)?|book|poetry|literary|author|writers?)\b/i,     'books',     '📚'],
  [/\b(theatre|theater|improv|comedy|roast)\b/i,                 'theatre',   '🎭'],
  [/\b(concert|music|dj|jazz|choir)\b/i,                         'music',     '🎵'],
  [/\b(film|screening|cinema)\b/i,                               'film',      '🎬'],
  [/\b(art|studio|gallery|exhibit\w*|ceramic|clay|design)\b/i,   'art',       '🖼️'],
  [/\b(market|makers|fair|pop.?up)\b/i,                          'market',    '🛍️'],
  [/\b(coffee|bakery|food|dinner|supper|tasting)\b/i,            'food',      '☕'],
  [/\b(talk|lecture|conversation|psychology|forum|panel)\b/i,    'learn',     '🎤']
];

async function luma(log) {
  const steps = [];
  const step = (label, list) => { steps.push([list.length, label]); return list; };

  let events = [];
  for (const feed of City.luma || []) {
    const got = await lumaFeed(feed, UA);
    /* One calendar going away takes this half down, not the file: run()
       keeps the last run's Luma records when this throws. */
    if (!Array.isArray(got)) throw new Error(`${feed[2]} — ${got.error}`);
    events.push(...got.map(e => ({ ...e, parts: lumaParts(e.desc), feed })));
  }

  const uids = new Set();
  let kept = step(`${events.length} in the calendar`, events.filter(e => {
    if (!e.uid || uids.has(e.uid)) return false;
    uids.add(e.uid); return true;
  }));
  kept = step('has a position', kept.filter(e => icsGeo(e)));
  kept = step('inside the city', kept.filter(e => { const [la, lo] = icsGeo(e); return zoneOf(la, lo) != null; }));
  kept = step('running now or soon', kept.filter(e => {
    const s = icsDate(e.start, TZ), n = icsDate(e.end, TZ) || s;
    return s && n >= TODAY && s <= UNTIL;
  }));
  kept = step('has a link', kept.filter(e => e.parts.url));
  kept = step('not tech — practices.json takes those', kept.filter(e =>
    !LUMA_TECH.test(`${e.title} ${e.parts.why}`)));
  kept = step('not a notice board', kept.filter(e =>
    !LUMA_NOT_FOR_US.test(`${e.title} ${e.parts.why}`)));

  steps.forEach(([n, label]) => log.push([n, label]));

  return kept.map(e => {
    const [lat, lon] = icsGeo(e);
    const [cat, emoji] = (LUMA_KIND.find(([re]) => re.test(e.title)) || [null, 'community', '🫂']).slice(1);
    const start = icsDate(e.start, TZ), end = icsDate(e.end, TZ) || start;
    const address = /luma\.com|lu\.ma/.test(e.loc || '') ? e.parts.address : (strip(e.loc) || e.parts.address);
    return {
      id: 'luma-' + e.uid.replace(/@.*$/, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40),
      title: unent(e.title).slice(0, 120),
      emoji,
      type: 'event',
      categories: [cat],
      zone: zoneOf(lat, lon),
      area: (address || '').slice(0, 80) || null,
      coords: [lat, lon],
      start,
      end: end < start ? start : end,
      why: unent(e.parts.why).slice(0, 320) || 'An evening on Luma.',
      url: e.parts.url,
      source: e.feed[2],
      lastVerified: TODAY,
      quality: 3,
      uniqueness: 3
    };
  });
}

/* ======================================================================
   run
   ====================================================================== */

async function run() {
  console.log(`\n${City.name} — what is on, ${TODAY} to ${UNTIL}\n`);

  const file = path.join(DATA, 'events-city.json');
  let previous = { items: [] };
  try { previous = JSON.parse(await fs.readFile(file, 'utf8')); } catch { /* first run */ }

  /* Only what the city has. A pack naming none of them still has Luma,
     which is the one source that is not anybody's local institution. */
  const want = City.events || {};
  const HALVES = [
    ...(want.localist ? [['stanford', stanford]] : []),
    ...(want.our415   ? [['our415', our415]]     : []),
    ...(want.permits  ? [['permits', permits]]   : []),
    ...(City.luma?.length ? [['luma', luma]]     : [])
  ];
  if (!HALVES.length) {
    console.log(`  ${City.name} declares no event sources — nothing to collect.\n`);
    return;
  }

  const logs = Object.fromEntries(HALVES.map(([n]) => [n, []]));
  const results = {};
  let failures = 0;

  for (const [name, fn] of HALVES) {
    process.stdout.write(`  ${name}\n`);
    try {
      results[name] = await fn(logs[name]);
      logs[name].forEach(([n, label]) => console.log(`  ${String(n).padStart(6)}  ${label}`));
    } catch (e) {
      /* One source going away is not a reason to lose the other, and it
         is certainly not a reason to publish an empty file. The previous
         run's records for that source are kept as they were. */
      failures++;
      const held = (previous.items || []).filter(r => r.id.startsWith(`${name}-`));
      results[name] = held;
      console.log(`         unreachable (${e.message}) — kept ${held.length} from the last run`);
    }
    console.log('');
  }

  if (failures === HALVES.length) {
    console.log('  every source failed — leaving the file exactly as it was\n');
    return;
  }

  /* The same evening can reach two calendars — a Stanford talk that is
     also on Luma. Same title and same day is the same event, and the
     first source through the door keeps it. */
  const flat = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const once = new Set();
  const items = HALVES.flatMap(([n]) => results[n])
    .filter(r => { const k = `${flat(r.title)}|${r.start}`; if (once.has(k)) return false; once.add(k); return true; })
    .filter(r => r.title && r.start && r.end && r.zone != null && r.url)
    .sort((a, b) => a.start.localeCompare(b.start));

  const spread = {};
  items.forEach(r => { spread[r.zone] = (spread[r.zone] || 0) + 1; });
  const free = items.filter(r => r.price === 0).length;
  /* Only where a pack splits itself in two. The Bay does — "is it on my
     side" is the first question anybody asks there — and printing
     "0 on the Peninsula" under a list of Delhi events is the engine
     talking about somewhere else. */
  const sides = {};
  if (City.zone.side) items.forEach(r => {
    const side = City.zone.side[r.zone];
    if (side) sides[side] = (sides[side] || 0) + 1;
  });

  console.log(`  ${items.length} kept · ${free} free · ` +
    `${Object.keys(spread).length}/${Object.keys(City.zone.centroids).length} ${City.zone.many}`);
  if (Object.keys(sides).length)
    console.log('  ' + Object.entries(sides).map(([k, n]) => `${n} ${k}`).join(' · '));

  const doc = {
    generated: TODAY,
    window: { from: TODAY, to: UNTIL },
    source: [want.localist ? 'Stanford Events (events.stanford.edu)' : null,
             want.our415 ? 'Our415 (data.sfgov.org)' : null,
             want.permits ? 'NYC Permitted Event Information (data.cityofnewyork.us)' : null,
             City.luma?.length ? City.luma.map(f => f[2]).join(' · ') : null].filter(Boolean).join(' · '),
    note: 'What the sources that publish say is on. Facts with a source and no opinion — these land in the "sourced" tier, below anything a person wrote. Which halves ran is what the pack declares in `City.events` and `City.luma`; the tech and AI evenings go to practices.json instead, and LUMA_TECH in scripts/ics.mjs is the one line that decides which file an evening lands in.',
    counts: Object.fromEntries(HALVES.map(([n]) => [n, results[n].length])),
    items
  };

  if (DRY) { console.log('\n  --dry, nothing written\n'); return; }
  await fs.writeFile(file, JSON.stringify(doc, null, 1) + '\n', 'utf8');
  console.log(`\n  wrote data/events-city.json — ${Math.round(JSON.stringify(doc).length / 1024)} KB\n`);
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
