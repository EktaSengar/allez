/* ---------------------------------------------------------
   cities/bengaluru/city.js — what is true of Bengaluru.

   The second pack, and the one that proves the first three phases did
   what they claimed. Everything the engine needs to know about a city
   is in this file; nothing about Bengaluru is anywhere else.

   Written against the universal spine only — OpenStreetMap, Wikidata,
   Commons, open-meteo, Luma. There is no municipal feed here of the kind
   opendata.paris.fr gives Paris, which is the central fact about this
   city's data and the reason the curated tier matters more here, not
   less.

   The readers are the friends who live in Bengaluru. Kodihalli is only
   where the default coordinate sits; anyone saves their own home and the
   page re-ranks around them. Write every card for someone who already
   knows 100 Feet Road.
   --------------------------------------------------------- */

const City = (() => {

  const id   = 'bengaluru';
  const name = 'Bengaluru';

  const ua = 'homeground-bengaluru (personal site)';

  /* ---------- what a piece of the city is called ----------

     Paris counts to twenty; Bengaluru does not count at all. A zone here
     is a named neighbourhood — Indiranagar, Koramangala, Malleswaram —
     and the name IS the address people give. BBMP's 198 wards are the
     administrative truth and nobody has ever said one out loud, so they
     are not what this uses.

     Ninety-five of them, from OpenStreetMap's place=suburb nodes inside
     the city: the granularity locals actually speak in. The 823
     place=neighbourhood nodes below them are too fine to rank by — a
     one-per-zone cap across 823 zones is not a cap.

     Below the neighbourhood, addresses go by Main and Cross — "12th
     Main, Indiranagar", "5th Block, Koramangala". That grammar belongs
     to a record's own area line, not to the zone, so the engine never
     has to parse it. */

  const zone = {
    one:  'neighbourhood',
    many: 'neighbourhoods',

    /* A zone key here is already a name, so there is nothing to
       abbreviate — where Paris turns 10 into "10e", this turns
       'indiranagar' into 'Indiranagar' and stops. */
    label: k => (zone.names[k] || k),

    /* How a saved place reads in the location bar. Paris writes
       "10e · Canal Saint-Martin" because the number and the name are two
       different facts; here they are one fact, and saying it twice would
       read as a bug. */
    display: (k, nm) => (nm || zone.names[k] || name),

    fallback: name,

    allHeading: 'Every neighbourhood',
    tile: k => (zone.names[k] || k),

    /* No quest map: Bengaluru has no shape worth drawing the way Paris
       spirals out from the 1st, and ninety-five dots on a 100x100 box is
       a rash rather than a map. The quest falls back to a list of chips. */

    centroids: {
      'anjanapura': [12.86013, 77.55406],
      'arkavathy-layout': [13.06713, 77.6219],
      'austin-town': [12.96127, 77.61529],
      'baiyyappanahalli': [12.99634, 77.65332],
      'balagere': [12.93772, 77.72807],
      'banashankari': [12.92782, 77.55662],
      'banashankari-6th-stage': [12.88492, 77.51548],
      'banaswadi': [13.01416, 77.65185],
      'basavanagudi': [12.94173, 77.5755],
      'basaveshwaranagar': [12.99376, 77.53913],
      'beguru': [12.87475, 77.62273],
      'bellanduru': [12.92921, 77.67704],
      'btm-layout': [12.914, 77.61028],
      'c-v-raman-nagar': [12.98565, 77.66498],
      'carmelaram': [12.9112, 77.70651],
      'challaghatta': [12.89607, 77.454],
      'chamarajapete': [12.95842, 77.56292],
      'chikka-banavara': [13.08038, 77.50189],
      'chikkanayakanahalli': [12.89234, 77.6942],
      'chikkapete': [12.96978, 77.57569],
      'choodasandra': [12.89216, 77.68038],
      'doddakannalli': [12.90824, 77.69488],
      'dr-shivaram-karanth-layout': [13.10272, 77.53005],
      'epip-zone': [12.97819, 77.72465],
      'frazer-town': [12.99759, 77.61367],
      'gandhinagar': [12.97715, 77.58003],
      'gottigere': [12.85653, 77.58772],
      'gunjur': [12.92098, 77.7361],
      'halasuru': [12.97788, 77.62467],
      'haralur': [12.90449, 77.66544],
      'hbr-layout': [13.03199, 77.62808],
      'hebbal': [13.03822, 77.5919],
      'hennur': [13.03708, 77.64136],
      'herohalli': [12.99123, 77.48701],
      'hoodi': [12.9919, 77.7162],
      'horamavu': [13.02733, 77.66015],
      'hsr-layout': [12.91162, 77.63886],
      'huskur': [12.86077, 77.7071],
      'indiranagar': [12.97329, 77.64047],
      'jakkur': [13.07847, 77.60689],
      'jalahalli': [13.04645, 77.54838],
      'jayanagar': [12.92927, 77.58242],
      'jnana-bharathi': [12.94335, 77.51123],
      'jp-nagar': [12.90969, 77.58661],
      'kadugodi': [12.99858, 77.76097],
      'kalyan-nagar': [13.02214, 77.64034],
      'kammanahalli': [13.01485, 77.6382],
      'kasavanahalli': [12.89777, 77.67451],
      'kaval-byrasandra': [13.02002, 77.60929],
      'kempapura-agrahara': [12.97062, 77.55538],
      'kengeri': [12.92297, 77.48429],
      'kodati': [12.88726, 77.7159],
      'konanakunte': [12.87929, 77.56975],
      'kodihalli': [12.96147, 77.64866],
      'koramangala': [12.93574, 77.62408],
      'kothnur': [12.87425, 77.58373],
      'kr-puram': [13.00752, 77.69594],
      'kudlu': [12.88891, 77.65557],
      'laggere': [13.01087, 77.52073],
      'lingarajapuram': [13.00939, 77.62679],
      'madhavara': [13.0532, 77.47297],
      'mahadevapura': [12.99124, 77.68973],
      'mahalakshmi-layout': [13.01132, 77.5447],
      'malleswaram': [13.00274, 77.57033],
      'marathahalli': [12.95526, 77.69842],
      'mathikere': [13.03336, 77.55818],
      'mulluru': [12.90487, 77.72513],
      'nadaprabhu-kempegowda-layout': [12.91892, 77.45188],
      'nagarabhavi': [12.96642, 77.51308],
      'nagasandra': [13.04097, 77.50043],
      'nagavara': [13.03746, 77.6236],
      'panathur': [12.93515, 77.70475],
      'pattanduru-agrahara': [12.97848, 77.73342],
      'peenya': [13.03294, 77.52733],
      'rajajinagar': [12.98823, 77.55488],
      'rajarajeshwari-nagar': [12.92744, 77.51552],
      'ramamurthy-nagar': [13.01202, 77.67778],
      'richmond-town': [12.96355, 77.60159],
      'rmv-2nd-stage': [13.03601, 77.56953],
      'rt-nagar': [13.02272, 77.59571],
      'sadashivanagar': [13.01102, 77.58086],
      'sahakaranagara': [13.06291, 77.58588],
      'shanti-nagar': [12.95554, 77.59243],
      'shivajinagar': [12.98553, 77.60545],
      'sir-mv-layout': [12.94379, 77.47795],
      'sulikunte': [12.88818, 77.72922],
      'sulthanpalya': [13.02941, 77.60469],
      'tc-palya': [13.02262, 77.70573],
      'uttarahalli': [12.90557, 77.54554],
      'varthur': [12.94065, 77.74699],
      'vasanth-nagar': [12.99217, 77.59146],
      'vidyaranyapura': [13.07664, 77.55773],
      'vijaya-nagar': [12.9664, 77.53541],
      'whitefield': [12.96964, 77.74974],
      'yelahanka': [13.1007, 77.59635],
      'yeswanthpur': [13.02218, 77.55308]
    },

    names: {
      'anjanapura': 'Anjanapura',
      'arkavathy-layout': 'Arkavathy Layout',
      'austin-town': 'Austin Town',
      'baiyyappanahalli': 'Baiyyappanahalli',
      'balagere': 'Balagere',
      'banashankari': 'Banashankari',
      'banashankari-6th-stage': 'Banashankari 6th Stage',
      'banaswadi': 'Banaswadi',
      'basavanagudi': 'Basavanagudi',
      'basaveshwaranagar': 'Basaveshwaranagar',
      'beguru': 'Beguru',
      'bellanduru': 'Bellanduru',
      'btm-layout': 'BTM Layout',
      'c-v-raman-nagar': 'C V Raman Nagar',
      'carmelaram': 'Carmelaram',
      'challaghatta': 'Challaghatta',
      'chamarajapete': 'Chamarajapete',
      'chikka-banavara': 'Chikka Banavara',
      'chikkanayakanahalli': 'Chikkanayakanahalli',
      'chikkapete': 'Chikkapete',
      'choodasandra': 'Choodasandra',
      'doddakannalli': 'Doddakannalli',
      'dr-shivaram-karanth-layout': 'Dr. Shivaram Karanth Layout',
      'epip-zone': 'EPIP Zone',
      'frazer-town': 'Frazer Town',
      'gandhinagar': 'Gandhinagar',
      'gottigere': 'Gottigere',
      'gunjur': 'Gunjur',
      'halasuru': 'Halasuru',
      'haralur': 'Haralur',
      'hbr-layout': 'HBR Layout',
      'hebbal': 'Hebbal',
      'hennur': 'Hennur',
      'herohalli': 'Herohalli',
      'hoodi': 'Hoodi',
      'horamavu': 'Horamavu',
      'hsr-layout': 'HSR Layout',
      'huskur': 'Huskur',
      'indiranagar': 'Indiranagar',
      'jakkur': 'Jakkur',
      'jalahalli': 'Jalahalli',
      'jayanagar': 'Jayanagar',
      'jnana-bharathi': 'Jnana Bharathi',
      'jp-nagar': 'JP Nagar',
      'kadugodi': 'Kadugodi',
      'kalyan-nagar': 'Kalyan Nagar',
      'kammanahalli': 'Kammanahalli',
      'kasavanahalli': 'Kasavanahalli',
      'kaval-byrasandra': 'Kaval Byrasandra',
      'kempapura-agrahara': 'Kempapura Agrahara',
      'kengeri': 'Kengeri',
      'kodati': 'Kodati',
      'konanakunte': 'Konanakunte',
      'kodihalli': 'Kodihalli',
      'koramangala': 'Koramangala',
      'kothnur': 'Kothnur',
      'kr-puram': 'KR Puram',
      'kudlu': 'Kudlu',
      'laggere': 'Laggere',
      'lingarajapuram': 'Lingarajapuram',
      'madhavara': 'Madhavara',
      'mahadevapura': 'Mahadevapura',
      'mahalakshmi-layout': 'Mahalakshmi Layout',
      'malleswaram': 'Malleswaram',
      'marathahalli': 'Marathahalli',
      'mathikere': 'Mathikere',
      'mulluru': 'Mulluru',
      'nadaprabhu-kempegowda-layout': 'Nadaprabhu Kempegowda Layout',
      'nagarabhavi': 'Nagarabhavi',
      'nagasandra': 'Nagasandra',
      'nagavara': 'Nagavara',
      'panathur': 'Panathur',
      'pattanduru-agrahara': 'Pattanduru Agrahara',
      'peenya': 'Peenya',
      'rajajinagar': 'Rajajinagar',
      'rajarajeshwari-nagar': 'Rajarajeshwari Nagar',
      'ramamurthy-nagar': 'Ramamurthy Nagar',
      'richmond-town': 'Richmond Town',
      'rmv-2nd-stage': 'RMV 2nd Stage',
      'rt-nagar': 'RT Nagar',
      'sadashivanagar': 'Sadashivanagar',
      'sahakaranagara': 'Sahakaranagara',
      'shanti-nagar': 'Shanti Nagar',
      'shivajinagar': 'Shivajinagar',
      'sir-mv-layout': 'Sir MV Layout',
      'sulikunte': 'Sulikunte',
      'sulthanpalya': 'Sulthanpalya',
      'tc-palya': 'TC Palya',
      'uttarahalli': 'Uttarahalli',
      'varthur': 'Varthur',
      'vasanth-nagar': 'Vasanth Nagar',
      'vidyaranyapura': 'Vidyaranyapura',
      'vijaya-nagar': 'Vijaya Nagar',
      'whitefield': 'Whitefield',
      'yelahanka': 'Yelahanka',
      'yeswanthpur': 'Yeswanthpur'
    }
  };

  /* ---------- when the city is shut ----------

     INCOMPLETE, DELIBERATELY. The fixed national and state days are
     below and are safe. The ones that actually empty this city — Ugadi,
     Dasara, Deepavali, Eid, Holi, Ganesh Chaturthi — all move against
     the Gregorian calendar, and a guessed date here would put a wrong
     closure on a real shop. They need filling in from a published
     Karnataka calendar before this pack ships.

     The Paris assumption underneath does not transfer cleanly either: a
     French public holiday shuts bakeries and leaves museums open.
     Deepavali closes most of this city for two days and Rajyotsava
     closes very little. That is a per-city judgement and this table is
     only half of it. */

  const holidays = {
    '2026-10-02': 'Gandhi Jayanti',
    '2026-11-01': 'Kannada Rajyotsava',
    '2026-12-25': 'Christmas Day',
    '2027-01-26': 'Republic Day',
    '2027-08-15': 'Independence Day'
  };

  const shutsOnHoliday = ['bakery', 'cafe', 'shop', 'market'];

  /* A judgement about this city, not a conversion from the euro. Five
     hundred rupees is a cheap evening out in Bengaluru; the figure is
     Ekta's to set, not arithmetic's. */
  const money = { symbol: '₹', cheap: 500, format: n => `₹${n}` };

  /* ---------- which views this city has ----------

     Paris's eight, plus one it has no use for. *Your side* is the view
     this city actually wants: Indiranagar to Whitefield at 6pm is a
     different city from the same trip at 11am, and no amount of ranking
     by distance says so. Its builder lives in views/yourside.js and is
     registered through App.defineView — nothing in the engine knows the
     file exists. */

  const views = {
    main: [
      { id: 'today',    label: 'Today' },
      { id: 'nights',   label: 'Nights' },
      { id: 'weekend',  label: 'Weekend' },
      { id: 'eat',      label: 'Eat' },
      { id: 'sport',    label: 'Sport' },
      { id: 'yourside', label: 'Your side' },
      { id: 'regulars', label: 'Regulars' },
      { id: 'explore',  label: 'Explore' },
      { id: 'away',     label: 'Away' }
    ],
    utility: [
      { id: 'quests', label: 'Quests' },
      { id: 'saved',  label: 'Saved' }
    ]
  };

  /* ---------- how long a kilometre takes ----------

     This is the model the whole city turns on. Paris answers "how far"
     with a distance; Bengaluru answers it with a distance, a direction
     and a time of day, and gets three different numbers for the same
     trip. Indiranagar to Whitefield is fourteen kilometres and it is
     either thirty-five minutes or ninety.

     Three modes, cheapest wins:

       walk    under a couple of kilometres, and genuinely unpleasant
               above that — footpaths here are a lottery, so this is
               slightly slower than Paris's and gives up sooner.
       metro   Namma Metro is fast where it goes and goes to very little.
               Long access because two lines do not cover a city this
               size, so most trips start with an auto to the station.
       road    auto or cab, which is what people actually take. Twenty-two
               km/h off-peak is already a low number and it is the honest
               one; eleven is what the same road does at half past six.

     The rush windows are the real ones and are weekdays only. Nothing
     here pretends to know the state of a particular road — it knows the
     time and the direction, which is what a local would tell you.  */

  const RUSH = [[8.5, 11], [17, 21]];

  const reach = {
    rush: RUSH,

    isPeak(when) {
      const day = when.getDay();
      if (day === 0 || day === 6) return false;
      const h = when.getHours() + when.getMinutes() / 60;
      return RUSH.some(([a, b]) => h >= a && h < b);
    },

    minutes(d, when) {
      const walk  = d < 2.5 ? d / 4.5 * 60 : Infinity;
      const metro = 10 + (d / 20) * 60 + 6;
      const road  = 4 + (d / (this.isPeak(when) ? 11 : 22)) * 60;
      return Math.max(2, Math.round(Math.min(walk, metro, road)));
    },

    /* Two neighbourhoods are "the same side" when their bearings from
       the middle of the city are within this many degrees of each other.
       Not a traffic model — a way of saying "you would not be crossing
       town", which is the question people actually ask. */
    sector: 70
  };

  /* The middle, for bearings. Cubbon Park and Vidhana Soudha, which is
     where the city is measured from in every other sense too. */
  const centre = [12.9767, 77.5905];

  /* Kodihalli, rounded to about a kilometre. Overridden by
     Weather.setHome() from data/home.json once it lands. */
  const weather = { lat: 12.96, lon: 77.65, tz: 'Asia/Kolkata' };

  /* What to ask Overpass for: the city and the ring road, generously.
     Wider than Paris's box because the city is, and because Whitefield
     and Electronic City are places people actually go. */
  const bbox = '12.85,77.45,13.12,77.78';

  /* Not yet. A worker's scope is the directory its script sits in, so
     this city needs its own copy of sw.js — which means splitting the
     shared logic out of Paris's, and that file's correctness is
     arithmetic rather than taste (invariant 13). Without one the site
     works and simply is not available offline; with a careless one it
     serves the wrong city's cached page. Deferred on purpose. */
  const serviceWorker = false;

  /* ---------- what counts as notable here ----------

     Extra Wikidata classes for scripts/notable.mjs. The base list found
     thirty-one records in Bengaluru, because what Wikidata holds inside
     this bounding box is 791 hotels, 483 petrol stations and 210 HDFC
     Bank branches — and three cafés.

     The lakes are the entry that matters. Bengaluru has 22 of them on
     record and they are what this city has instead of parks: Ulsoor,
     Sankey Tank, Hebbal. A guide here that lists parks and not lakes is
     describing somewhere else. */
  const notable = {
    classes: [
      ['wd:Q23397',   'park'],      // lake
      ['wd:Q22746',   'park'],      // urban park
      ['wd:Q1107656', 'park'],      // garden
      ['wd:Q842402',  'culture'],   // Hindu temple
      ['wd:Q16970',   'culture'],   // church building
      ['wd:Q32815',   'culture'],   // mosque
      ['wd:Q4989906', 'culture'],   // monument
      ['wd:Q839954',  'culture'],   // archaeological site
      ['wd:Q16560',   'culture']    // palace
    ]
  };

  /* ---------- Luma ----------

     Bengaluru's calendar is the densest of the four cities by a wide
     margin relative to what else it has: 29 events on a rolling fortnight,
     every one carrying a GEO pin, and 27 of them inside the box. Twelve
     are tech, which for the city that exports engineers is fewer than you
     would guess — the rest are runs, socials and build nights.

     Read by two scripts, split by one rule: practices.mjs takes the tech
     and AI evenings, events-city.mjs takes the rest. LUMA_TECH in
     scripts/ics.mjs is that rule, and it lives in one place so an
     evening cannot land in both files or neither. */
  const luma = [['discover', 'discplace-G0tGUVYwl7T17Sb', 'Luma — Bengaluru']];

  /* Luma only — no municipal feed here carries what you could take up. */
  const practices = { city: null };

  /* ---------- what else this city is made of ----------

     Extra OpenStreetMap layers for scripts/discover.mjs, on top of the
     cafés and bakeries it looks for everywhere. See the note above
     LAYERS in that file for the counts that prompted these. */
  const discover = {
    /* Places drawn as a building outline as well as a pin — see
       discover.mjs. Most of a market street's restaurants are drawn that
       way, and the index missed every one of them. */
    buildings: true,
    layers: [
      { cat:'culture',    emoji:'🏛️', label:'Historic',    q:['way["historic"]["name"]','node["historic"]["name"]'] },
      { cat:'park',       emoji:'💧', label:'Water',       q:['way["natural"="water"]["name"]'], minName:true },
      { cat:'restaurant', emoji:'🍛', label:'Counter food', q:['node["amenity"="fast_food"]["name"]','node["amenity"="food_court"]["name"]'] }
    ]
  };

  return { id, name, ua, bbox, serviceWorker, zone, reach, centre, views, holidays, shutsOnHoliday, money, weather, notable, luma, practices, discover };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = City;
