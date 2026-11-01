/* =========================================================
 * 専用ツール（計算・チャート系）
 *  各ツールは以下を実装する
 *   render(c)              … HTML文字列を返す（入力欄には data-field を付与）
 *   update(c, root, el)    … 入力変化時に計算結果・チャートを更新
 *   actions{name(c, btn)}  … data-action ボタンの処理（false 以外を返すと再描画）
 *   progress(data, c)      … 入力状況 0〜1
 *   markdown(c)            … Markdown出力
 * ========================================================= */
(function () {
  'use strict';

  /* ---------- 共通ヘルパー ---------- */
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /** 全角数字・カンマ・％を許容して数値化。空欄は NaN */
  function num(v) {
    if (v == null) return NaN;
    const s = String(v)
      .replace(/[０-９．－]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/[,，\s%％]/g, '')
      .replace(/^▲/, '-')
      .replace(/^△/, '-');
    if (s === '' || s === '-') return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  const ok = (n) => Number.isFinite(n);
  function fmt(n, digits = 0) {
    if (!ok(n)) return '—';
    return n.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  const pct = (n, d = 1) => (ok(n) ? fmt(n * 100, d) + '%' : '—');

  function numInput(key, value, opts = {}) {
    return `<input class="num ${opts.cls || ''}" type="text" inputmode="decimal" data-field="${esc(key)}" value="${esc(value ?? '')}" placeholder="${esc(opts.placeholder || '')}" ${opts.aria ? `aria-label="${esc(opts.aria)}"` : ''}>`;
  }
  function textInput(key, value, opts = {}) {
    return `<input type="text" class="${opts.cls || ''}" data-field="${esc(key)}" value="${esc(value ?? '')}" placeholder="${esc(opts.placeholder || '')}" ${opts.aria ? `aria-label="${esc(opts.aria)}"` : ''}>`;
  }
  function rows(data, def) {
    if (!Array.isArray(data.rows) || !data.rows.length) data.rows = def();
    return data.rows;
  }
  function removeRow(c, btn) {
    const i = Number(btn.dataset.index);
    c.data.rows.splice(i, 1);
  }
  const unitOf = (d) => d.unit || '千円';
  function unitSelect(d) {
    return `<label class="extra">金額の単位
      <select data-field="unit">${['円', '千円', '万円', '百万円'].map((u) => `<option ${u === unitOf(d) ? 'selected' : ''}>${u}</option>`).join('')}</select></label>`;
  }
  function kpi(label, value, sub, cls = '') {
    return `<div class="kpi ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;
  }
  const filledLines = (v) =>
    String(v || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  const TOOLS = {};

  /* =======================================================
   * クロスSWOT
   * ======================================================= */
  TOOLS.crossSwot = {
    render(c) {
      const swot = c.project().data.swot || {};
      const d = c.data;
      const list = (k, cls) => {
        const l = filledLines(swot[k]);
        return l.length
          ? `<ul class="ref-list ${cls}">${l.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
          : `<p class="ref-empty">SWOT分析で未入力</p>`;
      };
      const empty = !['s', 'w', 'o', 't'].some((k) => filledLines(swot[k]).length);
      const ta = (k, ph) => `<textarea class="cell-input" data-field="${k}" rows="5" placeholder="${esc(ph)}">${esc(d[k] || '')}</textarea>`;
      return `
        ${empty ? `<div class="callout">まだSWOT分析が入力されていません。先に <button class="link-btn" data-action="goto" data-target="swot">SWOT分析</button> を入力すると、ここに自動で表示されます。</div>` : ''}
        <div class="table-wrap"><table class="cross-table">
          <thead><tr>
            <th class="corner"><span>内部環境 →</span><span>外部環境 ↓</span></th>
            <th class="tone-green"><div class="cell-label">強み（S）</div>${list('s', 'green')}</th>
            <th class="tone-red"><div class="cell-label">弱み（W）</div>${list('w', 'red')}</th>
          </tr></thead>
          <tbody>
            <tr>
              <th class="tone-blue"><div class="cell-label">機会（O）</div>${list('o', 'blue')}</th>
              <td><div class="cross-label">SO：積極化戦略<small>強みを活かして機会を取り込む</small></div>${ta('so', '例：熟練技術を活かし、健康志向の高まりに対応した高付加価値商品を開発する')}</td>
              <td><div class="cross-label">WO：段階的施策<small>弱みを克服して機会を活かす</small></div>${ta('wo', '例：ECサイトを整備して販路の弱さを補い、インバウンド需要を取り込む')}</td>
            </tr>
            <tr>
              <th class="tone-orange"><div class="cell-label">脅威（T）</div>${list('t', 'orange')}</th>
              <td><div class="cross-label">ST：差別化戦略<small>強みで脅威を回避する</small></div>${ta('st', '例：大手チェーンにはない対面接客と地域密着のサービスで差別化する')}</td>
              <td><div class="cross-label">WT：専守防衛・撤退<small>最悪の事態を回避する</small></div>${ta('wt', '例：不採算商品を絞り込み、原材料高騰の影響を抑える')}</td>
            </tr>
          </tbody>
        </table></div>
        <p class="note">💡 SWOT分析の内容を変更すると、このページを開き直したときに反映されます。</p>`;
    },
    progress(d) {
      return ['so', 'wo', 'st', 'wt'].filter((k) => filledLines(d[k]).length).length / 4;
    },
    markdown(c) {
      const d = c.data;
      const b = (v) => filledLines(v).map((s) => `- ${s}`).join('\n') || '- （未記入）';
      return `### SO：積極化戦略\n${b(d.so)}\n\n### WO：段階的施策\n${b(d.wo)}\n\n### ST：差別化戦略\n${b(d.st)}\n\n### WT：専守防衛・撤退\n${b(d.wt)}\n`;
    },
  };

  /* =======================================================
   * VRIO
   * ======================================================= */
  function vrioResult(r) {
    if (!r.v) return { label: '競争劣位', cls: 'bad', level: 0 };
    if (!r.r) return { label: '競争均衡', cls: 'neutral', level: 1 };
    if (!r.i) return { label: '一時的な競争優位', cls: 'fair', level: 2 };
    if (!r.o) return { label: '持続的競争優位（未活用）', cls: 'fair', level: 3 };
    return { label: '持続的な競争優位', cls: 'good', level: 4 };
  }
  TOOLS.vrio = {
    render(c) {
      const rs = rows(c.data, () => [{ name: '' }, { name: '' }, { name: '' }]);
      const qs = [
        ['v', 'V 経済価値', 'その資源は外部の機会を活かしたり脅威を無力化したりできるか？'],
        ['r', 'R 希少性', 'その資源を保有している競合は少ないか？'],
        ['i', 'I 模倣困難性', '保有しない企業が獲得・開発するのにコストがかかるか？'],
        ['o', 'O 組織', '資源を活用するための組織・仕組みが整っているか？'],
      ];
      return `
        <div class="table-wrap"><table class="data-table vrio-table">
          <thead><tr><th>経営資源・ケイパビリティ</th>${qs.map((q) => `<th title="${esc(q[2])}">${q[1]}</th>`).join('')}<th>評価</th><th></th></tr></thead>
          <tbody>${rs
            .map(
              (r, i) => `<tr>
              <td>${textInput(`rows.${i}.name`, r.name, { placeholder: '例：熟練職人の技術', aria: '経営資源' })}</td>
              ${qs.map((q) => `<td class="center"><label class="check"><input type="checkbox" data-field="rows.${i}.${q[0]}" ${r[q[0]] ? 'checked' : ''}><span></span></label></td>`).join('')}
              <td><span class="badge" data-vrio="${i}"></span></td>
              <td><button class="icon-btn" data-action="remove" data-index="${i}" aria-label="行を削除">✕</button></td>
            </tr>`
            )
            .join('')}</tbody>
        </table></div>
        <button class="btn" data-action="add">＋ 経営資源を追加</button>
        <div class="legend-box">
          <h4>評価の見方（バーニー）</h4>
          <ol class="vrio-legend">
            <li><span class="badge bad">競争劣位</span> 経済価値なし</li>
            <li><span class="badge neutral">競争均衡</span> 価値はあるが希少でない</li>
            <li><span class="badge fair">一時的な競争優位</span> 価値・希少性あり、模倣は容易</li>
            <li><span class="badge fair">持続的競争優位（未活用）</span> V・R・Iあり、組織が未整備</li>
            <li><span class="badge good">持続的な競争優位</span> V・R・I・Oすべてあり</li>
          </ol>
          <p class="note">質問の詳細は各列見出しにカーソルを合わせると表示されます。</p>
        </div>`;
    },
    update(c, root) {
      (c.data.rows || []).forEach((r, i) => {
        const el = root.querySelector(`[data-vrio="${i}"]`);
        if (!el) return;
        const res = vrioResult(r);
        el.textContent = r.name ? res.label : '—';
        el.className = 'badge ' + (r.name ? res.cls : '');
      });
    },
    actions: {
      add(c) {
        rows(c.data, () => []).push({ name: '' });
      },
      remove: removeRow,
    },
    progress(d) {
      return (d.rows || []).some((r) => r.name) ? 1 : 0;
    },
    markdown(c) {
      const rs = (c.data.rows || []).filter((r) => r.name);
      if (!rs.length) return '（未記入）\n';
      const m = (b) => (b ? '○' : '×');
      return `| 経営資源 | V | R | I | O | 評価 |\n|---|:-:|:-:|:-:|:-:|---|\n${rs.map((r) => `| ${r.name} | ${m(r.v)} | ${m(r.r)} | ${m(r.i)} | ${m(r.o)} | ${vrioResult(r).label} |`).join('\n')}\n`;
    },
  };

  /* =======================================================
   * PPM
   * ======================================================= */
  const PPM_INFO = {
    star: { label: '花形', en: 'Star', cls: 'q-star', advice: '高成長市場でシェア首位。資金流入も流出も大きい。シェア維持のための積極投資を続け、将来の「金のなる木」へ育てる。' },
    cow: { label: '金のなる木', en: 'Cash Cow', cls: 'q-cow', advice: '低成長市場でシェア首位。投資を抑えて資金を回収し、「問題児」や「花形」への資金源とする。' },
    question: { label: '問題児', en: 'Question Mark', cls: 'q-question', advice: '高成長市場でシェアが低い。資金流出が大きい。選択的に投資してシェアを拡大し「花形」化を狙うか、見込みがなければ撤退。' },
    dog: { label: '負け犬', en: 'Dog', cls: 'q-dog', advice: '低成長市場でシェアが低い。撤退・縮小を検討（ただしシナジーや固定客の観点から残す判断もありうる）。' },
  };
  function ppmClass(growth, share, th) {
    if (!ok(growth) || !ok(share)) return null;
    if (growth >= th) return share >= 1 ? 'star' : 'question';
    return share >= 1 ? 'cow' : 'dog';
  }
  TOOLS.ppm = {
    render(c) {
      const d = c.data;
      const rs = rows(d, () => [{ name: '' }, { name: '' }]);
      return `
        <div class="extras">
          <label class="extra">市場成長率の基準線（%）${numInput('threshold', d.threshold ?? '10', { cls: 'short' })}</label>
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>事業・製品名</th><th>市場成長率（%）</th><th>相対的市場シェア（倍）</th><th>売上高</th><th>分類</th><th></th></tr></thead>
          <tbody>${rs
            .map(
              (r, i) => `<tr>
              <td>${textInput(`rows.${i}.name`, r.name, { placeholder: '例：業務用部品事業' })}</td>
              <td>${numInput(`rows.${i}.growth`, r.growth, { placeholder: '例：12' })}</td>
              <td>${numInput(`rows.${i}.share`, r.share, { placeholder: '例：1.5' })}</td>
              <td>${numInput(`rows.${i}.sales`, r.sales, { placeholder: '例：500' })}</td>
              <td><span class="badge" data-ppm="${i}">—</span></td>
              <td><button class="icon-btn" data-action="remove" data-index="${i}" aria-label="行を削除">✕</button></td>
            </tr>`
            )
            .join('')}</tbody>
        </table></div>
        <button class="btn" data-action="add">＋ 事業を追加</button>
        <div class="split">
          <div class="chart-box" id="ppmChart"></div>
          <div id="ppmAdvice" class="advice-list"></div>
        </div>
        <p class="note">相対的市場シェア＝自社シェア÷最大競合のシェア（自社が首位なら2位とのシェア比）。グラフの横軸は対数目盛で、左ほどシェアが高くなります。円の大きさは売上高を表します。</p>`;
    },
    update(c, root) {
      const d = c.data;
      const th = ok(num(d.threshold)) ? num(d.threshold) : 10;
      const items = (d.rows || []).map((r, i) => ({ i, name: r.name || `事業${i + 1}`, g: num(r.growth), s: num(r.share), sales: num(r.sales) }));
      items.forEach((it) => {
        const k = ppmClass(it.g, it.s, th);
        const el = root.querySelector(`[data-ppm="${it.i}"]`);
        if (el) {
          el.textContent = k ? PPM_INFO[k].label : '—';
          el.className = 'badge ' + (k ? PPM_INFO[k].cls : '');
        }
      });
      const valid = items.filter((it) => ok(it.g) && ok(it.s) && it.s > 0);

      // チャート
      const W = 520, H = 400, L = 54, R = 16, T = 16, B = 44;
      const pw = W - L - R, ph = H - T - B;
      const gs = valid.map((v) => v.g);
      const gMax = Math.max(th * 2, ...gs.map((g) => g + 5), 20);
      const gMin = Math.min(0, ...gs.map((g) => g - 5));
      const sMin = 0.1, sMax = 10;
      const x = (s) => L + ((Math.log10(sMax) - Math.log10(Math.min(sMax, Math.max(sMin, s)))) / (Math.log10(sMax) - Math.log10(sMin))) * pw;
      const y = (g) => T + ((gMax - g) / (gMax - gMin)) * ph;
      const maxSales = Math.max(1, ...valid.map((v) => (ok(v.sales) ? v.sales : 0)));
      const xm = x(1), ym = y(th);
      let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="PPMマトリクス">
        <rect x="${L}" y="${T}" width="${xm - L}" height="${ym - T}" class="q-bg q-star"/>
        <rect x="${xm}" y="${T}" width="${L + pw - xm}" height="${ym - T}" class="q-bg q-question"/>
        <rect x="${L}" y="${ym}" width="${xm - L}" height="${T + ph - ym}" class="q-bg q-cow"/>
        <rect x="${xm}" y="${ym}" width="${L + pw - xm}" height="${T + ph - ym}" class="q-bg q-dog"/>
        <text x="${L + 8}" y="${T + 18}" class="q-label">花形</text>
        <text x="${L + pw - 8}" y="${T + 18}" class="q-label" text-anchor="end">問題児</text>
        <text x="${L + 8}" y="${T + ph - 8}" class="q-label">金のなる木</text>
        <text x="${L + pw - 8}" y="${T + ph - 8}" class="q-label" text-anchor="end">負け犬</text>
        <line x1="${xm}" y1="${T}" x2="${xm}" y2="${T + ph}" class="guide"/>
        <line x1="${L}" y1="${ym}" x2="${L + pw}" y2="${ym}" class="guide"/>
        <rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="frame"/>`;
      [10, 5, 2, 1, 0.5, 0.2, 0.1].forEach((s) => (svg += `<text x="${x(s)}" y="${T + ph + 16}" class="tick" text-anchor="middle">${s}</text>`));
      const step = Math.max(5, Math.ceil((gMax - gMin) / 6 / 5) * 5);
      for (let g = Math.ceil(gMin / step) * step; g <= gMax; g += step) svg += `<text x="${L - 6}" y="${y(g) + 4}" class="tick" text-anchor="end">${g}%</text>`;
      svg += `<text x="${L + pw / 2}" y="${H - 6}" class="axis-title" text-anchor="middle">相対的市場シェア（倍・対数目盛）← 高い　低い →</text>
        <text x="14" y="${T + ph / 2}" class="axis-title" text-anchor="middle" transform="rotate(-90 14 ${T + ph / 2})">市場成長率</text>`;
      valid.forEach((v) => {
        const r = 8 + Math.sqrt((ok(v.sales) ? Math.max(0, v.sales) : 0) / maxSales) * 30;
        const k = ppmClass(v.g, v.s, th);
        svg += `<g class="bubble ${PPM_INFO[k].cls}"><circle cx="${x(v.s)}" cy="${y(v.g)}" r="${r}"/><text x="${x(v.s)}" y="${y(v.g) + 4}" text-anchor="middle">${esc(v.name)}</text></g>`;
      });
      svg += `</svg>`;
      root.querySelector('#ppmChart').innerHTML = svg;

      const advice = root.querySelector('#ppmAdvice');
      const groups = {};
      valid.forEach((v) => (groups[ppmClass(v.g, v.s, th)] ||= []).push(v.name));
      advice.innerHTML = ['star', 'cow', 'question', 'dog']
        .map(
          (k) => `<div class="advice ${PPM_INFO[k].cls} ${groups[k] ? '' : 'dim'}">
          <div class="advice-head"><b>${PPM_INFO[k].label}</b> <small>${PPM_INFO[k].en}</small>${groups[k] ? `<span class="advice-items">${groups[k].map(esc).join('、')}</span>` : ''}</div>
          <p>${PPM_INFO[k].advice}</p></div>`
        )
        .join('');
    },
    actions: {
      add(c) {
        rows(c.data, () => []).push({ name: '' });
      },
      remove: removeRow,
    },
    progress(d) {
      return (d.rows || []).some((r) => ok(num(r.growth)) && ok(num(r.share))) ? 1 : 0;
    },
    markdown(c) {
      const d = c.data;
      const th = ok(num(d.threshold)) ? num(d.threshold) : 10;
      const rs = (d.rows || []).filter((r) => r.name || r.growth || r.share);
      if (!rs.length) return '（未記入）\n';
      return `市場成長率の基準：${th}%\n\n| 事業 | 市場成長率 | 相対的市場シェア | 売上高 | 分類 |\n|---|--:|--:|--:|---|\n${rs
        .map((r) => {
          const k = ppmClass(num(r.growth), num(r.share), th);
          return `| ${r.name || ''} | ${r.growth || ''}% | ${r.share || ''} | ${r.sales || ''} | ${k ? PPM_INFO[k].label : '—'} |`;
        })
        .join('\n')}\n`;
    },
  };

  /* =======================================================
   * 製品ライフサイクル
   * ======================================================= */
  const PLC = [
    { id: 'intro', label: '導入期', sales: '低い', profit: 'マイナス', comp: 'ほとんどいない', cust: '革新的採用者', goal: '製品の認知と試用', product: '基本的な製品', price: 'コストプラス（上澄み吸収価格 or 浸透価格）', place: '選択的', promo: '認知向上・試用促進' },
    { id: 'growth', label: '成長期', sales: '急増', profit: '増加', comp: '増加', cust: '初期少数採用者', goal: 'シェアの最大化', product: '製品拡張・サービス・保証', price: '市場浸透価格', place: '開放的（拡大）', promo: '認知と関心の拡大・ブランド選好' },
    { id: 'mature', label: '成熟期', sales: 'ピーク', profit: '高い（やがて減少）', comp: '安定〜減少（激しい）', cust: '大衆（前期・後期多数採用者）', goal: '利益の最大化とシェア防衛', product: 'ブランド・モデルの多様化', price: '競合に対抗・追随', place: 'より開放的', promo: 'ブランドの差別化・ベネフィット訴求' },
    { id: 'decline', label: '衰退期', sales: '減少', profit: '減少', comp: '減少', cust: '採用遅滞者', goal: '支出削減・ブランドの収穫', product: '弱い品目の整理', price: '値下げ', place: '選択的（不採算店の撤退）', promo: '最低限に削減' },
  ];
  function plcChart(rs) {
    const W = 640, H = 220, L = 20, R = 20, T = 18, B = 34;
    const pw = W - L - R, ph = H - T - B;
    const px = (t) => L + t * pw, py = (v) => T + ph - v * ph;
    const salesPath = `M${px(0)},${py(0.03)} C${px(0.18)},${py(0.05)} ${px(0.28)},${py(0.35)} ${px(0.42)},${py(0.7)} S${px(0.62)},${py(1)} ${px(0.72)},${py(0.92)} S${px(0.9)},${py(0.45)} ${px(1)},${py(0.28)}`;
    const profitPath = `M${px(0)},${py(0.18)} C${px(0.12)},${py(0.1)} ${px(0.2)},${py(0.12)} ${px(0.3)},${py(0.35)} S${px(0.5)},${py(0.7)} ${px(0.6)},${py(0.62)} S${px(0.85)},${py(0.28)} ${px(1)},${py(0.18)}`;
    const bounds = [0, 0.22, 0.48, 0.78, 1];
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart plc-chart" role="img" aria-label="製品ライフサイクル曲線">`;
    PLC.forEach((s, i) => {
      svg += `<rect x="${px(bounds[i])}" y="${T}" width="${px(bounds[i + 1]) - px(bounds[i])}" height="${ph}" class="plc-band plc-${s.id}"/>
        <text x="${(px(bounds[i]) + px(bounds[i + 1])) / 2}" y="${H - 12}" text-anchor="middle" class="axis-title">${s.label}</text>`;
    });
    svg += `<line x1="${L}" y1="${py(0.18)}" x2="${L + pw}" y2="${py(0.18)}" class="guide"/>
      <text x="${L + 4}" y="${py(0.18) - 4}" class="tick">利益 0</text>
      <path d="${profitPath}" class="line line-profit"/><path d="${salesPath}" class="line line-sales"/>
      <text x="${px(0.62)}" y="${py(1) - 4}" class="legend-text sales">売上高</text>
      <text x="${px(0.52)}" y="${py(0.72) + 16}" class="legend-text profit">利益</text>`;
    const counts = {};
    rs.forEach((r) => {
      const i = PLC.findIndex((s) => s.id === r.stage);
      if (i < 0 || !r.name) return;
      const n = (counts[i] = (counts[i] || 0) + 1);
      const cx = (px(bounds[i]) + px(bounds[i + 1])) / 2;
      svg += `<g class="plc-pin"><rect x="${cx - 60}" y="${T + 6 + (n - 1) * 22}" width="120" height="18" rx="9"/><text x="${cx}" y="${T + 19 + (n - 1) * 22}" text-anchor="middle">${esc(r.name.slice(0, 10))}</text></g>`;
    });
    return svg + `</svg>`;
  }
  TOOLS.plc = {
    render(c) {
      const rs = rows(c.data, () => [{ name: '', stage: '' }]);
      return `
        <div class="chart-box" id="plcChart"></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>製品・サービス</th><th>現在の段階</th><th>推奨される戦略の方向性</th><th></th></tr></thead>
          <tbody>${rs
            .map(
              (r, i) => `<tr>
                <td>${textInput(`rows.${i}.name`, r.name, { placeholder: '例：主力商品X' })}</td>
                <td><select data-field="rows.${i}.stage"><option value="">― 選択 ―</option>${PLC.map((s) => `<option value="${s.id}" ${s.id === r.stage ? 'selected' : ''}>${s.label}</option>`).join('')}</select></td>
                <td class="small" data-plc="${i}">—</td>
                <td><button class="icon-btn" data-action="remove" data-index="${i}" aria-label="行を削除">✕</button></td>
              </tr>`
            )
            .join('')}</tbody>
        </table></div>
        <button class="btn" data-action="add">＋ 製品を追加</button>
        <h3 class="sub-title">段階別の特徴と戦略（コトラー）</h3>
        <div class="table-wrap"><table class="ref-table">
          <thead><tr><th></th>${PLC.map((s) => `<th class="plc-h plc-${s.id}">${s.label}</th>`).join('')}</tr></thead>
          <tbody>
            ${[
              ['売上高', 'sales'], ['利益', 'profit'], ['競合', 'comp'], ['顧客', 'cust'], ['マーケティング目的', 'goal'],
              ['製品', 'product'], ['価格', 'price'], ['流通', 'place'], ['プロモーション', 'promo'],
            ].map(([lab, k]) => `<tr><th>${lab}</th>${PLC.map((s) => `<td>${s[k]}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table></div>`;
    },
    update(c, root) {
      const rs = c.data.rows || [];
      root.querySelector('#plcChart').innerHTML = plcChart(rs);
      rs.forEach((r, i) => {
        const el = root.querySelector(`[data-plc="${i}"]`);
        if (!el) return;
        const st = PLC.find((s) => s.id === r.stage);
        el.innerHTML = st ? `<b>${st.goal}</b><br>製品：${st.product}／価格：${st.price}／流通：${st.place}／販促：${st.promo}` : '—';
      });
    },
    actions: {
      add(c) {
        rows(c.data, () => []).push({ name: '', stage: '' });
      },
      remove: removeRow,
    },
    progress(d) {
      return (d.rows || []).some((r) => r.name && r.stage) ? 1 : 0;
    },
    markdown(c) {
      const rs = (c.data.rows || []).filter((r) => r.name);
      if (!rs.length) return '（未記入）\n';
      return rs
        .map((r) => {
          const st = PLC.find((s) => s.id === r.stage);
          return `- **${r.name}**：${st ? `${st.label}（${st.goal}）` : '段階未選択'}`;
        })
        .join('\n') + '\n';
    },
  };

  /* =======================================================
   * ABC分析
   * ======================================================= */
  function abcCalc(d) {
    const a = ok(num(d.ta)) ? num(d.ta) : 70;
    const b = ok(num(d.tb)) ? num(d.tb) : 90;
    const items = (d.rows || [])
      .map((r, i) => ({ i, name: r.name || `品目${i + 1}`, v: num(r.value) }))
      .filter((it) => ok(it.v) && it.v >= 0)
      .sort((x, y) => y.v - x.v);
    const total = items.reduce((s, it) => s + it.v, 0);
    let cum = 0;
    items.forEach((it, k) => {
      cum += it.v;
      it.share = total ? it.v / total : 0;
      it.cum = total ? cum / total : 0;
      // 累積構成比が a% 以下 → A、b% 以下 → B、それ以外 → C（先頭品目は常にA）
      const c = it.cum * 100 - 1e-9;
      it.rank = k === 0 || c <= a ? 'A' : c <= b ? 'B' : 'C';
    });
    return { items, total, a, b };
  }
  TOOLS.abc = {
    render(c) {
      const d = c.data;
      const rs = rows(d, () => Array.from({ length: 5 }, () => ({ name: '', value: '' })));
      return `
        <div class="extras">
          <label class="extra">Aランクの上限（累積%）${numInput('ta', d.ta ?? '70', { cls: 'short' })}</label>
          <label class="extra">Bランクの上限（累積%）${numInput('tb', d.tb ?? '90', { cls: 'short' })}</label>
        </div>
        <div class="split">
          <div>
            <div class="table-wrap"><table class="data-table">
              <thead><tr><th>品目名</th><th>金額・数量</th><th></th></tr></thead>
              <tbody>${rs
                .map(
                  (r, i) => `<tr>
                  <td>${textInput(`rows.${i}.name`, r.name, { placeholder: `品目${i + 1}` })}</td>
                  <td>${numInput(`rows.${i}.value`, r.value, { placeholder: '例：1200' })}</td>
                  <td><button class="icon-btn" data-action="remove" data-index="${i}" aria-label="行を削除">✕</button></td>
                </tr>`
                )
                .join('')}</tbody>
            </table></div>
            <button class="btn" data-action="add">＋ 品目を追加</button>
            <button class="btn btn-ghost" data-action="add5">＋5行</button>
          </div>
          <div>
            <div class="chart-box" id="abcChart"></div>
            <div id="abcTable"></div>
          </div>
        </div>`;
    },
    update(c, root) {
      const { items, total, a, b } = abcCalc(c.data);
      const W = 520, H = 300, L = 50, R = 44, T = 16, B = 56;
      const pw = W - L - R, ph = H - T - B;
      let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="パレート図">`;
      if (!items.length || !total) {
        svg += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="placeholder-text">品目と金額を入力するとパレート図が表示されます</text></svg>`;
        root.querySelector('#abcChart').innerHTML = svg;
        root.querySelector('#abcTable').innerHTML = '';
        return;
      }
      const maxV = items[0].v || 1;
      const bw = pw / items.length;
      svg += `<rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="frame"/>`;
      [a, b].forEach((t) => (svg += `<line x1="${L}" x2="${L + pw}" y1="${T + ph - (t / 100) * ph}" y2="${T + ph - (t / 100) * ph}" class="guide"/><text x="${L + pw + 4}" y="${T + ph - (t / 100) * ph + 4}" class="tick">${t}%</text>`));
      svg += `<text x="${L + pw + 4}" y="${T + 4}" class="tick">100%</text><text x="${L - 6}" y="${T + 4}" class="tick" text-anchor="end">${fmt(maxV)}</text><text x="${L - 6}" y="${T + ph}" class="tick" text-anchor="end">0</text>`;
      let pts = [`${L},${T + ph}`];
      items.forEach((it, k) => {
        const h = (it.v / maxV) * ph;
        svg += `<rect x="${L + k * bw + bw * 0.12}" y="${T + ph - h}" width="${bw * 0.76}" height="${h}" class="bar rank-${it.rank}"><title>${esc(it.name)}：${fmt(it.v)}（${pct(it.share)}）</title></rect>`;
        if (items.length <= 14) svg += `<text x="${L + k * bw + bw / 2}" y="${T + ph + 14}" text-anchor="end" class="tick" transform="rotate(-35 ${L + k * bw + bw / 2} ${T + ph + 14})">${esc(it.name.slice(0, 8))}</text>`;
        pts.push(`${L + (k + 1) * bw},${T + ph - it.cum * ph}`);
      });
      svg += `<polyline points="${pts.join(' ')}" class="line line-cum"/>`;
      pts.slice(1).forEach((p) => {
        const [px, py] = p.split(',');
        svg += `<circle cx="${px}" cy="${py}" r="3" class="dot-cum"/>`;
      });
      svg += `</svg>`;
      root.querySelector('#abcChart').innerHTML = svg;

      const cnt = { A: 0, B: 0, C: 0 }, sum = { A: 0, B: 0, C: 0 };
      items.forEach((it) => {
        cnt[it.rank]++;
        sum[it.rank] += it.v;
      });
      root.querySelector('#abcTable').innerHTML = `
        <div class="kpi-row">
          ${['A', 'B', 'C'].map((r) => kpi(`${r}ランク`, `${cnt[r]}品目`, `品目数 ${pct(cnt[r] / items.length, 0)}／金額 ${pct(sum[r] / total, 0)}`, 'rank-' + r)).join('')}
        </div>
        <div class="table-wrap"><table class="data-table compact">
          <thead><tr><th>順位</th><th>品目</th><th class="r">金額</th><th class="r">構成比</th><th class="r">累積構成比</th><th>ランク</th></tr></thead>
          <tbody>${items.map((it, k) => `<tr><td>${k + 1}</td><td>${esc(it.name)}</td><td class="r">${fmt(it.v)}</td><td class="r">${pct(it.share)}</td><td class="r">${pct(it.cum)}</td><td><span class="badge rank-${it.rank}">${it.rank}</span></td></tr>`).join('')}</tbody>
        </table></div>`;
    },
    actions: {
      add(c) {
        rows(c.data, () => []).push({ name: '', value: '' });
      },
      add5(c) {
        const r = rows(c.data, () => []);
        for (let i = 0; i < 5; i++) r.push({ name: '', value: '' });
      },
      remove: removeRow,
    },
    progress(d) {
      return abcCalc(d).items.length >= 2 ? 1 : abcCalc(d).items.length ? 0.5 : 0;
    },
    markdown(c) {
      const { items } = abcCalc(c.data);
      if (!items.length) return '（未記入）\n';
      return `| 順位 | 品目 | 金額 | 構成比 | 累積構成比 | ランク |\n|--:|---|--:|--:|--:|:-:|\n${items.map((it, k) => `| ${k + 1} | ${it.name} | ${fmt(it.v)} | ${pct(it.share)} | ${pct(it.cum)} | ${it.rank} |`).join('\n')}\n`;
    },
  };

  /* =======================================================
   * EOQ・発注点
   * ======================================================= */
  function eoqCalc(d) {
    const D = num(d.demand), S = num(d.orderCost);
    let H = num(d.holdCost);
    if (!ok(H) && ok(num(d.price)) && ok(num(d.holdRate))) H = (num(d.price) * num(d.holdRate)) / 100;
    const Q = D > 0 && S > 0 && H > 0 ? Math.sqrt((2 * D * S) / H) : NaN;
    const n = D / Q;
    const orderTotal = n * S, holdTotal = (Q / 2) * H;
    const days = ok(num(d.days)) && num(d.days) > 0 ? num(d.days) : 250;
    const daily = D / days;
    const LT = num(d.lead), sigma = num(d.sigma), k = ok(num(d.k)) ? num(d.k) : 1.65;
    const safety = ok(sigma) && ok(LT) ? k * sigma * Math.sqrt(LT) : 0;
    const rop = ok(LT) ? daily * LT + safety : NaN;
    return { D, S, H, Q, n, orderTotal, holdTotal, total: orderTotal + holdTotal, daily, days, LT, sigma, k, safety, rop, cycle: days / n };
  }
  TOOLS.eoq = {
    render(c) {
      const d = c.data;
      const row = (key, label, ph, help) => `<label class="form-row"><span>${label}${help ? `<small>${help}</small>` : ''}</span>${numInput(key, d[key], { placeholder: ph })}</label>`;
      return `
        <div class="split">
          <div class="form-card">
            <h3>経済的発注量（EOQ）</h3>
            ${row('demand', '年間需要量（個）', '例：12000')}
            ${row('orderCost', '1回あたり発注費用（円）', '例：5000')}
            ${row('holdCost', '1個あたり年間保管費用（円）', '例：120', '空欄なら下の単価×保管費率で計算')}
            ${row('price', '（任意）単価（円）', '例：1000')}
            ${row('holdRate', '（任意）年間保管費率（%）', '例：12')}
            <h3>発注点・安全在庫</h3>
            ${row('days', '年間稼働日数（日）', '250')}
            ${row('lead', '調達期間（リードタイム・日）', '例：4')}
            ${row('sigma', '1日あたり需要の標準偏差（個）', '例：10')}
            ${row('k', '安全係数', '1.65', '欠品率5%≒1.65、1%≒2.33')}
          </div>
          <div>
            <div id="eoqOut"></div>
            <div class="chart-box" id="eoqChart"></div>
          </div>
        </div>`;
    },
    update(c, root) {
      const r = eoqCalc(c.data);
      root.querySelector('#eoqOut').innerHTML = `
        <div class="kpi-row">
          ${kpi('経済的発注量（EOQ）', ok(r.Q) ? fmt(r.Q, 1) + ' 個' : '—', ok(r.Q) ? `実務上は約 ${fmt(Math.round(r.Q))} 個` : '年間需要量・発注費用・保管費用を入力', 'accent')}
          ${kpi('年間発注回数', ok(r.n) ? fmt(r.n, 1) + ' 回' : '—', ok(r.cycle) ? `発注間隔 約 ${fmt(r.cycle, 1)} 日` : '')}
          ${kpi('年間総在庫費用', ok(r.total) ? fmt(r.total) + ' 円' : '—', ok(r.total) ? `発注費 ${fmt(r.orderTotal)}＋保管費 ${fmt(r.holdTotal)}` : '')}
        </div>
        <div class="kpi-row">
          ${kpi('1日あたり平均需要', ok(r.daily) ? fmt(r.daily, 1) + ' 個' : '—', '')}
          ${kpi('安全在庫', ok(r.LT) && ok(r.sigma) ? fmt(r.safety, 1) + ' 個' : '—', ok(r.sigma) && ok(r.LT) ? `${r.k} × ${r.sigma} × √${r.LT}` : '標準偏差・調達期間を入力')}
          ${kpi('発注点', ok(r.rop) ? fmt(r.rop, 1) + ' 個' : '—', ok(r.rop) ? '在庫がこの量まで減ったら発注' : '', 'accent')}
        </div>`;
      // 費用曲線
      const box = root.querySelector('#eoqChart');
      if (!ok(r.Q)) {
        box.innerHTML = '';
        return;
      }
      const W = 520, H = 260, L = 60, R = 16, T = 16, B = 40;
      const pw = W - L - R, ph = H - T - B;
      const qMax = r.Q * 2.5, N = 80;
      const f = (q) => ({ o: (r.D / q) * r.S, h: (q / 2) * r.H });
      const yMax = r.total * 2.2;
      const X = (q) => L + (q / qMax) * pw, Y = (v) => T + ph - (Math.min(v, yMax) / yMax) * ph;
      const path = (fn) => {
        let p = '';
        for (let k = 1; k <= N; k++) {
          const q = (qMax * k) / N;
          p += `${k === 1 ? 'M' : 'L'}${X(q).toFixed(1)},${Y(fn(q)).toFixed(1)}`;
        }
        return p;
      };
      box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="在庫費用曲線">
        <rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="frame"/>
        <path d="${path((q) => f(q).h)}" class="line line-hold"/>
        <path d="${path((q) => f(q).o)}" class="line line-order"/>
        <path d="${path((q) => f(q).o + f(q).h)}" class="line line-total"/>
        <line x1="${X(r.Q)}" x2="${X(r.Q)}" y1="${T}" y2="${T + ph}" class="guide"/>
        <circle cx="${X(r.Q)}" cy="${Y(r.total)}" r="5" class="dot-key"/>
        <text x="${X(r.Q) + 6}" y="${Y(r.total) - 8}" class="tick strong">EOQ ${fmt(r.Q, 0)}</text>
        <text x="${L + pw / 2}" y="${H - 8}" class="axis-title" text-anchor="middle">1回あたり発注量（個）</text>
        <text x="${L - 6}" y="${T + 4}" class="tick" text-anchor="end">${fmt(yMax)}</text>
        <text x="${L - 6}" y="${T + ph}" class="tick" text-anchor="end">0</text>
        <g class="legend"><text x="${L + pw - 6}" y="${T + 16}" text-anchor="end" class="legend-text total">― 総在庫費用</text>
        <text x="${L + pw - 6}" y="${T + 32}" text-anchor="end" class="legend-text order">― 発注費用</text>
        <text x="${L + pw - 6}" y="${T + 48}" text-anchor="end" class="legend-text hold">― 保管費用</text></g>
      </svg>`;
    },
    progress(d) {
      return ok(eoqCalc(d).Q) ? 1 : ['demand', 'orderCost', 'holdCost'].some((k) => ok(num(d[k]))) ? 0.5 : 0;
    },
    markdown(c) {
      const r = eoqCalc(c.data);
      return `- 年間需要量：${fmt(r.D)} 個／発注費用：${fmt(r.S)} 円／回／保管費用：${fmt(r.H, 1)} 円／個・年\n- **経済的発注量（EOQ）：${fmt(r.Q, 1)} 個**（年間発注回数 ${fmt(r.n, 1)} 回、総在庫費用 ${fmt(r.total)} 円）\n- 安全在庫：${fmt(r.safety, 1)} 個\n- **発注点：${fmt(r.rop, 1)} 個**\n`;
    },
  };

  /* =======================================================
   * 損益分岐点分析（CVP）
   * ======================================================= */
  function cvpCalc(d) {
    const S = num(d.sales), V = num(d.vc), F = num(d.fc), P = num(d.target);
    const vr = V / S;
    const mr = 1 - vr;
    const mp = S - V;
    const op = mp - F;
    const bep = mr > 0 ? F / mr : NaN;
    return {
      S, V, F, P, vr, mr, mp, op, bep,
      bepRatio: bep / S,
      safety: (S - bep) / S,
      targetSales: ok(P) && mr > 0 ? (F + P) / mr : NaN,
      dol: op !== 0 ? mp / op : NaN,
    };
  }
  TOOLS.cvp = {
    render(c) {
      const d = c.data;
      const u = unitOf(d);
      const row = (key, label, ph, help) => `<label class="form-row"><span>${label}（${u}）${help ? `<small>${help}</small>` : ''}</span>${numInput(key, d[key], { placeholder: ph })}</label>`;
      return `
        <div class="split">
          <div class="form-card">
            <div class="extras">${unitSelect(d)}</div>
            ${row('sales', '売上高', '例：100000')}
            ${row('vc', '変動費', '例：60000', '売上原価のうち材料費・外注費など')}
            ${row('fc', '固定費', '例：30000', '人件費・減価償却費・家賃など')}
            ${row('target', '目標営業利益', '例：15000', '任意')}
            <details class="mini-tool">
              <summary>高低点法で費用分解する</summary>
              <p class="note">売上高と総費用の2期分（最高・最低）から変動費率と固定費を推定します。</p>
              <div class="hl-grid">
                <span></span><span>売上高</span><span>総費用</span>
                <span>最高点</span>${numInput('hl.s1', getHL(d, 's1'))}${numInput('hl.c1', getHL(d, 'c1'))}
                <span>最低点</span>${numInput('hl.s2', getHL(d, 's2'))}${numInput('hl.c2', getHL(d, 'c2'))}
              </div>
              <div id="hlOut" class="hl-out"></div>
            </details>
          </div>
          <div>
            <div id="cvpOut"></div>
            <div class="chart-box" id="cvpChart"></div>
          </div>
        </div>`;
    },
    update(c, root) {
      const d = c.data;
      const r = cvpCalc(d);
      const u = unitOf(d);
      const m = (n) => (ok(n) ? fmt(n) + ' ' + u : '—');
      let warn = '';
      if (ok(r.S) && ok(r.V) && r.mr <= 0) warn = '<div class="callout warn">変動費が売上高以上のため、損益分岐点は存在しません（限界利益がマイナス）。</div>';
      root.querySelector('#cvpOut').innerHTML = `${warn}
        <div class="kpi-row">
          ${kpi('損益分岐点売上高', m(r.bep), '固定費 ÷ 限界利益率', 'accent')}
          ${kpi('安全余裕率', pct(r.safety), ok(r.safety) ? (r.safety >= 0.2 ? '比較的安全（20%以上）' : r.safety >= 0 ? 'やや余裕が少ない' : '赤字（損益分岐点未達）') : '', ok(r.safety) && r.safety < 0 ? 'neg' : '')}
          ${kpi('損益分岐点比率', pct(r.bepRatio), '低いほど収益力が高い')}
        </div>
        <div class="kpi-row">
          ${kpi('変動費率', pct(r.vr), '')}
          ${kpi('限界利益', m(r.mp), `限界利益率 ${pct(r.mr)}`)}
          ${kpi('営業利益', m(r.op), '限界利益 − 固定費', ok(r.op) && r.op < 0 ? 'neg' : '')}
        </div>
        <div class="kpi-row">
          ${kpi('目標利益達成売上高', m(r.targetSales), ok(r.targetSales) ? `現状比 ${pct(r.targetSales / r.S - 1)}` : '目標営業利益を入力', 'accent')}
          ${kpi('経営レバレッジ係数', ok(r.dol) ? fmt(r.dol, 2) + ' 倍' : '—', ok(r.dol) ? `売上高1%増で利益 約${fmt(r.dol, 2)}%増` : '')}
        </div>`;

      // 高低点法
      const s1 = num(getHL(d, 's1')), c1 = num(getHL(d, 'c1')), s2 = num(getHL(d, 's2')), c2 = num(getHL(d, 'c2'));
      const hl = root.querySelector('#hlOut');
      if ([s1, c1, s2, c2].every(ok) && s1 !== s2) {
        const vrate = (c1 - c2) / (s1 - s2);
        const fc = c1 - vrate * s1;
        hl.innerHTML = `変動費率 <b>${pct(vrate)}</b>／固定費 <b>${fmt(fc)} ${u}</b>
          <button class="btn btn-small" data-action="applyHL">この結果を上の入力に反映</button>`;
      } else hl.innerHTML = '<span class="muted">4つの値を入力すると計算されます</span>';

      // チャート
      const box = root.querySelector('#cvpChart');
      if (!(ok(r.S) && ok(r.V) && ok(r.F)) || r.S <= 0) {
        box.innerHTML = `<svg viewBox="0 0 520 300" class="chart"><text x="260" y="150" text-anchor="middle" class="placeholder-text">売上高・変動費・固定費を入力すると損益分岐点図表が表示されます</text></svg>`;
        return;
      }
      const W = 520, H = 340, L = 64, R = 16, T = 16, B = 40;
      const pw = W - L - R, ph = H - T - B;
      const xMax = Math.max(r.S, ok(r.bep) ? r.bep : 0, ok(r.targetSales) ? r.targetSales : 0) * 1.25;
      const yMax = Math.max(xMax, r.F + r.vr * xMax) * 1.02;
      const X = (v) => L + (v / xMax) * pw, Y = (v) => T + ph - (v / yMax) * ph;
      let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="損益分岐点図表">
        <rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="frame"/>`;
      if (ok(r.bep) && r.bep < xMax) {
        svg += `<polygon points="${X(r.bep)},${Y(r.bep)} ${X(xMax)},${Y(xMax)} ${X(xMax)},${Y(r.F + r.vr * xMax)}" class="area-profit"/>
          <polygon points="${X(0)},${Y(0)} ${X(r.bep)},${Y(r.bep)} ${X(0)},${Y(r.F)}" class="area-loss"/>`;
      }
      svg += `<line x1="${X(0)}" y1="${Y(r.F)}" x2="${X(xMax)}" y2="${Y(r.F)}" class="line line-fixed"/>
        <line x1="${X(0)}" y1="${Y(r.F)}" x2="${X(xMax)}" y2="${Y(r.F + r.vr * xMax)}" class="line line-cost"/>
        <line x1="${X(0)}" y1="${Y(0)}" x2="${X(xMax)}" y2="${Y(xMax)}" class="line line-sales"/>
        <line x1="${X(r.S)}" y1="${T}" x2="${X(r.S)}" y2="${T + ph}" class="guide"/>
        <text x="${X(r.S) + 4}" y="${T + ph - 6}" class="tick">現在の売上高 ${fmt(r.S)}</text>`;
      if (ok(r.bep) && r.bep < xMax) {
        svg += `<line x1="${X(r.bep)}" y1="${Y(r.bep)}" x2="${X(r.bep)}" y2="${T + ph}" class="guide dashed"/>
          <circle cx="${X(r.bep)}" cy="${Y(r.bep)}" r="5" class="dot-key"/>
          <text x="${X(r.bep) - 6}" y="${Y(r.bep) - 10}" class="tick strong" text-anchor="end">損益分岐点 ${fmt(r.bep)}</text>`;
      }
      svg += `<text x="${L + pw / 2}" y="${H - 8}" class="axis-title" text-anchor="middle">売上高（${u}）</text>
        <text x="${L - 6}" y="${T + 4}" class="tick" text-anchor="end">${fmt(yMax)}</text>
        <text x="${L - 6}" y="${T + ph}" class="tick" text-anchor="end">0</text>
        <text x="${X(xMax) - 4}" y="${Y(xMax) + 16}" class="legend-text sales" text-anchor="end">売上高線</text>
        <text x="${X(xMax) - 4}" y="${Y(r.F + r.vr * xMax) + 16}" class="legend-text cost" text-anchor="end">総費用線</text>
        <text x="${X(xMax) - 4}" y="${Y(r.F) - 6}" class="legend-text fixed" text-anchor="end">固定費線</text>
      </svg>`;
      box.innerHTML = svg;
    },
    actions: {
      applyHL(c) {
        const d = c.data;
        const s1 = num(getHL(d, 's1')), c1 = num(getHL(d, 'c1')), s2 = num(getHL(d, 's2')), c2 = num(getHL(d, 'c2'));
        const vrate = (c1 - c2) / (s1 - s2);
        const fc = c1 - vrate * s1;
        const S = ok(num(d.sales)) ? num(d.sales) : s1;
        d.sales = String(S);
        d.vc = String(Math.round(S * vrate * 100) / 100);
        d.fc = String(Math.round(fc * 100) / 100);
      },
    },
    progress(d) {
      const r = cvpCalc(d);
      return ok(r.bep) ? 1 : ['sales', 'vc', 'fc'].some((k) => ok(num(d[k]))) ? 0.5 : 0;
    },
    markdown(c) {
      const r = cvpCalc(c.data);
      const u = unitOf(c.data);
      return `| 項目 | 値 |\n|---|--:|\n| 売上高 | ${fmt(r.S)} ${u} |\n| 変動費 | ${fmt(r.V)} ${u} |\n| 固定費 | ${fmt(r.F)} ${u} |\n| 変動費率 | ${pct(r.vr)} |\n| 限界利益率 | ${pct(r.mr)} |\n| 営業利益 | ${fmt(r.op)} ${u} |\n| **損益分岐点売上高** | **${fmt(r.bep)} ${u}** |\n| 損益分岐点比率 | ${pct(r.bepRatio)} |\n| 安全余裕率 | ${pct(r.safety)} |\n| 目標利益達成売上高 | ${fmt(r.targetSales)} ${u} |\n| 経営レバレッジ係数 | ${ok(r.dol) ? fmt(r.dol, 2) : '—'} |\n`;
    },
  };
  function getHL(d, k) {
    return d.hl ? d.hl[k] : '';
  }

  /* =======================================================
   * 経営分析（財務指標）
   * ======================================================= */
  const FIN_ITEMS = [
    { group: '損益計算書（P/L）' },
    { k: 'sales', label: '売上高' },
    { k: 'cogs', label: '売上原価' },
    { k: 'gp', label: '売上総利益', calc: (v) => v.sales - v.cogs },
    { k: 'sga', label: '販売費及び一般管理費' },
    { k: 'op', label: '営業利益', calc: (v) => v.sales - v.cogs - v.sga },
    { k: 'nonopInc', label: '営業外収益', opt: true },
    { k: 'recvInt', label: '　うち受取利息・配当金', opt: true },
    { k: 'nonopExp', label: '営業外費用', opt: true },
    { k: 'interest', label: '　うち支払利息', opt: true },
    { k: 'ord', label: '経常利益', calc: (v) => v.sales - v.cogs - v.sga + v.nonopInc - v.nonopExp },
    { k: 'ni', label: '当期純利益' },
    { group: '貸借対照表（B/S）' },
    { k: 'ca', label: '流動資産' },
    { k: 'quick', label: '　うち当座資産', help: '現金預金＋売上債権＋有価証券' },
    { k: 'recv', label: '　うち売上債権', help: '受取手形＋売掛金' },
    { k: 'inv', label: '　うち棚卸資産' },
    { k: 'fa', label: '固定資産' },
    { k: 'tfa', label: '　うち有形固定資産' },
    { k: 'ta', label: '資産合計（総資本）' },
    { k: 'cl', label: '流動負債' },
    { k: 'fl', label: '固定負債' },
    { k: 'eq', label: '純資産（自己資本）' },
  ];
  const RATIOS = [
    { cat: '収益性', name: '売上高総利益率', f: (v) => v.gp / v.sales, unit: '%', good: 'high', formula: '売上総利益 ÷ 売上高' },
    { cat: '収益性', name: '売上高営業利益率', f: (v) => v.op / v.sales, unit: '%', good: 'high', formula: '営業利益 ÷ 売上高' },
    { cat: '収益性', name: '売上高経常利益率', f: (v) => v.ord / v.sales, unit: '%', good: 'high', formula: '経常利益 ÷ 売上高' },
    { cat: '収益性', name: '売上高売上原価比率', f: (v) => v.cogs / v.sales, unit: '%', good: 'low', formula: '売上原価 ÷ 売上高' },
    { cat: '収益性', name: '売上高販管費比率', f: (v) => v.sga / v.sales, unit: '%', good: 'low', formula: '販管費 ÷ 売上高' },
    { cat: '収益性', name: '総資本経常利益率（ROA）', f: (v) => v.ord / v.ta, unit: '%', good: 'high', formula: '経常利益 ÷ 総資本' },
    { cat: '収益性', name: '自己資本利益率（ROE）', f: (v) => v.ni / v.eq, unit: '%', good: 'high', formula: '当期純利益 ÷ 自己資本' },
    { cat: '効率性', name: '総資本回転率', f: (v) => v.sales / v.ta, unit: '回', good: 'high', formula: '売上高 ÷ 総資本' },
    { cat: '効率性', name: '売上債権回転率', f: (v) => v.sales / v.recv, unit: '回', good: 'high', formula: '売上高 ÷ 売上債権' },
    { cat: '効率性', name: '棚卸資産回転率', f: (v) => v.sales / v.inv, unit: '回', good: 'high', formula: '売上高 ÷ 棚卸資産' },
    { cat: '効率性', name: '有形固定資産回転率', f: (v) => v.sales / v.tfa, unit: '回', good: 'high', formula: '売上高 ÷ 有形固定資産' },
    { cat: '安全性', name: '流動比率', f: (v) => v.ca / v.cl, unit: '%', good: 'high', formula: '流動資産 ÷ 流動負債' },
    { cat: '安全性', name: '当座比率', f: (v) => v.quick / v.cl, unit: '%', good: 'high', formula: '当座資産 ÷ 流動負債' },
    { cat: '安全性', name: '自己資本比率', f: (v) => v.eq / v.ta, unit: '%', good: 'high', formula: '自己資本 ÷ 総資本' },
    { cat: '安全性', name: '負債比率', f: (v) => (v.cl + v.fl) / v.eq, unit: '%', good: 'low', formula: '負債 ÷ 自己資本' },
    { cat: '安全性', name: '固定比率', f: (v) => v.fa / v.eq, unit: '%', good: 'low', formula: '固定資産 ÷ 自己資本' },
    { cat: '安全性', name: '固定長期適合率', f: (v) => v.fa / (v.eq + v.fl), unit: '%', good: 'low', formula: '固定資産 ÷（自己資本＋固定負債）' },
    { cat: '安全性', name: 'インタレスト・カバレッジ・レシオ', f: (v) => (v.op + v.recvInt) / v.interest, unit: '倍', good: 'high', formula: '（営業利益＋受取利息・配当金）÷ 支払利息' },
  ];
  function finValues(src = {}) {
    const v = {};
    FIN_ITEMS.forEach((it) => {
      if (!it.k || it.calc) return;
      const n = num(src[it.k]);
      v[it.k] = ok(n) ? n : it.opt ? 0 : NaN;
    });
    FIN_ITEMS.forEach((it) => it.calc && (v[it.k] = it.calc(v)));
    return v;
  }
  function ratioVal(r, v) {
    const x = r.f(v);
    return ok(x) ? x : NaN;
  }
  const ratioFmt = (r, x) => (!ok(x) ? '—' : r.unit === '%' ? fmt(x * 100, 2) + '%' : fmt(x, 2) + ' ' + r.unit);

  TOOLS.ratio = {
    render(c) {
      const d = c.data;
      const la = d.labelA || '当社', lb = d.labelB || '同業他社';
      return `
        <div class="extras">
          <label class="extra">比較列1の名称${textInput('labelA', d.labelA, { placeholder: '当社', cls: 'short-text' })}</label>
          <label class="extra">比較列2の名称${textInput('labelB', d.labelB, { placeholder: '同業他社（または前期）', cls: 'short-text' })}</label>
          ${unitSelect(d)}
        </div>
        <div class="split split-wide">
          <div class="table-wrap"><table class="data-table fin-input">
            <thead><tr><th>勘定科目</th><th data-label="A">${esc(la)}</th><th data-label="B">${esc(lb)}</th></tr></thead>
            <tbody>${FIN_ITEMS.map((it) => {
              if (it.group) return `<tr class="group-row"><th colspan="3">${it.group}</th></tr>`;
              if (it.calc) return `<tr class="calc-row"><td>${it.label}<small>自動計算</small></td><td class="r" data-calc="a.${it.k}">—</td><td class="r" data-calc="b.${it.k}">—</td></tr>`;
              return `<tr><td>${it.label}${it.help ? `<small>${it.help}</small>` : ''}</td><td>${numInput(`a.${it.k}`, d.a && d.a[it.k], { aria: `${la} ${it.label}` })}</td><td>${numInput(`b.${it.k}`, d.b && d.b[it.k], { aria: `${lb} ${it.label}` })}</td></tr>`;
            }).join('')}</tbody>
          </table></div>
          <div id="ratioOut"></div>
        </div>`;
    },
    update(c, root) {
      const d = c.data;
      const va = finValues(d.a), vb = finValues(d.b);
      const u = unitOf(d);
      root.querySelectorAll('[data-calc]').forEach((el) => {
        const [side, k] = el.dataset.calc.split('.');
        const x = (side === 'a' ? va : vb)[k];
        el.textContent = ok(x) ? fmt(x) : '—';
        el.classList.toggle('neg-text', ok(x) && x < 0);
      });
      const la = d.labelA || '当社', lb = d.labelB || '同業他社';
      const th = root.querySelectorAll('[data-label]');
      th.forEach((el) => (el.textContent = el.dataset.label === 'A' ? la : lb));
      let html = `<div class="table-wrap"><table class="data-table ratio-table">
        <thead><tr><th>指標</th><th class="r">${esc(la)}</th><th class="r">${esc(lb)}</th><th>評価</th></tr></thead><tbody>`;
      let cat = '';
      const summary = { good: {}, bad: {} };
      RATIOS.forEach((r) => {
        if (r.cat !== cat) {
          cat = r.cat;
          html += `<tr class="group-row"><th colspan="4">${cat}</th></tr>`;
        }
        const a = ratioVal(r, va), b = ratioVal(r, vb);
        let judge = '';
        if (ok(a) && ok(b) && a !== b) {
          const better = r.good === 'high' ? a > b : a < b;
          judge = better ? `<span class="badge good">${esc(la)}が優位</span>` : `<span class="badge bad">${esc(la)}が劣位</span>`;
          const diff = Math.abs(a - b) / (Math.abs(b) || 1);
          (summary[better ? 'good' : 'bad'][r.cat] ||= []).push({ name: r.name, diff });
        }
        html += `<tr><td title="${esc(r.formula)}">${r.name}<small>${r.formula}${r.good === 'low' ? '（低いほど良い）' : ''}</small></td><td class="r">${ratioFmt(r, a)}</td><td class="r">${ratioFmt(r, b)}</td><td>${judge}</td></tr>`;
      });
      html += `</tbody></table></div>`;
      const pick = (obj) =>
        ['収益性', '効率性', '安全性']
          .map((k) => (obj[k] ? `<li><b>${k}</b>：${obj[k].sort((x, y) => y.diff - x.diff).slice(0, 2).map((x) => x.name).join('、')}</li>` : ''))
          .join('');
      const g = pick(summary.good), b = pick(summary.bad);
      if (g || b) {
        html = `<div class="summary-box">
          <h4>差が大きい指標（事例Ⅳの解答候補）</h4>
          <div class="summary-cols">
            <div><h5 class="good-text">${esc(la)}が優れている</h5><ul>${g || '<li class="muted">なし</li>'}</ul></div>
            <div><h5 class="bad-text">${esc(la)}が劣っている</h5><ul>${b || '<li class="muted">なし</li>'}</ul></div>
          </div>
          <p class="note">差の大きさ（相対差）で並べた参考情報です。実際の解答では与件文の記述と結びつく指標を選びましょう。</p>
        </div>` + html;
      }
      html += `<p class="note">金額単位：${u}。比率は期末残高ベースで計算しています。未入力の項目に依存する指標は「—」と表示されます（営業外収益・費用、受取利息、支払利息は未入力時0として扱います）。</p>`;
      root.querySelector('#ratioOut').innerHTML = html;
    },
    progress(d) {
      const va = finValues(d.a);
      const n = RATIOS.filter((r) => ok(ratioVal(r, va))).length;
      return n / RATIOS.length;
    },
    markdown(c) {
      const d = c.data;
      const va = finValues(d.a), vb = finValues(d.b);
      const la = d.labelA || '当社', lb = d.labelB || '同業他社';
      let md = `| 区分 | 指標 | ${la} | ${lb} | 評価 |\n|---|---|--:|--:|---|\n`;
      RATIOS.forEach((r) => {
        const a = ratioVal(r, va), b = ratioVal(r, vb);
        let j = '';
        if (ok(a) && ok(b) && a !== b) j = (r.good === 'high' ? a > b : a < b) ? '優' : '劣';
        md += `| ${r.cat} | ${r.name} | ${ratioFmt(r, a)} | ${ratioFmt(r, b)} | ${j} |\n`;
      });
      return md;
    },
  };

  /* =======================================================
   * 投資の経済性計算（NPV・IRR）
   * ======================================================= */
  function npvCalc(d) {
    const I = num(d.invest);
    const rate = num(d.rate) / 100;
    const cfs = (d.rows || []).map((r) => num(r.cf)).map((x) => (ok(x) ? x : 0));
    const npvAt = (r) => cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t + 1), 0) - I;
    const pv = ok(rate) ? cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t + 1), 0) : NaN;
    const npv = pv - I;
    // IRR（二分法）
    let irr = NaN;
    if (ok(I) && I > 0 && cfs.some((x) => x > 0)) {
      let lo = -0.99, hi = 10;
      let flo = npvAt(lo), fhi = npvAt(hi);
      if (flo * fhi < 0) {
        for (let k = 0; k < 200; k++) {
          const mid = (lo + hi) / 2;
          const fm = npvAt(mid);
          if (Math.abs(fm) < 1e-9) {
            lo = hi = mid;
            break;
          }
          if (flo * fm < 0) {
            hi = mid;
            fhi = fm;
          } else {
            lo = mid;
            flo = fm;
          }
        }
        irr = (lo + hi) / 2;
      }
    }
    // 回収期間
    const payback = (disc) => {
      if (!ok(I) || I <= 0) return NaN;
      let cum = 0;
      for (let t = 0; t < cfs.length; t++) {
        const cf = disc ? cfs[t] / Math.pow(1 + rate, t + 1) : cfs[t];
        if (cf > 0 && cum + cf >= I) return t + (I - cum) / cf;
        cum += cf;
      }
      return NaN;
    };
    const table = [];
    let cum = -I, cumPv = -I;
    cfs.forEach((cf, t) => {
      const factor = ok(rate) ? 1 / Math.pow(1 + rate, t + 1) : NaN;
      cum += cf;
      cumPv += cf * factor;
      table.push({ year: t + 1, cf, factor, pv: cf * factor, cum, cumPv });
    });
    return { I, rate, cfs, pv, npv, irr, pi: pv / I, payback: payback(false), dpayback: ok(rate) ? payback(true) : NaN, table };
  }
  TOOLS.npv = {
    render(c) {
      const d = c.data;
      const u = unitOf(d);
      const rs = rows(d, () => Array.from({ length: 5 }, () => ({ cf: '' })));
      return `
        <div class="split">
          <div class="form-card">
            <div class="extras">${unitSelect(d)}</div>
            <label class="form-row"><span>初期投資額（${u}）</span>${numInput('invest', d.invest, { placeholder: '例：10000' })}</label>
            <label class="form-row"><span>割引率・資本コスト（%）</span>${numInput('rate', d.rate, { placeholder: '例：5' })}</label>
            <h3>各年のキャッシュフロー（${u}）</h3>
            ${rs.map((r, i) => `<div class="form-row cf-row"><span>${i + 1}年目</span>${numInput(`rows.${i}.cf`, r.cf, { placeholder: '例：3000', aria: `${i + 1}年目のキャッシュフロー` })}<button class="icon-btn" data-action="remove" data-index="${i}" aria-label="削除">✕</button></div>`).join('')}
            <button class="btn" data-action="add">＋ 年を追加</button>
            <button class="btn btn-ghost" data-action="fill">1年目の値を全年にコピー</button>
            <details class="mini-tool">
              <summary>CF計算補助（営業利益と減価償却費から）</summary>
              <p class="note">CF ＝ 営業利益（税引前）×（1−税率）＋ 減価償却費</p>
              <label class="form-row"><span>増分営業利益（税引前・減価償却後）</span>${numInput('helper.op', d.helper && d.helper.op)}</label>
              <label class="form-row"><span>減価償却費</span>${numInput('helper.dep', d.helper && d.helper.dep)}</label>
              <label class="form-row"><span>税率（%）</span>${numInput('helper.tax', d.helper && d.helper.tax, { placeholder: '30' })}</label>
              <div id="cfHelperOut" class="hl-out"></div>
            </details>
          </div>
          <div><div id="npvOut"></div><div class="chart-box" id="npvChart"></div></div>
        </div>`;
    },
    update(c, root) {
      const d = c.data;
      const u = unitOf(d);
      const r = npvCalc(d);
      const m = (n) => (ok(n) ? fmt(n, Math.abs(n) < 100 && n % 1 ? 2 : 0) + ' ' + u : '—');
      const verdict = ok(r.npv) ? (r.npv > 0 ? '<span class="badge good">採択（NPV＞0）</span>' : r.npv < 0 ? '<span class="badge bad">棄却（NPV＜0）</span>' : '<span class="badge neutral">NPV＝0</span>') : '';
      root.querySelector('#npvOut').innerHTML = `
        <div class="kpi-row">
          ${kpi('正味現在価値（NPV）', m(r.npv), verdict, ok(r.npv) && r.npv < 0 ? 'neg accent' : 'accent')}
          ${kpi('内部収益率（IRR）', pct(r.irr, 2), ok(r.irr) && ok(r.rate) ? (r.irr > r.rate ? '資本コストを上回る' : '資本コストを下回る') : '')}
        </div>
        <div class="kpi-row">
          ${kpi('単純回収期間', ok(r.payback) ? fmt(r.payback, 2) + ' 年' : '—', ok(r.payback) ? '' : ok(r.I) ? '期間内に回収できません' : '')}
          ${kpi('割引回収期間', ok(r.dpayback) ? fmt(r.dpayback, 2) + ' 年' : '—', '')}
          ${kpi('収益性指数（PI）', ok(r.pi) ? fmt(r.pi, 3) : '—', 'CFの現在価値 ÷ 投資額（1超で採択）')}
        </div>
        <div class="table-wrap"><table class="data-table compact">
          <thead><tr><th>年</th><th class="r">CF</th><th class="r">複利現価係数</th><th class="r">現在価値</th><th class="r">累積CF</th><th class="r">累積現在価値</th></tr></thead>
          <tbody><tr><td>0</td><td class="r">${ok(r.I) ? fmt(-r.I) : '—'}</td><td class="r">1.000</td><td class="r">${ok(r.I) ? fmt(-r.I) : '—'}</td><td class="r">${ok(r.I) ? fmt(-r.I) : '—'}</td><td class="r">${ok(r.I) ? fmt(-r.I) : '—'}</td></tr>
          ${r.table.map((t) => `<tr><td>${t.year}</td><td class="r">${fmt(t.cf)}</td><td class="r">${ok(t.factor) ? t.factor.toFixed(3) : '—'}</td><td class="r">${fmt(t.pv, 1)}</td><td class="r ${t.cum < 0 ? 'neg-text' : ''}">${fmt(t.cum)}</td><td class="r ${t.cumPv < 0 ? 'neg-text' : ''}">${fmt(t.cumPv, 1)}</td></tr>`).join('')}</tbody>
        </table></div>`;

      // CF補助
      const h = d.helper || {};
      const op = num(h.op), dep = num(h.dep), tax = ok(num(h.tax)) ? num(h.tax) : 30;
      const out = root.querySelector('#cfHelperOut');
      if (ok(op) && ok(dep)) {
        const cf = op * (1 - tax / 100) + dep;
        out.innerHTML = `年間CF ＝ ${fmt(op)} ×（1 − ${tax}%）＋ ${fmt(dep)} ＝ <b>${fmt(cf, 1)} ${u}</b>
          <button class="btn btn-small" data-action="applyCF" data-cf="${cf}">全年に反映</button>`;
      } else out.innerHTML = '<span class="muted">営業利益と減価償却費を入力すると計算されます</span>';

      // 累積CFチャート
      const box = root.querySelector('#npvChart');
      if (!ok(r.I) || !r.table.length) {
        box.innerHTML = '';
        return;
      }
      const W = 520, H = 240, L = 64, R = 16, T = 16, B = 32;
      const pw = W - L - R, ph = H - T - B;
      const vals = [-r.I, ...r.table.map((t) => t.cum), ...r.table.map((t) => (ok(t.cumPv) ? t.cumPv : 0))];
      const yMax = Math.max(0, ...vals) * 1.1 || 1, yMin = Math.min(0, ...vals) * 1.1;
      const n = r.table.length;
      const X = (t) => L + (t / n) * pw, Y = (v) => T + ((yMax - v) / (yMax - yMin)) * ph;
      const line = (key) => [`${X(0)},${Y(-r.I)}`, ...r.table.map((t) => `${X(t.year)},${Y(t[key])}`)].join(' ');
      box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="累積キャッシュフロー">
        <rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="frame"/>
        <line x1="${L}" x2="${L + pw}" y1="${Y(0)}" y2="${Y(0)}" class="guide"/>
        <polyline points="${line('cum')}" class="line line-sales"/>
        ${ok(r.rate) ? `<polyline points="${line('cumPv')}" class="line line-cost"/>` : ''}
        ${r.table.map((t) => `<text x="${X(t.year)}" y="${T + ph + 16}" text-anchor="middle" class="tick">${t.year}年</text>`).join('')}
        <text x="${L - 6}" y="${Y(0) + 4}" class="tick" text-anchor="end">0</text>
        <text x="${L - 6}" y="${T + 10}" class="tick" text-anchor="end">${fmt(yMax)}</text>
        <text x="${L - 6}" y="${T + ph}" class="tick" text-anchor="end">${fmt(yMin)}</text>
        <text x="${L + 8}" y="${T + 16}" class="legend-text sales">― 累積CF</text>
        ${ok(r.rate) ? `<text x="${L + 8}" y="${T + 32}" class="legend-text cost">― 累積現在価値</text>` : ''}
      </svg>`;
    },
    actions: {
      add(c) {
        rows(c.data, () => []).push({ cf: '' });
      },
      remove: removeRow,
      fill(c) {
        const rs = rows(c.data, () => []);
        const v = rs[0] && rs[0].cf;
        rs.forEach((r) => (r.cf = v));
      },
      applyCF(c, btn) {
        const v = String(Math.round(Number(btn.dataset.cf) * 100) / 100);
        rows(c.data, () => []).forEach((r) => (r.cf = v));
      },
    },
    progress(d) {
      return ok(npvCalc(d).npv) ? 1 : ok(num(d.invest)) ? 0.5 : 0;
    },
    markdown(c) {
      const r = npvCalc(c.data);
      const u = unitOf(c.data);
      return `- 初期投資額：${fmt(r.I)} ${u}／割引率：${ok(r.rate) ? fmt(r.rate * 100, 2) + '%' : '—'}\n- キャッシュフロー：${r.cfs.map((x, i) => `${i + 1}年目 ${fmt(x)}`).join('、')}\n- **NPV：${fmt(r.npv, 1)} ${u}**（${ok(r.npv) ? (r.npv > 0 ? '採択' : '棄却') : '—'}）\n- IRR：${pct(r.irr, 2)}\n- 単純回収期間：${ok(r.payback) ? fmt(r.payback, 2) + '年' : '—'}／割引回収期間：${ok(r.dpayback) ? fmt(r.dpayback, 2) + '年' : '—'}\n- 収益性指数：${ok(r.pi) ? fmt(r.pi, 3) : '—'}\n`;
    },
  };

  window.TOOLS = TOOLS;
  window.__toolHelpers = { num, cvpCalc, npvCalc, eoqCalc, abcCalc, finValues, RATIOS, ratioVal, vrioResult, ppmClass };
})();
