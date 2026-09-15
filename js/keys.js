/* ---------------------------------------------------------
   keys.js — what this browser stores, and under whose name.

   Every key used to begin `paris-for-you.`, which was honest while
   Paris was the only city and becomes a bug the moment there are two.
   Homeground serves each city from a path on one origin, and one origin
   is one localStorage: without a namespace, Delhi's quest progress and
   Paris's are the same four keys, and opening the second city silently
   overwrites the first.

   So the split, which is a product decision rather than a mechanical
   one — some things *should* follow you between cities and some very
   much should not:

     shared     the theme. Somebody who prefers dark does not stop
                preferring it because they opened a different city.

     per city   ratings, quests, zones explored, surprise memory, and
                where home is. All of these are answers about one place
                and are meaningless in another. Loving a bakery in the
                10th says nothing about Indiranagar.

   Carrying the old keys over is done once, here, on load. It copies
   rather than moves: a reader who opens the site mid-deploy and gets
   the previous build back from cache still finds their ratings where
   that build expects them. The old keys are dead weight after that and
   cost a few hundred bytes, which is cheaper than being wrong.
   --------------------------------------------------------- */

const Keys = (() => {

  const NS = 'homeground';

  /* Follows the reader everywhere. */
  const theme = `${NS}.theme`;

  /* Belongs to one city. `City.id` is the whole reason this file loads
     after the pack. */
  const store    = `${NS}.${City.id}.v1`;
  const location = `${NS}.${City.id}.location.v1`;

  /* ---------- the one-time carry-over ----------

     Only ever from the single-city naming, and only for Paris: no other
     city had a `paris-for-you.` key to inherit. Guarded on the
     destination being empty, so it cannot overwrite something newer,
     and wrapped because storage can be unavailable entirely (private
     windows, and browsers set to block site data) — in which case there
     is nothing to migrate and nothing to save. */

  const LEGACY = City.id === 'paris' ? {
    [store]:    'paris-for-you.v1',
    [location]: 'paris-for-you.location.v1',
    [theme]:    'paris-for-you.theme'
  } : {};

  function carryOver() {
    try {
      for (const [to, from] of Object.entries(LEGACY)) {
        if (localStorage.getItem(to) !== null) continue;
        const was = localStorage.getItem(from);
        if (was !== null) localStorage.setItem(to, was);
      }
    } catch (e) {}
  }

  carryOver();

  return { theme, store, location };
})();
