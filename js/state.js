/* ---------------------------------------------------------
   state.js — everything the site remembers about you.
   Stored in localStorage only. Nothing leaves this browser.
   --------------------------------------------------------- */

const Store = (() => {
  const KEY = Keys.store;

  const blank = () => ({
    ratings: {},      // id -> 'loved' | 'good' | 'meh' | 'never' | 'want'
    quests: {},       // questId -> [target strings]
    zones: [],         // zones explored — arrondissements here, wards elsewhere
    seen: {}          // id -> ISO date first shown as a surprise
  });

  let data = blank();

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

  return {
    /* --- ratings --- */
    rating: id => data.ratings[id] || null,
    setRating(id, value) {
      if (data.ratings[id] === value) delete data.ratings[id];
      else data.ratings[id] = value;
      save();
      return data.ratings[id] || null;
    },
    isDone: id => ['loved', 'good', 'meh', 'never'].includes(data.ratings[id]),
    wants: () => Object.keys(data.ratings).filter(k => data.ratings[k] === 'want'),
    doneIds: () => Object.keys(data.ratings).filter(k => ['loved', 'good', 'meh'].includes(data.ratings[k])),

    /* --- learned taste ---
       Counts label frequency across things marked loved or good, so the
       ranking engine can gently favour more of what you already like. */
    tasteWeights(allItems) {
      const liked = Object.keys(data.ratings).filter(k => ['loved', 'good'].includes(data.ratings[k]));
      const weights = {};
      if (!liked.length) return weights;
      const byId = new Map(allItems.map(i => [i.id, i]));
      liked.forEach(id => {
        const item = byId.get(id);
        if (!item) return;
        const bump = data.ratings[id] === 'loved' ? 2 : 1;
        (item.labels || []).forEach(l => { weights[l] = (weights[l] || 0) + bump; });
        (item.categories || []).forEach(c => { weights['cat:' + c] = (weights['cat:' + c] || 0) + bump; });
      });
      return weights;
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
