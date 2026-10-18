# 水処理ナビ — 作業メモ

水処理技術（冷却水・ボイラ等）の学習クイズ＋現場用辞書の静的Webアプリ。ビルド不要の素のHTML/CSS/JS。

- コンテンツ: `content/sections/*.json`（形式は docs/CONTENT_GUIDE.md）、製品: `content/products.json`
- 生成: `python3 tools/build.py` → `js/data.js`・`dist/water-app.html`・`sw.js` のキャッシュ版。コンテンツを変えたら必ず実行してコミットする。
- 製品MAP更新: `python3 tools/import_products.py <xlsx>`

## 資料を追加するとき
1. 原本（社外秘）はコミットしない。`pdftotext` で本文を読み、日本語で要点・用語・クイズを書き起こす（原文の丸写しはしない）。
2. 既存の用語IDと重複させない。既存用語と関係があれば `related` でつなぐ。
3. 数値は原文に忠実に。クイズは選択肢4つ（choice）と○×（tf）を混ぜ、必ず解説を付ける。
4. `python3 tools/build.py` がエラー・警告なしで通ることを確認する。
