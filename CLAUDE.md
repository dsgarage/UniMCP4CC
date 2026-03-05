# UniMCP4CC - 公開パッケージ（無料版）

## ⚠️ 最重要ルール: Edition管理

```
このリポジトリは無料版（Public Edition）パッケージです。
有料機能（Standard/Pro）を含めることは絶対に禁止です。
```

### 必須チェック

| チェック項目 | 期待値 | 確認方法 |
|-------------|--------|----------|
| `Editor/.mcp-edition` の存在 | 必須 | `ls Editor/.mcp-edition` |
| `.mcp-edition` の内容 | `public` | `cat Editor/.mcp-edition` |
| Edition Guard CI | 全チェック通過 | GitHub Actions |

### .mcp-edition ファイルが存在しない場合

**即座にリリースを中止すること。**

`.mcp-edition` ファイルがない場合、`DetectEdition()` はデフォルトで **Pro（全機能解放）** を返します。
これは開発環境向けの動作であり、公開パッケージでは **必ず `public` を明示指定** すること。

```bash
# 修正方法
echo "public" > Editor/.mcp-edition
```

---

## リポジトリ構成

```
UniMCP4CC/
├── Editor/
│   ├── LocalMcp.UnityServer.Editor.dll      ← UnityMCP からコンパイルした DLL
│   ├── LocalMcp.UnityServer.Editor.dll.meta
│   └── .mcp-edition                          ← "public"（必須）
├── package.json                              ← UPM パッケージ定義
├── CHANGELOG.md
├── LICENSE.md
├── README.md
└── .github/
    └── workflows/
        └── edition-guard.yml                 ← Edition 自動チェック
```

---

## デプロイフロー（UnityMCP → UniMCP4CC）

```
1. UnityMCP の develop ブランチで開発・テスト完了
2. DLL をコンパイル（Public edition でフィルタ確認）
3. Unity コンソールで Edition 確認:
   [MCP] Edition detected: Public (from .../Editor/.mcp-edition)
4. DLL を UniMCP4CC/Editor/ にコピー
5. .mcp-edition ファイルの存在・内容確認（"public"）
6. package.json バージョン更新
7. CHANGELOG.md 更新
8. コミット・プッシュ
9. GitHub Release + タグ作成
10. ブログ・告知（リリース完了後のみ）
```

### 禁止事項

- リリース前にブログを公開する
- `.mcp-edition` なしでプッシュする
- Pro/Standard と表示される状態でデプロイする
- GitHub Release を作成せずに告知する

---

## コーディングルール

- このリポジトリでは直接コードを編集しない
- コード変更は UnityMCP（開発リポジトリ）で行い、DLL としてデプロイする
- `package.json`, `CHANGELOG.md`, `README.md` のみ直接編集可能

---

## 関連リポジトリ

| リポジトリ | 用途 |
|-----------|------|
| `dsgarage/UnityMCP` | 開発リポジトリ（ソースコード） |
| `dsgarage/UniMCP4CC` | 公開リポジトリ（無料版パッケージ） |
