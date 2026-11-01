/* =========================================================
 * アプリ本体：状態管理・ルーティング・描画
 * ========================================================= */
(function () {
  'use strict';

  const STORAGE_KEY = 'shindanshi-framework-workbench.v1';
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------- ユーティリティ ---------- */
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[k];
    }
    o[keys[keys.length - 1]] = value;
  }

  /* ---------- 状態 ---------- */
  function newProject(name) {
    const id = uid();
    return { id, name, created: Date.now(), updated: Date.now(), data: {} };
  }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (s && s.projects && Object.keys(s.projects).length) {
        if (!s.projects[s.current]) s.current = Object.keys(s.projects)[0];
        return s;
      }
    } catch (e) {
      console.warn('保存データの読み込みに失敗しました', e);
    }
    const p = newProject('事例企業A社');
    const st = { projects: { [p.id]: p }, current: p.id };
    if (window.SAMPLE_PROJECT) {
      const sample = { ...newProject(window.SAMPLE_PROJECT.name), data: structuredClone(window.SAMPLE_PROJECT.data) };
      st.projects[sample.id] = sample;
    }
    return st;
  }

  let state = loadState();
  let saveTimer = null;

  function saveNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('保存に失敗しました（ストレージ容量を確認してください）');
    }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 300);
  }
  window.addEventListener('beforeunload', saveNow);

  const project = () => state.projects[state.current];
  function fwData(fwId) {
    const p = project();
    if (!p.data[fwId]) p.data[fwId] = {};
    return p.data[fwId];
  }
  function touch() {
    project().updated = Date.now();
    scheduleSave();
  }

  /* ---------- 進捗 ---------- */
  function isFilled(v) {
    return v != null && String(v).trim() !== '';
  }
  function progressOf(fw, data) {
    data = data || project().data[fw.id] || {};
    if (fw.layout === 'grid') {
      const filled = fw.cells.filter((c) => isFilled(data[c.id])).length;
      return filled / fw.cells.length;
    }
    if (fw.layout === 'table') {
      const total = fw.rows.length * fw.columns.length;
      let filled = 0;
      fw.rows.forEach((r) => fw.columns.forEach((c) => isFilled(getPath(data, `${r.id}.${c.id}`)) && filled++));
      return filled / total;
    }
    const tool = window.TOOLS[fw.tool];
    return tool && tool.progress ? Math.max(0, Math.min(1, tool.progress(data, ctx(fw)))) : 0;
  }

  /* ---------- ツール向けコンテキスト ---------- */
  function ctx(fw) {
    return {
      fw,
      esc,
      getPath,
      project,
      fwData,
      data: fwData(fw.id),
      isFilled,
      navigate: (id) => (location.hash = `#/fw/${id}`),
    };
  }

  /* ---------- サイドバー ---------- */
  function renderNav() {
    const q = $('#searchInput').value.trim().toLowerCase();
    const current = currentRoute().fwId;
    let html = `<a href="#/" class="nav-home ${current ? '' : 'active'}">🏠 ホーム（一覧）</a>`;
    CATEGORIES.forEach((cat) => {
      const items = FRAMEWORKS.filter(
        (f) =>
          f.category === cat.id &&
          (!q || [f.name, f.en, f.summary, ...(f.subjects || [])].join(' ').toLowerCase().includes(q))
      );
      if (!items.length) return;
      html += `<div class="nav-group"><div class="nav-group-title">${cat.icon} ${esc(cat.name)}</div>`;
      items.forEach((f) => {
        const p = progressOf(f);
        html += `<a href="#/fw/${f.id}" class="nav-item ${current === f.id ? 'active' : ''}" data-fw="${f.id}">
          <span class="nav-name">${esc(f.name)}</span>
          <span class="progress-dot" style="--p:${Math.round(p * 100)}" title="入力状況 ${Math.round(p * 100)}%"></span>
        </a>`;
      });
      html += `</div>`;
    });
    if (html.indexOf('nav-group') < 0) html += `<p class="nav-empty">該当するフレームワークがありません</p>`;
    $('#navList').innerHTML = html;
  }

  function updateNavProgress(fw) {
    const dot = document.querySelector(`.nav-item[data-fw="${fw.id}"] .progress-dot`);
    if (dot) {
      const p = Math.round(progressOf(fw) * 100);
      dot.style.setProperty('--p', p);
      dot.title = `入力状況 ${p}%`;
    }
  }

  function renderProjectSelect() {
    const sel = $('#projectSelect');
    const list = Object.values(state.projects).sort((a, b) => a.created - b.created);
    sel.innerHTML = list
      .map((p) => `<option value="${p.id}" ${p.id === state.current ? 'selected' : ''}>${esc(p.name)}</option>`)
      .join('');
  }

  /* ---------- ルーティング ---------- */
  function currentRoute() {
    const m = location.hash.match(/^#\/fw\/([\w-]+)/);
    return { fwId: m && FW_BY_ID[m[1]] ? m[1] : null };
  }

  let currentTool = null;

  function render() {
    const { fwId } = currentRoute();
    currentTool = null;
    renderNav();
    if (fwId) renderFramework(FW_BY_ID[fwId]);
    else renderHome();
    closeSidebar();
  }

  /* ---------- ホーム ---------- */
  function renderHome() {
    const p = project();
    const totalP = FRAMEWORKS.reduce((s, f) => s + progressOf(f), 0) / FRAMEWORKS.length;
    let html = `
      <section class="hero">
        <div>
          <h1>診断士フレームワーク・ワークベンチ</h1>
          <p>中小企業診断士試験に登場するビジネスフレームワークを、<b>実際に書き込んで使える</b>ワークシート集です。
          事例企業ごとに分析内容を保存でき、計算系ツール（損益分岐点・経営分析・NPVなど）は入力すると自動で計算されます。</p>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-label">現在の事例</div>
          <div class="hero-stat-name">${esc(p.name)}</div>
          <div class="bar"><span style="width:${Math.round(totalP * 100)}%"></span></div>
          <div class="hero-stat-sub">全体の入力状況 ${Math.round(totalP * 100)}%・最終更新 ${new Date(p.updated).toLocaleString('ja-JP')}</div>
        </div>
      </section>
      <section class="howto">
        <div><span class="step">1</span>右上で<b>事例（分析対象の企業）</b>を選択・作成</div>
        <div><span class="step">2</span>フレームワークを選んで<b>書き込む</b>（自動保存）</div>
        <div><span class="step">3</span><b>Markdown出力</b>や印刷で答案づくり・振り返りに活用</div>
      </section>`;
    CATEGORIES.forEach((cat) => {
      const items = FRAMEWORKS.filter((f) => f.category === cat.id);
      html += `<section class="card-section"><h2>${cat.icon} ${esc(cat.name)}</h2><div class="card-grid">`;
      items.forEach((f) => {
        const pr = Math.round(progressOf(f) * 100);
        const kind = f.layout === 'custom' && ['ratio', 'cvp', 'npv', 'eoq', 'abc', 'ppm'].includes(f.id) ? '<span class="tag tag-calc">自動計算</span>' : '';
        html += `<a class="fw-card" href="#/fw/${f.id}">
          <div class="fw-card-head"><h3>${esc(f.name)}</h3>${kind}</div>
          <div class="fw-card-en">${esc(f.en)}</div>
          <p>${esc(f.summary)}</p>
          <div class="fw-card-foot">
            <div class="subjects">${(f.subjects || []).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
            <div class="mini-bar" title="入力状況 ${pr}%"><span style="width:${pr}%"></span></div>
          </div>
        </a>`;
      });
      html += `</div></section>`;
    });
    $('#main').innerHTML = html;
    document.title = '診断士フレームワーク・ワークベンチ';
  }

  /* ---------- フレームワーク画面 ---------- */
  function renderFramework(fw) {
    const cat = CATEGORIES.find((c) => c.id === fw.category);
    const data = fwData(fw.id);
    const idx = FRAMEWORKS.indexOf(fw);
    const prev = FRAMEWORKS[idx - 1];
    const next = FRAMEWORKS[idx + 1];

    let body = '';
    if (fw.layout === 'grid') body = gridHTML(fw, data);
    else if (fw.layout === 'table') body = tableHTML(fw, data);
    else {
      currentTool = window.TOOLS[fw.tool];
      body = `<div class="tool" id="toolRoot">${currentTool.render(ctx(fw))}</div>`;
    }

    $('#main').innerHTML = `
      <article class="fw" data-fw="${fw.id}">
        <header class="fw-head">
          <div class="breadcrumb"><a href="#/">ホーム</a> / ${cat.icon} ${esc(cat.name)}</div>
          <h1>${esc(fw.name)} <small>${esc(fw.en)}</small></h1>
          <p class="fw-summary">${esc(fw.summary)}</p>
          <div class="subjects">${(fw.subjects || []).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
        </header>
        <details class="exam" open>
          <summary>📝 試験のポイント</summary>
          <ul>${fw.exam.map((e) => `<li>${e}</li>`).join('')}</ul>
        </details>
        <div class="toolbar no-print">
          <span class="save-state" id="saveState">✓ 自動保存されます</span>
          <span class="spacer"></span>
          <button class="btn" data-action="copy-md">Markdownをコピー</button>
          <button class="btn" data-action="print">印刷 / PDF</button>
          <button class="btn btn-danger-ghost" data-action="clear">クリア</button>
        </div>
        <section class="workspace">${body}</section>
        <nav class="pager no-print">
          ${prev ? `<a href="#/fw/${prev.id}">← ${esc(prev.name)}</a>` : '<span></span>'}
          ${next ? `<a href="#/fw/${next.id}">${esc(next.name)} →</a>` : '<span></span>'}
        </nav>
      </article>`;
    document.title = `${fw.name}｜診断士フレームワーク・ワークベンチ`;
    autoGrowAll();
    if (currentTool && currentTool.update) currentTool.update(ctx(fw), $('#toolRoot'));
  }

  function field(fwId, key, value, opts = {}) {
    const ph = opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : '';
    return `<textarea class="cell-input" data-field="${esc(key)}" rows="${opts.rows || 4}" ${ph}>${esc(value)}</textarea>`;
  }

  function extrasHTML(fw, data) {
    if (!fw.extras) return '';
    return `<div class="extras">${fw.extras
      .map((x) => {
        const v = data[x.id] || '';
        if (x.type === 'select') {
          return `<label class="extra">${esc(x.label)}
            <select data-field="${x.id}">${x.options.map((o) => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${o ? esc(o) : '― 選択 ―'}</option>`).join('')}</select></label>`;
        }
        return `<label class="extra">${esc(x.label)}<input type="text" data-field="${x.id}" value="${esc(v)}"></label>`;
      })
      .join('')}</div>`;
  }

  function cellHTML(fw, c, data) {
    const rating = c.rating
      ? `<div class="rating" role="radiogroup" aria-label="脅威の強さ">
          ${['弱', '中', '強'].map((r) => `<label><input type="radio" name="rate-${c.id}" data-field="${c.id}__rate" value="${r}" ${data[c.id + '__rate'] === r ? 'checked' : ''}><span>${r}</span></label>`).join('')}
        </div>`
      : '';
    const style = [c.area ? `grid-area:${c.area}` : '', c.span ? `grid-column:span ${c.span}` : ''].filter(Boolean).join(';');
    return `<div class="cell tone-${c.tone || 'gray'}" style="${style}">
      <div class="cell-head">
        <div><div class="cell-label">${esc(c.label)}</div>${c.sub ? `<div class="cell-sub">${esc(c.sub)}</div>` : ''}</div>
        ${rating}
      </div>
      ${field(fw.id, c.id, data[c.id], { placeholder: c.hint })}
    </div>`;
  }

  function gridHTML(fw, data) {
    let gridStyle;
    if (fw.areas) {
      const n = fw.areas[0].split(/\s+/).length;
      gridStyle = `grid-template-areas:${fw.areas.map((a) => `'${a}'`).join(' ')};grid-template-columns:repeat(${n},minmax(0,1fr))`;
    } else {
      gridStyle = `grid-template-columns:repeat(${fw.cols || 2},minmax(0,1fr))`;
    }
    const cells = fw.cells.map((c) => cellHTML(fw, c, data)).join('');
    let grid = `<div class="grid grid-${fw.id} ${fw.areas ? 'grid-areas' : ''} cols-${fw.cols || 'a'}" style="${gridStyle}">${cells}</div>`;

    if (fw.axes) {
      const top = fw.axes.top
        ? `<div class="axis-top" style="grid-template-columns:repeat(${fw.axes.top.length},minmax(0,1fr))">${fw.axes.top.map((t) => `<div>${esc(t)}</div>`).join('')}</div>`
        : '';
      const left = fw.axes.left
        ? `<div class="axis-left" style="grid-template-rows:repeat(${fw.axes.left.length},1fr)">${fw.axes.left.map((t) => `<div><span>${esc(t)}</span></div>`).join('')}</div>`
        : '';
      grid = `<div class="axis-wrap ${fw.axes.left ? 'has-left' : ''}">${left ? '<div></div>' : ''}${top}${left}${grid}</div>`;
    }
    const tip = fw.cells.some((c) => c.rating) ? '<p class="note">各要因の脅威の強さ（弱・中・強）も評価しましょう。「強」が多いほど業界の収益性は低くなります。</p>' : '';
    return extrasHTML(fw, data) + grid + tip + '<p class="note">💡 1行に1項目ずつ書くと、Markdown出力で箇条書きになります。</p>';
  }

  function tableHTML(fw, data) {
    return `<div class="table-wrap"><table class="fw-table">
      <thead><tr><th></th>${fw.columns.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${fw.rows
        .map(
          (r) => `<tr><th><div class="cell-label">${esc(r.label)}</div><div class="cell-sub">${esc(r.sub || '')}</div></th>
          ${fw.columns.map((c) => `<td>${field(fw.id, `${r.id}.${c.id}`, getPath(data, `${r.id}.${c.id}`), { rows: 3 })}</td>`).join('')}</tr>`
        )
        .join('')}</tbody></table></div>`;
  }

  /* ---------- Markdown ---------- */
  function lines(v) {
    return String(v || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  function bullets(v) {
    const l = lines(v);
    return l.length ? l.map((s) => `- ${s.replace(/^[-・●]\s*/, '')}`).join('\n') : '- （未記入）';
  }

  function frameworkMarkdown(fw) {
    const data = project().data[fw.id] || {};
    let md = `## ${fw.name}\n\n`;
    if (fw.layout === 'grid') {
      (fw.extras || []).forEach((x) => data[x.id] && (md += `**${x.label}**：${data[x.id]}\n\n`));
      fw.cells.forEach((c) => {
        const rate = data[c.id + '__rate'] ? `（強さ：${data[c.id + '__rate']}）` : '';
        md += `### ${c.label}${c.sub ? `（${c.sub}）` : ''}${rate}\n${bullets(data[c.id])}\n\n`;
      });
    } else if (fw.layout === 'table') {
      md += `| 視点 | ${fw.columns.map((c) => c.label).join(' | ')} |\n|---|${fw.columns.map(() => '---').join('|')}|\n`;
      fw.rows.forEach((r) => {
        md += `| ${r.label} | ${fw.columns.map((c) => lines(getPath(data, `${r.id}.${c.id}`)).join('<br>') || '').join(' | ')} |\n`;
      });
      md += '\n';
    } else {
      const tool = window.TOOLS[fw.tool];
      md += tool.markdown ? tool.markdown(ctx(fw)) : '';
      md += '\n';
    }
    return md;
  }

  function projectMarkdown() {
    const p = project();
    let md = `# ${p.name}\n\n出力日時：${new Date().toLocaleString('ja-JP')}\n\n`;
    FRAMEWORKS.filter((f) => progressOf(f) > 0).forEach((f) => (md += frameworkMarkdown(f)));
    return md;
  }

  /* ---------- ダウンロード・コピー ---------- */
  function download(filename, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Markdownをコピーしました');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      toast(ok ? 'Markdownをコピーしました' : 'コピーできませんでした');
    }
  }
  const safeName = (s) => s.replace(/[\\/:*?"<>|]/g, '_');

  /* ---------- トースト ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- テキストエリアの自動伸長 ---------- */
  function autoGrow(el) {
    if (el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight + 2, 64) + 'px';
  }
  function autoGrowAll() {
    document.querySelectorAll('#main textarea').forEach(autoGrow);
  }

  /* ---------- イベント ---------- */
  const main = $('#main');

  function handleFieldChange(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.field) return;
    const fwId = currentRoute().fwId;
    if (!fwId) return;
    const fw = FW_BY_ID[fwId];
    let value;
    if (el.type === 'checkbox') value = el.checked;
    else if (el.type === 'radio') {
      if (!el.checked) return;
      value = el.value;
    } else value = el.value;
    setPath(fwData(fwId), el.dataset.field, value);
    touch();
    autoGrow(el);
    updateNavProgress(fw);
    if (currentTool && currentTool.update) currentTool.update(ctx(fw), $('#toolRoot'), el);
    const ss = $('#saveState');
    if (ss) ss.textContent = '✓ 保存しました ' + new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
  main.addEventListener('input', handleFieldChange);
  main.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' || e.target.type === 'radio' || e.target.tagName === 'SELECT') handleFieldChange(e);
  });

  main.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const fwId = currentRoute().fwId;
    const fw = fwId && FW_BY_ID[fwId];
    const action = btn.dataset.action;
    if (action === 'copy-md' && fw) return copyText(frameworkMarkdown(fw));
    if (action === 'print') return window.print();
    if (action === 'clear' && fw) {
      if (confirm(`「${fw.name}」の入力内容をすべて消去しますか？`)) {
        delete project().data[fw.id];
        touch();
        render();
        toast('クリアしました');
      }
      return;
    }
    if (action === 'goto') return (location.hash = `#/fw/${btn.dataset.target}`);
    // ツール固有のアクション（行の追加・削除など）
    if (fw && currentTool && currentTool.actions && currentTool.actions[action]) {
      const c = ctx(fw);
      const rerender = currentTool.actions[action](c, btn);
      touch();
      if (rerender !== false) {
        const root = $('#toolRoot');
        root.innerHTML = currentTool.render(ctx(fw));
        autoGrowAll();
        if (currentTool.update) currentTool.update(ctx(fw), root);
      }
      updateNavProgress(fw);
    }
  });

  /* ---------- グローバルメニュー ---------- */
  const menu = $('#globalMenu');
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-global]');
    if (!g) {
      if (!e.target.closest('#globalMenu')) menu.hidden = true;
      return;
    }
    const act = g.dataset.global;
    if (act !== 'menu-toggle') menu.hidden = true;
    switch (act) {
      case 'menu-toggle':
        menu.hidden = !menu.hidden;
        break;
      case 'new-project': {
        const name = prompt('新しい事例（企業）の名前を入力してください', `事例企業${String.fromCharCode(65 + Object.keys(state.projects).length)}社`);
        if (!name || !name.trim()) return;
        const p = newProject(name.trim());
        state.projects[p.id] = p;
        state.current = p.id;
        saveNow();
        renderProjectSelect();
        render();
        toast(`「${p.name}」を作成しました`);
        break;
      }
      case 'rename-project': {
        const p = project();
        const name = prompt('事例の名前を変更', p.name);
        if (!name || !name.trim()) return;
        p.name = name.trim();
        touch();
        renderProjectSelect();
        render();
        break;
      }
      case 'delete-project': {
        const p = project();
        if (!confirm(`「${p.name}」を削除しますか？この操作は元に戻せません。`)) return;
        delete state.projects[p.id];
        if (!Object.keys(state.projects).length) {
          const np = newProject('事例企業A社');
          state.projects[np.id] = np;
        }
        state.current = Object.keys(state.projects)[0];
        saveNow();
        renderProjectSelect();
        render();
        toast('削除しました');
        break;
      }
      case 'export-md':
        download(`${safeName(project().name)}_分析.md`, projectMarkdown(), 'text/markdown;charset=utf-8');
        break;
      case 'export-json':
        download(`診断士フレームワーク_バックアップ_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json');
        break;
      case 'import-json':
        $('#importFile').click();
        break;
      case 'load-sample': {
        if (!window.SAMPLE_PROJECT) return;
        const sp = { ...newProject(window.SAMPLE_PROJECT.name), data: structuredClone(window.SAMPLE_PROJECT.data) };
        state.projects[sp.id] = sp;
        state.current = sp.id;
        saveNow();
        renderProjectSelect();
        render();
        toast('サンプル事例を追加しました');
        break;
      }
    }
  });

  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      if (!obj || typeof obj.projects !== 'object') throw new Error('形式が正しくありません');
      let count = 0;
      Object.values(obj.projects).forEach((p) => {
        if (!p || typeof p.name !== 'string' || typeof p.data !== 'object') return;
        const id = state.projects[p.id] ? uid() : p.id || uid();
        state.projects[id] = { id, name: p.name, created: p.created || Date.now(), updated: p.updated || Date.now(), data: p.data };
        count++;
      });
      if (!count) throw new Error('事例データが見つかりません');
      saveNow();
      renderProjectSelect();
      render();
      toast(`${count}件の事例を読み込みました`);
    } catch (err) {
      alert('読み込みに失敗しました：' + err.message);
    }
  });

  $('#projectSelect').addEventListener('change', (e) => {
    state.current = e.target.value;
    saveNow();
    render();
  });

  $('#searchInput').addEventListener('input', renderNav);

  /* ---------- モバイル用サイドバー ---------- */
  function closeSidebar() {
    document.body.classList.remove('nav-open');
  }
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  $('#scrim').addEventListener('click', closeSidebar);

  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo(0, 0);
  });
  window.addEventListener('resize', () => {
    clearTimeout(window.__rz);
    window.__rz = setTimeout(autoGrowAll, 150);
  });

  /* ---------- 起動 ---------- */
  renderProjectSelect();
  render();
  saveNow();
})();
