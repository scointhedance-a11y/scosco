// 問題データの整合性チェック: node tests/validate.js
const assert = require("assert");
const { SUBJECTS, QUESTIONS } = require("../js/questions.js");

const codes = new Set(SUBJECTS.map((s) => s.code));
const ids = new Set();

for (const q of QUESTIONS) {
  assert.ok(!ids.has(q.id), `ID が重複しています: ${q.id}`);
  ids.add(q.id);
  assert.ok(codes.has(q.subject), `${q.id}: 科目コードが不正です (${q.subject})`);
  assert.ok(q.id.startsWith(q.subject), `${q.id}: ID の先頭と科目コードが一致しません`);
  assert.ok(q.q && q.exp, `${q.id}: 問題文または解説が空です`);
  assert.ok(Array.isArray(q.choices) && q.choices.length >= 2 && q.choices.length <= 5, `${q.id}: 選択肢は2〜5個にしてください`);
  assert.strictEqual(new Set(q.choices).size, q.choices.length, `${q.id}: 選択肢が重複しています`);
  assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, `${q.id}: answer が範囲外です`);
}
for (const s of SUBJECTS) {
  assert.ok(QUESTIONS.some((q) => q.subject === s.code), `${s.code} ${s.name}: 問題がありません`);
}

console.log(`OK: ${QUESTIONS.length}問 / ${SUBJECTS.length}科目`);
