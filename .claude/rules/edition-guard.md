# Edition Guard Rules（UniMCP4CC 専用）

**このリポジトリは無料版（Public Edition）。以下を厳守すること。**

---

## 絶対ルール

1. `Editor/.mcp-edition` ファイルが必ず存在すること
2. `.mcp-edition` の内容は `public` であること
3. `.mcp-edition` がない状態でのプッシュ・リリースは禁止

## 理由

`.mcp-edition` がない場合 → `DetectEdition()` が **Pro（全機能解放）** を返す
→ 無料ユーザーに有料機能（Standard: ~515 API, Pro: ~229 API）が公開される
→ **直接的な収益損失**

## デプロイ前チェック

```bash
# 1. .mcp-edition の確認
cat Editor/.mcp-edition
# → "public" であること

# 2. Unity Editor コンソールで確認
# [MCP] Edition detected: Public (from .../Editor/.mcp-edition)
# Pro/Standard と表示された場合は即座にリリース中止

# 3. package.json バージョン確認
grep '"version"' package.json
```

## GitHub Actions

`edition-guard.yml` が以下を自動チェック:
- `.mcp-edition` ファイルの存在
- 内容が `public` であること
- DLL の存在
- `package.json` のバージョン形式
