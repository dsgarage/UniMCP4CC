# UniMCP4CC - 公開パッケージ（無料版）

このリポジトリは無料版（Public Edition）パッケージ。有料機能（Standard/Pro）を含めることは絶対に禁止。

## リポジトリ構成

```
UniMCP4CC/
├── Editor/
│   ├── LocalMcp.UnityServer.Editor.dll      ← UnityMCP からコンパイルした DLL
│   └── .mcp-edition                          ← "public"（必須）
├── package.json
├── CHANGELOG.md
├── LICENSE.md
└── README.md
```

## Edition 管理（最重要）

- `Editor/.mcp-edition` が必ず存在し、内容が `public` であること
- `.mcp-edition` がない場合 → `DetectEdition()` が **Pro（全機能解放）** を返す → 収益損失
- `.mcp-edition` なしの状態でのプッシュ・リリースは禁止

## 関連リポジトリ

| リポジトリ | 用途 |
|-----------|------|
| `dsgarage/UnityMCP` | 開発リポジトリ（ソースコード） |
| `dsgarage/UniMCP4CC` | 公開リポジトリ（無料版パッケージ） |

## ルール・スキル参照

| ファイル | 内容 |
|----------|------|
| `.claude/rules/edition-guard.md` | Edition Guard 詳細ルール |
| `.claude/rules/deployment-checklist.md` | デプロイ前チェックリスト |
| `.claude/rules/code-editing-restrictions.md` | コード編集制限 |
| `.claude/rules/dll-deployment.md` | DLL デプロイフロー |
| `.claude/skills/release/SKILL.md` | リリースフロー |
