/* ============================================================================
 * solvers.js holds the construction math functions
 * Lengths are in INCHES, angles in DEGREES unless noted. Pure functions.
 * ==========================================================================*/
'use strict';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const deg = (r) => r * R2D;
const rad = (d) => d * D2R;
const hypot = Math.hypot;

const Solvers = {
  /* ---- pitch helpers (pitch expressed as rise per 12" of run) ---- */
  pitchToAngle: (risePer12) => deg(Math.atan2(risePer12, 12)),
  angleToPitch: (angleDeg) => Math.tan(rad(angleDeg)) * 12,
  pitchToGrade: (risePer12) => (risePer12 / 12) * 100, // percent slope

  /* ---- Right triangle: give any two of rise/run/diag/angle, get the rest ----
   * angle = angle at the base between run and diagonal (the pitch angle). */
  rightTriangle(inp) {
    let { rise, run, diag, angle } = inp; // angle in degrees
    const has = (x) => x !== undefined && x !== null && x !== '' && !isNaN(x);
    if (has(rise) && has(run)) { diag = hypot(rise, run); angle = deg(Math.atan2(rise, run)); }
    else if (has(rise) && has(diag)) { run = Math.sqrt(Math.max(0, diag * diag - rise * rise)); angle = deg(Math.asin(rise / diag)); }
    else if (has(run) && has(diag)) { rise = Math.sqrt(Math.max(0, diag * diag - run * run)); angle = deg(Math.acos(run / diag)); }
    else if (has(rise) && has(angle)) { run = rise / Math.tan(rad(angle)); diag = rise / Math.sin(rad(angle)); }
    else if (has(run) && has(angle)) { rise = run * Math.tan(rad(angle)); diag = run / Math.cos(rad(angle)); }
    else if (has(diag) && has(angle)) { rise = diag * Math.sin(rad(angle)); run = diag * Math.cos(rad(angle)); }
    else return null;
    return {
      rise, run, diag, angle,
      pitch: (run ? (rise / run) * 12 : 0),
      grade: (run ? (rise / run) * 100 : 0),
    };
  },

  /* ---- Full rafter package for equal-pitch roof ----
   * run = horizontal building half-span to ridge (inches)
   * pitchRise = rise per 12 run
   * irregRise = optional pitch of the *other* (irregular) side for hip/valley */
  rafters(run, pitchRise, opts) {
    opts = opts || {};
    const rise = run * (pitchRise / 12);
    const common = hypot(run, rise);
    const plumb = deg(Math.atan2(rise, run));      // plumb cut (common)
    const level = 90 - plumb;                        // seat/level cut

    // Hip/valley (regular = both sides same pitch): hip run in plan = run * sqrt(2)
    const hipRun = run * Math.SQRT2;
    const hipLen = hypot(hipRun, rise);
    const hipPitch = (rise / hipRun) * 12;           // hip rise per 12 of hip run
    const hipPlumb = deg(Math.atan2(rise, hipRun));
    const hipLevel = 90 - hipPlumb;
    // Hip cheek (side) cut, the 45° in plan projected
    const hipCheek = deg(Math.atan(Math.cos(rad(hipPlumb)) )) ; // placeholder refined below
    const cheek = deg(Math.atan2(run, hipRun));      // ~45 for regular
    const hipBevel = deg(Math.atan(Math.cos(rad(plumb))));      // saw bevel for hip cheek

    return {
      rise, run, common, pitch: pitchRise,
      angleDeg: plumb,
      plumbCut: plumb, levelCut: level,
      hipRun, hipValley: hipLen, hipPitch, hipPlumbCut: hipPlumb, hipLevelCut: hipLevel,
      cheekCut: cheek, hipBevel,
    };
  },

  /* Jack rafters spaced on-center along a hip/valley. Returns array of lengths. */
  jackRafters(run, pitchRise, spacing, onCenter) {
    onCenter = onCenter || spacing;
    const commonPerRun = hypot(12, pitchRise) / 12;   // rafter length per inch of run
    const jacks = [];
    // Each jack is shorter than the last by the "common difference"
    const diff = onCenter * commonPerRun;
    let n = Math.floor(run / onCenter);
    const first = hypot(run, run * (pitchRise / 12)); // longest = common length
    for (let i = 1; i <= n; i++) {
      const len = first - diff * i;
      if (len > 0) jacks.push(len);
    }
    return { commonDifference: diff, lengths: jacks };
  },

  /* ---- Stairs ---- */
  stairs(totalRise, opts) {
    opts = opts || {};
    const targetRiser = opts.targetRiser || 7;      // inches, comfortable
    const treadDepth = opts.treadDepth || 10;       // inches (run per tread)
    const maxRiser = opts.maxRiser || 7.75;         // code typical
    let numRisers = Math.max(1, Math.round(totalRise / targetRiser));
    if (totalRise / numRisers > maxRiser) numRisers = Math.ceil(totalRise / maxRiser);
    const riserHeight = totalRise / numRisers;
    const numTreads = numRisers - 1;
    const totalRun = treadDepth * numTreads;
    const stringer = hypot(totalRun, totalRise);
    const angle = deg(Math.atan2(totalRise, totalRun));

    // Advanced: stairwell opening for a given headroom & floor thickness
    let stairwell = null;
    if (opts.headroom && opts.floorThickness !== undefined) {
      // horizontal run needed until clearance (headroom + floorThickness) is gained
      const needRise = opts.headroom + opts.floorThickness;
      const risersToClear = Math.ceil(needRise / riserHeight);
      stairwell = {
        risersToClear,
        opening: risersToClear * treadDepth,        // stairwell rough opening length
      };
    }
    return { numRisers, riserHeight, numTreads, treadDepth, totalRun, totalRise, stringer, angle, stairwell };
  },

  /* ---- Area & Volume ---- */
  rectArea: (l, w) => l * w,                        // sq in
  boxVolume: (l, w, h) => l * w * h,                // cu in
  circleArea: (d) => Math.PI * (d / 2) * (d / 2),
  circleCircumference: (d) => Math.PI * d,
  circleArc: (d, angleDeg) => Math.PI * d * (angleDeg / 360),
  columnVolume: (d, h) => Math.PI * (d / 2) * (d / 2) * h,
  coneVolume: (d, h) => (1 / 3) * Math.PI * (d / 2) * (d / 2) * h,
  coneLateralArea: (d, h) => Math.PI * (d / 2) * hypot(d / 2, h),
  sphereVolume: (d) => (4 / 3) * Math.PI * (d / 2) ** 3,
  sphereArea: (d) => Math.PI * d * d,

  /* ---- Roofing ---- (areas in sq ft) */
  roof(planAreaSqFt, pitchRise) {
    const slopeFactor = hypot(12, pitchRise) / 12;   // multiply plan area to get surface
    const actual = planAreaSqFt * slopeFactor;
    const squares = actual / 100;
    return {
      slopeFactor,
      actualArea: actual,
      squares,
      bundles: Math.ceil(squares * 3),               // 3 bundles/square (typical 3-tab)
      sheets4x8: Math.ceil(actual / 32),             // sheathing
    };
  },

  /* ---- Sheet goods (drywall/siding/paneling). area & sheet dims in same unit ---- */
  sheets(areaSqFt, sheetWft, sheetHft, wastePct) {
    const per = sheetWft * sheetHft;
    const base = areaSqFt / per;
    const withWaste = base * (1 + (wastePct || 0) / 100);
    return { perSheet: per, exact: base, count: Math.ceil(withWaste) };
  },

  /* ---- Studs on center ---- length & spacing in inches ---- */
  studs(wallLenIn, spacingIn, extraForCorners) {
    const n = Math.floor(wallLenIn / spacingIn) + 1;
    return n + (extraForCorners || 0);
  },

  /* ---- Concrete block wall ---- (16"x8" nominal face = 0.888 sqft) ---- */
  blocks(wallAreaSqFt, blockFaceSqFt) {
    const face = blockFaceSqFt || (16 * 8) / 144;    // 0.888
    return Math.ceil(wallAreaSqFt / face);
  },

  /* ---- Board feet ---- thickness & width in inches, length in feet ---- */
  boardFeet(thickIn, widthIn, lengthFt, qty) {
    return (thickIn * widthIn * lengthFt / 12) * (qty || 1);
  },

  /* ---- Cost per unit ---- */
  cost(qty, unitPrice) { return qty * unitPrice; },

  /* ---- Equal-sided polygon ---- n sides, side length s (inches) ---- */
  polygon(n, s) {
    const interior = (n - 2) * 180 / n;
    const exterior = 180 - interior;
    const apothem = s / (2 * Math.tan(Math.PI / n));
    const circumradius = s / (2 * Math.sin(Math.PI / n));
    const area = (n * s * apothem) / 2;
    const miter = 180 / n;                            // cut each end for a closed frame
    return { interior, exterior, apothem, circumradius, area, perimeter: n * s, miter };
  },

  /* ---- Compound miter (crown) ----
   * springAngle: crown spring angle in degrees (e.g. 52 for common 52/38 crown)
   * cornerAngle: angle between the two walls (interior corner, e.g. 90)
   * Verified: baseboard (spring 0, 90° corner) -> miter 45, bevel 0.  */
  compoundMiter(springAngle, cornerAngle) {
    const S = rad(springAngle), Chalf = rad(cornerAngle / 2);
    const miter = deg(Math.atan(Math.cos(S) * Math.tan(Math.PI / 2 - Chalf)));
    const bevel = deg(Math.asin(Math.sin(S) * Math.sin(Math.PI / 2 - Chalf)));
    return { miter, bevel };
  },

  /* ---- Crown angle: given the crown's back angles, derive spring angle ---- */
  crownSpring(wallAngleDeg /* between crown back and wall, e.g. 52 */) {
    return { spring: wallAngleDeg };
  },

  /* ---- Trig (degrees) ---- */
  sin: (d) => Math.sin(rad(d)),
  cos: (d) => Math.cos(rad(d)),
  tan: (d) => Math.tan(rad(d)),
  asin: (x) => deg(Math.asin(x)),
  acos: (x) => deg(Math.acos(x)),
  atan: (x) => deg(Math.atan(x)),

  /* ---- Weight per volume ---- volume cu ft, density lb/cuft ---- */
  weight: (cuft, density) => cuft * density,
};

window.Solvers = Solvers;
