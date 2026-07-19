# 16OC — Construction Calculator (PWA)

A free, web-based construction calculator inspired by Construction Master Pro. It
does real **feet-inch-fraction** math plus a full set of framing, area/volume,
material, and trig solvers. It's a **Progressive Web App** — add it to your phone's
home screen and it runs full-screen and **offline**, with no signup, no ads, and no
subscription. Named for **16" on-center**.

Live at **[16oc.pages.dev](https://16oc.pages.dev)**.

> **Install-only:** 16OC runs only as an installed app (standalone display mode).
> Opened in a normal browser tab it shows an install gate instead of the
> calculator, with per-platform instructions.

## Install on your phone

1. Open the site in your phone's browser.
2. **iPhone (Safari):** tap **Share → Add to Home Screen**.
   **Android (Chrome):** tap **⋮ → Install app** (or use the in-app Install banner).
3. Launch it from the new icon — full-screen, works with no signal.

## Built for the jobsite

- **Light, high-contrast UI** so it stays readable in daylight; optional **Sunlight
  mode** (bright yellow on black) for direct sun.
- **Large touch targets** and **haptic feedback** — a short buzz confirms each key
  so you can work by feel, even with gloves.
- **Haptic feedback** on every key — including an iOS-PWA workaround (a hidden
  `<input type="checkbox" switch>` toggled via a label click) since Apple blocks
  the Vibration API in PWAs.
- **Screen stays awake** while the app is open (Wake Lock), so it won't sleep
  between measurements.
- **Jobsite QR decal** — Settings → *Show jobsite QR decal* prints a scannable
  code your crew can grab from the trailer or a toolbox.
- **Fully offline** via a service worker — loads instantly in a basement or on a
  remote lot.

## Features

**Dimensional math & conversions**
- Feet-Inch-Fraction, Inch-Fraction, Yards
- Decimal Feet / Decimal Inches, selectable preset fractions (1/2" – 1/64")
- **Type fractions** with the `Frac` key (distinct from ÷): e.g. `11" 1/8` is
  `1 1 [Inch] 1 [Frac] 8`; plus full metric (m, cm, mm)
- **Voice input** — tap the mic and say "five foot three plus two feet equals"
- Degree / D:M:S display, `CONV` to cycle result units
- Dimensioned arithmetic: length × length → area, area × length → volume, etc.
- Paperless tape, 4 memories, backspace

**Framing & layout**
- Right-angle solver (rise / run / diagonal / pitch — enter any two)
- Rafters: common, hip/valley, jacks, plumb / level / cheek cut angles
- Stairs: risers, treads, stringer, angle, stairwell opening & headroom
- Studs on-center, equal-sided polygon, compound miter / crown

**Area & volume** — rectangle area & box volume, circle, column / cone

**Materials** — roofing (squares, bundles, sheathing), drywall / siding sheets,
concrete block, board feet, cost per unit, weight per volume

**Special** — trigonometry (sin/cos/tan + inverses)

## Entering dimensions

- **Calculator:** type a number, then tap a unit key. For **5 ft 3-3/8 in**:
  `5` `Feet` `3` `Inch` `Frac → 3/8`.
- **Tool screens:** each length has **separate feet / inch / fraction inputs** — no
  parsing, just fill in the boxes.

## Deploying (Cloudflare Pages)

This is a static site — no build step. In Cloudflare Pages, connect the repo and
set **Build command:** *(none)* and **Output directory:** `/` (root). Every push to
`main` deploys to `16oc.pages.dev`. (Any static host works — GitHub Pages, Netlify,
etc.)

## Project layout

```
index.html        app shell + calculator UI
css/styles.css    light / sunlight theme, mobile-first
js/units.js       dimensional-math engine (base unit = inches)
js/calc.js        entry parser + calculator state machine
js/solvers.js     rafter/stair/area/roofing/trig math
js/app.js         UI wiring, SVG icons, tool screens, PWA glue
manifest.json     PWA manifest
sw.js             service worker (offline cache)
icons/            speed-square app icons + SVG favicon
```

No dependencies, no build. Serve the folder with any static server and it runs.
