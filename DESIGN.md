# Allez — design

How Allez looks, in one place: the logo, the colours, the type, and the rules
that keep the website and the app looking like one thing. APP.md covers
how the app behaves and talks; this file covers how everything looks.

> **Locked 13 October 2026.** Everything in this file is decided. Change it
> only by a new, dated decision in the log at the end, never by drifting in
> code. `design/tokens.json` holds the same values in machine form, and the
> two must agree.

---

## The logo

### The mark

A **charcoal circle `#2C3E50`** with a **white pigeon** cut out of it and an
**orange dome cap `#E67E22`** sitting flush on the curve of its head.

- **No eye, no outline.** The pigeon is a silhouette: a teardrop body and a
  sharp, tiny beak. An eye turns it into clip art.
- **The cap is a dome:** a half-circle with a flat base, slightly wider than
  the head. It is never a pill, a bar, or rounded underneath.
- **The bird is cut out of the circle.** It never sits in a box or on a
  background of its own.
- **On dark backgrounds the circle is slate `#7E93AF`,** because charcoal
  disappears there. The bird and the cap don't change.

**Master file:** `design/logo/mark.svg`. Its favicon version switches the
circle to slate by itself when the browser is dark.

### The signature

`allez` is written as **one pen stroke**, a signature rather than a font.

- **Colour:** charcoal `#2C3E50`, the same as the circle. On dark
  backgrounds it's `#C9D3DF`.
- **Stroke:** round and even, 4.8 units on a 60-unit-high drawing, the same
  smooth weight as the bird's curves. It's never calligraphic and never
  thick-and-thin.
- **Slant:** every letter leans forward 8°. The lean is built into the
  drawing, never applied with a transform.
- **Proportions:** the `ll` are 1.7 times the x-height. Every join between
  letters is the same short curve along the baseline.
- **Shapes:** the `a` is a round bowl with a straight stem, the `ll` are
  matching narrow loops, and the `e` has one open loop. The pen lifts before
  the `z`, which is wide and plain (flat top, clean diagonal, flat bottom) so
  it reads as a `z`.
- **The one quirk:** the `z`'s bottom stroke flicks up at the end. That's
  the "let's go" in *allez*. Don't add others.
- **Files:** `design/logo/wordmark.svg` (light), `wordmark-dark.svg`, and
  `wordmark-small.svg` for anything under 24px tall (plain `l`s with no
  loops, and a heavier line).

**Motion:** on the website the signature writes itself on load in 1.6s,
like a route being traced, and ends on the `z`'s flick (0.2s delay,
`cubic-bezier(.55, 0, .3, 1)`). It plays once per page load, never loops,
and is off for anyone with reduced motion turned on.

### The lockup

The mark, then the signature, side by side and vertically centred. The
signature is about 80% of the mark's height.

| Rule | |
|---|---|
| Clear space | the height of the `a`, on every side |
| Smallest size | mark 16px · lockup 120px wide |
| One colour | charcoal on paper, or white on charcoal. The cap stays orange unless the print is truly one ink |
| Never | a pill cap · an eye · stretching · rotating · re-colouring the circle (other than slate on dark) · a rule or line under the lockup · setting `allez` in a font |

### The logo and the mascot

The mark is the pigeon reduced to a silhouette. The 3D beanie pigeon in
`allez-mascot/` is the mascot, **Coo**, and the two have different jobs:

- **The mark** goes in the header, the app icon, the favicon, the splash
  screen, and anything printed.
- **The mascot** is punctuation inside the product: first open, *Go*, the
  end of Today, errors, celebrations. See *The pigeon: Coo* in APP.md. It never
  sits on a content card, and it never replaces the mark.

---

## Colour

### Brand

| Token | Hex | Used for |
|---|---|---|
| `charcoal` | `#2C3E50` | the circle and the signature. **The primary brand colour** |
| `slate` | `#7E93AF` | the circle on dark backgrounds. Charcoal's lighter partner |
| `cap` | `#E67E22` | the beanie only. Never a fill for large areas, never a button |
| `white` | `#FFFFFF` | the bird |

### Product

The places supply the colour. The frame stays quiet: warm paper, ink, one
accent for actions, and terracotta for city names.

| Token | App light | App dark | Website light | Website dark |
|---|---|---|---|---|
| `bg` | `#FBF8F3` | `#191715` | `#FDFAF5` | `#17120F` |
| `card` | `#FFFFFF` | `#24211E` | `#FFFDFA` | `#201A15` |
| `sunk` / `bg-2` | `#F2EDE5` | `#2C2925` | `#F7F1E8` | `#1D1713` |
| `ink` | `#1F1D1A` | `#F4EFE8` | `#241C18` | `#F4ECE1` |
| `muted` / `soft` | `#8A8580` | `#A59E95` | `#6B5C53` | `#B3A596` |
| `line` | `#E8E2D8` | `#36322D` | `#ECE2D5` | `#322820` |
| `accent` | `#4E6A8E` | `#9FB2CC` | `#4E6A8E` | `#9FB2CC` |
| `onAccent` | `#FFFFFF` | `#191715` | — | — |
| `city` | — | — | `#B4532A` | `#E08A5F` |

- **Actions (buttons, active tabs) are deep slate `#4E6A8E`,** one per
  screen. It's in the logo's colour family but lighter than charcoal, so a
  button never looks like body text. White on it is 5.5 : 1. In dark mode it's
  `#9FB2CC` with dark text.
- **City names are terracotta,** a darker step of the cap's orange (5 : 1 on
  paper), for the italic city name in headings only.
- **Dark mode is warm charcoal, never pure black.**

### Contrast

- Slate `#7E93AF` on white is 3.1 : 1: fine for the mark, never for text.
- White on the cap orange is 2.9 : 1, which is why orange is never a button.

---

## Type

| Role | Face | Notes |
|---|---|---|
| Wordmark | the drawn signature | never typed in a font |
| App interface | Nunito | three sizes (14 / 17 / 26) and two weights. Hierarchy comes from size and space |
| Website headings | Iowan Old Style / Palatino | the site's warmth. City names in italic terracotta |
| Website body | the system sans | close to Inter, and costs nothing to load |

**The serif never sits in the lockup or beside the mark.** On the site, the
lockup sits above the date line, with clear space before the serif headline.

---

## Shape and space

- **Corners are rounded,** because the mark is made of circles. The app
  uses a 22px radius and the website 12px.
- **The base unit is 16px.**
- **Hairlines divide, edges invite.** `line` separates things. `edge` (a
  darker line) outlines things you can press.
- **One action per screen gets the accent.** Everything else is ink on paper.

---

## Where each asset goes

| Surface | Use | File |
|---|---|---|
| Website header | the lockup, inline SVG, signature drawn on load | `index.html` and each city's `index.html` |
| Favicon, home-screen icon | the mark | `design/logo/mark.svg` |
| iPhone icon | the bird full bleed on charcoal. iOS rounds the corners | `app/assets/icon.png` |
| Android icon | the bird in the safe zone on charcoal, plus a white monochrome version | `app/assets/android-icon-*.png` |
| Splash, light | the mark with the charcoal signature below, on `bg` | `app/assets/splash-icon.png` |
| Splash, dark | slate circle, light signature, on dark `bg` | `app/assets/splash-icon-dark.png` |
| Social and print | the lockup on paper, or white on charcoal | `design/logo/` |
| Empty states, celebrations | the mascot, not the mark | `allez-mascot/` |

---

## Decision log

All 13 October 2026.

1. **The logo is V1 "Ultra Minimal":** a pigeon silhouette in a circle,
   with a dome cap. The pill-bar version is retired.
2. **The wordmark is a drawn signature, not a font.** We tried Nunito,
   Sora, script fonts (Pacifico, Damion, Niconne and others), italic
   serifs (Fraunces, Playfair), Airbnb- and Spotify-style sans, and a
   GPS-route lettering. Fonts read as generic or lost elegance. The
   signature is personal and sits with the bird. The explorations are in
   `design/explore/`.
3. **The signature was cleaned up:** no lead-in stroke, one 8° slant, `ll`
   at 1.7 times the x-height, even joins, and a pen lift so the `z` reads.
4. **The brand colour is charcoal `#2C3E50`,** for the circle and the
   signature. It replaced slate `#7E93AF` for contrast and confidence.
   Slate stays as the dark-mode circle.
5. **Buttons and tabs stay deep slate `#4E6A8E`,** not charcoal, so actions
   stand out from text. Orange is never a button.
6. **One orange, `#E67E22`.** `#F28C28` and `#F59A3E` are retired.
7. **City names are terracotta** `#B4532A` (`#E08A5F` on dark). The wine
   accent is retired. The walk maps' route lines keep their own colours,
   because they're illustrations.
8. **The website keeps its serif headings,** but never beside the mark.
9. **No Inter for now:** the app stays Nunito, and the website uses the
   system sans.
10. **The signature animates on the website only.** A native splash screen
    can't animate. An animated first screen in the app would be a separate
    piece of work.

`design/tokens.json` is the source of truth for these values. Generate
`app/src/lib/theme.js` and the `:root` block in `css/style.css` from it,
instead of keeping them in step by hand.

14. **13 October 2026 — the mascot is called Coo.** Named after the sound
    a pigeon makes: warm, three letters, and it works in every city.
    The French touch stays in occasional lines, not the name. Coo is
    curious, warm, observant and a little mischievous, and speaks only in
    its own moments. It never vouches for a place or sends notifications.
    Other names considered: Bubbly, Bulle, Cheri, Coco, Gigi, Lou.
