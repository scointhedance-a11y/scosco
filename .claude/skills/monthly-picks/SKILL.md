---
name: monthly-picks
description: 株式・投資信託予測チームを招集し、NISA成長投資枠の月次おすすめ銘柄レポートを reports/YYYY-MM.md に作成する。「今月のおすすめ」「月次レポート」と言われたら使う。
---
# 月次おすすめ銘柄レポートの作り方

1. `CLAUDE.md`、`plan/nisa-plan.md`、`portfolio/holdings.md`、`reports/` の最新レポートを読む。
2. 次の4エージェントを並行して起動し、それぞれの出力を受け取る:
   `market-strategist`、`jp-stock-analyst`、`global-stock-analyst`、`fund-analyst`。
   各エージェントには今日の日付、今月の予定投資額（`plan/nisa-plan.md` の月額。6月・12月はボーナス分を加える）、現保有を渡す。
   個別株の新規購入はボーナス月にまとめる方針なので、それ以外の月は監視リストの更新に留める。
3. 4人の出力をまとめて `risk-manager` に渡し、検証と金額配分表を受け取る。差し戻しがあれば修正して再確認する。
4. `reports/TEMPLATE.md` の構成で `reports/YYYY-MM.md` を作成する。数値には出典URLを付ける。
5. `README.md` は変更不要。レポートをコミットしてプッシュする（ブランチ指定がない場合は作業中のブランチ）。
6. ユーザーへの返答では、地合い判断・今月の購入配分表・新規/継続/見直しの銘柄を短く要約し、レポートのパスを示す。
