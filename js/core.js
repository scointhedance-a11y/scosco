// 学習記録・間隔反復・スコア推定などの画面に依存しないロジック
(function (root) {
  "use strict";

  var STORAGE_KEY = "toeic960:v1";
  var DAY = 24 * 60 * 60 * 1000;
  // Leitner 方式の復習間隔（日）。箱 0 は当日中にもう一度。
  var SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

  function emptyState() {
    return { answers: {}, srs: {}, log: [], settings: { rate: 1, accent: "mix" } };
  }

  function load(storage) {
    try {
      var raw = storage && storage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var s = JSON.parse(raw);
      var base = emptyState();
      return {
        answers: s.answers || base.answers,
        srs: s.srs || base.srs,
        log: s.log || base.log,
        settings: Object.assign(base.settings, s.settings || {})
      };
    } catch (e) {
      return emptyState();
    }
  }

  function save(storage, state) {
    try {
      if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  // 1問の解答を記録する。section は "L" / "R"
  function recordAnswer(state, id, section, correct, now) {
    var r = state.answers[id] || { n: 0, ok: 0, miss: 0, last: 0, lastOk: false, section: section };
    r.n += 1;
    if (correct) r.ok += 1; else r.miss += 1;
    r.last = now;
    r.lastOk = correct;
    r.section = section;
    state.answers[id] = r;
    return r;
  }

  function dayKey(ts) {
    var d = new Date(ts);
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function logSession(state, entry) {
    state.log.push(entry);
    if (state.log.length > 500) state.log = state.log.slice(-500);
  }

  // 今日を含めて連続で学習した日数
  function streak(log, now) {
    var days = {};
    log.forEach(function (e) { days[dayKey(e.at)] = true; });
    var count = 0;
    var t = now;
    if (!days[dayKey(t)]) t -= DAY; // 今日まだなら昨日から数える
    while (days[dayKey(t)]) { count++; t -= DAY; }
    return count;
  }

  // 間隔反復。grade: 2=覚えていた（箱を一つ上げる）, 1=あやふや（箱は据え置き、最短でも翌日）, 0=忘れた（箱 0 へ）
  function srsReview(state, word, grade, now) {
    var c = state.srs[word] || { box: 0, due: now, seen: 0 };
    c.seen += 1;
    if (grade >= 2) c.box = Math.min(c.box + 1, SRS_INTERVALS.length - 1);
    else if (grade === 1) c.box = Math.max(c.box, 1);
    else c.box = 0;
    c.due = now + SRS_INTERVALS[c.box] * DAY;
    state.srs[word] = c;
    return c;
  }

  // 復習期限が来たカード → 未学習カードの順に最大 limit 枚
  function srsQueue(state, words, now, limit, newLimit) {
    var due = [], fresh = [];
    words.forEach(function (w) {
      var c = state.srs[w];
      if (!c) fresh.push(w);
      else if (c.due <= now) due.push(w);
    });
    due.sort(function (a, b) { return state.srs[a].due - state.srs[b].due; });
    var q = due.slice(0, limit);
    var room = Math.min(limit - q.length, newLimit == null ? limit : newLimit);
    return q.concat(fresh.slice(0, Math.max(0, room)));
  }

  function srsStats(state, words, now) {
    var s = { fresh: 0, due: 0, learning: 0, mastered: 0 };
    words.forEach(function (w) {
      var c = state.srs[w];
      if (!c) s.fresh++;
      else {
        if (c.due <= now) s.due++;
        if (c.box >= 4) s.mastered++; else s.learning++;
      }
    });
    return s;
  }

  // 出題順: 前回間違えた問題 → 未出題 → 正答率の低い順 → 古い順
  function prioritize(items, answers, rand) {
    rand = rand || Math.random;
    var keyed = items.map(function (it) {
      var r = answers[it.id];
      var tier, score;
      if (r && !r.lastOk) { tier = 0; score = r.ok / r.n; }
      else if (!r) { tier = 1; score = 0; }
      else { tier = 2; score = r.ok / r.n; }
      return { it: it, tier: tier, score: score, last: r ? r.last : 0, j: rand() };
    });
    keyed.sort(function (a, b) {
      return a.tier - b.tier || a.score - b.score || a.last - b.last || a.j - b.j;
    });
    return keyed.map(function (k) { return k.it; });
  }

  function shuffle(arr, rand) {
    rand = rand || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // 表示用に選択肢を並べ替えた問題のコピーを返す。fixed の問題（文挿入位置など）はそのまま
  function shuffleChoices(q, rand) {
    if (q.fixed) return q;
    var order = shuffle(q.choices.map(function (_, i) { return i; }), rand);
    var copy = Object.assign({}, q);
    copy.choices = order.map(function (i) { return q.choices[i]; });
    copy.a = order.indexOf(q.a);
    return copy;
  }

  // 正答率 → セクションスコアの目安（公式の換算表ではない）
  var SCALE = {
    L: [[0, 5], [0.3, 130], [0.5, 250], [0.6, 310], [0.7, 365], [0.8, 425], [0.85, 450], [0.9, 475], [0.95, 495], [1, 495]],
    R: [[0, 5], [0.3, 100], [0.5, 215], [0.6, 280], [0.7, 340], [0.8, 400], [0.85, 430], [0.9, 460], [0.95, 485], [1, 495]]
  };

  function scaleScore(section, acc) {
    var t = SCALE[section];
    acc = Math.max(0, Math.min(1, acc));
    for (var i = 1; i < t.length; i++) {
      if (acc <= t[i][0]) {
        var a = t[i - 1], b = t[i];
        var v = a[1] + (b[1] - a[1]) * (acc - a[0]) / (b[0] - a[0]);
        return Math.round(v / 5) * 5;
      }
    }
    return 495;
  }

  // 直近の解答から推定。各問題の最新の結果を使う
  var MIN_SAMPLE = 15;
  function estimate(answers) {
    var tally = { L: { n: 0, ok: 0 }, R: { n: 0, ok: 0 } };
    Object.keys(answers).forEach(function (id) {
      var r = answers[id];
      var t = tally[r.section];
      if (!t) return;
      t.n++;
      if (r.lastOk) t.ok++;
    });
    function part(sec) {
      var t = tally[sec];
      if (t.n < MIN_SAMPLE) return { n: t.n, acc: t.n ? t.ok / t.n : null, score: null };
      var acc = t.ok / t.n;
      return { n: t.n, acc: acc, score: scaleScore(sec, acc) };
    }
    var L = part("L"), R = part("R");
    return { L: L, R: R, total: L.score != null && R.score != null ? L.score + R.score : null, minSample: MIN_SAMPLE };
  }

  function wordCount(text) {
    var m = text.match(/[A-Za-z0-9'’\-]+/g);
    return m ? m.length : 0;
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY, DAY: DAY, SRS_INTERVALS: SRS_INTERVALS,
    emptyState: emptyState, load: load, save: save,
    recordAnswer: recordAnswer, logSession: logSession, streak: streak, dayKey: dayKey,
    srsReview: srsReview, srsQueue: srsQueue, srsStats: srsStats,
    prioritize: prioritize, shuffle: shuffle, shuffleChoices: shuffleChoices,
    scaleScore: scaleScore, estimate: estimate, wordCount: wordCount
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TOEIC_CORE = api;
})(this);
