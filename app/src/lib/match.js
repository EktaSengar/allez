/* ---------------------------------------------------------
   Planning for two, with a link and no accounts.

   The deck travels in the link's #fragment, which a browser never sends
   to a server: the cards (id, title, photo, a line of why), a deck id,
   and nothing about the person. The other person swipes on
   allez.city/match/ and sends back a link carrying only the deck id and
   their yes/no for each card. Matching happens on this phone.
   --------------------------------------------------------- */

import { imageOf } from './answers';

export const MATCH_PAGE = 'https://allez.city/match/';

/* The why's first sentence, cut at a word if it runs long. */
function firstLine(why = '') {
  const s = why.split(/(?<=\.)\s/)[0];
  return s.length <= 140 ? s : s.slice(0, s.lastIndexOf(' ', 138)) + '…';
}

export const newDeckId = () => Math.random().toString(36).slice(2, 8);

export function deckLink(id, items, from) {
  const cards = items.map(i => ({
    i: i.id, t: i.title, e: i.emoji || '', m: imageOf(i) || '',
    z: i.area || '', w: firstLine(i.why)
  }));
  const q = new URLSearchParams({ v: '1', id, c: JSON.stringify(cards) });
  if (from) q.set('from', from);
  return `${MATCH_PAGE}#${q.toString()}`;
}

/* A reply, from a pasted link or a deep link's params: { id, r }. */
export function parseReply(text) {
  if (!text) return null;
  const s = String(text).trim();
  const frag = s.includes('#') ? s.slice(s.indexOf('#') + 1) : s.includes('?') ? s.slice(s.indexOf('?') + 1) : s;
  const q = new URLSearchParams(frag);
  const id = q.get('id'), r = q.get('r');
  return id && r && /^[01]+$/.test(r) ? { id, r } : null;
}

/* Both said yes. If nobody overlapped, the cards either of them liked. */
export function matches(deck, theirs) {
  const yes = (bits, k) => bits[k] === '1';
  const both = deck.ids.filter((_, k) => yes(deck.mine, k) && yes(theirs, k));
  const either = deck.ids.filter((_, k) => yes(deck.mine, k) || yes(theirs, k));
  return { both, either };
}
