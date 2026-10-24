// 画面の描画と操作
(function () {
  "use strict";

  var D = window.TOEIC_DATA, C = window.TOEIC_CORE, SP = window.TOEIC_SPEECH;
  var LS = null;
  try { LS = window.localStorage; } catch (e) { LS = null; }
  var S = C.load(LS);
  function persist() { C.save(LS, S); }

  var app = document.getElementById("app");
  var LETTERS = ["A", "B", "C", "D"];
  var TARGET = { p5: 20, p7: 60 };   // 1問あたりの目標秒数
  var KIND_LABEL = { p2: "Part 2", p34: "Part 3/4", p5: "Part 5", p7: "Part 7" };
  var HASH_VIEWS = ["home", "part2", "part34", "part5", "part7", "vocab", "review", "mock", "stats", "plan"];

  // 問題IDから出題元を引けるようにしておく
  var INDEX = {};
  D.part5.forEach(function (q) { INDEX[q.id] = { kind: "p5", section: "R", q: q }; });
  D.part2.forEach(function (q) { INDEX[q.id] = { kind: "p2", section: "L", q: q }; });
  D.part34.forEach(function (s) { s.questions.forEach(function (q) { INDEX[q.id] = { kind: "p34", section: "L", q: q, set: s }; }); });
  D.part7.forEach(function (s) { s.questions.forEach(function (q) { INDEX[q.id] = { kind: "p7", section: "R", q: q, set: s }; }); });
  var WORDS = D.vocab.map(function (v) { return v[0]; });
  var VOCAB = {};
  D.vocab.forEach(function (v) { VOCAB[v[0]] = v; });

  var view = { name: "home" };
  var quiz = null, cards = null, ticker = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function now() { return Date.now(); }
  function pct(x) { return x == null ? "–" : Math.round(x * 100) + "%"; }
  function fmtSec(s) {
    s = Math.max(0, Math.round(s));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  // ---------- 集計 ----------
  function accBy(filter) {
    var n = 0, ok = 0;
    Object.keys(S.answers).forEach(function (id) {
      var ix = INDEX[id];
      if (!ix || !filter(ix, id)) return;
      n++;
      if (S.answers[id].lastOk) ok++;
    });
    return { n: n, ok: ok, acc: n ? ok / n : null };
  }
  function wrongIds() {
    return Object.keys(S.answers).filter(function (id) { return INDEX[id] && !S.answers[id].lastOk; });
  }
  function todayCount() {
    var k = C.dayKey(now()), n = 0;
    S.log.forEach(function (e) { if (C.dayKey(e.at) === k) n += e.total; });
    return n;
  }

  // ---------- 画面遷移 ----------
  function go(name, opts) {
    SP.stop();
    stopTicker();
    view = Object.assign({ name: name }, opts || {});
    if (HASH_VIEWS.indexOf(name) >= 0) {
      try { history.replaceState(null, "", name === "home" ? location.pathname + location.search : "#" + name); } catch (e) { /* 埋め込み環境では無視 */ }
    }
    render();
    window.scrollTo(0, 0);
  }

  function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }

  function nav() {
    var tabs = [["home", "ホーム"], ["vocab", "単語"], ["stats", "記録"], ["plan", "攻略法"]];
    var active = { quiz: "home", summary: "home" }[view.name] || view.name;
    return '<nav class="tabs" aria-label="メニュー">' + tabs.map(function (t) {
      var on = t[0] === active || (t[0] === "home" && ["part2", "part34", "part5", "part7", "review", "mock"].indexOf(active) >= 0);
      return '<button class="tab' + (on ? " on" : "") + '" data-go="' + t[0] + '"' + (on ? ' aria-current="page"' : "") + ">" + t[1] + "</button>";
    }).join("") + "</nav>";
  }

  function render() {
    var body;
    switch (view.name) {
      case "part5": body = viewPart5(); break;
      case "part2": body = viewListeningSetup("part2"); break;
      case "part34": body = viewListeningSetup("part34"); break;
      case "part7": body = viewPart7(); break;
      case "review": body = viewReview(); break;
      case "mock": body = viewMock(); break;
      case "vocab": body = cards ? viewCard() : viewVocab(); break;
      case "stats": body = viewStats(); break;
      case "plan": body = viewPlan(); break;
      case "quiz": body = viewQuiz(); break;
      case "summary": body = viewSummary(); break;
      default: body = viewHome();
    }
    app.innerHTML =
      '<header class="top"><div class="top-in">' +
      '<button class="brand" data-go="home" aria-label="ホームへ"><span class="brand-mark" aria-hidden="true"><i></i><i class="f"></i><i></i><i></i></span>' +
      '<span>TOEIC 960 トレーナー</span></button>' + nav() + "</div></header>" +
      '<main class="wrap">' + body + "</main>";
    afterRender();
  }

  // ---------- ホーム ----------
  function scoreBlock(compact) {
    var est = C.estimate(S.answers);
    var total = est.total;
    var need = Math.max(0, est.minSample - est.L.n) + Math.max(0, est.minSample - est.R.n);
    var bar = function (sec, part) {
      var w = part.score == null ? 0 : (part.score / 495) * 100;
      var goal = sec === "L" ? 490 : 470;
      return '<div class="sec-row"><span class="sec-name">' + (sec === "L" ? "Listening" : "Reading") + "</span>" +
        '<span class="meter" role="img" aria-label="' + (part.score == null ? "未推定" : part.score + "点") + '"><span style="width:' + w + '%"></span>' +
        '<i class="goal" style="left:' + (goal / 495) * 100 + '%" title="目標 ' + goal + '"></i></span>' +
        '<span class="num">' + (part.score == null ? "—" : part.score) + '<small>/495</small></span></div>' +
        (compact ? "" : '<div class="sec-note">' + part.n + " 問 · 正答率 " + pct(part.acc) + " · 目標 " + goal + "</div>");
    };
    return '<section class="score">' +
      '<div class="score-head"><div><div class="eyebrow">推定スコア</div>' +
      '<div class="big">' + (total == null ? "—" : total) + '<span class="of"> / 990</span></div></div>' +
      '<div class="target"><div class="eyebrow">目標</div><div class="big t">960</div></div></div>' +
      bar("L", est.L) + bar("R", est.R) +
      '<p class="fine">' + (total == null
        ? "Listening・Reading それぞれ " + est.minSample + " 問以上解くと推定が出ます（あと " + need + " 問）。"
        : "各問題の最新の結果から換算した目安です。公式の換算表ではありません。") + "</p></section>";
  }

  function viewHome() {
    var vs = C.srsStats(S, WORDS, now());
    var wrong = wrongIds().length;
    var streak = C.streak(S.log, now());
    var p5w = weakestCategory();
    var menu = [
      { go: "vocab", t: "単語 20 枚", d: vs.due ? "復習期限の単語が " + vs.due + " 語あります" : "新しい単語を覚える", m: "約5分" },
      { go: "part5", t: "Part 5 を 10 問", d: p5w ? "弱点：" + p5w.cat + "（正答率 " + pct(p5w.acc) + "）" : "1問20秒で解き切る", m: "約4分" },
      { go: wrong ? "review" : "part2", t: wrong ? "間違いノート" : "Part 2 を 10 問", d: wrong ? wrong + " 問が未克服です" : "間接応答に慣れる", m: "約5分" }
    ];
    var modes = [
      { go: "part2", k: "Listening", t: "Part 2 応答問題", d: "音声のみで解く。間接応答を見抜く", n: D.part2.length + " 問" },
      { go: "part34", k: "Listening", t: "Part 3/4 会話・説明文", d: "設問の先読みから言い換えを拾う", n: D.part34.length + " セット" },
      { go: "part5", k: "Reading", t: "Part 5 短文穴埋め", d: "1問20秒。品詞・語法・構文", n: D.part5.length + " 問" },
      { go: "part7", k: "Reading", t: "Part 7 読解", d: "1問1分。読む速度(WPM)も計測", n: D.part7.length + " 文書" },
      { go: "mock", k: "総合", t: "ミニ模試", d: "L と R を通しで解いて換算", n: "約25問" },
      { go: "review", k: "復習", t: "間違いノート", d: "最後に間違えた問題だけを解き直す", n: wrong + " 問" }
    ];
    return scoreBlock(false) +
      '<section class="chips-row">' +
      chip("連続学習", streak + " 日") + chip("今日の解答", todayCount() + " 問") +
      chip("単語の復習", vs.due + " 語") + chip("未克服", wrong + " 問") + "</section>" +
      '<section><h2>今日のメニュー</h2><ol class="menu">' + menu.map(function (m, i) {
        return '<li><button class="menu-item" data-go="' + m.go + '"><span class="step">' + (i + 1) + '</span>' +
          '<span class="mi-body"><b>' + m.t + "</b><span>" + esc(m.d) + '</span></span><span class="mi-min">' + m.m + "</span></button></li>";
      }).join("") + "</ol></section>" +
      '<section><h2>練習モード</h2><div class="modes">' + modes.map(function (m) {
        return '<button class="mode" data-go="' + m.go + '"><span class="kicker">' + m.k + "</span><b>" + m.t + "</b><span>" + m.d + '</span><span class="count">' + m.n + "</span></button>";
      }).join("") + "</div></section>";
  }

  function chip(label, value) {
    return '<div class="stat"><span>' + label + "</span><b>" + value + "</b></div>";
  }

  function p5Categories() {
    var cats = [];
    D.part5.forEach(function (q) { if (cats.indexOf(q.cat) < 0) cats.push(q.cat); });
    return cats.map(function (cat) {
      var a = accBy(function (ix) { return ix.kind === "p5" && ix.q.cat === cat; });
      var total = D.part5.filter(function (q) { return q.cat === cat; }).length;
      return { cat: cat, n: a.n, acc: a.acc, total: total };
    });
  }
  function weakestCategory() {
    var c = p5Categories().filter(function (x) { return x.n >= 2; });
    c.sort(function (a, b) { return a.acc - b.acc; });
    return c.length && c[0].acc < 0.9 ? c[0] : null;
  }

  // ---------- 各モードの開始画面 ----------
  function countPicker(id, opts, def) {
    return '<div class="seg" role="radiogroup" aria-label="問題数">' + opts.map(function (n) {
      return '<label><input type="radio" name="' + id + '" value="' + n + '"' + (n === def ? " checked" : "") + "><span>" + n + "</span></label>";
    }).join("") + "</div>";
  }

  function viewPart5() {
    var cats = p5Categories();
    return '<section class="setup"><div class="eyebrow">Reading</div><h1>Part 5 短文穴埋め</h1>' +
      '<p class="lead">本番は30問を10分以内で解くのが目安です。1問20秒を超えるとタイマーの色が変わります。前回間違えた問題と未出題の問題から優先して出題します。</p>' +
      '<h3>分野</h3><div class="cats">' + cats.map(function (c) {
        return '<label class="cat"><input type="checkbox" name="p5cat" value="' + esc(c.cat) + '" checked><span><b>' + esc(c.cat) + "</b><small>" +
          c.total + " 問 · " + (c.n ? "正答率 " + pct(c.acc) : "未解答") + "</small></span></label>";
      }).join("") + "</div>" +
      '<h3>問題数</h3>' + countPicker("p5n", [10, 20, 30], 10) +
      '<div class="actions"><button class="primary" data-act="start-p5">始める</button></div></section>';
  }

  function listeningSettings() {
    var acc = S.settings.accent;
    var opts = [["mix", "ランダム"]].concat(SP.ACCENTS.map(function (a) { return [a, SP.ACCENT_LABEL[a] + "（" + a + "）"]; }));
    var rates = [0.9, 1, 1.1, 1.25];
    return '<div class="settings"><label for="accent">発音</label><select id="accent" data-set="accent">' + opts.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === acc ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("") + '</select><label for="rate">速さ</label><select id="rate" data-set="rate">' + rates.map(function (r) {
      return '<option value="' + r + '"' + (r === S.settings.rate ? " selected" : "") + ">" + r + "x</option>";
    }).join("") + "</select></div>" +
      (SP.available ? "" : '<p class="warn">このブラウザは音声合成に対応していないため、スクリプトを表示して解きます。</p>');
  }

  function viewListeningSetup(which) {
    if (which === "part2") {
      return '<section class="setup"><div class="eyebrow">Listening</div><h1>Part 2 応答問題</h1>' +
        '<p class="lead">問題文も選択肢も印刷されない、音だけのパートです。900点台では「知らない」「まだ決まっていない」「〜に聞いて」のような間接的な応答を即座に選べるかで差がつきます。スクリプトは解答後に表示されます。</p>' +
        listeningSettings() + "<h3>問題数</h3>" + countPicker("p2n", [10, 20, 30], 10) +
        '<div class="actions"><button class="primary" data-act="start-p2">始める</button></div></section>';
    }
    return '<section class="setup"><div class="eyebrow">Listening</div><h1>Part 3/4 会話・説明文</h1>' +
      '<p class="lead">音声が流れる前に3つの設問を先読みし、「何を聞き取るか」を決めてから聞きます。正解の選択肢は本文の言い換えになっていることがほとんどです。</p>' +
      listeningSettings() + "<h3>セット数</h3>" + countPicker("p34n", [2, 3, 5], 2) +
      '<div class="actions"><button class="primary" data-act="start-p34">始める</button></div></section>';
  }

  function viewPart7() {
    return '<section class="setup"><div class="eyebrow">Reading</div><h1>Part 7 読解</h1>' +
      '<p class="lead">本番では 54 問を約 55 分で解きます。1問1分が目安です。最初の設問に答えるまでの時間から、本文を読む速度（WPM: 1分あたりの語数）を計測します。960点を狙うなら 150 WPM 以上が目標です。</p>' +
      "<h3>文書数</h3>" + countPicker("p7n", [1, 2, 3], 2) +
      '<div class="actions"><button class="primary" data-act="start-p7">始める</button></div></section>';
  }

  function viewReview() {
    var ids = wrongIds();
    var by = { p2: 0, p34: 0, p5: 0, p7: 0 };
    ids.forEach(function (id) { by[INDEX[id].kind]++; });
    return '<section class="setup"><div class="eyebrow">復習</div><h1>間違いノート</h1>' +
      '<p class="lead">最後に解いたときに間違えた問題です。正解すると、このノートから外れます。</p>' +
      '<div class="chips-row">' + Object.keys(by).map(function (k) { return chip(KIND_LABEL[k], by[k] + " 問"); }).join("") + "</div>" +
      (ids.length
        ? '<div class="actions"><button class="primary" data-act="start-review">' + ids.length + " 問を解き直す</button></div>"
        : '<p class="empty">未克服の問題はありません。練習モードで問題を解くと、間違えた問題がここに集まります。</p>') +
      "</section>";
  }

  function viewMock() {
    return '<section class="setup"><div class="eyebrow">総合</div><h1>ミニ模試</h1>' +
      '<p class="lead">Part 2 を 6 問、Part 3/4 を 1 セット、Part 5 を 10 問、Part 7 を 1 文書、本番と同じ順番で解きます。終了後に L と R の正答率をスコアに換算します。週に1回、仕上がりを確かめる用途に。</p>' +
      listeningSettings() +
      '<div class="actions"><button class="primary" data-act="start-mock">始める</button></div></section>';
  }

  // ---------- 出題 ----------
  function single(kind, section, q) { return { kind: kind, section: section, questions: [q] }; }
  function setGroup(kind, section, set, onlyIds) {
    var qs = onlyIds ? set.questions.filter(function (q) { return onlyIds.indexOf(q.id) >= 0; }) : set.questions;
    return { kind: kind, section: section, set: set, questions: qs };
  }
  function prioritizeSets(sets) {
    // セット内の問題の状態で並べ替える
    var pseudo = sets.map(function (s) {
      var anyWrong = s.questions.some(function (q) { var r = S.answers[q.id]; return r && !r.lastOk; });
      var anyNew = s.questions.some(function (q) { return !S.answers[q.id]; });
      return { set: s, rank: anyWrong ? 0 : anyNew ? 1 : 2 };
    });
    pseudo = C.shuffle(pseudo);
    pseudo.sort(function (a, b) { return a.rank - b.rank; });
    return pseudo.map(function (p) { return p.set; });
  }

  function radioVal(name, def) {
    var el = app.querySelector('input[name="' + name + '"]:checked');
    return el ? parseInt(el.value, 10) : def;
  }

  function startQuiz(title, mode, groups) {
    if (!groups.length) return;
    groups = groups.map(function (g) {
      return Object.assign({}, g, { questions: g.questions.map(function (q) { return C.shuffleChoices(q); }) });
    });
    quiz = { title: title, mode: mode, groups: groups, gi: 0, picks: {}, results: [], groupStart: now(), firstAt: null, wpm: [], started: now() };
    go("quiz");
  }

  var starters = {
    "start-p5": function () {
      var cats = Array.prototype.map.call(app.querySelectorAll('input[name="p5cat"]:checked'), function (el) { return el.value; });
      if (!cats.length) return;
      var n = radioVal("p5n", 10);
      var pool = D.part5.filter(function (q) { return cats.indexOf(q.cat) >= 0; });
      startQuiz("Part 5", "p5", C.prioritize(pool, S.answers).slice(0, n).map(function (q) { return single("p5", "R", q); }));
    },
    "start-p2": function () {
      var n = radioVal("p2n", 10);
      startQuiz("Part 2", "p2", C.prioritize(D.part2, S.answers).slice(0, n).map(function (q) { return single("p2", "L", q); }));
    },
    "start-p34": function () {
      var n = radioVal("p34n", 2);
      startQuiz("Part 3/4", "p34", prioritizeSets(D.part34).slice(0, n).map(function (s) { return setGroup("p34", "L", s); }));
    },
    "start-p7": function () {
      var n = radioVal("p7n", 2);
      startQuiz("Part 7", "p7", prioritizeSets(D.part7).slice(0, n).map(function (s) { return setGroup("p7", "R", s); }));
    },
    "start-review": function () {
      var ids = wrongIds();
      var groups = [], seenSets = {};
      ids.forEach(function (id) {
        var ix = INDEX[id];
        if (ix.set) {
          if (seenSets[ix.set.id]) return;
          seenSets[ix.set.id] = true;
          groups.push(setGroup(ix.kind, ix.section, ix.set, ids));
        } else groups.push(single(ix.kind, ix.section, ix.q));
      });
      var order = { p2: 0, p34: 1, p5: 2, p7: 3 };
      groups.sort(function (a, b) { return order[a.kind] - order[b.kind]; });
      startQuiz("間違いノート", "review", groups);
    },
    "start-mock": function () {
      var g = []
        .concat(C.prioritize(D.part2, S.answers).slice(0, 6).map(function (q) { return single("p2", "L", q); }))
        .concat(prioritizeSets(D.part34).slice(0, 1).map(function (s) { return setGroup("p34", "L", s); }))
        .concat(C.prioritize(D.part5, S.answers).slice(0, 10).map(function (q) { return single("p5", "R", q); }))
        .concat(prioritizeSets(D.part7).slice(0, 1).map(function (s) { return setGroup("p7", "R", s); }));
      startQuiz("ミニ模試", "mock", g);
    }
  };

  function totalQuestions() {
    return quiz.groups.reduce(function (n, g) { return n + g.questions.length; }, 0);
  }
  function doneQuestions() { return quiz.results.length; }

  function groupTarget(g) {
    var t = TARGET[g.kind];
    return t ? t * g.questions.length : null;
  }

  function audioSegments(g) {
    var accent = SP.accentFor(g.set ? g.set.id : g.questions[0].id, S.settings.accent);
    if (g.kind === "p2") {
      var q = g.questions[0];
      var segs = [{ text: q.q, accent: accent, pause: 700 }];
      q.choices.forEach(function (c, i) {
        segs.push({ text: LETTERS[i] + ".", accent: "en-US", pause: 150 });
        segs.push({ text: c, accent: accent, pause: 500 });
      });
      return segs;
    }
    var other = SP.ACCENTS[(SP.ACCENTS.indexOf(accent) + 1) % SP.ACCENTS.length];
    return g.set.lines.map(function (l) {
      // 会話では男女で発音の地域も変える（本番同様、話者ごとに違う英語を聞く）
      return { text: l.t, speaker: l.s, accent: l.s === "M" && S.settings.accent === "mix" ? other : accent, pause: 300 };
    });
  }

  function playCurrent() {
    var g = quiz.groups[quiz.gi];
    if (g.kind !== "p2" && g.kind !== "p34") return;
    var btn = app.querySelector("[data-act=play]");
    if (btn) btn.classList.add("playing");
    SP.play(audioSegments(g), S.settings.rate, function () {
      var b = app.querySelector("[data-act=play]");
      if (b) b.classList.remove("playing");
    });
  }

  function viewQuiz() {
    var g = quiz.groups[quiz.gi];
    var done = doneQuestions(), total = totalQuestions();
    var allAnswered = g.questions.every(function (q) { return quiz.picks[q.id] != null; });
    var isLast = quiz.gi === quiz.groups.length - 1;
    var target = groupTarget(g);
    var accent = SP.accentFor(g.set ? g.set.id : g.questions[0].id, S.settings.accent);
    // 解答し終えたら、その時点の経過時間で止めて表示する
    var elapsed = ((allAnswered && quiz.lastAt ? quiz.lastAt : now()) - quiz.groupStart) / 1000;

    var head = '<div class="qbar"><button class="ghost" data-act="quit">中断</button>' +
      '<div class="qmeta"><b>' + esc(quiz.title) + "</b>" + (quiz.title === KIND_LABEL[g.kind] ? "" : "<span>" + KIND_LABEL[g.kind] + "</span>") + "</div>" +
      '<div class="timer' + (target ? "" : " plain") + (target && elapsed > target ? " over" : "") + '" id="timer" aria-live="off">' + fmtSec(elapsed) + (target ? '<small> / ' + fmtSec(target) + "</small>" : "") + "</div></div>" +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><span style="width:' + (done / total) * 100 + '%"></span></div>';

    var ctx = "";
    if (g.kind === "p2" || g.kind === "p34") {
      var showScript = allAnswered || !SP.available;
      ctx = '<div class="listen"><button class="play" data-act="play" aria-label="音声を再生"><span class="tri" aria-hidden="true"></span></button>' +
        '<div><b>' + (g.kind === "p2" ? "Mark your answer on your answer sheet." : esc(g.set.title)) + "</b>" +
        '<span class="sub">' + (SP.available ? "発音：" + SP.ACCENT_LABEL[accent] + " · 速さ " + S.settings.rate + "x · ボタンで聞き直せます" : "音声なし：スクリプトを読んで解答") + "</span></div></div>";
      if (showScript) {
        ctx += '<details class="script"' + (allAnswered ? " open" : "") + "><summary>スクリプト</summary>" +
          (g.kind === "p2"
            ? "<p>" + esc(g.questions[0].q) + "</p><ol class=\"abc\">" + g.questions[0].choices.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ol>"
            : g.set.lines.map(function (l) { return '<p><span class="spk">' + (l.s === "N" ? "" : l.s + ":") + "</span> " + esc(l.t) + "</p>"; }).join("")) +
          "</details>";
      }
    } else if (g.kind === "p7") {
      ctx = '<article class="passage"><div class="ptype">' + esc(g.set.type) + " · " + C.wordCount(g.set.passage) + " words</div><pre>" + esc(g.set.passage) + "</pre></article>";
    }

    var qs = g.questions.map(function (q) { return questionBlock(g, q); }).join("");

    var foot = allAnswered
      ? '<div class="actions sticky"><button class="primary" data-act="next">' + (isLast ? "結果を見る" : "次へ") + ' <kbd>Enter</kbd></button></div>'
      : "";
    return '<section class="quiz ' + g.kind + '">' + head + ctx + '<div class="qs">' + qs + "</div>" + foot + "</section>";
  }

  function questionBlock(g, q) {
    var picked = quiz.picks[q.id];
    var answered = picked != null;
    var hideText = g.kind === "p2" && !answered && SP.available;
    var stem = g.kind === "p2" ? "" : '<p class="stem">' + esc(q.q).replace(/_{3,}/g, '<span class="blank">' + "&nbsp;".repeat(10) + "</span>") + "</p>";
    var opts = q.choices.map(function (c, i) {
      var cls = "opt";
      if (answered) {
        if (i === q.a) cls += " right";
        else if (i === picked) cls += " wrong";
        else cls += " dim";
      }
      return '<button class="' + cls + '" data-pick="' + i + '" data-q="' + q.id + '"' + (answered ? " disabled" : "") + ">" +
        '<span class="bubble" aria-hidden="true">' + LETTERS[i] + "</span>" +
        '<span class="otext">' + (hideText ? '<span class="hidden-text">(' + LETTERS[i] + ")</span>" : esc(c)) + "</span></button>";
    }).join("");
    var fb = "";
    if (answered) {
      var ok = picked === q.a;
      var res = quiz.results.filter(function (r) { return r.id === q.id; })[0];
      fb = '<div class="fb ' + (ok ? "ok" : "ng") + '"><b>' + (ok ? "正解" : "不正解 · 正解は (" + LETTERS[q.a] + ")") + "</b>" +
        (res && TARGET[g.kind] && g.questions.length === 1 ? '<span class="t">' + Math.round(res.sec) + " 秒" + (res.sec > TARGET[g.kind] ? "（目標 " + TARGET[g.kind] + " 秒超過）" : "") + "</span>" : "") +
        "<p>" + esc(q.exp) + "</p></div>";
    }
    return '<div class="qblock" id="q-' + q.id + '">' + stem + '<div class="opts">' + opts + "</div>" + fb + "</div>";
  }

  function pick(qid, i) {
    var g = quiz.groups[quiz.gi];
    if (quiz.picks[qid] != null) return;
    var q = g.questions.filter(function (x) { return x.id === qid; })[0];
    if (!q) return;
    var t = now();
    if (quiz.firstAt == null) {
      quiz.firstAt = t;
      if (g.kind === "p7") {
        var mins = (t - quiz.groupStart) / 60000;
        if (mins > 0.05) quiz.wpm.push(Math.round(C.wordCount(g.set.passage) / mins));
      }
    }
    quiz.picks[qid] = i;
    var ok = i === q.a;
    var sec = (t - (quiz.lastAt || quiz.groupStart)) / 1000;
    quiz.lastAt = t;
    quiz.results.push({ id: qid, ok: ok, sec: sec, kind: g.kind, section: g.section });
    C.recordAnswer(S, qid, g.section, ok, t);
    persist();
    var allAnswered = g.questions.every(function (x) { return quiz.picks[x.id] != null; });
    if (allAnswered) { stopTicker(); SP.stop(); }
    var y = window.scrollY;
    render();
    window.scrollTo(0, y);
    var fb = document.querySelector("#q-" + CSS.escape(qid) + " .fb");
    if (fb && g.questions.length === 1) fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function nextGroup() {
    SP.stop();
    if (quiz.gi >= quiz.groups.length - 1) return finishQuiz();
    quiz.gi++;
    quiz.groupStart = now();
    quiz.firstAt = null;
    quiz.lastAt = null;
    render();
    window.scrollTo(0, 0);
  }

  function finishQuiz() {
    var r = quiz.results;
    var correct = r.filter(function (x) { return x.ok; }).length;
    var sec = (now() - quiz.started) / 1000;
    C.logSession(S, { at: now(), mode: quiz.mode, total: r.length, correct: correct, sec: Math.round(sec) });
    persist();
    quiz.finished = { correct: correct, sec: sec };
    go("summary");
  }

  function viewSummary() {
    if (!quiz || !quiz.finished) return viewHome();
    var r = quiz.results, f = quiz.finished;
    var acc = r.length ? f.correct / r.length : 0;
    var lines = [];
    ["p5", "p7"].forEach(function (k) {
      var xs = r.filter(function (x) { return x.kind === k; });
      if (!xs.length) return;
      var avg = xs.reduce(function (s, x) { return s + x.sec; }, 0) / xs.length;
      lines.push(chip(KIND_LABEL[k] + " 平均", Math.round(avg) + " 秒/問"));
    });
    if (quiz.wpm.length) {
      var w = Math.round(quiz.wpm.reduce(function (a, b) { return a + b; }, 0) / quiz.wpm.length);
      lines.push(chip("読む速度", w + " WPM"));
    }
    var conv = "";
    if (quiz.mode === "mock") {
      var part = function (sec) {
        var xs = r.filter(function (x) { return x.section === sec; });
        var a = xs.filter(function (x) { return x.ok; }).length / xs.length;
        return { a: a, s: C.scaleScore(sec, a) };
      };
      var L = part("L"), R = part("R");
      conv = '<div class="conv"><div><span>Listening</span><b>' + L.s + "</b><small>" + pct(L.a) + "</small></div>" +
        "<div><span>Reading</span><b>" + R.s + "</b><small>" + pct(R.a) + "</small></div>" +
        '<div class="sum"><span>合計（目安）</span><b>' + (L.s + R.s) + "</b><small>目標 960</small></div></div>" +
        '<p class="fine">問題数が少ないため、ぶれ幅は大きめです。複数回の結果で判断してください。</p>';
    }
    var wrong = r.filter(function (x) { return !x.ok; });
    return '<section class="summary"><div class="eyebrow">' + esc(quiz.title) + " の結果</div>" +
      '<div class="result"><span class="big">' + f.correct + '<span class="of"> / ' + r.length + "</span></span>" +
      '<span class="acc">' + pct(acc) + "</span></div>" + conv +
      '<div class="chips-row">' + chip("所要時間", fmtSec(f.sec)) + lines.join("") + "</div>" +
      (wrong.length ? "<h2>間違えた問題</h2>" + wrong.map(function (x) {
        var q = INDEX[x.id].q;
        return '<div class="missed"><div class="mk">' + KIND_LABEL[x.kind] + "</div><p>" + esc(q.q) + "</p>" +
          '<p class="ans">正解：' + esc(q.choices[q.a]) + "</p><p class=\"exp\">" + esc(q.exp) + "</p></div>";
      }).join("") : '<p class="empty">全問正解です。</p>') +
      '<div class="actions"><button class="primary" data-act="again">同じモードをもう一度</button><button data-go="home">ホームへ</button></div></section>';
  }

  // ---------- 単語 ----------
  function viewVocab() {
    var st = C.srsStats(S, WORDS, now());
    var boxes = [0, 0, 0, 0, 0, 0];
    WORDS.forEach(function (w) { if (S.srs[w]) boxes[S.srs[w].box]++; });
    return '<section class="setup"><div class="eyebrow">Vocabulary</div><h1>単語カード</h1>' +
      '<p class="lead">900点台の Part 5・7 で差がつく ' + WORDS.length + ' 語。覚えていた単語ほど復習の間隔が 1日 → 3日 → 1週間 → 2週間 → 1か月 と延びます。1回 20 枚（新出は最大 10 語）。</p>' +
      '<div class="chips-row">' + chip("今日の復習", st.due + " 語") + chip("未学習", st.fresh + " 語") + chip("学習中", st.learning + " 語") + chip("定着", st.mastered + " 語") + "</div>" +
      '<div class="boxes" aria-label="復習間隔ごとの語数">' + boxes.map(function (n, i) {
        var label = ["当日", "1日", "3日", "1週", "2週", "1か月"][i];
        return '<div class="box"><b>' + n + "</b><span>" + label + "</span></div>";
      }).join("") + "</div>" +
      '<div class="actions"><button class="primary" data-act="start-cards">20 枚を始める</button></div></section>';
  }

  function startCards() {
    var q = C.srsQueue(S, WORDS, now(), 20, 10);
    if (!q.length) q = C.shuffle(WORDS).slice(0, 20);
    cards = { queue: q, i: 0, shown: false, again: {}, ok: 0, total: 0, started: now() };
    render();
  }

  function viewCard() {
    var w = cards.queue[cards.i];
    var v = VOCAB[w];
    var c = S.srs[w];
    var status = !c ? "新出" : "復習 · " + ["当日", "1日", "3日", "1週", "2週", "1か月"][c.box] + "の箱";
    return '<section class="card-wrap"><div class="qbar"><button class="ghost" data-act="end-cards">終了</button>' +
      '<div class="qmeta"><b>単語カード</b><span>' + (cards.i + 1) + " / " + cards.queue.length + "</span></div><div></div></div>" +
      '<div class="progress"><span style="width:' + (cards.i / cards.queue.length) * 100 + '%"></span></div>' +
      '<div class="flash"><span class="status">' + status + '</span><div class="word">' + esc(w) + "</div>" +
      (SP.available ? '<button class="ghost small" data-act="say" data-text="' + esc(w) + '">発音を聞く</button>' : "") +
      (cards.shown
        ? '<div class="meaning">' + esc(v[1]) + '</div><p class="ex">' + esc(v[2]).replace(new RegExp("\\b(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\w*)", "i"), "<b>$1</b>") + "</p>"
        : '<p class="hint">意味を思い浮かべてから表示してください。</p>') +
      "</div>" +
      (cards.shown
        ? '<div class="grades"><button class="g0" data-grade="0">忘れた<kbd>1</kbd></button><button class="g1" data-grade="1">あやふや<kbd>2</kbd></button><button class="g2" data-grade="2">覚えていた<kbd>3</kbd></button></div>'
        : '<div class="actions"><button class="primary wide" data-act="reveal">意味を表示 <kbd>Space</kbd></button></div>') +
      "</section>";
  }

  function grade(gr) {
    var w = cards.queue[cards.i];
    C.srsReview(S, w, gr, now());
    cards.total++;
    if (gr >= 1) cards.ok++;
    // 忘れた単語はこのセッションの最後にもう一度だけ出す
    if (gr === 0 && !cards.again[w]) { cards.again[w] = true; cards.queue.push(w); }
    persist();
    cards.i++;
    cards.shown = false;
    if (cards.i >= cards.queue.length) return endCards();
    render();
  }

  function endCards() {
    if (cards && cards.total) {
      C.logSession(S, { at: now(), mode: "vocab", total: cards.total, correct: cards.ok, sec: Math.round((now() - cards.started) / 1000) });
      persist();
    }
    cards = null;
    go("vocab");
  }

  // ---------- 記録 ----------
  function meterRow(label, a, extra) {
    var w = a.acc == null ? 0 : a.acc * 100;
    return '<div class="mrow"><span class="ml">' + label + '</span><span class="meter" title="' + (a.n ? a.ok + " / " + a.n + " 問正解" : "未解答") + '"><span style="width:' + w + '%"></span><i class="goal" style="left:95%"></i></span>' +
      '<span class="num">' + pct(a.acc) + "</span><span class=\"n\">" + (extra || a.n + " 問") + "</span></div>";
  }

  function viewStats() {
    var parts = ["p2", "p34", "p5", "p7"].map(function (k) {
      return meterRow(KIND_LABEL[k], accBy(function (ix) { return ix.kind === k; }));
    }).join("");
    var cats = p5Categories().slice().sort(function (a, b) {
      return (a.acc == null ? 2 : a.acc) - (b.acc == null ? 2 : b.acc);
    }).map(function (c) {
      return meterRow(esc(c.cat), { n: c.n, ok: Math.round((c.acc || 0) * c.n), acc: c.acc }, c.n + " / " + c.total);
    }).join("");

    // 直近14日の学習量
    var days = [], max = 1;
    for (var i = 13; i >= 0; i--) {
      var t = now() - i * C.DAY, k = C.dayKey(t), q = 0, v = 0;
      S.log.forEach(function (e) { if (C.dayKey(e.at) === k) { if (e.mode === "vocab") v += e.total; else q += e.total; } });
      days.push({ k: k, d: new Date(t), q: q, v: v });
      max = Math.max(max, q + v);
    }
    var top = Math.max(10, Math.ceil(max / 10) * 10);
    var bars = days.map(function (d) {
      var hq = (d.q / top) * 100, hv = (d.v / top) * 100;
      var label = (d.d.getMonth() + 1) + "/" + d.d.getDate();
      return '<div class="col" tabindex="0" title="' + label + "：問題 " + d.q + " 問・単語 " + d.v + ' 枚">' +
        '<div class="stack"><span class="v" style="height:' + hv + '%"></span><span class="q" style="height:' + hq + '%"></span></div>' +
        '<span class="dl">' + d.d.getDate() + "</span></div>";
    }).join("");

    return scoreBlock(false) +
      '<section><h2>パート別の正答率</h2><p class="fine">各問題の最新の結果で計算しています。960点の目安は各パート 95% 前後（目盛り線）。</p><div class="meters">' + parts + "</div></section>" +
      '<section><h2>Part 5 分野別（弱い順）</h2><div class="meters">' + cats + "</div></section>" +
      '<section><h2>直近14日の学習量</h2><div class="legend"><span><i class="lq"></i>問題</span><span><i class="lv"></i>単語カード</span></div>' +
      '<div class="chart"><div class="yax"><span>' + top + "</span><span>" + top / 2 + "</span><span>0</span></div><div class=\"cols\">" + bars + "</div></div></section>" +
      '<section><h2>データ</h2><p class="fine">学習記録はこのブラウザだけに保存されます。</p>' +
      (view.confirmReset
        ? '<div class="actions"><button class="danger" data-act="reset-yes">すべての記録を削除する</button><button data-act="reset-no">やめる</button></div>'
        : '<div class="actions"><button data-act="reset">記録をリセット…</button></div>') + "</section>";
  }

  // ---------- 攻略法 ----------
  function viewPlan() {
    var rows = [
      ["Part 1", "6問", "全問正解", "写真に写っていない動作・物を含む選択肢を即座に消す。"],
      ["Part 2", "25問", "ミス2問以内", "疑問詞を聞き逃さない。間接応答・質問返しを正解候補に入れる。"],
      ["Part 3", "39問", "ミス2〜3問", "音声の前に設問を先読み。正解は本文の言い換え。意図問題は前後の流れで判断。"],
      ["Part 4", "30問", "ミス2問以内", "冒頭で話者と場面を特定。図表問題は選択肢にない方の情報を聞く。"],
      ["Part 5", "30問", "10分・ミス1〜2問", "1問20秒。空所の前後だけで解ける品詞問題は5秒で処理し、語彙問題に時間を回す。"],
      ["Part 6", "16問", "8分・ミス1問", "文挿入問題は前後の指示語・接続語から。全文を読む前提で解く。"],
      ["Part 7", "54問", "55分・ミス3問以内", "1問1分。設問を先に読み、根拠を本文で特定。NOT問題とダブル・トリプルパッセージで時間を使いすぎない。"]
    ];
    return '<section class="plan"><div class="eyebrow">Strategy</div><h1>800点から960点へ</h1>' +
      '<p class="lead">960点は Listening 490・Reading 470 前後、全200問中のミスがおよそ 15 問以内という水準です。800点前後からの伸びしろは、ほとんどが「Reading の時間切れ」と「Listening の取りこぼし」です。</p>' +
      '<div class="table-wrap"><table><thead><tr><th>パート</th><th>問題数</th><th>目標</th><th>ポイント</th></tr></thead><tbody>' +
      rows.map(function (r) { return "<tr><th>" + r[0] + '</th><td class="num">' + r[1] + "</td><td>" + r[2] + "</td><td>" + r[3] + "</td></tr>"; }).join("") +
      "</tbody></table></div>" +
      "<h2>1日 45〜60 分のルーティン</h2><ol class=\"routine\">" +
      "<li><b>単語カード 20 枚（5分）</b>：復習期限の単語を毎日消化する。知らない語が1つあるだけで Part 5 と 7 の時間が溶けます。</li>" +
      "<li><b>Part 5 を 10〜20 問（5〜8分）</b>：タイマーを意識し、20秒を超えた問題は解説を読んで「なぜ迷ったか」を言語化する。</li>" +
      "<li><b>リスニング 15〜20 分</b>：Part 2 と Part 3/4。解いた後にスクリプトを見ながら音声を聞き直し、聞き取れなかった箇所をシャドーイングする。</li>" +
      "<li><b>Part 7 を 1〜2 文書（10分）</b>：WPM を記録し、150 WPM を下回るなら音読で処理速度を上げる。</li>" +
      "<li><b>間違いノート（5分）</b>：前回間違えた問題を解き直し、ゼロにしてから終える。</li></ol>" +
      "<h2>週に1回</h2><p>ミニ模試で L/R のバランスを確認し、月に1回は公式問題集で 2 時間通しの模試を解いて時間配分を体に覚えさせます。</p>" +
      '<p class="fine">音声はブラウザの音声合成を使っています。本番の音声に慣れるため、公式問題集の音声とあわせて使ってください。</p></section>';
  }

  // ---------- イベント ----------
  function afterRender() {
    if (view.name === "quiz" && quiz) {
      var g = quiz.groups[quiz.gi];
      var allAnswered = g.questions.every(function (q) { return quiz.picks[q.id] != null; });
      if (!allAnswered) {
        startTimer();
        if (!quiz.played || quiz.played !== quiz.gi) {
          quiz.played = quiz.gi;
          if ((g.kind === "p2" || g.kind === "p34") && SP.available) {
            // Part 3/4 は設問を先読みする時間を少し置いてから流す
            setTimeout(function () { if (quiz && quiz.played === quiz.gi && view.name === "quiz") playCurrent(); }, g.kind === "p34" ? 2500 : 300);
          }
        }
      }
    }
  }

  function startTimer() {
    stopTicker();
    var g = quiz.groups[quiz.gi];
    var target = groupTarget(g);
    var tick = function () {
      var el = document.getElementById("timer");
      if (!el || !quiz) return stopTicker();
      var s = (now() - quiz.groupStart) / 1000;
      el.firstChild.nodeValue = fmtSec(s);
      if (target) el.classList.toggle("over", s > target);
    };
    tick();
    ticker = setInterval(tick, 250);
  }

  app.addEventListener("click", function (e) {
    var t = e.target.closest("button, [data-go]");
    if (!t) return;
    if (t.dataset.go) {
      if (t.dataset.go === "vocab" && cards) cards = null;
      return go(t.dataset.go);
    }
    if (t.dataset.pick != null) return pick(t.dataset.q, parseInt(t.dataset.pick, 10));
    if (t.dataset.grade != null) return grade(parseInt(t.dataset.grade, 10));
    var act = t.dataset.act;
    if (!act) return;
    if (starters[act]) return starters[act]();
    switch (act) {
      case "play": return playCurrent();
      case "next": return nextGroup();
      case "quit":
        if (quiz.results.length) return finishQuiz();
        quiz = null; return go("home");
      case "again": return go({ p5: "part5", p2: "part2", p34: "part34", p7: "part7", review: "review", mock: "mock" }[quiz.mode] || "home");
      case "start-cards": return startCards();
      case "reveal": cards.shown = true; return render();
      case "say": return SP.play([{ text: t.dataset.text, accent: SP.accentFor(t.dataset.text, S.settings.accent) }], S.settings.rate);
      case "end-cards": return endCards();
      case "reset": view.confirmReset = true; return render();
      case "reset-no": view.confirmReset = false; return render();
      case "reset-yes":
        S = C.emptyState(); persist(); view.confirmReset = false; return render();
    }
  });

  app.addEventListener("change", function (e) {
    var key = e.target.dataset && e.target.dataset.set;
    if (!key) return;
    S.settings[key] = key === "rate" ? parseFloat(e.target.value) : e.target.value;
    persist();
  });

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    var k = e.key.toLowerCase();
    if (view.name === "quiz" && quiz) {
      var g = quiz.groups[quiz.gi];
      var open = g.questions.filter(function (q) { return quiz.picks[q.id] == null; })[0];
      var idx = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
      if (open && idx >= 0 && idx < open.choices.length) { e.preventDefault(); return pick(open.id, idx); }
      if (!open && (k === "enter" || k === "arrowright")) { e.preventDefault(); return nextGroup(); }
      if (k === "r" && (g.kind === "p2" || g.kind === "p34")) { e.preventDefault(); return playCurrent(); }
    }
    if (view.name === "vocab" && cards) {
      if (!cards.shown && (k === " " || k === "enter")) { e.preventDefault(); cards.shown = true; return render(); }
      if (cards.shown && "123".indexOf(k) >= 0 && k !== "") { e.preventDefault(); return grade(parseInt(k, 10) - 1); }
    }
  });

  // リンクの #part5 などから該当画面を開く
  function fromHash() {
    var h = (location.hash || "").replace("#", "");
    return HASH_VIEWS.indexOf(h) >= 0 ? h : "home";
  }
  window.addEventListener("hashchange", function () {
    var h = fromHash();
    if (h !== view.name) { cards = null; go(h); }
  });
  go(fromHash());
})();
