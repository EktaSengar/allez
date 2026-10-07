/* ---------------------------------------------------------
   The city's records, kept fresh without an app update.

   The app ships with a copy (engine/<city>.json, written by
   scripts/app-engine.mjs). The files that change week to week — events,
   regulars, the hand-written and researched layers — are fetched from
   allez.city, where the site already serves them, and the last good
   copy is kept for offline. So the weekly drop reaches installed apps
   (APP.md, "What the content has to add").

   The engine itself is bundled, not fetched: a record the bundled engine
   can't read falls back to the copy it shipped with (see answers.js).
   --------------------------------------------------------- */

import AsyncStorage from '@react-native-async-storage/async-storage';
import BUNDLED from '../../engine/bay-area.json';

export const CITY = 'bay-area';
export const SITE = `https://allez.city/${CITY}/`;

const FRESH = ['events', 'events-city', 'regulars', 'editorial', 'notes', 'places', 'food', 'nightlife'];
const KEY = `data:${CITY}`;
const STALE_MS = 6 * 3600 * 1000;

export const bundled = () => BUNDLED;

export async function cached() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return { data: Object.assign({}, BUNDLED, c.files), fetchedAt: c.fetchedAt };
  } catch {
    return null;
  }
}

async function getJSON(url, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* Fetches what changed. Returns the merged data, or null if nothing
   could be fetched — the caller keeps what it has. */
export async function refresh(prev) {
  if (prev && prev.fetchedAt && Date.now() - prev.fetchedAt < STALE_MS) return null;
  const got = await Promise.allSettled(FRESH.map(f => getJSON(`${SITE}data/${f}.json`)));
  const files = {};
  got.forEach((r, i) => { if (r.status === 'fulfilled' && r.value) files[FRESH[i]] = r.value; });
  if (!Object.keys(files).length) return null;
  const fetchedAt = Date.now();
  try { await AsyncStorage.setItem(KEY, JSON.stringify({ fetchedAt, files })); } catch {}
  return { data: Object.assign({}, BUNDLED, files), fetchedAt };
}
