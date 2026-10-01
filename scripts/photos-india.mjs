#!/usr/bin/env node
/* Fill curated Delhi/Bengaluru cards from Commons only. Explicit article
   mappings only, never a neighbourhood stand-in; chain articles are
   deliberately excluded because their photo may show another branch.
   Usage: node scripts/photos-india.mjs [--dry] */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { pageImages } from './images.mjs';

const dry = process.argv.includes('--dry');
// Exact subjects only. A park beside a lake is labelled as context below.
const subjects = {
  "Karim's": "Karim's", 'Lodhi Gardens': 'Lodhi Gardens',
  'Sunder Nursery': 'Sunder Nursery', 'Agrasen ki Baoli': 'Agrasen Ki Baoli',
  'Khari Baoli Spice Market': 'Khari Baoli', 'Nai Sarak Bookshop Area': 'Nai Sarak',
  'Khan Market': 'Khan Market', 'Dilli Haat, INA': 'Dilli Haat',
  'Sankey Tank': 'Sankey Tank', 'Orion Mall': 'Orion Mall',
  'Vidyarthi Bhavan': 'Vidyarthi Bhavan', 'Mavalli Tiffin Rooms': 'Mavalli Tiffin Rooms',
  "Koshy's": "Koshy's", 'Shree Sagar CTR': 'Central Tiffin Room',
  'Lalbagh Botanical Gardens': 'Lal Bagh', 'Cubbon Park': 'Cubbon Park',
  'City Market': 'K. R. Market', 'Blossom Book House': 'Blossom Book House'
};
// A photo of the street or market a card is about, where the card is the
// street or market itself. Never a nearby landmark standing in for a venue.
const contexts = {
  'janpath-tibetan-market': 'Janpath', 'sarojini-nagar-market': 'Sarojini Nagar',
  'chandni-chowk-bazaars': 'Chandni Chowk', 'karol-bagh-ajmal-khan-road': 'Karol Bagh',
  'osm-lajpat-nagar-central-market-57138-154482': 'Lajpat Nagar',
  'osm-ulsoor-lake-park-25971-155244': 'Ulsoor Lake',
  'osm-koshy-s-25951-155203': "Koshy's"
};

const docs = [];
const wanted = new Map();
for (const city of ['delhi', 'bengaluru']) {
  for (const tier of ['editorial', 'places', 'nightlife']) {
    const file = new URL(`../${city}/data/${tier}.json`, import.meta.url);
    const doc = JSON.parse(await fs.readFile(file, 'utf8'));
    docs.push({ file, doc, city, tier });
    for (const item of doc.items) {
      if (item.image || item.i) continue;
      const subject = subjects[item.title];
      const title = subject || contexts[item.id];
      if (!title) continue;
      if (!wanted.has(title)) wanted.set(title, []);
      wanted.get(title).push({ item, kind: subject ? 'subject' : 'context' });
    }
  }
}
const hits = await pageImages([...wanted.keys()], 'en');
// Manually checked Commons subjects where Wikipedia leads with a logo or a
// differently licensed file. Keep the selection explicit and reproducible.
const selectedFiles = {
  "Karim's": "Karim's Hotel, Old Delhi.jpg",
  'Mavalli Tiffin Rooms': 'Mavalli Tiffin Room (6), Lalbagh Road, Bengaluru.jpg',
  'Lal Bagh': 'Glass house Lalbagh.jpg',
  Indiranagar: 'Indiranagar Shopping A Store on Hundred Feet Road.JPG',
  Ulsoor: 'Ulsoor lake Bangalore India.jpg'
};
for (const [title, file] of Object.entries(selectedFiles)) {
  if (!wanted.has(title)) continue;
  const name = file.replace(/ /g, '_');
  const hash = crypto.createHash('md5').update(name).digest('hex');
  hits.set(title, `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(name)}`);
}
const filename = url => decodeURIComponent(url.match(/\/commons\/(?:thumb\/)?[a-f0-9]\/[a-f0-9]{2}\/([^/]+)/)?.[1] || '');
const thumbnail = url => {
  if (url.includes('/commons/thumb/')) return url.replace(/\/\d+px-/, '/500px-');
  const file = url.split('/').pop();
  return url.replace('/commons/', '/commons/thumb/') + '/500px-' + file;
};
const strip = s => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const credits = new Map();
const files = [...new Set([...hits.values()].map(filename).filter(Boolean))];
for (let i = 0; i < files.length; i += 20) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'query', prop: 'imageinfo',
    iiprop: 'extmetadata', format: 'json', formatversion: '2',
    titles: files.slice(i, i + 20).map(f => 'File:' + f).join('|') });
  const response = await fetch(url, { headers: { 'User-Agent': 'allez/1.0 (https://github.com/EktaSengar/allez)' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Commons metadata: ${response.status}`);
  for (const page of (await response.json()).query?.pages || []) {
    const md = page.imageinfo?.[0]?.extmetadata || {};
    const licence = strip(md.LicenseShortName?.value);
    // Fail closed: no generic credit, unknown licence or noncommercial work.
    if (!/^(CC BY(?:-SA)? [\d.]+|CC0(?: [\d.]+)?|Public domain)$/i.test(licence)) {
      console.log(`Licence excluded: ${page.title}: ${licence}`);
      continue;
    }
    const artist = strip(md.Artist?.value);
    if (!artist) continue;
    credits.set(page.title.replace(/^File:/, '').replace(/ /g, '_'), `${artist} · ${licence}`);
  }
}
for (const [title, records] of wanted) {
  const image = hits.get(title);
  const credit = image && credits.get(filename(image).replace(/ /g, '_'));
  if (!credit) { console.log(`No licensed photo: ${title}`); continue; }
  for (const { item, kind } of records) {
    item.image = thumbnail(image);
    item.imageSubject = ({ Indiranagar: '100 Feet Road, Indiranagar',
      Ulsoor: 'Ulsoor Lake', 'Lodhi Colony': 'Shish Gumbad, Lodhi Gardens',
      Mehrauli: 'Qutb Minar, Mehrauli', Chanakyapuri: 'Akbar Hotel, Chanakyapuri',
      Sadashivanagar: 'Sankey Tank, Sadashivanagar', Basavanagudi: 'Bull Temple, Basavanagudi'
    })[title] || title;
    item.imageKind = kind;
    item.imageCredit = credit;
  }
}
for (const { file, doc, city, tier } of docs) {
  if (!dry) await fs.writeFile(file, JSON.stringify(doc, null, tier === 'nightlife' ? 2 : 1) + '\n');
  console.log(`${city}/${tier}: ${doc.items.filter(i => i.image || i.i).length}/${doc.items.length} with photos`);
}
