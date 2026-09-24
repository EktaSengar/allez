#!/usr/bin/env node
/* ---------------------------------------------------------
   conferences.mjs — tech conferences, from two open lists.

   The tech evenings came from Luma, whose terms let us read its public
   calendars but not display what is in them. The Tech group on Events
   needed a source that allows it, and these two are maintained in the
   open, by volunteers, as data:

     confs.tech          tech-conferences/conference-data, MIT. One file
                         per topic per year: name, dates, city, link.
     developers.events   scraly/developers-conferences-agenda, content
                         CC BY-NC 4.0. One file of every event: name,
                         dates, "City (Country)", link, topic tags.

   Conferences rather than meetups — nobody publishes meetups openly —
   so this is a few a month, not a few a night. The lists overlap by
   about a fifth; the same name on the same first day is one event, and
   confs.tech keeps it because its names carry no year.

   A file of its own rather than a half of events-city.json, for the
   licences. Paris's events-city.json is built from the city's ODbL feed
   and has to stay ODbL as a whole; CC BY-NC content cannot be
   relicensed that way, so the two do not share a file anywhere.

   Neither list gives a venue, only a city. Where that city is one of the
   pack's own zones (Palo Alto, Gurugram) a record takes the zone's
   centre, which is as precise as the claim; anywhere else it has no
   position and says the city instead, because an invented pin would
   invent a distance. The line under each title is assembled from the
   fields, never copied — neither list writes descriptions.

   The two halves fail independently and neither may empty the file: a
   source that is unreachable keeps the last run's records.

   Usage:  HOMEGROUND_CITY=<city> node scripts/conferences.mjs [--dry] [--days N]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDir, City } from './shim.mjs';

const DATA = dataDir();
const FILE = path.join(DATA, 'conferences.json');
const DRY  = process.argv.includes('--dry');
const DAYS = (() => { const i = process.argv.indexOf('--days'); return i === -1 ? 60 : Number(process.argv[i + 1]); })();
const UA   = 'allez/1.0 (https://github.com/EktaSengar/allez)';

const TODAY = new Date().toISOString().slice(0, 10);
const UNTIL = new Date(Date.now() + DAYS * 86400000).toISOString().slice(0, 10);

const CONFS_TECH = 'https://api.github.com/repos/tech-conferences/conference-data/contents/conferences';
const CONFS_RAW  = 'https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences';
const DEV_EVENTS = 'https://developers.events/all-events.json';

const SOURCE = {
  confs: 'confs.tech — tech-conferences/conference-data (MIT)',
  dev:   'developers.events — Developers Conferences Agenda (CC BY-NC 4.0)'
};

/* The tags arrive lower-case; these read wrong that way. */
const ACRONYM = /\b(ai|ml|llm|api|apis|sap|ux|ui|iot|sre|aws|gcp|css|html|php|qa|devops|mlops|finops|seo)\b/g;

const get = async url => {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
};

/* The pack names the places that count; a conference only ever says a
   city, so this is the whole of the matching. */
const cityOf = s => {
  const flat = String(s || '').toLowerCase();
  return (City.conferences || []).find(c => new RegExp(`\\b${c.toLowerCase()}\\b`).test(flat)) || null;
};

function record(name, start, end, where, url, topics, source) {
  const slug = where.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const zone = slug in City.zone.centroids ? slug : null;
  const days = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
  const length = { 1: 'A one-day', 2: 'A two-day', 3: 'A three-day' }[days] || `A ${days}-day`;
  const on = topics.length ? ` on ${topics.slice(0, 3).map(t => t.replace(ACRONYM, a => ({ devops: 'DevOps', mlops: 'MLOps', finops: 'FinOps', apis: 'APIs' }[a] || a.toUpperCase()))).join(', ')}` : '';
  return {
    id: `conf-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)}-${start}`,
    title: name.slice(0, 120),
    emoji: /\b(ai|ml|llm|machine learning|data)\b/i.test(`${name} ${topics.join(' ')}`) ? '🤖' : '💻',
    type: 'event',
    categories: ['tech'],
    zone,
    ...(zone ? { coords: City.zone.centroids[zone] } : { approx: 'city' }),
    area: where,
    start,
    end: end < start ? start : end,
    why: `${length} conference${on} in ${where}. Tickets and programme on its own site.`,
    url,
    source,
    lastVerified: TODAY,
    indoor: true,
    quality: 3,
    uniqueness: 3
  };
}

async function confsTech(log) {
  const years = [...new Set([TODAY.slice(0, 4), UNTIL.slice(0, 4)])];
  const listed = [];
  for (const y of years) {
    for (const f of await get(`${CONFS_TECH}/${y}`)) {
      if (!f.name.endsWith('.json')) continue;
      const topic = f.name.replace(/\.json$/, '').replace(/-/g, ' ');
      for (const e of await get(`${CONFS_RAW}/${y}/${f.name}`)) listed.push({ ...e, topic });
    }
  }
  log.push([listed.length, 'on confs.tech']);
  const here = listed.filter(e => !(e.online && !e.city) && cityOf(e.city) && e.url);
  log.push([here.length, 'in this city, in person, with a link']);
  const soon = here.filter(e => (e.endDate || e.startDate) >= TODAY && e.startDate <= UNTIL);
  log.push([soon.length, 'running now or soon']);
  /* `general` is confs.tech's file for everything else, not a topic. */
  return soon.map(e => record(e.name, e.startDate, e.endDate || e.startDate, e.city, e.url,
    e.topic === 'general' ? [] : [e.topic], SOURCE.confs));
}

async function developersEvents(log) {
  const iso = ms => new Date(ms).toISOString().slice(0, 10);
  const all = await get(DEV_EVENTS);
  log.push([all.length, 'on developers.events']);
  const here = all.filter(e => Array.isArray(e.date) && e.hyperlink
    && !/^\s*online\s*$/i.test(e.location || '') && cityOf(e.city || e.location));
  log.push([here.length, 'in this city, in person, with a link']);
  const soon = here.filter(e => iso(e.date.at(-1)) >= TODAY && iso(e.date[0]) <= UNTIL);
  log.push([soon.length, 'running now or soon']);
  return soon.map(e => {
    const topics = [...new Set((e.tags || []).filter(t => t.key === 'topic' || t.key === 'tech')
      .map(t => t.value.replace(/-/g, ' ')))];
    return record(e.name, iso(e.date[0]), iso(e.date.at(-1)), e.city || cityOf(e.location),
      e.hyperlink, topics, SOURCE.dev);
  });
}

async function run() {
  console.log(`\n${City.name} — tech conferences, ${TODAY} to ${UNTIL}\n`);
  if (!City.conferences?.length) {
    console.log(`  ${City.name} names no conference cities — nothing to collect.\n`);
    return;
  }

  let previous = { items: [] };
  try { previous = JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { /* first run */ }

  const HALVES = [['confs', confsTech], ['dev', developersEvents]];
  const results = {};
  let failures = 0;
  for (const [name, fn] of HALVES) {
    const log = [];
    process.stdout.write(`  ${name}\n`);
    try {
      results[name] = await fn(log);
      log.forEach(([n, label]) => console.log(`  ${String(n).padStart(6)}  ${label}`));
    } catch (e) {
      failures++;
      results[name] = (previous.items || []).filter(r => r.source === SOURCE[name]);
      console.log(`         unreachable (${e.message}) — kept ${results[name].length} from the last run`);
    }
    console.log('');
  }
  if (failures === HALVES.length) {
    console.log('  every source failed — leaving the file exactly as it was\n');
    return;
  }

  const flat = x => String(x || '').toLowerCase().replace(/\b20\d\d\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const once = new Set();
  const items = HALVES.flatMap(([n]) => results[n])
    .filter(r => { const k = `${flat(r.title)}|${r.start}`; if (once.has(k)) return false; once.add(k); return true; })
    .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  console.log(`  ${items.length} kept, once each`);

  const doc = {
    generated: TODAY,
    window: { from: TODAY, to: UNTIL },
    source: 'confs.tech (MIT) · developers.events (CC BY-NC 4.0)',
    note: 'Tech conferences in this city, from two open lists maintained by volunteers. Facts only: name, dates, city, topic, link — the line under each title is assembled from those, never copied. Kept apart from events-city.json because the licences differ; see DATA-LICENSE.md. Written daily by scripts/conferences.mjs, pruned by scripts/refresh.mjs.',
    items
  };
  if (DRY) {
    items.slice(0, 6).forEach(r => console.log(`   • ${r.start} ${r.title} — ${r.area}`));
    console.log('\n  --dry, nothing written\n');
    return;
  }
  await fs.writeFile(FILE, JSON.stringify(doc, null, 1) + '\n', 'utf8');
  console.log(`  wrote data/conferences.json — ${Math.round(JSON.stringify(doc).length / 1024)} KB\n`);
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
