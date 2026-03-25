---
description: UnityMCPのDLLビルド→コピーフロー
globs:
  - "Editor/**/*.dll"
---

# DLL デプロイフロー

## UnityMCP → UniMCP4CC

1. UnityMCP の develop ブランチで開発・テスト完了
2. DLL をコンパイル（Public edition でフィルタ確認）
3. Unity コンソールで Edition 確認:
   `[MCP] Edition detected: Public (from .../Editor/.mcp-edition)`
4. DLL を `UniMCP4CC/Editor/` にコピー
5. `.mcp-edition` ファイルの存在・内容確認（`public`）
6. `package.json` バージョン更新
7. `CHANGELOG.md` 更新
