/* ---------------------------------------------------------
   What the app remembers, and the world it plans from.

   Two stores, on purpose. The engine keeps taste — ratings, wants,
   stated preferences — in its own localStorage, exactly as the site
   does, so a rating means the same thing everywhere. The app keeps what
   only the app has: the two answers, who's coming, and outings with
   their postcards. Both stay on the phone.
   --------------------------------------------------------- */

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { bundled, cached, refresh } from './data';
import { loadLocalStorage } from './storage';
import { homeBase, makeWorld, weekendPlan } from './answers';
import * as Notify from './notify';

const KEY = 'app:state';
const Ctx = createContext(null);

/* How long someone's here sets the dial between known and new. It's a
   starting point; *What Allez knows about you* can move it. */
const NOVELTY = { live: 1.5, moved: 1, until: 2 };

/* Tapping Go starts an outing. "How was it?" is due once it's over: its
   duration plus a little, or nine the next morning if that's late. */
function makeOuting(item, zone) {
  const now = Date.now();
  let due = now + ((item.durationMin ?? 90) + 30) * 60000;
  const d = new Date(due);
  if (d.getHours() >= 22 || d.getHours() < 8) {
    if (d.getHours() >= 22) d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    due = d.getTime();
  }
  return {
    key: `${item.id}-${now.toString(36)}`,
    itemId: item.id, title: item.title, emoji: item.emoji || null,
    zone: item.zone || null, zoneName: zone || null, image: item.image || null,
    type: item.type || null,
    startedAt: now, dueAt: due, here: false, verdict: null
  };
}

export function untilIn(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

const blank = () => ({ profile: { company: [], opens: 0 }, outings: [], decks: {} });

export function AppProvider({ children }) {
  const [boot, setBoot] = useState(null);         // { storage, data, offline }
  const [saved, setSaved] = useState(null);       // the app's own state
  const [where, setWhere] = useState(null);
  const [weather, setWeather] = useState(null);
  const [tick, setTick] = useState(0);            // taste changed: rebuild

  /* ---- launch: storage, data, saved state, location ---- */
  useEffect(() => {
    (async () => {
      const storage = await loadLocalStorage();
      const c = await cached();
      const data = c ? c.data : bundled();
      let s = blank();
      try { const raw = await AsyncStorage.getItem(KEY); if (raw) s = Object.assign(blank(), JSON.parse(raw)); } catch {}
      s.profile.opens = (s.profile.opens || 0) + 1;
      setSaved(s);
      setBoot({ storage, data, fetchedAt: c ? c.fetchedAt : null, offline: false });
      AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});

      refresh(c).then(fresh => {
        if (fresh) setBoot(b => Object.assign({}, b, { data: fresh.data, fetchedAt: fresh.fetchedAt }));
      }).catch(() => setBoot(b => Object.assign({}, b, { offline: true })));
    })();
  }, []);

  useEffect(() => {
    if (!boot || where) return;
    const base = homeBase(boot.data);
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return setWhere(base);
        const pos = (await Location.getLastKnownPositionAsync()) || (await Location.getCurrentPositionAsync({}));
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        /* Outside the pack's area distances mean nothing, so a phone
           elsewhere plans from the city's first base. */
        const box = (boot.data.home && boot.data.home.bbox) || null;
        setWhere(inBay(lat, lon, box) ? { lat, lon, zone: null, area: 'Where you are', label: 'where you are' } : base);
      } catch {
        setWhere(base);
      }
    })();
  }, [boot]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Every change is a copy, saved behind. */
  const update = useCallback(fn => {
    setSaved(prev => {
      const next = fn(JSON.parse(JSON.stringify(prev)));
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  /* ---- the world ---- */
  const novelty = saved ? saved.profile.novelty ?? NOVELTY[saved.profile.horizon] : undefined;
  const prefs = useMemo(() => (novelty != null ? { novelty } : {}), [novelty]);

  const data = boot && boot.data, storage = boot && boot.storage;
  const world = useMemo(() => {
    if (!data || !where) return null;
    return makeWorld({ data, storage, where, prefs, weather });
  }, [data, storage, where, prefs, weather, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Weather, once there is a world to ask: the ranking reads it. */
  useEffect(() => {
    if (!world || weather) return;
    world.E.Weather.setHome(world.where.lat, world.where.lon);
    world.E.Weather.load().then(setWeather).catch(() => {});
  }, [world, weather]);

  /* Thursday's weekend, booked from the plan as it stands now. */
  useEffect(() => {
    if (!world || !saved) return;
    try {
      const plan = weekendPlan(world, { company: saved.profile.company });
      const first = plan.days.flatMap(d => d.stops)[0];
      Notify.weekendReady(first ? first.item.title : null);
    } catch {}
  }, [world]); // eslint-disable-line react-hooks/exhaustive-deps -- once per new world, not per saved change

  /* Permission is asked once, after the first save or Go. */
  const askOnce = useCallback(async () => {
    if (saved && saved.profile.notifyAsked) return Notify.allowed();
    update(x => { x.profile.notifyAsked = true; return x; });
    return Notify.ask();
  }, [saved, update]);

  /* ---- actions ---- */
  const actions = useMemo(() => ({
    setProfile(patch) {
      update(s => { Object.assign(s.profile, patch); return s; });
    },
    rate(id, value) {
      if (!world) return;
      world.E.Store.setRating(id, value);
      setTick(t => t + 1);
    },
    save(item) {
      if (!world) return false;
      const on = world.E.Store.setRating(item.id, 'want') === 'want';
      setTick(t => t + 1);
      askOnce();
      return on;
    },
    less(item) {
      if (!world) return;
      world.E.Store.setRating(item.id, 'never');
      setTick(t => t + 1);
    },
    go(item, zone) {
      const outing = makeOuting(item, zone);
      update(s => { s.outings.unshift(outing); return s; });
      askOnce().then(ok => ok && Notify.howWasIt(outing));
      return outing;
    },
    here(key) {
      update(s => { const o = s.outings.find(x => x.key === key); if (o) o.here = true; return s; });
    },
    verdict(key, verdict, anyway) {
      const o = saved && saved.outings.find(x => x.key === key);
      if (!o) return;
      if (world && ['loved', 'good', 'meh'].includes(verdict)) {
        world.E.Store.setRating(o.itemId, verdict);
        if (o.zone && !world.E.Store.hasZone(o.zone)) world.E.Store.toggleZone(o.zone);
        setTick(t => t + 1);
      }
      update(s => {
        const x = s.outings.find(y => y.key === key);
        x.verdict = verdict; x.anyway = anyway ?? null; x.ratedAt = new Date().toISOString();
        if (weather && weather.byDate) {
          const iso = new Date(x.startedAt).toISOString().slice(0, 10);
          const wx = weather.byDate[iso];
          if (wx) x.weather = `${wx.label}, ${wx.tmax}°`;
        }
        return s;
      });
    },
    postcard(key, { line, photo }) {
      update(s => { const x = s.outings.find(y => y.key === key); if (x) { x.line = line || null; x.photo = photo || null; x.postcard = true; } return s; });
    },
    setCompany(company) {
      update(s => { s.profile.company = company; return s; });
    },
    saveDeck(id, deck) {
      update(s => { s.decks = { [id]: deck }; return s; });
    },
    async reset() {
      await Notify.cancelAll();
      boot.storage.clear();
      update(() => blank());
      setTick(t => t + 1);
    }
  }), [world, weather, update, boot, saved, askOnce]);

  const value = useMemo(() => ({
    ready: !!(world && saved),
    world, saved, where, weather,
    offline: boot ? boot.offline : false,
    fetchedAt: boot ? boot.fetchedAt : null,
    tick,
    ...actions
  }), [world, saved, where, weather, boot, tick, actions]);

  return createElement(Ctx.Provider, { value }, children);
}

export const useApp = () => useContext(Ctx);

function inBay(lat, lon, box) {
  if (box) { const [s, w, n, e] = box; return lat >= s && lat <= n && lon >= w && lon <= e; }
  return lat >= 36.9 && lat <= 38.3 && lon >= -123.1 && lon <= -121.5;
}

/* Counts for My city: outings, neighbourhoods, regulars. */
export function cityStats(outings) {
  const went = outings.filter(o => ['loved', 'good', 'meh'].includes(o.verdict));
  const zones = new Set(went.map(o => o.zone).filter(Boolean));
  const counts = {};
  went.forEach(o => { counts[o.itemId] = (counts[o.itemId] || 0) + 1; });
  const regulars = Object.entries(counts).filter(([, n]) => n >= 3)
    .map(([id, n]) => ({ id, n, title: went.find(o => o.itemId === id).title }));
  return { outings: went.length, zones: zones.size, regulars, counts };
}
