---
description: デプロイ前の必須チェック
globs:
  - "Editor/**/*"
  - "package.json"
---

# デプロイ前チェックリスト

## 必須チェック

1. `Editor/.mcp-edition` の存在確認: `ls Editor/.mcp-edition`
2. `.mcp-edition` の内容が `public` であること: `cat Editor/.mcp-edition`
3. Unity Editor コンソールで `[MCP] Edition detected: Public` を確認
4. Pro/Standard と表示された場合は**即座にリリース中止**
5. `package.json` のバージョン更新済み

## 禁止事項

- リリース前にブログを公開する
- `.mcp-edition` なしでプッシュする
- Pro/Standard と表示される状態でデプロイする
- GitHub Release を作成せずに告知する
