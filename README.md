# scosco

NISA成長投資枠を5〜10年で埋めるための、Claude Code による「株式・投資信託予測チーム」。

- 運用計画: [plan/nisa-plan.md](plan/nisa-plan.md)
- 保有状況: [portfolio/holdings.md](portfolio/holdings.md)（購入したら更新してください）
- 月次レポート: [reports/](reports/)
- チーム定義: [.claude/agents/](.claude/agents/)、実行手順: [.claude/skills/monthly-picks/SKILL.md](.claude/skills/monthly-picks/SKILL.md)

## 使い方
Claude Code でこのリポジトリを開き `/monthly-picks` を実行すると、5人のチームが市況を調べて
`reports/YYYY-MM.md` を作成します。毎月1日に自動実行するスケジュールタスクも設定済みです。

> 本リポジトリの内容は情報提供であり投資助言ではありません。投資判断はご自身の責任で行ってください。
