const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["part5", "part2", "part34", "part7", "vocab"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/data", f + ".js"), "utf8"), ctx);
}
const D = ctx.window.TOEIC_DATA;

function allQuestions() {
  return [
    ...D.part5, ...D.part2,
    ...D.part34.flatMap((s) => s.questions),
    ...D.part7.flatMap((s) => s.questions)
  ];
}

test("問題IDが重複していない", () => {
  const ids = allQuestions().map((q) => q.id).concat(D.part34.map((s) => s.id), D.part7.map((s) => s.id));
  assert.strictEqual(new Set(ids).size, ids.length);
});

test("すべての問題に正しい選択肢数・正解・解説がある", () => {
  for (const q of allQuestions()) {
    const n = q.id.startsWith("p2-") ? 3 : 4;
    assert.strictEqual(q.choices.length, n, q.id);
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < n, q.id);
    assert.ok(q.q && q.exp, q.id);
    assert.strictEqual(new Set(q.choices).size, n, q.id + " の選択肢が重複");
  }
});

test("Part 5 の問題文に空所がある", () => {
  for (const q of D.part5) {
    assert.match(q.q, /_{3,}/, q.id);
    assert.ok(q.cat, q.id);
  }
});

test("Part 3/4 の話者と Part 7 の本文", () => {
  for (const s of D.part34) {
    assert.ok(s.lines.length > 0);
    for (const l of s.lines) assert.ok(["M", "W", "N"].includes(l.s), s.id);
  }
  for (const s of D.part7) assert.ok(s.passage.length > 200, s.id);
});

test("単語: 見出し語が重複せず、例文に見出し語を含む", () => {
  const words = D.vocab.map((v) => v[0]);
  assert.strictEqual(new Set(words).size, words.length);
  for (const [w, ja, ex] of D.vocab) {
    assert.ok(ja, w);
    const stem = w.slice(0, Math.max(4, w.length - 2)).toLowerCase();
    assert.ok(ex.toLowerCase().includes(stem), w + ": " + ex);
  }
});
