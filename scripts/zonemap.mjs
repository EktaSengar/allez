#!/usr/bin/env node
/* ---------------------------------------------------------
   zonemap.mjs — the arrondissements as shapes, for Quests and Explore.

   The quest used to draw twenty dots on a spiral with a Seine sketched
   by hand. A map that fills in is the reward, so it should be the map:
   the real outlines, from the city's own boundaries.

   Source: "Arrondissements", Direction de l'Urbanisme — Ville de Paris,
   opendata.paris.fr, ODbL. The Seine is OpenStreetMap's centre line (ODbL too).
   Both are credited in DATA-LICENSE.md.

   Output is `paris/data/zonemap.json`: one SVG path per arrondissement,
   its label point, and the river — projected flat (longitude scaled by
   the cosine of the latitude, which is exact enough across ten
   kilometres) and simplified with Douglas–Peucker until the file is a
   few kilobytes. It is not on the critical path: Quests and Explore are
   never the first view, so it rides in LATER and the dots stand in for
   the second it takes to arrive.

   Usage:  node scripts/zonemap.mjs
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'paris', 'data', 'zonemap.json');
const ARR = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/arrondissements/exports/geojson';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

const W = 1000;                 // viewBox width; height follows the shape
const TOL = 2.2;                // simplification tolerance, in viewBox units
const LAT0 = 48.8566;
const K = Math.cos(LAT0 * Math.PI / 180);

/* Douglas–Peucker. A closed ring starts and ends on the same point, so
   every distance to that "line" is zero and the whole outline would
   vanish; it is simplified as two halves instead. */
function simplify(pts, tol) {
  const [fx, fy] = pts[0], [lx, ly] = pts[pts.length - 1];
  if (pts.length > 4 && fx === lx && fy === ly) {
    const mid = pts.length >> 1;
    return simplifyOpen(pts.slice(0, mid + 1), tol).slice(0, -1)
      .concat(simplifyOpen(pts.slice(mid), tol));
  }
  return simplifyOpen(pts, tol);
}

function simplifyOpen(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let far = -1, best = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > best) { best = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const r1 = n => Math.round(n * 10) / 10;
const pathOf = rings => rings.map(r =>
  'M' + r.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z').join('');

async function seine(project) {
  /* The river as its centre line, drawn as a wide stroke: a stylised
     map wants a ribbon, not the true banks. Optional — if Overpass is
     down the map is still the map, just without the blue. */
  const q = `[out:json][timeout:60];
    way["waterway"="river"]["name"="La Seine"](48.815,2.22,48.905,2.42);out geom;`;
  try {
    /* The public servers turn requests away when busy, with an XML page
       rather than JSON; try each twice before giving up. */
    let j = null;
    for (const url of [...OVERPASS, ...OVERPASS]) {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q),
        headers: { 'User-Agent': 'allez-zonemap/1.0 (github.com/EktaSengar/allez)',
                   'Content-Type': 'application/x-www-form-urlencoded' } });
      if (res.ok) { try { j = await res.json(); break; } catch {} }
      await new Promise(r => setTimeout(r, 5000));
    }
    if (!j) throw new Error('Overpass unavailable');
    /* Ways arrive in pieces and in no reliable order, with gaps where
       the river splits round the islands. Each is drawn as its own
       stroke; with round caps they read as one river. */
    const segs = j.elements.filter(e => e.geometry).map(e => e.geometry.map(g => [g.lon, g.lat]));
    if (!segs.length) return null;
    return segs.map(seg => simplifyOpen(seg.map(project), TOL))
      .filter(pts => pts.length > 1)
      .map(pts => 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')).join('');
  } catch (e) {
    console.warn('  ! Seine skipped:', e.message);
    return null;
  }
}

async function run() {
  const geo = await (await fetch(ARR)).json();
  const all = geo.features.flatMap(f =>
    (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flat());
  const xs = all.flat().map(([lon]) => lon * K), ys = all.flat().map(([, lat]) => lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = W / (maxX - minX);
  const H = Math.round((maxY - minY) * s);
  const project = ([lon, lat]) => [(lon * K - minX) * s, (maxY - lat) * s];

  const zones = {};
  for (const f of geo.features) {
    const n = f.properties.c_ar;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const rings = polys.map(p => simplify(p[0].map(project), TOL));
    /* The label sits on the city's own centroid, which for the 16th
       lands in the houses rather than the Bois. */
    const [lon, lat] = f.properties.geom_x_y ? [f.properties.geom_x_y.lon, f.properties.geom_x_y.lat] : [0, 0];
    const [cx, cy] = project([lon, lat]);
    zones[n] = { d: pathOf(rings), at: [Math.round(cx), Math.round(cy)] };
  }

  const out = {
    note: 'Arrondissement outlines for the Quests and Explore maps, built by scripts/zonemap.mjs. ' +
          'Boundaries: Ville de Paris, opendata.paris.fr (ODbL). Seine: © OpenStreetMap contributors (ODbL).',
    viewBox: `0 0 ${W} ${H}`,
    zones,
    seine: await seine(project)
  };
  await fs.writeFile(OUT, JSON.stringify(out) + '\n');
  const kb = (await fs.stat(OUT)).size / 1024;
  console.log(`  ✓ ${Object.keys(zones).length} arrondissements${out.seine ? ' + the Seine' : ''} → ${path.relative(ROOT, OUT)} (${kb.toFixed(1)} KB)`);
}

run().catch(e => { console.error(e); process.exit(1); });
