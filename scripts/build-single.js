// index.html と CSS/JS を1つの HTML にまとめる（ファイル1つで配布・公開したいとき用）
// 使い方: node scripts/build-single.js [出力先]   既定: dist/toeic960.html
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const out = process.argv[2] || path.join(root, "dist", "toeic960.html");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const m = html.match(/<!-- artifact:start -->([\s\S]*)<!-- artifact:end -->/);
if (!m) throw new Error("index.html に artifact:start / artifact:end の目印がありません");

const body = m[1]
  .replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) =>
    "<style>\n" + fs.readFileSync(path.join(root, f), "utf8") + "</style>")
  .replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) =>
    "<script>\n" + fs.readFileSync(path.join(root, f), "utf8").replace(/<\/script/gi, "<\\/script") + "</script>")
  .replace(/<\/head>\s*<body>\s*/, "");

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, body.trim() + "\n");
console.log("wrote " + path.relative(process.cwd(), out) + " (" + Math.round(fs.statSync(out).size / 1024) + " KB)");
