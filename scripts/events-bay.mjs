#!/usr/bin/env node
/* ---------------------------------------------------------
   events-bay.mjs — what is on in the Bay Area, from sources that publish.

   Not `events.mjs` with a second URL in it, and the reason is that the
   Bay has no analogue of what that script reads. Paris has one municipal
   feed carrying 2,200 cultural listings with coordinates, dates, price
   and a link. San Francisco publishes plenty of open data and none of it
   is that: DataSF's only events dataset is Our415, which is the Rec &
   Park and Public Library programme calendar and is mostly for children.

   So this is three sources, none of them a listings magazine, and
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

   Usage:  HOMEGROUND_CITY=bay-area node scripts/events-bay.mjs [--dry] [--days N]
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

const STANFORD = 'https://events.stanford.edu/api/2/events';

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
    const s = icsDate(e.start), n = icsDate(e.end) || s;
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
    const start = icsDate(e.start), end = icsDate(e.end) || start;
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

  const logs = { stanford: [], our415: [], luma: [] };
  const results = {};
  let failures = 0;
  const HALVES = [['stanford', stanford], ['our415', our415], ['luma', luma]];

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
  const items = [...results.stanford, ...results.our415, ...results.luma]
    .filter(r => { const k = `${flat(r.title)}|${r.start}`; if (once.has(k)) return false; once.add(k); return true; })
    .filter(r => r.title && r.start && r.end && r.zone != null && r.url)
    .sort((a, b) => a.start.localeCompare(b.start));

  const spread = {};
  items.forEach(r => { spread[r.zone] = (spread[r.zone] || 0) + 1; });
  const free = items.filter(r => r.price === 0).length;
  const sides = { city: 0, peninsula: 0 };
  items.forEach(r => { const s = City.zone.side?.[r.zone]; if (s) sides[s]++; });

  console.log(`  ${items.length} kept · ${free} free · ` +
    `${Object.keys(spread).length}/${Object.keys(City.zone.centroids).length} ${City.zone.many}`);
  console.log(`  ${sides.city} in the city · ${sides.peninsula} on the Peninsula`);

  const doc = {
    generated: TODAY,
    window: { from: TODAY, to: UNTIL },
    source: 'Stanford Events (events.stanford.edu) · Our415 (data.sfgov.org) · Luma (luma.com/sf)',
    note: 'What the sources that publish say is on. Facts with a source and no opinion — these land in the "sourced" tier, below anything a person wrote. The Peninsula half is Stanford, which is the only dated source there is south of Daly City.',
    counts: { stanford: results.stanford.length, our415: results.our415.length, luma: results.luma.length },
    items
  };

  if (DRY) { console.log('\n  --dry, nothing written\n'); return; }
  await fs.writeFile(file, JSON.stringify(doc, null, 1) + '\n', 'utf8');
  console.log(`\n  wrote data/events-city.json — ${Math.round(JSON.stringify(doc).length / 1024)} KB\n`);
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
