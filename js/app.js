/* 水処理ナビ — 学習クイズ・用語辞書・計算ツール・製品MAP
 * データは js/data.js（tools/build.py が content/ から生成）と、アプリ内で追加したJSONを使う。
 */
(function () {
  'use strict';

  var DATA = window.WT_DATA || { sections: [], products: null, builtAt: '' };
  var CALCS = window.WT_CALC || [];
  var view = document.getElementById('view');

  /* ================= 保存（この端末のブラウザ内のみ） ================= */
  var KEY = 'wt.v1';
  var state = loadState();

  function loadState() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
    s.stats = s.stats || {};       // クイズID → { c: 正解数, w: 不正解数, last: 最後の正誤, t: 時刻 }
    s.saved = s.saved || [];       // お気に入り（'t:用語ID' / 'p:製品ID'）
    s.recent = s.recent || [];     // 最近見たもの
    s.imported = s.imported || []; // アプリ内で追加したセクション
    s.calc = s.calc || {};         // 計算ツールの入力値
    s.quizPrefs = s.quizPrefs || { count: 10, mode: 'random', sections: null };
    s.theme = s.theme || 'auto';
    return s;
  }

  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ================= 文字列ユーティリティ ================= */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 検索用の正規化: 全角半角・大小文字・カタカナ/ひらがなの違いを吸収
  function norm(s) {
    s = String(s == null ? '' : s);
    if (s.normalize) s = s.normalize('NFKC');
    s = s.toLowerCase();
    s = s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
    return s.replace(/[\s・\-‐–—ー_／\/（）()「」【】、。,.:：]/g, '');
  }

  function tokens(q) {
    return String(q || '').split(/[\s　]+/).map(norm).filter(Boolean);
  }

  function fmt(n, digits) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    var d = digits == null ? 2 : digits;
    return n.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function mainKey(term) {
    return String(term).split(/[（(]/)[0].trim();
  }

  /* ================= データの索引 ================= */
  var SECTIONS = [], SEC = {}, TERMS = [], TERM = {}, QUIZ = [], QUIZ_BY_ID = {}, BOOKS = [];
  var PRODUCTS = [], PROD = {};

  function sectionNums(s) {
    return (String(s.section || '').match(/\d+/g) || []).map(Number);
  }

  function cmpSections(a, b) {
    if (a.book !== b.book) return BOOKS.indexOf(a.book) - BOOKS.indexOf(b.book);
    var x = sectionNums(a), y = sectionNums(b);
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    }
    return a.id < b.id ? -1 : 1;
  }

  function buildIndex() {
    var byId = {};
    (DATA.sections || []).forEach(function (s) { byId[s.id] = Object.assign({ imported: false }, s); });
    state.imported.forEach(function (s) { byId[s.id] = Object.assign({}, s, { imported: true }); });
    SECTIONS = Object.keys(byId).map(function (k) { return byId[k]; });
    BOOKS = [];
    SECTIONS.forEach(function (s) {
      s.book = s.book || 'その他';
      if (BOOKS.indexOf(s.book) < 0) BOOKS.push(s.book);
    });
    SECTIONS.sort(cmpSections);

    SEC = {}; TERMS = []; TERM = {}; QUIZ = []; QUIZ_BY_ID = {};
    SECTIONS.forEach(function (s) {
      SEC[s.id] = s;
      (s.terms || []).forEach(function (t) {
        if (TERM[t.id]) return;
        var item = Object.assign({}, t, { sec: s.id });
        item._term = norm(t.term);
        item._main = norm(mainKey(t.term));
        item._reading = norm(t.reading);
        item._aliases = (t.aliases || []).map(norm);
        item._en = norm(t.en);
        item._body = norm([t.definition, t.field, t.formula].join(' '));
        item._keys = [item._main].concat(item._aliases.filter(function (a) { return a.length >= 2; }));
        TERMS.push(item);
        TERM[t.id] = item;
      });
      (s.quiz || []).forEach(function (q) {
        if (QUIZ_BY_ID[q.id]) return;
        var item = Object.assign({}, q, { sec: s.id });
        item._text = norm([q.q, (q.choices || []).join(' '), q.explanation].join(' '));
        QUIZ.push(item);
        QUIZ_BY_ID[q.id] = item;
      });
    });
    TERMS.sort(function (a, b) {
      return (a.reading || a.term).localeCompare(b.reading || b.term, 'ja');
    });

    PRODUCTS = ((DATA.products && DATA.products.products) || []).map(function (p) {
      var item = Object.assign({}, p);
      item._name = norm(p.name);
      item._body = norm([p.category, p.sheet].concat((p.attrs || []).map(function (a) { return a[1]; })).join(' '));
      return item;
    });
    PROD = {};
    PRODUCTS.forEach(function (p) { PROD[p.id] = p; });
  }

  /* ================= 検索 ================= */
  function fieldScore(tok, value, w) {
    if (!value) return 0;
    if (value === tok) return w;
    if (value.indexOf(tok) === 0) return w * 0.8;
    if (value.indexOf(tok) > 0) return w * 0.55;
    return 0;
  }

  function scoreTerm(t, toks) {
    var total = 0;
    for (var i = 0; i < toks.length; i++) {
      var tok = toks[i];
      var s = Math.max(
        fieldScore(tok, t._term, 100),
        fieldScore(tok, t._main, 100),
        fieldScore(tok, t._reading, 90),
        fieldScore(tok, t._en, 70)
      );
      for (var j = 0; j < t._aliases.length; j++) s = Math.max(s, fieldScore(tok, t._aliases[j], 85));
      if (!s && t._body.indexOf(tok) >= 0) s = 8;
      if (!s) return 0;
      total += s;
    }
    return total;
  }

  function scoreProduct(p, toks) {
    var total = 0;
    for (var i = 0; i < toks.length; i++) {
      var s = fieldScore(toks[i], p._name, 100);
      if (!s && p._body.indexOf(toks[i]) >= 0) s = 10;
      if (!s) return 0;
      total += s;
    }
    return total;
  }

  function searchTerms(q, limit) {
    var toks = tokens(q);
    if (!toks.length) return [];
    return TERMS.map(function (t) { return { t: t, s: scoreTerm(t, toks) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, limit || 1e9)
      .map(function (x) { return x.t; });
  }

  function searchProducts(q, limit) {
    var toks = tokens(q);
    if (!toks.length) return [];
    return PRODUCTS.map(function (p) { return { p: p, s: scoreProduct(p, toks) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, limit || 1e9)
      .map(function (x) { return x.p; });
  }

  function searchSections(q) {
    var toks = tokens(q);
    if (!toks.length) return [];
    return SECTIONS.filter(function (s) {
      var body = norm([s.title, s.titleEn, s.section, (s.summary || []).join(' ')].join(' '));
      return toks.every(function (t) { return body.indexOf(t) >= 0; });
    });
  }

  /* ================= 学習記録 ================= */
  function qStat(id) { return state.stats[id]; }

  function recordAnswer(id, ok) {
    var s = state.stats[id] || { c: 0, w: 0 };
    if (ok) s.c++; else s.w++;
    s.last = ok;
    s.t = Date.now();
    state.stats[id] = s;
    saveState();
  }

  function isWeak(id) {
    var s = qStat(id);
    return !!s && (s.last === false || s.w > s.c);
  }

  function sectionProgress(sec) {
    var qs = sec.quiz || [];
    var answered = 0, correct = 0;
    qs.forEach(function (q) {
      var s = qStat(q.id);
      if (s) { answered++; if (s.last) correct++; }
    });
    return { total: qs.length, answered: answered, correct: correct };
  }

  function overallProgress() {
    var answered = 0, correct = 0, weak = 0;
    QUIZ.forEach(function (q) {
      var s = qStat(q.id);
      if (s) { answered++; if (s.last) correct++; else weak++; }
    });
    return { total: QUIZ.length, answered: answered, correct: correct, weak: weak };
  }

  function isSaved(key) { return state.saved.indexOf(key) >= 0; }

  function toggleSaved(key) {
    var i = state.saved.indexOf(key);
    if (i >= 0) state.saved.splice(i, 1); else state.saved.unshift(key);
    saveState();
    return i < 0;
  }

  function pushRecent(key) {
    state.recent = [key].concat(state.recent.filter(function (k) { return k !== key; })).slice(0, 12);
    saveState();
  }

  /* ================= 共通パーツ ================= */
  var ICON = {
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" stroke-linejoin="round"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3zM5 18a3 3 0 0 1 3-3h11"/></svg>',
    quiz: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/></svg>',
    calc: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>',
    flask: '<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>'
  };

  function secLabel(s) {
    return s ? (s.section ? s.section + ' ' : '') + s.title : '';
  }

  function termItem(t) {
    return '<a href="#/term/' + encodeURIComponent(t.id) + '">' +
      '<div class="item-title">' + esc(t.term) + (t.en ? ' <span class="en">' + esc(t.en) + '</span>' : '') + '</div>' +
      '<div class="item-sub">' + esc(t.definition) + '</div></a>';
  }

  function productSummary(p) {
    return (p.attrs || []).filter(function (a) { return /成分|効能|用途|製品特徴|特徴|タイプ|分類/.test(a[0]); })
      .slice(0, 3).map(function (a) { return a[1].replace(/\n/g, ' '); }).join(' ／ ');
  }

  function productItem(p) {
    return '<a href="#/product/' + encodeURIComponent(p.id) + '">' +
      '<div class="item-title">' + esc(p.name) + ' <span class="badge prod">' + esc(p.sheet) + '</span></div>' +
      '<div class="item-sub">' + esc(p.category) + (productSummary(p) ? '：' + esc(productSummary(p)) : '') + '</div></a>';
  }

  function backLink(href, label) {
    if (href === 'back') {
      return '<a class="back" href="#/" data-action="back">' + ICON.back + esc(label) + '</a>';
    }
    return '<a class="back" href="' + href + '">' + ICON.back + esc(label) + '</a>';
  }

  function meter(done, total, label) {
    var pct = total ? Math.round(done / total * 100) : 0;
    return '<div class="meter"><div class="progress"><i style="width:' + pct + '%"></i></div><span>' + esc(label) + '</span></div>';
  }

  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1800);
  }

  function dailyTerm() {
    if (!TERMS.length) return null;
    var d = new Date();
    var seed = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate();
    return TERMS[(seed * 7919) % TERMS.length];
  }

  /* ================= ルーティング ================= */
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var qs = '';
    var i = h.indexOf('?');
    if (i >= 0) { qs = h.slice(i + 1); h = h.slice(0, i); }
    var params = {};
    qs.split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
    });
    return { parts: h.split('/').filter(Boolean).map(decodeURIComponent), params: params };
  }

  function setHashQuiet(hash) {
    if (location.hash === hash) return;
    try { history.replaceState(null, '', hash); } catch (e) { /* file:// で失敗しても表示は継続 */ }
  }

  var TAB_OF = { '': 'home', search: 'home', dict: 'dict', term: 'dict', quiz: 'quiz', learn: 'quiz', section: 'quiz', calc: 'calc', more: 'more', products: 'more', product: 'more', saved: 'more', data: 'more' };

  var routes = {
    '': viewHome,
    search: viewSearch,
    dict: viewDict,
    term: viewTerm,
    learn: viewLearn,
    section: viewSection,
    quiz: viewQuiz,
    calc: viewCalc,
    products: viewProducts,
    product: viewProduct,
    saved: viewSaved,
    more: viewMore,
    data: viewData
  };

  function render(keepScroll) {
    var r = parseHash();
    var name = r.parts[0] || '';
    var fn = routes[name] || viewNotFound;
    document.body.className = 'route-' + (name || 'home');
    var tab = TAB_OF[name] || '';
    Array.prototype.forEach.call(document.querySelectorAll('.tabbar a'), function (a) {
      a.classList.toggle('on', a.getAttribute('data-tab') === tab);
    });
    var top = document.getElementById('topsearch-input');
    if (name !== 'search' && document.activeElement !== top) top.value = '';
    var out = fn(r.parts.slice(1), r.params);
    view.innerHTML = out.html;
    if (keepScroll !== true) window.scrollTo(0, 0);
    if (out.after) out.after();
  }

  function page(html, after) { return { html: html, after: after }; }

  /* ================= ホーム ================= */
  function viewHome() {
    var p = overallProgress();
    var rate = p.answered ? Math.round(p.correct / p.answered * 100) + '%' : '—';
    var dt = dailyTerm();
    var quick = ['濃縮倍数', 'LSI', '白さび', 'レジオネラ', '亜硝酸', '孔食', 'ブロー', 'HTI'];
    var recent = state.recent.map(function (k) {
      if (k.indexOf('t:') === 0 && TERM[k.slice(2)]) return '<a class="chip" href="#/term/' + encodeURIComponent(k.slice(2)) + '">' + esc(TERM[k.slice(2)].term) + '</a>';
      if (k.indexOf('p:') === 0 && PROD[k.slice(2)]) return '<a class="chip" href="#/product/' + encodeURIComponent(k.slice(2)) + '">' + esc(PROD[k.slice(2)].name) + '</a>';
      return '';
    }).join('');

    var html = '<div class="stack">' +
      '<section class="hero">' +
      '<h1>現場で引ける、学べる水処理</h1>' +
      '<p>用語 ' + TERMS.length + ' 語・クイズ ' + QUIZ.length + ' 問・製品 ' + PRODUCTS.length + ' 件</p>' +
      '<form class="bigsearch" id="homesearch" role="search"><input type="search" id="homesearch-input" placeholder="例：濃縮倍数、白さび、PSO、3DT…" autocomplete="off" enterkeyhint="search" aria-label="用語・製品を検索"></form>' +
      '<div class="chips">' + quick.map(function (w) { return '<a class="chip" href="#/search?q=' + encodeURIComponent(w) + '">' + esc(w) + '</a>'; }).join('') + '</div>' +
      '</section>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + p.answered + '<small class="muted"> / ' + p.total + '</small></b><span>解いた問題</span></div>' +
      '<div class="stat"><b>' + rate + '</b><span>正答率（最新）</span></div>' +
      '<div class="stat"><b>' + p.weak + '</b><span>苦手な問題</span></div>' +
      '</div>' +
      '<div class="grid">' +
      tile('#/dict', ICON.book, '用語辞書', '50音・セクション別に引く') +
      tile('#/quiz', ICON.quiz, 'クイズ', '範囲と出題数を選んで学習') +
      tile('#/learn', ICON.layers, 'セクション学習', '要点のまとめと用語') +
      tile('#/calc', ICON.calc, '計算ツール', '水収支・LSI・薬注量など') +
      tile('#/products', ICON.flask, '製品MAP', '製品名・成分で検索') +
      tile('#/saved', ICON.bookmark, 'お気に入り', '★を付けた用語・製品') +
      '</div>';

    if (p.weak) {
      html += '<div class="card spread"><div><strong>苦手な問題が ' + p.weak + ' 問あります</strong><div class="small muted">最後に間違えた問題だけを復習できます</div></div>' +
        '<button class="btn" data-action="weak-quiz">復習する</button></div>';
    }
    if (dt) {
      html += '<div class="section-title"><h2>今日の用語</h2><span class="badge sec">' + esc(secLabel(SEC[dt.sec])) + '</span></div>' +
        '<a class="card" style="display:block;color:inherit;text-decoration:none" href="#/term/' + encodeURIComponent(dt.id) + '">' +
        '<div class="item-title" style="font-size:1.1rem">' + esc(dt.term) + (dt.en ? ' <span class="en">' + esc(dt.en) + '</span>' : '') + '</div>' +
        '<p class="small" style="margin-top:4px">' + esc(dt.definition) + '</p></a>';
    }
    if (recent) {
      html += '<div class="section-title"><h2>最近見たもの</h2></div><div class="chips">' + recent + '</div>';
    }
    html += '</div>';
    return page(html, function () {
      var form = document.getElementById('homesearch');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = document.getElementById('homesearch-input').value.trim();
        if (q) location.hash = '#/search?q=' + encodeURIComponent(q);
      });
    });
  }

  function tile(href, icon, title, sub) {
    return '<a class="tile" href="' + href + '">' + icon + '<strong>' + esc(title) + '</strong><span>' + esc(sub) + '</span></a>';
  }

  /* ================= 検索結果 ================= */
  function viewSearch(parts, params) {
    var q = params.q || '';
    var html = '<div class="stack">' +
      '<div class="filterbar"><input type="search" id="search-input" value="' + esc(q) + '" placeholder="用語・製品を検索" autocomplete="off" aria-label="検索語"></div>' +
      '<div id="search-results"></div></div>';
    return page(html, function () {
      var input = document.getElementById('search-input');
      var top = document.getElementById('topsearch-input');
      top.value = q;
      function update() {
        var v = input.value.trim();
        document.getElementById('search-results').innerHTML = searchResultsHtml(v);
        setHashQuiet('#/search?q=' + encodeURIComponent(v));
      }
      input.addEventListener('input', update);
      update();
      if (!q) input.focus();
    });
  }

  function searchResultsHtml(q) {
    if (!q) return '<div class="empty">キーワードを入力してください。用語の読み・英語名・別名・製品名でも探せます。</div>';
    var ts = searchTerms(q, 50);
    var ps = searchProducts(q, 30);
    var ss = searchSections(q);
    if (!ts.length && !ps.length && !ss.length) {
      return '<div class="empty">「' + esc(q) + '」に一致するものは見つかりませんでした。<br>ひらがな・カタカナ・英語や、短い言葉でも試してください。</div>';
    }
    var h = '';
    if (ts.length) h += '<div class="section-title"><h2>用語</h2><span class="muted small">' + ts.length + (ts.length >= 50 ? '件以上' : '件') + '</span></div><div class="list">' + ts.map(termItem).join('') + '</div>';
    if (ps.length) h += '<div class="section-title"><h2>製品</h2><span class="muted small">' + ps.length + (ps.length >= 30 ? '件以上' : '件') + '</span></div><div class="list">' + ps.map(productItem).join('') + '</div>';
    if (ss.length) h += '<div class="section-title"><h2>セクション</h2></div><div class="list">' + ss.map(sectionItem).join('') + '</div>';
    return h;
  }

  /* ================= 用語辞書 ================= */
  var KANA_ROWS = [
    ['あ', 'あいうえおぁぃぅぇぉゔ'], ['か', 'かきくけこがぎぐげご'], ['さ', 'さしすせそざじずぜぞ'],
    ['た', 'たちつてとだぢづでどっ'], ['な', 'なにぬねの'], ['は', 'はひふへほばびぶべぼぱぴぷぺぽ'],
    ['ま', 'まみむめも'], ['や', 'やゆよゃゅょ'], ['ら', 'らりるれろ'], ['わ', 'わをん']
  ];

  function kanaRow(t) {
    var c = (t._reading || t._term).charAt(0);
    for (var i = 0; i < KANA_ROWS.length; i++) if (KANA_ROWS[i][1].indexOf(c) >= 0) return KANA_ROWS[i][0];
    return '英数';
  }

  function viewDict(parts, params) {
    var secOpts = '<option value="">すべてのセクション</option>' + BOOKS.map(function (b) {
      return '<optgroup label="' + esc(b) + '">' + SECTIONS.filter(function (s) { return s.book === b; }).map(function (s) {
        return '<option value="' + esc(s.id) + '"' + (params.sec === s.id ? ' selected' : '') + '>' + esc(secLabel(s)) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    var rows = KANA_ROWS.map(function (r) { return r[0]; }).concat(['英数']);
    var html = '<div class="stack">' +
      '<div class="spread"><h1>用語辞書</h1><span class="muted small">' + TERMS.length + '語</span></div>' +
      '<div class="filterbar">' +
      '<input type="search" id="dict-q" value="' + esc(params.q || '') + '" placeholder="辞書内を絞り込み" autocomplete="off" aria-label="絞り込み">' +
      '<select id="dict-sec" aria-label="セクション">' + secOpts + '</select>' +
      '</div>' +
      '<div class="kana-index" id="dict-kana">' + rows.map(function (k) {
        return '<a href="#" data-kana="' + k + '"' + (params.k === k ? ' class="on"' : '') + '>' + k + '</a>';
      }).join('') + '</div>' +
      '<div id="dict-list"></div></div>';
    return page(html, function () {
      var q = document.getElementById('dict-q');
      var sec = document.getElementById('dict-sec');
      var kana = params.k || '';
      function update() {
        var list = q.value.trim() ? searchTerms(q.value) : TERMS.slice();
        if (sec.value) list = list.filter(function (t) { return t.sec === sec.value; });
        if (kana) list = list.filter(function (t) { return kanaRow(t) === kana; });
        var h = '';
        if (!list.length) {
          h = '<div class="empty">該当する用語がありません。</div>';
        } else if (q.value.trim()) {
          h = '<div class="list">' + list.map(termItem).join('') + '</div>';
        } else {
          var cur = null;
          h = '<div class="list">';
          list.forEach(function (t) {
            var r = kanaRow(t);
            if (r !== cur) { h += '<div class="group-head">' + esc(r) + '</div>'; cur = r; }
            h += termItem(t);
          });
          h += '</div>';
        }
        document.getElementById('dict-list').innerHTML = h;
        var ps = [];
        if (q.value.trim()) ps.push('q=' + encodeURIComponent(q.value.trim()));
        if (sec.value) ps.push('sec=' + encodeURIComponent(sec.value));
        if (kana) ps.push('k=' + encodeURIComponent(kana));
        setHashQuiet('#/dict' + (ps.length ? '?' + ps.join('&') : ''));
      }
      q.addEventListener('input', update);
      sec.addEventListener('change', update);
      document.getElementById('dict-kana').addEventListener('click', function (e) {
        var a = e.target.closest('a[data-kana]');
        if (!a) return;
        e.preventDefault();
        kana = kana === a.getAttribute('data-kana') ? '' : a.getAttribute('data-kana');
        Array.prototype.forEach.call(this.querySelectorAll('a'), function (x) {
          x.classList.toggle('on', x.getAttribute('data-kana') === kana);
        });
        update();
      });
      update();
    });
  }

  function relatedQuizzes(t) {
    var keys = t._keys.filter(function (k) { return k.length >= 2; });
    return QUIZ.filter(function (q) {
      return keys.some(function (k) { return q._text.indexOf(k) >= 0; });
    });
  }

  function viewTerm(parts) {
    var t = TERM[parts[0]];
    if (!t) return viewNotFound();
    pushRecent('t:' + t.id);
    var s = SEC[t.sec];
    var related = (t.related || []).map(function (id) { return TERM[id]; }).filter(Boolean);
    var referencedBy = TERMS.filter(function (x) { return x.id !== t.id && (x.related || []).indexOf(t.id) >= 0 && related.indexOf(x) < 0; });
    var qs = relatedQuizzes(t);
    var saved = isSaved('t:' + t.id);
    var html = '<div class="stack">' + backLink('back', '戻る') +
      '<article class="card">' +
      '<div class="term-head"><div>' +
      '<h1>' + esc(t.term) + '</h1>' +
      (t.reading ? '<div class="reading">' + esc(t.reading) + '</div>' : '') +
      (t.en ? '<div class="en" style="margin-top:2px">' + esc(t.en) + '</div>' : '') +
      '</div><button class="icon-btn' + (saved ? ' on' : '') + '" data-action="save" data-key="t:' + esc(t.id) + '" aria-label="お気に入り" aria-pressed="' + saved + '">' + ICON.star + '</button></div>' +
      ((t.aliases || []).length ? '<div class="chips aliases">' + t.aliases.map(function (a) { return '<span class="chip" style="cursor:default">' + esc(a) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="block"><h3>意味</h3><p>' + esc(t.definition) + '</p></div>' +
      (t.formula ? '<div class="block"><h3>式・目安</h3><div class="formula">' + esc(t.formula) + '</div></div>' : '') +
      (t.field ? '<div class="block fieldnote"><h3>現場のポイント</h3><p>' + esc(t.field) + '</p></div>' : '') +
      (related.length ? '<div class="block"><h3>関連する用語</h3><div class="chips">' + related.map(function (r) { return '<a class="chip" href="#/term/' + encodeURIComponent(r.id) + '">' + esc(r.term) + '</a>'; }).join('') + '</div></div>' : '') +
      (referencedBy.length ? '<div class="block"><h3>この用語を参照している用語</h3><div class="chips">' + referencedBy.map(function (r) { return '<a class="chip" href="#/term/' + encodeURIComponent(r.id) + '">' + esc(r.term) + '</a>'; }).join('') + '</div></div>' : '') +
      '<div class="block source">出典：' + esc(s ? s.book : '') + ' ／ <a href="#/section/' + encodeURIComponent(t.sec) + '">' + esc(secLabel(s)) + '</a></div>' +
      '</article>';
    if (qs.length) {
      html += '<div class="card spread"><div><strong>この用語のクイズ</strong><div class="small muted">関連する問題が ' + qs.length + ' 問あります</div></div>' +
        '<button class="btn" data-action="term-quiz" data-id="' + esc(t.id) + '">挑戦する</button></div>';
    }
    html += '</div>';
    return page(html);
  }

  /* ================= セクション学習 ================= */
  function sectionItem(s) {
    var p = sectionProgress(s);
    return '<a href="#/section/' + encodeURIComponent(s.id) + '">' +
      '<div class="item-title">' + esc(secLabel(s)) + (s.imported ? ' <span class="badge">追加</span>' : '') + '</div>' +
      (s.titleEn ? '<div class="item-sub">' + esc(s.titleEn) + ' ・ 用語 ' + (s.terms || []).length + ' ・ クイズ ' + p.total + '</div>' : '') +
      (p.total ? meter(p.answered, p.total, p.answered ? p.correct + '/' + p.answered + ' 正解' : '未着手') : '') +
      '</a>';
  }

  function viewLearn() {
    var html = '<div class="stack"><h1>セクション学習</h1>' +
      '<p class="muted small">各セクションの要点・用語・クイズをまとめて学べます。</p>' +
      BOOKS.map(function (b) {
        return '<div class="section-title"><h2>' + esc(b) + '</h2></div><div class="list">' +
          SECTIONS.filter(function (s) { return s.book === b; }).map(sectionItem).join('') + '</div>';
      }).join('') + '</div>';
    return page(html);
  }

  function viewSection(parts) {
    var s = SEC[parts[0]];
    if (!s) return viewNotFound();
    var p = sectionProgress(s);
    var terms = TERMS.filter(function (t) { return t.sec === s.id; });
    var weak = (s.quiz || []).filter(function (q) { return isWeak(q.id); }).length;
    var idx = SECTIONS.indexOf(s);
    var prev = SECTIONS[idx - 1], next = SECTIONS[idx + 1];
    var html = '<div class="stack">' + backLink('#/learn', 'セクション一覧') +
      '<div><div class="muted small">' + esc(s.book) + '</div><h1>' + esc(secLabel(s)) + '</h1>' +
      (s.titleEn ? '<div class="en">' + esc(s.titleEn) + '</div>' : '') + '</div>' +
      (p.total ? '<div class="card stack-sm">' + meter(p.answered, p.total, p.answered + '/' + p.total + ' 問解答・' + p.correct + ' 問正解') +
        '<div class="row"><button class="btn" data-action="section-quiz" data-id="' + esc(s.id) + '">クイズを解く（' + p.total + '問）</button>' +
        (weak ? '<button class="btn ghost" data-action="section-weak" data-id="' + esc(s.id) + '">苦手だけ（' + weak + '問）</button>' : '') + '</div></div>' : '') +
      ((s.summary || []).length ? '<section class="card"><h2 style="margin-bottom:8px">要点</h2><ul class="bullets">' + s.summary.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>' : '') +
      '<div class="section-title"><h2>用語（' + terms.length + '）</h2></div>' +
      '<div class="list">' + terms.map(termItem).join('') + '</div>' +
      '<div class="spread small">' +
      (prev ? '<a href="#/section/' + encodeURIComponent(prev.id) + '">← ' + esc(secLabel(prev)) + '</a>' : '<span></span>') +
      (next ? '<a href="#/section/' + encodeURIComponent(next.id) + '" style="text-align:right">' + esc(secLabel(next)) + ' →</a>' : '<span></span>') +
      '</div></div>';
    return page(html);
  }

  /* ================= クイズ ================= */
  var session = null;

  function startQuiz(ids, title) {
    var items = ids.map(function (id) { return QUIZ_BY_ID[id]; }).filter(Boolean);
    if (!items.length) { toast('出題できる問題がありません'); return; }
    session = {
      title: title || 'クイズ',
      items: items.map(function (q) {
        var order = q.type === 'tf' ? [0, 1] : shuffle(q.choices.map(function (_, i) { return i; }));
        return { q: q, order: order, picked: null, ok: null };
      }),
      i: 0
    };
    if (location.hash === '#/quiz/play') render(); else location.hash = '#/quiz/play';
  }

  function quizPool(secIds, mode) {
    var pool = QUIZ.filter(function (q) { return !secIds || secIds.indexOf(q.sec) >= 0; });
    if (mode === 'weak') pool = pool.filter(function (q) { return isWeak(q.id); });
    if (mode === 'new') pool = pool.filter(function (q) { return !qStat(q.id); });
    return pool;
  }

  function viewQuiz(parts) {
    if (parts[0] === 'play') return viewQuizPlay();
    var prefs = state.quizPrefs;
    var selected = prefs.sections && prefs.sections.length ? prefs.sections.filter(function (id) { return SEC[id]; }) : SECTIONS.map(function (s) { return s.id; });
    var html = '<div class="stack"><h1>クイズ</h1>' +
      '<div class="card stack">' +
      '<div><h3 class="small muted" style="margin-bottom:6px">出題モード</h3><div class="seg" id="q-mode">' +
      [['random', 'ランダム'], ['new', '未回答'], ['weak', '苦手のみ']].map(function (m) {
        return '<button type="button" data-v="' + m[0] + '"' + (prefs.mode === m[0] ? ' class="on"' : '') + '>' + m[1] + '</button>';
      }).join('') + '</div></div>' +
      '<div><h3 class="small muted" style="margin-bottom:6px">出題数</h3><div class="seg" id="q-count">' +
      [5, 10, 20, 30, 0].map(function (n) {
        return '<button type="button" data-v="' + n + '"' + (prefs.count === n ? ' class="on"' : '') + '>' + (n ? n + '問' : '全部') + '</button>';
      }).join('') + '</div></div>' +
      '<div><div class="spread"><h3 class="small muted">出題範囲</h3><span class="row small"><a href="#" data-sel="all">すべて選択</a><a href="#" data-sel="none">解除</a></span></div>' +
      '<div class="checklist" id="q-secs">' + BOOKS.map(function (b) {
        return '<div class="group-head" style="border-radius:6px;border:0;margin-top:6px">' + esc(b) + '</div>' +
          SECTIONS.filter(function (s) { return s.book === b && (s.quiz || []).length; }).map(function (s) {
            var p = sectionProgress(s);
            return '<label><input type="checkbox" value="' + esc(s.id) + '"' + (selected.indexOf(s.id) >= 0 ? ' checked' : '') + '><span class="grow">' + esc(secLabel(s)) + '</span><span class="small muted">' + p.correct + '/' + p.total + '</span></label>';
          }).join('');
      }).join('') + '</div></div>' +
      '<button class="btn block" id="q-start">はじめる</button>' +
      '<div class="small muted center" id="q-info"></div>' +
      '</div></div>';
    return page(html, function () {
      var mode = prefs.mode, count = prefs.count;
      function secs() {
        return Array.prototype.map.call(document.querySelectorAll('#q-secs input:checked'), function (x) { return x.value; });
      }
      function info() {
        var pool = quizPool(secs(), mode);
        var n = count ? Math.min(count, pool.length) : pool.length;
        document.getElementById('q-info').textContent = '対象 ' + pool.length + ' 問から ' + n + ' 問を出題';
        document.getElementById('q-start').disabled = !n;
      }
      function seg(id, set) {
        document.getElementById(id).addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); });
          set(b.getAttribute('data-v'));
          info();
        });
      }
      seg('q-mode', function (v) { mode = v; });
      seg('q-count', function (v) { count = Number(v); });
      document.getElementById('q-secs').addEventListener('change', info);
      Array.prototype.forEach.call(document.querySelectorAll('[data-sel]'), function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var on = a.getAttribute('data-sel') === 'all';
          Array.prototype.forEach.call(document.querySelectorAll('#q-secs input'), function (x) { x.checked = on; });
          info();
        });
      });
      document.getElementById('q-start').addEventListener('click', function () {
        var s = secs();
        state.quizPrefs = { count: count, mode: mode, sections: s.length === SECTIONS.length ? null : s };
        saveState();
        var pool = shuffle(quizPool(s, mode).map(function (q) { return q.id; }));
        startQuiz(count ? pool.slice(0, count) : pool, mode === 'weak' ? '苦手克服' : 'クイズ');
      });
      info();
    });
  }

  function linkedTerms(q) {
    var sec = q.sec;
    var cands = TERMS.filter(function (t) { return t.sec === sec; }).concat(TERMS.filter(function (t) { return t.sec !== sec; }));
    var found = [];
    for (var i = 0; i < cands.length && found.length < 4; i++) {
      var t = cands[i];
      if (t._main.length >= 2 && q._text.indexOf(t._main) >= 0) found.push(t);
    }
    return found;
  }

  function viewQuizPlay() {
    if (!session) return page('<div class="empty">クイズが始まっていません。<br><br><a class="btn" href="#/quiz">クイズを選ぶ</a></div>');
    if (session.i >= session.items.length) return viewQuizResult();
    var it = session.items[session.i];
    var q = it.q;
    var n = session.items.length;
    var answered = it.picked !== null;
    var s = SEC[q.sec];
    var choicesHtml;
    if (q.type === 'tf') {
      choicesHtml = '<div class="choices tf">' + [true, false].map(function (v, idx) {
        var cls = '';
        if (answered) {
          if (v === q.answer) cls = ' correct';
          else if (it.picked === idx) cls = ' wrong';
        }
        return '<button class="choice' + cls + '" data-action="answer" data-i="' + idx + '"' + (answered ? ' disabled' : '') + ' aria-label="' + (v ? '正しい' : '誤り') + '">' + (v ? '○' : '×') + '</button>';
      }).join('') + '</div>';
    } else {
      choicesHtml = '<div class="choices">' + it.order.map(function (orig, idx) {
        var cls = '';
        if (answered) {
          if (orig === q.answer) cls = ' correct';
          else if (it.picked === idx) cls = ' wrong';
        }
        return '<button class="choice' + cls + '" data-action="answer" data-i="' + idx + '"' + (answered ? ' disabled' : '') + '><span class="mark">' + (idx + 1) + '</span><span>' + esc(q.choices[orig]) + '</span></button>';
      }).join('') + '</div>';
    }
    var fb = '';
    if (answered) {
      var terms = linkedTerms(q);
      fb = '<div class="feedback ' + (it.ok ? 'ok' : 'ng') + '"><strong>' + (it.ok ? '正解！' : '不正解') + '</strong>' +
        (q.type === 'tf' ? '<div class="small">正解：' + (q.answer ? '○（正しい）' : '×（誤り）') + '</div>' : '') +
        (q.explanation ? '<p style="margin-top:4px">' + esc(q.explanation) + '</p>' : '') +
        (terms.length ? '<div class="chips" style="margin-top:8px">' + terms.map(function (t) { return '<a class="chip" href="#/term/' + encodeURIComponent(t.id) + '" target="_self">用語：' + esc(t.term) + '</a>'; }).join('') + '</div>' : '') +
        '</div>' +
        '<button class="btn block" data-action="next" style="margin-top:14px">' + (session.i + 1 < n ? '次の問題へ' : '結果を見る') + '</button>';
    }
    var html = '<div class="stack">' +
      '<div class="spread"><strong>' + esc(session.title) + '</strong><a class="small" href="#/quiz" data-action="quit">やめる</a></div>' +
      '<div class="progress"><i style="width:' + Math.round(session.i / n * 100) + '%"></i></div>' +
      '<div class="card">' +
      '<div class="q-meta"><span>第 ' + (session.i + 1) + ' 問 / ' + n + '</span><span>' + esc(s ? 'Sec.' + s.section : '') + '</span></div>' +
      '<div class="q-text">' + (q.type === 'tf' ? '<span class="badge" style="margin-right:6px">○×</span>' : '') + esc(q.q) + '</div>' +
      choicesHtml + fb +
      '</div>' +
      '<p class="small muted center">キーボード：1〜' + (q.type === 'tf' ? '2' : q.choices.length) + 'で回答、Enterで次へ</p>' +
      '</div>';
    return page(html);
  }

  function answerQuiz(idx) {
    if (!session) return;
    var it = session.items[session.i];
    if (!it || it.picked !== null) return;
    var q = it.q;
    var ok = q.type === 'tf' ? ([true, false][idx] === q.answer) : (it.order[idx] === q.answer);
    it.picked = idx;
    it.ok = ok;
    recordAnswer(q.id, ok);
    render(true);
    var fbEl = view.querySelector('.feedback');
    if (fbEl && fbEl.scrollIntoView) fbEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function viewQuizResult() {
    var items = session.items;
    var correct = items.filter(function (x) { return x.ok; }).length;
    var wrong = items.filter(function (x) { return !x.ok; });
    var pct = Math.round(correct / items.length * 100);
    var msg = pct === 100 ? '全問正解です！' : pct >= 80 ? 'よくできました' : pct >= 60 ? 'もう一息です' : '要点を見直しましょう';
    var html = '<div class="stack">' +
      '<div class="card center stack-sm"><div class="muted">' + esc(session.title) + ' の結果</div>' +
      '<div class="score-ring">' + correct + ' / ' + items.length + '</div><div><strong>' + msg + '</strong>（正答率 ' + pct + '%）</div>' +
      '<div class="row" style="justify-content:center;margin-top:8px">' +
      (wrong.length ? '<button class="btn" data-action="retry-wrong">間違えた ' + wrong.length + ' 問をやり直す</button>' : '') +
      '<a class="btn ghost" href="#/quiz">別のクイズ</a></div></div>';
    if (wrong.length) {
      html += '<div class="section-title"><h2>間違えた問題</h2></div><div class="list">' + wrong.map(function (it) {
        var q = it.q;
        var ans = q.type === 'tf' ? (q.answer ? '○' : '×') : q.choices[q.answer];
        return '<div class="item"><div class="item-title">' + esc(q.q) + '</div>' +
          '<div class="small" style="margin-top:4px"><span class="badge ok">正解</span> ' + esc(ans) + '</div>' +
          (q.explanation ? '<div class="small muted" style="margin-top:4px">' + esc(q.explanation) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }
    html += '</div>';
    return page(html);
  }

  /* ================= 計算ツール ================= */
  function viewCalc(parts) {
    if (parts[0]) return viewCalcOne(parts[0]);
    var html = '<div class="stack"><h1>計算ツール</h1>' +
      '<p class="muted small">入力すると自動で計算します。入力値はこの端末に保存されます。</p>' +
      '<div class="list">' + CALCS.map(function (c) {
        return '<a href="#/calc/' + c.id + '"><div class="item-title">' + esc(c.title) + '</div><div class="item-sub">' + esc(c.desc) + '</div></a>';
      }).join('') + '</div></div>';
    return page(html);
  }

  function viewCalcOne(id) {
    var c = CALCS.filter(function (x) { return x.id === id; })[0];
    if (!c) return viewNotFound();
    var saved = state.calc[id] || {};
    var html = '<div class="stack">' + backLink('#/calc', '計算ツール') +
      '<div><h1>' + esc(c.title) + '</h1><p class="muted small">' + esc(c.desc) + '</p></div>' +
      '<form class="card" id="calc-form" autocomplete="off"><div class="fields">' + c.fields.map(function (f) {
        var v = saved[f.id] != null ? saved[f.id] : f.def;
        var input;
        if (f.type === 'select') {
          input = '<select id="f-' + f.id + '" name="' + f.id + '">' + f.options.map(function (o) {
            return '<option value="' + esc(o.value) + '"' + (String(v) === String(o.value) ? ' selected' : '') + '>' + esc(o.label) + '</option>';
          }).join('') + '</select>';
        } else {
          input = '<input id="f-' + f.id + '" name="' + f.id + '" type="text" inputmode="decimal" value="' + esc(v) + '">';
        }
        return '<div class="field"><label for="f-' + f.id + '">' + esc(f.label) + '</label><div class="inp">' + input + (f.unit ? '<span class="unit">' + esc(f.unit) + '</span>' : '') + '</div></div>';
      }).join('') + '</div><div id="calc-out"></div>' +
      (c.howto ? '<details class="howto"><summary>計算式と注意点</summary><div>' + esc(c.howto) + '</div></details>' : '') +
      '<div class="row" style="margin-top:10px"><button type="button" class="btn ghost" id="calc-reset">初期値に戻す</button></div>' +
      '</form>' +
      ((c.terms || []).filter(function (t) { return TERM[t]; }).length ? '<div><div class="section-title"><h2>関連する用語</h2></div><div class="chips">' + c.terms.filter(function (t) { return TERM[t]; }).map(function (t) {
        return '<a class="chip" href="#/term/' + encodeURIComponent(t) + '">' + esc(TERM[t].term) + '</a>';
      }).join('') + '</div></div>' : '') +
      '</div>';
    return page(html, function () {
      var form = document.getElementById('calc-form');
      function values() {
        var v = {}, raw = {};
        c.fields.forEach(function (f) {
          var el = document.getElementById('f-' + f.id);
          raw[f.id] = el.value;
          if (f.type === 'select') { v[f.id] = el.value; return; }
          var s = el.value.replace(/[,，\s]/g, '').replace(/[０-９．－]/g, function (ch) {
            return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
          });
          v[f.id] = s === '' ? null : Number(s);
          if (s !== '' && !isFinite(v[f.id])) v[f.id] = NaN;
        });
        return { v: v, raw: raw };
      }
      function update() {
        var x = values();
        state.calc[id] = x.raw;
        saveState();
        var res = c.compute(x.v);
        var out = document.getElementById('calc-out');
        if (!res || res.error) {
          out.innerHTML = '<div class="notice" style="margin-top:14px">' + esc(res ? res.error : '入力を確認してください') + '</div>';
          return;
        }
        out.innerHTML = '<div class="results">' + res.map(function (r) {
          return '<div class="result' + (r.tone ? ' ' + r.tone : '') + '"><span>' + esc(r.label) + '</span><b>' + fmt(r.value, r.digits) + '</b><small>' + esc(r.unit || '') + '</small>' + (r.note ? '<em>' + esc(r.note) + '</em>' : '') + '</div>';
        }).join('') + '</div>';
      }
      form.addEventListener('input', update);
      form.addEventListener('change', update);
      form.addEventListener('submit', function (e) { e.preventDefault(); });
      document.getElementById('calc-reset').addEventListener('click', function () {
        delete state.calc[id];
        saveState();
        render();
      });
      update();
    });
  }

  /* ================= 製品MAP ================= */
  function viewProducts(parts, params) {
    if (!PRODUCTS.length) {
      return page('<div class="stack"><h1>製品MAP</h1><div class="empty">製品データがありません。<br>tools/import_products.py で製品MAPのExcelを取り込んでください。</div></div>');
    }
    var sheets = [];
    PRODUCTS.forEach(function (p) { if (sheets.indexOf(p.sheet) < 0) sheets.push(p.sheet); });
    var meta = DATA.products || {};
    var html = '<div class="stack">' +
      '<div class="spread"><h1>製品MAP</h1><span class="muted small">' + PRODUCTS.length + '件</span></div>' +
      '<div class="notice">' + esc(meta.source || '') + (meta.version ? '（' + esc(meta.version) + '）' : '') + ' から取り込み。荷姿・販売状況は変わることがあるため、最新情報は技術室に確認してください。</div>' +
      '<div class="filterbar"><input type="search" id="prod-q" value="' + esc(params.q || '') + '" placeholder="製品名・成分・用途で検索" autocomplete="off" aria-label="製品を検索">' +
      '<select id="prod-sheet" aria-label="区分"><option value="">すべての区分</option>' + sheets.map(function (s) {
        return '<option' + (params.sheet === s ? ' selected' : '') + '>' + esc(s) + '</option>';
      }).join('') + '</select></div>' +
      '<div id="prod-list"></div></div>';
    return page(html, function () {
      var q = document.getElementById('prod-q');
      var sh = document.getElementById('prod-sheet');
      function update() {
        var list = q.value.trim() ? searchProducts(q.value) : PRODUCTS.slice();
        if (sh.value) list = list.filter(function (p) { return p.sheet === sh.value; });
        var h;
        if (!list.length) h = '<div class="empty">該当する製品がありません。</div>';
        else if (q.value.trim()) h = '<div class="list">' + list.map(productItem).join('') + '</div>';
        else {
          var cur = null;
          h = '<div class="list">';
          list.forEach(function (p) {
            var g = p.sheet + ' ／ ' + p.category;
            if (g !== cur) { h += '<div class="group-head">' + esc(g) + '</div>'; cur = g; }
            h += productItem(p);
          });
          h += '</div>';
        }
        document.getElementById('prod-list').innerHTML = h;
        var ps = [];
        if (q.value.trim()) ps.push('q=' + encodeURIComponent(q.value.trim()));
        if (sh.value) ps.push('sheet=' + encodeURIComponent(sh.value));
        setHashQuiet('#/products' + (ps.length ? '?' + ps.join('&') : ''));
      }
      q.addEventListener('input', update);
      sh.addEventListener('change', update);
      update();
    });
  }

  function viewProduct(parts) {
    var p = PROD[parts[0]];
    if (!p) return viewNotFound();
    pushRecent('p:' + p.id);
    var saved = isSaved('p:' + p.id);
    var siblings = PRODUCTS.filter(function (x) { return x.sheet === p.sheet && x.category === p.category && x.id !== p.id; });
    var html = '<div class="stack">' + backLink('back', '戻る') +
      '<article class="card">' +
      '<div class="term-head"><div><div class="muted small">' + esc(p.sheet) + '</div><h1>' + esc(p.name) + '</h1>' +
      '<div class="small" style="margin-top:2px"><span class="badge prod">' + esc(p.category) + '</span></div></div>' +
      '<button class="icon-btn' + (saved ? ' on' : '') + '" data-action="save" data-key="p:' + esc(p.id) + '" aria-label="お気に入り" aria-pressed="' + saved + '">' + ICON.star + '</button></div>' +
      '<dl class="attrs block">' + (p.attrs || []).map(function (a) {
        return '<dt>' + esc(a[0].replace(/\n/g, ' ')) + '</dt><dd>' + esc(a[1]) + '</dd>';
      }).join('') + '</dl></article>';
    if (siblings.length) {
      html += '<div class="section-title"><h2>同じ区分の製品</h2><span class="muted small">' + siblings.length + '件</span></div><div class="list">' + siblings.map(productItem).join('') + '</div>';
    }
    html += '</div>';
    return page(html);
  }

  /* ================= お気に入り ================= */
  function viewSaved() {
    var ts = state.saved.filter(function (k) { return k.indexOf('t:') === 0 && TERM[k.slice(2)]; }).map(function (k) { return TERM[k.slice(2)]; });
    var ps = state.saved.filter(function (k) { return k.indexOf('p:') === 0 && PROD[k.slice(2)]; }).map(function (k) { return PROD[k.slice(2)]; });
    var html = '<div class="stack"><h1>お気に入り</h1>';
    if (!ts.length && !ps.length) html += '<div class="empty">まだありません。用語や製品のページで ★ を押すと、ここに集まります。</div>';
    if (ts.length) html += '<div class="section-title"><h2>用語</h2></div><div class="list">' + ts.map(termItem).join('') + '</div>';
    if (ps.length) html += '<div class="section-title"><h2>製品</h2></div><div class="list">' + ps.map(productItem).join('') + '</div>';
    html += '</div>';
    return page(html);
  }

  /* ================= その他・データ管理 ================= */
  function viewMore() {
    var html = '<div class="stack"><h1>その他</h1>' +
      '<div class="list">' +
      '<a href="#/learn"><div class="item-title">セクション学習</div><div class="item-sub">要点・用語・クイズをセクションごとに</div></a>' +
      '<a href="#/products"><div class="item-title">製品MAP</div><div class="item-sub">製品名・成分・用途で検索</div></a>' +
      '<a href="#/saved"><div class="item-title">お気に入り</div><div class="item-sub">★を付けた用語・製品</div></a>' +
      '<a href="#/data"><div class="item-title">学習記録・資料の追加・設定</div><div class="item-sub">記録の保存/リセット、JSONで資料を追加、表示テーマ</div></a>' +
      '</div>' +
      '<div class="card small stack-sm"><strong>このアプリについて</strong>' +
      '<p class="muted">社内の技術資料（' + esc(BOOKS.join('、')) + '）をもとに、要点・用語・クイズを日本語でまとめたものです。社外秘資料に基づくため、社外への共有はしないでください。数値は目安であり、実際の処理条件は製品のCPP・最新の技術資料で確認してください。</p>' +
      '<p class="muted">データ作成日時：' + esc(DATA.builtAt || '—') + ' ／ セクション ' + SECTIONS.length + ' ／ 用語 ' + TERMS.length + ' ／ クイズ ' + QUIZ.length + '</p></div>' +
      '</div>';
    return page(html);
  }

  function viewData() {
    var p = overallProgress();
    var html = '<div class="stack">' + backLink('#/more', 'その他') + '<h1>学習記録・資料の追加・設定</h1>' +
      '<section class="card stack-sm"><h2>表示テーマ</h2><div class="seg" id="theme-seg">' +
      [['auto', '端末に合わせる'], ['light', 'ライト'], ['dark', 'ダーク']].map(function (t) {
        return '<button type="button" data-v="' + t[0] + '"' + (state.theme === t[0] ? ' class="on"' : '') + '>' + t[1] + '</button>';
      }).join('') + '</div></section>' +
      '<section class="card stack-sm"><h2>学習記録</h2>' +
      '<p class="small muted">解いた問題 ' + p.answered + ' / ' + p.total + '、最新の正解 ' + p.correct + ' 問、お気に入り ' + state.saved.length + ' 件。記録はこの端末のブラウザにだけ保存されます。</p>' +
      '<div class="row"><button class="btn ghost" data-action="export">記録をファイルに保存</button>' +
      '<label class="btn ghost" style="cursor:pointer">記録を読み込む<input type="file" id="import-record" accept=".json,application/json" hidden></label>' +
      '<button class="btn danger" data-action="reset-stats">クイズ記録を消す</button></div></section>' +
      '<section class="card stack-sm"><h2>資料（コンテンツ）の追加</h2>' +
      '<p class="small muted">決められた形式のJSONファイル（1セクション、または複数セクションの配列）を読み込むと、この端末に用語とクイズが追加されます。形式は docs/CONTENT_GUIDE.md を参照してください。全員に配るには content/sections/ に置いて tools/build.py を実行します。</p>' +
      '<label class="btn" style="cursor:pointer;align-self:flex-start">JSONファイルを選ぶ<input type="file" id="import-content" accept=".json,application/json" multiple hidden></label>' +
      (state.imported.length ? '<div class="list">' + state.imported.map(function (s) {
        return '<div class="item spread"><div class="grow"><div class="item-title">' + esc(secLabel(s)) + '</div><div class="item-sub">' + esc(s.book || '') + ' ・ 用語 ' + (s.terms || []).length + ' ・ クイズ ' + (s.quiz || []).length + '</div></div>' +
          '<button class="btn danger" data-action="remove-imported" data-id="' + esc(s.id) + '">削除</button></div>';
      }).join('') + '</div>' : '<p class="small muted">追加した資料はまだありません。</p>') +
      '</section></div>';
    return page(html, function () {
      document.getElementById('theme-seg').addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        state.theme = b.getAttribute('data-v');
        saveState();
        applyTheme();
        Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); });
      });
      document.getElementById('import-content').addEventListener('change', function () {
        importContentFiles(this.files);
        this.value = '';
      });
      document.getElementById('import-record').addEventListener('change', function () {
        importRecord(this.files[0]);
        this.value = '';
      });
    });
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = function () { reject(r.error); };
      r.readAsText(file, 'utf-8');
    });
  }

  function checkSection(s) {
    if (!s || typeof s !== 'object') return '形式が正しくありません';
    if (!s.id || !s.title) return 'id と title が必要です';
    if (!Array.isArray(s.terms) || !Array.isArray(s.quiz)) return 'terms と quiz は配列にしてください';
    for (var i = 0; i < s.terms.length; i++) {
      var t = s.terms[i];
      if (!t.id || !t.term || !t.definition) return '用語 ' + (i + 1) + ' に id・term・definition が必要です';
    }
    for (var j = 0; j < s.quiz.length; j++) {
      var q = s.quiz[j];
      if (!q.id || !q.q) return 'クイズ ' + (j + 1) + ' に id と q が必要です';
      if (q.type === 'tf' && typeof q.answer !== 'boolean') return 'クイズ ' + q.id + '：○×問題の answer は true/false';
      if (q.type !== 'tf' && (!Array.isArray(q.choices) || typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.choices.length)) {
        return 'クイズ ' + q.id + '：choices と answer（0始まりの番号）を確認してください';
      }
    }
    return null;
  }

  function importContentFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    Promise.all(list.map(readFile)).then(function (texts) {
      var added = 0, errors = [];
      texts.forEach(function (text, i) {
        var data;
        try { data = JSON.parse(text); } catch (e) { errors.push(list[i].name + '：JSONとして読めません'); return; }
        (Array.isArray(data) ? data : [data]).forEach(function (s) {
          var err = checkSection(s);
          if (err) { errors.push(list[i].name + '：' + err); return; }
          state.imported = state.imported.filter(function (x) { return x.id !== s.id; }).concat([s]);
          added++;
        });
      });
      if (added && !saveState()) {
        errors.push('端末の保存容量が足りません。不要な追加資料を削除してください。');
        state = loadState();
      }
      buildIndex();
      render();
      if (errors.length) alert('読み込めなかったもの:\n' + errors.join('\n'));
      if (added) toast(added + ' セクションを追加しました');
    });
  }

  function importRecord(file) {
    if (!file) return;
    readFile(file).then(function (text) {
      var data;
      try { data = JSON.parse(text); } catch (e) { alert('記録ファイルを読めませんでした'); return; }
      if (!data || typeof data !== 'object' || !data.stats) { alert('学習記録のファイルではありません'); return; }
      Object.keys(data.stats).forEach(function (k) { state.stats[k] = data.stats[k]; });
      (data.saved || []).forEach(function (k) { if (state.saved.indexOf(k) < 0) state.saved.push(k); });
      saveState();
      render();
      toast('学習記録を読み込みました');
    });
  }

  function exportRecord() {
    var data = { app: '水処理ナビ', exported: new Date().toISOString(), stats: state.stats, saved: state.saved };
    var blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'water-navi-record-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function viewNotFound() {
    return page('<div class="empty">ページが見つかりません。<br><br><a class="btn" href="#/">ホームへ</a></div>');
  }

  /* ================= 画面操作 ================= */
  view.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var act = el.getAttribute('data-action');
    var id = el.getAttribute('data-id');
    switch (act) {
      case 'back':
        e.preventDefault();
        if (history.length > 1) history.back(); else location.hash = '#/';
        break;
      case 'save': {
        var on = toggleSaved(el.getAttribute('data-key'));
        el.classList.toggle('on', on);
        el.setAttribute('aria-pressed', on);
        toast(on ? 'お気に入りに追加しました' : 'お気に入りから外しました');
        break;
      }
      case 'answer':
        answerQuiz(Number(el.getAttribute('data-i')));
        break;
      case 'next':
        session.i++;
        render();
        break;
      case 'quit':
        session = null;
        break;
      case 'retry-wrong':
        startQuiz(session.items.filter(function (x) { return !x.ok; }).map(function (x) { return x.q.id; }), '間違えた問題');
        break;
      case 'weak-quiz':
        startQuiz(shuffle(quizPool(null, 'weak').map(function (q) { return q.id; })).slice(0, 20), '苦手克服');
        break;
      case 'term-quiz': {
        var t = TERM[id];
        startQuiz(shuffle(relatedQuizzes(t).map(function (q) { return q.id; })).slice(0, 10), t.term + ' のクイズ');
        break;
      }
      case 'section-quiz':
        startQuiz(shuffle((SEC[id].quiz || []).map(function (q) { return q.id; })), secLabel(SEC[id]));
        break;
      case 'section-weak':
        startQuiz(shuffle((SEC[id].quiz || []).filter(function (q) { return isWeak(q.id); }).map(function (q) { return q.id; })), secLabel(SEC[id]) + '（苦手）');
        break;
      case 'export':
        exportRecord();
        break;
      case 'reset-stats':
        if (confirm('クイズの記録（正解・不正解の履歴）をすべて消します。よろしいですか？')) {
          state.stats = {};
          saveState();
          render();
          toast('クイズの記録を消しました');
        }
        break;
      case 'remove-imported':
        if (confirm('追加した資料「' + secLabel(SEC[id] || { title: id }) + '」を削除しますか？')) {
          state.imported = state.imported.filter(function (s) { return s.id !== id; });
          saveState();
          buildIndex();
          render();
        }
        break;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!session || location.hash !== '#/quiz/play') return;
    if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
    var it = session.items[session.i];
    if (!it) return;
    if (it.picked === null && /^[1-9]$/.test(e.key)) {
      var idx = Number(e.key) - 1;
      var max = it.q.type === 'tf' ? 2 : it.q.choices.length;
      if (idx < max) { e.preventDefault(); answerQuiz(idx); }
    } else if (it.picked !== null && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      session.i++;
      render();
    }
  });

  document.getElementById('topsearch').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = document.getElementById('topsearch-input').value.trim();
    if (q) location.hash = '#/search?q=' + encodeURIComponent(q);
  });

  function applyTheme() {
    if (state.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', state.theme);
  }

  /* ================= 起動 ================= */
  applyTheme();
  buildIndex();
  window.addEventListener('hashchange', function () { render(); });
  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) &&
      document.documentElement.getAttribute('data-single-file') !== '1') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* オフライン対応なしで動作を続ける */ });
  }
})();
