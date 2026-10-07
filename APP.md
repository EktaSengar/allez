# The app

Notes for the Allez app, written 23 September 2026 before any of it is built.
Extended 6 October 2026 with who it is for, the shape of the app, what
happens when it isn't open, what happens after, and the first build that
can be tested (from *Three people, one question* onwards).
The website keeps its tabs; the experience described here belongs in a native
app, because it is used many times a week, in the hand, on the move — and
that is an app's job, not a website's.

Nothing here is a design. It is what the design has to be good at.

---

## What people actually open it for

Everyday use is not one thing. It is at least six moments, and they want
different speeds and different amounts of novelty.

| Moment | When | Time they'll give it | What they want |
|---|---|---|---|
| **The habit** | Weekday mornings | Ten seconds | Coffee *now* — the usual, or one good new option nearby. Open, glance, go. |
| **After work** | Weekday afternoons | A couple of minutes | Something for this evening near where they'll be: a tech evening, a class, dinner, a drink. |
| **The weekend** | Thursday to Saturday, often with someone else | Five to fifteen minutes | What to *do* — a new restaurant, a hike, a game, a painting class, a trip — shaped into a plan. |
| **Right here** | On the street, unplanned | Thirty seconds | What's good within ten minutes of where they're standing, open now. |
| **The rhythm** | Over weeks | Occasional | Things to take up and go back to: a dance night, a run, a book club. |
| **After** | Later that day | One tap | How was it? A rating, maybe a line, maybe a photo. |

The weekday is about **habit with a little discovery**. The weekend is about
**discovery shaped into a plan**. An app that treats both the same fails at
one of them.

## Principles

1. **Answer before asking.** Opening the app shows the answer for right now —
   time, place, weather, what's open, what's on — not a search box.
2. **Three good options, not thirty.** One decision at a time. Choice is the
   work the app is supposed to take away.
3. **Known and new, on a dial the person controls.** Going back to the usual
   coffee is a fine answer. The app should make it one tap, and still put one
   new thing beside it.
4. **The output is a plan, not a list.** Morning, afternoon, evening; the
   order; the walk between; the booking; the weather.
5. **It is often for two.** Weekend plans are usually made with someone.
   Letting two people each mark what they'd like, and showing where they agree,
   is the one place a swipe-like interaction genuinely earns its keep —
   matching, not browsing.
6. **Trust is visible.** Every suggestion says whether somebody went, and when
   it was last checked. Closed places never appear.
7. **Close the loop.** After the plan's time has passed, ask once, lightly: how
   was it? That answer trains the taste model and is how ★ cards get written.
8. **Quiet by default.** At most a Thursday "your weekend" and reminders for
   things the person chose. Nothing else.
9. **Fast and offline.** Open to answer in under a second; works with no
   signal on a trail or in a basement bar.
10. **Taste stays on the phone.** The profile is learned and kept on the device.
    That is a feature to say out loud.

## Not decided

- The core gesture. Swipe, stack, board, conversation — none is chosen, and
  none should be copied from another product. It should come out of the six
  moments above, tested on real weeks.
- How two people share a plan without accounts.
- Whether the weekend plan is built by the person, suggested whole, or both.

*6 October: a proposal for all three is below — a different gesture for each
job rather than one gesture for everything; a link for two; suggested whole,
then edited by swapping stops, with the swipe kept for agreeing and saving. Still to be tested on real weeks, as written.*

---

## Three people, one question

The app is for life outside work, in a city you are actually living in. Three
people want that, and they differ less in taste than in **how long they
have**.

| | The local | The new arrival | The workationer |
|---|---|---|---|
| Who | Has lived here years. Loves the city, suspects they've stopped seeing it. | Moved from Bengaluru, Paris, Berlin. Staying years. Knows nobody yet. | Here two to eight weeks — a summer in Paris, a month near the Valley — working, but living, not touring. |
| What they'd say | "Keep my city new to me." | "Help me stop feeling like a visitor." | "Let me live here properly while I can." |
| What they lack | Novelty they trust, and *what's on* — the things that only happen this week. | Routines, places that become *theirs*, and people. Also the unwritten rules. | Time. Every weekend counts and there are only four. |
| What wins them | Things they didn't know existed, ten minutes away. Day trips. Seasons. | Regulars — the same Thursday run three times is how you make friends. Their café, their bakery, their park. | A plan sized to their stay, fitted around work, and something to show for it at the end. |
| The danger | "I know all this." The pool of new runs out. | Overwhelm, then loneliness, then the app is just another list. | They leave before the app learns them. |
| Measure | New-to-me places a month. | Regulars formed (three returns to one thing). Still using it in week eight. | Weeks of the stay with two or more outings. Whether they share the recap. |

The short-stay tourist is left out on purpose: three days is a different job,
and plenty of products do it. A tourist staying a few weeks is a workationer.

**The one question.** Instead of asking someone to pick a persona, ask what
sets it: *How long are you here?*

- **I live here** → the local.
- **I've just moved** (and roughly when) → the new arrival.
- **Until a date** → the workationer, with a countdown.

That answer is a **starting setting, not a verdict**. It sets the dial between
the known and the new (principle 3), how much weight Regulars get, what the
first week looks like, and the arc over months (see *Arcs*). But how long
someone stays doesn't decide their taste: a lifelong local may want routines,
a newcomer may want to range widely. So the dial it sets is visible and theirs
to move, on *What Allez knows about you*. LAUNCH.md says "no onboarding
questions". For the app, this one is worth asking, because it is the frame
rather than the taste, and it can't be inferred.

**The second question nobody asks: what are your hours?** A workationer from
Bengaluru working India hours from Mountain View is free from 9am to 4pm and
busy all night. A Parisian on Paris hours in San Francisco finishes at 9am. A
"Tonight" screen is wrong for both of them. People are bad at answering "when
are you free?", so ask what they already know — *I work: local hours / India
hours / Europe hours / my hours are odd / I'm not working*. The engine does
the arithmetic, and can plan the museum at 11am on a Tuesday, which is the
best time to go and the one no guide suggests.

**The third thing isn't a question about the person: who's coming?** Solo,
a partner, friends, kids, a dog. It changes from one weekend to the next, so it
belongs on the plan, not in a profile — one row of chips at the top of the
weekend, defaulting to last time's answer. See *Who's coming* below.

**Answer first, then ask.** The first screen is already an answer: one good
thing near them, open now, from location alone (principle 1). The questions
come after it, one at a time, as full-screen cards with no progress bar — the
app starting up, not a form. *How long are you here?* comes on the first
open, because everything else hangs off it. *Your hours* comes the first time
a time-of-day answer would be wrong without it. *This or that* is offered,
never required.

---

## The shape of the app: four surfaces, four gestures

One gesture can't do every moment in the table at the top. Each surface gets
the gesture that suits its job, and each borrows the *psychology* of an app
people already know, not its look.

Four surfaces aren't four tabs. The app shows **two: Today and Your city**.
The weekend takes over the screen from Thursday afternoon to Sunday (and is
one tap away the rest of the week, for a workationer planning ahead). *Out* is
not a place you go to; it's what any card becomes when you tap *Go*.

### 1. Today — a short stack you finish

Open the app: a vertical stack of five to eight full-screen cards, swiped up
like Inshorts. Each card stands on its own in a photo and two lines: the thing,
why, how far, open until when, the trust mark. The first card always answers
*right now* (time, weather, location). The rest are what today holds: a
Regular on tonight, an event that ends Sunday, a new opening, one bit of local
knowledge ("an SF library card gets you free museum passes").

**The stack ends.** The last card says *That's today* and shows tomorrow's
first thing, or what's new since yesterday. That is the difference from TikTok, and it's deliberate: the
competitor is the sofa (LAUNCH.md), and an endless feed is the sofa. A
finished stack is a small reward; an infinite one is a habit people come to
resent.

Gestures on a card: up for next, tap for the details, double-tap or a heart to
save, and a long press for *less like this*. No left or right here.

### 2. The weekend — a plan, then a match

From Thursday afternoon the weekend arrives **whole**: `Plan.weekend()` with
the taste weights — order, slots, the journey between, weather, spend — for
whoever's coming. Choosing is the work Allez promises to take away, so the
person doesn't start with a deck. They change the plan by swapping a stop
(*another one like this*, from a short row of alternatives) or deleting it,
never by starting over.

The swipe is kept for the two jobs where it decides something:

- **Agreeing with one other person** (principle 5). Send the weekend by link.
  Each person swipes the same dozen cards, the other one with no account or
  app — the web page does it. Where both swiped right is a **match**, and the
  plan is rebuilt from the matches. If nothing matches, the plan falls back
  on the kinds of thing both liked (a hike, a long lunch) before giving up.
  The link is the invitation, so it is also how the app spreads (LAUNCH.md,
  *The plan is the invitation*).
- **Saving for yourself.** *Show me more* opens the deck alone: right saves it
  for some weekend, left says not for me. It's how a solo explorer fills a
  list, and it trains the taste weights better than any quiz.

Both people swipe the *same* deck on purpose: a match on a specific place at a
specific time is a plan, and a match on "a hike" is still a conversation.

### Who's coming

Who someone goes out with changes what's worth suggesting more than almost
anything about them. The chips at the top of the weekend change the plan, and
each also changes the way the plan is decided:

| With | What changes in the plan | How it's decided |
|---|---|---|
| **Alone** | Solo-friendly, places where people come on their own, Regulars that make it easy to meet people; counter seats over tables for four | The plan, plus the deck for saving |
| **A partner** | Pairs well: a walk then dinner, booking for two, something new to both | The match — Tinder's mechanic, used for agreeing |
| **Friends** | Group-sized places, things that take booking for six, nightlife | A vote, not a match: three or more people swiping becomes "most of you want…". Later, not the first build |
| **Kids, family** | Kid-friendly, short legs, an early finish, toilets and food nearby, nothing past bedtime | The plan alone; families need fewer, surer choices, not a deck |
| **A dog** | Dog-friendly parks, patios, trails; nothing indoors-only | The plan alone |

This is also where the social side will grow from — the people someone plans
with are already their graph — but in the first build it is only a filter and
a link.

### 3. Out — when they're actually going

Tap *Go* on anything and the app becomes the outing: directions, how long, what
to order or not miss (from the ★ note), when it closes, and *after this* — one
thing within ten minutes for when they come out. On iOS this is later a Live
Activity on the lock screen. Arriving shows a quiet *I'm here* button; nothing
is tracked in the background.

### 4. Your city — the record of a life here

Strava's insight is that recording an activity makes it feel bigger, and the
record is the thing you share. Instagram's is that a grid of your own photos is
a self-portrait. Both apply to a city:

- **The map that fills in.** Every outing stamps its neighbourhood.
  "9 of the Bay Area's 20 neighbourhoods and towns." The local finally sees which parts of
  their own city they have never been to.
- **Postcards.** Every outing becomes one (see *After*).
- **Regulars.** Three times at the same Thursday run, and the app says so:
  *You're a regular.* For the new arrival, this is the most important line in
  the app.
- **Quests** from `quests.json` (the Coffee Quest's ten cafés) as progress,
  not points.
- **The season.** For a workationer, *Day 12 of 30*. For everyone, the month.

Private by default, and kept on the phone.

### What we borrow, and what we refuse

| From | Borrow | Refuse |
|---|---|---|
| Tinder | Binary choice at low cost; the *match* between two people | Swiping as the way to see everything — places aren't people, and a deck of fifty is still a list of fifty |
| Inshorts | Self-contained short cards; vertical swipe; one idea per card | Breadth for its own sake |
| TikTok | Full-bleed images; learning from what people linger on | The endless feed |
| Strava | The record makes the effort feel bigger; a shareable artifact; streaks that mean something real | Leaderboards. Nobody should compete at going out |
| Instagram | Your own grid as a portrait of your life here; Stories as the share format | Followers and likes, for now |
| Spotify Wrapped | The recap people *want* to post | Doing it only once a year |

**Taste in thirty seconds: this or that.** Instead of a quiz, an optional
deck of eight pairs: *natural wine bar or dive bar? a hike or a gallery? a
dinner you book or one you queue for?* Comparisons are faster than ratings,
more fun, and tell the engine more. It can come back later, a pair at a time,
as a card in the Today stack.

---

## When they don't open it

Most of the value has to arrive without the app being opened. The rule: **every
notification is a complete answer on its own**, and there are few of them.

| What | When | What it says | Without opening the app |
|---|---|---|---|
| **Your weekend** | Thursday, around 5pm local | "Saturday: Andytown, then the coast walk to the Sutro Baths ruins, dinner in the Outer Sunset. Sunday's open." | Long press: see the plan, add it to the calendar, send it to someone |
| **Only now** | At most once a week, only on a strong match | "Fleet Week ends Sunday. The Blue Angels fly over the Marina in the afternoon." | Save, or *not for me* |
| **Your regular** | Only for things the person chose | "Lindy in the Park at 11, 14 min away. Dry." | *Going* / *skip this week* |
| **How was it?** | The morning after a plan's time | "How was Saturday?" | Three buttons right in the notification: *loved it / fine / not for me*. One tap, done |
| **Workation** | Day 1, the second-to-last weekend, the last day | "One weekend left. Here's what you'd regret missing." | Opens the plan |

The default budget is three a week. One setting with three answers: *just my
weekend / a few good things / only what I chose*. Ask for notification
permission after the first save, not at launch — once the person has seen
what a notification would bring.

Two surfaces that need no notification at all:

- **The widget.** *Right now, near you* — the top card of the Today stack, on
  the home screen. Free time, place and weather change it through the day.
  This is the habit moment from the table at the top, done without the app.
- **The calendar.** A plan added to the calendar is a Saturday that happens.
  The Thursday `webcal://` feed in LAUNCH.md does the same for people without
  the app.

**Email, once a week at most:** Thursday's weekend, plus one Regular to try,
plus the month's postcards on the first Thursday of the month. Plain, short,
the house voice.

**What the phone can and can't do on its own.** Notifications can be
scheduled on the device, with no server, push service or account. But a phone
won't reliably wake a closed app at 5pm on Thursday to compute a fresh,
weather-aware plan — background work runs when the operating system allows
(see Expo's background-task notes). So in the first build the plan is
computed whenever the app was last opened, the notification is booked with
it, and its text only promises what that plan can still deliver ("Your
weekend's ready", not tomorrow's weather). A server-sent Thursday push, built
from fresh data, comes with the Worker.

---

## After — the part nobody builds

Guides stop at the recommendation. The feeling people remember is afterwards,
and it's what makes them open the app again.

1. **One tap.** *Loved it / fine / not for me / didn't go*, in the
   notification once the build supports action buttons, and as the top card
   of Today until then. *Didn't go* matters as much as the others: a tap on
   directions is not an outing. Optional: *would go again*, and *would you
   have done this anyway?* — the honest measure of whether Allez changed
   anything. That's the whole rating, and it trains `Store.tasteWeights()`.
2. **The postcard.** Allez makes a card: the place, the neighbourhood, the
   date, that day's weather, the person's own photo if they add one (or the
   card's photo), and their one line. It's stamped, dated and beautiful at
   Story size. It goes in *Your city*, and sharing it is one tap. Strava's
   whole growth was this artifact; most of Allez's first public sightings will
   be one of these.
3. **The learning shows.** The next Today stack says why: *Because you loved
   Andytown: Sightglass, and two more Coffee Quest cafés you haven't been to.* People rate
   things when they can see the rating did something.
4. **The milestones that mean something real.** First outing in a new
   neighbourhood. Third time at a Regular. Every quest café. Four weekends in
   a row out of the house. None of these are points; they're things that
   happened.
5. **Looking back.** *A year ago today: Dolores Park.* The monthly recap, and
   for workationers the end-of-stay one — *Your 30 days in the Bay Area: 19
   outings, 11 neighbourhoods, one regular, the fog only won twice.* This is
   the thing they post when they get home, and their friends who are coming
   next summer are exactly the next workationers.

---

## Arcs: the app changes as they stay

The same four surfaces, weighted differently over time, by the answer to *how
long are you here?*

**The workationer — a season.** Week one is orientation around where they're
staying: a café that suits a laptop, a bakery, a park, the grocery, how to get
around. Then the big weekends and day trips (`daytrips.json` has 24 for the
Bay Area). The second-to-last weekend brings *before you go*. The last day
brings the recap. The countdown is always visible, because a finite stay is a
reason to go out tonight rather than next week.

**The new arrival — becoming local, in chapters.**
*Your block* (week one: your coffee, your bakery, your park, the practical
things). *Your city* (month one: one new neighbourhood a weekend). *Your
people* (months two and three: Regulars, with *solo-friendly* and *people
come alone* marked plainly). *Your rhythm* (a season in: the usual, plus one
new thing a week). The chapters show on *Your city* like a path, and finishing
one is a quiet moment, not a badge.

**The local — the city again.** Dial towards the new. What's only on this
week. Seasons: persimmons, Fleet Week, the fog's month off. The neighbourhoods
the map shows they've never stamped. Day trips. The quests. The local is also
the first person to invite onto the Locals' Bench.

---

## The agent they define

"Personalised" usually means a model guessing behind a curtain. Allez shows
what it has learned and lets people change it — a screen called *What Allez
knows about you*:

> More: outdoors, live music, coffee. Less: clubs. Free: weekday mornings,
> weekends. Getting around: walking, Caltrain, no car. Spend: $$. Usually
> with: a partner. Here until: 30 November.

Every line is a chip they can tap to change or remove. It's the "agent" made
visible, and it's the privacy promise made visible too: this is everything,
and it's on your phone.

A typed *ask* — "Saturday with my sister, she likes art, nothing too
expensive" — belongs to the agent later, because it needs a model and so a
server. The first build doesn't need it, and the stack shouldn't wait for it:
answer before asking.

---

## What won't work

- **Swiping as the whole app.** It turns a guide into a deck of fifty, and
  makes people do the choosing Allez promised to do. Swipe where it decides
  something — the match, saving for yourself — and nowhere else.
- **An endless feed.** It wins opens and loses outings, and outings are the
  north star.
- **A social feed before there are people.** An empty room is worse than no
  room. Sharing *out* (postcards to Instagram and WhatsApp) comes first.
- **Points, levels, leaderboards.** They make going out feel like a chore, and
  they reward the wrong people.
- **A chat box as the home screen.** A blank box is a question; the app's job
  is the answer.
- **A long quiz.** People leave. Two questions and an optional deck.
- **Running out of new.** This is the real risk. A daily stack for months needs
  a supply of things that are new *to this person*: events, openings, seasons,
  regulars, local knowledge. For the Bay Area that is 150 ingested events, 20
  hand-picked, 16 regulars and 24 day trips today. A local who opens it every
  day will feel the edges in about three weeks. The stack has to be shorter on
  thin days rather than padded — five good cards beat eight with three
  fillers.
- **Background location for check-ins.** Both stores scrutinise it, people
  distrust it, and the plan's own time is enough to know when to ask *how was
  it?*

---

## What the content has to add

The app asks the data for a few things the site doesn't need. **Ends on comes
first**: *only now* is the best notification in the app and can't be honest
without it. Events already carry `end`; exhibitions, seasons and pop-ups need
it too. The rest follow in this order:

- **Ends on**, for exhibitions, seasons and pop-ups.
- **Solo-friendly and meets-people**, on Regulars and events. For the new
  arrival and the workationer, "people come on their own" is the deciding
  fact.
- **Kid-friendly and dog-friendly**, for *who's coming*. OpenStreetMap carries
  `dog=*` on some places; the rest is checked by hand, like hours.
- **Laptop-friendly**, for cafés (outlets, Wi-Fi, whether they mind).
- **Local knowledge cards**: one-line things a local knows. Library museum
  passes, free museum days, Sunday Streets, which Caltrain car has the bikes,
  how tipping works. Written by us, checked like every other record, and the
  best cards for the new arrival's first week.
- **A weekly drop.** The editorial heartbeat of the MVP, and mandatory rather
  than nice to have: each Thursday, a handful of new things the team has found,
  so the stack always has something new. This is where the content work goes
  until people can post. It only works if installed apps receive it, so it is
  published as data, not as an app update: the app fetches the city's JSON
  from allez.city (already served there for the site), keeps the last copy
  for offline, and falls back to what it shipped with.

---

## The road to people posting

The MVP is written by us, and the trust ladder is the brand. People's own
content comes in steps, each one tested before the next:

1. **Private journal** (first build). Ratings, photos and lines, on the phone.
2. **Sharing out.** Postcards and the recap, to Stories and chats. Distribution,
   with no moderation needed.
3. **The Locals' Bench, in the app.** The trusted few submit a postcard as a
   suggestion. An agent drafts the card in the house voice; the founder
   approves; it's credited *★ went — first name*. Same rule as today.
4. **Friends.** See the maps and postcards of people you've shared a plan with.
   The plans for two are already the graph.
5. **Open posting**, with a new rung on the trust ladder that is clearly not ★,
   and moderation. Only when there are enough people that the room isn't empty.

Every postcard in step 1 is already the shape of a post in step 5, so nothing
has to be rebuilt.

---

## How it looks and how it talks

*Added 6 October 2026, with the mascot.*

### Minimal, on a phone

The website stays calm by showing less. The app keeps that, under rules
that suit a hand on the move:

1. **One thing on the screen at a time.** A card fills the screen, and the
   screen has one job. If a screen needs a heading to explain it, it's two
   screens.
2. **The places supply the colour.** The frame is warm paper (`#FBF8F3`),
   ink (`#1F1D1A`) and the pigeon's feather grey (`#8A8580`) for anything
   secondary. The pigeon's beanie orange (`#F28C28`) is the only accent, and
   it marks **one action per screen** — the thing to do next. Dark mode is
   warm charcoal, never pure black.
3. **One typeface, rounded and friendly** (Nunito), in three sizes and two
   weights. Hierarchy comes from size and space, not from boxes and lines.
4. **Two tabs, words not icons:** *Today* and *My city*. The weekend takes
   the screen over when it's the weekend.
5. **Facts in one quiet line.** "12 min · open till 6 · $$ · ★ we went".
   Everything else is a tap away.
6. **The thumb's half of the screen.** Primary actions sit at the bottom,
   reachable one-handed; nothing important is in the top corners.
7. **Motion and touch confirm, they don't decorate.** A small spring when a
   card is saved, a light tap of haptics on a match. Nothing moves on its
   own.
8. **No settings screen to speak of.** What can be changed is on *What Allez
   knows about you*, written as sentences.

### The pigeon

Pigeons are the most local creature in any city: in every square, at every
café table, never lost for long. That's the character — a friend who has
been everywhere on foot and is pleased to show you. Soft, curious, a bit
greedy for pastry, never smug.

The pigeon is **punctuation, not wallpaper**. It never sits on a content
card, because the places are the point. It turns up at the moments with
feeling:

| Moment | Pose | Line, as a guide |
|---|---|---|
| First open, the questions | `hello` — pointing | "Hello. I know this city by the pavement." |
| Tapping *Go* | `go` — off with the tote | "Off you go. I'll be here after." |
| The end of Today | `content` — eyes shut, sitting | "That's today. Go on, pick one." |
| Nothing open, very late | `tired` | "Most of the city's asleep. Me too, nearly." |
| No signal, nothing found, an error | `lost` — with the map | "Lost the signal. Here's what I remembered." |
| A postcard, a match, a regular | `celebrate` | "That's one for the book." |
| Loading, empty lists | `walk`, `plain` | "Having a look round…" |

City versions (the beret in Paris, the cap in New York, the cup of chai in
Delhi) are for each city's own pack later. The Bay Area keeps the orange
beanie.

### The voice

Warm, friendly, a little playful, inviting — a friend who went last week and
can't wait to tell you. It extends the site's voice rather than replacing it:

- **The fun is in the frame; the facts stay plain.** Headings, empty states,
  notifications and celebrations can smile. Hours, prices, distances and
  "checked 3 days ago" never joke, because trust is the product.
- **Talk to one person.** "You'll like the counter seats", not "visitors
  enjoy".
- **Invite, don't instruct.** "Fancy a walk after?" rather than "Add a stop".
- **Short.** A notification is one sentence. A card's *why* is two.
- **One exclamation mark, at most, and only for a celebration.** No "hidden
  gems", no "vibes", no "must-try". At most one pigeon joke per screen, and
  most screens have none.
- **The pigeon speaks as "I" only in its own moments** (the table above).
  Everywhere else the app speaks plainly as Allez.

LAUNCH.md's "no exclamation marks" becomes "one, for celebrations" in the app.
Everything else in it holds.

---

## The first build that can be tested

The spike in `app/` already loads the engine and shows *right now* and the
weekend in Expo. The first testable build is **one loop — the weekend plan, go,
how was it, the postcard** — with Today as the way in. Everything else waits
until that loop holds people.

| In | Out, for now |
|---|---|
| An answer on first open, then *how long are you here?* and *your hours*, one card at a time | Accounts, sign-in; *this or that* |
| Today: the finite stack, with a real last card | A typed ask (needs a server) |
| The weekend, whole, with *who's coming* chips and swap-a-stop | The deck for saving; votes for groups |
| The match for two by link — the first build's only social feature, because it's the only one that brings a second person | Friends' maps, any feed |
| *Go*: directions, the ★ note, *after this* | Live Activity, widget, calendar sync (native extensions; the native decision) |
| *How was it?* (with *didn't go*) as the top card of Today after the plan's time | Action buttons in the notification |
| The postcard, kept in *Your city*, shared through the system share sheet | The map that fills in, quests, arcs, recaps |
| Thursday's weekend as a local notification, from the last plan computed | Server push; email |
| Data fetched from allez.city with an offline copy, so the weekly drop arrives | Every city but the Bay Area |
| Storage that survives a restart (the spike's is in memory) | *What Allez knows about you* beyond the two answers and *more / less* |

The match-for-two page is the one piece that needs the web: a small page on
allez.city that reads the deck from the link and sends the swipes back in the
link. No server is needed for the first version of that either.

*Built 6 October 2026,* in `app/` (Expo Router, `app/src/app/`) and
`match/index.html`:

- **Today** (`(tabs)/index.js`): the finite stack. The answer comes first,
  then *how long are you here?* as a card in the stack; *your hours* waits
  for a later open. *After work* replaces *right now* while the person is at
  work, on whichever clock they work to.
- **The weekend** (`weekend.js`): the plan arrives whole, with *who's coming*
  chips and *something else* on every stop. **The deck** (`deck.js`) handles
  agreeing (sent by link) and saving alone. A reply comes back as
  `allez://match?…` (`match.js`) or is pasted in, and the weekend is replanned
  from what both people chose.
- **Go** (`go/[id].js`): directions, good to know, *I'm here*, *after this*.
  Tapping Go starts the outing.
- **How was it?** (`how/[key].js`): it shows as the top card of Today once
  the outing is due, and as a local notification if allowed. *Didn't go* and
  *would you have gone anyway?* are recorded. **The postcard**
  (`postcard/[key].js`) is shared as an image.
- **My city** (`(tabs)/city.js`) and **What Allez knows about you**
  (`me.js`).
- Every word lives in `src/lib/voice.js` and every colour in
  `src/lib/theme.js`. The pigeon poses are in `assets/pigeon/`.
- Data: the bundled copy, refreshed from allez.city's own data files
  (`src/lib/data.js`). Taste lives in the engine's storage, outings in the
  app's, and both are kept on the phone.

To run it: `cd app && npx expo start`, then open it in Expo Go on a phone.
Expo Go can't receive `allez://` links, so paste the reply there; a
development build can. `allez.city/match/` only works once `match/` is
deployed.

**Getting it onto phones without the stores.** Android needs no Play account to
test: an EAS build for internal distribution is an APK that testers install
from a link. iOS without the paid account runs only on the founder's own
phone (rebuilt weekly) and the Simulator; testers on iPhones need TestFlight,
which needs the paid membership. So: the founder's iPhone or Android phone
first, then Android testers by link, then enrol with Apple when the loop works.
The Play Store's closed test (twelve testers, fourteen days) can run during
that same period.

---

## The test

Fifteen people, five of each kind, in the Bay Area, for three weeks. Recruit
workationers through coworking spaces, monthly-stay hosts and company relocation
channels; new arrivals through newcomer groups; locals from the beta pairs in
LAUNCH.md. Several of them should come as pairs, so the match gets used.

**This is discovery, not proof.** Five people per kind will show patterns and
surprises; it can't show that one kind goes out more than another, because
their lives already differ. So the comparison is each person against
themselves:

- **Before:** a short call about their last three weeks — what they did
  outside work, how they chose it, what they meant to do and didn't.
- **During:** the app's own on-device counts, sent to us with one tap at the
  end, and *how was it?* answers including *didn't go* and *would you have
  done this anyway?*
- **After:** the same call again, walking through which suggestions led to
  something and which didn't, and why.

What we are trying to prove wrong, outings first:

1. **Allez gets people out.** Confirmed outings (from *how was it?*, not from
   taps on directions), and how many of them the person says they wouldn't
   have done otherwise.
2. **Thursday works.** One in four Thursday plans leads to at least one
   outing that weekend, whether or not the app was opened in between. Someone
   who opens it once, takes Thursday's plan and goes out is a success.
3. **It keeps working.** Outings in week three, not just week one — and
   whether people **run out of new** by then. If they do, the weekly drop is
   too small.
4. **The answers matter.** Does *your hours* predict when they actually go
   out? Does *how long are you here* match what they want, or do people move
   the dial?
5. **After is worth it.** Half of outings get a *how was it?*; one in five
   postcards gets shared.
6. **Two is better than one.** Plans made by matching happen more often than
   plans made alone.

And one that has to stay at zero: **suggestions that were closed or wrong.**

Opens and finished stacks are recorded too, but as a means. The native
decision should rest on outings and on week three, not on how often the
stack is opened.

## How we'd know it works

- Days a week it is opened, and whether weekday use is habitual.
- Plans made, and plans actually done (from the "how was it?" check-in).
- New places tried per month, against returns to favourites — both are good;
  the balance is the person's.
- Suggestions that were closed or wrong: the target is none.

## What the web work now has to give it

The app is later, but the work happening now is its foundation, so it is shaped
for it:

- **The data** — one record shape for every kind of thing, with hours, booking
  links, photos, a still-open check and a checked date.
- **The taste engine** — learning from ratings and use, fading old signals,
  deliberately suggesting new things — built as engine code the website, the
  MCP server and the app can all use, not as website UI.
- **The MCP server** — the same answers, for agents.

*Where that stands, 25 September 2026.* For the Bay Area, every record the
guide vouches for carries hours, a checked date, a booking link or `false`, a
duration, a price level and indoors-or-out, and CI fails if one stops. The
weekend plan is `Plan.weekend()` in `js/plan.js` — ordered stops with the
journey between them, reason codes, open blocks and a spend — and the taste
engine fades old ratings, takes stated preferences and weights the untried
(`Store.tasteWeights()` in `js/state.js`; no screen asks yet). The site counts
its own use without cookies, which is the baseline for the first measure in
"How we'd know it works": how often it is opened, which views, and by whom
outside the household.
