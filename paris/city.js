/* ---------------------------------------------------------
   cities/paris/city.js — what is true of Paris and of nowhere else.

   The engine files next door carried these inline, which was fine with
   one city and wrong with four. They are not settings — nobody will tune
   them — they are the parts of the site that would differ in Delhi.

   The rule: **the engine never names a city.** If a module needs to know
   what a neighbourhood is called, how money is written or when the shops
   shut, it asks here. A second city is a second one of these, not a fork.

   Not here: the voice (every `why` and epigraph — hand-written, and the
   point of the site), the data (already per-city), and index.html, which
   is Paris's own page down to the croissant.
   --------------------------------------------------------- */

const City = (() => {

  const id   = 'paris';
  const name = 'Paris';

  /* Nominatim's usage policy asks callers to identify themselves. */
  const ua = 'paris-for-you (personal site)';

  /* ---------- what a piece of the city is called ----------

     People genuinely speak in arrondissements — "the 10th" is an
     address, a character and a shorthand at once. Delhi has colonies and
     Bengaluru has Main-and-Cross; neither is a number. The engine only
     asks for `one`, `many` and `ordinal`. */

  const zone = {
    one:  'arrondissement',
    many: 'arrondissements',

    /* 1er, then 2e onward. The city writes these in superscript; the
       interface is English, where the plain form reads better.

       Called `label` rather than `ordinal` because ordinals are a Paris
       answer to a more general question — what to write when you have a
       zone key and nothing else. Bengaluru's keys are already names and
       its label() is the identity. */
    label: n => (n === 1 ? '1er' : `${n}e`),

    /* How a saved place reads in the location bar. The number and the
       name are two separate facts here, so both are shown; a city where
       the key IS the name shows it once. The engine used to hardcode
       this format, which is how "Indiranagar · Indiranagar" nearly
       shipped. */
    display: (k, nm) => `${zone.label(k)} · ${nm || zone.names[k] || name}`,

    fallback: name,

    /* Headings that name the zones. Rendering a second city is what
       found these: "All twenty" and a superscript French ordinal were
       written into the engine's view builders, which is fine until the
       city has ninety-five named neighbourhoods and no ordinals at all. */
    allHeading: 'All twenty',
    tile: n => `${n}<sup>e</sup>`,

    /* A zone read out of an address, where the address says. Paris
       postcodes are 750 + the arrondissement, which is a better answer
       than the nearest centroid for anything near a boundary — and a
       Luma organiser often publishes the street but withholds nothing
       about the postcode. Optional: a pack without one is placed by
       position alone.

       75001–75020, plus 75116, which is the 16th's second postcode and
       not a 116th arrondissement. The copy of this in practices.mjs read
       any 75xxx as a zone, so 75116 came back as zone 116 and 75999 as
       999 — truthy, and therefore never corrected by the position. */
    fromAddress: text => {
      const m = String(text || '').match(/\b75(0(?:0[1-9]|1\d|20)|116)\b/);
      if (!m) return null;
      return m[1] === '116' ? 16 : Number(m[1]);
    },

    /* A second centroid table, and on purpose. `centroids` above is
       pulled towards where people are, which is what you want for "how
       far is that". This one is evenly spaced, which is what you want
       for "which zone is this point in" — scripts/discover.mjs labels
       twenty thousand OSM nodes by nearest centroid, and an even set
       approximates the boundaries better than a set pulled towards the
       shops. Different question, different table.

       A city with no polygons to approximate omits this and the nearest
       of `centroids` is used instead. */
    grid: {
      1:[48.8626,2.3363],  2:[48.8683,2.3413],  3:[48.8637,2.3615],  4:[48.8546,2.3572],
      5:[48.8448,2.3501],  6:[48.8496,2.3329],  7:[48.8565,2.3120],  8:[48.8726,2.3120],
      9:[48.8768,2.3374],  10:[48.8760,2.3595], 11:[48.8578,2.3792], 12:[48.8351,2.4212],
      13:[48.8283,2.3626], 14:[48.8331,2.3264], 15:[48.8412,2.3000], 16:[48.8637,2.2769],
      17:[48.8872,2.3070], 18:[48.8925,2.3444], 19:[48.8871,2.3828], 20:[48.8635,2.3985]
    },

    /* Which quest gets the drawing instead of a list of chips. The id is
       a record in quests.json, so it belongs to the city, not the
       engine. A city with no `map` below leaves this out. */
    mapQuest: 'quest-arrondissements',

    /* Deliberately NOT the geometric centroids the city publishes. The
       12th and 16th each have a wood bolted on, and averaging the
       polygon puts the 12th two kilometres into the Bois de Vincennes:
       click "12e" and the guide finds you the nearest bakery to a
       forest. Each point is instead the median position of the city's
       own facilities in that postcode — schools, libraries, gyms — which
       sit where people are. Where an arrondissement is all city the two
       agree within a few hundred metres, which is the check that this
       measures something real; only the two with woods move far.

       The build scripts keep the geometric set on purpose: they use it
       to decide which arrondissement a point falls in, and for that an
       evenly spaced table approximates the boundaries better. Different
       question, different table. */
    centroids: {
      1:[48.8620,2.3426],  2:[48.8668,2.3450],  3:[48.8625,2.3609],  4:[48.8549,2.3569],
      5:[48.8436,2.3497],  6:[48.8495,2.3328],  7:[48.8569,2.3127],  8:[48.8760,2.3148],
      9:[48.8780,2.3404],  10:[48.8755,2.3639], 11:[48.8582,2.3807], 12:[48.8412,2.3956],
      13:[48.8275,2.3620], 14:[48.8304,2.3226], 15:[48.8403,2.2954], 16:[48.8559,2.2713],
      17:[48.8889,2.3123], 18:[48.8918,2.3476], 19:[48.8852,2.3810], 20:[48.8660,2.4009]
    },

    /* What a local says instead of the number. */
    names: {
      1:'Louvre · Palais-Royal', 2:'Bourse · Sentier', 3:'Haut Marais', 4:'Marais · Île Saint-Louis',
      5:'Latin Quarter', 6:'Saint-Germain', 7:'Invalides · Eiffel', 8:'Champs-Élysées · Monceau',
      9:'SoPi · Pigalle', 10:'Canal Saint-Martin', 11:'Oberkampf · Bastille', 12:'Bastille · Bercy',
      13:'Butte-aux-Cailles', 14:'Montparnasse · Denfert', 15:'Vaugirard', 16:'Passy · Trocadéro',
      17:'Batignolles', 18:'Montmartre', 19:'Buttes-Chaumont · La Villette', 20:'Belleville · Ménilmontant'
    },

    /* A drawing, not a projection: centroids normalised to a 100×100 box,
       because Paris spirals out from the 1st like a snail shell and
       watching that fill in is the point of the quest. A city whose shape
       is not worth drawing omits this and gets a list of chips. */
    map: {
      1:[47,50],  2:[46,42],  3:[54,44],  4:[54,54],  5:[50,63],
      6:[42,59],  7:[32,55],  8:[36,40],  9:[45,34],  10:[57,34],
      11:[65,48], 12:[72,61], 13:[56,72], 14:[42,72], 15:[28,64],
      16:[17,50], 17:[27,30], 18:[46,22], 19:[67,25], 20:[73,40]
    },

    /* The middle is cramped; without this the 1st through 4th sit on top
       of each other. */
    mapSpread: { factor: 1.3, cx: 50, cy: 52 }
  };

  /* ---------- when the city is shut ----------

     Shops, bakeries and markets largely close on a public holiday;
     museums, parks and ticketed events carry on. Written out rather than
     computed because Easter Monday, Ascension and Whit Monday all move,
     and a table is easier to extend by a year than a lunar calculation
     is to trust. */

  const holidays = {
    '2026-08-15': 'Assumption',
    '2026-11-01': "All Saints' Day",
    '2026-11-11': 'Armistice Day',
    '2026-12-25': 'Christmas Day',
    '2027-01-01': "New Year's Day",
    '2027-04-05': 'Easter Monday',
    '2027-05-01': 'Labour Day',
    '2027-05-06': 'Ascension',
    '2027-05-08': 'VE Day',
    '2027-05-17': 'Whit Monday',
    '2027-07-14': 'Bastille Day',
    '2027-08-15': 'Assumption'
  };

  const shutsOnHoliday = ['bakery', 'cafe', 'shop', 'market'];

  /* `cheap` is a judgement about this city, not a conversion: twenty
     euros is a cheap evening in Paris, and Delhi's figure is whatever a
     cheap evening costs there. */
  const money = { symbol: '€', cheap: 20, format: n => `€${n}` };

  /* ---------- which views this city has ----------

     A fixed row of eight tabs was the last place the engine still
     assumed Paris. Bengaluru wants a *Your side of town* view that
     Paris has no use for; the Bay Area will want something about fog.
     So the pack says which views exist, in what order, what the tab
     reads and what the line under it says — and the engine supplies a
     builder for each id it knows, or a pack ships its own.

     `main` is the row of tabs; `utility` is the smaller pair at the
     end. The order here is the order on screen, and it has to agree
     with the nav in index.html — the page owns its own markup, because
     writing the tabs from JavaScript would mean writing them after the
     first paint and shoving the page down. `check-views.mjs` asserts
     the two agree rather than trusting them to.

     A view with no `lede` gets one from its builder, which is the case
     for the four whose opening line depends on what they drew. */

  const views = {
    main: [
      { id: 'today',    label: 'Today',
        lede: 'What is open, close, and worth leaving home for.' },
      { id: 'nights',   label: 'Nights',
        lede: 'Concerts, jazz rooms, dancing and a drink first. Doors, prices and how far each one is from where you are.' },
      { id: 'weekend',  label: 'Weekend' },
      { id: 'eat',      label: 'Eat' },
      { id: 'sport',    label: 'Sport',
        lede: 'Two halves: things we can play, and things we can go and watch.' },
      { id: 'regulars', label: 'Regulars' },
      { id: 'explore',  label: 'Explore' },
      { id: 'away',     label: 'Away',
        lede: 'Six mainline stations, and most of them reach somewhere worth a whole day. Some of these are closer than the other side of Paris.' }
    ],
    utility: [
      { id: 'quests', label: 'Quests', lede: 'Long games. Progress is saved in this browser.' },
      { id: 'saved',  label: 'Saved',  lede: 'What you have marked, and what you have already done.' }
    ]
  };

  /* ---------- how long a kilometre takes ----------

     Short hops are walked; longer ones assume the Metro, where access
     and waiting dominate far more than the ride does. Paris is small,
     dense and evenly served, so the answer does not depend on when you
     ask — `when` is ignored here and is the whole model elsewhere. */

  const reach = {
    minutes: d => {
      const walk = d / 4.8 * 60;
      const transit = 4 + (d / 16) * 60 + 3;
      return Math.max(2, Math.round(Math.min(walk, transit)));
    }
  };

  /* Rounded to about a kilometre so no precise address reaches a third
     party. Weather.setHome() overrides this from data/home.json; these
     are only what to ask for before that file lands. */
  const weather = { lat: 48.87, lon: 2.36, tz: 'Europe/Paris' };

  /* What to ask Overpass for. Paris intra-muros, generously. */
  const bbox = '48.812,2.246,48.908,2.422';

  /* What notable.mjs needs to tell a name from an address.

     Wikidata labels listed buildings by whatever the heritage register
     recorded, which is often a street address or a trade: "34 avenue de
     Choisy, Paris", "boulangerie-patisserie-confiserie". Both are decent
     database keys and useless things to send somebody to for breakfast.

     This lived in notable.mjs until the fourth city arrived, where it was
     silently doing nothing — `rue` and `boulangerie` filter no Delhi
     names at all. It is the city's vocabulary, so it belongs to the city.
     A pack without one gets no vocabulary test rather than this one.

     `lang` is the label language after English. `places` is for names
     Wikidata's descriptions use that `name` does not cover. */
  const notable = {
    lang: 'fr',
    places: ['France'],
    street: 'rue|avenue|boulevard|bd|place|quai|impasse|passage|cour|allée|allee|villa|square',
    generic: [
      'boulangerie', 'patisserie', 'boulangerie patisserie', 'boulangerie patisserie confiserie',
      'cafe', 'restaurant', 'bar', 'brasserie', 'bistrot', 'bistro', 'librairie', 'hotel',
      'confiserie', 'chocolaterie', 'salon de the', 'cinema', 'theatre', 'musee',
      'boucherie', 'epicerie', 'commerce', 'magasin', 'immeuble', 'maison'
    ]
  };

  /* A service worker's scope is the directory its script sits in, so a
     city can only have one if it ships its own. Paris has sw.js at the
     root next to its index.html. */
  /* ---------- what you could take up ----------

     Read by scripts/practices.mjs. `city` names the half that reads a
     municipal feed and turns its repetition into a rhythm — Paris's is
     Que Faire à Paris, whose `occurrences` field carries every date a
     workshop runs. */
  const practices = { city: 'qfap' };

  /* ---------- Luma ----------

     The calendars to read for the tech and AI evenings no municipal feed
     carries anywhere. A city fact rather than a practices one, because
     more than one script reads them: practices.mjs takes the tech.

     Station F is deliberately not a second calendar, having been
     checked: `luma.com/stationf` and `luma.com/station-f` are both 404,
     and the two calendars its events page links to are somebody's
     "Personal" one and the Foresight Institute's, a global calendar
     mostly in Stockholm. What they carry in Paris already arrives
     through `discover`. */
  const luma = [['discover', 'discplace-NdLrh1xJfeotJZC', 'Luma — What‘s Happening in Paris']];

  const serviceWorker = true;

  return { id, name, ua, bbox, serviceWorker, zone, reach, views, holidays, shutsOnHoliday, money, weather, notable, practices, luma };
})();

/* Node loads this through scripts/shim.mjs, which evaluates it the same
   way the browser does. */
if (typeof module !== 'undefined' && module.exports) module.exports = City;
