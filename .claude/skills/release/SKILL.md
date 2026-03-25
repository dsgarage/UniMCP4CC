---
description: DLLデプロイからGitHub Releaseまでのリリースフロー
---

# リリースフロー

UniMCP4CC の DLL デプロイから GitHub Release までの手順。

## 手順

### 1. DLL デプロイ

UnityMCP でビルドした DLL を `Editor/` にコピー。

### 2. Edition 確認

```bash
cat Editor/.mcp-edition
# → "public" であること
```

Unity Editor コンソールでも確認:
```
[MCP] Edition detected: Public (from .../Editor/.mcp-edition)
```

**Pro/Standard と表示された場合は即座に中止。**

### 3. バージョン更新

- `package.json` のバージョンを更新
- `CHANGELOG.md` にリリース内容を記載

### 4. コミット・プッシュ

変更をコミットしてプッシュ。

### 5. GitHub Release

- タグを作成（バージョン番号）
- GitHub Release を作成
- リリースノートに変更内容を記載

### 6. 告知

GitHub Release が完了してからブログ・告知を行う。
**リリース前のブログ公開は禁止。**
