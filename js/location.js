/* ---------------------------------------------------------
   location.js — where you are exploring from.

   The old design stored a distance on every record, which is only true
   from one flat. This stores a *position* instead and computes distance
   in the browser, so the same catalogue works from anywhere.

   Two distinct ideas, deliberately:

     home       your saved default. Changed rarely.
     exploring  a temporary somewhere-else. A hotel, a Sunday in the 13th,
                a friend's sofa. Overrides home until you reset it.

   Privacy: a precise address is kept in memory and localStorage for the
   maths, and is never what the interface shows. Enter "12 rue de X" and
   the site says "5ᵉ arrondissement". The coordinates sent to the weather
   service are rounded to two decimals — about a kilometre.
   --------------------------------------------------------- */

const Loc = (() => {
  const KEY = Keys.location;
  const UA_NOTE = City.ua;

  /* The twenty arrondissements: where each one actually sits, and what
     a local calls it. Both tables moved to the city pack — see
     cities/paris/city.js, which also keeps the explanation of why these
     are not the geometric centroids the city publishes. Aliased to the
     old names because everything below reads them that way. */
  const ZONE = City.zone.centroids;
  const ZONE_NAMES = City.zone.names;

  let state = { home: null, exploring: null, recents: [] };

  /* ---------- persistence ---------- */

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* A saved place used to carry `arr`. Same one-time carry-over as the
     store's, and for the same reason: what is on disk was written by a
     build that had only ever heard of arrondissements. */
  function renameZone(loc) {
    if (loc && loc.arr !== undefined && loc.zone === undefined) {
      loc.zone = loc.arr;
      delete loc.arr;
    }
    return loc;
  }

  function boot(defaultHome) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = Object.assign({ home: null, exploring: null, recents: [] }, JSON.parse(raw));
      renameZone(state.home);
      renameZone(state.exploring);
      (state.recents || []).forEach(renameZone);
    } catch (e) {}
    if (!state.home) state.home = defaultHome;
    return active();
  }

  /* ---------- the current answer ---------- */

  const active = () => state.exploring || state.home;
  const home = () => state.home;
  const isExploring = () => !!state.exploring;
  const recents = () => state.recents.slice(0, 5);

  function setHome(loc)      { state.home = loc; state.exploring = null; save(); }
  function explore(loc)      { state.exploring = loc; remember(loc); save(); }
  function resetToHome()     { state.exploring = null; save(); }

  function remember(loc) {
    if (!loc) return;
    state.recents = [loc, ...state.recents.filter(r => r.label !== loc.label)].slice(0, 5);
  }

  /* ---------- geometry ---------- */

  function km(a, b) {
    if (!a || !b) return Infinity;
    const R = 6371, rad = d => d * Math.PI / 180;
    const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
    const x = Math.sin(dLat / 2) ** 2 +
              Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  /* Door-to-door, roughly. Short hops are walked; longer ones assume the
     Metro, where the access and waiting time dominates far more than the
     ride does. An estimate, and the interface says "~" because of it. */
  function minutes(coords) {
    const a = active();
    if (!a || !coords) return null;
    const d = km([a.lat, a.lon], coords);
    if (!isFinite(d)) return null;
    const walk = d / 4.8 * 60;
    const transit = 4 + (d / 16) * 60 + 3;
    return Math.max(2, Math.round(Math.min(walk, transit)));
  }

  /* Distance for a record: its own coordinates if it has them, otherwise
     its arrondissement, otherwise whatever was hand-written. */
  function minutesTo(item) {
    if (item.coords) return minutes(item.coords);
    if (item.zone && ZONE[item.zone]) return minutes(ZONE[item.zone]);
    return item.minutesFromHome ?? null;
  }

  const kmTo = item => {
    const a = active();
    const c = item.coords || (item.zone && ZONE[item.zone]);
    return (a && c) ? km([a.lat, a.lon], c) : Infinity;
  };

  /* ---------- naming things ---------- */

  /* Never show the street they typed. An arrondissement is specific
     enough to be useful and vague enough to be nobody's business. */
  function displayName(loc) {
    if (!loc) return 'Paris';
    if (loc.zone) return City.zone.display(loc.zone, ZONE_NAMES[loc.zone]);
    return loc.area || loc.label || 'Paris';
  }

  const zoneName = n => ZONE_NAMES[n] || City.zone.label(n);
  const zoneCoords = n => ZONE[n];
  const presets = () => Object.keys(ZONE).map(Number)
    .map(n => ({ zone: n, name: ZONE_NAMES[n] }));

  /* ---------- finding a place ---------- */

  function fromAddress(hit) {
    const a = hit.address || {};
    const post = String(a.postcode || '');
    let zone = null;
    if (/^75\d{3}$/.test(post)) zone = Number(post.slice(3));       // 75005 → 5
    if (!(zone >= 1 && zone <= 20)) zone = null;
    return {
      lat: +(+hit.lat).toFixed(5),
      lon: +(+hit.lon).toFixed(5),
      zone,
      // a quarter or suburb if OSM knows one — never the house number
      area: a.suburb || a.quarter || a.neighbourhood || a.city_district || null,
      label: (hit.display_name || '').split(',')[0],
      city: a.city || a.town || a.municipality || 'Paris'
    };
  }

  async function search(query) {
    const q = /paris|france/i.test(query) ? query : `${query}, Paris, France`;
    const url = 'https://nominatim.openstreetmap.org/search'
      + `?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, { headers: { 'accept-language': 'en' } });
    if (!res.ok) throw new Error('Could not reach the place finder.');
    const [hit] = await res.json();
    if (!hit) throw new Error(`Nothing found for “${query}”.`);
    return fromAddress(hit);
  }

  async function locate() {
    if (!navigator.geolocation) throw new Error('This browser will not share a location.');
    const pos = await new Promise((ok, no) =>
      navigator.geolocation.getCurrentPosition(ok, () => no(new Error('Location permission refused.')),
        { timeout: 12000, maximumAge: 300000 }));
    const { latitude: lat, longitude: lon } = pos.coords;
    // reverse-geocode so we can name an arrondissement rather than a dot
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
      const res = await fetch(url, { headers: { 'accept-language': 'en' } });
      if (res.ok) return fromAddress(await res.json());
    } catch (e) {}
    return { lat: +lat.toFixed(5), lon: +lon.toFixed(5), zone: null, area: 'Where you are', label: 'Current location' };
  }

  const fromZone = n => ({ lat: ZONE[n][0], lon: ZONE[n][1], zone: n, area: ZONE_NAMES[n], label: ZONE_NAMES[n] });

  return {
    boot, save, active, home, isExploring, setHome, explore, resetToHome, recents,
    minutes, minutesTo, kmTo, km, displayName, zoneName, zoneCoords, presets,
    search, locate, fromZone, ZONE_NAMES
  };
})();
