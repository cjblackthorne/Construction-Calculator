/* ============================================================================
 * app.js — UI wiring, tool screens, PWA install, service worker
 * ==========================================================================*/
'use strict';

(function () {

const U = window.Units;
const S = window.Solvers;
const $ = (id) => document.getElementById(id);

/* ---- preferences ---- */
const prefs = loadPrefs();
function loadPrefs() {
  let p = { denom: 16, lengthFmt: 0 };
  try { Object.assign(p, JSON.parse(localStorage.getItem('concalc.prefs') || '{}')); } catch (e) {}
  return p;
}
function savePrefs() { try { localStorage.setItem('concalc.prefs', JSON.stringify(prefs)); } catch (e) {} }

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
    id: 'rightangle', ic: '📐', name: 'Right Angle', desc: 'Solve rise, run, diagonal & pitch from any two.',
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
    id: 'rafter', ic: '🏠', name: 'Rafters', desc: 'Common, hip/valley & jack rafters, cut angles.',
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
    id: 'stairs', ic: '🪜', name: 'Stairs', desc: 'Risers, treads, stringer, angle & stairwell opening.',
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
    id: 'studs', ic: '🧱', name: 'Studs On-Center', desc: 'Number of studs for a wall length & spacing.',
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
    id: 'polygon', ic: '⬡', name: 'Polygon', desc: 'Equal-sided polygon angles, area & miter cut.',
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
    id: 'miter', ic: '🔺', name: 'Compound Miter / Crown', desc: 'Miter & bevel for crown / sloped work.',
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
    id: 'rect', ic: '⬛', name: 'Area & Volume', desc: 'Rectangle area & box volume from L × W × H.',
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
    id: 'circle', ic: '⭕', name: 'Circle', desc: 'Circumference, area & arc length.',
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
    id: 'column', ic: '🥫', name: 'Column / Cone', desc: 'Volume & surface area of columns and cones.',
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
    id: 'roof', ic: '🏚️', name: 'Roofing', desc: 'Squares, bundles & sheathing from plan area + pitch.',
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
    id: 'sheets', ic: '🪟', name: 'Drywall / Siding', desc: 'Sheet count for a surface area.',
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
    id: 'blocks', ic: '🧱', name: 'Concrete Block', desc: 'Block count for a wall area.',
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
    id: 'boardfeet', ic: '🪵', name: 'Board Feet', desc: 'Lumber board-feet from dimensions.',
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
    id: 'cost', ic: '💲', name: 'Cost per Unit', desc: 'Total cost from quantity × unit price.',
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
    id: 'trig', ic: '📊', name: 'Trigonometry', desc: 'Sine, cosine, tangent & their inverses.',
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
    id: 'weight', ic: '⚖️', name: 'Weight per Volume', desc: 'Material weight from volume × density.',
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
      html += `<div class="tool-card" data-tool="${t.id}"><div class="tic">${t.ic}</div><div class="tname">${t.name}</div><div class="tdesc">${t.desc}</div></div>`;
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
  html += `<div class="tool-detail"><h2>${t.ic} ${t.name}</h2><div class="desc">${t.desc}</div>`;
  for (const f of t.fields) {
    html += `<div class="field"><label>${f.label}</label>`;
    if (f.type === 'select') {
      html += `<select data-fid="${f.id}">` + f.opts.map((o) => `<option value="${o[0]}">${o[1]}</option>`).join('') + `</select>`;
    } else {
      const ph = f.type === 'len' ? "e.g. 12' 6\"" : f.type === 'angle' ? 'degrees' : f.type === 'pitch' ? 'rise per 12' : 'number';
      const im = (f.type === 'len') ? 'text' : 'decimal';
      html += `<input data-fid="${f.id}" data-ftype="${f.type}" inputmode="${im}" placeholder="${ph}" />`;
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
      const raw = el.value.trim();
      if (el.tagName === 'SELECT') { vals[fid] = el.value; return; }
      if (raw === '') { vals[fid] = null; return; }   // blank => not provided
      if (ftype === 'len') {
        vals[fid] = parseEntry(raw).base;             // inches (scalar treated as inches)
      } else {
        const n = parseFloat(raw);
        vals[fid] = isNaN(n) ? null : n;
      }
    });
    let rows;
    try { rows = t.compute(vals); } catch (e) { rows = [{ label: 'Error', value: e.message }]; }
    const rEl = $('toolResults');
    if (!rows || !rows.length) { rEl.innerHTML = '<div class="results-empty">—</div>'; return; }
    rEl.innerHTML = rows.map((r) => `<div class="row ${r.big ? 'big' : ''}"><span class="rl">${r.label}</span><span class="rv">${r.value}</span></div>`).join('');
  };
  det.querySelectorAll('[data-fid]').forEach((el) => { el.addEventListener('input', recompute); el.addEventListener('change', recompute); });
  recompute();
}

/* ============================ settings ============================ */
$('prefDenom').value = String(prefs.denom);
$('prefDenom').addEventListener('change', (e) => { prefs.denom = +e.target.value; savePrefs(); renderCalc(); });

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
