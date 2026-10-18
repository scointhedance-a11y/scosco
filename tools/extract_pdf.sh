#!/bin/sh
# PDF の本文をテキストに取り出す（コンテンツ作成の下準備用）。
# 使い方: tools/extract_pdf.sh 資料.pdf [出力.txt]
set -e
in="$1"
out="${2:-${1%.pdf}.txt}"
pdftotext "$in" - | grep -v -E "^[0-9]+$" | cat -s > "$out"
echo "$out"
