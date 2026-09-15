/* ---------------------------------------------------------
   cities/bengaluru/views/yourside.js — the view Paris has no use for.

   Paris's question is "what is on". Bengaluru's is "what can I actually
   reach", and the answer changes twice a day. Indiranagar to Whitefield
   is fourteen kilometres, which is thirty-five minutes at eleven and an
   hour at half past six, and no amount of ranking by distance says so.

   Two ideas, and neither is a traffic model:

     the time   `City.reach` already knows the rush windows and prices a
                kilometre accordingly. This view only has to say out loud
                what it is costing right now, because a number that
                silently doubles at six is worse than no number.

     the side   Two neighbourhoods are "the same side" when their
                bearings from the middle of the city are within
                `City.reach.sector` degrees of each other. That is not
                traffic — it is a way of saying "you would not be
                crossing town", which is the question people ask. Nobody
                in Indiranagar is deciding between Koramangala and
                Malleswaram; they are deciding between three places in
                the east.

   Registered through App.defineView, which is the whole point of the
   registry: nothing in the engine knows this file exists.
   --------------------------------------------------------- */

(() => {
  const { esc, rows, stripHead } = App.ui;

  const CENTRE = City.centre;
  const SECTOR = City.reach.sector;

  /* Bearing from the middle of the city, in degrees. Equirectangular is
     plenty at this scale and avoids pulling in a projection for what is
     ultimately a sorting question. */
  function bearing(lat, lon) {
    const y = lon - CENTRE[1];
    const x = (lat - CENTRE[0]) / Math.cos(CENTRE[0] * Math.PI / 180);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  /* Smallest angle between two bearings — 350° and 10° are twenty
     degrees apart, not three hundred and forty. */
  const apart = (a, b) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };

  /* Which zones count as your side, from wherever you are standing now.
     Recomputed per render rather than cached, because the reader moving
     is exactly when the answer changes. */
  function sameSide() {
    const here = Loc.active();
    if (!here) return null;
    const mine = bearing(here.lat, here.lon);
    const out = new Set();
    for (const [key, [lat, lon]] of Object.entries(City.zone.centroids)) {
      if (apart(mine, bearing(lat, lon)) <= SECTOR) out.add(key);
    }
    return { mine, zones: out };
  }

  /* The line at the top. It says what the clock is doing to every number
     below it, in the terms a local would use. */
  function lede() {
    const now = new Date();
    if (!City.reach.isPeak(now)) {
      const day = now.getDay();
      if (day === 0 || day === 6) return 'A weekend, so the city is roughly one size all day. Go further than you would on a Wednesday.';
      const h = now.getHours() + now.getMinutes() / 60;
      const next = City.reach.rush.find(([a]) => h < a);
      return next
        ? `Clear for now. It thickens around ${label(next[0])}, so anything across town is better done before that.`
        : 'Clear now — the evening has emptied out. Distances below are the honest ones.';
    }
    return 'Peak, so everything below already costs about twice what it would at eleven. Your side of town is not a consolation prize right now.';
  }

  /* "17" is a clock face, not a sentence. Nobody says "it thickens
     around seventeen". */
  const label = h => {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    const suffix = hh >= 12 ? 'pm' : 'am';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return mm ? `${h12}.${String(mm).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
  };

  /* Everything within reach, split by which side of town it is on and
     ranked the way every other section ranks. `Near.pick` does the
     retrieval so this cannot quietly disagree with the rest of the page
     about what is nearby. */
  function build() {
    const side = sameSide();
    if (!side) return `<p class="empty">Set a location and this will fill in.</p>`;

    const KINDS = ['cafe', 'restaurant', 'bakery', 'park', 'books', 'nightlife'];
    const pool = [];
    for (const k of KINDS) {
      const got = Near.pick(Near.KIND[k], { rings: Near.RINGS.near, want: 8, limit: 6 });
      pool.push(...(got.items || []));
    }

    /* One place per zone, so a single dense neighbourhood cannot own the
       whole list — the same rule the rest of the site uses. */
    const seen = new Set();
    const dedup = [];
    for (const i of pool.sort((a, b) => (a.minutesFromHome ?? 999) - (b.minutesFromHome ?? 999))) {
      const z = i.zone ?? `x${dedup.length}`;
      if (seen.has(z)) continue;
      seen.add(z);
      dedup.push(i);
    }

    const here = dedup.filter(i => i.zone && side.zones.has(i.zone));
    const over = dedup.filter(i => !i.zone || !side.zones.has(i.zone));

    const where = Loc.displayName(Loc.active());
    const peak = City.reach.isPeak(new Date());

    return ''
      + stripHead(`Your side of ${City.name}`,
          `From ${where}, without crossing town`)
      + rows(here.slice(0, 12),
          'Nothing on this side has been written up yet — the map knows places here, but nobody has vouched for one.',
          true)
      + stripHead('The other side',
          peak
            ? 'Worth it, but not at this hour. These are the numbers as they stand now.'
            : 'Further, and the clock is not against you at the moment.')
      + rows(over.slice(0, 8),
          'Nothing across town to suggest yet.',
          true);
  }

  App.defineView('yourside', build, lede);
})();
