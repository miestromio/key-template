#!/usr/bin/env node
/**
 * Audit all 24 keys: scale pcs, NOTE_PC coverage, piano highlights, triad qualities.
 * Run: node audit-keys.mjs
 * Exits 1 on any failure.
 */
import { readFileSync } from "fs";



const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const script = html.match(/<script>\s*\(function \(\) \{([\s\S]*?)\}\)\(\);\s*<\/script>/);
if (!script) {
  console.error("Could not extract IIFE from index.html");
  process.exit(1);
}

// Evaluate music logic in a sandbox by extracting constants/functions before DOM code
const body = script[1];
const cut = body.indexOf("// --- Render ---");
const logic = body.slice(0, cut >= 0 ? cut : body.indexOf("const sel"));
const sandbox = { console, Set, Map, Array, Object, Math, String, Number, Boolean };
const fn = new Function(
  "exports",
  `${logic}
  exports.NOTE_PC = NOTE_PC;
  exports.WHITE = WHITE;
  exports.BLACK_KEYS = BLACK_KEYS;
  exports.MAJOR_KEYS = MAJOR_KEYS;
  exports.MINOR_KEYS = MINOR_KEYS;
  exports.buildMajorChords = buildMajorChords;
  exports.buildMinorChords = buildMinorChords;
  exports.drawPianoSVG = drawPianoSVG;
  exports.expandProgression = expandProgression;
  exports.relativeFootnote = relativeFootnote;
  exports.findRelNotes = findRelNotes;
  exports.GENRE_TEMPLATES = GENRE_TEMPLATES;
`
);
const exports = {};
fn(exports);
const {
  NOTE_PC, WHITE, BLACK_KEYS, MAJOR_KEYS, MINOR_KEYS,
  buildMajorChords, buildMinorChords, drawPianoSVG,
  expandProgression, findRelNotes, GENRE_TEMPLATES, relativeFootnote,
} = exports;

function expectedMajor(t) { return [0,2,4,5,7,9,11].map(i => (t+i)%12); }
function expectedMinor(t) { return [0,2,3,5,7,8,10].map(i => (t+i)%12); }
function parsePiano(svg) {
  const fills = [...svg.matchAll(/fill="(#[0-9A-Fa-f]+)"/g)].map(m => m[1]);
  // rect fills only: first 12 are keys (7 white + 5 black); text has no fill=#7EB...
  const rectFills = [...svg.matchAll(/<rect[^>]*fill="([^"]+)"/g)].map(m => m[1]);
  const whiteLit = WHITE.filter((_, i) => rectFills[i] === "#7EB6FF");
  const blackLit = BLACK_KEYS.filter((_, i) => rectFills[7+i] === "#3D7EDB").map(b => b.sharp);
  return { whiteLit, blackLit, pcs: new Set([
    ...whiteLit.map(n => NOTE_PC[n]),
    ...blackLit.map(n => NOTE_PC[n]),
  ])};
}

function audit(meta, mode) {
  const fails = [];
  const notes = meta.notes;
  for (const n of notes) if (NOTE_PC[n] === undefined) fails.push(`missing NOTE_PC[${n}]`);
  const pcs = notes.map(n => NOTE_PC[n]);
  const uniq = new Set(pcs);
  if (uniq.size !== 7) fails.push(`unique pcs ${uniq.size}`);
  const tonic = NOTE_PC[notes[0]];
  const exp = new Set(mode === "major" ? expectedMajor(tonic) : expectedMinor(tonic));
  if ([...exp].sort().join() !== [...uniq].sort().join()) fails.push(`scale pcs mismatch`);
  const svg = drawPianoSVG(notes, { width: 280, height: 90 });
  const piano = parsePiano(svg);
  if (piano.pcs.size !== 7) fails.push(`piano lit ${piano.pcs.size} keys`);
  if ([...exp].sort().join() !== [...piano.pcs].sort().join()) {
    fails.push(`piano pcs ${[...piano.pcs]} != scale; white=${piano.whiteLit} black=${piano.blackLit}`);
  }
  // no extras: white G/A must not light when only G#/A# in scale
  for (const w of WHITE) {
    const lit = piano.whiteLit.includes(w);
    const should = uniq.has(NOTE_PC[w]);
    if (lit !== should) fails.push(`white ${w} lit=${lit} should=${should}`);
  }
  const chords = mode === "major" ? buildMajorChords(notes) : buildMinorChords(notes);
  const quals = mode === "major"
    ? ["maj","min","min","maj","maj","min","dim"]
    : ["min","dim","maj","min","min","maj","maj"];
  chords.forEach((c, i) => {
    const root = NOTE_PC[c.notes[0]];
    const iv = c.notes.slice(1).map(n => (NOTE_PC[n] - root + 12) % 12);
    const want = quals[i] === "maj" ? [4,7] : quals[i] === "min" ? [3,7] : [3,6];
    if (iv[0] !== want[0] || iv[1] !== want[1]) fails.push(`${c.deg} iv ${iv}`);
    for (const n of c.notes) if (NOTE_PC[n] === undefined) fails.push(`${c.deg} bad note ${n}`);
    for (const v of c.variants) {
      const m = v.match(/=\s*(.+)$/);
      if (m && NOTE_PC[m[1].trim()] === undefined) fails.push(`${c.deg} variant ${v}`);
    }
  });
  const rel = findRelNotes(mode, meta.relShort);
  for (const [genre, rows] of GENRE_TEMPLATES) {
    for (const [roman] of rows) {
      const ex = expandProgression(roman, mode, notes, rel);
      if (/^(I|ii|iii|IV|V|vi|viio|i|iio|III|iv|v|VI|VII|bVII)7?$/.test(ex.split("–").find(Boolean) || "")) {
        fails.push(`unexpanded ${genre} ${roman} -> ${ex}`);
      }
    }
  }
  relativeFootnote(mode, notes, meta.relLabel);
  return { display: meta.display, whiteLit: piano.whiteLit, blackLit: piano.blackLit, fails };
}

let pass = 0, fail = 0;
const results = [];
for (const k of MAJOR_KEYS) results.push(audit(k, "major"));
for (const k of MINOR_KEYS) results.push(audit(k, "minor"));
for (const r of results) {
  if (r.fails.length) {
    fail++;
    console.log(`FAIL  ${r.display}`);
    r.fails.forEach(f => console.log(`      - ${f}`));
  } else {
    pass++;
    console.log(`PASS  ${r.display.padEnd(12)} white=${r.whiteLit.join(",")||"-"} black=${r.blackLit.join(",")||"-"}`);
  }
}
console.log(`\n=== ${pass}/24 pass, ${fail}/24 fail ===`);
// F# ground truth
const fsMaj = results.find(r => r.display === "F# Major");
const okFs = fsMaj && fsMaj.whiteLit.join() === "F,B" && fsMaj.blackLit.join() === "C#,D#,F#,G#,A#";
console.log(`F# Major ground truth: ${okFs ? "OK" : "BAD"} white=${fsMaj.whiteLit} black=${fsMaj.blackLit}`);
process.exit(fail || !okFs ? 1 : 0);
