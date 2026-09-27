/* ---------------------------------------------------------
   count.js — how often the site is opened, and which views.

   The app will be judged against this site, and the questions are
   plain: is Weekend opened at all, and by anybody outside the
   household? Nothing measured it, so nobody knew.

   GoatCounter does the counting — no cookies, and free for
   non-commercial use, which is what this site is. Its own script is not
   loaded: the endpoint reads everything from its address, so this sends
   one request per count — a beacon, or an image where a beacon is
   refused — and runs no third-party code on the page. Its visitor count
   comes from a hash of the site, the browser and the IP address, held in
   memory for eight hours and never written down, so there is nothing to
   follow anybody with.

   What is counted:
     a visit           the page's path, title, screen width, and where the
                       reader came from — the site, never the page
     a view opened     once per visit per view; Today is the visit itself
     a week's return   once a week per city: the first visit of a week
                       says whether this browser had been in an earlier
                       one. What is kept for it is two Mondays — when the
                       mark was set, and the last week counted — and it is
                       dropped after thirteen months. Nothing identifying
                       leaves.

   Nothing is counted on any host but the site's own, under Do Not Track
   or Global Privacy Control, in an automated browser, or in a browser
   that has asked not to be:

     #no-count     stop counting this browser, or start again
     #household    count this browser as the household's, so the
                   dashboard can tell the owners' use from everybody
                   else's; again to undo
   --------------------------------------------------------- */

const Count = (() => {

  /* The GoatCounter site. Empty counts nothing, anywhere. */
  const ENDPOINT = '';
  const HOST = 'allez.city';

  let mark = null;
  try { mark = localStorage.getItem(Keys.count); } catch (e) {}

  const setMark = v => {
    try { if (v) localStorage.setItem(Keys.count, v); else localStorage.removeItem(Keys.count); } catch (e) {}
    mark = v;
  };

  const refused = () => navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  const allowed = !!ENDPOINT && location.hostname === HOST && !navigator.webdriver && !refused();
  const on = () => allowed && mark !== 'off';

  /* Said on the page, and only once it is true: nothing is written while
     the endpoint is empty. */
  let line = null;
  const say = () => {
    if (line) line.textContent = 'Visits are counted with GoatCounter: no cookies, and nothing that says who you are. '
      + (on() ? 'Add #no-count to the address to stop.' : 'This browser is not counted.');
  };
  if (ENDPOINT) document.addEventListener('DOMContentLoaded', () => {
    const foot = document.querySelector('.foot .wrap');
    if (foot) { line = foot.appendChild(document.createElement('p')); say(); }
  });

  /* The two switches, read on load and whenever the fragment changes —
     typed onto a page that is already open, a fragment is a hash change,
     not a load. It is taken off again so the address can be shared
     without passing the switch on. */
  const SWITCH = { '#no-count': 'off', '#household': 'household' };
  const SAID = { off: 'This browser is no longer counted.', household: 'This browser now counts as the household.' };
  function flip() {
    const to = SWITCH[location.hash];
    if (!to) return;
    setMark(mark === to ? null : to);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (typeof App !== 'undefined' && App.ui.toast) App.ui.toast(SAID[mark] || 'This browser is counted as usual again.');
    say();
  }
  flip();
  addEventListener('hashchange', flip);

  const tag = s => (mark === 'household' ? `${s} (household)` : s);

  function send(data) {
    const q = Object.entries(data).filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const url = `${ENDPOINT}?${q}&rnd=${Date.now().toString(36)}`;
    if (!(navigator.sendBeacon && navigator.sendBeacon(url))) new Image().src = url;
  }

  const event = (path, title) => send({ p: tag(path), t: title, e: 'true' });

  /* ---------- a week's return ----------

     Weeks run Monday to Sunday, in the reader's own time. What is kept is
     two Mondays: the week the mark was first set, and the last week
     counted. Thirteen months after the first it is dropped and started
     again, however often the reader has been in between — a measurement
     mark must not quietly renew itself for ever, and France's CNIL makes
     exactly that one of its conditions for counting without consent. */
  const DAY_MS = 86400000;
  const LIFE = 395 * DAY_MS;
  const isoOf = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  function week() {
    const now = new Date();
    const monday = isoOf(new Date(now.getTime() - ((now.getDay() + 6) % 7) * DAY_MS));
    let kept = null;
    try { kept = JSON.parse(localStorage.getItem(Keys.week) || 'null'); } catch (e) {}
    if (!kept || !kept.since || Date.parse(monday) - Date.parse(kept.since) > LIFE) kept = null;
    if (kept && kept.last === monday) return;
    const back = !!kept && kept.last < monday;
    try { localStorage.setItem(Keys.week, JSON.stringify({ since: kept ? kept.since : monday, last: monday })); } catch (e) {}
    event(`${City.id}/week/${back ? 'returning' : 'first'}`, `A week's ${back ? 'return' : 'first visit'} — ${City.name}`);
  }

  function visit() {
    if (!on()) return;          // switched off between loading and now
    let from = '';
    try {
      const r = document.referrer && new URL(document.referrer);
      if (r && r.origin !== location.origin) from = r.origin;
    } catch (e) {}
    send({ p: tag(location.pathname), t: document.title, r: from, s: screen.width });
    week();
  }

  /* After the page has loaded and the browser has nothing better to do:
     a count is never worth a moment of anybody's first paint. And not
     while a page is being prerendered, which nobody has looked at yet. */
  if (on()) {
    const go = () => (typeof requestIdleCallback === 'function'
      ? requestIdleCallback(visit, { timeout: 5000 }) : setTimeout(visit, 1));
    const ready = () => (document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true }));
    if (document.prerendering) document.addEventListener('prerenderingchange', ready, { once: true });
    else ready();
  }

  const opened = new Set(['today']);
  const LABEL = Object.fromEntries([...City.views.main, ...City.views.utility].map(v => [v.id, v.label]));

  /* Called by app.js when a view is opened. */
  function view(id) {
    if (!on() || opened.has(id)) return;
    opened.add(id);
    event(`${City.id}/view/${id}`, `${LABEL[id] || id} — ${City.name}`);
  }

  return { view, counting: on };
})();
