/* ============================================================================
 * calc.js — Feet-Inch-Fraction calculator engine (entry parsing + FSM)
 * Depends on units.js (window.Units)
 * ==========================================================================*/
'use strict';

(function () {

const U = window.Units;

/* Parse a keypad-built entry string into a dimensioned Value.
 * Understands: feet ('), inches ("), fractions (a/b), yd, m, cm, mm and bare
 * scalars. Whitespace is irrelevant. */
function parseEntry(str) {
  if (str == null) return U.Scalar(0);
  str = String(str).trim();
  if (str === '') return U.Scalar(0);

  let sign = 1;
  if (str[0] === '-') { sign = -1; str = str.slice(1); }

  const re = /(\d*\.?\d+)|(yd|ft|in|mm|cm|m)|(['"/])/g;
  let m;
  const toks = [];
  while ((m = re.exec(str)) !== null) {
    if (m[1] !== undefined) toks.push({ t: 'num', v: parseFloat(m[1]) });
    else if (m[2] !== undefined) toks.push({ t: 'unit', v: m[2] });
    else toks.push({ t: 'sym', v: m[3] });
  }

  let inches = 0;
  let hasUnit = false;
  let nums = [];
  let expectDenom = false;
  let fracNum = 0;

  const flushInches = () => { while (nums.length) inches += nums.shift(); };

  for (const tk of toks) {
    if (tk.t === 'num') {
      if (expectDenom) {
        const den = tk.v || 1;
        inches += fracNum / den;
        expectDenom = false;
        flushInches();           // any whole inches before the fraction
        hasUnit = true;
      } else {
        nums.push(tk.v);
      }
      continue;
    }
    if (tk.t === 'sym') {
      if (tk.v === "'") { inches += (nums.pop() || 0) * U.IN_PER_FT; nums = []; hasUnit = true; }
      else if (tk.v === '"') { flushInches(); hasUnit = true; }
      else if (tk.v === '/') { fracNum = nums.pop() || 0; expectDenom = true; }
      continue;
    }
    if (tk.t === 'unit') {
      const n = nums.pop() || 0; nums = []; hasUnit = true;
      if (tk.v === 'yd') inches += n * U.IN_PER_YD;
      else if (tk.v === 'ft') inches += n * U.IN_PER_FT;
      else if (tk.v === 'in') inches += n;
      else if (tk.v === 'm') inches += n * U.IN_PER_M;
      else if (tk.v === 'cm') inches += n * U.Convert.cmToIn(1);
      else if (tk.v === 'mm') inches += n * U.Convert.mmToIn(1);
    }
  }

  if (!hasUnit) {
    // pure scalar
    const val = nums.length ? nums.reduce((a, b) => a + b, 0) : 0;
    return U.Scalar(sign * val);
  }
  // trailing loose numbers are inches
  flushInches();
  return U.Length(sign * inches);
}

class Calculator {
  constructor(prefs) {
    this.prefs = prefs || { denom: 16 };
    this.memories = [null, null, null, null];
    this.tape = [];
    this.reset();
  }

  reset() {
    this.tokens = [];
    this.curNum = '';
    this.acc = null;         // Value
    this.op = null;
    this.freshResult = false;
    this.error = null;
  }

  entryEmpty() { return this.tokens.length === 0 && this.curNum === ''; }

  entryString() {
    let s = this.tokens.join(' ');
    if (this.curNum !== '') s += ' ' + this.curNum;
    return s.trim();
  }

  /* Pretty display of what is being typed */
  prettyEntry() {
    let out = '';
    const parts = this.curNum !== '' ? this.tokens.concat([this.curNum]) : this.tokens.slice();
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p === "'" || p === '"') out = out.trimEnd() + p + ' ';
      else if (p === '/') out = out.trimEnd() + '/';
      else out += p + ' ';
    }
    return out.trim();
  }

  _clearFreshIfNeeded() {
    if (this.freshResult) { this.acc = null; this.op = null; this.freshResult = false; }
    this.error = null;
  }

  inputDigit(d) {
    this._clearFreshIfNeeded();
    this.curNum += d;
  }
  inputDot() {
    this._clearFreshIfNeeded();
    if (!this.curNum.includes('.')) this.curNum += (this.curNum === '' ? '0.' : '.');
  }
  _flushNum() { if (this.curNum !== '') { this.tokens.push(this.curNum); this.curNum = ''; } }

  unit(sym) {
    this._clearFreshIfNeeded();
    // allow feet/inch/etc even if no number typed yet (defaults to previous)
    this._flushNum();
    this.tokens.push(sym);
  }

  /* Insert a preset inch fraction, e.g. 3/8 */
  insertFraction(num, den) {
    this._clearFreshIfNeeded();
    this._flushNum();
    this.tokens.push(String(num), '/', String(den));
  }

  backspace() {
    this.error = null;
    if (this.freshResult) { return; }
    if (this.curNum !== '') { this.curNum = this.curNum.slice(0, -1); return; }
    if (this.tokens.length) this.tokens.pop();
  }

  clearEntry() { this.tokens = []; this.curNum = ''; this.error = null; }

  allClear() { this.reset(); }

  _currentOperand() {
    if (!this.entryEmpty()) return parseEntry(this.entryString());
    if (this.acc) return this.acc;
    return U.Scalar(0);
  }

  operator(op) {
    try {
      this.error = null;
      const val = this.entryEmpty() ? this.acc : parseEntry(this.entryString());
      if (this.acc === null) {
        this.acc = val || U.Scalar(0);
      } else if (this.op && !this.entryEmpty()) {
        this.acc = U.combine(this.acc, this.op, val);
      } else if (this.entryEmpty()) {
        // just changing the operator
      } else {
        this.acc = val;
      }
      this.op = op;
      this.tokens = []; this.curNum = '';
      this.freshResult = false;
    } catch (e) { this.error = e.message; }
  }

  equals() {
    try {
      this.error = null;
      if (this.op && this.acc !== null) {
        const rhs = this.entryEmpty() ? this.acc : parseEntry(this.entryString());
        const before = this.acc, op = this.op;
        const result = U.combine(this.acc, this.op, rhs);
        this._pushTape(before, op, rhs, result);
        this.acc = result;
      } else if (!this.entryEmpty()) {
        this.acc = parseEntry(this.entryString());
      }
      this.op = null;
      this.tokens = []; this.curNum = '';
      this.freshResult = true;
    } catch (e) { this.error = e.message; }
  }

  /* The value currently shown (result or typed entry) */
  displayed() {
    if (this.error) return null;
    if (!this.entryEmpty()) return parseEntry(this.entryString());
    return this.acc;
  }

  /* ---- memory ---- */
  memStore(i) { const v = this.displayed(); if (v) this.memories[i] = v; }
  memRecall(i) {
    const v = this.memories[i];
    if (!v) return;
    this.acc = v; this.tokens = []; this.curNum = ''; this.op = null; this.freshResult = true;
  }
  memClear(i) { this.memories[i] = null; }
  memPlus(i) {
    const v = this.displayed(); if (!v) return;
    try {
      this.memories[i] = this.memories[i] ? U.combine(this.memories[i], '+', v) : v;
    } catch (e) { this.error = e.message; }
  }

  /* ---- paperless tape ---- */
  _pushTape(a, op, b, res) {
    const f = (v) => U.displayValue(v, this.prefs).main;
    const symbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op] || op;
    this.tape.unshift({ line: `${f(a)}  ${symbol}  ${f(b)}`, result: f(res) });
    if (this.tape.length > 200) this.tape.pop();
  }
  clearTape() { this.tape = []; }

  /* Convert current displayed length into a specific format label */
  loadValue(v) {
    if (!v) return;
    this.acc = v; this.tokens = []; this.curNum = ''; this.op = null; this.freshResult = true;
    this.error = null;
  }
}

window.parseEntry = parseEntry;
window.Calculator = Calculator;

})();
