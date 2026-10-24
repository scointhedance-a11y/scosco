const test = require("node:test");
const assert = require("node:assert");
const C = require("../js/core.js");

const DAY = C.DAY;
const T0 = new Date(2026, 9, 24, 9, 0, 0).getTime();

test("間隔反復: 覚えていたら箱が上がり、忘れたら箱 0 に戻る", () => {
  const s = C.emptyState();
  let c = C.srsReview(s, "verify", 2, T0);
  assert.strictEqual(c.box, 1);
  assert.strictEqual(c.due, T0 + DAY);
  c = C.srsReview(s, "verify", 2, T0 + DAY);
  assert.strictEqual(c.box, 2);
  assert.strictEqual(c.due, T0 + DAY + 3 * DAY);
  c = C.srsReview(s, "verify", 0, T0 + 5 * DAY);
  assert.strictEqual(c.box, 0);
  assert.strictEqual(c.due, T0 + 5 * DAY);
});

test("間隔反復: あやふやは箱を据え置くが、最短でも翌日", () => {
  const s = C.emptyState();
  assert.strictEqual(C.srsReview(s, "a", 1, T0).box, 1);
  s.srs.b = { box: 3, due: T0, seen: 3 };
  assert.strictEqual(C.srsReview(s, "b", 1, T0).box, 3);
});

test("間隔反復: 最上位の箱を超えない", () => {
  const s = C.emptyState();
  for (let i = 0; i < 10; i++) C.srsReview(s, "x", 2, T0);
  assert.strictEqual(s.srs.x.box, C.SRS_INTERVALS.length - 1);
});

test("出題キュー: 期限切れを先に、新出は上限まで", () => {
  const s = C.emptyState();
  s.srs.a = { box: 1, due: T0 - 2 * DAY, seen: 1 };
  s.srs.b = { box: 1, due: T0 - DAY, seen: 1 };
  s.srs.c = { box: 2, due: T0 + DAY, seen: 1 };
  const q = C.srsQueue(s, ["a", "b", "c", "d", "e", "f"], T0, 4, 1);
  assert.deepStrictEqual(q, ["a", "b", "d"]);
});

test("選択肢のシャッフル: 正解の位置を追従し、fixed は並べ替えない", () => {
  const q = { id: "x", choices: ["a", "b", "c", "d"], a: 0 };
  for (let i = 0; i < 20; i++) {
    const s = C.shuffleChoices(q);
    assert.strictEqual(s.choices[s.a], "a");
    assert.deepStrictEqual([...s.choices].sort(), ["a", "b", "c", "d"]);
  }
  const fixed = { id: "y", choices: ["[1]", "[2]", "[3]", "[4]"], a: 2, fixed: true };
  assert.deepStrictEqual(C.shuffleChoices(fixed).choices, fixed.choices);
  assert.strictEqual(q.a, 0, "元の問題を書き換えない");
});

test("優先順位: 前回不正解 → 未出題 → 正答済み", () => {
  const items = [{ id: "ok" }, { id: "new" }, { id: "ng" }];
  const ans = {
    ok: { n: 1, ok: 1, lastOk: true, last: 1 },
    ng: { n: 2, ok: 1, lastOk: false, last: 2 }
  };
  assert.deepStrictEqual(C.prioritize(items, ans, () => 0.5).map((x) => x.id), ["ng", "new", "ok"]);
});

test("スコア換算: 単調増加で 5 点刻み、上限 495", () => {
  let prev = -1;
  for (let a = 0; a <= 1.0001; a += 0.01) {
    for (const sec of ["L", "R"]) {
      const v = C.scaleScore(sec, a);
      assert.strictEqual(v % 5, 0);
      assert.ok(v <= 495 && v >= 5);
    }
    const l = C.scaleScore("L", a);
    assert.ok(l >= prev);
    prev = l;
  }
  assert.strictEqual(C.scaleScore("L", 0.8), 425);
  assert.strictEqual(C.scaleScore("R", 1), 495);
});

test("推定: 各セクションが最低問題数に満たなければ合計を出さない", () => {
  const s = C.emptyState();
  for (let i = 0; i < 20; i++) C.recordAnswer(s, "L" + i, "L", i < 18, T0);
  assert.strictEqual(C.estimate(s.answers).total, null);
  for (let i = 0; i < 20; i++) C.recordAnswer(s, "R" + i, "R", i < 16, T0);
  const e = C.estimate(s.answers);
  assert.strictEqual(e.L.score, C.scaleScore("L", 0.9));
  assert.strictEqual(e.R.score, C.scaleScore("R", 0.8));
  assert.strictEqual(e.total, e.L.score + e.R.score);
});

test("連続学習日数: 今日まだでも昨日までの連続を数える", () => {
  const log = [{ at: T0 - DAY }, { at: T0 - 2 * DAY }, { at: T0 - 4 * DAY }];
  assert.strictEqual(C.streak(log, T0), 2);
  log.push({ at: T0 });
  assert.strictEqual(C.streak(log, T0), 3);
  assert.strictEqual(C.streak([], T0), 0);
});

test("保存と読み込み: 壊れたデータや例外でも初期状態で動く", () => {
  assert.deepStrictEqual(C.load(null), C.emptyState());
  assert.deepStrictEqual(C.load({ getItem: () => "{broken" }), C.emptyState());
  assert.deepStrictEqual(C.load({ getItem: () => { throw new Error("blocked"); } }), C.emptyState());
  assert.strictEqual(C.save({ setItem: () => { throw new Error("quota"); } }, C.emptyState()), false);
  const mem = {};
  const store = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  const s = C.emptyState();
  C.recordAnswer(s, "p5-001", "R", true, T0);
  s.settings.rate = 1.1;
  C.save(store, s);
  const back = C.load(store);
  assert.strictEqual(back.answers["p5-001"].ok, 1);
  assert.strictEqual(back.settings.rate, 1.1);
  assert.strictEqual(back.settings.accent, "mix");
});

test("語数カウント", () => {
  assert.strictEqual(C.wordCount("Dear colleagues, the lot's closed on Sept. 22."), 8);
});
