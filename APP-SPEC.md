# App spec

The product spec for the Allez app, written 16 October 2026. APP.md says
what the app has to be and why. This file says, feature by feature, exactly
how each one behaves, so it can be built and checked without guessing.
APP-TASKS.md says in what order.

Each feature has the same parts: **the job** (one line), **who it's for**,
**how it behaves**, **states** (empty, offline, error), **data** (what's
stored and where), **done when** (the checks), and **not now**. Words on
screen are guides; the real strings live in `app/src/lib/voice.js`.

**Status** is one of: *built* (in `app/`, seen in Expo), *partly built*,
*spec only*.

---

## Ground rules for every feature

1. **On the phone.** Taste, outings, saves, photos and screenshots are kept
   on the device (AsyncStorage and the app's file storage). Nothing leaves
   the phone without a tap the person can see.
2. **No accounts.** Nothing asks for a sign-in. Two people share by link.
3. **Offline first.** Every screen renders from the last saved data. The
   network only makes things fresher.
4. **Closed never shows.** Anything closed now, or ended, is dropped before
   ranking (`Rank.isLive`), not hidden after.
5. **One action per screen** in slate (`#4E6A8E`). Everything else is quiet.
6. **Facts are plain.** Hours, distances, prices and "checked 3 days ago"
   never joke. Coo appears only at the moments in APP.md's table.
7. **Fast.** Cold open to the first card in under a second on a mid-range
   Android phone, from saved data.
8. **Counted for the test.** Each feature lists its counts. Counts stay in
   `counts` in saved state and leave only through the test report.

---

## 1. First open and the two questions · *built*

**The job:** an answer on the first screen, then the one question that frames
everything.

**Who:** everyone, once.

**How it behaves**
- Opening the app shows Today with a *right now* card from location alone.
  If location is refused, use the city centre and say so in the card's fact
  line ("near Union Square — turn on location for closer").
- Card 2 is *How long are you here?*: **I live here** / **I've just moved**
  (then "roughly when?": this month, 1–6 months, longer) / **Until a date**
  (date picker, max one year ahead).
- *Your hours* (local / India / Europe / odd / not working) is asked the first
  time an after-work or right-now card would be wrong without it — not on
  first open.
- Each answer saves on tap and the stack moves on. No back button, no
  progress dots.

**Effects**
| Answer | Novelty dial start | Regulars weight | First week |
|---|---|---|---|
| I live here | toward new | normal | normal Today |
| Just moved | middle | high | *Your block* cards |
| Until a date | toward new | low | orientation + countdown |

**States:** no location → city centre. No data yet (first launch offline) →
the bundled copy.

**Data:** `profile.horizon`, `profile.until`, `profile.movedAt`,
`profile.hours`.

**Done when:** a fresh install shows a real card before any question; the
three answers give visibly different second-day stacks; changing the answer
on *What Allez knows* changes tomorrow's stack.

**Not now:** *this or that* as onboarding (it's offered later as a Today card).

---

## 2. Today — the finite stack · *built; playful editorial look partly built*

**The job:** what today holds, in five to eight cards, then stop.

**How it behaves**
- Header: the drawn Allez signature, then "Your Tuesday, sorted." *Surprise
  me* opens one of today's picks; *Your taste* opens What Allez knows.
- Order:
  1. A due *How was it?* card, if any (feature 7).
  2. *Right now* (or *after work* when the person's hours say they're
     working).
  3. Up to six more, from: a Regular on tonight, an event ending within 3
     days, a new opening, a saved thing that fits today (feature 12), one
     local knowledge card, one *this or that* pair.
  4. *That's today* — Coo `content`, tomorrow's first thing or "new since
     yesterday".
- **Thin days are short.** Never pad. Five good cards is a full stack.
- Each card: photo on top (credit visible), then on paper: name, a two-line
  *why* (expands in place), one fact line ("12 min · open till 6 · $$ ·
  ★ we went"), and controls **Save**, **Go**, **Less like this**.
- Gestures: scroll vertically; tap opens details; double-tap saves; long press
  is *less like this* with a toast ("Got it, fewer like this").

**States:** offline → last stack, with "updated 9:14" in the fact line of
the first card. Nothing open (late) → Coo `tired`, one card for tomorrow
morning.

**Data:** taste weights in the engine store; `counts.opens[date]`,
`counts.todayFinished[date]`.

**Done when:** the last card always exists; no closed place appears on 50
random simulated times; a long press visibly changes the next day's stack.

---

## 3. The weekend — whole plan, who's coming, swap · *built*

**The job:** a ready weekend, changed by swapping, never started from blank.

**How it behaves**
- Takes the screen over from Thursday 15:00 to Sunday 23:59 (local); one tap
  from Today the rest of the week.
- Top: *who's coming* chips — Alone, Partner, Friends, Kids, Dog — defaulting
  to last time's choice. Changing a chip replans at once.
- Body: Saturday and Sunday, each morning / afternoon / evening, from
  `Plan.weekend()`: stop, why, the journey to the next stop (walk / transit /
  drive and minutes), weather, rough spend.
- Each stop: **Something else** (a row of three alternatives of the same kind,
  same area) and **Remove**. Fixed stops from saves (feature 12) show a pin
  and can't be swapped, only removed.
- Bottom action: **Plan it with someone** (feature 4).

**States:** rain → indoor alternatives float up and the weather line says so.
Thin area → a day can have two stops, not three.

**Data:** last plan in saved state (so the notification can promise it);
`counts.weekendOpened`, `counts.swaps`.

**Done when:** each chip changes at least one stop on the sample weekend; a
swap never offers a closed or already-planned place; replanning keeps pinned
stops.

---

## 4. The deck and the match for two · *built (app + `match/`)*

**The job:** agree with one other person on a specific weekend.

**How it behaves**
- *Plan it with someone* builds a deck of 12 cards from this weekend's
  candidates and sends `allez.city/match/#…` through the share sheet.
- The other person swipes on the web, with no app or account. Right = yes,
  left = no. Their reply comes back as `allez://match?…` (or pasted text in
  Expo Go).
- Matches (both right) rebuild the plan. No matches → fall back to shared
  *kinds* (both liked a hike) → else "no overlap this time" and the original
  plan stays.
- **Show me more** opens the deck alone: right saves for some weekend, left
  is *not for me*. Both train taste.

**Data:** the deck travels in the link (no server). `counts.decksSent`,
`counts.decksMatched`.

**Done when:** one real deck has gone to a real person and come back (1.5).

**Not now:** group votes (three or more).

---

## 5. Go — the outing · *built*

**The job:** everything you need while actually going.

**How it behaves**
- Directions (opens the system maps app), time to get there, closing time,
  the ★ note (what to order or not miss), and *after this* (one thing within
  ten minutes, open when they'll come out).
- **I'm here** button, quiet. Tapping Go starts an outing; nothing tracks in
  the background.

**Data:** `outings[]`: `{key, id, startedAt, dueAt, verdict?}`.

**Done when:** Go on any card makes an outing that becomes due 2 hours after
the plan's time (or after tapping Go, if unplanned).

**Not now:** Live Activity (phase 5).

---

## 6. Notifications · *partly built*

**The job:** a complete answer without opening the app. Three a week by
default.

| Kind | When | Status |
|---|---|---|
| Your weekend | Thursday ~17:00 local, from the last plan | built (local) |
| How was it? | morning after, or 2h after an unplanned Go | built (local) |
| Your regular | before a Regular the person chose | spec only |
| Only now | ≤1/week, strong match, ends soon | spec only |
| Workation | day 1, second-to-last weekend, last day | spec only |
| Saved thing is on | a dated save, the day before | spec only (feature 12) |

- Permission is asked after the first save, never at launch.
- One setting: *just my weekend / a few good things / only what I chose*.

**Done when:** both built notifications are seen on a locked phone (2.5).

---

## 7. How was it? · *built*

**The job:** one tap after an outing, to close the loop.

**How it behaves**
- Top card of Today when an outing is due; also a local notification.
- *Loved it / fine / not for me / didn't go.* Then, optional: *would go
  again?* and *would you have done this anyway?*
- Then offers **Make a postcard**.

**Data:** verdict on the outing; taste weights updated.
`counts.verdicts`, `counts.didntGo`, `counts.anyway`.

**Done when:** a verdict changes tomorrow's *because you loved…* line.

---

## 8. Postcards · *built*

**The job:** the shareable record of an outing.

**How it behaves**
- Place, neighbourhood, date, that day's weather, the person's photo (or the
  card's), their one line. Story-sized. Kept in My city.
- **Share** opens the system share sheet with the image.

**Data:** postcard image in file storage, entry in `postcards[]`.
`counts.postcardsMade`, `counts.postcardsShared`.

**Done when:** a shared postcard looks right in an Instagram story and in
WhatsApp.

---

## 9. My city · *partly built*

**The job:** the record of a life here.

- Built: counts, the countdown (*Day 12 of 30*), regulars (*You're a regular*
  after three returns), postcards.
- Spec only (phase 4): the map that fills in, quests as progress, monthly and
  end-of-stay recaps, *a year ago today*, the arcs.
- Hidden developer option: a long press on *My city* makes every open outing
  due now (not in release builds).

---

## 10. What Allez knows about you · *built*

**The job:** the taste model, visible and editable.

- Sentences of chips: More / Less / Free / Getting around / Spend / Usually
  with / Here until. Tap to change or remove.
- The novelty dial (known ↔ new).
- **Send my test notes** (the test report) at the bottom.
- **Forget everything** — clears all saved state after one confirmation.

---

## 11. Data, refresh and offline · *built*

- The city's JSON is bundled at build time and refreshed from allez.city on
  launch and when the app returns to the foreground, if older than 6 hours.
- The last good copy is kept. A failed or malformed fetch never replaces it.
- The weekly drop (Thursday) arrives this way, with no app update.

**Done when:** a record added to the site on Thursday shows in the app
without a new build; airplane mode at launch still shows a full stack.

---

## 12. Snapshot — saved from anywhere · *spec only*

**The job:** a screenshot or shared link from Instagram (or anywhere) becomes
a saved thing that turns up in a plan when it fits. See APP.md, *Saved from
anywhere*.

**Who:** all three, most of all the local ("keep my city new") and the
workationer (every weekend counts).

### Ways in

| Way in | Needs | Version |
|---|---|---|
| **Add from a screenshot** button (Today header menu, Saved, the weekend) → photo picker | `expo-image-picker` (already in the app) | v0, works in Expo Go |
| **Paste a link or text** (Instagram "Copy link", or a caption) | clipboard | v0, works in Expo Go |
| **Share → Allez** from Instagram, Photos, Safari, Maps | share extension (iOS) / intent filter (Android), via a config plugin | v1, development build |

### The flow

1. **Receive** an image, a URL, text, or a mix.
2. **Read.**
   - v0: no text reading. The person types the name (one field, with
     autocomplete from the city's records as they type).
   - v1: on-device text recognition (Apple Vision / Google ML Kit, through a
     config-plugin module). Pull out candidates: proper names, @handles,
     dates and times ("Sat 25 Oct", "this Friday 7pm"), addresses and
     neighbourhood names.
3. **Match** against places, events, regulars and day trips:
   - Score = name similarity (normalised, accents and "The" stripped) +
     handle match (records may carry `instagram`) + neighbourhood or address
     match + date overlap for events.
   - **≥ high threshold:** auto-match, show "Is this it?" with our card — one
     tap to confirm.
   - **Middle:** show the top three, plus *None of these*.
   - **Low / none:** the unknown-place form.
4. **Confirm** — one screen:
   - The screenshot (small), the matched card or the editable name.
   - **When:** *This weekend* / *Pick a day* / *Some time* (default from any
     date read; events with dates in our data use those).
   - **Who with** (optional chip, defaults to the weekend's).
   - Action: **Save it**. Confirmation: "Saved: Hinodeya, Japantown. I'll
     find a Saturday for it."
5. **Place into plans** (feature 3 and Today):
   - **Dated** (this weekend or a day): becomes a *pinned stop* in that day's
     slot; `Plan.weekend()` builds the other stops around it (nearby, right
     order, no clash).
   - **Some time:** joins the *saved pool*. The planner gives saves a boost
     when they're open in a free slot, near the day's other stops, and fit
     who's coming. At most one saved stop per day unless the person pinned
     more.
   - Today shows a save that fits *today* as a card ("You saved this —
     it's open till 10 and 12 min away").

### The Saved list

- In My city: **Saved**, three groups: *Coming up* (dated), *Some time*,
  *Missed* (ended, shown once then archived).
- Each row: thumbnail (the person's screenshot or our photo), name, when,
  and *Plan it* / *Remove*.
- Unknown saves carry a quiet "not checked by Allez" in the fact line. Never
  ★, never "we went".

### Data

```js
saves: [{
  id,                       // uuid
  createdAt,
  source: 'screenshot' | 'share' | 'link' | 'text',
  imageUri,                 // local file, app storage; null for links
  url,                      // as shared, if any; never fetched for content
  text,                     // OCR or pasted text, kept on the phone
  recordId,                 // matched city record, or null
  title, area,              // for unknown places, as confirmed
  when: { kind: 'day' | 'weekend' | 'someday', date, start, end },
  company,                  // optional
  status: 'saved' | 'planned' | 'done' | 'missed' | 'removed',
}]
```

Counts: `counts.savesBySource`, `counts.savesMatched`, `counts.savesUnknown`,
`counts.savesPlanned`, `counts.savesGone` (a save that became an outing).

### Engine change

`Plan.weekend(world, opts)` gains:
- `opts.pinned`: `[{ id | {title, lat, lng}, day, slot? }]` — must appear,
  others planned around.
- `opts.saved`: a pool of ids, each given a boost in its kind's slot when
  open and within reach.
- Unknown saves without coordinates can be pinned to a day but don't affect
  the journey times; the plan says "you'll find your own way to this one".

The change lives in the shared engine (`js/` → `app/engine/engine.js`) so the
site can use it later.

### Privacy

- The image, OCR text and link stay on the phone, included in *Forget
  everything*.
- **Tell Allez about places we're missing** — off by default, asked once,
  after the third unknown save. Sends only name + neighbourhood, never the
  image or text.
- The screenshot never becomes public content (see the no-aggregator rule and
  DATA-LICENSE.md). A lead sent to us is researched and written from our own
  sources.

### States

- Image with no readable text → straight to the typed-name form.
- Matched record is closed → "That's closed now — save something like it?"
  with three alternatives.
- Event already over → "That's been and gone" and offer the venue instead.
- Offline → save goes in with the text as typed; matching runs again when
  data is fresh.

### Done when

- v0 (Expo Go): five real Instagram screenshots of Bay Area places in our
  data are saved by picking and typing, each lands in the right weekend or
  Saved group, and a dated one appears as a pinned stop.
- v1 (development build): *Share → Allez* from Instagram and Photos opens the
  confirm screen within two seconds; OCR auto-matches at least 4 of 5 known
  places with no typing.
- The test report includes the save counts.

### Not now

- Fetching or parsing Instagram posts from a link.
- Saving from TikTok/Maps with special handling (they come in as links or
  images and are treated the same).
- Sharing saves with someone else (a save can go into the deck for two later).

---

## 13. Test report and counts · *built*

- **Send my test notes** writes plain text through the share sheet: the two
  answers, opens per day, stacks finished, weekend opened, swaps, decks sent
  and matched, outings, verdicts, didn't go, anyway, postcards made and
  shared — and, once feature 12 lands, the save counts.
- Places' names only if the person ticks the box.

---

## Open questions

| # | Question | Who | Needed by |
|---|---|---|---|
| 1 | Deck first or plan first for the weekend (A/B in the test)? | F | before testers start |
| 2 | Snapshot v0 in the first test, or after it? (Recommendation: in, as v0.) | F | 20 October |
| 3 | Add an `instagram` handle field to place records for matching? | F + C | before snapshot v1 |
| 4 | Apple Developer Program now (iPhone dev builds, TestFlight) or later? | F | before snapshot v1 on iPhone |
