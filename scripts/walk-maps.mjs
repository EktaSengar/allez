#!/usr/bin/env node
/* ---------------------------------------------------------
   walk-maps.mjs — a drawn map for a walk somebody actually did.

   A screenshot of Google Maps is someone else's picture (their terms
   don't let us republish it), it can't be tapped, and it looks like
   every other map. So a walk with a `map` block in its itineraries.json
   record gets its own illustration instead: OpenStreetMap's coastline,
   parks and piers on paper, the real walking line between the stops,
   numbered stamps, and a few drawn things that say what the day was.

   Two phases, so the picture can be redrawn without the network:

     --fetch   asks OSRM (foot profile, routing.openstreetmap.de) for the
               path between consecutive walking stops, and Overpass for
               the coastline, green space, piers and big roads inside the
               map's bbox. Both are simplified and cached in
               scripts/walk-maps/<id>.json — small enough to commit.
     (default) draws <city>/<map.file> from that cache. Deterministic:
               the same cache gives byte-identical SVG.

   The SVG is a printed object with its own paper colour, so it reads the
   same in light and dark — an <img> can't see the page's theme toggle,
   and a map that half-follows it is worse than one that doesn't try.
   Text uses system serifs only: an SVG in an <img> loads no web fonts.

   Record shape (in the itinerary):
     "map": { "file": "img/maps/x.svg", "bbox": [s, w, n, e],
              "title": "...", "subtitle": "...", "decor": [ ... ] }
     each stop: "at": [lat, lon], "short": "label on the map",
                "by": "car" for a leg that isn't walked (drawn dashed,
                off the edge if the stop is outside the bbox),
                "label": [dx, dy] to place the label, "anchor" to align it,
                "xy": [x, y] to pin an off-map stop's stamp by hand,
                "via": [[lat, lon], ...] to hold the leg to a particular way.

   Map data © OpenStreetMap contributors (ODbL) — credited on the map.

   Usage:  node scripts/walk-maps.mjs [--fetch] [--city bay-area]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'scripts', 'walk-maps');
const FETCH = process.argv.includes('--fetch');
const ci = process.argv.indexOf('--city');
const CITIES = ci > 0 ? [process.argv[ci + 1]] : ['bay-area', 'paris', 'new-york', 'delhi', 'bengaluru'];
const UA = 'allez/1.0 (personal site; https://github.com/EktaSengar/allez)';

const W = 900;                       // viewBox width; height follows the bbox
const r5 = n => Math.round(n * 1e5) / 1e5;
const f1 = n => (Math.round(n * 10) / 10).toString();

/* ---------- geometry ---------- */

/* Douglas–Peucker on [lon, lat] pairs, tolerance in degrees. */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let best = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      // a closed ring starts and ends on the same point: measure from it
      const d = len ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len
                    : Math.hypot(pts[i][0] - ax, pts[i][1] - ay);
      if (d > best) { best = d; idx = i; }
    }
    if (best > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const area = ring => {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    s += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return s / 2;   // >0 counter-clockwise in lon/lat (y up)
};

/* Join coastline ways end to start into chains. */
function chains(ways) {
  const key = p => `${p[0]},${p[1]}`;
  const left = ways.map(w => w.slice());
  const out = [];
  while (left.length) {
    let c = left.shift();
    for (let grew = true; grew;) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        if (key(left[i][0]) === key(c[c.length - 1])) { c = c.concat(left[i].slice(1)); left.splice(i, 1); grew = true; break; }
        if (key(left[i][left[i].length - 1]) === key(c[0])) { c = left[i].concat(c.slice(1)); left.splice(i, 1); grew = true; break; }
      }
    }
    out.push(c);
  }
  return out;
}

/* Land polygons from coastline chains. OSM draws the coast with land on
   the left, so each piece that crosses the frame is closed by walking the
   frame's edge counter-clockwise to the next place the coast comes back
   in. Rings that never leave the frame are islands (or lakes) as they are. */
function landRings(coast, [s, w, n, e]) {
  const inside = p => p[0] >= w && p[0] <= e && p[1] >= s && p[1] <= n;
  const P = 2 * ((e - w) + (n - s));
  // position along the frame, counter-clockwise from the south-west corner
  const perim = ([x, y]) => {
    const eps = 1e-9;
    if (Math.abs(y - s) < eps) return x - w;
    if (Math.abs(x - e) < eps) return (e - w) + (y - s);
    if (Math.abs(y - n) < eps) return (e - w) + (n - s) + (e - x);
    return 2 * (e - w) + (n - s) + (n - y);
  };
  const corners = [[e, s], [e, n], [w, n], [w, s]].map(c => [c, perim(c)]);
  const cross = (a, b) => {   // where segment a→b meets the frame (first hit from a)
    let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - w], [dx, e - a[0]], [-dy, a[1] - s], [dy, n - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    return t0 > t1 ? null : [t0, t1];
  };
  const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  const pieces = [], rings = [];
  for (const c of coast) {
    const closed = c.length > 3 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1];
    if (closed && c.every(inside)) { rings.push(c); continue; }
    let cur = inside(c[0]) ? [c[0]] : null;
    for (let i = 1; i < c.length; i++) {
      const a = c[i - 1], b = c[i], hit = cross(a, b);
      if (!hit) continue;
      const [t0, t1] = hit;
      if (!cur) cur = [at(a, b, t0)];
      if (t1 < 1) { cur.push(at(a, b, t1)); pieces.push(cur); cur = null; }
      else cur.push(b);
    }
    if (cur) pieces.push(cur);
  }
  const used = new Set();
  for (let i = 0; i < pieces.length; i++) {
    if (used.has(i)) continue;
    const ring = []; let k = i;
    while (!used.has(k)) {
      used.add(k);
      const p = pieces[k];
      ring.push(...p);
      const tOut = perim(p[p.length - 1]);
      // the next entry counter-clockwise from here
      let best = null, bd = Infinity;
      pieces.forEach((q, j) => {
        const d = (perim(q[0]) - tOut + P) % P;
        if (d < bd) { bd = d; best = j; }
      });
      const tIn = tOut + bd;
      corners.map(([c, t]) => [c, t < tOut ? t + P : t])
        .filter(([, t]) => t > tOut && t < tIn).sort((a, b) => a[1] - b[1])
        .forEach(([c]) => ring.push(c));
      k = best;
    }
    rings.push(ring);
  }
  return rings;
}

/* ---------- fetching ---------- */

async function getJSON(url, body) {
  for (let tries = 0; tries < 3; tries++) {
    const res = await fetch(url, body
      ? { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body }
      : { headers: { 'User-Agent': UA } });
    const text = await res.text();
    try { return JSON.parse(text); } catch { await new Promise(r => setTimeout(r, 4000)); }
  }
  throw new Error(`no JSON from ${url}`);
}

async function fetchWalk(item) {
  const { bbox } = item.map;
  const [s, w, n, e] = bbox;

  /* The walking line, leg by leg, so a car leg simply isn't routed. */
  const legs = [];
  for (let i = 1; i < item.stops.length; i++) {
    const a = item.stops[i - 1].at, b = item.stops[i].at;
    if (item.stops[i].by) { legs.push({ by: item.stops[i].by }); continue; }
    // `via` holds a leg to the way the walk goes — back along the cliff,
    // not the quicker road home
    const pts = [a, ...(item.stops[i].via || []), b].map(p => `${p[1]},${p[0]}`).join(';');
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${pts}?overview=full&geometries=geojson`;
    const r = (await getJSON(url)).routes[0];
    legs.push({ m: Math.round(r.distance), min: Math.round(r.duration / 60),
                line: simplify(r.geometry.coordinates, 0.00002).map(([x, y]) => [r5(x), r5(y)]) });
    await new Promise(r => setTimeout(r, 1100));
  }

  /* The ground under it. A margin either side so shapes run off the edge
     rather than stopping at it. */
  /* A walk a mile long needs the side streets, the paths and the
     buildings to have any texture at all; a walk along a coast doesn't,
     and in a city centre they would be most of the file. The map block
     opts in: "streets", "paths", "buildings". */
  const opt = item.map;
  const m = 0.01, B = `${s - m},${w - m},${n + m},${e + m}`, b = `${s},${w},${n},${e}`;
  const extra = [
    opt.streets ? `way[highway~"^(residential|unclassified|living_street|pedestrian)$"](${b});` : '',
    opt.paths ? `way[highway~"^(footway|path|steps|track)$"][footway!~"^(sidewalk|crossing)$"](${b});` : '',
    opt.buildings ? `way[building](${b});` : ''
  ].join('\n    ');
  const q = `[out:json][timeout:120];(
    way[natural=coastline](${B});
    way[natural~"^(water|wetland|beach|wood|sand)$"](${B});
    way[leisure~"^(park|pitch|golf_course|garden|common)$"](${B});
    way[landuse~"^(grass|forest|meadow|recreation_ground)$"](${B});
    way[man_made~"^(pier|breakwater)$"](${B});
    way[highway~"^(motorway|trunk|primary|secondary|tertiary)$"](${B});
    ${extra}
  );out geom tags;`;
  const osm = await getJSON('https://overpass-api.de/api/interpreter', 'data=' + encodeURIComponent(q));

  const pts = g => g.map(p => [p.lon, p.lat]);
  // only what reaches the frame (with a little slack) is worth keeping
  const touches = g => g.some(([x, y]) => x > w - .004 && x < e + .004 && y > s - .004 && y < n + .004);
  const tol = 0.000025;
  const coast = [], green = [], wet = [], sand = [], water = [], piers = [], roads = [], paths = [], buildings = [];
  for (const el of osm.elements) {
    if (!el.geometry) continue;
    const t = el.tags || {};
    const g = pts(el.geometry);
    if (t.natural !== 'coastline' && !touches(g)) continue;
    const closed = g.length > 3 && g[0][0] === g[g.length - 1][0] && g[0][1] === g[g.length - 1][1];
    const big = ring => Math.abs(area(ring)) > 4e-8;      // drops the flowerbeds
    const sim = simplify(g, tol).map(([x, y]) => [r5(x), r5(y)]);
    if (t.building) { closed && Math.abs(area(g)) > 6e-9 && buildings.push(sim); continue; }
    if (t.natural === 'coastline') coast.push(g);
    else if (t.natural === 'wetland') closed && wet.push(sim);
    else if (t.natural === 'beach' || t.natural === 'sand') closed && sand.push(sim);
    else if (t.natural === 'water') closed && big(g) && water.push(sim);
    else if (t.man_made) (closed ? big(g) : g.length > 1) && piers.push({ area: closed && t.area !== 'no', g: sim });
    else if (/^(footway|path|steps|track)$/.test(t.highway)) paths.push(sim);
    else if (t.highway) { if (t.tunnel !== 'yes' && t.tunnel !== 'building_passage') roads.push({ k: t.highway, g: sim }); }
    else if (closed && big(g)) green.push(sim);
  }
  const land = landRings(chains(coast), [s - m, w - m, n + m, e + m])
    .map(r => simplify(r, tol).map(([x, y]) => [r5(x), r5(y)]));

  return { fetched: new Date().toISOString().slice(0, 10), bbox, legs, land, green, wet, sand, water, piers, roads, paths, buildings };
}

/* ---------- the cache, kept small ----------

   Two things make the cache (and so the drawing) smaller without changing
   what anyone can see. `prune` drops what the map's own scale can't show —
   anything smaller than a few pixels, any point closer than half a pixel
   to the line — and whatever lies more than a little beyond the frame.
   `pack` then writes every line as whole numbers at 1e-5° (about a metre),
   the first point absolute and the rest as steps from the one before,
   which is mostly one- and two-digit numbers. */

function scaleOf(map) {
  const [s, w, n, e] = map.bbox;
  const k = Math.cos(((s + n) / 2) * Math.PI / 180);
  const sx = map.north === 'right' ? W / ((n - s) / k) : W / (e - w);
  return { k, sx };                       // px per degree of longitude; latitude is sx / k
}

function prune(cache, map) {
  const [s, w, n, e] = map.bbox;
  const { k, sx } = scaleOf(map);
  const tol = 0.5 * k / sx, slack = 20 / sx;
  const near = g => g.some(([x, y]) => x > w - slack && x < e + slack && y > s - slack * k && y < n + slack * k);
  const px2 = g => Math.abs(area(g)) * sx * sx / k;
  const len = g => g.reduce((t, p, i) => i ? t + Math.hypot((p[0] - g[i - 1][0]) * sx, (p[1] - g[i - 1][1]) * sx / k) : 0, 0);
  const keepPoly = (g, min) => near(g) && px2(g) >= min;
  const keepLine = g => near(g) && len(g) >= 4;
  const sim = g => simplify(g, tol);
  return {
    ...cache,
    green: cache.green.filter(g => keepPoly(g, 30)).map(sim),
    wet: cache.wet.filter(g => keepPoly(g, 30)).map(sim),
    sand: cache.sand.filter(g => keepPoly(g, 30)).map(sim),
    water: cache.water.filter(g => keepPoly(g, 20)).map(sim),
    buildings: (cache.buildings || []).filter(g => keepPoly(g, 14)).map(sim),
    piers: cache.piers.filter(p => p.area ? keepPoly(p.g, 10) : keepLine(p.g)).map(p => ({ ...p, g: sim(p.g) })),
    roads: cache.roads.filter(r => keepLine(r.g)).map(r => ({ ...r, g: sim(r.g) })),
    paths: (cache.paths || []).filter(keepLine).map(sim),
    land: cache.land.map(sim)
  };
}

const enc = g => {
  const out = []; let px = 0, py = 0;
  for (const [x, y] of g) {
    const ix = Math.round(x * 1e5), iy = Math.round(y * 1e5);
    if (out.length && ix === px && iy === py) continue;
    out.push(ix - px, iy - py); px = ix; py = iy;
  }
  return out;
};
const dec = a => {
  const g = []; let x = 0, y = 0;
  for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; g.push([x / 1e5, y / 1e5]); }
  return g;
};
const LISTS = ['land', 'green', 'wet', 'sand', 'water', 'buildings', 'paths'];
function pack(c) {
  const o = { v: 2, fetched: c.fetched, bbox: c.bbox };
  o.legs = c.legs.map(l => l.line ? { ...l, line: enc(l.line) } : l);
  for (const kk of LISTS) o[kk] = (c[kk] || []).map(enc);
  o.piers = c.piers.map(p => ({ area: p.area, g: enc(p.g) }));
  o.roads = c.roads.map(r => ({ k: r.k, g: enc(r.g) }));
  return o;
}
function unpack(o) {
  if (o.v !== 2) return o;
  const c = { fetched: o.fetched, bbox: o.bbox };
  c.legs = o.legs.map(l => l.line ? { ...l, line: dec(l.line) } : l);
  for (const kk of LISTS) c[kk] = o[kk].map(dec);
  c.piers = o.piers.map(p => ({ area: p.area, g: dec(p.g) }));
  c.roads = o.roads.map(r => ({ k: r.k, g: dec(r.g) }));
  return c;
}

/* ---------- drawing ---------- */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* A tiny seeded random, so the hand-drawn wobble is the same every build. */
function rng(seed) {
  let x = 0; for (const ch of seed) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* Little line drawings, centred on 0,0, about 40 units across. */
const GLYPH = {
  bridge: `<g class="gg"><path d="M-120 18 H120"/><path d="M-62 -58 V22 M-50 -58 V22 M50 -58 V22 M62 -58 V22"/>
    <path d="M-66 -46 H-46 M46 -46 H66 M-66 -24 H-46 M46 -24 H66"/>
    <path d="M-120 -8 Q-90 -6 -56 -58 Q0 22 56 -58 Q90 -6 120 -8" fill="none"/>
    <path d="M-40 -18 V18 M-24 0 V18 M24 0 V18 M40 -18 V18 M-90 -4 V18 M90 -4 V18" class="thin"/></g>`,
  jets: `<g class="jets"><path d="M-80 18 C-40 10 -10 -6 22 -20" class="smoke"/><path d="M-84 34 C-44 26 -12 10 18 -4" class="smoke"/>
    <path d="M-72 2 C-36 -6 -6 -22 26 -36" class="smoke"/>
    <g transform="translate(26 -22) rotate(-26)"><path d="M10 0 L-8 -3 L-12 -12 L-15 -12 L-13 -2 L-18 -1 L-20 -5 L-22 -5 L-21 0 L-22 5 L-20 5 L-18 1 L-13 2 L-15 12 L-12 12 L-8 3 Z"/></g>
    <g transform="translate(22 -6) rotate(-26)"><path d="M10 0 L-8 -3 L-12 -12 L-15 -12 L-13 -2 L-18 -1 L-20 -5 L-22 -5 L-21 0 L-22 5 L-20 5 L-18 1 L-13 2 L-15 12 L-12 12 L-8 3 Z"/></g>
    <g transform="translate(30 -38) rotate(-26)"><path d="M10 0 L-8 -3 L-12 -12 L-15 -12 L-13 -2 L-18 -1 L-20 -5 L-22 -5 L-21 0 L-22 5 L-20 5 L-18 1 L-13 2 L-15 12 L-12 12 L-8 3 Z"/></g></g>`,
  boat: `<g class="boat"><path d="M-16 6 H16 L11 13 H-11 Z"/><path d="M0 6 V-20 L13 3 Z M-2 -16 L-14 3 H-2 Z"/></g>`,
  ship: `<g class="ship"><path d="M-30 4 H30 L24 14 H-26 Z"/><path d="M-18 4 V-4 H16 V4 M-8 -4 V-10 H8 V-4"/><path d="M-12 0 h4 M-2 0 h4 M8 0 h4" class="thin"/></g>`,
  cups: `<g class="cups"><path d="M-14 -10 L-12 12 H-2 L0 -10 Z"/><path d="M-15 -14 H1 V-10 H-15 Z"/><path d="M2 -6 L4 14 H14 L16 -6 Z"/><path d="M1 -10 H17 V-6 H1 Z"/>
    <path d="M-9 -20 q3 -4 0 -8 M9 -16 q3 -4 0 -8" class="thin"/></g>`,
  stein: `<g class="stein"><path d="M-10 -12 H8 V14 H-10 Z"/><path d="M8 -6 h6 q4 0 4 4 v6 q0 4 -4 4 h-6"/><path d="M-12 -12 q2 -8 10 -6 q4 -6 10 0 q4 0 2 6" class="foam"/></g>`,
  basket: `<g class="basket"><path d="M-18 -2 H18 L14 14 H-14 Z"/><path d="M-12 -2 Q0 -22 12 -2" fill="none"/><path d="M-18 4 H18 M-16 9 H16" class="thin"/></g>`,
  rotunda: `<g class="rot"><path d="M-22 18 H22"/><path d="M-18 18 V-6 M-9 18 V-6 M0 18 V-6 M9 18 V-6 M18 18 V-6"/><path d="M-22 -6 H22"/><path d="M-20 -6 Q0 -34 20 -6"/><path d="M0 -26 V-31" class="thin"/></g>`,
  reeds: `<g class="reeds"><path d="M-10 14 Q-12 0 -6 -16 M-2 14 Q-2 -2 2 -20 M6 14 Q8 0 14 -12 M-14 14 Q-18 4 -18 -6"/><ellipse cx="2" cy="-22" rx="2" ry="5"/><ellipse cx="-6" cy="-18" rx="2" ry="5"/></g>`,
  palm: `<g class="palm"><path d="M0 20 Q2 0 -2 -16" fill="none"/><path d="M-2 -16 q-12 -4 -20 4 M-2 -16 q12 -6 20 2 M-2 -16 q-6 -10 -16 -10 M-2 -16 q8 -12 16 -10 M-2 -16 q0 -10 2 -14" fill="none"/></g>`,
  tower: `<g class="tower"><path d="M-7 22 L-5 -18 H5 L7 22 Z"/><path d="M-8 -18 H8 M-6 -24 H6 V-18 M-6 -24 L-4 -28 H4 L6 -24"/><path d="M-3 -14 v6 M0 -14 v6 M3 -14 v6" class="thin"/><path d="M-14 22 H14"/></g>`,
  books: `<g class="books"><path d="M-16 14 V-8 H-8 V14 Z M-8 14 V-14 H0 V14 Z M0 14 L4 -10 L12 -9 L8 15 Z"/><path d="M-20 14 H18"/><path d="M-14 -4 h4 M-6 -8 h4" class="thin"/></g>`,
  church: `<g class="church"><path d="M-18 20 V-2 H18 V20 Z"/><path d="M-18 -2 V-20 L-13 -28 L-8 -20 V-2 M8 -2 V-20 L13 -28 L18 -20 V-2"/><path d="M-4 20 V8 Q0 2 4 8 V20"/><circle cy="-8" r="3.5" class="thin"/></g>`,
  steps: `<g class="steps"><path d="M-20 16 H-12 V8 H-4 V0 H4 V-8 H12 V-16 H20"/><path d="M-16 16 v-6 M-8 8 v-6 M0 0 v-6 M8 -8 v-6" class="thin"/><circle cx="16" cy="-24" r="3" class="thin"/><path d="M14 -24 q-6 -2 -8 2 M18 -24 q6 -2 8 2" class="thin"/></g>`,
  parrot: `<g class="parrot"><path d="M0 -14 q8 0 8 8 q0 10 -6 16 l-4 10 l-2 -10 q-6 -6 -4 -14 q2 -10 8 -10 Z"/><path d="M6 -10 q5 0 6 4 q-3 1 -6 0" /><circle cx="2" cy="-9" r="1" class="thin"/></g>`,
  dumplings: `<g class="dumpl"><path d="M-18 4 H18 L14 16 H-14 Z"/><path d="M-12 4 q0 -10 6 -10 q6 0 6 10 M0 4 q0 -10 6 -10 q6 0 6 10"/><path d="M-9 -4 l2 3 M-3 -4 l-2 3 M3 -4 l2 3 M9 -4 l-2 3" class="thin"/></g>`,
  croissant: `<g class="crois"><path d="M-20 6 Q-14 -12 0 -12 Q14 -12 20 6 Q12 2 8 6 Q4 -2 0 -2 Q-4 -2 -8 6 Q-12 2 -20 6 Z"/><path d="M-8 6 Q-6 -6 0 -8 M8 6 Q6 -6 0 -8" class="thin"/></g>`,
  awning: `<g class="awn"><path d="M-22 -6 L-18 -16 H18 L22 -6"/><path d="M-22 -6 q5.5 6 11 0 q5.5 6 11 0 q5.5 6 11 0 q5.5 6 11 0"/><path d="M-18 -4 V16 M18 -4 V16 M-22 16 H22"/><circle cx="-8" cy="10" r="4" class="thin"/><circle cx="2" cy="11" r="3" class="thin"/><circle cx="10" cy="10" r="3.5" class="thin"/></g>`,
  garage: `<g class="garage"><path d="M-20 18 V-4 L0 -18 L20 -4 V18 Z"/><path d="M-12 18 V2 H12 V18 M-12 8 H12 M-12 13 H12" class="thin"/></g>`,
  cactus: `<g class="cactus"><path d="M-4 20 V-16 q4 -6 8 0 V20"/><path d="M-4 4 H-10 q-4 0 -4 -4 V-8 M4 0 H10 q4 0 4 -4 V-12"/><path d="M-16 20 H16"/><path d="M0 -12 v26" class="thin"/></g>`,
  thinker: `<g class="thinker"><path d="M-14 22 H14 V14 H-14 Z"/><path d="M-6 14 q-2 -10 4 -14 q6 -2 6 6 l2 8"/><circle cx="2" cy="-8" r="4.5"/><path d="M2 0 q-4 -2 -2 -6" class="thin"/></g>`,
  quad: `<g class="quad"><path d="M-26 18 H26 M-22 18 V-2 H22 V18"/><path d="M-22 -2 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0"/><path d="M-14 18 V6 q4 -6 8 0 V18 M6 18 V6 q4 -6 8 0 V18" class="thin"/></g>`,
  cypress: `<g class="cypress"><path d="M0 22 V4"/><path d="M0 4 q-20 -2 -18 -12 q-8 -8 4 -12 q2 -8 14 -4 q12 -4 14 4 q12 4 4 12 q2 10 -18 12"/></g>`,
  ruins: `<g class="ruins"><path d="M-26 16 H26"/><path d="M-22 16 V2 H-18 V16 M-10 16 V-4 H-6 V16 M2 16 V6 H6 V16 M14 16 V0 H18 V16"/><path d="M-24 10 H-4 M0 10 H22" class="thin"/></g>`,
  sun: `<g class="sun"><path d="M-22 6 A22 22 0 0 1 22 6"/><path d="M-34 6 H34 M-28 12 H28 M-20 18 H20" class="thin"/><path d="M0 -24 V-30 M-17 -16 l-4 -4 M17 -16 l4 -4 M-25 -2 h-6 M25 -2 h6" class="thin"/></g>`,
  lighthouse: `<g class="lh"><path d="M-6 18 L-4 -10 H4 L6 18 Z"/><path d="M-6 -10 H6 L4 -18 H-4 Z"/><path d="M-10 18 H10"/><path d="M8 -14 L22 -20 M8 -14 L22 -8" class="thin"/></g>`,
  waves: `<path class="wave" d="M-14 0 q3.5 -5 7 0 t7 0 t7 0 t7 0"/>`,
  compass: `<g class="compass"><circle r="22"/><circle r="17" class="thin"/><path d="M0 -30 L5 0 L0 30 L-5 0 Z" class="n"/><path d="M-30 0 L0 4 L30 0 L0 -4 Z" class="thin"/><text y="-36" text-anchor="middle">N</text></g>`
};

function draw(item, cache) {
  const { bbox, title, subtitle, decor = [], caption } = item.map;
  const [s, w, n, e] = bbox;
  const k = Math.cos(((s + n) / 2) * Math.PI / 180);
  /* `north: "right"` turns the sheet a quarter clockwise, for a walk that
     runs north to south and would otherwise be a thread down the middle of
     a wide map. The compass says so. Keep in step with walkMap() in
     js/app.js, which sizes the slot from the same arithmetic. */
  const turned = item.map.north === 'right';
  const sx = turned ? W / ((n - s) / k) : W / (e - w);
  const H = Math.round(turned ? (e - w) * sx : (n - s) / k * sx);
  const xy = (lat, lon) => turned ? [(lat - s) / k * sx, (lon - w) * sx] : [(lon - w) * sx, (n - lat) / k * sx];
  const P = ([lon, lat]) => xy(lat, lon).map(f1).join(' ');
  /* Whole pixels, and every point after the first as a step from the one
     before: a 900-wide drawing has no use for tenths, and "l3 -2" is a
     third the length of "L512.4 283.7". */
  const line = g => {
    let d = '', px = 0, py = 0;
    g.forEach(([lon, lat], i) => {
      const [x, y] = xy(lat, lon).map(Math.round);
      if (i === 0) d = `M${x} ${y}`;
      else if (x !== px || y !== py) d += `${i === 1 || !d.includes('l') ? 'l' : ' '}${x - px} ${y - py}`;
      px = x; py = y;
    });
    return d;
  };
  const poly = g => line(g) + 'z';
  const all = (gs, f) => gs.map(f).join('');
  const rand = rng(item.id);

  /* Hand wobble: every polyline nudged a little, on a fixed seed. */
  const wob = (g, amt) => g.map(([x, y], i) => i === 0 || i === g.length - 1 ? [x, y]
    : [x + (rand() - .5) * amt / sx, y + (rand() - .5) * amt * k / sx]);

  /* Inland there is no coastline to close, so the whole frame is ground. */
  const coastal = cache.land.length > 0;
  const land = coastal ? cache.land.map(poly).join(' ') : `M0 0 H${W} V${H} H0 Z`;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">`,
    `<title id="t">${esc(title)}</title>`,
    `<desc id="d">${esc(item.stops.map((st, i) => `${i + 1}. ${st.short || st.text}`).join(' · '))}</desc>`,
    `<defs>
  <filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>
    <feColorMatrix values="0 0 0 0 .45  0 0 0 0 .36  0 0 0 0 .25  0 0 0 .07 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <filter id="ink"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
  <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0 V7" stroke="#8fa36b" stroke-width="1.1" opacity=".55"/></pattern>
  <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".9" fill="#c4a46a"/></pattern>
  <pattern id="marsh" width="12" height="9" patternUnits="userSpaceOnUse"><path d="M3 7 v-4 M6 7 v-5 M9 7 v-3" stroke="#6f8f86" stroke-width=".9"/></pattern>
  <clipPath id="frame"><rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="6"/></clipPath>
</defs>`,
    `<style>
  text{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;fill:#3b2c22}
  .sea{fill:#bcd5d1}.land{fill:#f1e4c8}.ripple{fill:none;stroke:#8fb3ad}
  .green{fill:#cfdcaa}.wet{fill:#b9cfc0}.sand{fill:#ead39c}.pond{fill:#a9c9c6;stroke:#7fa7a1;stroke-width:.8}
  .pier{fill:#e6d6b5;stroke:#b7a07a;stroke-width:.8}.pierline{fill:none;stroke:#b7a07a;stroke-width:2.2;stroke-linecap:round}
  .bldg{fill:#e5d3ae;stroke:#cdb68b;stroke-width:.6}.path{fill:none;stroke:#b39a72;stroke-width:.9;stroke-dasharray:2.5 2.5;opacity:.8}
  .road{fill:none;stroke:#e2cfa6;stroke-linecap:round;stroke-linejoin:round}
  .walk{fill:none;stroke:#9d3f47;stroke-width:4.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:.1 9}
  .walk-under{fill:none;stroke:#fdf6e6;stroke-width:9;stroke-linecap:round;stroke-linejoin:round;opacity:.85}
  .car{fill:none;stroke:#3b2c22;stroke-width:1.8;stroke-dasharray:7 6;stroke-linecap:round}
  .stamp circle{fill:#9d3f47;stroke:#fdf6e6;stroke-width:2.5}.stamp text{fill:#fdf6e6;font-size:17px;font-weight:700;text-anchor:middle}
  .lbl{font-size:19px;font-style:italic;paint-order:stroke;stroke:#f6ecd6;stroke-width:5px;stroke-linejoin:round}
  .lbl tspan.sub{font-size:13.5px;font-style:normal;fill:#7a6352;letter-spacing:.04em}
  .place{font-size:13px;letter-spacing:.32em;text-transform:uppercase;fill:#8a7560;opacity:.75}
  .seaname{font-size:19px;font-style:italic;letter-spacing:.42em;fill:#5f8a84;opacity:.8}
  .glyph *{fill:none;stroke:#3b2c22;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
  .glyph .thin{stroke-width:1}.gg *{stroke:#c0362c;stroke-width:3}.gg .thin{stroke-width:1.2}
  .jets path{fill:#2f4a7a;stroke:none}.jets .smoke{fill:none;stroke:#fff;stroke-width:5;opacity:.85}
  .wave{stroke:#7fa7a1!important;stroke-width:1.3!important}
  .compass .n{fill:#9d3f47;stroke:none}.compass text{font-size:13px;stroke:none;fill:#3b2c22}
  .cart{fill:#fbf3e1;stroke:#3b2c22;stroke-width:1.4}
  .cart-t{font-size:25px}.cart-s{font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;fill:#7a6352}
  .credit{font-size:10px;fill:#8a7560}
  .frame{fill:none;stroke:#3b2c22;stroke-width:1.4}.frame2{fill:none;stroke:#3b2c22;stroke-width:.6}
</style>`,
    `<rect width="${W}" height="${H}" fill="#f6ecd6"/>`,
    `<g clip-path="url(#frame)">`,
    `<rect width="${W}" height="${H}" class="sea"/>`);

  /* The old engraver's trick: the coast echoed outward into the water. */
  if (coastal) [[26, .25], [18, .35], [11, .5], [5, .7]].forEach(([wd, op]) =>
    out.push(`<path d="${land}" class="ripple" stroke-width="${wd}" opacity="${op * .45}"/>`,
             `<path d="${land}" fill="none" stroke="#bcd5d1" stroke-width="${wd - 2.4}"/>`));
  out.push(`<path d="${land}" class="land" stroke="#8a7560" stroke-width="1.3" filter="url(#ink)"/>`);

  /* One path per layer (per width, for roads): the shapes in a layer never
     need telling apart, and a thousand <path> tags are most of a file. */
  const roads = { motorway: 5, trunk: 5, primary: 4, secondary: 3.2, tertiary: 2.2,
                  residential: 1.6, unclassified: 1.6, living_street: 1.4, pedestrian: 2 };
  const byWidth = {};
  cache.roads.forEach(r => { const wd = roads[r.k] || 2; (byWidth[wd] = byWidth[wd] || []).push(r.g); });
  Object.keys(byWidth).sort((a, b) => a - b)
    .forEach(wd => out.push(`<path d="${all(byWidth[wd], line)}" class="road" stroke-width="${wd}"/>`));
  const layer = (gs, f, attrs) => gs.length && out.push(...attrs.map(a => `<path d="${all(gs, f)}" ${a}/>`));
  layer(cache.green, poly, ['class="green"', 'fill="url(#hatch)"']);
  layer(cache.sand, poly, ['class="sand"', 'fill="url(#dots)"']);
  layer(cache.wet, poly, ['class="wet"', 'fill="url(#marsh)"']);
  layer(cache.water, poly, ['class="pond"']);
  layer(cache.buildings || [], poly, ['class="bldg"']);
  layer(cache.paths || [], line, ['class="path"']);
  layer(cache.piers.filter(p => p.area).map(p => p.g), poly, ['class="pier"']);
  layer(cache.piers.filter(p => !p.area).map(p => p.g), line, ['class="pierline"']);

  /* Names of the ground and the water, set like an old chart. */
  decor.filter(d => d.text).forEach(d => {
    const [x, y] = (d.xy || xy(...d.at)).map(f1);
      out.push(`<text x="${x}" y="${y}" class="${d.kind}" text-anchor="middle"${d.rotate ? ` transform="rotate(${d.rotate} ${x} ${y})"` : ''}>${esc(d.text)}</text>`); });
  decor.filter(d => GLYPH[d.kind]).forEach(d => {
    const [x, y] = d.xy || xy(...d.at);
    const turn = (d.rotate || 0) + (d.kind === 'compass' && turned ? 90 : 0);
    out.push(`<g class="glyph" transform="translate(${f1(x)} ${f1(y)}) scale(${d.scale || 1})${turn ? ` rotate(${turn})` : ''}">${GLYPH[d.kind]}</g>`);
    if (d.caption) out.push(`<text x="${f1(x + (d.cx || 0))}" y="${f1(y + (d.cy || 34))}" class="lbl" text-anchor="middle" font-size="13">${esc(d.caption)}</text>`);
  });

  /* The walk: a pale band under it so it reads over anything, then the
     footprints themselves — round dots, which is what a walk looks like
     from above. */
  const walked = cache.legs.filter(l => l.line).map(l => line(wob(l.line, 1.2))).join(' ');
  out.push(`<path d="${walked}" class="walk-under"/>`, `<path d="${walked}" class="walk"/>`);

  /* A stop off the edge of the map is drawn at the edge, on the line
     towards it, so the arrow still points the right way across town. */
  const pos = i => {
    const st = item.stops[i];
    if (st.xy) return st.xy;           // placed by hand, usually an off-map stop
    let [x, y] = xy(...st.at);
    if (i > 0 && (x < 14 || x > W - 14 || y < 14 || y > H - 14)) {
      const [x1, y1] = pos(i - 1), M = 40;
      const t = Math.min(...[(W - M - x1) / (x - x1), (H - M - y1) / (y - y1), (M - x1) / (x - x1), (M - y1) / (y - y1)]
        .filter(v => v > 0 && isFinite(v)));
      x = x1 + (x - x1) * t; y = y1 + (y - y1) * t;
    }
    if (st.nudge) { x += st.nudge[0]; y += st.nudge[1]; }
    return [x, y];
  };

  /* A car leg: dashed, a gentle arc rather than a ruler line, stopping
     short of the stamp with an arrowhead. */
  item.stops.forEach((st, i) => {
    if (!st.by || i === 0) return;
    const [x1, y1] = pos(i - 1), [X2, Y2] = pos(i);
    const ang = Math.atan2(Y2 - y1, X2 - x1), bend = Math.hypot(X2 - x1, Y2 - y1) * .12;
    const mx = (x1 + X2) / 2 - Math.sin(ang) * bend, my = (y1 + Y2) / 2 + Math.cos(ang) * bend;
    const ea = Math.atan2(Y2 - my, X2 - mx);
    const x2 = X2 - 19 * Math.cos(ea), y2 = Y2 - 19 * Math.sin(ea);
    out.push(`<path d="M${f1(x1)} ${f1(y1)} Q${f1(mx)} ${f1(my)} ${f1(x2)} ${f1(y2)}" class="car"/>`,
      `<path d="M${f1(x2 - 12 * Math.cos(ea - .45))} ${f1(y2 - 12 * Math.sin(ea - .45))} L${f1(x2)} ${f1(y2)} L${f1(x2 - 12 * Math.cos(ea + .45))} ${f1(y2 - 12 * Math.sin(ea + .45))}" class="car" stroke-dasharray="none"/>`);
  });

  /* Stamps and labels. A stop that shares its spot with another takes a
     `nudge`, so both numbers show. */
  item.stops.forEach((st, i) => {
    const [x, y] = pos(i);
    const [dx, dy] = st.label || [18, 6];
    const anchor = st.anchor || (dx < 0 ? 'end' : 'start');
    const short = st.short || st.text;
    const [head, sub] = short.split(' | ');
    out.push(`<text x="${f1(x + dx)}" y="${f1(y + dy)}" class="lbl" text-anchor="${anchor}">${esc(head)}${sub ? `<tspan x="${f1(x + dx)}" dy="17" class="sub">${esc(sub)}</tspan>` : ''}</text>`,
      `<g class="stamp" transform="translate(${f1(x)} ${f1(y)})"><circle r="13"/><text y="6">${i + 1}</text></g>`);
  });

  /* Cartouche: the title, set in the corner the walk doesn't use. */
  const walkedM = cache.legs.reduce((t, l) => t + (l.m || 0), 0);
  const cx = item.map.cartouche ? item.map.cartouche[0] : 34, cy = item.map.cartouche ? item.map.cartouche[1] : H - 132;
  const facts = subtitle || `${(walkedM / 1000).toFixed(1)} km on foot`;
  const cw = Math.max(title.length * 12.6, facts.length * 9.4) + 48;
  out.push(`<g transform="translate(${f1(cx)} ${f1(cy)})"><rect width="${f1(cw)}" height="${caption ? 98 : 78}" rx="4" class="cart"/>
    <rect x="5" y="5" width="${f1(cw - 10)}" height="${caption ? 88 : 68}" rx="2" fill="none" stroke="#3b2c22" stroke-width=".6"/>
    <text x="22" y="38" class="cart-t">${esc(title)}</text>
    <text x="22" y="62" class="cart-s">${esc(facts)}</text>
    ${caption ? `<text x="22" y="82" class="credit" font-size="11.5">${esc(caption)}</text>` : ''}</g>`);

  out.push(`</g>`,
    `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="6" class="frame"/>`,
    `<rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="9" class="frame2"/>`,
    `<text x="${W - 22}" y="${H - 22}" class="credit" text-anchor="end">Map data © OpenStreetMap contributors · drawn for Allez</text>`,
    `</svg>`);
  return out.join('\n') + '\n';
}

/* ---------- main ---------- */

async function run() {
  await fs.mkdir(CACHE, { recursive: true });
  for (const city of CITIES) {
    const file = path.join(ROOT, city, 'data', 'itineraries.json');
    let data; try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch { continue; }
    for (const item of data.items.filter(i => i.map)) {
      const cfile = path.join(CACHE, `${item.id}.json`);
      let cache;
      if (FETCH) {
        cache = prune(await fetchWalk(item), item.map);
        await fs.writeFile(cfile, JSON.stringify(pack(cache)) + '\n');
        console.log(`  ↓ ${item.id}: ${cache.legs.filter(l => l.m).map(l => `${l.m} m`).join(', ')}`);
      } else {
        try { cache = JSON.parse(await fs.readFile(cfile, 'utf8')); }
        catch { console.log(`  ✗ ${item.id} — no cache, run with --fetch`); continue; }
        // a cache from before packing is pruned and packed on the way through
        if (cache.v !== 2) { cache = prune(cache, item.map); await fs.writeFile(cfile, JSON.stringify(pack(cache)) + '\n'); }
        else cache = unpack(cache);
      }
      const svg = draw(item, cache);
      const out = path.join(ROOT, city, item.map.file);
      await fs.mkdir(path.dirname(out), { recursive: true });
      await fs.writeFile(out, svg);
      console.log(`  ✓ ${city}/${item.map.file} (${(svg.length / 1024).toFixed(0)} KB)`);
    }
  }
}

run().catch(e => { console.error(e); process.exit(1); });
