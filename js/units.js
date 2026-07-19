/* ============================================================================
 * units.js is the dimensional math engine
 *
 * Everything is stored internally in a single base unit per dimension:
 *   length  -> inches
 *   area    -> square inches
 *   volume  -> cubic inches
 *   angle   -> degrees
 *   scalar  -> plain number (no unit)
 *
 * A Value carries { dim, base } so arithmetic can promote/demote dimensions the
 * way Construction Master does (length * length = area, area / length = length,
 * length / length = scalar, etc.).
 * ==========================================================================*/

'use strict';

/* ----- exact conversion constants ----- */
const IN_PER_FT = 12;
const IN_PER_YD = 36;
const CM_PER_IN = 2.54;          // exact
const IN_PER_M  = 100 / CM_PER_IN;   // 39.37007874015748
const IN_PER_CM = 1 / CM_PER_IN;
const IN_PER_MM = 1 / (CM_PER_IN * 10);

const DIM = { LENGTH: 'length', AREA: 'area', VOLUME: 'volume', ANGLE: 'angle', SCALAR: 'scalar' };

function V(dim, base) { return { dim, base }; }
const Scalar = (n) => V(DIM.SCALAR, n);
const Length = (inches) => V(DIM.LENGTH, inches);
const Area = (sqin) => V(DIM.AREA, sqin);
const Volume = (cuin) => V(DIM.VOLUME, cuin);
const Angle = (deg) => V(DIM.ANGLE, deg);

/* ----- helpers ----- */
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }

function round(n, p) { const f = Math.pow(10, p); return Math.round(n * f) / f; }

/* Find the exact fraction for a value in [0,1) with denominator up to maxDen,
 * or null if the value isn't a clean fraction (e.g. an irrational result). */
function exactFraction(x, maxDen) {
  if (x < 1e-9) return { num: 0, den: 1 };
  for (let den = 1; den <= maxDen; den++) {
    const n = x * den;
    if (Math.abs(n - Math.round(n)) < 1e-6) {
      const num = Math.round(n), g = gcd(num, den);
      return { num: num / g, den: den / g };
    }
  }
  return null;
}

/* Format an inch count as feet-inch-fraction, e.g. 5' 3-1/2"
 * denom = fraction precision (2,4,8,16,32,64). Clean fractions (e.g. 1/12) are
 * shown exactly as typed; only messy/irrational values round to `denom`. */
function formatFIF(inches, denom) {
  denom = denom || 16;
  const neg = inches < -1e-9;
  let total = Math.abs(inches);

  let ft = Math.floor(total / 12 + 1e-9);
  let remIn = total - ft * 12;
  let whole = Math.floor(remIn + 1e-9);
  let frac = remIn - whole;

  let num, den;
  const ex = exactFraction(frac, Math.max(denom, 64));
  if (ex) { num = ex.num; den = ex.den; }               // clean fraction, shown exactly
  else { num = Math.round(frac * denom); den = denom; }  // messy value, round to accuracy

  if (num >= den) { whole += 1; num = 0; den = 1; }
  if (whole >= 12) { ft += Math.floor(whole / 12); whole = whole % 12; }

  // reduce
  if (num > 0) { const g = gcd(num, den); num /= g; den /= g; }

  let s = '';
  if (ft > 0) s += ft + "'";
  const hasInchPart = whole > 0 || num > 0 || ft === 0;
  if (hasInchPart) {
    if (s) s += ' ';
    let inStr = '';
    if (num > 0) {
      inStr = (whole > 0 ? whole + '-' : '') + num + '/' + den;
    } else {
      inStr = String(whole);
    }
    s += inStr + '"';
  }
  return (neg ? '-' : '') + s;
}

/* Format inches as plain inch-fraction (no feet), e.g. 63-1/2" */
function formatInchFrac(inches, denom) {
  denom = denom || 16;
  const neg = inches < -1e-9;
  let total = Math.abs(inches);
  let whole = Math.floor(total + 1e-9);
  let num, den;
  const ex = exactFraction(total - whole, Math.max(denom, 64));
  if (ex) { num = ex.num; den = ex.den; } else { num = Math.round((total - whole) * denom); den = denom; }
  if (num >= den) { whole += 1; num = 0; den = 1; }
  if (num > 0) { const g = gcd(num, den); num /= g; den /= g; }
  let s = num > 0 ? (whole > 0 ? whole + '-' : '') + num + '/' + den : String(whole);
  return (neg ? '-' : '') + s + '"';
}

/* Convert a length (inches) to the various display formats */
const Convert = {
  toFeetDecimal: (inches) => inches / IN_PER_FT,
  toInchesDecimal: (inches) => inches,
  toYards: (inches) => inches / IN_PER_YD,
  toMeters: (inches) => inches * (1 / IN_PER_M),
  toCm: (inches) => inches * CM_PER_IN,
  toMm: (inches) => inches * CM_PER_IN * 10,

  feetToIn: (ft) => ft * IN_PER_FT,
  yardsToIn: (yd) => yd * IN_PER_YD,
  metersToIn: (m) => m * IN_PER_M,
  cmToIn: (cm) => cm * IN_PER_CM,
  mmToIn: (mm) => mm * IN_PER_MM,
};

/* Format a metric length nicely (choose m / cm / mm by magnitude) */
function formatMetric(inches) {
  const mm = inches * CM_PER_IN * 10;
  if (Math.abs(mm) >= 1000) return round(mm / 1000, 4) + ' m';
  if (Math.abs(mm) >= 10) return round(mm / 10, 3) + ' cm';
  return round(mm, 2) + ' mm';
}

/* Angle as decimal degrees */
function formatDeg(deg) { return round(deg, 4) + '°'; }

/* Angle as Degrees:Minutes:Seconds */
function formatDMS(deg) {
  const neg = deg < 0;
  let d = Math.abs(deg);
  let dd = Math.floor(d);
  let mfloat = (d - dd) * 60;
  let mm = Math.floor(mfloat);
  let ss = round((mfloat - mm) * 60, 1);
  if (ss >= 60) { ss -= 60; mm += 1; }
  if (mm >= 60) { mm -= 60; dd += 1; }
  return (neg ? '-' : '') + dd + '° ' + mm + "' " + ss + '"';
}
function dmsToDeg(d, m, s) { return (d < 0 ? -1 : 1) * (Math.abs(d) + (m || 0) / 60 + (s || 0) / 3600); }

/* Dimensioned arithmetic. Returns a Value or throws on invalid combos. */
function combine(a, op, b) {
  if (op === '+' || op === '-') {
    if (a.dim !== b.dim) {
      // allow scalar with scalar only; mismatched dims are an error
      throw new Error('Cannot ' + (op === '+' ? 'add' : 'subtract') + ' ' + a.dim + ' and ' + b.dim);
    }
    return V(a.dim, op === '+' ? a.base + b.base : a.base - b.base);
  }

  if (op === '*') {
    // scalar scaling
    if (a.dim === DIM.SCALAR) return V(b.dim, a.base * b.base);
    if (b.dim === DIM.SCALAR) return V(a.dim, a.base * b.base);
    if (a.dim === DIM.LENGTH && b.dim === DIM.LENGTH) return Area(a.base * b.base);
    if (a.dim === DIM.LENGTH && b.dim === DIM.AREA) return Volume(a.base * b.base);
    if (a.dim === DIM.AREA && b.dim === DIM.LENGTH) return Volume(a.base * b.base);
    if (a.dim === DIM.ANGLE || b.dim === DIM.ANGLE) throw new Error('Cannot multiply angles');
    throw new Error('Cannot multiply ' + a.dim + ' by ' + b.dim);
  }

  if (op === '/') {
    if (Math.abs(b.base) < 1e-12) throw new Error('Divide by zero');
    if (b.dim === DIM.SCALAR) return V(a.dim, a.base / b.base);
    if (a.dim === b.dim) return Scalar(a.base / b.base);
    if (a.dim === DIM.AREA && b.dim === DIM.LENGTH) return Length(a.base / b.base);
    if (a.dim === DIM.VOLUME && b.dim === DIM.AREA) return Length(a.base / b.base);
    if (a.dim === DIM.VOLUME && b.dim === DIM.LENGTH) return Area(a.base / b.base);
    throw new Error('Cannot divide ' + a.dim + ' by ' + b.dim);
  }
  throw new Error('Unknown op ' + op);
}

/* Produce the primary + secondary display strings for a Value */
function displayValue(val, prefs) {
  prefs = prefs || {};
  const denom = prefs.denom || 16;
  if (!val) return { main: '0', sub: '' };

  switch (val.dim) {
    case DIM.LENGTH: {
      const main = formatFIF(val.base, denom);
      const sub = round(Convert.toFeetDecimal(val.base), 4) + ' ft  ·  ' +
                  round(val.base, 3) + ' in  ·  ' + formatMetric(val.base);
      return { main: main || '0"', sub };
    }
    case DIM.AREA: {
      const sqft = val.base / (IN_PER_FT * IN_PER_FT);
      const sqyd = val.base / (IN_PER_YD * IN_PER_YD);
      const sqm = val.base * (1 / IN_PER_M) * (1 / IN_PER_M);
      return {
        main: round(sqft, 4) + ' ft²',
        sub: round(sqyd, 4) + ' yd²  ·  ' + round(sqm, 4) + ' m²  ·  ' + round(val.base, 2) + ' in²'
      };
    }
    case DIM.VOLUME: {
      const cuft = val.base / (IN_PER_FT ** 3);
      const cuyd = val.base / (IN_PER_YD ** 3);
      const cum = val.base * (1 / IN_PER_M) ** 3;
      return {
        main: round(cuft, 4) + ' ft³',
        sub: round(cuyd, 4) + ' yd³  ·  ' + round(cum, 4) + ' m³  ·  ' + round(cuft * 7.48052, 3) + ' gal'
      };
    }
    case DIM.ANGLE:
      return { main: formatDeg(val.base), sub: formatDMS(val.base) };
    case DIM.SCALAR:
    default: {
      const n = val.base;
      const main = Number.isInteger(n) ? String(n) : String(round(n, 6));
      return { main, sub: '' };
    }
  }
}

/* Expose on window for the non-module scripts that follow */
window.Units = {
  DIM, V, Scalar, Length, Area, Volume, Angle,
  IN_PER_FT, IN_PER_YD, IN_PER_M, CM_PER_IN,
  Convert, combine, displayValue,
  formatFIF, formatInchFrac, formatMetric, formatDeg, formatDMS, dmsToDeg,
  round, gcd,
};
