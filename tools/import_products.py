#!/usr/bin/env python3
"""製品MAP (Excel) を content/products.json に変換する。

使い方:
    python3 tools/import_products.py <製品MAP.xlsx> [出力先 content/products.json]

シートには「タイトル行（例: 凝結剤 (PAC-1C)）→ 見出し行（製品名 を含む）→ データ行」の
ブロックが縦横に並んでいる前提で読み取る。新しい版の製品MAPを受け取ったら、このスクリプトを
再実行して products.json を作り直し、tools/build.py でアプリに反映する。
"""
import datetime
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

SKIP_SHEETS = {"更新履歴"}
PRODUCT_HEADER = "製品名"
MAX_BLANK_ROWS = 3


def clean(v):
    if v is None:
        return ""
    if isinstance(v, (datetime.date, datetime.datetime)):
        return ""
    if isinstance(v, float):
        if v != v:  # NaN
            return ""
        v = round(v, 3)
        return str(int(v)) if v == int(v) else str(v)
    s = str(v).replace("　", " ").strip()
    if s.startswith("#"):  # #DIV/0! など
        return ""
    return re.sub(r"[ \t]+", " ", s)


def norm(s):
    return unicodedata.normalize("NFKC", s).lower().replace(" ", "")


def is_header_style(c):
    """見出しセル: 濃い単色の塗りつぶし（白・淡色ハイライトを除く）で太字でないセル。

    タイトル行（例: 凝結剤 (PAC-1C)）は太字、データ行の強調は淡色（tint付き）なので区別できる。
    """
    f = c.fill
    if f is None or f.fill_type != "solid":
        return False
    fg = f.fgColor
    if (fg.tint or 0) != 0:
        return False
    if fg.type == "theme" and fg.theme == 0:
        return False
    if fg.type == "rgb" and str(fg.rgb).upper().endswith("FFFFFF"):
        return False
    return not (c.font is not None and c.font.b)


def is_title_style(c):
    return c.font is not None and bool(c.font.b)


def load_grid(ws):
    """(生の値, 結合セルを左上の値で埋めた値, 見出しセル判定) の3つの辞書を返す。

    見出しセルは塗りつぶしがあるセル、データセルは塗りつぶしなし、という製品MAPの書式を利用する。
    """
    raw, filled, shaded = {}, {}, set()
    titles = set()
    for row in ws.iter_rows():
        for c in row:
            if c.value is not None:
                raw[(c.row, c.column)] = c.value
            if is_header_style(c):
                shaded.add((c.row, c.column))
            if c.value is not None and is_title_style(c):
                titles.add((c.row, c.column))
    filled.update(raw)
    for rng in ws.merged_cells.ranges:
        v = raw.get((rng.min_row, rng.min_col))
        top_shaded = (rng.min_row, rng.min_col) in shaded
        for r in range(rng.min_row, rng.max_row + 1):
            for col in range(rng.min_col, rng.max_col + 1):
                if v is not None:
                    filled[(r, col)] = v
                if top_shaded:
                    shaded.add((r, col))
    return raw, filled, shaded, titles


def header_blocks(raw, shaded, row, max_col):
    """見出し行で「製品名」を含む、塗りつぶしセルの連続範囲 (c0, c1, 製品名列) を返す。"""
    blocks = []
    for pc in range(1, max_col + 1):
        if clean(raw.get((row, pc))) != PRODUCT_HEADER or (row, pc) not in shaded:
            continue
        c0 = pc
        while c0 > 1 and (row, c0 - 1) in shaded and clean(raw.get((row, c0 - 1))) != PRODUCT_HEADER:
            c0 -= 1
        c1 = pc
        while c1 < max_col and (row, c1 + 1) in shaded and clean(raw.get((row, c1 + 1))) != PRODUCT_HEADER:
            c1 += 1
        # 右隣のブロックの先頭見出し（左端と同じ見出し）が続く場合はその手前まで
        first = clean(raw.get((row, c0)))
        for c in range(pc + 1, c1 + 1):
            if first and clean(raw.get((row, c))) == first:
                c1 = c - 1
                break
        blocks.append((c0, c1, pc))
    return blocks


def find_title(raw, row, c0, c1):
    for r in range(row - 1, max(0, row - 3), -1):
        for c in range(c0, c1 + 1):
            t = clean(raw.get((r, c)))
            if t and not t.startswith("KNI Select") and not t.startswith("Ver."):
                return t
    return ""


def parse_sheet(ws):
    raw, grid, shaded, titles = load_grid(ws)
    max_row, max_col = ws.max_row, ws.max_column
    products = []
    for row in range(1, max_row + 1):
        for c0, c1, pcol in header_blocks(raw, shaded, row, max_col):
            headers = {}
            last = None
            for c in range(c0, c1 + 1):
                t = clean(raw.get((row, c)))
                if t:
                    last = t
                    headers[c] = t
            title = find_title(raw, row, c0, c1)
            start = row + 1
            # サブ見出し行（FDA/BfR など）: 次の行も塗りつぶされている
            if any((start, c) in shaded and clean(raw.get((start, c))) for c in range(c0, c1 + 1)) and not clean(raw.get((start, pcol))):
                last = None
                for c in range(c0, c1 + 1):
                    if c in headers:
                        last = headers[c]
                    t = clean(raw.get((start, c)))
                    if t and t != headers.get(c):
                        headers[c] = f"{last}:{t}" if last else t
                start += 1
            first_col = c0

            blank = 0
            carry = ""
            prev = None
            for r in range(start, max_row + 1):
                if header_blocks(raw, shaded, r, max_col) and any(
                    c0 <= pc <= c1 for _, _, pc in header_blocks(raw, shaded, r, max_col)
                ):
                    break
                if not clean(raw.get((r, pcol))) and any(
                    ((r, c) in shaded or (r, c) in titles) and clean(raw.get((r, c))) for c in range(c0, c1 + 1)
                ):
                    break  # 次ブロックのタイトル・見出し（製品名の無い色付き/太字の行）
                vals = {c: clean(grid.get((r, c))) for c in headers}
                rawvals = {c: clean(raw.get((r, c))) for c in headers}
                name = rawvals.get(pcol, "")
                if not any(rawvals.values()):
                    blank += 1
                    if blank >= MAX_BLANK_ROWS:
                        break
                    continue
                blank = 0
                first = vals.get(first_col, "") if first_col != pcol else ""
                if first:
                    carry = first
                if not name:
                    if prev is not None:
                        extra = " / ".join(v for c, v in rawvals.items() if v and c != first_col)
                        if extra:
                            prev["attrs"].append(["補足", extra])
                    continue
                attrs = []
                for c in sorted(headers):
                    if c == pcol:
                        continue
                    v = vals[c]
                    if c == first_col and not v:
                        v = carry
                    if v and [headers[c], v] not in attrs and not (attrs and attrs[-1][1] == v and attrs[-1][0] == headers[c]):
                        attrs.append([headers[c], v])
                prev = {"name": name, "sheet": ws.title.strip(), "category": title, "attrs": attrs}
                products.append(prev)
    return products


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "content" / "products.json"
    wb = openpyxl.load_workbook(src, data_only=True)
    version = ""
    products = []
    for ws in wb.worksheets:
        if ws.title.strip() in SKIP_SHEETS:
            continue
        for row in ws.iter_rows(max_row=5):
            for c in row:
                t = clean(c.value)
                if t.startswith("Ver.") and not version:
                    version = t
        for prod in parse_sheet(ws):
            n = prod["name"]
            # 表の下の注記（注1：… / 問い合わせ先 など）は製品ではないので除く
            if n.startswith(("注", "※", "*")) or "@" in n or len(n) > 60:
                continue
            products.append(prod)
    seen = set()
    for i, p in enumerate(products):
        key = (p["sheet"], norm(p["name"]))
        base = re.sub(r"[^0-9a-z]+", "-", norm(p["name"]))[:40].strip("-") or "p"
        pid = f"prd-{base}-{i}"
        p["id"] = pid
        p["dup"] = key in seen
        seen.add(key)
    data = {
        "source": src.name,
        "version": version,
        "generated": datetime.date.today().isoformat(),
        "products": [{k: v for k, v in p.items() if k != "dup"} for p in products],
    }
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(products)} products -> {out}")


if __name__ == "__main__":
    main()
