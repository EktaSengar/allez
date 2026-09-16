#!/usr/bin/env node
/* ---------------------------------------------------------
   ics.mjs — reading an iCal feed, and reading Luma's in particular.

   Lifted out of practices.mjs unchanged when the Bay Area needed the
   same reader. Two scripts parsing the same feed format two ways is the
   drift shim.mjs exists to prevent, and an iCal parser is exactly the
   kind of fiddly thing that drifts: the line folding, the escaping and
   the order the two interact in are each easy to get subtly wrong and
   hard to notice.

   Nothing here knows about a city. `lumaFeed` fetches and parses; what
   to keep is the caller's business.
   --------------------------------------------------------- */

/* iCal folds long lines by starting the continuation with a space, so
   nothing can be read until the folding is undone. Everything after that
   is one field per line.

   DESCRIPTION is deliberately left escaped. Luma structures it as three
   blocks separated by a literal `\n\n`, and unescaping first would
   flatten the separators into ordinary spaces and lose the structure —
   which is where the canonical URL and the street address live. */
export function parseICS(text) {
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

export const unescapeICS = s => (s || '')
  .replace(/\\n/g, ' ').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\')
  .replace(/\s+/g, ' ').trim();

/* "20260907T170000Z" → "2026-09-07" */
export const icsDate = s => {
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
export function lumaParts(desc) {
  const blocks = String(desc || '').split('\\n\\n');
  const url = (blocks[0] || '').match(/https?:\/\/\S+/)?.[0]?.replace(/[.,]$/, '') || null;
  const addrRaw = unescapeICS((blocks[1] || '').replace(/^Address:\s*/i, ''));
  const address = /check event page/i.test(addrRaw) ? null : addrRaw || null;
  return { url, address, why: unescapeICS(blocks.slice(2).join(' ')) };
}

/* Luma publishes an iCal feed per calendar with no key and no account.
   The endpoint is undocumented and internal, and can change or vanish
   without notice — which is survivable and must stay survivable, so
   this answers `null` on failure rather than throwing, and a caller
   that gets `null` must leave whatever it already had alone. */
export const lumaUrl = ([entity, id]) => `https://api.lu.ma/ics/get?entity=${entity}&id=${id}`;

export async function lumaFeed(feed, ua) {
  try {
    const res = await fetch(lumaUrl(feed), {
      headers: { 'user-agent': ua }, signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) throw new Error(String(res.status));
    return parseICS(await res.text());
  } catch (e) {
    return { error: e.message };
  }
}

/* GEO is `lat;lon`, and an event without one cannot be placed on a map
   or ranked by distance, which is most of what this site does with it. */
export const icsGeo = e => {
  const g = String(e.geo || '').split(';').map(Number);
  return g.length === 2 && g.every(Number.isFinite) ? g : null;
};
