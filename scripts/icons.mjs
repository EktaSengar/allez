/* Renders the favicon and home-screen icons from design/logo/mark.svg,
   so every size is the same drawing. Run after the mark changes:
     CHROME_PATH=... node scripts/icons.mjs
   Writes design/logo/: favicon-32.png, apple-touch-icon.png (180, on
   paper, because iOS squares and rounds it), icon-192.png, icon-512.png,
   icon-maskable-512.png (mark inside the safe zone), and favicon.ico at
   the site root for browsers that ask for it by name. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'design/logo');
// Light-mode drawing only: a PNG cannot follow prefers-color-scheme.
const svg = (await fs.readFile(path.join(OUT, 'mark.svg'), 'utf8')).replace(/<style>.*?<\/style>/s, '<style>circle{fill:#2C3E50}</style>');
const PAPER = '#FDFAF5';

const icons = [
  { file: 'favicon-32.png', size: 32, scale: 1, bg: 'transparent' },
  { file: 'apple-touch-icon.png', size: 180, scale: .84, bg: PAPER },
  { file: 'icon-192.png', size: 192, scale: 1, bg: 'transparent' },
  { file: 'icon-512.png', size: 512, scale: 1, bg: 'transparent' },
  { file: 'icon-maskable-512.png', size: 512, scale: .72, bg: PAPER },
];

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const page = await browser.newPage();
for (const { file, size, scale, bg } of icons) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  const d = Math.round(size * scale), o = (size - d) / 2;
  await page.setContent(`<html><body style="margin:0;background:${bg}"><div style="position:absolute;left:${o}px;top:${o}px;width:${d}px;height:${d}px">${svg.replace('<svg ', `<svg width="${d}" height="${d}" `)}</div></body></html>`);
  await page.screenshot({ path: path.join(OUT, file), omitBackground: bg === 'transparent', clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', file);
}
await browser.close();

// favicon.ico: a single 32px PNG inside an ICO header, which every browser reads.
const png = await fs.readFile(path.join(OUT, 'favicon-32.png'));
const head = Buffer.alloc(22);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
head.writeUInt8(32, 6); head.writeUInt8(32, 7); head.writeUInt8(0, 8); head.writeUInt8(0, 9);
head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
await fs.writeFile(path.join(ROOT, 'favicon.ico'), Buffer.concat([head, png]));
console.log('wrote favicon.ico');
