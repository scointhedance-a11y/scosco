# 資料（コンテンツ）の追加ガイド

水処理ナビのデータは `content/sections/*.json`（1ファイル＝1セクション）と `content/products.json`（製品MAP）です。
新しい資料を追加したら `python3 tools/build.py` を実行すると、検証のうえ `js/data.js` と `dist/water-app.html` が作り直されます。

## セクションJSONの形式

```json
{
  "id": "pac3-3.3",                      // 一意なID（資料略称-節番号）
  "book": "PAC-3 冷却水技術マニュアル",    // 資料名。学習画面ではこの単位でまとまる
  "section": "3.3",                      // 節番号（並び順に使う）
  "title": "開放循環冷却水系",             // 日本語の見出し
  "titleEn": "Open Recirculating Systems",// 原文の見出し（任意）
  "summary": ["要点1", "要点2"],          // 要点（3〜7個程度）
  "terms": [
    {
      "id": "cycles-of-concentration",    // 全資料で一意なID（英小文字とハイフン）
      "term": "濃縮倍数",                  // 見出し語
      "reading": "のうしゅくばいすう",      // 読み（ひらがな）…50音索引と読み検索に使う
      "en": "Cycles of concentration",    // 英語（任意）
      "aliases": ["COC", "CR"],           // 別名・略称・言い換え（検索に効く）
      "definition": "意味（1〜3文）",
      "formula": "CR = 循環水濃度 ÷ 補給水濃度",  // 式・数値の目安（任意）
      "field": "現場での注意点・判断のコツ（任意）",
      "related": ["blowdown", "makeup-water"]     // 関連用語のID（任意）
    }
  ],
  "quiz": [
    { "id": "q3.3-01", "type": "choice", "q": "問題文", "choices": ["A", "B", "C", "D"], "answer": 0, "explanation": "解説" },
    { "id": "q3.3-02", "type": "tf", "q": "○×で答える文", "answer": false, "explanation": "解説" }
  ]
}
```

- `answer` は choice なら選択肢の番号（0始まり）、tf なら true/false。選択肢はアプリが毎回並べ替えます。
- 用語ID・クイズIDは全資料で重複不可（build.py がチェックします）。
- `related` に存在しないIDを書くと警告になります。

## 作成の目安

- 1セクションあたり 用語15〜30・クイズ15〜20 程度。
- 数値（濃度・温度・比率）は原文どおりに。単位はSI（m³/h、℃、mg/L）を基本に、原文の米国単位は必要に応じて併記。
- 「現場のポイント」には判断基準・失敗例・切り分け方など、現場で引いたときに役立つことを書く。

## 製品MAPの更新

```
python3 tools/import_products.py <製品MAP.xlsx>
python3 tools/build.py
```

## アプリ内での一時追加

アプリの「その他 → 学習記録・資料の追加・設定」から上記形式のJSONを読み込むと、その端末だけに追加されます（ビルド不要）。
全員に配布するときは content/sections/ に置いてビルドしてください。

## 原文の取り出し

PDFからの文字の取り出しには `tools/extract_pdf.sh` を使えます（pdftotext が必要）。
原本のPDF・Excelは社外秘のため、リポジトリには入れないでください（.gitignore で除外済み）。
