# Competition, moat, and what people would love

Written 8 October 2026. It starts from an outside assessment (a ChatGPT
analysis of District, Swiggy Scenes, Sofa, Meta Muse and OpenAI Dots), checks
it against what Allez actually is today, and says where it holds up and where
it doesn't. LAUNCH.md has the plan and APP.md has the app. This document is
about who else is in the room, what Allez has that they can't easily copy, and
what would make an investor or a customer care.

> **The short version.** The outside assessment gets the thesis right: be the
> best *decision engine* for enjoying a city, not another listings or booking
> app, and treat agents as a channel as well as a threat. Allez was already
> heading there. It went wrong in three places. It compared Allez with Indian
> booking apps when the launch city is the Bay Area. It treated "data" as the
> moat, when open data is the one thing anyone can copy. And it suggested
> affiliate commissions as phase 2, which would break the trust promise and is
> blocked by Allez's non-commercial licences anyway. The real moat is narrower
> and stranger than "data": **a dated record of somebody checking, an
> incentive to recommend the free thing, and outcome data nobody else
> collects.** Today it's thin. It gets deeper every week it's kept up.

---

## 1. What the outside assessment said

In brief:

- **District (Eternal/Zomato)** is a going-out *transaction* business: movies,
  dining, concerts, sports, with real scale and real losses. Its weakness is
  structural. It has little reason to recommend things it can't sell.
- **Swiggy Scenes** extends restaurant partnerships into events. It has strong
  distribution but a muddled identity ("do I open Swiggy to discover my
  city?"). Swiggy has opened its services to outside AI agents through MCP.
- **Sofa** is a paid personal library for leisure, polished and privacy-first.
  It makes the user do the curating, and it doesn't do live discovery.
- **Muse and Dots** are general personal agents that could become the layer
  people go through instead of opening apps. They threaten anything whose
  value is aggregating listings behind a screen.
- **For Allez:** don't build another District, a general Sofa, or a Muse
  rival. Build the decision engine. Five bets: great suggestions before any
  personalisation; reliable real-world context; lightweight memory; real plans
  rather than cards; agent-compatible output (MCP). North star: *qualified
  outings completed per weekly active user*. Three experiments: feed against
  ready-made plan, editorial against AI ranking, and memory against context.

### Fact check

| Claim | Status |
|---|---|
| District's going-out FY26 figures (₹9,399 cr NOV, +42%, ₹973 cr revenue, −₹319 cr adjusted EBITDA) | **Not verified as a full-year total.** The reported quarters point the same way: Q4 FY26 NOV ₹2,736 cr, revenue ₹277 cr, adjusted EBITDA −₹81 cr; Q3 loss ₹121 cr. FY30 guidance is $3B NOV and $150M adjusted EBITDA. The direction (growing, still loss-making) stands. Check the FY26 shareholder letter before quoting the numbers. |
| Swiggy exposes 66 MCP tools across Food, Instamart, Dineout and Scenes | **Partly verified.** It launched in April 2026 with 3 servers and 18+ tools (Food, Instamart, Dineout), invite-only. The 66 tools and the Scenes server come from a later Inc42 report quoting the CTO, with no official page confirming them. |
| Muse and Dots are competing to be the agent layer | **Verified.** Muse launched 8 September 2026 (free, $20 and $100 tiers, 3M+ downloads per Semafor). Dots launched 29 September, initially on higher ChatGPT tiers, and reads as the professional play. |
| Sofa: $5.99/month, $49.99/year, $249.99 lifetime, free tier | **Not verified.** Sofa's support pages confirm a monthly or yearly "Super Sofa" tier but no prices. |

---

## 2. Where the assessment is right, and Allez already agrees

Most of the advice is already a principle in this repository, which is good
news. Two people reasoning from the same problem reached the same place.

| The assessment says | Allez already has it |
|---|---|
| "Excellent suggestions before personalisation" | APP.md principle 1, *answer before asking*. The ranking uses time, place, weather and what's open before it knows anything about you. |
| "Reliable real-world context" | Provenance on every card (★ went / researched / on the map), `lastVerified`, hours, closed places filtered out, and the Bay Area held by CI to the plan contract. |
| "A real plan, not a collection of cards" | `Plan.weekend()`, APP.md principle 4, and swapping a single stop. |
| "Lightweight personal memory" | *Close the loop* (loved it / fine / not for me / didn't go), with taste kept on the device. |
| "The LLM explains; it mustn't invent schedules" | The engine is deterministic. The `why` fields are written by a person. No model generates facts. |
| "Agent-compatible discovery" | The read-only MCP server is a January deliverable (LAUNCH.md, Decision 2). |
| "Measure outings, not listings" | LAUNCH.md's north star is outings, including *didn't go* and *would you have done this anyway?* |

## 3. Where it's wrong, or misses what matters

**1. Wrong competitor set for the launch.** District and Scenes are Indian
booking apps. Allez launches in the Bay Area. They matter for the Delhi and
Bengaluru packs, but the January competition is Google Maps (with Gemini),
Yelp, Beli, The Infatuation, Eventbrite and Partiful, the free-events
newsletters, and above all Muse, which launched in the same city in the same
season. See section 4.

**2. It calls data the moat. Allez's data is open on purpose.** Its sources
are OpenStreetMap, Wikidata, city open-data portals and venues' own pages
(no review or listing sites; see SOURCES.md). Anyone can download those. "A continuously verified
graph of opportunities" is right, but the moat is the *verifying*, not the
graph. See section 5.

**3. Affiliate commissions as phase 2 would cost the one thing Allez sells.**
LAUNCH.md already rejects them for January because "an affiliate fee on a
booking link is the first thing a sceptic will look for". Two licences block
them as well: Open-Meteo and developers.events are both non-commercial. The
order ChatGPT suggests (trust, then transactions, then premium and B2B) should
become: trust, then the agent and data channel, then premium. Transactions come
last, if at all, and never ranked.

**4. It underrates the cost of curation.** "Editorial judgement" appears as an
advantage with no price attached. The README is blunter: the `why` fields
"do not scale, which is fine". For an investor it isn't fine until there's a
cheaper way to make them. The answer is the Locals' Bench plus agent-drafted
cards with a person approving each one, and the evidence needed is the cost
per ★ card falling over time.

**5. It misses the most valuable asset Allez could own:** *counterfactual
outcome data*. "Would you have done this anyway?" measures whether a
recommendation changed what somebody did. Booking platforms can't know it,
general agents don't ask it, and it's the number that proves a discovery
product works.

**6. It treats "AI disruption exposure" as a threat score.** For Allez it's
the opportunity. Muse's early reviews caught it recommending places closed for
years and inventing a phone number (ROADMAP.md, *Two audiences*). The
weaknesses of general agents fall exactly where Allez is strongest.

---

## 4. The landscape, re-drawn for the launch

The question every product here answers: *what should I do with my free time,
near here, soon?* What sets them apart is what they're paid for, because that
decides what they'll recommend.

| Who | What it's really for | Paid by | Will it send you to a free park? | Does it say when it last checked? |
|---|---|---|---|---|
| **Google Maps + Gemini** | Finding a known place; the default | Ads, local promotions | Sometimes, by accident | Business status from crowd signals; no dated human check |
| **Yelp** | Reviews of businesses | Advertisers | Rarely; parks aren't customers | No |
| **Beli, The Infatuation, Resy** | Restaurants | Users' social graph; reservations | No (restaurants only) | No |
| **Eventbrite, Partiful, Meetup, Luma** | Events and invitations | Ticket fees, organisers | Only if it's ticketed or hosted there | The event has a date; the venue isn't checked |
| **Free-events newsletters and blogs** | Weekly lists | Ads, sponsors | Yes | It's dated, but it's a list of fifty |
| **District / Scenes** (India packs) | Booking a night out | Commission, fees, ads | Little reason to | No |
| **Sofa** | Organising what you saved | Subscribers | If you added it yourself | Not applicable; you're the source |
| **Meta Muse / OpenAI Dots** | Doing anything for you | Subscriptions, and in time partners and commerce | It might; it might also invent one | No, and that's the gap |
| **Allez** | Three things worth leaving home for, now, as a plan | Nobody yet; deliberately | **Yes, by design** (Regulars, parks, markets, free events) | **Yes, on every card** |

Two columns carry the argument. Every incumbent's revenue pulls its
recommendations towards what can be sold. Allez's lack of revenue is a
handicap for growth and an advantage for trust, and keeping that advantage
once money arrives is the hardest strategic problem in this document.

### The threats, ranked

1. **Gemini in Google Maps.** It isn't the most exciting threat, but it's the
   most likely. It already has the default position, coverage, hours and
   crowd signals. If Google adds a convincing "verified recently" layer,
   Allez's headline claim gets weaker. Answer: be visibly better in one city
   (the Dud Index measures this), and own the free and the first-hand, which
   Google's ad model doesn't reward.
2. **Muse.** It's consumer-facing, free, launched in the Bay Area, and plans
   and books. It has the user relationship that Allez wants. Answer: become a
   source Muse cites rather than a rival it replaces, *if* Meta opens it to
   third-party sources (not confirmed as of 23 September), while the site
   keeps what an agent answer can't give: browsing, serendipity, routes,
   quests, postcards.
3. **A well-funded copy.** "Allez, but with 50 cities and a team" is buildable,
   because the engine and the open data are copyable. What it can't buy
   quickly is a year of dated checks, a bench of locals, and a public record
   of corrections.
4. **Beli-style social taste apps** moving from restaurants into everything.
   Their moat is the friend graph, which Allez deliberately doesn't build yet.

---

## 5. Allez's moat: what's real, what's coming, what isn't one

Honest scoring. "Today" means October 2026, one founder, before launch.

| Candidate | Moat? | Today | Why |
|---|---|---|---|
| The engine (ranking, plan, freshness, packs) | **No** | — | Good engineering, and copyable. A strong team rebuilds it in a quarter. Its value is speed: a sixth city at marginal cost. |
| Open data coverage | **No** | — | Open by definition. Coverage is a cost, not a barrier. |
| **The verification ledger.** Every ★ and researched record has a source, a `lastVerified` date and a history of checks | **Yes, compounding** | Thin | A competitor can copy today's data. It can't copy fourteen months of dated checks or the dud rate they produce. Each week kept up widens the gap; each week skipped narrows it. |
| **Incentive alignment** (counter-positioning) | **Yes, structural** | Strong | District, Scenes, Yelp, Google and eventually Muse earn money when you do the paid thing. Allez recommending the free lakeside walk costs them revenue to copy. This is the strongest power Allez has, and it lasts only as long as the business model doesn't erode it. |
| **Outcome data** (loved it / didn't go / would you have anyway) | **Yes, if collected** | Not yet | Booking platforms see purchases, not satisfaction. Agents see requests, not outcomes. A ranking trained on whether people actually went and liked it gets better with use, and nobody else has the labels. |
| **The Locals' Bench and organisers** | **Partly** | Starting | A network of trusted people writing ★ cards, and 30+ organisers linking to their Allez listing. It's slow to build and real once built, but it's relationships, not lock-in. |
| **Taste on the device, no accounts** | **Positioning, not a moat** | Strong | Felt and easy to say, but a competitor could adopt it. Ad-funded ones won't. |
| **Being the cited source for agents** (MCP, per-record pages, JSON-LD) | **Distribution, possibly a moat** | Not built | If agents learn to call Allez for "is it still there and is it good", every agent answer becomes an Allez referral. It becomes a moat only if Allez is the default trusted source, which takes being first and being right. |
| **Voice and taste** (the `why` fields, the pigeon, the postcard) | **Brand** | Real but small | It's what people love and remember. Brand compounds slowly and can't be cloned exactly. |

**The one-line moat:** *Allez is the only city guide that's paid to be right,
not to sell, and it can prove it: a dated, public record of checking and
correcting, plus outcome data on whether people went and liked it.*

### What turns that into a real moat over the next 12 months

1. **Keep the freshness promise without a break.** `check-fresh.mjs` at 100%
   is the moat being dug. Treat a lapse like downtime.
2. **Collect outcomes from day one.** If the January web app can't ask *how
   was it?*, Allez launches without its most defensible asset. The share link,
   the calendar entry and Thursday's email are all chances to ask.
3. **Publish the corrections log.** A public, timestamped list of every dud
   and every fix is copyable only by doing the work.
4. **Bring down the cost per ★ card.** Bench submission, then an agent's draft,
   then the founder's approval. Track minutes per card. Investors will ask how
   it scales, and this number is the answer.
5. **Ship the MCP server before the agent directories fill up.** Being early is
   worth a lot in a channel that is still forming.

---

## 6. What customers would love

Not features but moments, in the order they'd notice them.

1. **It answers before you ask.** You open it and see three things, right for
   now: the weather, what's open, near where you are. No search box, no quiz.
2. **"Checked 3 days ago."** The first time they see it, people realise no
   other guide tells them. The first time it's right and Google was wrong,
   they're won over.
3. **It never sends you somewhere closed.** If it does, it's fixed within a
   day and the fix is public. That turns the worst moment into proof.
4. **The free thing is allowed to win.** A market, a waltz night in the park,
   a telescope evening. People feel the difference from apps that are selling
   something even when they can't say why.
5. **Plans for two without an account.** Send a link, they tick and cross, and
   you see where you agree. The weekend gets decided in a WhatsApp thread
   instead of dying in one.
6. **"Because you loved Andytown."** The learning is visible and editable
   (*What Allez knows about you*), and it stays on the phone.
7. **The postcard.** A beautiful, dated record of a good Saturday, worth
   posting. For workationers, the end-of-stay recap.
8. **Regulars for the lonely months.** *People come alone* marked plainly. For
   new arrivals, the most useful thing a city guide has ever done.
9. **It's quiet.** One Thursday note. Nothing else.

What they'd hate: running out of new things after three weeks (APP.md names
this as the real risk), and thin "preview" cities. Both are supply problems,
which is why the Bench and organiser channels matter as much as the product.

## 7. What investors would love, and what they'll push on

### The story that works

> General agents are about to handle everyday decisions, and they're
> unreliable about the physical world. Muse has already sent people to places
> that closed years ago. Allez is the trust layer for real-world
> recommendations: a consumer product people use every week, and the verified
> source agents call. It's paid to be right, not to sell. It runs as one
> founder with a bench of agents, so a city costs very little to add.

The parts of that story that land:

- **Timing.** Muse and Dots launched in September 2026. Agent reliability is a
  live story, and the Dud Index puts a number on it.
- **Two-sided distribution.** A direct product *and* an agent channel. If
  agents win the user relationship (Scenario A in the original assessment),
  Allez is a supplier. If vertical quality wins (Scenario B), Allez is the
  product. Under the hybrid (C) it's both. Few consumer bets survive all three.
- **Capital efficiency.** Five cities, one engine, one person, no backend. The
  operating model is part of the pitch.
- **A measurable promise.** Zero unfixed duds after 24 hours. Investors like a
  number the company can't fudge.

### What they'll push on, and the evidence that answers it

| They'll ask | What answers it | Where it's tracked |
|---|---|---|
| "Will anyone come back?" | Week-4 return ≥ 35% in the beta, and Thursday-to-Saturday opens rising | LAUNCH.md metrics, the go/no-go gate |
| "Does it change behaviour?" | Outings per weekly user, and the *would you have done this anyway?* share | Not yet instrumented. Make it a January must. |
| "Is the trust claim real?" | The Dud Index: Allez's dud rate against Muse, ChatGPT, Gemini and Maps, measured the same way | November fieldwork |
| "How does curation scale?" | Cost per ★ card falling; Bench cards per week | Not yet tracked. Start with the Bench. |
| "How does it grow without ads?" | Shares per plan viewed (target 1 in 3) and organiser badges (30 by launch) | LAUNCH.md |
| "Where's the money?" | Which channel shows demand first: agent and data licensing (MCP calls a week, inbound interest), a premium app (plans for two, the life record), or B2B (hotels, relocation, workation hosts) | Decided in Q2 2027 from data |
| "What if Google adds 'verified'?" | Counter-positioning: ads pay Google to rank the sellable. Plus a head start on dated checks and outcome labels. | This document |
| "Isn't this a lifestyle business?" | It may be, in one city. The venture case needs the agent channel to work. Be honest that MCP adoption is the bet. | — |

### The honest weaknesses to say before they do

- **One founder.** The bus factor is one, and December is overloaded (the
  first risk in LAUNCH.md).
- **No revenue, and licences that block it.** The non-commercial licences have
  to be swapped before the first dollar.
- **Willingness to pay for leisure discovery is historically low.** Sofa's
  scale is undisclosed, and most consumer guide companies became media or ad
  businesses. Allez has to find a model that doesn't turn it into what it
  competes against.
- **Muse's openness to third-party sources isn't confirmed.** The agent-channel
  thesis rests partly on platform decisions Allez doesn't control.
- **Supply runs out.** A daily user feels the edges in about three weeks.

---

## 8. What this changes in the plan

Most of LAUNCH.md stands. Five adjustments come out of this review:

1. **Make outcome capture a January must-ship**, not an app-only feature:
   *how was it?*, *didn't go* and *would you have done this anyway?* on the
   web, through the share link, the plan page and Thursday's email. It's the
   moat that compounds fastest, and it's the north star's denominator.
2. **Track cost per ★ card** from the first Bench submission.
3. **Run the outside assessment's Experiment A** (feed against ready-made
   plan) in the November beta. It's cheap and it settles an open question in
   APP.md.
4. **Re-run this landscape for India before Delhi or Bengaluru leave
   preview.** District, Scenes and Swiggy's MCP tools are the real
   competitors there, and Swiggy's tools may be a *partner* for the booking
   step, if its terms allow.
5. **Write down the monetisation red line now, before there's money:** no
   paid ranking and no affiliate on ranked results, ever. Paid placement, if
   any, is labelled and kept apart. It's easier to promise before the first
   offer arrives.

---

### Sources

- The outside assessment: ChatGPT, *App comparison analysis*, shared October 2026.
- District figures: [Inc42, Eternal Q4](https://inc42.com/buzz/eternal-q4-profit-surges-4-5x-yoy-to-₹174-cr/), [Inc42, Eternal's triple bet](https://inc42.com/features/eternals-triple-bet-faces-profitability-test/), [Storyboard18](https://www.storyboard18.com/digital/district-now-accounts-for-20-of-eternals-business-deepinder-goyal-75719.htm)
- Swiggy MCP: [Swiggy Builders Club](https://mcp.swiggy.com/builders), [launch post](https://mcp.swiggy.com/builders/blog/2026-04-17-builders-club-launch/), [Inc42 on Swiggy's agents](https://inc42.com/buzz/how-swiggy-is-using-ai-agents-to-take-commerce-beyond-its-app/)
- Muse and Dots: [MacRumors](https://www.macrumors.com/2026/09/29/openai-launches-dots/), [Semafor](https://www.semafor.com/article/09/29/2026/openai-unveils-its-muse-competitor-dots)
- Sofa: [What is Super Sofa?](https://sofahq.com/support/super-sofa/what-is-super-sofa/)
- Internal: LAUNCH.md (positioning, distribution, metrics, risks), APP.md (principles, *After*, *What won't work*), ROADMAP.md (*Two audiences*), README.md.
