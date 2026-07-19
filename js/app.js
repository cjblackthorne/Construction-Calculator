/* ============================================================================
 * app.js — UI wiring, tool screens, PWA install, service worker
 * ==========================================================================*/
'use strict';

(function () {

const U = window.Units;
const S = window.Solvers;
const $ = (id) => document.getElementById(id);

/* ============================ monochrome SVG icons ============================ */
const ICN = {
  speedsquare: '<path d="M5 4 L5 19 L20 19 Z"/><path d="M3.3 4.4 L3.3 19"/><path d="M3.3 4.4 L5 4.4"/><circle cx="4.15" cy="6.6" r=".7" fill="currentColor"/><line x1="8" y1="19" x2="8" y2="16.6"/><line x1="11.3" y1="19" x2="11.3" y2="16.6"/><line x1="14.6" y1="19" x2="14.6" y2="16.6"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3.5" rx="1"/><circle cx="9" cy="13" r=".85" fill="currentColor"/><circle cx="12" cy="13" r=".85" fill="currentColor"/><circle cx="15" cy="13" r=".85" fill="currentColor"/><circle cx="9" cy="17" r=".85" fill="currentColor"/><circle cx="12" cy="17" r=".85" fill="currentColor"/><circle cx="15" cy="17" r=".85" fill="currentColor"/>',
  tools: '<path d="M4 20 L20 20 L4 6 Z"/><line x1="4" y1="12" x2="7.5" y2="12"/><line x1="4" y1="16" x2="6" y2="16"/>',
  tape: '<path d="M6 3 h12 v17 l-2 -1.3 -2 1.3 -2 -1.3 -2 1.3 -2 -1.3 -2 1.3 Z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/>',
  settings: '<line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2.1" fill="currentColor"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2.1" fill="currentColor"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="8" cy="17" r="2.1" fill="currentColor"/>',
  rightangle: '<path d="M5 4 L5 19 L20 19 Z"/><path d="M3.3 4.4 L3.3 19"/><circle cx="4.15" cy="6.6" r=".7" fill="currentColor"/><line x1="8" y1="19" x2="8" y2="16.6"/><line x1="11.3" y1="19" x2="11.3" y2="16.6"/><line x1="14.6" y1="19" x2="14.6" y2="16.6"/>',
  rafter: '<path d="M3 14 L12 6 L21 14"/><line x1="7.5" y1="10" x2="12" y2="14"/><line x1="16.5" y1="10" x2="12" y2="14"/>',
  stairs: '<path d="M3 20 h4 v-4 h4 v-4 h4 v-4 h4"/>',
  studs: '<line x1="5" y1="5" x2="19" y2="5"/><line x1="5" y1="19" x2="19" y2="19"/><line x1="7.5" y1="5" x2="7.5" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="16.5" y1="5" x2="16.5" y2="19"/>',
  polygon: '<polygon points="12,4 19,8 19,16 12,20 5,16 5,8"/>',
  miter: '<path d="M4 20 L20 20 L20 4"/><line x1="4" y1="20" x2="20" y2="4"/>',
  rect: '<rect x="4" y="7" width="16" height="11" rx="1"/><line x1="4" y1="18" x2="20" y2="7"/>',
  circle: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><line x1="12" y1="12" x2="20" y2="12"/>',
  column: '<ellipse cx="12" cy="6" rx="6" ry="2.4"/><path d="M6 6 V18"/><path d="M18 6 V18"/><path d="M6 18 a6 2.4 0 0 0 12 0"/>',
  roof: '<path d="M4 11 L12 4 L20 11"/><path d="M6 10 V20 H18 V10"/><rect x="10.5" y="14" width="3" height="6"/>',
  sheets: '<rect x="4" y="6" width="12" height="12" rx="1"/><rect x="8" y="9.5" width="12" height="12" rx="1"/>',
  blocks: '<rect x="4" y="6" width="16" height="12" rx="1"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="8" y1="12" x2="8" y2="18"/><line x1="16" y1="12" x2="16" y2="18"/>',
  boardfeet: '<rect x="3" y="9" width="18" height="6" rx="1"/><line x1="7.5" y1="9" x2="7.5" y2="15"/><line x1="13.5" y1="9" x2="13.5" y2="15"/>',
  cost: '<path d="M4 4 H12 L20 12 L12 20 L4 12 Z"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/>',
  trig: '<line x1="4" y1="12" x2="20" y2="12"/><line x1="5" y1="5" x2="5" y2="19"/><path d="M5 12 Q8 4 11 12 T17 12"/>',
  weight: '<path d="M6 9 h12 l1.4 10 h-14.8 Z"/><path d="M9 9 a3 3 0 0 1 6 0"/>',
};
function svg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">${ICN[name] || ''}</svg>`;
}
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = svg(el.dataset.icon); });

/* ---- preferences ---- */
const prefs = loadPrefs();
function loadPrefs() {
  let p = { denom: 16, lengthFmt: 0, theme: 'light', haptics: 'on' };
  try { Object.assign(p, JSON.parse(localStorage.getItem('concalc.prefs') || '{}')); } catch (e) {}
  return p;
}
function savePrefs() { try { localStorage.setItem('concalc.prefs', JSON.stringify(prefs)); } catch (e) {} }

function applyTheme() {
  document.body.classList.toggle('hc', prefs.theme === 'hc');
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', prefs.theme === 'hc' ? '#000000' : '#ffffff');
}
applyTheme();

/* short haptic confirmation on key press */
function buzz() { if (prefs.haptics === 'on' && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} } }

/* keep the screen awake while the app is open (jobsite convenience) */
let wakeLock = null;
async function requestWake() {
  try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requestWake(); });
requestWake();

const calc = new Calculator(prefs);
try {
  const t = JSON.parse(localStorage.getItem('concalc.tape') || '[]'); if (Array.isArray(t)) calc.tape = t;
} catch (e) {}

/* ============================ length formatting ============================ */
const LEN_FORMATS = ['fif', 'ft', 'in', 'yd', 'metric'];
function fmtLengthIn(inches, fmt) {
  fmt = fmt || 'fif';
  switch (fmt) {
    case 'ft': return U.round(inches / U.IN_PER_FT, 4) + ' ft';
    case 'in': return U.round(inches, 3) + ' in';
    case 'yd': return U.round(inches / U.IN_PER_YD, 4) + ' yd';
    case 'metric': return U.formatMetric(inches);
    case 'fif':
    default: return U.formatFIF(inches, prefs.denom) || '0"';
  }
}

/* ============================ calculator render ============================ */
function renderCalc() {
  $('entry').textContent = calc.prettyEntry() || ' ';

  const resEl = $('result'), subEl = $('subres'), badgeEl = $('badges');
  resEl.classList.remove('err');

  if (calc.error) {
    resEl.textContent = calc.error;
    resEl.classList.add('err');
    subEl.textContent = ' ';
  } else {
    const v = calc.displayed();
    if (!v) { resEl.textContent = '0'; subEl.textContent = ' '; }
    else if (v.dim === U.DIM.LENGTH) {
      resEl.textContent = fmtLengthIn(v.base, LEN_FORMATS[prefs.lengthFmt]);
      const d = U.displayValue(v, prefs);
      subEl.textContent = d.sub;
    } else {
      const d = U.displayValue(v, prefs);
      resEl.textContent = d.main;
      subEl.textContent = d.sub || ' ';
    }
  }

  // badges: pending op + memory
  const badges = [];
  if (calc.op) badges.push({ '+': '+', '-': '−', '*': '×', '/': '÷' }[calc.op]);
  calc.memories.forEach((m, i) => { if (m) badges.push('M' + (i + 1)); });
  badgeEl.innerHTML = badges.map((b) => `<span class="badge">${b}</span>`).join('');
}

/* keypad handling */
$('keypad').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  buzz();
  if (b.dataset.act === 'frac') { openFracSheet(); return; }
  if (b.dataset.d !== undefined) calc.inputDigit(b.dataset.d);
  else if (b.dataset.dot !== undefined) calc.inputDot();
  else if (b.dataset.unit !== undefined) calc.unit(b.dataset.unit);
  else if (b.dataset.op !== undefined) calc.operator(b.dataset.op);
  else if (b.dataset.eq !== undefined) { calc.equals(); persistTape(); renderTape(); }
  else if (b.dataset.mplus !== undefined) calc.memPlus(0);
  renderCalc();
});

document.querySelector('.keys.fn').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  buzz();
  const act = b.dataset.act;
  if (act === 'ac') calc.allClear();
  else if (act === 'back') calc.backspace();
  else if (act === 'conv') { prefs.lengthFmt = (prefs.lengthFmt + 1) % LEN_FORMATS.length; savePrefs(); }
  else if (act === 'mem') { openMemSheet(); return; }
  renderCalc();
});

/* physical keyboard support (desktop / bluetooth) */
window.addEventListener('keydown', (e) => {
  if ($('screen-calc').classList.contains('active') === false) return;
  const k = e.key;
  if (k >= '0' && k <= '9') calc.inputDigit(k);
  else if (k === '.') calc.inputDot();
  else if (k === '+' || k === '-' || k === '*' || k === '/') {
    if (k === '/' && e.shiftKey) calc.unit('/'); else calc.operator(k);
  }
  else if (k === 'Enter' || k === '=') { e.preventDefault(); calc.equals(); persistTape(); renderTape(); }
  else if (k === 'Backspace') calc.backspace();
  else if (k === 'Escape') calc.allClear();
  else if (k === "'") calc.unit("'");
  else if (k === '"') calc.unit('"');
  else return;
  renderCalc();
});

/* ============================ memory sheet ============================ */
function openMemSheet() {
  const wrap = $('memSlots'); wrap.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const m = calc.memories[i];
    const val = m ? U.displayValue(m, prefs).main : '—';
    const row = document.createElement('div');
    row.className = 'mem-slot';
    row.innerHTML = `<div class="mlabel">M${i + 1}</div><div class="mval">${val}</div>`;
    [['STO', 'sto'], ['RCL', 'rcl'], ['M+', 'plus'], ['C', 'clr']].forEach(([txt, a]) => {
      const btn = document.createElement('button'); btn.textContent = txt;
      btn.onclick = () => {
        if (a === 'sto') calc.memStore(i);
        else if (a === 'rcl') { calc.memRecall(i); closeMemSheet(); }
        else if (a === 'plus') calc.memPlus(i);
        else if (a === 'clr') calc.memClear(i);
        renderCalc(); openMemSheet();
      };
      row.appendChild(btn);
    });
    wrap.appendChild(row);
  }
  $('memSheet').classList.add('show');
}
function closeMemSheet() { $('memSheet').classList.remove('show'); }
$('memClose').onclick = closeMemSheet;
$('memSheet').addEventListener('click', (e) => { if (e.target.id === 'memSheet') closeMemSheet(); });

/* ============================ preset fractions ============================ */
/* reduced fractions k/denom for the current precision */
function fractionList(denom) {
  const out = [];
  for (let k = 1; k < denom; k++) {
    const g = U.gcd(k, denom);
    out.push({ num: k / g, den: denom / g, dec: k / denom });
  }
  return out;
}
function openFracSheet() {
  const grid = $('fracGrid'); grid.innerHTML = '';
  fractionList(prefs.denom).forEach((f) => {
    const btn = document.createElement('button');
    btn.textContent = f.num + '/' + f.den;
    btn.onclick = () => { buzz(); calc.insertFraction(f.num, f.den); renderCalc(); closeFracSheet(); };
    grid.appendChild(btn);
  });
  $('fracSheet').classList.add('show');
}
function closeFracSheet() { $('fracSheet').classList.remove('show'); }
$('fracClose').onclick = closeFracSheet;
$('fracSheet').addEventListener('click', (e) => { if (e.target.id === 'fracSheet') closeFracSheet(); });

/* ============================ tape ============================ */
function persistTape() { try { localStorage.setItem('concalc.tape', JSON.stringify(calc.tape.slice(0, 200))); } catch (e) {} }
function renderTape() {
  const list = $('tapeList');
  if (!calc.tape.length) { list.innerHTML = '<div class="results-empty">No calculations yet. Your running tape appears here after you press =.</div>'; return; }
  list.innerHTML = calc.tape.map((t) => `<div class="tape-item"><div class="tl">${t.line}</div><div class="tr">= ${t.result}</div></div>`).join('');
}
$('clearTape').onclick = () => { calc.clearTape(); persistTape(); renderTape(); };

/* ============================ tab navigation ============================ */
document.querySelector('nav.tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const tab = b.dataset.tab;
  document.querySelectorAll('nav.tabs button').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $('screen-' + tab).classList.add('active');
  if (tab === 'tape') renderTape();
  if (tab === 'tools') showToolsHome();
});

/* ============================ TOOLS ============================ */
/* Field types: len (parsed to inches), num, pitch (rise/12), angle (deg),
 * select {opts:[[value,label]]}. compute(v) returns [{label,value,big?}]. */
function L(inches) { return fmtLengthIn(inches, LEN_FORMATS[prefs.lengthFmt]); }
function A(sqin) { return U.displayValue(U.Area(sqin), prefs).main; }
function Vol(cuin) { return U.displayValue(U.Volume(cuin), prefs).main; }
function deg(d) { return U.round(d, 3) + '°'; }
function n0(x) { return String(Math.round(x)); }
function n2(x) { return String(U.round(x, 2)); }

const TOOLS = [
  { group: 'Framing & Layout' },
  {
    id: 'rightangle', ic: 'rightangle', name: 'Right Angle', desc: 'Solve rise, run, diagonal & pitch from any two.',
    fields: [
      { id: 'rise', type: 'len', label: 'Rise', hint: 'leave blank to solve' },
      { id: 'run', type: 'len', label: 'Run', hint: 'leave blank to solve' },
      { id: 'diag', type: 'len', label: 'Diagonal', hint: 'leave blank to solve' },
      { id: 'angle', type: 'angle', label: 'Angle (°)', hint: 'optional' },
    ],
    compute(v) {
      const r = S.rightTriangle({ rise: v.rise, run: v.run, diag: v.diag, angle: v.angle });
      if (!r) return [{ label: 'Enter any two values', value: '—' }];
      return [
        { label: 'Rise', value: L(r.rise), big: true },
        { label: 'Run', value: L(r.run), big: true },
        { label: 'Diagonal', value: L(r.diag), big: true },
        { label: 'Angle', value: deg(r.angle) },
        { label: 'Pitch', value: n2(r.pitch) + ' /12' },
        { label: 'Grade', value: n2(r.grade) + ' %' },
      ];
    },
  },
  {
    id: 'rafter', ic: 'rafter', name: 'Rafters', desc: 'Common, hip/valley & jack rafters, cut angles.',
    fields: [
      { id: 'run', type: 'len', label: 'Run (half-span to ridge)' },
      { id: 'pitch', type: 'pitch', label: 'Pitch (rise per 12)', hint: 'e.g. 6 for 6/12' },
      { id: 'oc', type: 'len', label: 'Jack spacing (on-center)', hint: 'e.g. 16"' },
    ],
    compute(v) {
      if (!v.run || v.pitch == null) return [{ label: 'Enter run and pitch', value: '—' }];
      const r = S.rafters(v.run, v.pitch);
      const rows = [
        { label: 'Common rafter', value: L(r.common), big: true },
        { label: 'Rise', value: L(r.rise) },
        { label: 'Plumb cut', value: deg(r.plumbCut) },
        { label: 'Level (seat) cut', value: deg(r.levelCut) },
        { label: 'Hip / Valley', value: L(r.hipValley), big: true },
        { label: 'Hip plumb cut', value: deg(r.hipPlumbCut) },
        { label: 'Hip cheek cut', value: deg(r.cheekCut) },
      ];
      if (v.oc) {
        const j = S.jackRafters(v.run, v.pitch, v.oc, v.oc);
        rows.push({ label: 'Jack common diff.', value: L(j.commonDifference) });
        j.lengths.slice(0, 8).forEach((len, i) => rows.push({ label: 'Jack #' + (i + 1), value: L(len) }));
      }
      return rows;
    },
  },
  {
    id: 'stairs', ic: 'stairs', name: 'Stairs', desc: 'Risers, treads, stringer, angle & stairwell opening.',
    fields: [
      { id: 'rise', type: 'len', label: 'Total rise (floor to floor)' },
      { id: 'target', type: 'len', label: 'Target riser height', hint: 'default 7"' },
      { id: 'tread', type: 'len', label: 'Tread depth (run)', hint: 'default 10"' },
      { id: 'headroom', type: 'len', label: 'Headroom clearance', hint: 'optional, e.g. 6\' 8"' },
      { id: 'floor', type: 'len', label: 'Floor thickness', hint: 'optional' },
    ],
    compute(v) {
      if (!v.rise) return [{ label: 'Enter total rise', value: '—' }];
      const r = S.stairs(v.rise, {
        targetRiser: v.target || 7, treadDepth: v.tread || 10,
        headroom: v.headroom, floorThickness: v.floor,
      });
      const rows = [
        { label: 'Number of risers', value: n0(r.numRisers), big: true },
        { label: 'Riser height', value: L(r.riserHeight), big: true },
        { label: 'Number of treads', value: n0(r.numTreads) },
        { label: 'Tread depth', value: L(r.treadDepth) },
        { label: 'Total run', value: L(r.totalRun) },
        { label: 'Stringer length', value: L(r.stringer), big: true },
        { label: 'Stair angle', value: deg(r.angle) },
      ];
      if (r.stairwell) {
        rows.push({ label: 'Risers to clear headroom', value: n0(r.stairwell.risersToClear) });
        rows.push({ label: 'Stairwell opening', value: L(r.stairwell.opening), big: true });
      }
      return rows;
    },
  },
  {
    id: 'studs', ic: 'studs', name: 'Studs On-Center', desc: 'Number of studs for a wall length & spacing.',
    fields: [
      { id: 'len', type: 'len', label: 'Wall length' },
      { id: 'oc', type: 'len', label: 'On-center spacing', hint: 'default 16"' },
      { id: 'extra', type: 'num', label: 'Extra (corners/openings)', hint: 'optional' },
    ],
    compute(v) {
      if (!v.len) return [{ label: 'Enter wall length', value: '—' }];
      const oc = v.oc || 16;
      const count = S.studs(v.len, oc, v.extra || 0);
      return [
        { label: 'Studs required', value: n0(count), big: true },
        { label: 'Spacing', value: L(oc) },
        { label: 'Bays', value: n0(count - 1) },
      ];
    },
  },
  {
    id: 'polygon', ic: 'polygon', name: 'Polygon', desc: 'Equal-sided polygon angles, area & miter cut.',
    fields: [
      { id: 'n', type: 'num', label: 'Number of sides' },
      { id: 'side', type: 'len', label: 'Side length' },
    ],
    compute(v) {
      if (!v.n || v.n < 3 || !v.side) return [{ label: 'Enter sides (≥3) and side length', value: '—' }];
      const r = S.polygon(v.n, v.side);
      return [
        { label: 'Miter cut (each end)', value: deg(r.miter), big: true },
        { label: 'Interior angle', value: deg(r.interior) },
        { label: 'Exterior angle', value: deg(r.exterior) },
        { label: 'Perimeter', value: L(r.perimeter) },
        { label: 'Area', value: A(r.area), big: true },
        { label: 'Apothem (in-radius)', value: L(r.apothem) },
        { label: 'Circumradius', value: L(r.circumradius) },
      ];
    },
  },
  {
    id: 'miter', ic: 'miter', name: 'Compound Miter / Crown', desc: 'Miter & bevel for crown / sloped work.',
    fields: [
      { id: 'spring', type: 'angle', label: 'Spring angle (°)', hint: 'e.g. 52 for 52/38 crown; 0 = flat baseboard' },
      { id: 'corner', type: 'angle', label: 'Corner angle (°)', hint: 'wall corner, default 90' },
    ],
    compute(v) {
      const spring = v.spring == null ? 52 : v.spring;
      const corner = v.corner == null ? 90 : v.corner;
      const r = S.compoundMiter(spring, corner);
      return [
        { label: 'Saw miter angle', value: deg(r.miter), big: true },
        { label: 'Saw bevel angle', value: deg(r.bevel), big: true },
        { label: 'Spring angle', value: deg(spring) },
        { label: 'Corner angle', value: deg(corner) },
      ];
    },
  },

  { group: 'Area & Volume' },
  {
    id: 'rect', ic: 'rect', name: 'Area & Volume', desc: 'Rectangle area & box volume from L × W × H.',
    fields: [
      { id: 'l', type: 'len', label: 'Length' },
      { id: 'w', type: 'len', label: 'Width' },
      { id: 'h', type: 'len', label: 'Height / Depth', hint: 'optional (for volume)' },
    ],
    compute(v) {
      if (!v.l || !v.w) return [{ label: 'Enter length and width', value: '—' }];
      const rows = [{ label: 'Area', value: A(S.rectArea(v.l, v.w)), big: true }];
      if (v.h) {
        rows.push({ label: 'Volume', value: Vol(S.boxVolume(v.l, v.w, v.h)), big: true });
        rows.push({ label: 'Concrete (yd³)', value: U.round(S.boxVolume(v.l, v.w, v.h) / (36 ** 3), 3) + ' yd³' });
      }
      rows.push({ label: 'Perimeter', value: L(2 * (v.l + v.w)) });
      return rows;
    },
  },
  {
    id: 'circle', ic: 'circle', name: 'Circle', desc: 'Circumference, area & arc length.',
    fields: [
      { id: 'd', type: 'len', label: 'Diameter' },
      { id: 'arc', type: 'angle', label: 'Arc angle (°)', hint: 'optional' },
    ],
    compute(v) {
      if (!v.d) return [{ label: 'Enter diameter', value: '—' }];
      const rows = [
        { label: 'Circumference', value: L(S.circleCircumference(v.d)), big: true },
        { label: 'Area', value: A(S.circleArea(v.d)), big: true },
        { label: 'Radius', value: L(v.d / 2) },
      ];
      if (v.arc) rows.push({ label: 'Arc length', value: L(S.circleArc(v.d, v.arc)) });
      return rows;
    },
  },
  {
    id: 'column', ic: 'column', name: 'Column / Cone', desc: 'Volume & surface area of columns and cones.',
    fields: [
      { id: 'd', type: 'len', label: 'Diameter' },
      { id: 'h', type: 'len', label: 'Height' },
    ],
    compute(v) {
      if (!v.d || !v.h) return [{ label: 'Enter diameter and height', value: '—' }];
      return [
        { label: 'Column volume', value: Vol(S.columnVolume(v.d, v.h)), big: true },
        { label: 'Column (yd³)', value: U.round(S.columnVolume(v.d, v.h) / (36 ** 3), 3) + ' yd³' },
        { label: 'Cone volume', value: Vol(S.coneVolume(v.d, v.h)), big: true },
        { label: 'Cone lateral area', value: A(S.coneLateralArea(v.d, v.h)) },
      ];
    },
  },

  { group: 'Materials' },
  {
    id: 'roof', ic: 'roof', name: 'Roofing', desc: 'Squares, bundles & sheathing from plan area + pitch.',
    fields: [
      { id: 'area', type: 'num', label: 'Plan (footprint) area — ft²' },
      { id: 'pitch', type: 'pitch', label: 'Pitch (rise per 12)' },
    ],
    compute(v) {
      if (!v.area || v.pitch == null) return [{ label: 'Enter plan area and pitch', value: '—' }];
      const r = S.roof(v.area, v.pitch);
      return [
        { label: 'Actual roof area', value: n2(r.actualArea) + ' ft²', big: true },
        { label: 'Squares', value: n2(r.squares), big: true },
        { label: 'Bundles (3-tab)', value: n0(r.bundles) },
        { label: '4×8 sheathing sheets', value: n0(r.sheets4x8) },
        { label: 'Slope factor', value: n2(r.slopeFactor) },
      ];
    },
  },
  {
    id: 'sheets', ic: 'sheets', name: 'Drywall / Siding', desc: 'Sheet count for a surface area.',
    fields: [
      { id: 'area', type: 'num', label: 'Surface area — ft²' },
      { id: 'size', type: 'select', label: 'Sheet size', opts: [['32', "4×8 (32 ft²)"], ['36', "4×9 (36 ft²)"], ['48', "4×12 (48 ft²)"]] },
      { id: 'waste', type: 'num', label: 'Waste %', hint: 'default 10' },
    ],
    compute(v) {
      if (!v.area) return [{ label: 'Enter surface area', value: '—' }];
      const per = v.size ? +v.size : 32;
      const dims = per === 32 ? [4, 8] : per === 36 ? [4, 9] : [4, 12];
      const r = S.sheets(v.area, dims[0], dims[1], v.waste == null ? 10 : v.waste);
      return [
        { label: 'Sheets required', value: n0(r.count), big: true },
        { label: 'Exact (no round-up)', value: n2(r.exact) },
        { label: 'Per sheet', value: r.perSheet + ' ft²' },
      ];
    },
  },
  {
    id: 'blocks', ic: 'blocks', name: 'Concrete Block', desc: 'Block count for a wall area.',
    fields: [
      { id: 'area', type: 'num', label: 'Wall area — ft²' },
    ],
    compute(v) {
      if (!v.area) return [{ label: 'Enter wall area', value: '—' }];
      return [
        { label: 'Blocks (16×8)', value: n0(S.blocks(v.area)), big: true },
        { label: 'Per block face', value: '0.888 ft²' },
      ];
    },
  },
  {
    id: 'boardfeet', ic: 'boardfeet', name: 'Board Feet', desc: 'Lumber board-feet from dimensions.',
    fields: [
      { id: 't', type: 'num', label: 'Thickness (in)' },
      { id: 'w', type: 'num', label: 'Width (in)' },
      { id: 'len', type: 'num', label: 'Length (ft)' },
      { id: 'qty', type: 'num', label: 'Quantity', hint: 'default 1' },
    ],
    compute(v) {
      if (!v.t || !v.w || !v.len) return [{ label: 'Enter thickness, width, length', value: '—' }];
      const bf = S.boardFeet(v.t, v.w, v.len, v.qty || 1);
      return [
        { label: 'Board feet', value: n2(bf), big: true },
        { label: 'Per piece', value: n2(S.boardFeet(v.t, v.w, v.len, 1)) },
      ];
    },
  },
  {
    id: 'cost', ic: 'cost', name: 'Cost per Unit', desc: 'Total cost from quantity × unit price.',
    fields: [
      { id: 'qty', type: 'num', label: 'Quantity' },
      { id: 'price', type: 'num', label: 'Unit price ($)' },
    ],
    compute(v) {
      if (v.qty == null || v.price == null) return [{ label: 'Enter quantity and price', value: '—' }];
      return [
        { label: 'Total cost', value: '$' + n2(S.cost(v.qty, v.price)), big: true },
        { label: 'Per unit', value: '$' + n2(v.price) },
      ];
    },
  },

  { group: 'Special Functions' },
  {
    id: 'trig', ic: 'trig', name: 'Trigonometry', desc: 'Sine, cosine, tangent & their inverses.',
    fields: [
      { id: 'angle', type: 'angle', label: 'Angle (°) — for sin/cos/tan' },
      { id: 'ratio', type: 'num', label: 'Ratio — for arc functions', hint: 'optional' },
    ],
    compute(v) {
      const rows = [];
      if (v.angle != null) {
        rows.push({ label: 'sin', value: n2(S.sin(v.angle)) });
        rows.push({ label: 'cos', value: n2(S.cos(v.angle)) });
        rows.push({ label: 'tan', value: n2(S.tan(v.angle)) });
      }
      if (v.ratio != null && v.ratio >= -1 && v.ratio <= 1) {
        rows.push({ label: 'arcsin', value: deg(S.asin(v.ratio)) });
        rows.push({ label: 'arccos', value: deg(S.acos(v.ratio)) });
      }
      if (v.ratio != null) rows.push({ label: 'arctan', value: deg(S.atan(v.ratio)) });
      return rows.length ? rows : [{ label: 'Enter an angle or a ratio', value: '—' }];
    },
  },
  {
    id: 'weight', ic: 'weight', name: 'Weight per Volume', desc: 'Material weight from volume × density.',
    fields: [
      { id: 'cuft', type: 'num', label: 'Volume — ft³' },
      { id: 'density', type: 'select', label: 'Material', opts: [['150', 'Concrete (150 lb/ft³)'], ['165', 'Reinforced concrete (165)'], ['100', 'Gravel (100)'], ['62.4', 'Water (62.4)'], ['490', 'Steel (490)']] },
      { id: 'custom', type: 'num', label: 'Custom density (lb/ft³)', hint: 'optional, overrides above' },
    ],
    compute(v) {
      if (v.cuft == null) return [{ label: 'Enter volume', value: '—' }];
      const dens = v.custom != null ? v.custom : (v.density ? +v.density : 150);
      const lb = S.weight(v.cuft, dens);
      return [
        { label: 'Weight', value: n2(lb) + ' lb', big: true },
        { label: 'Weight', value: n2(lb / 2000) + ' tons' },
        { label: 'Density used', value: dens + ' lb/ft³' },
      ];
    },
  },
];

const TOOL_MAP = {}; TOOLS.forEach((t) => { if (t.id) TOOL_MAP[t.id] = t; });

function showToolsHome() {
  $('tools-detail').style.display = 'none';
  const home = $('tools-home'); home.style.display = 'block';
  let html = '';
  let open = false;
  for (const t of TOOLS) {
    if (t.group) {
      if (open) html += '</div>';
      html += `<div class="section-label">${t.group}</div><div class="tools-grid">`;
      open = true;
    } else {
      html += `<div class="tool-card" data-tool="${t.id}"><div class="tic">${svg(t.ic)}</div><div class="tname">${t.name}</div><div class="tdesc">${t.desc}</div></div>`;
    }
  }
  if (open) html += '</div>';
  home.innerHTML = html;
  home.querySelectorAll('.tool-card').forEach((c) => c.onclick = () => openTool(c.dataset.tool));
}

function openTool(id) {
  const t = TOOL_MAP[id]; if (!t) return;
  $('tools-home').style.display = 'none';
  const det = $('tools-detail'); det.style.display = 'block';
  let html = `<div class="back-bar"><button id="toolBack">‹ Tools</button></div>`;
  html += `<div class="tool-detail"><h2><span class="th">${svg(t.ic)}</span>${t.name}</h2><div class="desc">${t.desc}</div>`;
  const fracOpts = '<option value="0">0</option>' +
    fractionList(prefs.denom).map((fr) => `<option value="${fr.dec}">${fr.num}/${fr.den}</option>`).join('');
  for (const f of t.fields) {
    html += `<div class="field"><label>${f.label}</label>`;
    if (f.type === 'select') {
      html += `<select data-fid="${f.id}">` + f.opts.map((o) => `<option value="${o[0]}">${o[1]}</option>`).join('') + `</select>`;
    } else if (f.type === 'len') {
      // separate feet / inch / fraction inputs
      html += `<div class="len-row" data-fid="${f.id}" data-ftype="len">
        <div class="seg"><input data-part="ft" inputmode="numeric" placeholder="0"><span class="u">ft</span></div>
        <div class="seg"><input data-part="in" inputmode="decimal" placeholder="0"><span class="u">in</span></div>
        <div class="seg frac"><select data-part="frac">${fracOpts}</select></div>
      </div>`;
    } else {
      const ph = f.type === 'angle' ? 'degrees' : f.type === 'pitch' ? 'rise per 12' : 'number';
      html += `<input data-fid="${f.id}" data-ftype="${f.type}" inputmode="decimal" placeholder="${ph}" />`;
    }
    if (f.hint) html += `<div class="hint">${f.hint}</div>`;
    html += `</div>`;
  }
  html += `<div class="results" id="toolResults"><div class="results-empty">Fill in the fields above to see results.</div></div>`;
  html += `</div>`;
  det.innerHTML = html;
  $('toolBack').onclick = showToolsHome;

  const recompute = () => {
    const vals = {};
    det.querySelectorAll('[data-fid]').forEach((el) => {
      const fid = el.dataset.fid, ftype = el.dataset.ftype;
      if (ftype === 'len') {                          // compound feet / inch / fraction
        const ft = el.querySelector('[data-part="ft"]').value.trim();
        const inch = el.querySelector('[data-part="in"]').value.trim();
        const frac = el.querySelector('[data-part="frac"]').value;
        if (ft === '' && inch === '' && (!frac || +frac === 0)) { vals[fid] = null; return; }
        vals[fid] = (parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0) + (parseFloat(frac) || 0);
        return;
      }
      if (el.tagName === 'SELECT') { vals[fid] = el.value; return; }
      const raw = el.value.trim();
      if (raw === '') { vals[fid] = null; return; }   // blank => not provided
      const n = parseFloat(raw);
      vals[fid] = isNaN(n) ? null : n;
    });
    let rows;
    try { rows = t.compute(vals); } catch (e) { rows = [{ label: 'Error', value: e.message }]; }
    const rEl = $('toolResults');
    if (!rows || !rows.length) { rEl.innerHTML = '<div class="results-empty">—</div>'; return; }
    rEl.innerHTML = rows.map((r) => `<div class="row ${r.big ? 'big' : ''}"><span class="rl">${r.label}</span><span class="rv">${r.value}</span></div>`).join('');
  };
  det.querySelectorAll('input, select').forEach((el) => { el.addEventListener('input', recompute); el.addEventListener('change', recompute); });
  recompute();
}

/* ============================ settings ============================ */
$('prefDenom').value = String(prefs.denom);
$('prefDenom').addEventListener('change', (e) => { prefs.denom = +e.target.value; savePrefs(); renderCalc(); });
$('prefTheme').value = prefs.theme;
$('prefTheme').addEventListener('change', (e) => { prefs.theme = e.target.value; savePrefs(); applyTheme(); });
$('prefHaptics').value = prefs.haptics;
$('prefHaptics').addEventListener('change', (e) => { prefs.haptics = e.target.value; savePrefs(); });

/* ============================ PWA ============================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e;
  if (!localStorage.getItem('concalc.installDismissed')) $('installBanner').classList.add('show');
});
$('installBtn').onclick = async () => {
  $('installBanner').classList.remove('show');
  if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
};
$('installDismiss').onclick = () => { $('installBanner').classList.remove('show'); localStorage.setItem('concalc.installDismissed', '1'); };

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ============================ init ============================ */
renderCalc();
renderTape();

})();
