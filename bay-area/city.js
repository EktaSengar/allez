/* ---------------------------------------------------------
   cities/bay-area/city.js — what is true of the Bay Area.

   The fourth pack, and the one the plan expected to break the model.
   It did not, because two things turned out to be true:

     it is two places, and there are two homes for them. North Beach and
     Downtown North are fifty kilometres apart, and a list ranked from
     one is not a slightly different list from the other — it is a
     different city. So this is the first pack with `bases`.

     the weather is not one fact. Measured on 14 September 2026, at the
     same minute: Outer Sunset 18.4 degrees under 44% cloud, the Mission
     23.6 and clear, Palo Alto 27.8. One forecast for "the Bay Area" is
     wrong in both directions on the same afternoon, which is why this
     is the first pack with `climate`.
   --------------------------------------------------------- */

const City = (() => {

  const id   = 'bay-area';

  /* Briefly called SF, because "Allez SF" chants and "Allez the Bay"
     does not. Reverted, and the reason is worth keeping: the pack
     covers Palo Alto and Mountain View, which are emphatically not San
     Francisco, and a guide whose entire principle is not being wrong
     about a place cannot open by being wrong about which place it is.
     A name that chants is not worth an overclaim on the front door.

     Carries its article, because it is one of those names that always
     does — nobody says "I live in Bay Area". That costs one thing: any
     heading built as "Hidden ${name}" reads as "Hidden the Bay Area",
     so headings of that shape are supplied by the pack rather than
     assembled by the engine. See `hiddenHeading`. */
  const name = 'the Bay Area';
  /* What a map search should be told, when the display name is not a place
     you can look up. "the Bay Area" finds nothing; a New York zone label is
     an NTA composite like "Annadale-Huguenot-Prince's Bay-Woodrow". */
  const searchRegion = 'CA';

  const ua = 'allez-bay-area (personal site)';

  /* ---------- what a piece of it is called ----------

     Two grammars, deliberately. In the city it is a neighbourhood —
     the Mission, Hayes Valley, Dogpatch, the Outer Sunset. On the
     Peninsula it is the town — Palo Alto, Mountain View, Menlo Park —
     and nobody says a neighbourhood name south of Daly City.

     `side` is what makes that work, and it is the Bay-specific idea in
     this file: every zone knows whether it is in the city or on the
     Peninsula, because "is it on my side" is the first question anybody
     asks here and the answer is not a distance.

     Eight zones used to sit in these tables that do not belong in this
     pack at all — Fremont, Hayward, Castro Valley, Union City, Newark,
     Decoto, Alvarado and Centerville. Every one is in Alameda County,
     which is to say the East Bay, which `bbox` below says in its own
     words this guide is not about. They were labelled `peninsula`, and
     `castro-valley` had quietly become the second-largest zone in the
     index on 542 places, most of them in Oakland. */

  const zone = {
    one:  'neighbourhood',
    many: 'neighbourhoods',
    label: k => (zone.names[k] || k),
    display: (k, nm) => (nm || zone.names[k] || name),
    fallback: 'the Bay Area',
    allHeading: 'Everywhere',
    tile: k => (zone.names[k] || k),

    /* How far a point may be from the nearest centroid and still be in
       this city. The first pack to need one, and the reason is the
       shape: `bbox` is a rectangle and the bay runs diagonally through
       it, so a box that reaches Mountain View in the south necessarily
       reaches Oakland in the north. There is no rectangle that says "SF
       down to Mountain View" and nothing east of the water.

       The zones can say it, because there are none over there. Measured
       on the September index: 2,766 of 9,170 discovered places were east
       of the bay, and each was labelled with the nearest San Francisco
       zone across it — Montclair Branch Library, in Oakland, came back
       as Rincon Hill, 16.5 km and a bridge away. 266 notable records
       were more than 8 km from the zone they had been given.

       Ten kilometres, chosen from the data rather than picked: it drops
       2,325 of them and not one is in scope. The nearest in-scope
       records to the line are the hill places above Woodside and Portola
       Valley at 8–9 km, genuinely that far from anywhere with a name,
       and they stay.

       What it does not fix, stated so nobody thinks it does: 441 East
       Bay places sit within 10 km of a San Francisco centroid, because
       the Oakland and Alameda waterfronts genuinely are that close to
       Hunters Point as the crow flies. A distance cannot tell water from
       road. Those want a boundary, not a radius. */
    limitKm: 10,

    centroids: {
      'anza-vista': [37.78084, -122.44315],
      'atherton': [37.45377, -122.20583],
      'balboa-terrace': [37.73171, -122.46857],
      'bayshore': [37.70632, -122.4133],
      'bayview-district': [37.7341, -122.39136],
      'belmont': [37.51649, -122.29419],
      'bernal-heights': [37.741, -122.41421],
      'brisbane': [37.68717, -122.40279],
      'burlingame': [37.5781, -122.34731],
      'cole-valley': [37.76581, -122.44996],
      'cow-hollow': [37.79726, -122.43625],
      'daly-city': [37.69048, -122.47267],
      'diamond-heights': [37.74229, -122.43921],
      'dogpatch': [37.7607, -122.3892],
      'duboce-triangle': [37.76714, -122.43223],
      'east-palo-alto': [37.46883, -122.14108],
      'fillmore-district': [37.78305, -122.43291],
      'fisherman-s-wharf': [37.80813, -122.41659],
      'forest-hill': [37.74743, -122.46358],
      'forest-knolls': [37.75427, -122.45895],
      'foster-city': [37.56003, -122.26885],
      'golden-gate-heights': [37.75459, -122.4709],
      'half-moon-bay': [37.46355, -122.42859],
      'hayes-valley': [37.77669, -122.42294],
      'hillsborough': [37.55725, -122.36253],
      'hunters-point': [37.72677, -122.37157],
      'ingleside-terraces': [37.72462, -122.46815],
      'inner-richmond': [37.77862, -122.46419],
      'japantown': [37.78558, -122.42981],
      'jordan-park': [37.78465, -122.45664],
      'laurel-heights': [37.7842, -122.45104],
      'little-hollywood': [37.7117, -122.39912],
      'little-saigon': [37.7838, -122.41759],
      'los-altos': [37.37906, -122.11658],
      'lower-nob-hill': [37.78842, -122.4152],
      'lower-pacific-heights': [37.78577, -122.4389],
      'menlo-park': [37.45197, -122.17799],
      'midtown-terrace': [37.75117, -122.45219],
      'millbrae': [37.59896, -122.40094],
      'mission': [37.75993, -122.41914],
      'mount-davidson-manor': [37.72828, -122.46397],
      'mountain-view': [37.38939, -122.08321],
      'noe-valley': [37.75159, -122.43208],
      'north-beach': [37.80117, -122.409],
      'north-fair-oaks': [37.47571, -122.20174],
      'north-of-panhandle': [37.77688, -122.44235],
      'ocean-view': [37.71365, -122.45748],
      'outer-mission': [37.71384, -122.44804],
      'outer-sunset': [37.75415, -122.50615],
      'pacifica': [37.59804, -122.49952],
      'palo-alto': [37.44433, -122.15985],
      'parkside': [37.74238, -122.48744],
      'pier-70': [37.76145, -122.38546],
      'polk-gulch': [37.79081, -122.42078],
      'potrero-terrace': [37.75392, -122.39686],
      'presidio-heights': [37.78875, -122.45303],
      'presidio-terrace': [37.78823, -122.46092],
      'redwood-city': [37.48632, -122.23252],
      'richmond-district': [37.78064, -122.4726],
      'rincon-hill': [37.78615, -122.39241],
      'russian-hill': [37.80007, -122.41709],
      'saint-francis-wood': [37.73465, -122.46803],
      'san-bruno': [37.62485, -122.4146],
      'san-carlos': [37.50494, -122.26182],
      'san-mateo': [37.563, -122.32533],
      'seacliff': [37.78854, -122.48692],
      'silver-terrace': [37.73385, -122.40003],
      'south-beach': [37.77981, -122.39115],
      'south-of-market': [37.78089, -122.40095],
      'south-san-francisco': [37.65354, -122.41687],
      'st-mary-s-park': [37.73309, -122.42439],
      'sunnyside': [37.73158, -122.44089],
      'sunnyvale': [37.36883, -122.03635],
      'sunset-district': [37.75354, -122.49525],
      'telegraph-hill': [37.80078, -122.40409],
      'top-of-the-hill': [37.7054, -122.46193],
      'union-square': [37.78751, -122.40716],
      'west-portal': [37.74034, -122.46637],
      'west-soma': [37.77681, -122.40844],
      'western-addition': [37.77956, -122.42981],
      'westwood-park': [37.72758, -122.45823]
    },

    names: {
      'anza-vista': 'Anza Vista',
      'atherton': 'Atherton',
      'balboa-terrace': 'Balboa Terrace',
      'bayshore': 'Bayshore',
      'bayview-district': 'Bayview District',
      'belmont': 'Belmont',
      'bernal-heights': 'Bernal Heights',
      'brisbane': 'Brisbane',
      'burlingame': 'Burlingame',
      'cole-valley': 'Cole Valley',
      'cow-hollow': 'Cow Hollow',
      'daly-city': 'Daly City',
      'diamond-heights': 'Diamond Heights',
      'dogpatch': 'Dogpatch',
      'duboce-triangle': 'Duboce Triangle',
      'east-palo-alto': 'East Palo Alto',
      'fillmore-district': 'Fillmore District',
      'fisherman-s-wharf': 'Fisherman\'s Wharf',
      'forest-hill': 'Forest Hill',
      'forest-knolls': 'Forest Knolls',
      'foster-city': 'Foster City',
      'golden-gate-heights': 'Golden Gate Heights',
      'half-moon-bay': 'Half Moon Bay',
      'hayes-valley': 'Hayes Valley',
      'hillsborough': 'Hillsborough',
      'hunters-point': 'Hunters Point',
      'ingleside-terraces': 'Ingleside Terraces',
      'inner-richmond': 'Inner Richmond',
      'japantown': 'Japantown',
      'jordan-park': 'Jordan Park',
      'laurel-heights': 'Laurel Heights',
      'little-hollywood': 'Little Hollywood',
      'little-saigon': 'Little Saigon',
      'los-altos': 'Los Altos',
      'lower-nob-hill': 'Lower Nob Hill',
      'lower-pacific-heights': 'Lower Pacific Heights',
      'menlo-park': 'Menlo Park',
      'midtown-terrace': 'Midtown Terrace',
      'millbrae': 'Millbrae',
      'mission': 'Mission',
      'mount-davidson-manor': 'Mount Davidson Manor',
      'mountain-view': 'Mountain View',
      'noe-valley': 'Noe Valley',
      'north-beach': 'North Beach',
      'north-fair-oaks': 'North Fair Oaks',
      'north-of-panhandle': 'North of Panhandle',
      'ocean-view': 'Ocean View',
      'outer-mission': 'Outer Mission',
      'outer-sunset': 'Outer Sunset',
      'pacifica': 'Pacifica',
      'palo-alto': 'Palo Alto',
      'parkside': 'Parkside',
      'pier-70': 'Pier 70',
      'polk-gulch': 'Polk Gulch',
      'potrero-terrace': 'Potrero Terrace',
      'presidio-heights': 'Presidio Heights',
      'presidio-terrace': 'Presidio Terrace',
      'redwood-city': 'Redwood City',
      'richmond-district': 'Richmond District',
      'rincon-hill': 'Rincon Hill',
      'russian-hill': 'Russian Hill',
      'saint-francis-wood': 'Saint Francis Wood',
      'san-bruno': 'San Bruno',
      'san-carlos': 'San Carlos',
      'san-mateo': 'San Mateo',
      'seacliff': 'Seacliff',
      'silver-terrace': 'Silver Terrace',
      'south-beach': 'South Beach',
      'south-of-market': 'South of Market',
      'south-san-francisco': 'South San Francisco',
      'st-mary-s-park': 'St. Mary\'s Park',
      'sunnyside': 'Sunnyside',
      'sunnyvale': 'Sunnyvale',
      'sunset-district': 'Sunset District',
      'telegraph-hill': 'Telegraph Hill',
      'top-of-the-hill': 'Top of the Hill',
      'union-square': 'Union Square',
      'west-portal': 'West Portal',
      'west-soma': 'West SoMa',
      'western-addition': 'Western Addition',
      'westwood-park': 'Westwood Park'
    },

    /* city | peninsula */
    side: {
      'anza-vista': 'city',
      'atherton': 'peninsula',
      'balboa-terrace': 'city',
      'bayshore': 'city',
      'bayview-district': 'city',
      'belmont': 'peninsula',
      'bernal-heights': 'city',
      'brisbane': 'peninsula',
      'burlingame': 'peninsula',
      'cole-valley': 'city',
      'cow-hollow': 'city',
      'daly-city': 'peninsula',
      'diamond-heights': 'city',
      'dogpatch': 'city',
      'duboce-triangle': 'city',
      'east-palo-alto': 'peninsula',
      'fillmore-district': 'city',
      'fisherman-s-wharf': 'city',
      'forest-hill': 'city',
      'forest-knolls': 'city',
      'foster-city': 'peninsula',
      'golden-gate-heights': 'city',
      'half-moon-bay': 'peninsula',
      'hayes-valley': 'city',
      'hillsborough': 'peninsula',
      'hunters-point': 'city',
      'ingleside-terraces': 'city',
      'inner-richmond': 'city',
      'japantown': 'city',
      'jordan-park': 'city',
      'laurel-heights': 'city',
      'little-hollywood': 'city',
      'little-saigon': 'city',
      'los-altos': 'peninsula',
      'lower-nob-hill': 'city',
      'lower-pacific-heights': 'city',
      'menlo-park': 'peninsula',
      'midtown-terrace': 'city',
      'millbrae': 'peninsula',
      'mission': 'city',
      'mount-davidson-manor': 'city',
      'mountain-view': 'peninsula',
      'noe-valley': 'city',
      'north-beach': 'city',
      'north-fair-oaks': 'peninsula',
      'north-of-panhandle': 'city',
      'ocean-view': 'city',
      'outer-mission': 'city',
      'outer-sunset': 'city',
      'pacifica': 'peninsula',
      'palo-alto': 'peninsula',
      'parkside': 'city',
      'pier-70': 'city',
      'polk-gulch': 'city',
      'potrero-terrace': 'city',
      'presidio-heights': 'city',
      'presidio-terrace': 'city',
      'redwood-city': 'peninsula',
      'richmond-district': 'city',
      'rincon-hill': 'city',
      'russian-hill': 'city',
      'saint-francis-wood': 'city',
      'san-bruno': 'peninsula',
      'san-carlos': 'peninsula',
      'san-mateo': 'peninsula',
      'seacliff': 'city',
      'silver-terrace': 'city',
      'south-beach': 'city',
      'south-of-market': 'city',
      'south-san-francisco': 'peninsula',
      'st-mary-s-park': 'city',
      'sunnyside': 'city',
      'sunnyvale': 'peninsula',
      'sunset-district': 'city',
      'telegraph-hill': 'city',
      'top-of-the-hill': 'city',
      'union-square': 'city',
      'west-portal': 'city',
      'west-soma': 'city',
      'western-addition': 'city',
      'westwood-park': 'city'
    }
  };

  /* ---------- the two homes ----------

     The first is the default until a reader saves their own. Both are
     real: Green Tortoise is a public address and exact; Downtown North
     is a home and so is rounded to the neighbourhood, which is the rule
     Paris set and the only one of these four cities where it still has
     to apply. */

  const bases = [
    { id: 'city', label: 'North Beach', zone: 'north-beach',
      lat: 37.79827, lon: -122.40531, exact: true,
      note: 'Green Tortoise, 494 Broadway.' },
    { id: 'peninsula', label: 'Downtown North', zone: 'palo-alto',
      lat: 37.4479, lon: -122.1601, exact: false,
      note: 'Rounded to the neighbourhood, not the door.' }
  ];

  /* ---------- the microclimate ----------

     Five points, fetched in one call, because Open-Meteo takes a list.
     Chosen to bracket the spread rather than to cover the map evenly:
     the Sunset is the fog, the Mission is the sun two miles away, and
     the Peninsula is reliably ten degrees warmer than either.

     Every zone ranks against its nearest station, so a fine afternoon
     in the Mission does not put the Outer Sunset at the top of the
     page — which is the one thing a visitor-written guide always gets
     wrong here. */

  const climate = {
    stations: [
      { id: 'sunset',   lat: 37.7558, lon: -122.4949 },
      { id: 'mission',  lat: 37.7599, lon: -122.4148 },
      { id: 'downtown', lat: 37.7937, lon: -122.3965 },
      { id: 'palo-alto', lat: 37.4419, lon: -122.1430 },
      { id: 'south-bay', lat: 37.3861, lon: -122.0839 }
    ]
  };

  /* ---------- how long a kilometre takes ----------

     The first pack where walking is not the short answer. In the city
     it still is, below a mile or so. Everywhere else it is Caltrain or
     it is the 101, and both are slow in ways that have nothing to do
     with distance: Caltrain is fast between its stops and useless
     between anything else, and the freeway is a car park twice a day.

     Crossing between the city and the Peninsula is priced separately,
     because it is a decision rather than a trip. */

  const RUSH = [[7, 10], [16, 19]];

  const reach = {
    rush: RUSH,
    isPeak(when) {
      const d = when.getDay();
      if (d === 0 || d === 6) return false;
      const h = when.getHours() + when.getMinutes() / 60;
      return RUSH.some(([a, b]) => h >= a && h < b);
    },
    minutes(d, when) {
      const walk = d < 1.6 ? d / 4.8 * 60 : Infinity;
      const muni = d < 12 ? 6 + (d / 13) * 60 + 4 : Infinity;
      const train = d > 12 ? 12 + (d / 55) * 60 + 8 : Infinity;
      const car = 5 + (d / (this.isPeak(when) ? 24 : 48)) * 60;
      return Math.max(2, Math.round(Math.min(walk, muni, train, car)));
    },
    sector: 90
  };

  const centre = [37.7749, -122.4194];

  /* US federal holidays, fixed-date ones only. Thanksgiving and the
     Monday holidays move and are not guessed. */
  const holidays = {
    '2026-11-26': 'Thanksgiving',
    '2026-12-25': 'Christmas Day',
    '2027-01-01': "New Year's Day",
    '2027-07-04': 'Independence Day'
  };

  const shutsOnHoliday = ['bakery', 'cafe', 'shop', 'market'];

  /* "Hidden the Bay Area" is what the engine would otherwise assemble.
     A city whose name takes an article says what it wants instead. */
  const hiddenHeading = 'Hidden corners';

  const money = { symbol: '$', cheap: 30, format: n => `$${n}` };

  const views = {
    main: [
      { id: 'today',    label: 'Today' },
      { id: 'nights',   label: 'Nights' },
      { id: 'weekend',  label: 'Weekend' },
      { id: 'eat',      label: 'Eat' },
      { id: 'sport',    label: 'Sport' },
      { id: 'regulars', label: 'Regulars' },
      { id: 'explore',  label: 'Explore' },
      { id: 'away',     label: 'Away' }
    ],
    utility: [
      { id: 'quests', label: 'Quests' },
      { id: 'saved',  label: 'Saved' }
    ]
  };

  const weather = { lat: 37.79, lon: -122.41, tz: 'America/Los_Angeles' };

  /* SF down to Mountain View. Deliberately not the whole nine counties:
     the East Bay is a different place with different answers, and
     pretending otherwise is how a guide ends up being about none of
     them. */
  const bbox = '37.33,-122.55,37.84,-121.98';

  /* ---------- Luma ----------

     The Bay's real source for anything with a date on it that is not a
     museum or a library, and the one place in this pack where the Bay
     is richer than Paris: `luma.com/sf` is a discovery calendar fifty
     events deep at any time, every one carrying a GEO pin. Checked and
     found to have no discovery id of their own: `luma.com/paloalto`,
     `luma.com/bay-area`, `luma.com/san-francisco` — the Peninsula has no
     calendar, and what is on down there arrives through this one.

     Read by two scripts, split by one rule. practices.mjs takes the tech
     and AI evenings, as it does for Paris. events-bay.mjs takes the rest
     — the reading in the park, the makers market, the transit art fair.
     In Paris the city's own feed covers those and Luma's copies can be
     discarded; here nothing else covers them, so discarding them would
     throw away half the calendar. */
  /* The discovery calendar is the city's, and from Palo Alto it is
     almost all out of reach: of eighteen tech evenings on 23 September
     2026, seventeen were in San Francisco, so the Peninsula's Regulars
     tab was empty. (luma.com/san-jose is this same calendar under
     another name.) Three organiser calendars that do meet down there
     were measured and added, each by how many of its upcoming events
     fell south of San Mateo: Bay Area Founders Club 8 of 58, Open
     Source for AI 3 of 18, Bay Area AI 1 of 3. Stanford's own founder
     calendars had nothing upcoming and are left out. */
  const luma = [
    ['discover', 'discplace-BDj7GNbGlsF7Cka', 'Luma — San Francisco'],
    ['calendar', 'cal-2BuL8o8ylVizd6x', 'Luma — Bay Area Founders Club'],
    ['calendar', 'cal-8zLyKMgaKTvonbT', 'Luma — Open Source for AI'],
    ['calendar', 'cal-UnI4f4BhUDYndI8', 'Luma — Bay Area AI']
  ];

  /* ---------- what is on ----------

     Read by scripts/events-city.mjs. These two are local institutions
     rather than anything a script could guess at: Stanford runs a
     Localist calendar that is the Peninsula's only dated source, and
     Our415 is DataSF's programme feed, whose library half is the only
     part an adult would go to. Luma is declared above and read by both
     collectors. */
  const events = { localist: 'https://events.stanford.edu', our415: true };

  /* ---------- what you could take up ----------

     Read by scripts/practices.mjs. `city` is Our415's Rec & Park half,
     and it is small for a reason worth knowing before anybody widens it.
     Seventy of its adult rows recur on stated weekdays; sixty of those
     are basketball, table tennis, pickleball and the weight room. They
     are real and free and belong on the Sport tab — Paris keeps sport
     out of practices on purpose, for the reason written in
     practices.mjs — so what is left is the dance and art classes, which
     is a handful. The library half does not repeat inside the month
     Our415 publishes, so it has no rhythm to read and stays in
     events-city.json. */
  const practices = { city: 'our415' };

  const serviceWorker = false;

  /* The lines under the Nights headings. */
  const nightNotes = {
    comedy: 'Where Robin Williams started, and improv by the bay',
    jazz:   'A concert hall built for it, and a supper club underground',
    venue:  'The ballrooms the sixties happened in',
    club:   'The late ones',
    bar:    'Beat bars, tiki, and a Chinatown mai tai'
  };

  /* What discover.mjs asks OpenStreetMap for, beyond the base layers.
     `buildings`: places mapped as a building outline as well as a pin —
     most of University Avenue is drawn that way. */
  const discover = { buildings: true };

  return { id, name, searchRegion, ua, bbox, nightNotes, discover, serviceWorker, zone, bases, climate, reach, practices, luma, events,
           centre, views, hiddenHeading, holidays, shutsOnHoliday, money, weather };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = City;
