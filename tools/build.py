#!/usr/bin/env python3
"""content/ の JSON を検証して、アプリが読み込む js/data.js と、1ファイル版 dist/water-app.html を作る。

使い方:
    python3 tools/build.py            # 検証 + js/data.js + dist/water-app.html
    python3 tools/build.py --check    # 検証のみ（ファイルは書かない）

資料を追加したら content/sections/ に JSON を置いてこのスクリプトを実行する。
"""
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
SECTION_KEYS = {"id", "book", "section", "title", "titleEn", "summary", "terms", "quiz"}
TERM_REQUIRED = {"id", "term", "definition"}
TERM_KEYS = TERM_REQUIRED | {"reading", "en", "aliases", "field", "formula", "related"}
QUIZ_KEYS = {"id", "type", "q", "choices", "answer", "explanation"}


def section_sort_key(sec):
    nums = [int(x) for x in re.findall(r"\d+", sec.get("section", ""))]
    return (sec.get("book", ""), nums, sec["id"])


def validate(sections):
    errors, warnings = [], []
    term_ids, quiz_ids, sec_ids = {}, {}, set()
    for sec in sections:
        sid = sec.get("id", "?")
        missing = {"id", "book", "section", "title", "terms", "quiz"} - sec.keys()
        if missing:
            errors.append(f"{sid}: 必須キーがありません {sorted(missing)}")
        extra = sec.keys() - SECTION_KEYS
        if extra:
            warnings.append(f"{sid}: 未知のキー {sorted(extra)}")
        if sid in sec_ids:
            errors.append(f"{sid}: セクションIDが重複しています")
        sec_ids.add(sid)
        for t in sec.get("terms", []):
            tid = t.get("id", "?")
            if TERM_REQUIRED - t.keys():
                errors.append(f"{sid}/{tid}: 用語の必須キーがありません {sorted(TERM_REQUIRED - t.keys())}")
            if t.keys() - TERM_KEYS:
                warnings.append(f"{sid}/{tid}: 未知のキー {sorted(t.keys() - TERM_KEYS)}")
            if tid in term_ids:
                errors.append(f"{sid}/{tid}: 用語IDが {term_ids[tid]} と重複しています")
            term_ids[tid] = sid
        for q in sec.get("quiz", []):
            qid = q.get("id", "?")
            if qid in quiz_ids:
                errors.append(f"{sid}/{qid}: クイズIDが {quiz_ids[qid]} と重複しています")
            quiz_ids[qid] = sid
            if q.keys() - QUIZ_KEYS:
                warnings.append(f"{sid}/{qid}: 未知のキー {sorted(q.keys() - QUIZ_KEYS)}")
            typ = q.get("type")
            if typ == "choice":
                ch = q.get("choices") or []
                if len(ch) < 2:
                    errors.append(f"{sid}/{qid}: 選択肢が2つ未満です")
                if not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < len(ch):
                    errors.append(f"{sid}/{qid}: answer は選択肢の番号（0始まり）にしてください")
            elif typ == "tf":
                if not isinstance(q.get("answer"), bool):
                    errors.append(f"{sid}/{qid}: ○×問題の answer は true/false にしてください")
            else:
                errors.append(f"{sid}/{qid}: type は choice か tf にしてください")
            if not q.get("q"):
                errors.append(f"{sid}/{qid}: 問題文 q がありません")
    for sec in sections:
        for t in sec.get("terms", []):
            for r in t.get("related", []):
                if r not in term_ids:
                    warnings.append(f"{sec['id']}/{t['id']}: related '{r}' が見つかりません")
    return errors, warnings


def load_sections():
    sections = []
    for path in sorted((CONTENT / "sections").glob("*.json")):
        try:
            sections.append(json.loads(path.read_text(encoding="utf-8")))
        except json.JSONDecodeError as e:
            print(f"JSONの書式エラー: {path.name}: {e}", file=sys.stderr)
            sys.exit(1)
    return sorted(sections, key=section_sort_key)


def main():
    check_only = "--check" in sys.argv
    sections = load_sections()
    errors, warnings = validate(sections)
    for w in warnings:
        print("警告:", w)
    for e in errors:
        print("エラー:", e, file=sys.stderr)
    if errors:
        sys.exit(1)
    n_terms = sum(len(s["terms"]) for s in sections)
    n_quiz = sum(len(s["quiz"]) for s in sections)
    print(f"OK: {len(sections)} セクション / 用語 {n_terms} / クイズ {n_quiz}")
    if check_only:
        return

    products_path = CONTENT / "products.json"
    products = json.loads(products_path.read_text(encoding="utf-8")) if products_path.exists() else None
    data = {
        "builtAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "sections": sections,
        "products": products,
    }
    js = "window.WT_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (ROOT / "js" / "data.js").write_text(js, encoding="utf-8")
    print("書き出し: js/data.js")

    sw = ROOT / "sw.js"
    sw_text = re.sub(r"const CACHE = '[^']*';", "const CACHE = 'water-navi-" + data["builtAt"].replace(" ", "-").replace(":", "") + "';", sw.read_text(encoding="utf-8"))
    sw.write_text(sw_text, encoding="utf-8")

    # 1ファイル版（メール添付・共有フォルダ・スマホへのコピー用）
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    def inline_script(m):
        src = m.group(1)
        code = (ROOT / src).read_text(encoding="utf-8").replace("</script", "<\\/script")
        return f"<script>\n{code}\n</script>"

    def inline_style(m):
        css = (ROOT / m.group(1)).read_text(encoding="utf-8")
        return f"<style>\n{css}\n</style>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_style, html)
    html = re.sub(r'<script src="([^"]+)"></script>', inline_script, html)
    html = re.sub(r'<link rel="manifest"[^>]*>\n?', "", html)
    html = html.replace('data-single-file="0"', 'data-single-file="1"')
    out = ROOT / "dist" / "water-app.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"書き出し: dist/water-app.html ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
