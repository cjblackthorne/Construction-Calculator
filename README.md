# ConCalc — Construction Calculator (PWA)

A web-based construction calculator inspired by Construction Master Pro. It does
real **feet-inch-fraction** math and includes a full set of framing, area/volume,
material, and trig solvers. It's a **Progressive Web App**, so you can add it to
your phone's home screen and use it full-screen and **offline** — no app store.

## Install on your phone

1. Open the site in your phone's browser.
2. **iPhone (Safari):** tap **Share → Add to Home Screen**.
   **Android (Chrome):** tap **⋮ → Install app** (or use the in-app Install banner).
3. Launch it from the new icon — it runs full-screen and works with no signal.

### Hosting it (GitHub Pages)
This is a static site — no build step. In the repo settings enable
**Pages → Deploy from branch → `main` / root**. Your app will be live at
`https://<user>.github.io/<repo>/`.

## Features

**Dimensional math & conversions**
- Feet-Inch-Fraction, Inch-Fraction, Yards
- Decimal Feet / Decimal Inches, selectable preset fractions (1/2" – 1/64")
- Full metric (m, cm, mm) and Degree / D:M:S display
- Dimensioned arithmetic: length × length → area, area × length → volume, etc.
- Paperless tape, 4 memories, backspace, `CONV` to cycle result units

**Framing & layout**
- Right-angle solver (rise / run / diagonal / pitch — enter any two)
- Rafters: common, hip/valley, jacks, plumb / level / cheek cut angles
- Stairs: risers, treads, stringer, angle, stairwell opening & headroom
- Studs on-center, equal-sided polygon, compound miter / crown

**Area & volume**
- Rectangle area & box volume, circle, column / cone

**Materials**
- Roofing (squares, bundles, sheathing), drywall / siding sheets
- Concrete block, board feet, cost per unit, weight per volume

**Special**
- Trigonometry (sin/cos/tan + inverses)

## How to enter dimensions

On the keypad, type a number then tap a unit key. Example — **5 ft 3-1/2 in**:
`5` `Feet` `3` `Inch` `1` `/` `2`. In the tool input fields you can also type
naturally, e.g. `12' 6"`, `12.5 ft`, `150 in`, or `2 m`.

## Project layout

```
index.html        app shell + calculator UI
css/styles.css    styles (dark, mobile-first)
js/units.js       dimensional-math engine (base unit = inches)
js/calc.js        entry parser + calculator state machine
js/solvers.js     rafter/stair/area/roofing/trig math
js/app.js         UI wiring, tool screens, PWA glue
manifest.json     PWA manifest
sw.js             service worker (offline cache)
icons/            app icons
```

No dependencies, no build. Open `index.html` (via any static server) and it runs.
