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
