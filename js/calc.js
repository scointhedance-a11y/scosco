/* 現場用の計算ツール定義。
 * 各ツールは fields（入力）と compute(v)（結果の配列）を持つ。app.js が共通のフォームとして描画する。
 * 結果: { label, value, unit, digits, tone: 'ok'|'ng'|'warn', note }
 */
(function () {
  'use strict';

  var log10 = Math.log10 || function (x) { return Math.log(x) / Math.LN10; };
  function pos(x) { return typeof x === 'number' && isFinite(x) && x > 0; }
  function num(x) { return typeof x === 'number' && isFinite(x); }

  var ION_FACTORS = [
    // 係数 = 50.04 ÷ 当量。mg/L as イオン × 係数 = mg/L as CaCO3
    { id: 'ca', label: 'カルシウム Ca²⁺', f: 2.497 },
    { id: 'mg', label: 'マグネシウム Mg²⁺', f: 4.118 },
    { id: 'na', label: 'ナトリウム Na⁺', f: 2.177 },
    { id: 'k', label: 'カリウム K⁺', f: 1.280 },
    { id: 'fe2', label: '鉄（二価） Fe²⁺', f: 1.792 },
    { id: 'fe3', label: '鉄（三価） Fe³⁺', f: 2.688 },
    { id: 'mn', label: 'マンガン Mn²⁺', f: 1.822 },
    { id: 'zn', label: '亜鉛 Zn²⁺', f: 1.531 },
    { id: 'al', label: 'アルミニウム Al³⁺', f: 5.564 },
    { id: 'nh4', label: 'アンモニウム NH₄⁺', f: 2.774 },
    { id: 'hco3', label: '重炭酸 HCO₃⁻', f: 0.820 },
    { id: 'co3', label: '炭酸 CO₃²⁻', f: 1.668 },
    { id: 'oh', label: '水酸化物 OH⁻', f: 2.942 },
    { id: 'cl', label: '塩化物 Cl⁻', f: 1.411 },
    { id: 'so4', label: '硫酸 SO₄²⁻', f: 1.042 },
    { id: 'no3', label: '硝酸 NO₃⁻', f: 0.807 },
    { id: 'po4', label: 'リン酸 PO₄³⁻', f: 1.581 },
    { id: 'caco3', label: '炭酸カルシウム CaCO₃', f: 1 },
    { id: 'cao', label: '酸化カルシウム CaO', f: 1.785 },
    { id: 'feCl3', label: '塩化第二鉄 FeCl₃', f: 0.925 }
  ];

  var calcs = [
    {
      id: 'balance',
      title: '冷却塔の水収支',
      desc: '蒸発量・ブロー量・補給水量・半減期（HTI）を概算',
      terms: ['evaporation-rate', 'blowdown', 'makeup-water', 'hti'],
      fields: [
        { id: 'R', label: '循環水量 R', unit: 'm³/h', def: 1000 },
        { id: 'dT', label: '冷却塔の温度差 ΔT', unit: '℃', def: 8 },
        { id: 'CR', label: '濃縮倍数 CR', unit: '倍', def: 4 },
        { id: 'V', label: '保有水量 V（任意）', unit: 'm³', def: '' },
        { id: 'ef', label: '蒸発係数（5.56℃あたり）', unit: '%', def: 0.85 },
        { id: 'CR2', label: '比較用の濃縮倍数（任意）', unit: '倍', def: '' }
      ],
      compute: function (v) {
        if (!pos(v.R) || !pos(v.dT) || !num(v.CR) || v.CR <= 1 || !pos(v.ef)) {
          return { error: '循環水量・温度差・蒸発係数は正の値、濃縮倍数は1より大きい値を入れてください。' };
        }
        var E = v.R * (v.ef / 100) * (v.dT / 5.56);
        var BD = E / (v.CR - 1);
        var MU = E + BD;
        var out = [
          { label: '蒸発量 E', value: E, unit: 'm³/h', digits: 2 },
          { label: 'ブロー量 BD', value: BD, unit: 'm³/h', digits: 2, note: '飛散・漏水も含む' },
          { label: '補給水量 MU', value: MU, unit: 'm³/h', digits: 2 },
          { label: '補給水量（1日）', value: MU * 24, unit: 'm³/日', digits: 0 }
        ];
        if (pos(v.V)) {
          out.push({ label: '循環時間', value: v.V / v.R * 60, unit: '分', digits: 1 });
          out.push({ label: '半減期 HTI', value: 0.693 * v.V / BD, unit: '時間', digits: 1 });
        }
        if (num(v.CR2) && v.CR2 > 1) {
          var BD2 = E / (v.CR2 - 1);
          var diff = (E + BD) - (E + BD2);
          out.push({ label: v.CR2 + '倍での補給水量', value: E + BD2, unit: 'm³/h', digits: 2 });
          out.push({ label: '補給水の差（1日）', value: diff * 24, unit: 'm³/日', digits: 0, tone: diff > 0 ? 'ok' : 'warn', note: diff > 0 ? '節水量' : '増加量' });
        }
        return out;
      },
      howto: 'E = R × 蒸発係数 × (ΔT ÷ 5.56)、BD = E ÷ (CR − 1)、MU = E + BD、HTI = 0.693 × V ÷ BD。蒸発係数0.85%/5.56℃（10°F）はマニュアルの概算値。提案書や問題解析では気温・湿度を考慮した計算を行うこと。'
    },
    {
      id: 'cycles',
      title: '濃縮倍数',
      desc: 'イオン濃度比または補給水量÷ブロー量から求める',
      terms: ['cycles-of-concentration', 'marker-ion'],
      fields: [
        { id: 'circ', label: '循環水中の濃度', unit: 'mg/L', def: 120 },
        { id: 'mu', label: '補給水中の濃度', unit: 'mg/L', def: 30 },
        { id: 'circCa', label: '循環水 Ca（任意）', unit: 'mg/L', def: '' },
        { id: 'muCa', label: '補給水 Ca（任意）', unit: 'mg/L', def: '' },
        { id: 'MUf', label: '補給水量（任意）', unit: 'm³/h', def: '' },
        { id: 'BDf', label: 'ブロー量（任意）', unit: 'm³/h', def: '' }
      ],
      compute: function (v) {
        var out = [];
        var cr = null;
        if (pos(v.circ) && pos(v.mu)) {
          cr = v.circ / v.mu;
          out.push({ label: '濃縮倍数（指標イオン）', value: cr, unit: '倍', digits: 2, note: 'Mg・シリカなど析出しにくいイオンで' });
        }
        if (pos(v.circCa) && pos(v.muCa)) {
          var crCa = v.circCa / v.muCa;
          var tone = cr && crCa < cr * 0.9 ? 'ng' : 'ok';
          out.push({ label: 'Caの濃縮倍数', value: crCa, unit: '倍', digits: 2, tone: cr ? tone : undefined, note: cr ? (tone === 'ng' ? '指標イオンより低い → Caが析出している可能性' : '指標イオンとほぼ一致') : '' });
        }
        if (pos(v.MUf) && pos(v.BDf)) {
          out.push({ label: '濃縮倍数（水量比）', value: v.MUf / v.BDf, unit: '倍', digits: 2 });
        }
        if (!out.length) return { error: '濃度の組、または補給水量とブロー量を入れてください。' };
        return out;
      },
      howto: 'CR = 循環水中濃度 ÷ 補給水中濃度 = 補給水量 ÷ ブロー量。塩素や硫酸を注入している系ではCl⁻・SO₄²⁻は使わない。Caの倍数がMgより一貫して低ければCaが析出している。'
    },
    {
      id: 'lsi',
      title: 'LSI・RSI（スケール指数）',
      desc: '炭酸カルシウムの飽和指数を簡易式で計算',
      terms: ['lsi', 'rsi'],
      fields: [
        { id: 'pH', label: 'pH', unit: '', def: 8.2 },
        { id: 'T', label: '水温（伝熱面ならスキン温度）', unit: '℃', def: 35 },
        { id: 'Ca', label: 'Ca硬度', unit: 'mg/L as CaCO₃', def: 250 },
        { id: 'Alk', label: 'Mアルカリ度', unit: 'mg/L as CaCO₃', def: 200 },
        { id: 'TDS', label: '溶解固形物 TDS', unit: 'mg/L', def: 800 }
      ],
      compute: function (v) {
        if (!num(v.pH) || !num(v.T) || !pos(v.Ca) || !pos(v.Alk) || !pos(v.TDS)) {
          return { error: 'すべての項目に値を入れてください（Ca・アルカリ度・TDSは正の値）。' };
        }
        var A = (log10(v.TDS) - 1) / 10;
        var B = -13.12 * log10(v.T + 273.15) + 34.55;
        var C = log10(v.Ca) - 0.4;
        var D = log10(v.Alk);
        var pHs = (9.3 + A + B) - (C + D);
        var lsi = v.pH - pHs;
        var rsi = 2 * pHs - v.pH;
        var lsiTone = lsi > 0.5 ? 'ng' : lsi > 0 ? 'warn' : 'ok';
        var lsiNote = lsi > 0 ? 'CaCO₃ 過飽和（スケール傾向）' : 'CaCO₃ 未飽和';
        var rsiTone = rsi < 6 ? 'ng' : rsi < 7 ? 'warn' : 'ok';
        var rsiNote = rsi < 6 ? 'スケール傾向（6未満）' : '腐食傾向（6超）';
        return [
          { label: '飽和pH pHs', value: pHs, unit: '', digits: 2 },
          { label: 'LSI = pH − pHs', value: lsi, unit: '', digits: 2, tone: lsiTone, note: lsiNote },
          { label: 'RSI = 2pHs − pH', value: rsi, unit: '', digits: 2, tone: rsiTone, note: rsiNote }
        ];
      },
      howto: 'pHs = (9.3 + A + B) − (C + D)、A = (log TDS − 1)/10、B = −13.12 log(T+273) + 34.55、C = log Ca − 0.4、D = log Alk。簡易指数は「傾向」を示すだけで、量や速度は示さない。TDSが高い水やCaCO₃以外のスケール（リン酸Ca・シリカ等）は評価できないため、計算機モデルと併用すること。'
    },
    {
      id: 'heat',
      title: '熱量・冷凍能力',
      desc: 'Q = M × Cp × ΔT を kcal/h・kW・冷凍トンで',
      terms: ['heat-balance', 'refrigeration-ton', 'latent-heat'],
      fields: [
        { id: 'F', label: '水量', unit: 'm³/h', def: 500 },
        { id: 'dT', label: '温度差 ΔT', unit: '℃', def: 5 }
      ],
      compute: function (v) {
        if (!pos(v.F) || !num(v.dT)) return { error: '水量と温度差を入れてください。' };
        var Q = v.F * 1000 * v.dT; // kcal/h (Cp = 1)
        return [
          { label: '熱量 Q', value: Q / 10000, unit: '万kcal/h', digits: 1 },
          { label: '熱量 Q', value: Q / 860, unit: 'kW', digits: 0 },
          { label: '米国冷凍トン', value: Q / 3024, unit: 'USRT', digits: 0 },
          { label: '日本冷凍トン', value: Q / 3320, unit: 'JRT', digits: 0 },
          { label: '必要な蒸発量の目安', value: Q / 570 / 1000, unit: 'm³/h', digits: 2, note: '潜熱 約570 kcal/kg（40〜50℃）' }
        ];
      },
      howto: 'Q[kcal/h] = 水量[kg/h] × 比熱1[kcal/kg・℃] × ΔT。1 kW = 860 kcal/h、1 USRT = 3,024 kcal/h、1 JRT = 3,320 kcal/h。'
    },
    {
      id: 'dosing',
      title: '薬注量',
      desc: '連続注入量とショット（初期）投入量',
      terms: ['blowdown', 'holding-capacity', 'hti'],
      fields: [
        { id: 'C', label: '目標濃度（製品として）', unit: 'mg/L', def: 100 },
        { id: 'BD', label: 'ブロー量（連続注入用）', unit: 'm³/h', def: 5 },
        { id: 'V', label: '保有水量（ショット用）', unit: 'm³', def: 300 },
        { id: 'rho', label: '製品の比重', unit: '', def: 1.1 }
      ],
      compute: function (v) {
        if (!pos(v.C)) return { error: '目標濃度を入れてください。' };
        var rho = pos(v.rho) ? v.rho : 1;
        var out = [];
        if (pos(v.BD)) {
          var kgh = v.C * v.BD / 1000;
          out.push({ label: '連続注入量', value: kgh, unit: 'kg/h', digits: 3 });
          out.push({ label: '連続注入量', value: kgh / rho, unit: 'L/h', digits: 3 });
          out.push({ label: '1日あたり', value: kgh * 24, unit: 'kg/日', digits: 1 });
        }
        if (pos(v.V)) {
          out.push({ label: 'ショット投入量', value: v.C * v.V / 1000, unit: 'kg', digits: 1, note: '保有水を目標濃度にする量' });
          out.push({ label: 'ショット投入量', value: v.C * v.V / 1000 / rho, unit: 'L', digits: 1 });
        }
        if (!out.length) return { error: 'ブロー量か保有水量を入れてください。' };
        return out;
      },
      howto: '定常状態の連続注入量[kg/h] = 目標濃度[mg/L] × ブロー量[m³/h] ÷ 1000（ブローで失う分を補う）。ショット量[kg] = 目標濃度 × 保有水量[m³] ÷ 1000。有効成分濃度で管理する薬品は製品濃度に換算してから入れる。'
    },
    {
      id: 'decay',
      title: '薬品濃度の減衰（HTI）',
      desc: 'ショット投入後の濃度の推移',
      terms: ['hti'],
      fields: [
        { id: 'C0', label: '投入直後の濃度', unit: 'mg/L', def: 50 },
        { id: 'H', label: '半減期 HTI', unit: '時間', def: 24 },
        { id: 't', label: '経過時間', unit: '時間', def: 12 },
        { id: 'Cmin', label: '必要な最低濃度（任意）', unit: 'mg/L', def: '' }
      ],
      compute: function (v) {
        if (!pos(v.C0) || !pos(v.H) || !num(v.t) || v.t < 0) return { error: '濃度・半減期・経過時間を入れてください。' };
        var out = [{ label: v.t + '時間後の濃度', value: v.C0 * Math.pow(0.5, v.t / v.H), unit: 'mg/L', digits: 2 }];
        if (pos(v.Cmin) && v.Cmin < v.C0) {
          out.push({ label: '最低濃度を下回るまで', value: v.H * Math.log(v.C0 / v.Cmin) / Math.LN2, unit: '時間', digits: 1 });
        }
        return out;
      },
      howto: 'C(t) = C₀ × 0.5^(t ÷ HTI)。ブローによる希釈のみを考慮（分解・消費は含まない）。殺菌剤は分解・消費でさらに早く減る。'
    },
    {
      id: 'halogen',
      title: '塩素・臭素の有効形の割合',
      desc: 'pHによる HOCl / HOBr の割合',
      terms: ['chlorine', 'bromine'],
      fields: [
        { id: 'pH', label: 'pH', unit: '', def: 8.0 }
      ],
      compute: function (v) {
        if (!num(v.pH)) return { error: 'pHを入れてください。' };
        var hocl = 100 / (1 + Math.pow(10, v.pH - 7.5));
        var hobr = 100 / (1 + Math.pow(10, v.pH - 8.7));
        return [
          { label: 'HOCl（次亜塩素酸）', value: hocl, unit: '%', digits: 0, tone: hocl >= 50 ? 'ok' : hocl >= 20 ? 'warn' : 'ng' },
          { label: 'HOBr（次亜臭素酸）', value: hobr, unit: '%', digits: 0, tone: hobr >= 50 ? 'ok' : hobr >= 20 ? 'warn' : 'ng' }
        ];
      },
      howto: '有効成分の割合 = 100 ÷ (1 + 10^(pH − pKa))。pKa は HOCl 約7.5、HOBr 約8.7（25℃付近の概略値）。pH 7.5を超えるアルカリ性の系では臭素系が有利。'
    },
    {
      id: 'lmtd',
      title: 'LMTD・U値',
      desc: '熱交換器の対数平均温度差と総括伝熱係数（向流）',
      terms: ['lmtd', 'overall-heat-transfer-coefficient', 'cleanliness-factor'],
      fields: [
        { id: 'th1', label: '高温側 入口', unit: '℃', def: 80 },
        { id: 'th2', label: '高温側 出口', unit: '℃', def: 45 },
        { id: 'tc1', label: '冷却水 入口', unit: '℃', def: 30 },
        { id: 'tc2', label: '冷却水 出口', unit: '℃', def: 38 },
        { id: 'F', label: '冷却水量（任意）', unit: 'm³/h', def: '' },
        { id: 'A', label: '伝熱面積（任意）', unit: 'm²', def: '' },
        { id: 'Ud', label: '設計U値（任意）', unit: 'kcal/m²h℃', def: '' }
      ],
      compute: function (v) {
        if (![v.th1, v.th2, v.tc1, v.tc2].every(num)) return { error: '4つの温度を入れてください。' };
        var d1 = v.th1 - v.tc2;
        var d2 = v.th2 - v.tc1;
        if (d1 <= 0 || d2 <= 0) return { error: '温度の組み合わせが正しくありません（温度差が0以下）。' };
        var lmtd = Math.abs(d1 - d2) < 1e-9 ? d1 : (d1 - d2) / Math.log(d1 / d2);
        var out = [{ label: 'LMTD', value: lmtd, unit: '℃', digits: 2 }];
        if (pos(v.F)) {
          var Q = v.F * 1000 * (v.tc2 - v.tc1);
          out.push({ label: '交換熱量 Q', value: Q / 10000, unit: '万kcal/h', digits: 1 });
          if (pos(v.A)) {
            var U = Q / (v.A * lmtd);
            out.push({ label: '総括伝熱係数 U', value: U, unit: 'kcal/m²h℃', digits: 0 });
            if (pos(v.Ud)) {
              var cf = U / v.Ud;
              out.push({ label: '清浄度係数 CF', value: cf * 100, unit: '%', digits: 0, tone: cf >= 0.85 ? 'ok' : cf >= 0.7 ? 'warn' : 'ng' });
            }
          }
        }
        return out;
      },
      howto: 'LMTD = (ΔT₁ − ΔT₂) ÷ ln(ΔT₁ ÷ ΔT₂)、ΔT₁ = 高温入口 − 冷却水出口、ΔT₂ = 高温出口 − 冷却水入口（向流）。Q = U × A × LMTD。U値の推移を記録すると清掃時期の判断に使える。'
    },
    {
      id: 'ascaco3',
      title: 'CaCO₃換算',
      desc: 'mg/L as イオン ⇄ mg/L as CaCO₃',
      terms: ['as-caco3', 'equivalent-weight'],
      fields: [
        { id: 'ion', label: '物質', type: 'select', options: ION_FACTORS.map(function (x) { return { value: x.id, label: x.label }; }), def: 'ca' },
        { id: 'val', label: '濃度（as 物質）', unit: 'mg/L', def: 100 },
        { id: 'val2', label: '濃度（as CaCO₃）', unit: 'mg/L', def: '' }
      ],
      compute: function (v) {
        var ion = ION_FACTORS.filter(function (x) { return x.id === v.ion; })[0] || ION_FACTORS[0];
        var out = [{ label: '換算係数', value: ion.f, unit: '', digits: 3 }];
        if (num(v.val)) out.push({ label: v.val + ' mg/L as 物質 →', value: v.val * ion.f, unit: 'mg/L as CaCO₃', digits: 1 });
        if (num(v.val2)) out.push({ label: v.val2 + ' mg/L as CaCO₃ →', value: v.val2 / ion.f, unit: 'mg/L as 物質', digits: 2 });
        return out;
      },
      howto: '係数 = CaCO₃の当量 50.04 ÷ 物質の当量（式量 ÷ 価数）。as CaCO₃ にそろえるとCa・Mgを足して全硬度に、陽イオン合計と陰イオン合計を比べて分析値の妥当性確認（イオンバランス）ができる。'
    },
    {
      id: 'units',
      title: '単位換算',
      desc: '腐食速度・温度・流量',
      terms: ['mpy'],
      fields: [
        { id: 'mpy', label: '腐食速度', unit: 'mpy', def: 3 },
        { id: 'um', label: '腐食速度', unit: 'μm/y', def: '' },
        { id: 'F', label: '温度', unit: '°F', def: '' },
        { id: 'Cdeg', label: '温度', unit: '℃', def: '' },
        { id: 'gpm', label: '流量', unit: 'gpm（米ガロン/分）', def: '' },
        { id: 'm3h', label: '流量', unit: 'm³/h', def: '' }
      ],
      compute: function (v) {
        var out = [];
        if (num(v.mpy)) out.push({ label: v.mpy + ' mpy', value: v.mpy * 25.4, unit: 'μm/y', digits: 1, note: (v.mpy * 0.0254).toFixed(3) + ' mm/y' });
        if (num(v.um)) out.push({ label: v.um + ' μm/y', value: v.um / 25.4, unit: 'mpy', digits: 2 });
        if (num(v.F)) out.push({ label: v.F + ' °F', value: (v.F - 32) / 1.8, unit: '℃', digits: 1 });
        if (num(v.Cdeg)) out.push({ label: v.Cdeg + ' ℃', value: v.Cdeg * 1.8 + 32, unit: '°F', digits: 1 });
        if (num(v.gpm)) out.push({ label: v.gpm + ' gpm', value: v.gpm * 0.2271, unit: 'm³/h', digits: 2 });
        if (num(v.m3h)) out.push({ label: v.m3h + ' m³/h', value: v.m3h / 0.2271, unit: 'gpm', digits: 1 });
        if (!out.length) return { error: '換算したい値を入れてください。' };
        return out;
      },
      howto: '1 mpy = 25.4 μm/年 = 0.0254 mm/年。温度差の換算は ΔT[℃] = ΔT[°F] ÷ 1.8（10°F ≒ 5.56℃）。1 gpm ≒ 0.2271 m³/h。'
    }
  ];

  window.WT_CALC = calcs;
})();
