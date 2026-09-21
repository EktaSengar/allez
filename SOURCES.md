# Where a city's data comes from

Every collector in `scripts/` exists because some city publishes something.
Which collectors a new pack can reuse depends almost entirely on **which
country it is in** — far more than on how big or rich the city is. This is
what each region actually publishes, measured rather than assumed, so that
adding a fifth city starts from the right question.

The rule the whole repo is built on, and the one that decides most of this:
**no API keys, no accounts.** A static site with no backend cannot hold a
secret, and a source that needs one is not a source.

---

## The short version

| | Europe | United States | India |
|---|---|---|---|
| Municipal portal | **Opendatasoft / CKAN** | **Socrata / CKAN** | none |
| Keyless API | yes | yes | no |
| City events feed | usually | rarely | no |
| Facilities, with hours | usually | sometimes | no |
| Wikidata, everyday places | good | good | **very thin** |
| Wikidata, monuments | good | thin | **good** |
| OpenStreetMap | good | good | good |
| Luma (tech and social evenings) | some cities | strong | **strong** |

Measured on 18 September 2026, by asking each platform's own federated
catalogue how many datasets it holds for the city:

```
Opendatasoft    Paris 9,149    San Francisco 118    Delhi 0    Bengaluru 0
Socrata         New York 4,448  San Francisco 388   London 87  Delhi 5*  Mumbai 0
CKAN            Barcelona 555 datasets, keyless, no account
```

\* All five Delhi hits on Socrata are NASA satellite products — atmospheric
soundings over the "Delhi Megacity" — not municipal data. The real number
is zero.

---

## Europe

The richest of the three, and the reason `events.mjs` and `civic.mjs` exist
in the shape they do.

**Opendatasoft** powers `opendata.paris.fr` and a few hundred other
European cities. One REST shape, keyless, with `where=` filters and
pagination: if a new European city runs it, `events.mjs` is mostly a
change of dataset id. Paris publishes on it the two things that are
hardest to get anywhere else — a cultural events feed with coordinates,
dates, price and an official link (~2,200 live listings), and its own
facilities with **opening days and hours** on them.

**CKAN** is the other standard, used by Berlin, Barcelona, Amsterdam and
the EU itself. Its `/api/3/action/` endpoints are keyless. Barcelona
answers `package_list` with 555 datasets and no account.

What Europe gives that nowhere else reliably does: *the city itself saying
what is on this week.*

---

## United States

**Socrata** powers `data.sfgov.org` and most large American cities, keyless,
with a `$limit`/`$where` query language. Coverage is wide but the *kind* of
data differs from Europe in a way that matters:

- Facilities: yes. `civic-bay.mjs` reads 2,676 typed Rec & Park facilities.
- Events: mostly no. San Francisco's only events dataset is Our415, which
  is the Rec & Park and Public Library programme calendar and is largely
  for children — about fifty rows an adult would go to.

So an American city needs its events from somewhere else, and the two that
worked for the Bay Area are both worth trying first in any US city:

- **Localist** (`/api/2/events`), keyless, run by most large American
  universities. Stanford's is the Peninsula's only dated source: 610
  events a month, of which 225 are open to the public.
- **Luma**, below.

---

## India

**There is no municipal open-data layer to read.** This is the finding that
most changes how an Indian city is built, and it is worth stating plainly
rather than rediscovering:

- `data.gov.in` is the national portal and is not CKAN or Socrata. Its API
  answers `{"error": "Authorization field missing"}` without a key, and
  `/api/3/action/package_list` returns 403. A key breaks the rule above.
- Neither Delhi nor Bengaluru appears in the Opendatasoft or Socrata
  federated catalogues at all.
- City bodies — BBMP, DDA — publish PDFs and dashboards, not APIs.

**Wikidata is thin in a specific and correctable way.** The class list in
`notable.mjs` was written against Paris — cafés, bakeries, bookshops,
bistros — and asked about an Indian city it finds almost nothing. Inside
Bengaluru's bounding box Wikidata holds 791 hotels, 483 petrol stations,
383 colleges and 210 HDFC Bank branches, against **three cafés**.

But the same box holds 31 Hindu temples and 22 lakes, and Delhi's holds 59
tombs, 41 mosques and 17 gurdwaras. So the fix is not another source, it is
asking the right question: a pack declares `notable.classes` and says what
its city is made of. That one change took Delhi from 81 records to 267 and
Bengaluru from 31 to 126.

**What still has no source, anywhere in India:** where to eat. Wikidata has
two restaurants in Delhi and no cafés; Karim's and Mavalli Tiffin Rooms are
not in it at all. No open dataset ranks or describes everyday food. This is
why Delhi scores 0 of 160 in `check-location.mjs` while having 267 sourced
records — the records are monuments, and the question being asked is
breakfast. **Only the editorial tier closes it.**

### India, looked at harder

A second pass, on 21 September 2026, went looking specifically for what an
Indian city *does* publish. Every one of these was fetched, not assumed.

| Source | Keyless | What it is | Verdict |
|---|---|---|---|
| **OpenCity** (`data.opencity.in`) | yes, real CKAN | 1,099 civic datasets, mostly Bengaluru | An archive, not a feed. PDFs, KML and CSV snapshots — the parks list is from 2016, licences often blank. BBMP's lakes KML is public domain and usable once. |
| **Wikivoyage** | yes, MediaWiki API | geocoded eat / drink / buy listings, CC BY-SA 4.0 | Real, well-written, and **net-negative here**. See below. |
| **Delhi Open Transit Data** (`otd.delhi.gov.in`) | registration for real-time | official DMRC and DTC GTFS | Genuine, and about transit rather than places. Useful to the reach model one day, not to recommendations. |
| `data.gov.in` | **no** | national portal | Needs a key — `Authorization field missing`. Out. |
| Zomato API | — | — | **Retired.** The developer endpoint now redirects nowhere. |
| AllEvents.in | **no** | event listings | Key required. Out. |
| BookMyShow · District | — | — | No public API. |
| Karnataka state portal | — | — | Did not answer. |

**Wikivoyage, and the number that was wrong first.** The first sizing of it
reported 1,159 Delhi listings. That was wrong: MediaWiki's `prefixsearch` is
the search box's fuzzy typeahead, not a prefix match, and asked for pages under
`Delhi/` it also returned pages about Denbigh and Tasmania. With `allpages`,
which is strict, Delhi has 62 eat, drink and buy listings, 18 with
coordinates. Bengaluru has 247, of which 25 have coordinates. Coordinates are
the limit, not coverage.

The same bug went one step further before it was caught: Delhi declares no
`limitKm`, so `zoneFinder` returns the nearest colony for *any* point on earth,
and the first run filed a café in Wales under a Delhi colony. It was caught by
reading every record rather than the counts. `scripts/wikivoyage.mjs` now uses
the strict page list and the same bounding-box test `practices.mjs` uses.

Then it was measured, and it made things worse. Delhi's coverage fell from 99
to 94 and both cities shared more — Bengaluru's over-sharing went from 20 to
29. The reason is the most useful thing in this section: **a travel guide
covers what a visitor sees**, and Bengaluru's Wikivoyage listings sit in
Shivajinagar, Frazer Town, Richmond Town, Malleswaram and Basavanagudi — the
old centre, exactly where the editorial tier already is. Records added to the
middle pull every probe towards the same answer, which is the one failure
`check-location.mjs` exists to catch.

So the collector is written, tested and **switched off**: no pack declares
`wikivoyage`. Turn it on for a city once its edges are covered, when adding to
the middle stops costing anything.

**The conclusion for India holds, and is now sharper.** Every open source
found here — Wikidata, Wikivoyage, OpenCity — is thickest where the guide
already is. What moves an Indian city is hand-written records *at the edges*,
chosen off `check-location.mjs`'s own output: in Delhi, six records in Saket,
Dwarka and Gurgaon raised coverage and lowered sharing at the same time.
That pairing is the tell that a record went where it was needed.

### Google, asked a second time

Worth answering again for India specifically, because it is the one place
where Google's coverage is genuinely better than anything open: Google Maps
knows every tiffin room in Bengaluru and Wikidata knows three cafés. That is
exactly why the terms matter rather than being a technicality. The data that
would help most is the data you may not keep — `place_id` indefinitely,
coordinates for thirty days, and nothing else.

Two uses are legitimate and neither fixes the gap. A plain Google Maps *link*
to a place, which is not the API and needs no key, is fine and the site
already has "Look it up". And the Places API can be called live in the
browser to show a place's current details — but that needs a key in the page,
which breaks the rule this site is built on, costs money per view, and
decorates records we already have rather than finding new ones.

---

## Everywhere

**OpenStreetMap** is the one layer that is good in all three regions, and it
is the whole `found` tier. `discover.mjs` reads it through Overpass at build
time. Two things to know before touching it: `overpass.osm.ch` looks like a
mirror and is a Switzerland-only extract that answers 200 with zero
elements, and Overpass returns 429 under load — the first version of that
script read both as "this city has no restaurants".

**Wikidata and Wikipedia** give the `sourced` tier through `notable.mjs`.
Pageviews separate a landmark from a local place that happens to have an
article, which is what stops the everyday sections recommending the
Eiffel Tower for coffee.

**Luma** publishes a per-calendar iCal feed with no key and no account, and
it is the single most transferable source there is. Checked and live:
`luma.com/sf`, `/paris`, `/bangalore`, `/delhi`, `/mumbai`. Coverage skews
to tech, startup and social evenings, which suits some cities far better
than others — Bengaluru's calendar is 29 events on a rolling fortnight,
every one geocoded.

The endpoint is undocumented and internal. It can vanish; the collectors
are written so that it failing leaves the previous file alone.

---

## Buying a dataset, and why Google Maps is not one

The obvious shortcut — seed the catalogue from Google Places once, then pull
the key and maintain it some other way — is the one thing the terms
specifically forbid, so it is worth writing down before somebody suggests it
again.

[Google's Places policies](https://developers.google.com/maps/documentation/places/web-service/policies)
say you must not pre-fetch, cache or store Places content, with exactly two
exceptions: `place_id` indefinitely, and coordinates for **30 days**. Names,
ratings, photos, hours and phone numbers are to be fetched live and shown
with Google attribution. Paying for the calls does not license extracting
them into a dataset of your own, and removing the key afterwards does not
cure it. It would also poison this repository: once Google-derived rows are
mixed in, nothing here can be cleanly relicensed or shared again.

The version of that idea which is actually allowed exists, and is better:

| Source | Licence | Size | Keep it? |
|---|---|---|---|
| [Foursquare OS Places](https://opensource.foursquare.com/os-places/) | Apache 2.0 | 100M+ POIs, 83 countries, monthly | yes, keep NOTICE.txt |
| [Overture Maps](https://docs.overturemaps.org/guides/places/) | CDLA-Permissive 2.0 | ~53–61M places, monthly | yes |
| OpenStreetMap | ODbL | what `discover.mjs` reads today | yes, share-alike |

Both of the first two carry something OpenStreetMap does not: a category
taxonomy and a **confidence score**. Neither carries opening hours, which
OpenStreetMap does and which `js/hours.js` depends on. That is the whole
argument for keeping OSM as the spine and treating the other two as
enrichment rather than replacement.

**The licence trap, which is easy to walk into.** ODbL is share-alike: merge
OpenStreetMap into a derived database and the whole derived database
inherits ODbL. Keeping Apache and CDLA data in their own files, joined at
render time rather than at build time, is what stops one permissive source
being swallowed by a share-alike one. The tier layout already does this by
construction — keep it that way.

## Events, assessed

| Source | Free | Cacheable | Verdict |
|---|---|---|---|
| Municipal (ODS · Socrata · CKAN) | keyless | unrestricted | **Best. Use wherever it exists.** |
| Luma iCal | keyless | unrestricted | **Best transferable.** Undocumented — must fail soft |
| Localist (universities) | keyless | unrestricted | Strong in the US |
| Ticketmaster Discovery | 5,000/day, **key** | "no caching beyond reasonable periods" | Concerts and sport; fights a static site |
| Songkick | key | **24 hours** | Borderline against a daily rebuild |
| Bandsintown | key | unclear | Artist-centric, not city-centric |
| Eventbrite | — | — | **Dead.** Public event search retired Feb 2020 |
| Meetup | — | — | **Dead.** Paid Pro plus OAuth since the REST retirement |
| BookMyShow · District (India) | — | — | No public API. Scrapers exist; do not |

**The rule that decides most of this: no keys in the browser.** Worth being
precise, because it is narrower than it sounds — the collectors run in CI,
which *could* hold a secret, and the shipped page would still have none.
Relaxing it would unlock Ticketmaster and `data.gov.in`. It is deliberately
not relaxed: Ticketmaster's no-caching clause fights the static model
anyway, and a site nobody needs credentials to fork is worth more than a
concert listing.

## Keeping it fresh

Three cadences, and they are already what the workflows run:

| Every | What | Why |
|---|---|---|
| day | events, practices, prune expired | Luma is a rolling fortnight; a week-old copy is mostly things that have happened |
| week | OSM discovery, Wikidata notable, civic | Changes slowly, and Overpass rate-limits hard |
| month | a Overture / Foursquare snapshot, if adopted | That is their release cadence |

Five mechanisms keep that honest, and a new source should inherit all of
them rather than invent its own:

- halves **fail independently** — one source going down cannot take another's records with it
- a failed half **keeps the previous run's records** rather than writing fewer
- a run where **everything** fails leaves the file untouched rather than empty
- **expiry is applied when records are built**, against today's date, so a stale file cannot show a finished event
- `check-location.mjs` **floors ratchet** — coverage that falls is a failure, not a smaller number

## New York, and a correction

It was the cheapest of the five to add and it was cheap for the reasons
expected — the zones come from the city's own 2020 Neighborhood Tabulation
Areas, and the pack passed the contract on its first run. One thing in this
file was wrong, and the way it was wrong is the general lesson:

**NYC Parks Events Listing (`fudw-fgrp`) is not a feed.** It has titles,
times, prices, links and — rare for an American city — coordinates, in a
second table joined on `event_id`. It also stops on **28 December 2019**.
74,880 rows, none of them in this decade. A collector was written against it
before anybody ran `max(date)`, and it returned zero.

So: **check the newest row before writing anything.** A dataset's shape tells
you nothing about whether it is alive, and a Socrata catalogue will list a
dead dataset next to a live one without comment.

The live one is **NYC Permitted Event Information (`tvpp-9vvx`)**, running
through 2027, and it has the categories that matter — in a sixty-day window,
167 farmers markets, 166 block parties, 155 street events, 56 parades. What
it has no trace of is coordinates: `event_location` is free text, either a
park and a facility number or a street between two cross-streets. Using it
means geocoding a few hundred rows through Nominatim at a request a second,
which is a piece of work rather than a config line. **It is the obvious next
thing to build for this city.**

University Localist was checked too: Columbia answers 403, NYU does not run
one, and Fordham's is 89 events a month and mostly fixtures — thin enough
that adding it would be noise rather than coverage.

New York therefore ships on Luma alone, which is 30 events a fortnight
across four boroughs, plus the OpenStreetMap and Wikidata layers that need
no city portal at all.

## Adding a city, by country

1. **Anywhere** — `discover.mjs` for OpenStreetMap, then `notable.mjs`.
   Before running the second, look at what Wikidata actually holds in the
   bounding box and declare `notable.classes` for whatever the base list
   does not ask about. That check takes one SPARQL query and is worth more
   than any other hour spent.
2. **Luma** — check `luma.com/<city>` for a `discplace-` id and declare
   `City.luma`. One line, and in India it is most of what there is.
3. **Europe** — look for Opendatasoft or CKAN. If the city has one, it
   probably publishes both events and facilities, and `events.mjs` and
   `civic.mjs` are close to reusable.
4. **United States** — look for Socrata for facilities, and a university
   running Localist for events.
5. **India** — expect none of the above, and budget the time for the
   editorial tier instead. It is the only thing that moves the everyday
   categories, and it is the work that cannot be automated anywhere.
