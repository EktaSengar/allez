# Data licences

Some files under `*/data/` are built from open databases whose licence
travels with them. This says which ones, so anybody reusing the files
knows the terms before they do.

## Open Database License (ODbL)

These files contain data drawn from databases published under the
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
**They are made available under the same licence.** You may copy, adapt
and redistribute them, provided you credit the source and keep anything
you derive from them under the ODbL.

| file | built from | publisher |
|---|---|---|
| `paris/data/events-city.json` | [Que Faire à Paris](https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/) | Ville de Paris |
| `paris/data/practices.json` — the records whose `source` names Que Faire à Paris | Que Faire à Paris | Ville de Paris |
| `paris/data/civic.json` | [Marchés découverts](https://opendata.paris.fr/explore/dataset/marches-decouverts/) and [Lieux municipaux](https://opendata.paris.fr/explore/dataset/lieux-municipaux/) | Ville de Paris |
| `*/data/places/*.json` (every city) and `*/data/invaders.json` | [OpenStreetMap](https://www.openstreetmap.org/copyright), via Overpass | © OpenStreetMap contributors |

On the site, each of these records names its source on its card, and
every city's footer carries the ODbL notice for OpenStreetMap — Paris's
also for the city's open data. The ODbL covers the database, not the
photographs sometimes linked from it; this site uses none of the city's
photographs (see the README, *Photographs*).

## Creative Commons Attribution-ShareAlike (CC BY-SA 4.0)

`*/data/notable.json` (every city) carries up to two sentences of
Wikipedia text per place, and Wikivoyage text where
`scripts/wikivoyage.mjs` has been run. That text is
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/): each
card credits its source, and the text stays under the same licence here.
The facts beside it come from Wikidata, which is
[CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## Other sources, and what they allow

Checked 24 September 2026.

| source | files | terms |
|---|---|---|
| DataSF — Our415, Rec & Park facilities | `bay-area/data/events-city.json`, `practices.json`, `civic.json` | [Public domain (PDDL 1.0)](https://opendatacommons.org/licenses/pddl/1-0/) |
| NYC Open Data — Permitted Event Information | `new-york/data/events-city.json` | NYC Open Data: [no restrictions on use](https://opendata.cityofnewyork.us/faq/) |
| Stanford Events (Localist) | `bay-area/data/events-city.json` | Public read-only API, which Stanford documents for pulling its events into other sites; no licence is stated |
| Open-Meteo — weather, and air quality in Delhi | fetched live, never stored | [CC BY 4.0](https://open-meteo.com/en/license), free for non-commercial use; air quality also credits Copernicus (CAMS). Both are credited in every city's footer |
| **Luma** | `*/data/events-city.json`, `*/data/practices.json` | **Not licensed for display.** Its terms allow reading its public calendar feeds but forbid republishing or displaying their content without written permission. The Events tab excludes these records; the rest of the site has not yet been changed |

The hand-written records, the editorial tier and the notes are this
site's own work.
