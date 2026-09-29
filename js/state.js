/* ---------------------------------------------------------
   state.js — everything the site remembers about you.
   Stored in localStorage only. Nothing leaves this browser.
   --------------------------------------------------------- */

const Store = (() => {
  const KEY = Keys.store;

  const blank = () => ({
    ratings: {},      // id -> 'loved' | 'good' | 'meh' | 'never' | 'want'
    rated: {},        // id -> ISO date the rating was given, so old ones can fade
    prefs: {},        // what the reader has said about themselves — see weigh()
    quests: {},       // questId -> [target strings]
    zones: [],         // zones explored — arrondissements here, wards elsewhere
    seen: {}          // id -> ISO date first shown as a surprise
  });

  let data = blank();

  const DAY_MS = 86400000;
  const isoToday = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      /* `arrs` was the field before zones had a name that worked outside
         Paris. Carried over here rather than in keys.js because keys.js
         renames *keys* and this is a rename *inside* one of them; both
         only ever run once, against a store written by an older build. */
      if (Array.isArray(saved.arrs) && !Array.isArray(saved.zones)) {
        saved.zones = saved.arrs;
        delete saved.arrs;
      }
      data = Object.assign(blank(), saved);
    }
  } catch (e) {
    // corrupted or unavailable storage — carry on with a blank slate
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  /* Ratings saved before they carried a date are dated the first time a
     build that fades them sees them. Fading then starts from that day
     rather than from a guess, which leaves every existing weight exactly
     where it was on the day of the upgrade. */
  (() => {
    const today = isoToday();
    let stamped = false;
    for (const id of Object.keys(data.ratings)) {
      if (!data.rated[id]) { data.rated[id] = today; stamped = true; }
    }
    if (stamped) save();
  })();

  /* ---------- taste ----------

     Three inputs, and one table of weights out that js/scoring.js reads.

     What the reader rated. Loving or liking something counts towards its
     labels and categories, as it always has — but a verdict from last
     spring is weaker evidence about this autumn than one from last week,
     so each one fades by half every HALF_LIFE days.

     What the reader said. Diet, company, how far they will go, what they
     will spend, what they are into. Nothing asks for these yet: the
     app's onboarding will, and until then they can be set by hand —
     `Store.setPrefs({ interests: ['jazz'], budget: 2 })` in the console.

     What the reader has not tried. Learning only from what somebody
     liked narrows the page to more of it, which is the opposite of a
     guide. So once there is a history, a kind of place nobody has rated
     yet earns a small bump — small enough to reorder near-ties, not to
     outvote the ranking. `prefs.novelty` is the dial: 0 turns it off.

     `weigh` is pure and exported, so the app and the MCP server can pass
     their own ratings rather than this browser's. */

  const HALF_LIFE = 180;       // days until a rating counts for half
  const STATED    = 3;         // saying "jazz" outweighs loving one jazz club (2)
  const NOVELTY   = 1.5;       // points for a kind of place not rated yet
  const TRIED     = ['loved', 'good', 'meh'];

  /* Who the reader is going with, as the goodFor words records use. */
  const COMPANY = {
    solo:    ['solo', 'work', 'relax'],
    couple:  ['couple', 'romantic'],
    friends: ['socialize', 'friends', 'group'],
    family:  ['family', 'kids']
  };

  const words = v => (Array.isArray(v) ? v : v == null ? [] : [v])
    .map(x => String(x).trim().toLowerCase()).filter(Boolean);

  /* Only what the weights understand survives, so a typo in the console
     is dropped rather than stored as a preference nobody can see. */
  function cleanPrefs(p = {}) {
    const out = {};
    const diet = words(p.diet);
    if (diet.length) out.diet = diet;
    /* One word stays one word, as it always was. A family with a dog is
       two constraints, so a list is allowed too — and kept as a list. */
    if (Array.isArray(p.company)) {
      const c = [...new Set(p.company.filter(k => COMPANY[k]))];
      if (c.length) out.company = c;
    } else if (COMPANY[p.company]) out.company = p.company;
    /* Not weights, but constraints: the dog is hard (see Rank.suits),
       and a child's age keeps out what says it is not for them. */
    if (p.dog === true) out.dog = true;
    if (Number.isInteger(p.kidAge) && p.kidAge >= 0 && p.kidAge <= 17) out.kidAge = p.kidAge;
    if (Number(p.reach) > 0) out.reach = Math.round(Number(p.reach));
    if (Number.isInteger(p.budget) && p.budget >= 0 && p.budget <= 4) out.budget = p.budget;
    const interests = words(p.interests);
    if (interests.length) out.interests = interests;
    if (Number.isFinite(p.novelty) && p.novelty >= 0 && p.novelty <= 3) out.novelty = p.novelty;
    return out;
  }

  function fade(when, now) {
    const t = when ? Date.parse(when + 'T00:00:00') : NaN;
    if (!Number.isFinite(t)) return 1;
    const days = Math.max(0, Math.floor((now - t) / DAY_MS));
    return Math.pow(0.5, days / HALF_LIFE);
  }

  function weigh({ ratings = {}, rated = {}, prefs = {} } = {}, allItems = [], today = new Date()) {
    const weights = {};
    const add = (k, v) => { weights[k] = (weights[k] || 0) + v; };
    const now = typeof today === 'string' ? Date.parse(today + 'T12:00:00') : today.getTime();
    const ids = Object.keys(ratings);
    const byId = ids.length ? new Map(allItems.map(i => [i.id, i])) : new Map();

    for (const id of ids) {
      const verdict = ratings[id];
      if (verdict !== 'loved' && verdict !== 'good') continue;
      const item = byId.get(id);
      if (!item) continue;
      const bump = (verdict === 'loved' ? 2 : 1) * fade(rated[id], now);
      (item.labels || []).forEach(l => add(l, bump));
      (item.categories || []).forEach(c => add('cat:' + c, bump));
    }

    const p = cleanPrefs(prefs);
    (p.interests || []).forEach(k => { add(k, STATED); add('cat:' + k, STATED); add('good:' + k, STATED); });
    words(p.company).forEach(c => (COMPANY[c] || []).forEach(g => add('good:' + g, STATED / 1.5)));
    (p.diet || []).forEach(d => { weights['diet:' + d] = 1; weights['@diet'] = 1; });
    if (p.budget != null) weights['@budget'] = p.budget;
    if (p.reach != null) weights['@reach'] = p.reach;

    const tried = ids.filter(id => TRIED.includes(ratings[id])).map(id => byId.get(id)).filter(Boolean);
    const dial = p.novelty ?? 1;
    if (tried.length && dial > 0) {
      weights['@novelty'] = NOVELTY * dial;
      tried.forEach(i => { if (i.type) weights['tried:' + i.type] = 1; });
    }
    return weights;
  }

  return {
    /* --- ratings --- */
    rating: id => data.ratings[id] || null,
    setRating(id, value) {
      if (data.ratings[id] === value) { delete data.ratings[id]; delete data.rated[id]; }
      else { data.ratings[id] = value; data.rated[id] = isoToday(); }
      save();
      return data.ratings[id] || null;
    },
    isDone: id => ['loved', 'good', 'meh', 'never'].includes(data.ratings[id]),
    wants: () => Object.keys(data.ratings).filter(k => data.ratings[k] === 'want'),
    doneIds: () => Object.keys(data.ratings).filter(k => ['loved', 'good', 'meh'].includes(data.ratings[k])),

    /* --- taste --- */
    tasteWeights(allItems, prefs = data.prefs, today = new Date()) {
      return weigh({ ratings: data.ratings, rated: data.rated, prefs }, allItems, today);
    },
    weigh,
    prefs: () => cleanPrefs(data.prefs),
    setPrefs(p) {
      data.prefs = cleanPrefs(p);
      save();
      return data.prefs;
    },

    /* --- quests --- */
    questDone: (qid) => data.quests[qid] || [],
    toggleQuest(qid, target) {
      const list = data.quests[qid] || (data.quests[qid] = []);
      const i = list.indexOf(target);
      if (i === -1) list.push(target); else list.splice(i, 1);
      save();
      return list;
    },
    seedQuest(qid, targets) {
      if (!data.quests[qid] && targets && targets.length) {
        data.quests[qid] = targets.slice();
        save();
      }
    },

    /* --- arrondissements --- */
    zones: () => data.zones.slice(),
    hasZone: n => data.zones.includes(n),
    toggleZone(n) {
      const i = data.zones.indexOf(n);
      if (i === -1) data.zones.push(n); else data.zones.splice(i, 1);
      save();
      return data.zones.includes(n);
    },

    /* --- surprise memory --- */
    markSeen(id) { data.seen[id] = new Date().toISOString().slice(0, 10); save(); },
    seenRecently(id, days = 21) {
      const d = data.seen[id];
      if (!d) return false;
      return (Date.now() - new Date(d).getTime()) / 86400000 < days;
    }
  };
})();
