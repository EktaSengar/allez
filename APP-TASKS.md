# App tasks

The build list for the Allez app, written 6 October 2026 from APP.md. APP.md
says *what* the app has to be and why. This file says what to build next, in
order, and how we know each piece is done.

**Where it stands.** The first build is in `app/`. It has Today, the weekend
(complete plan, who's coming, swap a stop), the deck (for two by link, and
saving alone), Go, How was it?, postcards, My city (counts, countdown,
regulars) and What Allez knows about you. The swipe page for the other person
is in `match/`. So far it has only been tried in the web version, never on a
phone.

**The rule for the order.** The test is about one loop: *weekend plan → go →
how was it → postcard*. Anything that makes that loop work on real phones comes
first. Things that make the app richer come after the loop has been seen
working with testers.

Each task has an owner (**C** for Claude, **F** for founder), what "done"
means, and its dependencies.

---

## Phase 1: on real phones (this week)

Nothing else matters until the app runs on a phone in someone's hand.

### 1.1 Run on the founder's phone · C + F
- F installs Expo Go. C runs the dev server and F opens the app on the phone.
- Walk the whole loop on the phone: answer the question, tap Go on a card,
  open How was it? from My city's test hook (see 1.2), make a postcard, share
  it to yourself.
- **Done when:** every screen opens on the phone with no red error screen, and
  a list of what looked or felt wrong is written down (feeds 1.4).

### 1.2 A test switch for "How was it?" · C
- How was it? normally waits 2 hours, which makes testing slow. Add a hidden
  developer-only option: a long press on "My city" makes every open outing due
  now.
- **Done when:** the How was it? card appears at the top of Today straight
  after a long press. The option doesn't exist in release builds.

### 1.3 Fix: hot reload breaks the engine import · C
- After a live reload in development, `makeWorld` can fail with "boot is not a
  function" (seen in the web preview). A fresh launch works.
- **Done when:** editing a screen file during `expo start` no longer breaks
  the app.

### 1.4 First-phone fixes · C
- Fix whatever 1.1 turns up. Already known:
  - The text over a photo needs a softer, taller fade. Check it on a real
    screen.
  - Quiet buttons are faint in dark mode. Raise their border contrast.
  - The modal screens (How was it?, postcard, Me) need a visible close
    control. Go has one now; the others rely on swipe-down or Back.
  - Long-pressing a card for "less like this" gives no visible response.
    Add a short "Got it, fewer like this" toast.
- **Done when:** F is happy to hand the phone to a friend.

### 1.5 Deploy the match page · F (with C)
- Merge `match/` so `allez.city/match/` is live. Then send one real deck to
  one real person and get the reply back.
- **Done when:** one weekend has been planned for two through a real link.

### 1.6 Chinatown Night Market wrong suggestion · C
- Already flagged as a separate task: records whose dates exist only as a
  sentence are planned on the wrong days. Fix the record and add a CI check.
- **Done when:** the record isn't planned after 9 October, and CI fails on
  any similar record.

---

## Phase 2: ready for testers (by 20 October)

Fifteen people: five locals, five new arrivals, five workationers (APP.md,
*The test*).

### 2.1 Android test build · C + F
- Create an Expo (EAS) account (F) and set up the build profiles (C).
  Produce an APK for internal distribution that installs from a link, with no
  Play account.
- Turn on the `allez://` link scheme so match replies open the app directly.
- **Done when:** a tester with an Android phone installs it from a link and
  opens a match reply with one tap.

### 2.2 iPhone testers · F
- Decision, not a build task: either enrol in the Apple Developer Program
  (US$99) for TestFlight, or run the test with Expo Go on iPhones (paste the
  match reply in by hand). LAUNCH.md defers enrolment until the loop works, so
  Expo Go is the default.
- **Done when:** decided and written in LAUNCH-SETUP.md.

### 2.3 A one-tap test report · C
- At the end of the test, each person sends us what the app counted on their
  phone. Nothing leaves the phone without that tap.
- A "Send my test notes" row at the bottom of What Allez knows about you
  produces a plain-text summary through the share sheet. It contains:
  - the two answers;
  - opens per day;
  - Today stacks finished;
  - weekend plans viewed, swaps made, decks sent and matched;
  - outings, verdicts, "didn't go", and "would you have gone anyway?";
  - postcards made and shared.
- It never includes places' names unless the person chooses to.
- **Done when:** F receives one by WhatsApp from their own phone.

### 2.4 Count what the test needs · C
- Record locally whatever 2.3 reports but nothing counts yet: opens per day,
  Today stack finished (reached the last card), weekend opened, swap tapped,
  deck sent, postcard shared.
- **Done when:** every number in 2.3 is real, not zero.

### 2.5 Notification check on Android · C
- Confirm that the Thursday notification and How was it? actually arrive
  with the app closed, on an Android build (2.1) and in Expo Go on iPhone.
  Fix the channel, timing or permission prompt if they don't.
- **Done when:** both have been seen arriving on a locked phone.

### 2.6 Recruit · F
- Five of each kind. Workationers from coworking spaces and monthly-stay
  hosts; new arrivals from newcomer groups; locals from the LAUNCH.md beta
  pairs. At least three pairs, so matching gets used.
- A two-minute call before the test (what were your last three weeks like
  outside work?) and one after.
- **Done when:** 15 names, call slots booked.

### 2.7 The first weekly drop · F + C
- The editorial heartbeat (APP.md, *What the content has to add*). Each
  Thursday, add a handful of new things to the Bay Area data so testers see
  something new. The app already fetches it.
- **Done when:** a drop has been published and seen arriving in the app
  without an update.

---

## Phase 3: during the test (3 weeks)

### 3.1 Weekly review · F + C
- Every Monday: test reports so far, wrong suggestions, what people said.
  One change a week at most, so the test still means something.

### 3.2 Wrong suggestions, fixed in 24 hours · C
- Any place reported closed or wrong is fixed in the data within a day
  (LAUNCH.md promise). The app picks up the fix on its next data refresh.

### 3.3 Deck first, or plan first? · C (optional)
- If F wants to compare: half the testers see the weekend open as a deck
  (the original Tinder idea), half see the complete plan. A setting chosen at
  install, not shown to the person.
- **Done when:** decided yes or no before testers start. It can't be added
  halfway through.

---

## Phase 4: Your city, finished (after the loop is seen working)

The Strava-and-Instagram half that was held back.

### 4.1 The map that fills in · C
- A map of the Bay Area's 20 neighbourhoods and towns in *My city*.
  Neighbourhoods with an outing are filled in, the rest stay outlined, and
  the line reads "9 of 20".
- Needs a simple outline per neighbourhood. Check `neighborhoods.json` and
  the zone data in `bay-area/city.js`; draw the map as a stylised shape
  rather than a street map.
- **Done when:** an outing in a new neighbourhood fills it in, with a small
  moment ("New patch: the Outer Sunset").

### 4.2 Quests as progress · C
- `quests.json` (the Coffee Quest's ten cafés, and others) shown in *My city*
  as progress: "4 of 10". An outing to a quest place ticks it off on its own.
- Progress only, no points.
- **Done when:** a How was it? on a quest café advances the quest.

### 4.3 Recaps · C
- **Monthly:** on the first day of each month, a recap card in Today. Shows
  outings, new neighbourhoods, regulars, and a favourite postcard. It can be
  shared as one image.
- **End of stay:** for someone here until a date, on the last day. "Your 30
  days in the Bay Area: …".
- **Done when:** both can be produced and shared, tested with a fake past
  month.

### 4.4 "A year ago today" · C
- A card in Today when an outing happened on this date last year. It can only
  appear after a year of use, so it's built now and tested with fake data.

### 4.5 The arcs · C
- The app changes over time, depending on how long someone's here (APP.md,
  *Arcs*):
  - the workationer's week one, *before you go*, and the countdown everywhere;
  - the new arrival's chapters (your block → your city → your people → your
    rhythm).
- **Done when:** a workationer on day 1 and on their second-to-last weekend
  see different Today stacks.

---

## Phase 5: going native (needs the native decision and Apple enrolment)

### 5.1 How was it? buttons in the notification · C
- Loved it / fine / not for me / didn't go, answered from the notification
  without opening the app. Needs the notification-category setup in a
  development build.

### 5.2 The widget · C
- "Right now, near you" on the home screen, iOS and Android. A native
  extension added through an Expo config plugin.

### 5.3 The outing on the lock screen · C
- Go as an iOS Live Activity: where you're heading, when it closes, and how
  long to walk.

### 5.4 Calendar · C
- "Add to calendar" on the weekend plan and on Regulars.

### 5.5 Store builds · F + C
- TestFlight, then the App Store. For Play: the closed test (12 testers, 14
  days) can run alongside phase 3.
- Store listings in the house voice, with the pigeon.

---

## Phase 6: content the app asks for (runs alongside, mostly F)

In this order (APP.md, *What the content has to add*):

1. **End dates** on exhibitions, seasons and pop-ups. They make "only now"
   honest. *(with 1.6)*
2. **Solo-friendly and "people come on their own"** on Regulars and events.
3. **Kid-friendly and dog-friendly** checked by hand where the map data
   doesn't say.
4. **Laptop-friendly** cafés.
5. **Local knowledge cards:** library museum passes, free museum days,
   Sunday Streets, Clipper, tipping. These are a new kind of card in Today.
   C builds the card; F writes and checks the content.

---

## Later (after the test, decided from what it shows)

- **Friends.** See the maps and postcards of people you've planned with.
- **Group votes** for three or more people.
- **The Locals' Bench in the app.** Trusted locals send a postcard as a
  suggestion.
- **A typed "ask"** ("Saturday with my sister, she likes art"). Needs a
  server and a model.
- **Other cities.** Paris first (LAUNCH.md), with the beret pigeon.
- **The mascot's name.** F to choose. It's needed before the store listing.

---

## Decisions waiting on the founder

| # | Decision | Needed by |
|---|---|---|
| 1 | Deck first or plan first for the weekend, or test both (3.3) | Before testers start |
| 2 | iPhone testers: Expo Go or TestFlight (2.2) | 20 October |
| 3 | The pigeon's name | Before any store listing |
| 4 | Native in January (LAUNCH.md, *Native in January?*), now with a working build to judge from | As soon as 1.1 is done |
