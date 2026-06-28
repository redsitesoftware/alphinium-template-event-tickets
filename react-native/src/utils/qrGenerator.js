/**
 * qrGenerator.js
 * QR Code generator — Version 3 (29×29), Error Correction Level L, Byte mode, Mask 0.
 *
 * Pure JavaScript — no native modules required.
 * Handles strings up to 53 ASCII characters.
 * Produces a spec-compliant, scannable QR code matrix.
 *
 * Spec details (QR Code 2005, Table 9):
 *   Version 3  : 29×29 modules
 *   Level L    : 55 data codewords, 15 EC codewords (1 block), 7 remainder bits
 *   Byte mode  : mode indicator 0b0100, 8-bit character count
 *   Mask 0     : (row + col) % 2 === 0 → invert
 *   Format info: 0b010001111010110  (L + mask 0, after BCH + XOR 101010000010010)
 */

// ─── GF(256) tables (primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 = 0x11d) ──

const GF_EXP = new Array(512);
const GF_LOG = new Array(256).fill(0);

(function buildGFTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  return a && b ? GF_EXP[GF_LOG[a] + GF_LOG[b]] : 0;
}

// ─── Reed-Solomon encoder ────────────────────────────────────────────────────

/**
 * Compute `nec` Reed-Solomon error-correction codewords for `data`.
 * Generator polynomial: g(x) = ∏(x + α^i) for i = 0..nec-1
 *
 * @param {number[]} data  Input data codewords
 * @param {number}   nec   Number of EC codewords to generate
 * @returns {number[]}  EC codewords (length = nec)
 */
function rsEncode(data, nec) {
  // Build generator polynomial (highest-degree coefficient first)
  let g = [1];
  for (let i = 0; i < nec; i++) {
    const ai = GF_EXP[i];
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      ng[j] ^= g[j];
      ng[j + 1] ^= gfMul(g[j], ai);
    }
    g = ng;
  }

  // Polynomial long division — remainder is the EC codewords
  const r = [...data, ...new Array(nec).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coeff = r[i];
    if (coeff === 0) continue;
    for (let j = 0; j < g.length; j++) r[i + j] ^= gfMul(g[j], coeff);
  }
  return r.slice(data.length);
}

// ─── Data encoder (Version 3, Level L) ───────────────────────────────────────

/**
 * Encode `text` to 55 QR data codewords (V3-L, byte mode).
 *
 * @param {string} text  ASCII string, max 53 characters
 * @returns {number[]}   55 data codewords
 */
function encodeDataV3L(text) {
  const bytes = Array.from(text.slice(0, 53)).map(c => c.charCodeAt(0));
  const bits = [];

  const pushBits = (value, count) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  pushBits(0b0100, 4);          // byte mode indicator
  pushBits(bytes.length, 8);    // character count (8 bits for byte mode, V1–V9)
  bytes.forEach(b => pushBits(b, 8));
  pushBits(0, 4);               // terminator

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad codewords — target 55 × 8 = 440 bits
  const PAD = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < 440) pushBits(PAD[padIdx++ & 1], 8);

  // Pack bits into codewords
  const cw = [];
  for (let i = 0; i < 440; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    cw.push(b);
  }
  return cw; // 55 codewords
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

const FINDER_PAT = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const ALIGN_PAT = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
];

function placeBlock(matrix, row, col, pat) {
  pat.forEach((r, dr) =>
    r.forEach((v, dc) => { matrix[row + dr][col + dc] = v === 1; }),
  );
}

// ─── Format info (L + mask 0) ─────────────────────────────────────────────────

// 0b010001111010110 — 15-bit format string, bit 0 is LSB
// Placement uses LSB-first ordering in the spec.
const FORMAT_VAL = 0b010001111010110;
const FMT_BITS = Array.from({ length: 15 }, (_, i) => (FORMAT_VAL >> i) & 1);

const FMT_COPY1_POSITIONS = [
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [8, 7],                   // skip col 6 (timing)
  [8, 8], [7, 8],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],  // skip row 6 (timing)
];

// Copy 2 — BL column (bits 0–6) then TR row (bits 7–14)
const N = 29;
const FMT_COPY2_POSITIONS = [
  [N - 1, 8], [N - 2, 8], [N - 3, 8], [N - 4, 8], [N - 5, 8], [N - 6, 8], [N - 7, 8],
  [8, N - 8], [8, N - 7], [8, N - 6], [8, N - 5], [8, N - 4], [8, N - 3], [8, N - 2], [8, N - 1],
];

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a 29×29 QR code matrix for `text`.
 * Deterministic: same input always produces the same matrix.
 *
 * @param {string} text  ASCII string to encode (max 53 chars)
 * @returns {boolean[][]}  29×29 boolean matrix; true = dark module
 */
export function generateQRMatrix(text) {
  // 1. Encode data + RS error correction
  const dataCW = encodeDataV3L(text);
  const ecCW   = rsEncode(dataCW, 15);
  const allCW  = [...dataCW, ...ecCW]; // 70 codewords

  // Expand to bit stream (560 data+EC bits + 7 zero remainder bits = 567)
  const bitstream = [];
  allCW.forEach(cw => {
    for (let i = 7; i >= 0; i--) bitstream.push((cw >> i) & 1);
  });
  while (bitstream.length < 567) bitstream.push(0); // remainder bits

  // 2. Initialise matrix (null = not yet assigned)
  const m = Array.from({ length: N }, () => new Array(N).fill(null));

  // 3. Place finder patterns (top-left, top-right, bottom-left)
  placeBlock(m, 0,      0,      FINDER_PAT);
  placeBlock(m, 0,      N - 7,  FINDER_PAT);
  placeBlock(m, N - 7,  0,      FINDER_PAT);

  // 4. Separators (1-module white border around each finder)
  for (let i = 0; i < 8; i++) {
    m[7][i]     = false;   // TL bottom
    m[i][7]     = false;   // TL right
    m[7][N-1-i] = false;   // TR bottom
    m[i][N-8]   = false;   // TR left
    m[N-8][i]   = false;   // BL top
    m[N-1-i][7] = false;   // BL right
  }

  // 5. Timing patterns (row 6 and col 6, between separators)
  for (let i = 8; i <= N - 9; i++) {
    m[6][i] = (i % 2 === 0);
    m[i][6] = (i % 2 === 0);
  }

  // 6. Alignment pattern (V3 center at row 22, col 22)
  placeBlock(m, 20, 20, ALIGN_PAT);

  // 7. Dark module (always dark)
  m[N - 8][8] = true;

  // 8. Format info (both copies)
  FMT_COPY1_POSITIONS.forEach(([r, c], i) => { m[r][c] = FMT_BITS[i] === 1; });
  FMT_COPY2_POSITIONS.forEach(([r, c], i) => { m[r][c] = FMT_BITS[i] === 1; });

  // 9. Place data bits using the upward/downward zigzag scan with mask 0
  let bitIdx = 0;
  let goingUp = true;

  for (let col = N - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5; // skip timing column; shift pair left by 1

    for (let rowOffset = 0; rowOffset < N; rowOffset++) {
      const row = goingUp ? N - 1 - rowOffset : rowOffset;

      for (let dc = 0; dc <= 1; dc++) {
        const c = col - dc;
        if (m[row][c] !== null) continue; // skip function modules

        const bit = bitIdx < bitstream.length ? bitstream[bitIdx++] : 0;
        // Apply mask 0: invert if (row + col) is even
        m[row][c] = (row + c) % 2 === 0 ? bit === 0 : bit === 1;
      }
    }

    goingUp = !goingUp;
  }

  // Fill any remaining null modules (shouldn't happen in a valid V3 symbol)
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (m[r][c] === null) m[r][c] = false;
    }
  }

  return m;
}
