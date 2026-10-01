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
| Zomato API | — | — | **Retired.** The developer endpoint now redirects nowhere. How Zomato got its data, and why none of it is reachable, is below. |
| AllEvents.in | **no** | event listings | Key required. Out. |
| BookMyShow · District | — | — | No public API. District is Zomato's; see below. |
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

### Zomato and District, and why the answer is feet

Asked on 22 September 2026, because if one company in India already has the
restaurant data, the shortest path is theirs.

Zomato built it by walking. The original model was staff — "Zomans" — who
[physically visited restaurants](https://techcrunch.com/2015/10/16/restaurant-search-app-zomato-lays-off-300-10-of-staff-in-shift-away-from-live-data-collection/)
door to door and wrote down menus, hours and photographs. That was the whole
difference from Yelp, which waited for users. In 2015 they laid off 300 people,
a tenth of the company, shutting that operation down in the United States —
and kept it in India, where they lead. On top of that base sit merchant
self-claiming, user reviews and photographs, and now transaction data from
delivery, Blinkit and District bookings. District is the going-out app built
on that inheritance, plus Paytm Insider's events catalogue.

Do they use Google? Two different products, two different answers. Google
**Maps** — tiles, routing, delivery geocoding — yes, and at a scale that makes
them one of the larger Indian customers. Google **Places** as the source of the
listings, no, and they could not: §3.2.3(d) of Google's terms forbids using
the services in a listings or directory service, which is precisely what
Zomato is. They also had no reason to, having had people in the field years
before the question arose.

None of it is reachable. The public API (`developers.zomato.com/api/v2.1`) is
retired; what exists now is a POS and partner integration for merchants
already on Zomato, not a data API. Scrapers for both Zomato and District are
sold openly. Do not — it is a terms breach and a dependency on someone else's
markup.

**The useful conclusion is the cost.** The best restaurant data in India was
assembled by sending hundreds of people to knock on doors, and the company
that did it treated that as a line item it eventually cut. That is the honest
price of answering "where should we eat in Delhi", and it is why the editorial
and personal tiers here are not a shortcut being avoided. They are the same
method, at the only scale this repository can afford.

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

### Writing place cards, and what may go into them

Decided on 29–30 September 2026, after an audit of every researched record
in Delhi and Bengaluru (PR #48). The first research pass had drawn dish
picks, descriptions and "known for" lines from Zomato, LBB, EazyDiner,
Tripadvisor, Time Out, magicpin, Swiggy, magazines and food blogs — often
from their search-result snippets, reworded. None of that is usable, and
Delhi lost 239 records and Bengaluru 110 when it came out. This section
records why, so the next pass does not repeat it.

This is a working summary of the risks as we understand them, not legal
advice. Where it is unsure, the rule is the cautious one: **if a card
cannot be written from allowed sources, leave it out rather than make it
thin.**

#### The legal problems, one by one

1. **Copyright in the text.** A review, a listing description or an
   article is a literary work under India's Copyright Act, 1957 (and the
   equivalent law in every other city this site covers). Copying it is
   infringement. So is a close paraphrase that follows its structure,
   selection and phrasing — rewording a Zomato blurb "in the site's
   voice" is still a derivative of that blurb. A search-engine snippet is
   the same copyrighted text, only shorter; seeing it on Google does not
   change who owns it.

2. **The facts are free, the selection is not.** Bare facts — a
   restaurant exists at this address, opens at 8, serves dosa — are not
   copyrightable. But which places a guide chose, which dish it singled
   out as the one to order, and how it characterised a place are
   editorial judgement. Indian courts protect compilations that show a
   "modicum of creativity" (*Eastern Book Co. v. D.B. Modak*, Supreme
   Court, 2008), and the EU gives databases a separate right on top
   (Directive 96/9/EC), which matters for Paris. Rebuilding "LBB's
   twenty best cafés in Hauz Khas" one fact at a time still copies the
   list.

3. **Terms of use are a contract.** Zomato, Swiggy/District, EazyDiner,
   magicpin, Tripadvisor, Time Out, LBB, BookMyShow and Google all forbid
   scraping, bulk copying, or reusing their content in another listing or
   directory service. Reading a page by hand and noting facts is
   ordinary use; harvesting it, or building a rival listing from it, is
   what their terms prohibit, whether or not copyright would. Google's
   Maps Platform terms (§3.2.3) add that Places data may not be stored
   beyond a `place_id`, or used to build a listing at all.

4. **Photographs.** Every photo on those sites belongs to the site, the
   venue or the user who posted it. None may be copied, hot-linked or
   "embedded" as a card image. Only our own photographs and Wikimedia
   Commons files under a stated free licence are used (see the README,
   *Photographs*).

5. **User reviews and personal data.** Reviews are written by
   individuals, who hold copyright in them, and carry names and profile
   data. Quoting them brings in the reviewer's rights and, under India's
   Digital Personal Data Protection Act, 2023, their personal data.
   Never quote or attribute a review.

6. **Share-alike obligations on the sources we do use.** Open does not
   mean unconditional. Wikipedia and Wikivoyage text is CC BY-SA 4.0: it
   must be credited and whatever we derive from it stays CC BY-SA.
   OpenStreetMap is ODbL: credited, and the derived database stays ODbL.
   CC BY-NC material (developers.events) is non-commercial only. Mixing
   licences in one file is how an obligation gets lost, which is why
   they live in separate files (DATA-LICENSE.md).

7. **Trademarks and implied endorsement.** A venue's name is fine to use;
   its logo is not, and nothing on a card may suggest the venue, or a
   listing site, endorses Allez.

8. **Links pointing at listing sites.** A plain link is not a copy and is
   lawful, but a card whose only link is a Zomato page is advertising
   the source we are not allowed to use and usually means the card was
   built from it. Cards link to the venue's own site, its OSM node, or
   Google Maps "Look it up" instead.

#### What to use

| source | what it may give | condition |
|---|---|---|
| **Your own visits and notes** | anything — the dish, the feel, the hour to go | the strongest source there is; polish the words, keep the meaning |
| **The venue's own website or menu** | facts: dishes, hours, founding year, what it says it does | take facts, write fresh sentences; never copy its text or photos |
| **The venue's own Instagram / social page** | facts, as above | same; do not embed or copy posts or photos |
| **OpenStreetMap** | name, location, cuisine, hours, website | ODbL — credit it; edit OSM to fix gaps rather than working around them |
| **Wikipedia / Wikivoyage** | history, context, what a place is known for | CC BY-SA 4.0 — credit in `source`; the card text stays CC BY-SA |
| **Wikidata** | facts, identifiers | CC0 — no conditions |
| **Wikimedia Commons** | photographs | only files whose licence is stated and free; credit as it asks |
| **Government open data** | facilities, markets, events | only where a licence is stated (see the tables above); a government page with no licence is research, not a source |
| **People you know** | recommendations | treat as your own notes; ask before naming them |

#### What not to use

- Commercial review and listing sites: **Zomato, Swiggy / District,
  EazyDiner, magicpin, Dineout, LBB, Tripadvisor, Time Out, Yelp,
  Justdial, BookMyShow, Google reviews** — not their text, dish picks,
  rankings, ratings, photos or "known for" lines, and not reworded.
- **Magazines, newspapers and food blogs** (Condé Nast Traveller,
  Hindustan Times, The Hindu, Mint, Eater, personal blogs) — same rule.
- **Search-engine snippets and AI summaries** of any of the above: they
  carry the same content and the same rights.
- **Google Places API data** stored in the repo.
- **Any `source` field that names one of these.** If it had to be named,
  it was used.

Using them to *find out that a place exists* — and then writing the card
from a visit, the venue's own site or OSM — is fine. The test for every
sentence: could it have been written without having read the forbidden
page? If not, it goes.

#### How to improve Delhi and Bengaluru from here

The cut left Delhi with 47 editorial, 40 places and 9 nightlife records,
and Bengaluru with 36, 15 and 8. The ways back up, roughly in order of
how much they add:

1. **Your own visits.** Cards from places you have been, with your own
   photograph, are the best records the site has (placed by
   `scripts/own-photos.mjs`). A short list of places to visit next,
   chosen from `check-location.mjs`'s weak areas, turns every outing into
   records at the edges, where they help most.
2. **Venue-first research.** For a place you have heard of, go straight
   to its own website, menu PDF or social page and write from that.
   Many Delhi and Bengaluru institutions (Karim's, MTR, Vidyarthi Bhavan,
   Indian Coffee House, the gymkhana-era bakeries) publish their own
   history and menu.
3. **Wikipedia for the institutions.** Older restaurants, markets and
   bars often have articles. Credit them and keep the text CC BY-SA.
4. **Fix OpenStreetMap.** Missing or wrong cuisine, hours and website
   tags can be added on OSM itself; the next `discover.mjs` run picks
   them up, and the fix helps everyone.
5. **Wikivoyage.** `scripts/wikivoyage.mjs` is written and switched off
   because it crowds the centre (see above). Turn it on per city once
   the edges are covered.
6. **Ask for a feed.** A venue, a food walk or a local publication can
   give written permission for its content; with that on record (and
   noted in DATA-LICENSE.md), it becomes an allowed source.

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

### The thirty-day refresh, which does not work

Asked on 22 September 2026: if coordinates may be held for thirty days, can
the site cache Google's data and rebuild it every thirty days? The terms were
read rather than remembered, and the answer is no on four independent grounds.

**The clock covers only coordinates.** Service Specific Terms §14.3 grants one
caching permission for the Places API: latitude and longitude, up to thirty
consecutive calendar days, then delete. Master terms §3.2.3(b) forbids caching
anything else except where expressly permitted. Names, hours, ratings, reviews
and photographs appear in no grant at all — so there is no thirty-day window
on them to expire and renew. A refresh cycle renews nothing, because the
permission was never given. What it would lawfully yield each month is
coordinates, which OpenStreetMap already gives permanently and free.

**The architecture is a named example.** §3.2.3(a) lists among prohibited
scraping: pre-fetching, indexing, storing, resharing or rehosting Maps content
outside the services, bulk-downloading places information, and copying and
saving business names, addresses or reviews.

**Even the cacheable field is unusable here.** §3.2.3(c) gives as an example of
creating content the use of Places latitude/longitude as input for
point-in-polygon analysis. That is exactly what `zoneFinder` does — take a
coordinate and decide which zone it falls in. The one field with a thirty-day
grant cannot be used the way this repository uses coordinates.

**And git cannot forget.** The terms impose a deletion obligation. A public git
repository cannot delete: `git log -p` holds every prior version of every JSON
file for as long as the repository exists. Honouring the obligation would mean
rewriting history on every refresh, breaking every clone. Publication is a
separate breach in any case — pushing to a public repository reshares and
rehosts on day one, whatever the age of the copy.

**One correction, in Google's favour.** An earlier note in this file implied
Places content must be shown on a Google map. It need not: §14.1 permits using
it with no map at all, and §14.2 only forbids using it alongside a *non*-Google
map. This site renders no map — no Leaflet, no MapLibre, no tile layer — so
that is the single clause here that does not bite. Every other one does.

The thirty days is a latency allowance for live applications, so they need not
re-call for a coordinate fetched a minute ago. It is not a warehouse licence on
a timer.

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
which is a piece of work rather than a config line.

**Built on 22 September 2026**, as the `permits` half of `events-city.mjs`.
Three things were learned doing it:

- **Almost none of it is for anybody.** In sixty days: 26,000 rows are league
  bookings of a ballfield; "Special Event" is 3,265 rows of Parks
  administration, from lawn closures and gazebo construction to private
  pavilion bookings; "Street Event" is mostly health-outreach vans; block
  parties are the neighbours' own. Kept: farmers markets, parades, street
  festivals, plaza programmes and Open Streets. That is 315 permits, 251
  once outreach and closures are dropped by name, and **107 distinct events**
  once each greenmarket's eighteen occurrences are collapsed into one
  record with `days`.
- **Nominatim cannot do it.** It cannot geocode a crossing of two streets.
  Overpass can: the named street's nodes that it shares with either cross
  street, averaged. Old and alternative names are matched too, because the
  permit office still writes Lenox Avenue. A crossing only counts inside
  the permit's own borough, and crossings more than 3 km apart count as no
  answer at all. 12th Avenue meets the West Side Highway so many times
  that the average lands thirty blocks north. **103 of 107 placed.**
- **One question per block does not survive.** The public Overpass instance
  answers 504 whenever it is busy. Blocks go fifteen to a request, split
  apart again on `make` markers. Every answer, including "no such crossing",
  is cached in `scripts/permit-places.json`, so a weekly run asks only about
  blocks it has not seen.

The permit has no link and no description. Cards link to the spot on
OpenStreetMap, and `why` says it is a permit, not a listing. With Luma, New
York's dated events now reach 64 of 237 neighbourhoods, up from 15.

University Localist was checked too: Columbia answers 403, NYU does not run
one, and Fordham's is 89 events a month and mostly fixtures — thin enough
that adding it would be noise rather than coverage.

New York therefore ships on the permit register and Luma, plus the OpenStreetMap and Wikidata layers that need
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
