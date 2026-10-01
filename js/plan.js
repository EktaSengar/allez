/* ---------------------------------------------------------
   plan.js — a weekend as a sequence of stops, not a list.

   The Weekend tab chose its plan inside renderWeekend(), so the one
   answer on this site to "what shall we do on Saturday" existed only as
   markup. The app and the MCP server want the same answer as data: the
   stops in order, how long it takes to get from each to the next, why
   each one is there, when it is open, and roughly what it costs.

   So the choosing lives here, beside Rank and Near, and knows nothing
   about the page. The slot tests, the weekly rotation and the five picks
   are the ones the tab always used — moved, not rewritten, and held to
   the same rendered output by scripts/check-views.mjs.

   What each stop then carried showed two things wrong with the choosing
   itself: stops planned into slots they are shut for, and days that
   crossed the region and came straight back. So the day plan now reads
   two of its own answers — see `planDay`. The picks are unchanged.

     Plan.weekend(pool, ctx)   both days and the five picks
     Plan.day(pool, ctx)       one day, for `ctx.date`

   `ctx` is plain data plus two optional lookups, so the MCP server can
   build one without a browser:

     origin   { lat, lon } — where the day starts
     date     any ISO date; the weekend is the one it falls in.
              Or `sat` and `sun`, to say which outright.
     rank     the ranking context Rank.score reads — taste, explored
              zones, home zone, and weatherAt where a city has several
              climates. Each day gets its own date and forecast on top.
     weather  { [iso]: { mode, … } }, as Weather.load() returns in
              `byDate`. Optional; without it the plan ranks unforecast.
     done     id => true for anything already done. Optional.
     now      the moment it is planned at; defaults to now. A slot that
              has ended on the city's clock is not planned that day.
     rating   id => the reader's verdict. Optional; only 'want' is read.
     prefs    what the reader said — `dog`, `kidAge`, `company` — as
              Store.prefs() returns it. Optional. `dog` and `kidAge` keep
              out what does not suit (Rank.suits); a family also gets a
              dessert after dinner, and a stop with a sunset setting is
              given the time to be there by. `carFree` plans a day
              without the car — see below.
   --------------------------------------------------------- */

const Plan = (() => {

  /* ---------- the three parts of a day ----------

     The window each slot is judged against when saying whether a stop is
     open for it, in minutes after midnight. Its start is also when the
     journey to the stop is timed, which matters in a city whose reach
     model knows about rush hour. */
  const SLOTS = [
    { slot: 'morning',   from: 9 * 60,  to: 12 * 60 },
    { slot: 'afternoon', from: 12 * 60, to: 17 * 60 },
    { slot: 'evening',   from: 17 * 60, to: 22 * 60 }
  ];

  const isEvening = i => (i.labels || []).includes('afterwork') || (i.goodFor || []).includes('evening');
  const isMorning = i => (i.goodFor || []).includes('morning') || (i.categories || []).includes('market');
  const isDay     = i => !isEvening(i) && (i.durationMin ?? 120) >= 90;
  const FITS = { morning: isMorning, afternoon: isDay, evening: isEvening };

  const isEdible = i =>
    ['bakery', 'cafe', 'market'].includes(i.type) || (i.labels || []).includes('foodmission');

  /* ---------- dates ----------

     Local calendar dates, stepped from noon, so a daylight-saving night
     cannot turn "add a day" into "add a day and an hour". Stepping from
     the current time instead made the Saturday before the clocks go
     forward end at Monday between eleven and midnight. */
  const DAY_MS = 86400000;
  const noon = iso => new Date(iso + 'T12:00:00');
  const isoOf = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const addDays = (iso, n) => isoOf(new Date(noon(iso).getTime() + n * DAY_MS));

  /* That Saturday if it is one, the one just gone if it is Sunday,
     otherwise the one coming. */
  function weekendOf(iso) {
    const dow = noon(iso).getDay();
    const sat = dow === 6 ? iso : dow === 0 ? addDays(iso, -1) : addDays(iso, 6 - dow);
    return { sat, sun: addDays(sat, 1) };
  }

  /* One day's ranking context: the reader's own, with that day's date and
     that day's forecast. Exactly what the tab used to build per day. */
  function dayCtx(ctx, iso) {
    const base = ctx.rank || {};
    const wx = ctx.weather && ctx.weather[iso];
    return Object.assign({}, base, { today: iso, weatherMode: wx ? wx.mode : base.weatherMode,
                                     cloud: wx ? wx.cloud : undefined });
  }

/* ---------- the same Saturday, six weekends running ----------

     Simulated across six consecutive weekends, the morning slot returned
     "Hunt Space Invaders" six times out of six. The planner takes the top
     of each slot and the top does not move, so widening the pool cannot
     fix it.

     Rotation must be stable *within* a weekend and differ *between* them.
     Marking each pick as seen and demoting what has been seen cannot be
     used: this runs on every repaint, so one render's marks feed the next
     and the plan changes under the reader. The date is the one input
     nothing can feed back into.

     Only genuine contenders rotate — within four points of the leader is
     a coin toss the ranking has no opinion about, and a clear winner
     stays one every week.

     `cost` is taken off each score before the contenders are drawn up —
     the leg from the stop before, below — so a far leader can stop being
     the leader and a close runner-up can become a contender. The turn is
     still the week's and nothing else: the day's earlier stops are chosen
     the same way from the same date, so the plan is one plan from Monday
     to Sunday however often it is drawn.

     `ranked` arrives best first and a cost only ever takes away, so once
     a score is more than four points under the best one after costs,
     nothing further down can be a contender and it is not scored. That
     makes this cheaper than it was before it charged anything — it used
     to score every candidate to find the same few. */

  const WEEK_MS = 604800000;
  const weekIndex = iso => Math.floor(Date.parse(iso + 'T12:00:00') / WEEK_MS);
  const CONTENDER = 4;

  function rotate(ranked, iso, ctx, cost = () => 0) {
    if (ranked.length < 2) return ranked[0] || null;
    const scored = [];
    let lead = -Infinity;
    for (const i of ranked) {
      const raw = Rank.score(i, ctx);
      if (raw < lead - CONTENDER) break;
      const s = raw - cost(i);
      scored.push({ i, s });
      if (s > lead) lead = s;
    }
    const near = scored.filter(x => lead - x.s <= CONTENDER).sort((a, b) => b.s - a.s).slice(0, 6);
    return near[weekIndex(iso) % near.length].i;
  }

  /* ---------- how far from the stop before ----------

     The same arithmetic as `minutesFromHome` — the pack's reach model over
     the straight-line distance — measured from the previous stop rather
     than from home, and timed for when the journey would happen. A record
     with no position of its own falls back to its zone's. A day trip has
     neither, and carries a written time from wherever the reader is based,
     so the first leg can use that; a leg out of one is unknown and says
     so. */
  const coordsOf = i => i.coords || (i.zone != null && City.zone.centroids[i.zone]) || null;

  function legMinutes(from, item, when, first) {
    const a = from && from.coords, b = coordsOf(item);
    if (a && b) return City.reach.minutes(Loc.km(a, b), when);
    return first ? (item.minutesFromHome ?? null) : null;
  }

  /* ---------- without the car ----------

     With `prefs.carFree`, every leg — from home to the first stop and
     from each stop to the next — has to be one a person can walk or
     cycle in twenty minutes (Loc.activeLeg). That is a filter on the
     candidates, not a cost: a stop forty minutes away by bike is not a
     worse car-free stop, it is not one. A record with no position of its
     own cannot say how far it is, so it is left out rather than assumed
     close, and a day trip, which has only a driving time, goes with it.

     A bike leg that runs along one of Sport's trails says which — the
     Bay Trail from the Baylands to Shoreline, the Stevens Creek Trail
     into Mountain View — so the ride between two stops is part of the
     day rather than time lost between them. A trail is a straight line
     from its start (`coords`) to its other end (`routeEnd`), which is
     rough but honest for the flat off-street paths this is for: the leg
     rides it when both ends of the leg are within a kilometre
     of that line, and at least half the leg is along it. */
  const VIA_NEAR = 1;

  /* Metres on a local flat projection, which is fine at this scale. */
  function flat(o, p) {
    const k = 111.32, c = Math.cos(o[0] * Math.PI / 180);
    return [(p[1] - o[1]) * k * c, (p[0] - o[0]) * k];
  }
  /* Where a point falls along a segment (0 to 1), and how far off it. */
  function along(a, b, p) {
    const B = flat(a, b), P = flat(a, p);
    const len2 = B[0] * B[0] + B[1] * B[1];
    const t = len2 ? Math.max(0, Math.min(1, (P[0] * B[0] + P[1] * B[1]) / len2)) : 0;
    return { t, off: Math.hypot(P[0] - t * B[0], P[1] - t * B[1]), len: Math.sqrt(len2) };
  }

  function viaTrail(trails, from, to) {
    if (!from || !to) return null;
    const leg = Loc.km(from, to);
    for (const tr of trails) {
      const s = along(tr.coords, tr.routeEnd, from), e = along(tr.coords, tr.routeEnd, to);
      if (s.off > VIA_NEAR || e.off > VIA_NEAR) continue;
      if (Math.abs(e.t - s.t) * s.len >= leg / 2) return tr;
    }
    return null;
  }

  const trailsIn = pool => pool.filter(i => i.type === 'ride' && i.coords && i.routeEnd);

  /* The leg, the car-free way: minutes and mode, or null when it cannot
     be walked or cycled. */
  function activeLegOf(from, item) {
    const a = from && from.coords, b = coordsOf(item);
    return a && b ? Loc.activeLeg(a, b) : null;
  }

  /* ---------- a day that does not zig-zag ----------

     Each slot used to take the top of its own ranking with no idea where
     the stop before it was, and that ranking measures distance from home
     through a curve that flattens past half an hour — it can barely tell
     a thirty-minute trip from an hour's drive. From Palo Alto one Sunday
     went to Fort Mason for coffee (63 min) and straight back to Stanford
     for the afternoon (64 min).

     So a leg past half an hour costs a point for every three minutes
     over, charged in `rotate` before the contenders are drawn up. Three
     is what a reader's own stated reach costs in scoring.js. Unlike that
     one it is not capped: that is a preference about the whole site, and
     this is time actually spent getting somewhere on the day. An hour
     away costs ten, so it must beat the best stop nearby by six points
     just to be in the rotation — Fleet Week can, a coffee cannot — and a
     stop that does win is where the next leg is measured from, so the
     evening stays in the city instead of driving back for dinner.

     Inside half an hour nothing moves, so the rotation keeps its turn,
     and an unknown leg costs nothing: not knowing is not far. */
  const LEG_FREE = 30, LEG_RATE = 3;
  const legCost = m => (Number.isFinite(m) && m > LEG_FREE ? (m - LEG_FREE) / LEG_RATE : 0);

  /* ---------- when it is open that day ----------

     From the record's own hours where it has readable ones, from its start
     time where it is something that starts — a route, a class, a match —
     and otherwise stated as unknown. Never guessed: an opening time that
     is wrong sends somebody to a locked door, and "we do not know" is an
     answer the reader can act on.

     `fits` is whether the opening covers enough of the slot to go: an
     hour, or the whole visit if that is shorter. It began as a report,
     and the report showed the slot tests putting things where they
     cannot happen — "Saturday morning downtown", which starts at 08:30,
     filling a Saturday afternoon. So `planDay` now skips a candidate whose
     block says `false`. Only `false`: `null` means there were no hours to
     read and no start time, and "we cannot tell" is not "shut" — the rule
     `Rank.isOpenOn` keeps for whole days. */
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };

  function openBlock(item, iso, s) {
    const need = Math.min(60, item.durationMin || 60);
    const overlap = (a, b) => Math.max(0, Math.min(b, s.to) - Math.max(a, s.from));

    const ranges = item.hours ? Hours.on(item.hours, noon(iso).getDay()) : null;
    if (ranges) {
      let best = null, most = -1;
      for (const [a, z] of ranges) {
        const b = z <= a ? z + 1440 : z;          // past midnight
        const o = overlap(a, b);
        if (o > most) { most = o; best = [a, b]; }
      }
      if (!best) return { from: null, to: null, basis: 'hours', fits: false };
      return { from: hhmm(best[0]), to: hhmm(best[1] > 1440 ? best[1] - 1440 : best[1]),
               basis: 'hours', fits: most >= need };
    }

    const start = toMin(item.startTime);
    if (start != null) {
      const end = start + (item.durationMin || 0);
      return { from: hhmm(start), to: hhmm(end % 1440), basis: 'start',
               fits: overlap(start, Math.max(end, start + need)) >= need };
    }
    return { from: null, to: null, basis: 'unknown', fits: null };
  }

  /* ---------- why it is there ----------

     Codes, not sentences: whatever shows the plan words them. Only signals
     the ranking actually used, strongest first, so the first is the one to
     print when there is room for one. `not-done` is on every stop, because
     every stop had to pass it. */
  const NEAR = 15;
  const isMarket = i => i.type === 'market' || (i.categories || []).includes('market');
  const someDays = i => (Array.isArray(i.days) && i.days.length < 7) ||
    (!!i.hours && (Hours.closedDays(i.hours) || []).length > 0);

  function reasonsFor(item, iso, c, minutes, ctx) {
    const out = [];
    if (ctx.rating && ctx.rating(item.id) === 'want') out.push({ code: 'wanted' });
    if (isMarket(item) && someDays(item)) out.push({ code: 'market-day', day: noon(iso).getDay() });
    if (item.end && Rank.urgency(item, iso) >= 6) out.push({ code: 'ends-soon', end: item.end });
    const mode = (c.weatherAt && c.weatherAt(item)) || c.weatherMode;
    if (mode && Rank.weatherFit(item, mode) > 0) out.push({ code: 'weather', mode });
    if (Rank.seasonFit(item, iso) > 0) out.push({ code: 'season', season: Rank.seasonOf(iso) });
    if (minutes != null && minutes <= NEAR) out.push({ code: 'close', minutes });
    out.push({ code: 'not-done' });
    return out;
  }

  /* ---------- what it costs, roughly ----------

     Per person. A stated price is used as it is; a price level is counted
     at what the city pack says that level usually costs; a record that
     states neither is counted as unknown rather than as free, so a total
     can say how much of it is missing. */
  function spendOf(item) {
    if (typeof item.price === 'number') return item.price;
    const lv = Rank.priceLevel(item);
    const about = City.money.levels && City.money.levels.about;
    return lv != null && about ? (about[lv] ?? null) : null;
  }

  const sum = stops => stops.reduce((t, s) => s.spend == null
    ? { total: t.total, unknown: t.unknown + 1 }
    : { total: t.total + s.spend, unknown: t.unknown }, { total: 0, unknown: 0 });

  /* ---------- ice cream after dinner ----------

     For a family, and only when the evening stop is a dinner: one more
     stop, the best open dessert place close to it. Judged on the same
     ranking and the same leg cost as everything else, but it must be
     near — a walk or a short drive from the table, not a second outing.
     `kind` says what it is for; the slot stays the evening. */
  const DESSERT_WITHIN = 15;
  function dessertAfter(pool, c, ctx, iso, planned, stops, prev) {
    const last = stops[stops.length - 1];
    const company = [].concat((ctx.prefs && ctx.prefs.company) || []);
    if (!last || last.slot !== 'evening' || last.item.type !== 'restaurant' || !company.includes('family')) return null;
    const s = SLOTS[2], when = Hours.instant(iso, s.from);
    const done = ctx.done || (() => false);
    const carFree = !!(ctx.prefs && ctx.prefs.carFree);
    const near = i => {
      if (carFree) return !!activeLegOf(prev, i);
      const m = legMinutes(prev, i, when, false); return m == null || m <= DESSERT_WITHIN;
    };
    const item = Rank.rank(pool, c, i =>
      (i.categories || []).includes('dessert') && Rank.isOpenOn(i, iso) && !planned.has(i.id) && !done(i.id) &&
      Rank.suits(i, ctx.prefs) && near(i) && openBlock(i, iso, s).fits !== false)[0];
    if (!item) return null;
    planned.add(item.id);
    const active = carFree ? activeLegOf(prev, item) : null;
    const minutes = active ? active.minutes : legMinutes(prev, item, when, false);
    return {
      slot: 'evening', kind: 'dessert',
      window: { from: hhmm(s.from), to: hhmm(s.to) },
      item,
      travel: active ? { from: prev.id, minutes, mode: active.mode } : { from: prev.id, minutes },
      open: openBlock(item, iso, s),
      reasons: reasonsFor(item, iso, c, minutes, ctx),
      spend: spendOf(item)
    };
  }

  /* ---------- one day ----------

     `planned` is shared across a weekend so Sunday never repeats Saturday.

     The slots are filled in order, and each reads the one before it. A
     candidate must be open that day, not planned or done already, the
     kind of thing the slot is for, and not shut for the slot — the open
     block, tested last because it costs the most to work out. What
     passes is ranked as everywhere else on the site, less the cost of
     its leg from the stop before, and rotated by the week. So the leg a
     stop reports is the leg it was chosen on, and a slot nothing fits is
     left empty rather than filled with something shut. */
  function planDay(pool, ctx, iso, planned) {
    const c = dayCtx(ctx, iso);
    const done = ctx.done || (() => false);
    const stops = [];
    let prev = ctx.origin ? { id: null, coords: [ctx.origin.lat, ctx.origin.lon] } : null;
    const carFree = !!(ctx.prefs && ctx.prefs.carFree);
    const trails = carFree ? trailsIn(pool) : [];

    /* A day that is already under way in the city plans only what is
       left of it: a morning slot at three in the afternoon is a stop
       nobody can make. `now` is the reader's moment, read on the city's
       clock; checks pass their own. */
    const at = Hours.clock(ctx.now || new Date());
    for (const s of SLOTS) {
      if (at.iso === iso && at.mins >= s.to) continue;
      const fits = FITS[s.slot];
      const when = Hours.instant(iso, s.from), first = !stops.length;
      const leg = carFree ? i => (activeLegOf(prev, i) || {}).minutes ?? null
                          : i => legMinutes(prev, i, when, first);
      const ranked = Rank.rank(pool, c, i =>
        Rank.isOpenOn(i, iso) && !planned.has(i.id) && !done(i.id) && fits(i) &&
        Rank.suits(i, ctx.prefs) && (!carFree || !!activeLegOf(prev, i)) &&
        openBlock(i, iso, s).fits !== false);
      const item = rotate(ranked, iso, c, i => legCost(leg(i)));
      if (!item) continue;
      planned.add(item.id);

      const minutes = leg(item);
      const spend = spendOf(item);
      const active = carFree ? activeLegOf(prev, item) : null;
      const trail = active && active.mode === 'bike' && item.type !== 'ride'
        ? viaTrail(trails.filter(t => t.id !== item.id), prev.coords, coordsOf(item)) : null;
      const stop = {
        slot: s.slot,
        window: { from: hhmm(s.from), to: hhmm(s.to) },
        item,
        travel: active
          ? Object.assign({ from: stops.length ? prev.id : null, minutes, mode: active.mode },
                          trail ? { via: { id: trail.id, title: trail.title } } : {})
          : { from: stops.length ? prev.id : null, minutes },
        open: openBlock(item, iso, s),
        reasons: reasonsFor(item, iso, c, minutes, ctx),
        spend
      };
      /* Somewhere for the sunset is planned to the sunset: the time to be
         there by is half an hour before it, so there is light to walk in. */
      const sun = ctx.weather && ctx.weather[iso] && ctx.weather[iso].sunset;
      if (s.slot === 'evening' && sun && (item.setting || []).includes('sunset')) {
        stop.sunset = sun;
        stop.arriveBy = hhmm(Math.max(s.from, toMin(sun) - 30));
      }
      stops.push(stop);
      prev = { id: item.id, coords: coordsOf(item) };
    }

    const dessert = dessertAfter(pool, c, ctx, iso, planned, stops, prev);
    if (dessert) stops.push(dessert);

    return {
      date: iso,
      holiday: Rank.HOLIDAYS[iso] || null,
      weather: (ctx.weather && ctx.weather[iso]) || null,
      stops,
      spend: sum(stops)
    };
  }

  /* ---------- the five picks ----------

     Best across the weekend, each candidate judged under the weather of
     whichever day it is actually open. Chosen in this order, and never the
     same record twice. */
  function bestOfWeekend(pool, ctx, sat, sun, filter) {
    const satCtx = dayCtx(ctx, sat), sunCtx = dayCtx(ctx, sun);
    let best = null, top = -Infinity;
    pool.forEach(i => {
      if (filter && !filter(i)) return;
      if (!Rank.suits(i, ctx.prefs)) return;
      if (ctx.prefs && ctx.prefs.carFree && !(ctx.origin && activeLegOf({ coords: [ctx.origin.lat, ctx.origin.lon] }, i))) return;
      const oSat = Rank.isOpenOn(i, sat), oSun = Rank.isOpenOn(i, sun);
      if (!oSat && !oSun) return;
      const s = Math.max(oSat ? Rank.score(i, satCtx) : -Infinity,
                         oSun ? Rank.score(i, sunCtx) : -Infinity);
      if (Number.isFinite(s) && s > top) { top = s; best = i; }
    });
    return best;
  }

  const PICKS = [
    ['best',    null],
    ['free',    i => !i.price],
    ['food',    isEdible],
    ['unusual', i => (i.uniqueness || 0) >= 5],
    ['daytrip', i => i.type === 'daytrip']
  ];

  function picks(pool, ctx, sat, sun) {
    const used = new Set();
    return PICKS.map(([key, test]) => {
      const item = bestOfWeekend(pool, ctx, sat, sun, i => !used.has(i.id) && (!test || test(i)));
      if (!item) return null;
      used.add(item.id);
      return { key, item };
    }).filter(Boolean);
  }

  /* ---------- the public half ---------- */

  function weekend(pool, ctx = {}) {
    const w = ctx.sat && ctx.sun ? { sat: ctx.sat, sun: ctx.sun } : weekendOf(ctx.date);
    const planned = new Set();
    const days = [w.sat, w.sun].map(iso => planDay(pool, ctx, iso, planned));
    return {
      sat: w.sat,
      sun: w.sun,
      days,
      picks: picks(pool, ctx, w.sat, w.sun),
      spend: sum(days.flatMap(d => d.stops))
    };
  }

  const day = (pool, ctx = {}) => planDay(pool, ctx, ctx.date, new Set());

  return { weekend, day, weekendOf, weekIndex, spendOf, SLOTS };
})();
