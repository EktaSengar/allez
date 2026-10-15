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

  /* Door-to-door, roughly, and an estimate — the interface says "~"
     because of it.

     How long a kilometre takes is one of the most city-specific facts
     there is, so the pack owns it. Paris walks or takes the Metro and
     the answer does not depend on when you ask. Bengaluru's does: the
     same trip east at 11am and at 6pm are different trips, and a model
     that cannot say so is wrong about the only thing that matters here.

     `when` is passed so a pack can care. Paris's ignores it.

     The default clock is the reader's own, and that is the right one:
     somebody in Delhi reading Delhi should be told about Delhi's rush
     hour, and somebody in Palo Alto reading the Bay Area about theirs.
     A browser gets this right for free.

     A script has no reader, so it picks up whatever timezone the machine
     is in — which made `check-location.mjs` answer differently at
     breakfast than at six, and differently again in CI. Scripts pin this;
     nothing in the browser touches it. */
  let clock = () => new Date();
  const setClock = fn => { clock = fn || (() => new Date()); };

  function minutes(coords, when) {
    const a = active();
    if (!a || !coords) return null;
    const d = km([a.lat, a.lon], coords);
    if (!isFinite(d)) return null;
    return City.reach.minutes(d, when || clock());
  }

  /* Distance for a record: its own coordinates if it has them, otherwise
     its arrondissement, otherwise whatever was hand-written. */
  function minutesTo(item) {
    if (item.coords) return minutes(item.coords);
    if (item.zone && ZONE[item.zone]) return minutes(ZONE[item.zone]);
    return item.minutesFromHome ?? null;
  }

  /* ---------- on foot or by bike ----------

     Whether a trip can be done without the car, and how. Not stored on
     any record: it depends on where the reader is, so it is worked out
     from the same straight-line distance everything else here uses.

     A person, not a vehicle, so no rush hour: 4.8 km/h walking, 14 km/h
     on a bike at an easy family pace, and the straight line stretched by
     a third because streets are not straight. Twenty minutes is the
     most either is offered for — past that the car wins the argument,
     and a plan that pretends otherwise gets abandoned at the first leg.
     A pack may set its own `City.reach.active`; a hilly city would.

     Walk when walking fits, because it asks for nothing; otherwise the
     bike; otherwise null. */
  const ACTIVE = { walk: 4.8, bike: 14, detour: 1.33, within: 20 };

  function activeLeg(a, b) {
    const d = km(a, b);
    if (!isFinite(d)) return null;
    const m = Object.assign({}, ACTIVE, City.reach && City.reach.active);
    const road = d * m.detour;
    const walk = road / m.walk * 60, bike = road / m.bike * 60;
    if (walk <= m.within) return { mode: 'walk', minutes: Math.max(1, Math.round(walk)) };
    if (bike <= m.within) return { mode: 'bike', minutes: Math.max(1, Math.round(bike)) };
    return null;
  }

  /* From wherever the reader is, for a record with a position. */
  function activeTo(item, from = home()) {
    const c = item.coords || (item.zone && ZONE[item.zone]);
    return from && c ? activeLeg([from.lat, from.lon], c) : null;
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
    if (!loc) return City.name;
    if (loc.zone) return City.zone.display(loc.zone, ZONE_NAMES[loc.zone]);
    return loc.area || loc.label || City.name;
  }

  const zoneName = n => ZONE_NAMES[n] || City.zone.label(n);
  const zoneCoords = n => ZONE[n];
  /* Object.keys() is always strings. Paris's zones are numbers and its
     records store them that way, so a numeric key is converted back and
     anything else is left alone — coercing unconditionally rendered
     ninety-five Bengaluru chips as "NaNe". */
  const presets = () => Object.keys(ZONE)
    .map(k => (/^\d+$/.test(k) ? Number(k) : k))
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
      city: a.city || a.town || a.municipality || City.name
    };
  }

  /* Searched inside the pack's own box rather than by appending a city
     name. The name was ", Paris, France", on every pack — so "Bedford
     Ave" typed on the New York page went looking in Paris. Nominatim
     wants the box as west,north,east,south; the pack keeps it the way
     Overpass does, south,west,north,east. */
  async function search(query) {
    const [s, w, n, e] = City.bbox.split(',');
    const url = 'https://nominatim.openstreetmap.org/search'
      + `?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`
      + `&viewbox=${w},${n},${e},${s}&bounded=1`;
    const res = await fetch(url, { headers: { 'accept-language': 'en' } });
    if (!res.ok) throw new Error('Could not reach the place finder.');
    const [hit] = await res.json();
    if (!hit) throw new Error(`Nothing found for “${query}”.`);
    return fromAddress(hit);
  }

  /* Suggestions while typing. Photon, not Nominatim: both read
     OpenStreetMap, but Photon is built for search-as-you-type and
     Nominatim's usage policy forbids it. Same box as `search`; Photon
     wants it as west,south,east,north. Results go through fromAddress,
     so a suggestion is stored exactly like a searched place. */
  const KIND_NAMES = { marketplace: 'Market', mall: 'Mall', park: 'Park', station: 'Station',
    attraction: 'Attraction', hotel: 'Hotel', university: 'University', residential: 'Area',
    suburb: 'Area', neighbourhood: 'Area', quarter: 'Area', city: 'Town', town: 'Town', village: 'Village' };
  const kindOf = p => KIND_NAMES[p.osm_value] || '';

  /* What sort of thing a result is, for ordering. A park, a landmark
     or a mall is somewhere a person might say they are; a toilet block,
     a pier gate or a car-park entrance is a part of one. */
  const MAJOR = new Set(['park', 'attraction', 'museum', 'mall', 'marketplace', 'university',
    'suburb', 'neighbourhood', 'quarter', 'city', 'town', 'village', 'residential', 'stadium',
    'college', 'square', 'garden', 'zoo', 'theme_park', 'viewpoint', 'beach']);
  const MINOR = new Set(['toilets', 'assembly_point', 'pier', 'entrance', 'parking', 'parking_entrance',
    'bicycle_rental', 'charging_station', 'car_rental', 'fuel', 'atm', 'bench', 'waste_basket', 'drinking_water', 'gate', 'vending_machine', 'post_box']);
  const TRANSIT = new Set(['railway', 'public_transport']);
  const isTransit = p => TRANSIT.has(p.osm_key) || p.osm_value === 'bus_stop';

  async function suggest(query, signal) {
    const [s, w, n, e] = City.bbox.split(',');
    /* Biased towards wherever the reader is: there is a University
       Avenue in Palo Alto, Berkeley and Mountain View, and the one you
       mean is the one near you. Rounded to two decimals, a kilometre or
       so — the same precision the weather service gets. */
    const a = active();
    const near = a ? `&lat=${a.lat.toFixed(2)}&lon=${a.lon.toFixed(2)}` : '';
    const ask = async t => {
      const res = await fetch('https://photon.komoot.io/api/'
        + `?q=${encodeURIComponent(t)}&limit=20&bbox=${w},${s},${e},${n}${near}`, { signal });
      return res.ok ? ((await res.json()).features || []) : [];
    };

    /* One row per real place, best first.

       Photon orders by text match, and a busy name comes back many
       times over: "Khan Market" is a road, a Metro station, four exits
       and the market; "Dolores Park" is five businesses and a restroom
       before the park itself. So: an exact name beats a longer one, a
       place beats a facility inside it, and a stop is kept only when
       nothing else answers to the name — "Ferry Building" is, as far as
       OpenStreetMap's names go, mostly tram stops. A name repeated
       within a kilometre is the same place, and the place beats the
       road named after it. */
    const fold = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    /* Every word typed has to be in the name or where it is, with the
       usual abbreviations read both ways — "university ave" is not a
       request for a university. */
    const ABBR = { ave: 'avenue', st: 'street', rd: 'road', blvd: 'boulevard', dr: 'drive',
                   ln: 'lane', pl: 'place', sq: 'square', mt: 'mount', ft: 'fort', marg: 'marg' };
    /* At the front of a name these mean something else: "St Marks
       Place" is a saint, and French puts the street type first — "bd
       Saint-Germain", "av. de l'Opéra". */
    const FIRST = { st: 'saint', bd: 'boulevard', bld: 'boulevard', av: 'avenue' };
    const words = t => fold(t).replace(/[^a-z0-9]+/g, ' ').trim()
      .split(' ').map((w, i) => (!i && FIRST[w]) || ABBR[w] || w).join(' ');
    const q = words(query);
    const relevant = p => {
      // the street only when there is no name: San Francisco State is on
      // Holloway Avenue, and is still not an answer to "university ave"
      const hay = ' ' + words([p.name || p.street, p.locality, p.district, p.city].join(' ')) + ' ';
      // whole words, except the last — that one may still be being typed
      const ws = q.split(' ');
      return ws.every((w, i) => hay.includes(' ' + w + (i < ws.length - 1 ? ' ' : '')))
        || hay.replace(/ /g, '').includes(q.replace(/ /g, ''));
    };
    /* Nothing at all usually means a word written differently from the
       map — "marketcity" for Phoenix Market City. Asking again without
       the last word finds it, and `relevant` still checks the whole
       query, ignoring spaces. */
    /* The map spells streets out — "Bedford Avenue" — while people type
       "bedford ave", and Photon matches the letters, so the short form
       finds every laundromat with "Ave" in its name before the avenue. */
    // never the first word: "St Marks Place" is a saint, not a street
    const spelled = query.trim().split(/\s+/)
      .map((t, i) => {
        const k = fold(t).replace(/\./g, '');
        return i ? (ABBR[k] || t) : (FIRST[k] || t);
      }).join(' ');
    let raw = await ask(spelled);
    const parts = query.trim().split(/\s+/);
    if (!raw.length && parts.length > 1) raw = await ask(parts.slice(0, -1).join(' '));
    const feats = raw.filter(f => f.geometry && f.properties);
    const named = new Set(feats.filter(f => !isTransit(f.properties)).map(f => fold(f.properties.name)));
    const score = (p, i, f) => {
      const nm = words(p.name);
      let v = -i * 0.1;                                   // keep Photon's order as the tiebreak
      // nearer is better: up to three points over thirty kilometres
      if (a) v -= Math.min(3, km([a.lat, a.lon], [f.geometry.coordinates[1], f.geometry.coordinates[0]]) / 10);
      if (nm === q) v += 4; else if (nm.startsWith(q)) v += 1.5;
      if ((' ' + nm + ' ').includes(' ' + q + ' ')) v += 1; // the whole phrase, as words
      // not for roads: OpenStreetMap calls a quiet street `residential` too
      if (MAJOR.has(p.osm_value) && p.osm_key !== 'highway') v += 3;
      if (MINOR.has(p.osm_value)) v -= 3;
      if (p.osm_value === 'hotel') v += 1;               // where you might be staying
      if (isTransit(p)) v -= named.has(fold(p.name)) ? 10 : 2.5;
      return v;
    };
    const ranked = feats.filter(f => relevant(f.properties)).map((f, i) => [score(f.properties, i, f), f])
      .filter(([v]) => v > -5).sort((x, y) => y[0] - x[0]).map(x => x[1]);

    const out = [];
    for (const f of ranked) {
      const p = f.properties, [lon, lat] = f.geometry.coordinates;
      // a road, or a bare address. Not `type: 'house'`: Photon files the
      // Khan Market attraction under that too.
      const street = p.osm_key === 'highway' || !p.name;
      const name = p.name || [p.housenumber, p.street].filter(Boolean).join(' ');
      if (!name) continue;
      // the same name within a kilometre — three when one of them has no
      // quarter to tell them apart. Further than that it is another
      // town's University Avenue, and both stay.
      const local = p.locality || p.district;
      const town = p.city && p.city !== local && !City.name.includes(p.city) ? p.city : '';
      const place = [local, town].filter(Boolean).join(', ');
      // the same name within a kilometre, or in the same quarter (a long
      // street comes back once per segment), or with no place to tell
      // the two apart. Another town's University Avenue stays.
      const twin = out.findIndex(o => words(o.name) === words(name) &&
        (km([o.loc.lat, o.loc.lon], [lat, lon]) < (street && o.street ? 3 : 1)
         || o.place === place || !o.place || !place));
      // results arrive best first, so a twin is only ever replaced by a
      // place standing in for the road named after it
      if (twin >= 0 && (street || !out[twin].street)) continue;
      const loc = fromAddress({ lat, lon, display_name: name,
        address: { postcode: p.postcode, suburb: p.locality || p.district, city: p.city } });
      /* A market or a park is a fine thing to call where you are; a
         street is not — the header never names the street you typed. */
      if (!street) loc.area = name;
      const kind = isTransit(p) ? 'Station' : kindOf(p);
      const where = [street ? '' : kind, place].filter(Boolean).join(' · ');
      const row = { name, where, loc, street, place };
      if (twin >= 0) out[twin] = row; else out.push(row);
      if (out.length === 5) break;
    }
    return out;
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
    minutes, minutesTo, kmTo, km, activeLeg, activeTo, displayName, zoneName, zoneCoords, presets,
    search, suggest, locate, fromZone, ZONE_NAMES, setClock
  };
})();
