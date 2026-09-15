#!/usr/bin/env node
/* ---------------------------------------------------------
   practices.mjs — things you take up, rather than things you attend.

   The site has always had two shapes: dated events that expire on their
   own, and evergreen places that never do. A weekly dance class is
   neither. It is a *practice* — something with a rhythm, that you go
   back to, and that is worth knowing about precisely because it repeats.

   Nothing here is a new source. The city's own feed already carries the
   repetition: `occurrences` holds every date a listing runs, and 736 of
   its 3,315 records repeat four times or more. `Cours de danse de bal —
   Paris 10e — 1er cours offert` has forty-two dates in it. paris.fr
   renders that as one row among three thousand, showing a date.

   **The transformation this file exists to perform is occurrence →
   practice.** Forty-two dates become "a dance class in the 10th, weekly
   from September to June". That is a fact the city published and did not
   say, and saying it is the whole point of the file.

   Two sources, both keyless:
     que-faire-a-paris-   recurring adult workshops, from the city
     api.lu.ma            the tech and AI evenings, which the city has none of

   These are `sourced` records — facts with a source, no opinion. They
   rank below anything a person wrote. The English line on a French
   record is assembled from the record's own fields and never translated
   or invented; see gloss() for why that distinction matters.

   Usage:  node scripts/practices.mjs [--dry] [--days N]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDir } from './shim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = dataDir();
const DRY  = process.argv.includes('--dry');

/* Ninety rather than the sixty `events.mjs` uses. A term-length practice
   is announced before it starts — the autumn writing workshops appear in
   the feed in August — and a window that only looks two months ahead
   drops the ones worth planning around. */
const DAYS = (() => { const i = process.argv.indexOf('--days'); return i === -1 ? 90 : Number(process.argv[i + 1]); })();

const QFAP = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records';
const UA   = 'allez/1.0 (https://github.com/EktaSengar/allez)';

/* Luma publishes an iCal feed per calendar with no key and no account.
   `discover` is a whole city — every approved public event in Paris,
   about forty at a time on a rolling month.

   Station F is deliberately not a second feed, having been checked:
   `luma.com/stationf` and `luma.com/station-f` are both 404, and the two
   calendars its own events page links to are somebody's calendar named
   "Personal" and the Foresight Institute's — a global calendar whose
   next twenty events are mostly Stockholm and mostly without
   coordinates. Neither is Station F's, and what they carry that is in
   Paris already arrives through `discover`. Do not re-add them thinking
   they are the incubator's; they are not.

   This endpoint is undocumented and internal, and can change or vanish
   without notice. That is survivable and must stay survivable: a failed
   fetch has to leave the previous file alone rather than write an empty
   one. See run() — the city half and the Luma half fail independently. */
const LUMA = [
  ['discover', 'discplace-NdLrh1xJfeotJZC', 'Luma — What‘s Happening in Paris']
];
const lumaUrl = ([entity, id]) => `https://api.lu.ma/ics/get?entity=${entity}&id=${id}`;

const TODAY = new Date().toISOString().slice(0, 10);
const UNTIL = new Date(Date.now() + DAYS * 86400000).toISOString().slice(0, 10);

/* ---------- shared ---------- */

const strip = s => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const ZONE = {
  1:[48.8626,2.3363],  2:[48.8683,2.3413],  3:[48.8637,2.3615],  4:[48.8546,2.3572],
  5:[48.8448,2.3501],  6:[48.8496,2.3329],  7:[48.8565,2.3120],  8:[48.8726,2.3120],
  9:[48.8768,2.3374],  10:[48.8760,2.3595], 11:[48.8578,2.3792], 12:[48.8351,2.4212],
  13:[48.8322,2.3556], 14:[48.8331,2.3264], 15:[48.8412,2.3003], 16:[48.8637,2.2769],
  17:[48.8872,2.3070], 18:[48.8925,2.3444], 19:[48.8817,2.3822], 20:[48.8631,2.3980]
};

/* Only used when a record carries coordinates but no readable postcode —
   the Luma half, mostly, where the address is sometimes withheld until
   you register but the pin is always there. */
const nearestArr = (lat, lon) => {
  let best = null, bestD = Infinity;
  for (const [a, [y, x]] of Object.entries(ZONE)) {
    const d = (y - lat) ** 2 + (x - lon) ** 2;
    if (d < bestD) { bestD = d; best = Number(a); }
  }
  return best;
};

const PARIS_BOX = { latMin: 48.80, latMax: 48.92, lonMin: 2.21, lonMax: 2.48 };
const inParis = (lat, lon) =>
  lat >= PARIS_BOX.latMin && lat <= PARIS_BOX.latMax &&
  lon >= PARIS_BOX.lonMin && lon <= PARIS_BOX.lonMax;

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ======================================================================
   the city half
   ====================================================================== */

/* `Atelier` on its own files half the feed and singles out nothing — it
   is on children's mask-making and on senior-club afternoons alike. It
   earns a place here only alongside a subject, and the subject is what
   the record is actually about. Each entry: the site's own category, an
   emoji, and the English noun that goes into the gloss.

   `Sport` is deliberately absent. The feed carries eighty-three
   recurring adult sport sessions — free municipal rugby, yoga, boxing —
   and they belong on the Sport tab, which already splits Play from
   Watch. A rugby club in a list of book clubs would be a worse answer
   than no answer. */
const SUBJECT = {
  'Littérature':      ['books',   '📝', 'Writing and reading workshop'],
  'Danse':            ['dance',   '💃', 'Dance class'],
  'Peinture':         ['art',     '🎨', 'Painting workshop'],
  'Art contemporain': ['art',     '🖼️', 'Art workshop'],
  'Photo':            ['art',     '📷', 'Photography workshop'],
  'Cirque':           ['circus',  '🎪', 'Circus class'],
  'Humour':           ['comedy',  '😄', 'Comedy workshop'],
  'Gourmand':         ['food',    '🍽️', 'Cooking workshop'],
  'BD':               ['books',   '📚', 'Comics workshop']
};

/* Same municipal notice board `events.mjs` declines, for the same
   reason. `Enfants` is here as well as in the audience test below
   because the tag and the stated audience disagree often enough that
   both are worth asking. */
const NOT_FOR_US = new Set(['Enfants', 'Solidarité', 'Santé', 'Sciences', 'Innovation']);

/* A tag that says "this is a show" — something with an audience and a
   run, rather than a thing you join. `Atelier` alongside one of these
   almost always means a workshop bolted onto an event: a Korean harvest
   festival with a cooking table at it came through as "Cooking workshop
   · most days", a Design Week exhibition as an art workshop, and a
   film-and-philosophy evening as theatre because it happened to be held
   in a theatre.

   None of those is a practice, and the tag was there to say so all
   along. A dance workshop inside a festival goes too, and should: it
   runs for the length of the festival and then it is gone. */
const A_SHOW = new Set(['Festival', 'Expo', 'Concert', 'Spectacle musical',
  'Brocante', 'Nuit']);

/* Two tags are deliberately not in that set, both because the feed uses
   them more loosely than their names suggest.

   `Salon` means a trade fair, and excluding it dropped exactly one
   record across the whole feed: the ballroom class in the 10th, which
   carries it for reasons of its own. A rule whose entire effect is to
   delete a true positive is not a rule.

   `Ecrans` means film, and its only honest catch was a
   film-and-philosophy evening held in a theatre — which is now dropped
   anyway, because `Théâtre` turned out to be worth nothing as a subject.
   There is exactly one recurring `Théâtre` + `Atelier` record in the
   feed and that evening was it, so the tag only ever admitted its own
   false positive. Left in, `Ecrans` would also have taken a K-pop dance
   workshop, and dance is the thinnest subject here. */

/* Two, not four. Four was drawn to separate a practice from a short
   run, and it does — but it also took the section from twenty-three
   records to fourteen, and the nine it dropped were most of the theatre
   and half the dance. A two-session workshop is still a thing you sign
   up for rather than an evening you attend, which is the distinction
   this file is actually built on.

   What is lost is not accuracy: the cadence in the gloss still tells a
   reader the difference between "weekly, Sep–Jun" and "2 dates". The
   line moved; the honesty did not. */
const REPEATS = 2;

/* One per venue. A single atelier with five listings would otherwise be
   most of a section that only shows six rows. */
const PER_VENUE = 1;

const tagsOf = e => (e.qfap_tags || '').split(';').map(s => s.trim()).filter(Boolean);

const zoneOf = e => {
  const z = (e.address_zipcode || '').replace(/\s/g, '');
  return /^75\d{3}$/.test(z) ? Number(z.slice(3)) || null : null;
};

/* Lifted from events.mjs unchanged, and for the reason written there:
   the tags miss youth workshops, the feed states its audience in a
   structured way, and the honest test is whether adults are in the
   intended audience at all rather than whether children are mentioned. */
const forChildrenOnly = e => {
  const a = (e.audience || '').toLowerCase();
  return /\b(enfants?|jeunes?|tout-petits)\b/.test(a) && !a.includes('adulte');
};

/* That test is right for events and not strict enough for these. A
   family workshop at the Arc de triomphe states "Public enfants, jeunes
   et adultes. A partir de 6 ans." — adults are genuinely welcome, so the
   test above passes it, and it reached the section as a writing
   practice. It is a children's activity a parent attends.

   The stated minimum age settles it without guessing from the title.
   Fifteen is where "you could take this up" stops meaning "bring your
   six-year-old"; the feed's own thresholds cluster at 6, 8, 12 and 16,
   so the line falls in a gap rather than through a crowd. */
/* `[àa]` rather than `à`: the feed writes "A partir de 6 ans." with a
   bare capital A about as often as it writes the accent, and a
   case-insensitive flag does not make à match a. */
const minAge = e => {
  const m = (e.audience || '').match(/[àa] partir de\s+(\d+)\s*ans/i);
  return m ? Number(m[1]) : null;
};
const notForAdults = e => forChildrenOnly(e) || (minAge(e) !== null && minAge(e) < 15);

/* ---------- reading the rhythm ----------

   `occurrences` arrives as "start_end;start_end;…" in local time. Every
   date the thing runs is in there, which is enough to answer the two
   questions a person actually has — how often, and which day.

   The weekday matters more than it looks: `days` is a field the ranking
   already understands (js/scoring.js:53 hides a record on days it does
   not run), so a Thursday class correctly goes quiet on a Monday. That
   is the site's existing recurrence primitive and this fills it in. */
function rhythm(raw) {
  const starts = String(raw || '').split(';')
    .map(s => s.split('_')[0].trim()).filter(Boolean)
    .map(s => new Date(s)).filter(d => !isNaN(d))
    .sort((a, b) => a - b);
  if (starts.length < REPEATS) return null;

  const gaps = starts.slice(1).map((d, i) => Math.round((d - starts[i]) / 86400000))
    .filter(g => g > 0).sort((a, b) => a - b);
  const median = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;

  /* A school running four parallel evening groups publishes them as one
     listing with two hundred dates in it, several on the same day. The
     gap between dates is the honest way to describe that — "216 dates"
     is true and tells a reader nothing they can act on. */
  const cadence = median <= 1                  ? 'most days'
                : median <= 5                  ? 'several times a week'
                : median >= 6  && median <= 8  ? 'weekly'
                : median >= 12 && median <= 16 ? 'fortnightly'
                : median >= 26 && median <= 32 ? 'monthly'
                : `${starts.length} dates`;

  /* Only claim a weekday when there genuinely is one. A course that
     meets Tuesdays and Thursdays keeps both; one scattered across five
     weekdays has no rhythm to state and gets none, rather than being
     described as something it is not. */
  const dows = [...new Set(starts.map(d => d.getDay()))].sort();

  return {
    count: starts.length,
    cadence,
    days: dows.length <= 2 ? dows : null,
    first: starts[0],
    last: starts[starts.length - 1]
  };
}

/* ---------- the English line ----------

   The title stays exactly as the city published it. This is the line
   underneath, and every part of it is assembled from a field the record
   already carries: the subject tag becomes a noun, the occurrence dates
   become a cadence and a span, and that is all.

   Nothing here is translated and nothing is invented, which is what
   keeps a `sourced` record sourced. The rule this layer lives under is
   that it may restate the city's facts but may never claim the two of
   them would enjoy something — and a rule against opinion is not a rule
   against English. A translation model would blur that line; a lookup
   table cannot. */
function gloss(noun, r) {
  const span = r.first.getFullYear() === r.last.getFullYear() &&
               r.first.getMonth() === r.last.getMonth()
    ? MONTH[r.first.getMonth()]
    : `${MONTH[r.first.getMonth()]}–${MONTH[r.last.getMonth()]}`;
  return `${noun} · ${r.cadence}, ${span}`;
}

async function cityRaw() {
  const where = `date_end>=date'${TODAY}' and date_start<=date'${UNTIL}'`;
  const out = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const url = `${QFAP}?where=${encodeURIComponent(where)}&limit=100&offset=${offset}`;
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`opendata.paris.fr → ${res.status}`);
    const json = await res.json();
    if (!json.results || !json.results.length) break;
    out.push(...json.results);
    process.stdout.write('.');
  }
  return out;
}

function cityRecords(raw, log) {
  const step = (label, list) => { log.push([list.length, label]); return list; };

  let kept = step('has coordinates and an official link',
    raw.filter(e => e.lat_lon?.lat && e.url));
  kept = step('inside Paris', kept.filter(e => zoneOf(e)));
  kept = step('not the municipal notice board',
    kept.filter(e => !tagsOf(e).some(t => NOT_FOR_US.has(t))));
  kept = step('for adults, not for families',
    kept.filter(e => !notForAdults(e)));
  kept = step('a workshop, not a performance',
    kept.filter(e => tagsOf(e).includes('Atelier')));
  kept = step('a thing you join, not a thing with a run',
    kept.filter(e => !tagsOf(e).some(t => A_SHOW.has(t))));
  kept = step('about a subject worth taking up',
    kept.filter(e => tagsOf(e).some(t => SUBJECT[t])));

  const withRhythm = [];
  for (const e of kept) {
    const r = rhythm(e.occurrences);
    if (r) withRhythm.push([e, r]);
  }
  step(`repeats at least ${REPEATS} times — a practice, not a run`, withRhythm);

  const venues = new Map();
  const capped = withRhythm.filter(([e]) => {
    const v = e.address_name || e.title;
    if ((venues.get(v) || 0) >= PER_VENUE) return false;
    venues.set(v, (venues.get(v) || 0) + 1);
    return true;
  });
  step(`at most ${PER_VENUE} per venue`, capped);

  return capped.map(([e, r]) => {
    const tags = tagsOf(e);
    const tag = tags.find(t => SUBJECT[t]);
    const [category, emoji, noun] = SUBJECT[tag];
    const free = e.price_type === 'gratuit';

    return {
      id: 'prac-' + String(e.event_id || e.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40),
      /* Verbatim. "Cours de danse de bal — Paris 10e — 1er cours offert"
         says more than a translation of it would, and it is what the
         venue will call it when you get there. */
      title: strip(e.title).slice(0, 120),
      emoji,
      type: 'class',
      mode: 'do',
      categories: [...new Set([category, 'learn'])],
      zone: zoneOf(e),
      area: strip(e.address_name).slice(0, 80) || null,
      coords: [e.lat_lon.lat, e.lat_lon.lon],
      start: (e.date_start || '').slice(0, 10),
      end: (e.date_end || '').slice(0, 10),
      ...(r.days ? { days: r.days } : {}),
      /* The city's own wording for the schedule, kept in French next to
         an English summary of the same thing. One is checkable against
         the venue's door; the other is readable at a glance. */
      times: strip(e.date_description).slice(0, 140) || null,
      why: gloss(noun, r),
      ...(free ? { price: 0, priceNote: 'Free', labels: ['free', 'learn'] }
               : { priceNote: strip(e.price_detail).slice(0, 60) || 'Paid', labels: ['learn'] }),
      url: e.url,
      source: 'Que Faire à Paris — opendata.paris.fr',
      lastVerified: TODAY,
      indoor: e.event_indoor === 1 || e.event_indoor === true ? true
            : e.event_indoor === 0 || e.event_indoor === false ? false : undefined,
      /* Flat, for the reason events.mjs is flat: the feed says nothing
         about whether one listing is better than another, and guessing
         would be exactly the opinion this layer must not have. */
      quality: 3,
      uniqueness: 3
    };
  });
}

/* ======================================================================
   the Luma half
   ====================================================================== */

/* iCal folds long lines by starting the continuation with a space, so
   nothing can be read until the folding is undone. Everything after that
   is one field per line.

   DESCRIPTION is deliberately left escaped. Luma structures it as three
   blocks separated by a literal `\n\n`, and unescaping first would
   flatten the separators into ordinary spaces and lose the structure —
   which is where the canonical URL and the street address live. */
function parseICS(text) {
  const body = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  return body.split('BEGIN:VEVENT').slice(1).map(block => {
    const get = key => {
      const m = block.match(new RegExp(`^${key}[^:\\n]*:(.*)$`, 'm'));
      return m ? m[1].trim() : null;
    };
    return {
      uid:   get('UID'),
      title: unescapeICS(get('SUMMARY')),
      start: get('DTSTART'),
      end:   get('DTEND'),
      loc:   unescapeICS(get('LOCATION')),
      geo:   get('GEO'),
      desc:  get('DESCRIPTION')      /* still escaped — see lumaParts() */
    };
  });
}

const unescapeICS = s => (s || '')
  .replace(/\\n/g, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
  .replace(/\s+/g, ' ').trim();

/* "20260907T170000Z" → "2026-09-07" */
const icsDate = s => {
  const m = String(s || '').match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

/* Luma writes the description in a fixed shape:

     Get up-to-date information at: https://luma.com/<slug>
     Address:
     <the street address, or "Check event page for more details.">
     <the organiser's own text, however many blocks of it>

   Which makes the first two blocks worth more than the boilerplate they
   look like. Block 0 carries the canonical short link — better than
   rebuilding one from the UID and guessing at Luma's URL shape. Block 1
   carries a street address for events whose LOCATION field is only a
   luma.com link, which is fifteen of the forty in the Paris feed. */
function lumaParts(desc) {
  const blocks = String(desc || '').split('\\n\\n');
  const url = (blocks[0] || '').match(/https?:\/\/\S+/)?.[0]?.replace(/[.,]$/, '') || null;
  const addrRaw = unescapeICS((blocks[1] || '').replace(/^Address:\s*/i, ''));
  const address = /check event page/i.test(addrRaw) ? null : addrRaw || null;
  return { url, address, why: unescapeICS(blocks.slice(2).join(' ')) };
}

/* A keyword gate, and a crude one — an iCal feed has no tags to read
   instead. Tight on purpose, and tuned against the live feed: the Paris
   calendar carries a backgammon social, two gallery openings, a padel
   tournament and a watercolour workshop alongside the AI evenings, and
   the hobbies half of this file is already served by a source with real
   tags on it. Better to miss a tech event than to file a vernissage
   under `tech`.

   The business vocabulary of the startup scene — founder, product,
   SaaS, pre-seed — is deliberately absent. It matched a padel night and
   a VC rooftop cocktail and nothing that was about building anything.

   French earns its own terms rather than being translated into the
   English ones: `IA` and `intelligence artificielle` are how half this
   feed refers to the subject, and without them "Les Apéros de l'IA" and
   "créer son MCP maison" both fall out. */
const TECH = new RegExp('\\b(' + [
  'a\\.?i\\.?', 'ia', 'intelligence artificielle', 'llms?', 'gpt', 'genai',
  'machine learning', 'deep learning', 'neural', 'agents?', 'inference', 'rag',
  'mcp', 'mlops', 'devops', 'developer', 'dev', 'engineer', 'engineering',
  'software', 'open ?source', 'hackathon', 'api', 'database', 'data',
  'robotics', 'hardware', 'infra', 'technolog', 'tech'
].join('|') + ')\\b', 'i');

async function lumaRecords(log) {
  const seen = new Set();
  const out = [];

  for (const feed of LUMA) {
    const [, , label] = feed;
    let text;
    try {
      const res = await fetch(lumaUrl(feed), {
        headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) throw new Error(String(res.status));
      text = await res.text();
    } catch (e) {
      /* One calendar going away is not a reason to lose the others. */
      log.push([0, `${label} — unreachable (${e.message})`]);
      continue;
    }

    const events = parseICS(text);
    let kept = 0;
    for (const e of events) {
      if (!e.uid || !e.title || !e.start) continue;
      const start = icsDate(e.start);
      if (!start || start < TODAY || start > UNTIL) continue;

      const parts = lumaParts(e.desc);
      if (!TECH.test(`${e.title} ${parts.why}`)) continue;
      /* No link, no record — the same rule the rest of the sourced layer
         lives under, and here it also means no way to register. */
      if (!parts.url) continue;

      const g = String(e.geo || '').split(';').map(Number);
      if (g.length !== 2 || !g.every(Number.isFinite)) continue;
      const [lat, lon] = g;
      if (!inParis(lat, lon)) continue;

      const id = 'luma-' + e.uid.replace(/@.*$/, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
      if (seen.has(id)) continue;
      seen.add(id);

      /* LOCATION is a street address when the organiser published one
         and a luma.com link when they did not; the description's own
         Address block fills in most of the rest. The postcode is the
         better answer for the arrondissement where either has one, and
         the pin is the fallback. */
      const address = /luma\.com|lu\.ma/.test(e.loc || '')
        ? parts.address : (strip(e.loc) || parts.address);
      const zip = `${e.loc || ''} ${parts.address || ''}`.match(/\b75(\d{3})\b/);
      const zone = (zip && Number(zip[1])) || nearestArr(lat, lon);

      out.push({
        id,
        title: strip(e.title).slice(0, 120),
        emoji: /\b(a\.?i\.?|ia|llm|gpt|genai|machine learning|agents?)\b/i.test(e.title) ? '🤖' : '💻',
        type: 'event',
        mode: 'do',
        categories: ['tech', 'learn'],
        zone,
        area: (address || '').slice(0, 80) || null,
        coords: [lat, lon],
        start,
        end: icsDate(e.end) || start,
        why: parts.why.slice(0, 320) || 'Tech and AI meetup in Paris.',
        url: parts.url,
        source: label,
        lastVerified: TODAY,
        indoor: true,
        labels: ['learn', 'afterwork'],
        quality: 3,
        uniqueness: 3
      });
      kept++;
    }
    log.push([kept, `${label} — ${events.length} in the feed`]);
  }
  return out;
}

/* ======================================================================
   run
   ====================================================================== */

async function run() {
  process.stdout.write(`\nPractices — ${TODAY} to ${UNTIL}\n\n  city feed `);

  const cityLog = [], lumaLog = [];
  let city = [];
  try {
    const raw = await cityRaw();
    console.log(`\n  ${raw.length} live in the window\n`);
    city = cityRecords(raw, cityLog);
    cityLog.forEach(([n, label]) => console.log(`  ${String(n).padStart(5)}  ${label}`));
  } catch (e) {
    console.log(`\n  city feed unreachable — ${e.message}`);
  }

  console.log('\n  luma');
  const luma = await lumaRecords(lumaLog);
  lumaLog.forEach(([n, label]) => console.log(`  ${String(n).padStart(5)}  ${label}`));

  const items = [...city, ...luma].filter(r => r.start && r.title && r.zone);

  /* Writing an empty file is the one outcome worse than writing nothing:
     the previous run's records are real and still valid, and a network
     blip must not delete them. Same rule events-city.json lives under. */
  if (!items.length) {
    console.log('\n  nothing came back from either source — leaving the file alone\n');
    return;
  }

  const spread = {};
  items.forEach(r => { spread[r.zone] = (spread[r.zone] || 0) + 1; });
  console.log(`\n  ${items.length} kept · ${city.length} city · ${luma.length} luma · ` +
              `${Object.keys(spread).length}/20 arrondissements`);
  console.log('  per arrondissement:', Object.entries(spread)
    .sort((a, b) => a[0] - b[0]).map(([a, n]) => `${a}:${n}`).join(' '));

  if (DRY) {
    console.log('\n  sample:');
    items.slice(0, 12).forEach(r =>
      console.log(`   • ${r.emoji} ${r.title.slice(0, 60)}\n     ${r.zone}e · ${r.why.slice(0, 70)}`));
    console.log('\n  --dry, nothing written\n');
    return;
  }

  const doc = {
    generated: TODAY,
    window: { from: TODAY, to: UNTIL },
    source: 'Que Faire à Paris · opendata.paris.fr (Licence Ouverte) · Luma',
    note: 'Things you take up rather than attend — `mode: "do"`. The city feed already carries the repetition in its `occurrences` field and shows it as a date; this reads it as a rhythm, which is the whole point of the file. English lines are assembled from each record\'s own fields, never translated. Luma covers the tech and AI evenings the city has none of. These are `sourced` records and rank below anything hand-written. The gate lives in scripts/practices.mjs; pruned daily by scripts/refresh.mjs.',
    items
  };
  await fs.writeFile(path.join(DATA, 'practices.json'), JSON.stringify(doc, null, 2) + '\n', 'utf8');
  const kb = Math.round((await fs.stat(path.join(DATA, 'practices.json'))).size / 1024);
  console.log(`\n  wrote data/practices.json — ${kb} KB\n`);
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
