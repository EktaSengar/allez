# Launch

The plan for putting Allez in front of the public in January 2027. Written
1 October 2026, fifteen weeks out. ROADMAP.md says how the engine and data got
here; APP.md says what the native app has to be good at. This document covers
the rest: what ships, to whom, how they hear about it, how we know it worked,
and what happens when it's wrong.

> **What's worth leaving home for, in the city you live in.**

The line names the competitor, and it isn't Yelp or Google Maps. It's the sofa:
the evening that goes to scrolling because choosing something felt like work.
Every decision below gets tested against one question. Does this get somebody
out of the door, to something good, that is open?

---

## The honest starting position

| | Paris | Bay Area | New York | Delhi | Bengaluru |
|---|---|---|---|---|---|
| hand-written (`places`, `food`, `nightlife`) | 97 | 140 | 25 | 64 | 23 |
| researched (`editorial`) | 42 | 96 | 16 | 47 | 36 |
| regulars | 13 | 16 | 12 | 11 | 6 |
| live events | 504 + 10 | 150 + 20 | 133 + 10 | 6 | 9 |
| itineraries / quests | 11 / 17 | 4 / 3 | 0 / 0 | 0 / 0 | 0 / 0 |
| held by CI to the plan contract | no | **yes** | no | no | no |

The record counts are from 1 October 2026.

There's one engine and five packs, and only one pack meets the standard the
launch promise needs. The Bay Area is the only city where every vouched-for
record carries hours, a checked date, a booking link, a duration and a price,
and where CI fails if one goes missing. It's also where the founder is going out
every week, so it's the only city where the ★ tier is still growing.

There's one person, a static site and no backend. In this plan that's an
advantage: the site is fast, cheap and private by default. It just means the
plan has to buy leverage from agents rather than from headcount (see
*Operating model*).

---

## Decision 1: what "launch" means

**Recommendation: launch one city deep, with the others visible and labelled
"preview".**

- **Launch city: the Bay Area** (SF and the Peninsula). It's the only pack held
  to the contract, the founder lives there, it's where Meta Muse launched, and
  it's where the AI-native early adopters who'll try an MCP connector are
  concentrated.
- **Paris, New York, Delhi and Bengaluru stay live**, with a quiet "preview:
  fewer first-hand picks" note in the header. Taking them down would cost
  nothing, and keeping them shows the engine travels. But the launch story,
  the beta and the metrics are about one city.
- **Paris is the second city** (target: April 2027). It has the deepest
  hand-written tier and the best open data, but it needs the Bay Area's
  hours-and-booking pass and someone on the ground going out.

A guide that's thin in five cities reads as a demo. A guide that's
unmistakably right in one city reads as a product.

## Decision 2: which surfaces ship in January

Per APP.md, the gesture-led native app comes later. January ships three
surfaces, all running on the same records and the same engine:

| Surface | Job | State today |
|---|---|---|
| **allez.city** as an installable web app | The direct product: tonight, this weekend, regulars, right here | Built. Needs a home screen that answers before asking, install and offline in the Bay Area, and share links |
| **Allez MCP server** | The agent channel: Claude, ChatGPT apps, Muse when it opens | Not started. Read-only, a thin layer over `record.js`, `nearby.js`, `scoring.js` and `plan.js` |
| **"Your weekend" every Thursday** | The owned channel: a calendar feed and an email | Not started. `Plan.weekend()` already produces the content |

*(Reopened 1 October. See* Native in January? *below.)* As first planned, the native app goes to a **TestFlight beta in March 2027** for the people who
used the web version most in January. Its gesture should come from watching
real weeks of use (APP.md, *Not decided*), and January is when those weeks
start.

## Decision 3: free, and not commercial yet. Fix the licences before anything is sold

Allez currently depends on three things that are **non-commercial only**:
Open-Meteo (weather), developers.events (CC BY-NC, the Tech tab) and the free
GoatCounter tier. That's fine for a free launch, and it's a hard blocker for
any revenue. So:

- **January: free, no ads, no affiliate links.** Trust is the product, and an
  affiliate fee on a booking link is the first thing a sceptic will look for.
- **Before any revenue (not before launch):** move US weather to the National
  Weather Service (public domain) or Open-Meteo's paid plan, drop or license
  developers.events, and pay for GoatCounter.
- **Money, to be decided in Q2 2027 from what the data shows.** The most
  plausible business sits in the agent channel, not the site: a verified,
  fresh "is it still there and is it good" layer is what agents lack, and it's
  what this repository is built around. Second, a paid tier of the app (plans
  for two, unlimited lists). Third, organisers paying for featured Regulars,
  which is last on the list because it competes directly with the trust
  promise.

---

## Positioning

**For** people who live in a city and want to use it,
**who** are tired of lists of fifty and of AI answers that send them to places
that closed two years ago,
**Allez is** a city guide that offers three things worth leaving home for right
now,
**unlike** search, review sites and general-purpose agents,
**because** every suggestion says whether somebody went, when it was last
checked, and whether it's open now. Closed places never appear.

Three proof points carry the whole story:

1. **Somebody went.** The provenance ladder is visible on every card: ★ went,
   researched, or on the map.
2. **Checked, with a date.** "Checked 3 days ago" is on the card. No other
   guide puts its staleness on display.
3. **Zero duds.** The public promise: if Allez sends you somewhere closed, tell
   us and it's fixed within 24 hours, with the fix logged in public.

**Voice.** It reads like a friend who went last week, not a brand. That's the
existing `why` voice, so keep it. No exclamation marks and no "hidden gems".

**Privacy is a feature, so say it out loud:** no accounts, no cookies, and your
taste stays on your phone. In 2027 that sets Allez apart from Muse in a way
people can feel.

---

## Distribution in an AI-native world

The old playbook (SEO content farms, paid social, influencer posts) is the
wrong fit. It's expensive, and answer engines are eating the clicks it used to
earn. The new channels are the ones Allez is unusually well built for.

### 1. Be the source agents cite (agent and answer-engine optimisation)

People increasingly ask Claude, ChatGPT, Perplexity, Gemini and Muse "what
should we do this weekend". Allez wants to be what those answers rest on, with
its name attached.

- **MCP server, listed everywhere it can be.** Anthropic's connector directory,
  OpenAI's apps directory (the Apps SDK is MCP-based) and the public MCP
  registries. Each tool result carries provenance and a link back to the
  allez.city card. **Submit in early December**, because review queues are
  slow over the holidays. Check each directory's current submission rules
  when you submit.
- **One static page per record**: `allez.city/bay-area/p/<id>`, generated at
  build time, with schema.org JSON-LD (`Place`, `Event`, `openingHours`,
  `dateModified`). Today the site is a single page, and an answer engine
  can't cite a card it can't load on its own. This is the biggest piece of
  engineering on the list, and it's the one that makes every other channel
  work.
- **`llms.txt`** and a clean `/bay-area/weekend.json` for agents that browse
  the web rather than calling tools.
- **Measure it:** referrals from chat.openai.com, claude.ai, perplexity.ai and
  gemini, MCP calls a week, and a monthly manual check of which agent answers
  cite Allez.

### 2. The plan is the invitation (built-in growth loop)

APP.md: weekend plans are usually made *with someone*. So every plan has a
second person in it, and that person is the next user.

- **Share a plan by link.** The plan is encoded in the URL, so no account is
  needed, and a rich preview image renders in iMessage, WhatsApp and
  Instagram DMs.
- **The recipient can mark their own ✓ / ✗** on each stop and send it back. The
  page shows where the two of you agree. This is APP.md's "matching, not
  browsing", done with a link instead of accounts. It's the smallest version
  of the for-two feature, and on its own it's a reason to share.
- **"Add to calendar" on every plan and event.** A plan in your calendar
  becomes a Saturday that actually happens.

Target: **one share for every three plans viewed** in the beta. If sharing
doesn't happen in a group of friends, it won't happen with strangers.

### 3. The Dud Index: earned media from the moat

A piece of original research, published on launch day:

> We asked Meta Muse, ChatGPT, Gemini and Google Maps 100 everyday Bay Area
> questions ("coffee open now near Hayes Valley", "something to do Saturday
> night in Palo Alto") and walked or called every answer. **X% sent us
> somewhere closed, moved or invented.**

It's newsworthy, because agent hallucination is a live 2026 story, and Muse's
early reviews already caught it making up a phone number. It shows Allez's
reason to exist without any marketing language. And it's repeatable every
quarter. **The method must be fair and published in full**: the prompts, the
dates, the raw answers, and Allez's own dud rate measured the same way. If the
gap isn't real, we'll know before launch, and that's worth knowing too.

### 4. Organisers distribute Regulars

Every run club, choir, book club, life-drawing night and improv drop-in has an
audience and wants new members. Offer each of them, for free:

- a proper card, written from their own page, with a "get started" step;
- a small "Listed on Allez" badge and a link for their site, Meetup page and
  Instagram bio;
- an easy way to send corrections and new dates (see *Support*).

Target: **30 Bay Area organisers by launch.** Each one is a small, local,
trusted distribution channel, and that's worth far more than an ad.

### 5. Owned rhythm: Thursday's weekend

- **A calendar subscription** (`webcal://`) that drops "Your weekend: 3 ideas"
  into the calendar each Thursday. It works on every phone, with no app or
  account, and it lands where plans actually get made.
- **A plain-text email** (Buttondown or similar, the one place we collect an
  address, opt-in only): Thursday's weekend plus one Regular to try.

### 6. Launch-week communities

- **Show HN, Tuesday 12 January 2027, morning Pacific time.** The angle: a
  city guide with no accounts, no cookies, open data, a verified layer and an
  MCP server, plus the Dud Index. That's squarely what HN cares about.
- **Product Hunt on Wednesday 13 January.**
- **Claude and MCP communities** (Discord, X, the r/ClaudeAI and r/mcp crowd),
  showing a demo of Claude planning a real Saturday from Allez.
- **Local communities** (r/bayarea, r/sanfrancisco, r/paloalto, neighbourhood
  Slacks and newsletters), following each community's self-promotion rules,
  and posting a genuinely useful "100 things worth leaving home for this
  winter" rather than a link drop.
- **The January hook:** new-year resolutions. *"Take up one thing in 2027"* is
  the Regulars tab, written as a headline.

**What we're deliberately not doing:** paid ads, generic SEO articles, buying
listings data, or growth hacks that need an account.

---

## Product: what has to be true by January

Ordered by how much the launch depends on it.

**Must ship**

1. **A home screen that answers before asking**: open it and see what's worth
   leaving home for *right now*: time, weather, what's open, what's on.
   Tonight on weekday evenings, the weekend from Thursday afternoon. This is
   the screenshot in every launch post.
2. **Share-a-plan links** with preview images and add-to-calendar.
3. **Installable and offline in the Bay Area**: turn the service worker back
   on, and keep the performance budget in `.claude/skills/paris-performance`.
4. **"Something's wrong" on every card**: one tap, no account. It's the
   inbound half of the zero-duds promise.
5. **Static per-record pages with JSON-LD**, plus `llms.txt`.
6. **MCP server v1 for the Bay Area**: `tonight`, `weekend`, `near`, `place`,
   `regulars` and `events`, each answer with provenance and `lastVerified`.
7. **The liveness list** from ROADMAP.md, which is the last unbuilt piece:
   links that redirect off-domain, OSM ids gone `disused:`, Wikipedia going
   past tense. It produces a list for a person and never deletes anything.
8. ~~**The planner fixes** ROADMAP.md names.~~ Fixed 27 September and held by
   CI since 2 October.

**Should ship**

- Recipient ✓/✗ on a shared plan (the for-two loop).
- The Thursday calendar feed and email.
- A light "how was it?" prompt on a plan the day after (APP.md, principle 7),
  stored on the phone, which feeds `Store.tasteWeights()`.

**Not in January**

- Accounts, social features, comments or user reviews.
- New cities.
- The native app, beyond its TestFlight preparation.
- Booking inside Allez. Link to the booking page, never become one.

---

## Design

- **One idea per screen.** Three options, not thirty (APP.md, principle 2). The
  home screen is the design problem that matters. Everything else already
  exists.
- **The trust system is the visual identity.** ★ went, researched, on the map,
  and "checked N days ago" should be the most recognisable thing about Allez,
  in the way a Michelin star is. Design it once and use it everywhere: the
  card, the share image, the MCP result's link-back page, the email.
- **The share image is the ad.** Most people's first sight of Allez will be a
  preview in a group chat. It should show the plan, the places and the ★, and
  look good at thumbnail size.
- **Phone first.** Test at 375px, one-handed, on the street, in sunlight.
- **Preview cities say so**, kindly, and never look broken.
- **No onboarding questions.** Location and time are the onboarding. Taste is
  learned from what people open, save and rate, with an optional "less of
  this" on any card.

---

## Engineering

**The architecture stays as it is: static, keyless, accountless.** January
adds exactly one small backend, a **Cloudflare Worker** (or similar), with
four jobs:

| Endpoint | Purpose | Stores |
|---|---|---|
| `/mcp` | The MCP server, reading the same JSON the site ships | nothing |
| `/og/plan` | Renders share preview images from the plan in the URL | nothing (cached) |
| `/report` | "Something's wrong" reports and organiser updates; opens a GitHub issue | the report text, no identity |
| `/err` | Client error beacon | the error and the page, no identity |

The rule from ROADMAP.md holds: *the site may be briefly partial and must never
stay partial.* The Worker is additive. If it's down, the site still works and
only sharing, reporting and MCP degrade.

**New checks, so CI holds the launch promise:**

- `check-fresh.mjs`: every ★ and researched record in the launch city was
  checked in the last **30 days**, and the build fails if not. This turns
  "zero duds" from a slogan into something CI can enforce.
- `check-mcp.mjs`: the MCP answers equal the page's answers for the same
  place and time, so the two audiences never drift apart.
- The per-record pages validate as schema.org.

**Operations:**

- Daily: events ingest (exists), plus the liveness list run as a scheduled
  agent that opens issues.
- Weekly: OSM refresh (exists), plus the performance report (skill exists).
- Uptime monitoring on allez.city and the Worker, alerting to the founder's
  phone.
- Launch day: the site is static on GitHub Pages behind a CDN, so the HN front
  page is a non-event. Load-test the Worker's OG and MCP endpoints in December
  anyway.

---

## Customer support: corrections are the product

For a guide whose promise is "it's right", support and quality are the same
job.

**Inbound**

- The "something's wrong" button on every card offers *closed / hours wrong /
  moved / other*, and an optional note.
- `hello@allez.city` is for everything else.
- An organiser form is for Regulars and events.

**The loop, with agents doing the legwork and a person making the call**

1. A report arrives and the Worker opens a GitHub issue labelled `report`.
2. A triage agent checks it against the venue's own site, OSM and the record,
   then drafts a fix as a pull request, citing what it read.
3. The founder approves or rejects it on their phone. Nothing reaches the page
   without that approval. This is the same rule as `notes.json`'s `hide`.
4. The fix ships, and the card's checked date updates.

**Promises**

- **Closed or wrong: fixed within 24 hours**, from January onward.
- Email answered within 48 hours. Agents can draft replies, but a person sends
  them and the voice is the founder's.
- **A public corrections log** at `allez.city/fixed` lists what was reported,
  when and how fast it was fixed. Showing your corrections is the strongest
  trust signal a guide can give, and nobody else does it.

---

## Operating model: one founder and a bench of agents

A city guide with taste doesn't scale by hiring writers. It scales by having
agents do everything except the judgement.

| Job | Done by | Approved by |
|---|---|---|
| Events ingest, OSM refresh, link checks | scheduled scripts (exist) | CI |
| Liveness list, report triage, fix PRs | agents | founder |
| Drafting a ★ card from a field note, voice memo or photo | agent (in the house voice, not their words) | founder |
| Researching editorial records from venue sites and open data only | agent (no review or listing sites) | founder |
| Ranking and verdicts | founder, in fields only | — |
| Performance report | the `paris-performance` skill | founder |

**The Locals' Bench** grows the ★ tier without accounts. Invite 10–20 people
per city who go out a lot and whose taste the founder trusts. They send a
photo and a line by WhatsApp or email after an outing. An agent drafts the
card in the house voice. The founder approves it, and it's credited as "★ went
— <first name>". That's how ★ grows past what one person can visit, and how
Paris gets someone on the ground before April.

---

## Metrics

**North star: outings.** That means suggestions somebody actually went to,
counted as directions or booking taps plus "how was it?" answers. It measures
the vision ("worth leaving home for"), not page views.

| Measure | How | Beta target | Launch-month target |
|---|---|---|---|
| Weekly people (Bay Area) | GoatCounter, cookieless | 40 | 2,000 |
| Week-4 return | GoatCounter | 40% | 25% |
| Thursday–Saturday opens as a share of the week | GoatCounter | rising | rising |
| Shares per plan viewed | `/og/plan` hits | 1 in 3 | 1 in 5 |
| Outings a week | directions/booking taps + check-ins | 30 | 1,000 |
| **Duds reported** (closed or wrong) | `/report` | **0 unfixed after 24 h** | **0 unfixed after 24 h** |
| ★ + researched records checked in the last 30 days | `check-fresh.mjs` | 100% | 100% |
| MCP calls a week / agent-referred visits | Worker + referrers | — | 500 / 300 |
| Organisers listing their badge | manual | 30 | 60 |

The launch-month numbers are guesses to be replaced by the beta's real ones in
December. The dud and freshness rows aren't targets. They're the promise.

---

## Timeline

Fifteen weeks. Every milestone ships something on its own.

| Dates | Milestone | Ships |
|---|---|---|
| **1–14 Oct** | Foundations | These decisions agreed. Privacy and about pages. `/report` Worker and the button. `check-fresh.mjs`. Planner fixes. Dud Index method written. |
| **15 Oct – 15 Nov** | Build | Home screen that answers before asking. Share links with OG images and add-to-calendar. PWA and offline in the Bay Area. Per-record pages, JSON-LD, `llms.txt`. MCP server v1. Liveness agent. |
| **16 Nov – 13 Dec** | Private beta, 30–50 people in the Bay Area, invited in **pairs** | Weekly dud hunts. Watch which moments people actually open it for. Recipient ✓/✗. Thursday calendar feed. Run the Dud Index fieldwork. **Submit the MCP server to directories (first week of December).** Organiser outreach. Locals' Bench invited. |
| **14 Dec – 8 Jan** | Polish and freeze | Fix what the beta found, nothing new. Launch assets: the Dud Index write-up, a demo video of Claude planning a Saturday from Allez, screenshots and the share image. Press and newsletter list (Bay Area tech, local and AI newsletters). **Code freeze on 5 January.** |
| **12 Jan 2027** | **Launch** | Show HN + Dud Index (Tue). Product Hunt (Wed). MCP and Claude communities, then local communities, through the week. |
| **Jan – Mar** | Run the loop | A weekly review of metrics, duds and reports. The Dud Index again in April. Paris goes through the Bay Area contract. Native app TestFlight in March. Q2: the monetisation decision. |

### The go/no-go gate (decided on 5 January)

Launch on the 12th only if all of these hold. Otherwise slip a week and say
nothing:

- No dud reported in the last two weeks of the beta was left unfixed after 24
  hours.
- `check-fresh.mjs` passes for the Bay Area.
- At least 35% of beta testers are still opening Allez in their fourth week.
- At least one beta pair has shared a plan and gone on the outing without
  being asked to.
- The site, the MCP server and the share links survive a load test.

---

## Risks

| Risk | Likelihood | What we do |
|---|---|---|
| A solo founder overloaded in December | high | The *Not in January* list is a cut list, and it's enforced. If something has to give, the Thursday email goes first, the MCP server last. |
| A dud on launch day, in public | medium | `check-fresh.mjs`, the liveness agent, a manual walk-through of the top 50 cards in the week of 4 January, and the corrections log, which turns one dud into a demonstration of the fix. |
| MCP directory review isn't finished by launch | medium | Submit in early December. The server also works as a manually added connector, so document that path. |
| The Dud Index shows no real gap | low–medium | Publish it anyway, honestly, or don't lead with it. Never tune the method to get the headline. |
| A licence problem surfaces under attention | low | Already audited. Read DATA-LICENSE.md again before launch, and keep Luma hidden until permission arrives in writing. |
| Preview cities make the product look thin | medium | Label them clearly. Lead every launch post with the Bay Area. |
| GDPR questions from Paris visitors | low | No cookies and no accounts already. The privacy page states what GoatCounter and `/report` keep and for how long. |

---

## Decisions  ·  *agreed 1 October; updated 2 October 2026*

1. **The Bay Area is the launch city.** The other four stay live as "preview".
2. **January ships the web app, the MCP server and Thursday's weekend.** Whether
   an iOS app joins them in January is reopened. See *Native in January?*
   below. It's decided on 9 October, after a two-day spike.
3. **Free and non-commercial through Q1 2027.** The licence swaps happen before
   any revenue.
4. **The Cloudflare Worker is approved**, holding no user data.
5. **The Dud Index goes ahead.** Fieldwork is in November, and the method is
   published in full.
6. **The Locals' Bench goes ahead.** The founder names the first ten by
   4 October.
7. **Build and test the app locally before paid Apple enrollment.** Start
   with the iOS Simulator and the founder's own device. Enroll when the app
   is ready for TestFlight or App Store distribution, or when a feature under
   test requires paid membership. Native distribution dates below remain
   conditional on local validation and enrollment.

---

## Native in January?

**It's possible for iOS, but only as the same product in a native shell, not
the gesture app APP.md describes.** The cost comes out of the web and agent
work.

**What makes it possible.** The engine has no DOM: `hours.js`, `nearby.js`,
`plan.js`, `record.js`, `scoring.js` and `weather.js` never touch `document`,
and `scripts/shim.mjs` already runs them outside a browser. An Expo (React
Native) app can load the same files the same way, so it gives the same answers
as the site and the MCP server. What can't be reused is `js/app.js`, the
4,563-line interface. Every screen the app shows has to be written again.

**What it would buy.** The three APP.md moments that need a phone are the
habit, right here and after. Only native does them well:

- **a home-screen widget**: "right now near you", glanceable, no app open;
- **one notification a week**: Thursday's weekend (iOS web push only works
  once the site is added to the home screen, and few people do that);
- **location in the background** for "how was it?" the day after.

**What it would cost.** About five weeks, for one person, from 15 October:

| | Web-first January (current plan) | iOS also in January |
|---|---|---|
| Ships 12 Jan | web app, MCP, Thursday calendar and email | the same, plus an iOS app: Tonight, Weekend, Right here, widget, Thursday notification |
| Cut to make room | — | Thursday email (the notification replaces it), recipient ✓/✗ (moves to February), per-record pages for the four preview cities |
| New lead times | — | Apple Developer enrolment follows local validation; allow time for organization verification if applicable and App Store review. **18 December is a conditional submission target**, not a reason to enroll before testing. |
| Android | the web app covers it | still the web app. A new Google Play personal account needs 12 testers in a 14-day closed test before release, so Android follows in February at the earliest |
| Apple's rule against repackaged websites (guideline 4.2) | — | met by the widget, notifications and native screens, which is a reason not to just wrap the site |
| Risk | low | high: two interfaces and one person, with App Store review on the critical path |

**Recommendation: decide on 9 October, from evidence.** Spend 7–8 October on a
spike: an Expo app that loads the engine through the same approach as
`shim.mjs`, shows tonight's three picks for the Bay Area, and has a widget
prototype. If that works in two days, ship iOS in January and take the cuts
above. If it doesn't, keep the web-first plan and bring TestFlight forward to
February. **Updated 2 October:** build and test in the founder's environment
first; paid Apple Developer enrollment is deferred until the app is ready
for distribution or needs a membership-only capability. Reassess the native
release date after local testing rather than treating enrollment this week
as a prerequisite.

Local development and testing on personal devices can use a free Apple
Account in Xcode (a Personal Team). Its device provisioning profiles expire
after seven days, so the app needs rebuilding and reinstalling periodically.
TestFlight and App Store distribution require paid membership.
See [Apple's account overview](https://developer.apple.com/help/account/basics/about-your-developer-account)
and [programs overview](https://developer.apple.com/help/account/membership/programs-overview/).

---

## October

The first half is set day by day. The second half sets the build order, and
it's re-planned on 14 October.

### Something found while planning: freshness expires all at once

**156 of the Bay Area's 162 dated records were checked in September 2026.**
Under a 30-day rule, nearly the whole pack goes stale in the last week of
October, all at once. So `check-fresh.mjs` needs two things from day one:

- **Tiered windows.** 30 days for food, drink and nightlife, which change most;
  90 days for parks, museums, landmarks and institution-run regulars.
- **A rolling re-check**, about eight records a day. An agent fetches each
  venue's own site, compares hours, price and booking link with the record,
  and proposes only the differences. The founder approves the diff, and the
  checked date moves. Unchanged records just get a new date.

### 1–4 October (Thu–Sun): decide and unblock

| # | Task | Owner | Done when |
|---|---|---|---|
| 1 | Record the decisions in this file | Claude | merged |
| 2 | Prepare for local app development and testing; defer paid Apple Developer enrollment until local validation is complete | founder | local development path ready; enrollment deferred by decision on 2 Oct |
| 3 | Set up `hello@allez.city` and `ekta@allez.city` with Porkbun's free email forwarding to the founder's Gmail. DNS stays at Porkbun; Cloudflare is needed only for the Worker in week two (on a workers.dev address) | founder | **done 2 Oct**: both addresses receive mail |
| 4 | Name the first ten for the Locals' Bench and send them the ask: one photo and one line after an outing, by WhatsApp or email | founder | ten names, ten messages sent |
| 5 | The two planner bugs ROADMAP.md names were already fixed on 27 September (`bfe7f1b`) but nothing held them. Add checks to `check-plan.mjs`: 26 weekends from every base with no stop shut for its slot and no two legs over 45 minutes in a row, plus the two original cases rebuilt small | Claude | **done 2 Oct**: the new checks fail on the pre-fix planner and pass now |

### 5–11 October: the trust machinery

| # | Task | Owner | Done when |
|---|---|---|---|
| 6 | `check-fresh.mjs` with tiered windows, plus the rolling re-check list (the eight records due today), added to `check.yml` | Claude | CI reports the days left for each record |
| 7 | The re-check agent: a scheduled run that reads each due record's venue site and opens one PR per changed record | Claude | first daily PR opened |
| 8 | The Worker: `/report` (opens a GitHub issue labelled `report`) and `/err` (error beacon). The GitHub token lives as a Worker secret, never in the site | Claude | a test report becomes an issue |
| 9 | The "something's wrong" button on every card's details: closed, hours wrong, moved, other, plus an optional note. It still works if the Worker is down (falls back to a `mailto:`) | Claude | `check-views.mjs` unchanged everywhere except the new button |
| 10 | Privacy and about pages: what GoatCounter, `/report` and `/err` keep and for how long; who makes Allez and how the ★ / researched / on the map tiers work | Claude drafts, founder edits | linked from every footer |
| 11 | **Native spike** (7–8 Oct): Expo app, engine loaded as in `shim.mjs`, tonight's three Bay Area picks, a widget prototype | Claude | it runs in the iOS simulator, or we know why not |
| 12 | **9 Oct: native decision**, written into *Native in January?* | founder | decided |

### 12–14 October: set up November

| # | Task | Owner | Done when |
|---|---|---|---|
| 13 | Dud Index method: the 100 questions (spread across neighbourhoods, times of day and the six APP.md moments), the four products, what counts as a dud, how each answer is checked (walk, call, venue site), and Allez measured the same way. Dry-run 10 questions | Claude drafts, founder fieldworks | method written; dry run done |
| 14 | Beta list: 20 pairs (couples, flatmates, friends who go out together) in SF and the Peninsula, plus the invitation | founder | 20 pairs named |
| 15 | Organiser list: 40 Bay Area organisers, starting from `regulars.json` and the `mode: 'do'` records, with each one's contact route | Claude | list in `bay-area/data/` or a private note |
| 16 | Home screen brief: what "answer before asking" shows at 8am, 6pm, Thursday evening, Saturday morning and in the rain, at 375px | Claude drafts, founder decides | brief agreed; build starts on the 15th |
| 17 | Re-plan the second half of October from what the first half found | both | this section updated |

### 15–31 October: build order

Two tracks. Track B exists only if the native decision is yes.

**Track A: web and agents**

1. The home screen that answers before asking.
2. Share-a-plan links: plan in the URL, `/og/plan` preview images,
   add-to-calendar.
3. Bay Area PWA: the service worker on, offline for the last-seen answers,
   within the performance budget.
4. Per-record static pages with JSON-LD, and `llms.txt` (Bay Area first).
5. The MCP server v1 on the Worker, and `check-mcp.mjs`.
6. The liveness list (off-domain redirects, OSM `disused:`, Wikipedia past
   tense), feeding the same issue queue as `/report`.

**Track B: iOS, only if decided on 9 October**

1. The app shell and the engine loader, from the spike.
2. Tonight and Right here screens, reusing the trust badges' design.
3. The widget.

Items 4–6 of Track A move to the first half of November if Track B runs.
