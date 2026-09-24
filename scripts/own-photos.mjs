#!/usr/bin/env node
/* ---------------------------------------------------------
   own-photos.mjs — our own photographs, sized for the page.

   A photograph somebody took standing outside the place is the one
   picture on a card that is certainly of the right thing, and the only
   kind this repository may use of a small shop: Instagram, Yelp and the
   maps are other people's, and Commons rarely has a café.

   Originals go in `photos/`, which git ignores — a phone photo is three
   megabytes and a public repository keeps every byte for ever. Which
   photo is which place, and where in the frame the place is, lives in
   scripts/own-photos.json:

     { "file": "orens.hummus.jpeg", "city": "bay-area",
       "id": "orens-hummus-university", "focus": 0.66 }

   Each one is cropped to 4:3 around `focus` (0 is the top of the photo,
   1 the bottom) — every slot on the site is landscape and crops from the
   middle, so a portrait photo left alone keeps a strip from its centre
   and Oren's sign, two-thirds of the way down, would be cut away — then
   written at the four widths the image slots ask for, under
   `<city>/img/thumb/<id>/<w>px-<id>.jpg`. The path mirrors Commons'
   thumbnail URLs on purpose: js/app.js builds its srcset by rewriting the
   width in exactly that shape, so our photos get the same size capping
   (invariant: image slots cap by pixel ratio) with no change to the engine.

   Then the record is pointed at it — in whichever file holds it, or as a
   note for a place that exists only on the map — with `imageKind:
   'subject'` and the credit saying whose photograph it is. Metadata is
   not carried over: sips writes a fresh JPEG, so no location survives.

   Usage:  node scripts/own-photos.mjs [--dry]
   --------------------------------------------------------- */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const WIDTHS = [250, 500, 960, 1280];        // keep in step with THUMB_WIDTHS in js/app.js
const CREDIT = 'Our own photograph';
const FILES = ['places', 'editorial', 'nightlife', 'food', 'sports', 'itineraries', 'daytrips'];

const sips = (...args) => execFileSync('sips', args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const size = file => {
  const out = sips('-g', 'pixelWidth', '-g', 'pixelHeight', file);
  return { w: +/pixelWidth: (\d+)/.exec(out)[1], h: +/pixelHeight: (\d+)/.exec(out)[1] };
};

async function run() {
  const list = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts', 'own-photos.json'), 'utf8'));
  for (const p of list.photos) {
    const src = path.join(ROOT, 'photos', p.file);
    try { await fs.access(src); } catch { console.log(`  ✗ ${p.file} — not in photos/`); continue; }

    /* 4:3 across the full width, the band placed around the focus. */
    const { w, h } = size(src);
    const cropH = Math.min(h, Math.round(w * 3 / 4));
    const cropW = cropH === h ? Math.round(h * 4 / 3) : w;
    const top = Math.max(0, Math.min(h - cropH, Math.round((p.focus ?? 0.5) * h - cropH / 2)));
    const left = Math.max(0, Math.round((w - cropW) / 2));

    const dir = path.join(ROOT, p.city, 'img', 'thumb', p.id);
    const rel = w2 => `img/thumb/${p.id}/${w2}px-${p.id}.jpg`;
    if (!DRY) {
      await fs.mkdir(dir, { recursive: true });
      const cropped = path.join(dir, '_crop.jpg');
      sips('--cropToHeightWidth', String(cropH), String(cropW), '--cropOffset', String(top), String(left),
           src, '--out', cropped);
      for (const width of WIDTHS) {
        sips('--resampleWidth', String(width), '-s', 'format', 'jpeg', '-s', 'formatOptions', '72',
             cropped, '--out', path.join(ROOT, p.city, rel(width)));
      }
      await fs.rm(cropped);
    }

    /* Point the record at it. A place the map holds and nobody wrote up
       has no record of its own, so the photo goes in as a note. */
    const fields = { image: rel(500), imageSubject: p.subject || p.id, imageKind: 'subject', imageCredit: CREDIT };
    let done = false;
    for (const f of FILES) {
      const file = path.join(ROOT, p.city, 'data', f + '.json');
      let text; try { text = await fs.readFile(file, 'utf8'); } catch { continue; }
      const doc = JSON.parse(text);
      const rec = (doc.items || []).find(i => i.id === p.id);
      if (!rec) continue;
      Object.assign(rec, fields);
      /* The compact form editorial.json carries for photographs from
         photos.mjs would otherwise win in js/record.js — drop it. */
      delete rec.i; delete rec.ik;
      if (!DRY) await fs.writeFile(file, JSON.stringify(doc, null, (/\n( +)"/.exec(text) || [, '  '])[1].length) + '\n');
      done = f; break;
    }
    if (!done) {
      const file = path.join(ROOT, p.city, 'data', 'notes.json');
      const doc = JSON.parse(await fs.readFile(file, 'utf8'));
      doc.items[p.id] = { ...(doc.items[p.id] || {}), ...fields };
      if (!DRY) await fs.writeFile(file, JSON.stringify(doc, null, 2) + '\n');
      done = 'notes';
    }
    let kb = '';
    if (!DRY) {
      const sizes = [];
      for (const x of WIDTHS) sizes.push(`${x}w ${Math.round((await fs.stat(path.join(ROOT, p.city, rel(x)))).size / 1024)} KB`);
      kb = ` · ${sizes.join(', ')}`;
    }
    console.log(`  ✓ ${p.file} → ${p.city}/${done} ${p.id}${kb}`);
  }
  if (DRY) console.log('  --dry, nothing written');
}

run().catch(e => { console.error('\n' + e.message + '\n'); process.exit(1); });
