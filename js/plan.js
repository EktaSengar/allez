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
   the same rendered output by scripts/check-views.mjs. What is new is
   only what each stop carries.

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
     rating   id => the reader's verdict. Optional; only 'want' is read.
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
    return Object.assign({}, base, { today: iso, weatherMode: wx ? wx.mode : base.weatherMode });
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
     stays one every week. */

  const WEEK_MS = 604800000;
  const weekIndex = iso => Math.floor(Date.parse(iso + 'T12:00:00') / WEEK_MS);
  const CONTENDER = 4;

  function rotate(ranked, iso, ctx) {
    if (ranked.length < 2) return ranked[0] || null;
    const lead = Rank.score(ranked[0], ctx);
    const near = ranked.filter(i => lead - Rank.score(i, ctx) <= CONTENDER).slice(0, 6);
    return near[weekIndex(iso) % near.length];
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

  /* ---------- when it is open that day ----------

     From the record's own hours where it has readable ones, from its start
     time where it is something that starts — a route, a class, a match —
     and otherwise stated as unknown. Never guessed: an opening time that
     is wrong sends somebody to a locked door, and "we do not know" is an
     answer the reader can act on.

     `fits` is whether the opening covers enough of the slot to go: an
     hour, or the whole visit if that is shorter. Reported, not enforced —
     the slot tests above are what choose. */
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

  /* ---------- one day ----------

     `planned` is shared across a weekend so Sunday never repeats Saturday. */
  function planDay(pool, ctx, iso, planned) {
    const c = dayCtx(ctx, iso);
    const done = ctx.done || (() => false);
    const stops = [];
    let prev = ctx.origin ? { id: null, coords: [ctx.origin.lat, ctx.origin.lon] } : null;

    for (const s of SLOTS) {
      const fits = FITS[s.slot];
      const ranked = Rank.rank(pool, c, i =>
        Rank.isOpenOn(i, iso) && !planned.has(i.id) && !done(i.id) && fits(i));
      const item = rotate(ranked, iso, c);
      if (!item) continue;
      planned.add(item.id);

      const minutes = legMinutes(prev, item, new Date(`${iso}T${hhmm(s.from)}:00`), !stops.length);
      const spend = spendOf(item);
      stops.push({
        slot: s.slot,
        window: { from: hhmm(s.from), to: hhmm(s.to) },
        item,
        travel: { from: stops.length ? prev.id : null, minutes },
        open: openBlock(item, iso, s),
        reasons: reasonsFor(item, iso, c, minutes, ctx),
        spend
      });
      prev = { id: item.id, coords: coordsOf(item) };
    }

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
