/* ============================================================================
 * qr.js is a self-contained QR Code generator (byte mode) with no dependencies.
 * Tables per ISO/IEC 18004. window.QR.generate(text, ecLevel) -> {size, modules}
 * ==========================================================================*/
'use strict';
(function () {

/* total codewords per version (index = version) */
const CODEWORDS_COUNT = [0,
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185,
  2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706];

/* number of EC blocks: [(v-1)*4 + level], level order L,M,Q,H */
const EC_BLOCKS = [
  1,1,1,1, 1,1,1,1, 1,1,2,2, 1,2,2,4, 1,2,4,4, 2,4,4,4, 2,4,6,5, 2,4,6,6,
  2,5,8,8, 4,5,8,8, 4,5,8,11, 4,8,10,11, 4,9,12,16, 4,9,16,16, 6,10,12,18,
  6,10,17,16, 6,11,16,19, 6,13,18,21, 7,14,21,25, 8,16,20,25, 8,17,23,25,
  9,17,23,34, 9,18,25,30, 10,20,27,32, 12,21,29,35, 12,23,34,37, 12,25,34,40,
  13,26,35,42, 14,28,38,45, 15,29,40,48, 16,31,43,51, 17,33,45,54, 18,35,48,57,
  19,37,51,60, 19,38,53,63, 20,40,56,66, 21,43,59,70, 22,45,62,74, 24,47,65,77,
  25,49,68,81];

/* total EC codewords across all blocks: [(v-1)*4 + level] */
const EC_CODEWORDS = [
  7,10,13,17, 10,16,22,28, 15,26,36,44, 20,36,52,64, 26,48,72,88, 36,64,96,112,
  40,72,108,130, 48,88,132,156, 60,110,160,192, 72,130,192,224, 80,150,224,264,
  96,176,260,308, 104,198,288,352, 120,216,320,384, 132,240,360,432, 144,280,408,480,
  168,308,448,532, 180,338,504,588, 196,364,546,650, 224,416,600,700, 224,442,644,750,
  252,476,690,816, 270,504,750,900, 300,560,810,960, 312,588,870,1050, 336,644,952,1110,
  360,700,1020,1200, 390,728,1050,1260, 420,784,1140,1350, 450,812,1200,1440, 480,868,1290,1530,
  510,924,1350,1620, 540,980,1440,1710, 570,1036,1530,1800, 570,1064,1590,1890, 600,1120,1680,1980,
  630,1204,1770,2100, 660,1260,1860,2220, 720,1316,1950,2310, 750,1372,2040,2430];

const LEVEL = { L: 0, M: 1, Q: 2, H: 3 };
const FORMAT_EC = { L: 1, M: 0, Q: 3, H: 2 };   // QR format indicator bits
const G15 = 0x537, G15_MASK = 0x5412, G18 = 0x1f25;

/* ---- Galois field GF(256) ---- */
const EXP = new Array(256), LOG = new Array(256);
(function () { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 0; i < 255; i++) LOG[EXP[i]] = i; })();
function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[(LOG[a] + LOG[b]) % 255]; }

function rsGenPoly(ec) {
  let g = [1];
  for (let i = 0; i < ec; i++) {
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], EXP[i]); }
    g = ng;
  }
  return g;
}
function rsEncode(data, ec) {
  const gen = rsGenPoly(ec);
  const res = new Array(data.length + ec).fill(0);
  for (let i = 0; i < data.length; i++) res[i] = data[i];
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) for (let j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], coef);
  }
  return res.slice(data.length);
}

function bchDigit(d) { let n = 0; while (d !== 0) { n++; d >>>= 1; } return n; }
function bchTypeInfo(data) {
  let d = data << 10;
  while (bchDigit(d) - bchDigit(G15) >= 0) d ^= (G15 << (bchDigit(d) - bchDigit(G15)));
  return ((data << 10) | d) ^ G15_MASK;
}
function bchTypeNumber(data) {
  let d = data << 12;
  while (bchDigit(d) - bchDigit(G18) >= 0) d ^= (G18 << (bchDigit(d) - bchDigit(G18)));
  return (data << 12) | d;
}

/* alignment pattern centre coordinates (formula, ISO 18004) */
function alignCoords(version) {
  if (version === 1) return [];
  const posCount = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
  const positions = [size - 7];
  for (let i = 1; i < posCount - 1; i++) positions[i] = positions[i - 1] - intervals;
  positions.push(6);
  return positions.reverse();
}

/* ---- bit buffer ---- */
function BitBuffer() { this.buf = []; this.len = 0; }
BitBuffer.prototype.putBit = function (b) {
  const bi = this.len >> 3;
  if (this.buf.length <= bi) this.buf.push(0);
  if (b) this.buf[bi] |= (0x80 >> (this.len & 7));
  this.len++;
};
BitBuffer.prototype.put = function (num, length) { for (let i = length - 1; i >= 0; i--) this.putBit((num >>> i) & 1); };

/* UTF-8 encode */
function toBytes(str) {
  const out = [];
  for (const ch of unescape(encodeURIComponent(str))) out.push(ch.charCodeAt(0));
  return out;
}

function chooseVersion(len, level) {
  for (let v = 1; v <= 40; v++) {
    const ccbits = v < 10 ? 8 : 16;
    const dataCW = CODEWORDS_COUNT[v] - EC_CODEWORDS[(v - 1) * 4 + level];
    if (4 + ccbits + 8 * len <= dataCW * 8) return v;
  }
  throw new Error('Data too long for QR');
}

function createData(bytes, version, level) {
  const dataCW = CODEWORDS_COUNT[version] - EC_CODEWORDS[(version - 1) * 4 + level];
  const bb = new BitBuffer();
  bb.put(4, 4);                                  // byte mode
  bb.put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) bb.put(b, 8);
  const cap = dataCW * 8;
  if (bb.len + 4 <= cap) bb.put(0, 4);           // terminator
  while (bb.len % 8 !== 0) bb.putBit(0);
  const PAD = [0xEC, 0x11]; let p = 0;
  while (bb.buf.length < dataCW) bb.buf.push(PAD[(p++) % 2]);
  return bb.buf.slice(0, dataCW);
}

function interleave(dataCW, version, level) {
  const numBlocks = EC_BLOCKS[(version - 1) * 4 + level];
  const ecPerBlock = EC_CODEWORDS[(version - 1) * 4 + level] / numBlocks;
  const total = dataCW.length;
  const per = Math.floor(total / numBlocks);
  const longCount = total % numBlocks;           // blocks with per+1 data codewords
  const blocks = [];
  let idx = 0;
  for (let b = 0; b < numBlocks; b++) {
    const dlen = per + (b >= numBlocks - longCount ? 1 : 0);
    const dc = dataCW.slice(idx, idx + dlen); idx += dlen;
    blocks.push({ dc, ec: rsEncode(dc, ecPerBlock) });
  }
  const out = [];
  const maxData = per + (longCount ? 1 : 0);
  for (let i = 0; i < maxData; i++) for (const bl of blocks) if (i < bl.dc.length) out.push(bl.dc[i]);
  for (let i = 0; i < ecPerBlock; i++) for (const bl of blocks) out.push(bl.ec[i]);
  return out;
}

/* ---- matrix ---- */
function maskFn(m, i, j) {
  switch (m) {
    case 0: return (i + j) % 2 === 0;
    case 1: return i % 2 === 0;
    case 2: return j % 3 === 0;
    case 3: return (i + j) % 3 === 0;
    case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
    case 5: return (i * j) % 2 + (i * j) % 3 === 0;
    case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
    case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
  }
}

function buildMatrix(codewords, version, level, mask) {
  const size = version * 4 + 17;
  const mods = Array.from({ length: size }, () => new Array(size).fill(null));

  const probe = (row, col) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      if (row + r < 0 || row + r >= size || col + c < 0 || col + c >= size) continue;
      const on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                 (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      mods[row + r][col + c] = on;
    }
  };
  probe(0, 0); probe(size - 7, 0); probe(0, size - 7);

  // timing
  for (let i = 8; i < size - 8; i++) { const v = i % 2 === 0; if (mods[6][i] === null) mods[6][i] = v; if (mods[i][6] === null) mods[i][6] = v; }

  // alignment (skip only the three finder-corner positions; centres may lie on
  // the timing row/col and must still be drawn)
  const pos = alignCoords(version);
  const last = pos.length - 1;
  for (let i = 0; i < pos.length; i++) for (let j = 0; j < pos.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
    const r = pos[i], c = pos[j];
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
      mods[r + dr][c + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
  }

  // version info (v>=7)
  if (version >= 7) {
    const bits = bchTypeNumber(version);
    for (let i = 0; i < 18; i++) {
      const b = ((bits >> i) & 1) === 1;
      mods[Math.floor(i / 3)][i % 3 + size - 11] = b;
      mods[i % 3 + size - 11][Math.floor(i / 3)] = b;
    }
  }

  // reserve format areas (set to false; overwritten below with real bits)
  for (let i = 0; i < 15; i++) {
    if (i < 6) mods[i][8] = false; else if (i < 8) mods[i + 1][8] = false; else mods[size - 15 + i][8] = false;
    if (i < 8) mods[8][size - i - 1] = false; else if (i < 9) mods[8][15 - i] = false; else mods[8][15 - i - 1] = false;
  }
  mods[size - 8][8] = true;  // dark module

  // data placement (zigzag) with mask
  const bitCount = codewords.length * 8;
  let bit = 0;
  const nextBit = () => { const v = bit < bitCount ? ((codewords[bit >> 3] >> (7 - (bit & 7))) & 1) : 0; bit++; return v; };
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const row = up ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (mods[row][cc] === null) {
          let dark = nextBit() === 1;
          if (maskFn(mask, row, cc)) dark = !dark;
          mods[row][cc] = dark;
        }
      }
    }
    up = !up;
  }

  // real format info
  const data = (FORMAT_EC_VAL(level) << 3) | mask;
  const bits = bchTypeInfo(data);
  for (let i = 0; i < 15; i++) {
    const b = ((bits >> i) & 1) === 1;
    if (i < 6) mods[i][8] = b; else if (i < 8) mods[i + 1][8] = b; else mods[size - 15 + i][8] = b;
    if (i < 8) mods[8][size - i - 1] = b; else if (i < 9) mods[8][15 - i] = b; else mods[8][15 - i - 1] = b;
  }
  return mods;
}
function FORMAT_EC_VAL(level) { return [1, 0, 3, 2][level]; }  // L,M,Q,H -> format bits

/* penalty scoring for mask selection */
function penalty(m) {
  const n = m.length; let score = 0;
  // rule 1: runs of 5+
  for (let i = 0; i < n; i++) {
    for (let dir = 0; dir < 2; dir++) {
      let run = 1;
      for (let j = 1; j < n; j++) {
        const a = dir ? m[j - 1][i] : m[i][j - 1];
        const b = dir ? m[j][i] : m[i][j];
        if (a === b) { run++; if (run === 5) score += 3; else if (run > 5) score += 1; }
        else run = 1;
      }
    }
  }
  // rule 2: 2x2 blocks
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) {
    const v = m[i][j];
    if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) score += 3;
  }
  // rule 3: finder-like pattern 1011101 with 4 light on a side
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    for (let dir = 0; dir < 2; dir++) {
      if ((dir === 0 && j + 11 <= n) || (dir === 1 && i + 11 <= n)) {
        let ok1 = true, ok2 = true;
        for (let k = 0; k < 11; k++) {
          const cell = dir === 0 ? m[i][j + k] : m[i + k][j];
          if (cell !== pat1[k]) ok1 = false;
          if (cell !== pat2[k]) ok2 = false;
        }
        if (ok1) score += 40; if (ok2) score += 40;
      }
    }
  }
  // rule 4: dark ratio
  let dark = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (m[i][j]) dark++;
  const ratio = dark / (n * n) * 100;
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return score;
}

function generate(text, ecLevel) {
  ecLevel = ecLevel && LEVEL[ecLevel] !== undefined ? ecLevel : 'M';
  const level = LEVEL[ecLevel];
  const bytes = toBytes(text);
  const version = chooseVersion(bytes.length, level);
  const dataCW = createData(bytes, version, level);
  const codewords = interleave(dataCW, version, level);
  let best = null, bestScore = Infinity, bestMask = 0;
  const only = (typeof arguments[2] === 'number') ? arguments[2] : null; // debug: force mask
  for (let mask = 0; mask < 8; mask++) {
    if (only !== null && mask !== only) continue;
    const mods = buildMatrix(codewords, version, level, mask);
    const s = penalty(mods);
    if (s < bestScore) { bestScore = s; best = mods; bestMask = mask; }
  }
  return { size: best.length, modules: best, version, mask: bestMask };
}

window.QR = { generate };
})();
