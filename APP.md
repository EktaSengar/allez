# The app

Notes for the Allez app, written 23 September 2026 before any of it is built.
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
