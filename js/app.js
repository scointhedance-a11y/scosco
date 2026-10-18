// 診断士一次ドリル: 画面は home / quiz / result の3つ。描画はすべて render() から行う。
(function () {
  const { SUBJECTS, QUESTIONS } = window;
  const KANA = ["ア", "イ", "ウ", "エ", "オ"];
  const STORE_KEY = "shindanshi-quiz:v1";
  const PASS_TOTAL = 0.6; // 合格基準: 総点の60%以上
  const PASS_SUBJECT = 0.4; // 足切り: 1科目でも40%未満は不合格

  const subjectOf = (code) => SUBJECTS.find((s) => s.code === code);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (n) => Math.round(n * 100);

  // ---- 学習記録（localStorage が使えない環境でも動くようにする） ----
  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveStats() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(stats));
    } catch (e) {
      /* 保存できなくても学習は続けられる */
    }
  }
  let stats = loadStats(); // { [id]: { n: 解答回数, c: 正解回数, last: 直近の正誤 } }

  function subjectStats(code) {
    const qs = QUESTIONS.filter((q) => q.subject === code);
    let n = 0, c = 0, seen = 0;
    qs.forEach((q) => {
      const s = stats[q.id];
      if (s) { n += s.n; c += s.c; seen++; }
    });
    return { total: qs.length, seen, rate: n ? c / n : null };
  }

  // ---- 状態 ----
  let state = {
    screen: "home",
    selected: SUBJECTS.map((s) => s.code),
    count: 10,
    scope: "all", // all | unseen | wrong
    confirmReset: false,
    session: null, // { items: [{ id, order }], idx, answers: [{ picked, ok }] }
  };

  function pool() {
    return QUESTIONS.filter((q) => {
      if (!state.selected.includes(q.subject)) return false;
      const s = stats[q.id];
      if (state.scope === "unseen") return !s;
      if (state.scope === "wrong") return s && s.last === false;
      return true;
    });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startSession(questions) {
    const items = shuffle(questions).map((q) => ({ id: q.id, order: shuffle(q.choices.map((_, i) => i)) }));
    state.session = { items, idx: 0, answers: [] };
    state.screen = "quiz";
    render();
    window.scrollTo(0, 0);
  }

  function start() {
    const p = pool();
    const n = state.count === "all" ? p.length : Math.min(state.count, p.length);
    startSession(shuffle(p).slice(0, n));
  }

  function current() {
    const s = state.session;
    const item = s.items[s.idx];
    return { item, q: QUESTIONS.find((q) => q.id === item.id), answer: s.answers[s.idx] };
  }

  function pick(displayIdx) {
    const { item, q, answer } = current();
    if (answer || displayIdx >= item.order.length) return;
    const picked = item.order[displayIdx];
    const ok = picked === q.answer;
    state.session.answers[state.session.idx] = { picked, ok };
    const s = stats[q.id] || { n: 0, c: 0 };
    stats[q.id] = { n: s.n + 1, c: s.c + (ok ? 1 : 0), last: ok };
    saveStats();
    render();
    const fb = document.getElementById("feedback");
    if (fb) fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function next() {
    const s = state.session;
    if (!s.answers[s.idx]) return;
    if (s.idx + 1 < s.items.length) {
      s.idx++;
    } else {
      state.screen = "result";
    }
    render();
    window.scrollTo(0, 0);
  }

  function goHome() {
    state.screen = "home";
    state.session = null;
    state.confirmReset = false;
    render();
    window.scrollTo(0, 0);
  }

  // ---- 描画 ----
  const app = document.getElementById("app");

  function render() {
    if (state.screen === "quiz") app.innerHTML = renderQuiz();
    else if (state.screen === "result") app.innerHTML = renderResult();
    else app.innerHTML = renderHome();
  }

  function renderHome() {
    const ids = Object.keys(stats).filter((id) => QUESTIONS.some((q) => q.id === id));
    const answered = ids.length;
    let n = 0, c = 0, wrong = 0;
    ids.forEach((id) => { n += stats[id].n; c += stats[id].c; if (stats[id].last === false) wrong++; });
    const p = pool();

    const subjectRows = SUBJECTS.map((s) => {
      const st = subjectStats(s.code);
      const checked = state.selected.includes(s.code);
      const rate = st.rate;
      return `
        <li><label class="subject">
          <input type="checkbox" id="subj-${s.code}" data-subject="${s.code}" ${checked ? "checked" : ""}>
          <span class="code" aria-hidden="true">${s.code}</span>
          <span class="subject-body">
            <span class="subject-name">${esc(s.name)}</span>
            <span class="meter" aria-hidden="true"><i class="${rate !== null && rate < PASS_SUBJECT ? "low" : ""}" style="width:${rate === null ? 0 : pct(rate)}%"></i></span>
          </span>
          <span class="subject-meta">${rate === null ? "—" : pct(rate) + "%"}<br>${st.seen}/${st.total}問</span>
        </label></li>`;
    }).join("");

    const countBtn = (v, label) =>
      `<button type="button" data-count="${v}" aria-pressed="${state.count === v}">${label}</button>`;
    const scopeBtn = (v, label, disabled) =>
      `<button type="button" data-scope="${v}" aria-pressed="${state.scope === v}" ${disabled ? "disabled" : ""}>${label}</button>`;

    const n0 = state.count === "all" ? p.length : Math.min(state.count, p.length);

    return `
      <header class="masthead">
        <div>
          <div class="eyebrow">中小企業診断士 第1次試験</div>
          <h1>診断士一次ドリル</h1>
        </div>
        <p>7科目・全${QUESTIONS.length}問の四択演習</p>
      </header>

      <section class="sheet" aria-labelledby="h-stats">
        <h2 id="h-stats">学習状況</h2>
        <div class="stats">
          <div class="stat"><b>${answered}<small style="font-size:0.875rem;color:var(--muted)">/${QUESTIONS.length}</small></b><span>解いた問題</span></div>
          <div class="stat"><b>${n ? pct(c / n) + "%" : "—"}</b><span>累計正答率</span></div>
          <div class="stat"><b>${wrong}</b><span>直近で間違えた問題</span></div>
        </div>
      </section>

      <section class="sheet" aria-labelledby="h-subj">
        <div class="sheet-head">
          <h2 id="h-subj">科目を選ぶ</h2>
          <div class="actions">
            <button type="button" class="link" data-action="all">すべて選択</button>
            <button type="button" class="link" data-action="none">選択解除</button>
          </div>
        </div>
        <ul class="subjects">${subjectRows}</ul>
        <p class="legend">バーは科目別の累計正答率。縦線は足切りライン（40%）です。</p>
      </section>

      <section class="sheet" aria-labelledby="h-opt">
        <h2 id="h-opt">出題設定</h2>
        <div class="field">
          <span class="field-label">出題数</span>
          <div class="seg">${countBtn(5, "5問")}${countBtn(10, "10問")}${countBtn(20, "20問")}${countBtn("all", "すべて")}</div>
        </div>
        <div class="field">
          <span class="field-label">出題範囲</span>
          <div class="seg">${scopeBtn("all", "すべての問題")}${scopeBtn("unseen", "未回答のみ")}${scopeBtn("wrong", "間違えた問題のみ", wrong === 0)}</div>
        </div>
        <div class="actions">
          <button type="button" class="btn" id="start" ${n0 === 0 ? "disabled" : ""}>${n0 === 0 ? "出題できる問題がありません" : `${n0}問を解く`}</button>
          <p class="hint">対象 ${p.length}問からランダムに出題。選択肢の並びも毎回入れ替わります。</p>
        </div>
      </section>

      <div class="actions">
        ${state.confirmReset
          ? `<div class="confirm"><span>学習記録をすべて消去しますか？</span>
               <button type="button" class="link danger" data-action="reset-yes">消去する</button>
               <button type="button" class="link" data-action="reset-no">やめる</button></div>`
          : `<button type="button" class="link" data-action="reset">学習記録をリセット</button>`}
      </div>`;
  }

  function renderQuiz() {
    const s = state.session;
    const { item, q, answer } = current();
    const subj = subjectOf(q.subject);
    const total = s.items.length;
    const done = s.answers.filter(Boolean).length;

    const choices = item.order.map((orig, i) => {
      const cls = ["choice"];
      let mark = "";
      if (answer) {
        if (orig === answer.picked) cls.push("picked");
        if (orig === q.answer) { cls.push("correct"); mark = "正解"; }
        else if (orig === answer.picked) { cls.push("wrong"); mark = "あなたの解答"; }
      }
      return `
        <li><button type="button" class="${cls.join(" ")}" data-pick="${i}" ${answer ? "disabled" : ""}>
          <span class="bubble">${KANA[i]}</span>
          <span>${esc(q.choices[orig])}</span>
          ${mark ? `<span class="mark">${mark}</span>` : ""}
        </button></li>`;
    }).join("");

    const correctKana = KANA[item.order.indexOf(q.answer)];
    const feedback = answer ? `
      <div class="feedback" id="feedback" role="status">
        <div class="verdict ${answer.ok ? "" : "ng"}">
          ${answer.ok
            ? `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" stroke-width="3"/></svg>正解`
            : `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M6 6L22 22M22 6L6 22" stroke="var(--redpen)" stroke-width="3" stroke-linecap="round" fill="none"/></svg>不正解　正解は「${correctKana}」`}
        </div>
        <p>${esc(q.exp)}</p>
      </div>` : "";

    return `
      <div class="quizbar">
        <button type="button" class="link" data-action="quit">中断する</button>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><i style="width:${(done / total) * 100}%"></i></div>
        <span class="count">${s.idx + 1} / ${total}</span>
      </div>

      <section class="sheet">
        <div class="qhead">
          <span class="code">${q.subject}</span>
          <span class="subject-label">${esc(subj.name)}</span>
          <span class="qid">${q.id}</span>
        </div>
        <p class="question">${esc(q.q)}</p>
        <ul class="choices">${choices}</ul>
        ${feedback}
      </section>

      <div class="actions">
        ${answer
          ? `<button type="button" class="btn" id="next">${s.idx + 1 < total ? "次の問題へ" : "結果を見る"}</button>
             <p class="hint"><span class="kbd">Enter</span> で次へ</p>`
          : `<p class="hint"><span class="kbd">1</span>〜<span class="kbd">${item.order.length}</span> キーでも解答できます</p>`}
      </div>`;
  }

  function renderResult() {
    const s = state.session;
    const total = s.items.length;
    const correct = s.answers.filter((a) => a && a.ok).length;
    const rate = total ? correct / total : 0;

    const bySubject = SUBJECTS.map((subj) => {
      const idxs = s.items.map((it, i) => i).filter((i) => QUESTIONS.find((q) => q.id === s.items[i].id).subject === subj.code);
      const c = idxs.filter((i) => s.answers[i] && s.answers[i].ok).length;
      return { subj, n: idxs.length, c };
    }).filter((r) => r.n > 0);
    const cutoff = bySubject.some((r) => r.c / r.n < PASS_SUBJECT);
    const pass = rate >= PASS_TOTAL && !cutoff;

    const rows = bySubject.map((r) => `
      <tr>
        <td><span class="code" style="width:24px;height:24px;font-size:0.75rem;display:inline-grid;margin-right:8px;vertical-align:middle">${r.subj.code}</span>${esc(r.subj.name)}</td>
        <td class="num">${r.c} / ${r.n}</td>
        <td class="num">${pct(r.c / r.n)}%</td>
        <td>${r.c / r.n < PASS_SUBJECT ? `<span class="flag">足切り</span>` : ""}</td>
      </tr>`).join("");

    const wrongItems = s.items.map((it, i) => ({ it, a: s.answers[i] })).filter((x) => x.a && !x.a.ok);
    const review = wrongItems.map(({ it, a }) => {
      const q = QUESTIONS.find((qq) => qq.id === it.id);
      return `
        <details>
          <summary><span class="qid">${q.id}</span>${esc(q.q)}</summary>
          <div class="body">
            <p>あなたの解答：${esc(q.choices[a.picked])}</p>
            <p class="ans">正解：${esc(q.choices[q.answer])}</p>
            <p>${esc(q.exp)}</p>
          </div>
        </details>`;
    }).join("");

    return `
      <header class="masthead">
        <div>
          <div class="eyebrow">採点結果</div>
          <h1>おつかれさまでした</h1>
        </div>
      </header>

      <section class="sheet">
        <div class="score">
          <div class="score-num">${correct}<small> / ${total}問</small></div>
          <div>
            <div class="score-num" style="font-size:2rem">${pct(rate)}<small>%</small></div>
          </div>
          <span class="stamp ${pass ? "" : "fail"}">${pass ? "合格圏" : "あと一歩"}</span>
        </div>
        <p class="hint">本試験の基準（総点の60%以上、かつ40%未満の科目がないこと）に当てはめた目安です。</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>科目</th><th class="num">正解</th><th class="num">正答率</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>

      ${wrongItems.length ? `
      <section class="sheet">
        <h2>間違えた問題（${wrongItems.length}問）</h2>
        <div class="review">${review}</div>
      </section>` : ""}

      <div class="actions">
        ${wrongItems.length ? `<button type="button" class="btn" data-action="retry-wrong">間違えた${wrongItems.length}問を解き直す</button>` : ""}
        <button type="button" class="btn ${wrongItems.length ? "ghost" : ""}" data-action="home">トップに戻る</button>
      </div>`;
  }

  // ---- 操作 ----
  app.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.pick !== undefined) return pick(Number(t.dataset.pick));
    if (t.id === "next") return next();
    if (t.id === "start") return start();
    if (t.dataset.count) {
      state.count = t.dataset.count === "all" ? "all" : Number(t.dataset.count);
      return render();
    }
    if (t.dataset.scope) {
      state.scope = t.dataset.scope;
      return render();
    }
    switch (t.dataset.action) {
      case "all": state.selected = SUBJECTS.map((s) => s.code); return render();
      case "none": state.selected = []; return render();
      case "quit": case "home": return goHome();
      case "reset": state.confirmReset = true; return render();
      case "reset-no": state.confirmReset = false; return render();
      case "reset-yes":
        stats = {};
        saveStats();
        state.confirmReset = false;
        if (state.scope === "wrong") state.scope = "all";
        return render();
      case "retry-wrong": {
        const s = state.session;
        const ids = s.items.filter((_, i) => s.answers[i] && !s.answers[i].ok).map((it) => it.id);
        return startSession(QUESTIONS.filter((q) => ids.includes(q.id)));
      }
    }
  });

  app.addEventListener("change", (e) => {
    const code = e.target.dataset.subject;
    if (!code) return;
    state.selected = e.target.checked
      ? SUBJECTS.map((s) => s.code).filter((c) => c === code || state.selected.includes(c))
      : state.selected.filter((c) => c !== code);
    render();
    const el = document.getElementById("subj-" + code);
    if (el) el.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (state.screen !== "quiz" || e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 5) { pick(n - 1); return; }
    if (e.key === "Enter" && state.session.answers[state.session.idx]) {
      e.preventDefault();
      next();
    }
  });

  // 「間違えた問題のみ」を選んでいるのに対象がない場合はすべてに戻す
  if (!Object.values(stats).some((s) => s.last === false) && state.scope === "wrong") state.scope = "all";

  // ページ更新をまたいで演習中の状態を引き継ぐ（Artifact ビューア用。通常のブラウザでは何もしない）
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ state }));
  const boot = (data) => {
    if (data && data.state) state = data.state;
    render();
  };
  if (hot && hot.ready) hot.ready(boot);
  else boot(hot && hot.data);
})();
