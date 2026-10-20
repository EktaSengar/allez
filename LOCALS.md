# Locals

Notes on letting the people who live somewhere add to Allez, written
20 October 2026 before any of it is built. Two plans live here: **Locals**,
named people who write for one neighbourhood, and **organisers**, the people
who run a regular and can tell us the facts about it. APP.md's *The road to
people posting* puts the Locals' Bench at step 3, inside the app. This is how
to start it on the website, by hand, without accounts.

Nothing here is a design. It is what the work has to get right.

---

## Neighbours as sources, not as a forum

The obvious move is a community: a feed per neighbourhood where anyone posts.
It is the wrong one for Allez.

| Where local talk already lives | What it is for | What it says about us |
|---|---|---|
| MyGate, NoBrokerHood, building WhatsApp groups | Guards, deliveries, water cuts | People stay because they need it and their flat number proves who they are. Where to eat is a side effect. |
| Facebook groups, Nextdoor | Lost cats, plumbers, complaints, buy and sell | Mostly noise, hard to moderate, and hard to make pay. |
| Instagram pages for one area | One curator with taste | Not really UGC. It is one voice talking to many people, which is what Allez already is. |
| Google Neighbourly (India, about 2018–2021) | Local Q&A | Built and closed. |

Open posting would bring back the content the no-aggregator rule keeps out,
needs a crowd in every neighbourhood before it looks alive, runs at a daily
pace when going out is weekly, and needs moderation one person can't do.

So: **neighbours are sources.** A few named people send us what they know.
We check it, it goes into the same records as everything else, and their name
goes on it. No feed, no comments, no forum.

---

## Part one: Locals

A Local is one named person for one area: an arrondissement, a Bay Area town,
a Bengaluru neighbourhood. They write a little, under their own name, and they
take it to their own followers.

### Who owns the work

There are two ways "ambassadors post socials" could go:

- **They post to Allez-run Instagram pages, one per area.** Twenty accounts in
  Paris alone. Instagram decides who sees it, the work stays on Instagram, and
  it competes with the local pages that already exist.
- **They write once into Allez, and Allez hands them a post to share.** The
  writing lives on the area's page. Their followers come to Allez, and Allez
  keeps the work after they leave.

The second. Allez holds the content; the Local brings the audience.

### Where a Local sits on the trust ladder

No new tier. A Local's pick is somebody who went, so it is **personal** (★),
the same as APP.md's rule for the Bench: credited *★ went — first name*.
The card says who: *Picked by Léa, who lives in the 10e.*

- **Our own notes still win.** `notes.json` overrules a Local, as it overrules
  everything.
- **We set `quality`, not them.** Their pick is the reason a place is there;
  how high it ranks stays our call, and our rankings stay private.
- **Coo never vouches.** The Local does.

### What a Local writes

Everything uses a format the site already has.

| What they write | Format it uses | Why it's worth it |
|---|---|---|
| **A guest walk**: "My Sunday in the 10e" | itineraries (numbered timeline) | The guest-picks idea. A plan, in someone's own order. |
| **History**: a building, a street name, a lost cinema | a new block on the area's dossier | Never goes out of date, nobody else does it well, and the dossier is an article already. |
| **Small local events**: a flea market, a street party, a bar's quiz night | `events.json`, with the Local as source | Fixes a licence problem. We can't ingest most listing sites, but we can use what a Local sends us directly. |
| **Their regular spots**, five at most | notes-style overrides with `by` | Feeds picks near home, where the ranking already leans. |

### Rules

1. **Paid posts.** Many local curators are paid by venues. A Local says so,
   and can't pick a venue that has paid them in the last twelve months.
   Otherwise Allez becomes an ad channel.
2. **Their voice, inside a marked block.** Our descriptions get rewritten in
   the site's voice; a bylined piece rewritten that hard stops being theirs.
   So a Local's walk or story is edited lightly and shown as theirs. Card
   titles, facts and fields still follow house style.
3. **Facts need sources.** History is checked against something open:
   archives, plaques, Wikipedia, Wikidata. Never Time Out or the aggregators.
   An event links to the venue's or organiser's own page, like any other.
4. **Photo rights.** A one-page agreement: they keep copyright, Allez gets a
   licence to use and crop, they're credited. No recognisable faces without
   consent; in France the right to one's image makes that a legal point, not
   just a polite one.
5. **Staleness.** Every entry carries `lastVerified` and is reviewed every six
   months. When a Local stops, their picks drop to editorial (◆), keeping the
   words and losing the ★.
6. **Why they'd do it.** Credit, a link to their profile, a share card that
   looks good, and an invite to a Locals' dinner. No money at the start.
   Paying changes who applies.
7. **Few areas.** Two Locals is a pilot. Twenty is a staffing problem.

### What gets built

- **`locals.json` per city.** Id, first name, public handle, area, since when,
  a two-line bio, whether the licence and the disclosure are signed. Nothing
  private: GitHub Pages serves every data file publicly.
- **`by: "<local-id>"`** on any record a Local contributed.
- **"Your local" on the area's dossier.** Their walk, one story, their
  upcoming small events, their spots.
- **The credit line on cards**, linked to that section.
- **A share card script.** A 1080×1350 image of a walk or a story, from the
  postcard idea in APP.md and the `reel-source` pipeline, with a `?via=<id>`
  link so GoatCounter can count who it brought.
- **Submissions stay by hand.** A form, a doc or a WhatsApp message; we write
  the record and commit it. No CMS before the app.

---

## Part two: organisers and their regulars

The Regulars tab was expanded on 28 September because it was thin and
decaying. Hand research took it to between 7 and 18 a city. Research can't
get past two limits:

1. **Many of the best regulars have no website.** Silent-reading mornings,
   sketch walks, chess tables, supper clubs: often only an Instagram account
   or a WhatsApp group. Our rule is to check every regular against the
   organiser's own page, so these never get in.
2. **Regulars stop without saying so.** A group moves, breaks for the summer,
   or quietly ends. Nothing tells us, and `lastVerified` just gets older.

Organisers fix both. They are the first-hand source, and they know first when
something changes.

### Facts from them, the verdict from us

Every organiser thinks theirs is wonderful. So:

- **They supply the facts**: when, where, how often, cost, what it asks of
  you, the first step.
- **We write the `why` and set `quality`** — or a Local does, once they've
  been.
- **Editorial tier (◆), with its own label**: *From the organiser · not yet
  visited.* Quality is capped at 3 until one of us or a Local has gone. One
  visit lifts the cap and promotes it to ★.

### Who gets listed

- Held in a public place.
- Open to anyone who turns up or signs up.
- Running for at least three months. Short-lived groups are the decay we're
  trying to stop.
- A clear first step.

Not listed: sales pitches dressed as free intros, MLM, recruitment of any
kind. Sport goes to the Sport tab, not Regulars; run clubs will be the
biggest single kind of submission, so the form takes them and we route them.

### Privacy

- **Organiser contacts never go in the repo.** Names, emails and phone
  numbers live in a private sheet. The record carries only a public link,
  ideally an Instagram profile or a website.
- **Never a WhatsApp group invite link.** It is a spam and safety risk for the
  group.
- **Submitting is consent.** Unlike a meetup page found online, the organiser
  asked to be listed, which settles the GDPR side. The text is still
  rewritten in the house voice.

### Staying alive is the point

Freshness matters more than the extra rows.

- **`confirmedAt`** on every organiser record, and **`pausedUntil`** for
  season breaks. A paused regular drops out of Regulars and the weekend plan
  until the date passes.
- **A ping every 90 days**: "still on, same time?" One reply resets
  `confirmedAt`.
- **A check script** flags records past 90 days. After two unanswered pings
  the record is hidden, not deleted.
- **A weekly scheduled task** lists who is due. We send the emails ourselves;
  there is no backend.

### What gets built

1. **A submission form** (Google Form or Tally; the site has no backend).
   Fields map to the schema: name; what happens, in two lines; the public
   place or address; day and time; how often (`rhythm`); cost; whether you
   sign up (`commitment`); what to do the first time (`firstStep`); season
   breaks; public link; private contact email. Checkboxes: open to all, no
   payment for listing, "I'll tell you if it stops."
2. **`scripts/regular-from-form.mjs`.** Turns a form row into a draft record
   with `source: "organiser"`. It fills the facts, leaves `why`, `quality` and
   `goodFor` empty for us, and runs `check-packs`. The Bay Area's required
   fields (`hoursNote`, `durationMin`, `priceLevel`, `booking`) are why the
   form asks for times and cost.
3. **The label on cards**, plus `confirmedAt` and `pausedUntil` handling.
4. **"Run something regular? Get listed"** at the foot of the Regulars tab.

---

## How the two fit

One pipeline, three roles:

> **Locals find organisers. Organisers supply the facts. We write the verdict.**

A Local knows the reading group and the Sunday sketchers. They bring them in,
and they are who visits to lift the cap. Everything a Local or an organiser
sends ends as an ordinary record with an ordinary source, which is why
nothing here needs rebuilding when the app's Bench arrives.

---

## The pilots

Each runs six weeks, by hand.

| | Locals | Organisers |
|---|---|---|
| **Where** | One Paris arrondissement we know well, and one Bay Area town near home | Bengaluru: the fewest regulars (7) and the most groups that live only on Instagram or WhatsApp. The Bay Area if home turf matters more. |
| **Ask** | Each Local: one walk, two stories, the small events they come across | A "get listed" link, and Locals passing it on |
| **Measure** | Submissions accepted; visits arriving through `?via=`; time on dossiers with a Local against those without | Submissions; how many pass the bar; after 90 days, how many are still confirmed against our researched ones |
| **Stop if** | A Local goes quiet before week four, or editing their pieces takes longer than writing them ourselves | Fewer than five pass the bar, or turning each into a record takes longer than researching it |

---

## Not decided

- **How light is "lightly edited".** Where the Local's voice ends and house
  style starts needs a real piece to argue over.
- **Which arrondissement and which town.** The pilot wants somewhere we can
  meet the Local and check their picks.
- **Google Form or Tally.** Whichever keeps the private sheet private and the
  export clean.
- **When Locals move into the app.** APP.md's Bench assumes accounts. Until
  then everything is copied in by hand, which is the right cost for two
  people and the wrong one for twenty.
