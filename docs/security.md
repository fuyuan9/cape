# セキュリティ設計とサプライチェーン対策 (Security & Supply Chain Protection)

Cape Framework は、利用者の安全を確保するため、以下の npm サプライチェーン攻撃対策およびセキュリティスキャンを標準で導入しています。

---

## 導入されているセキュリティ対策

### 1. サードパーティ製 postinstall スクリプトのデフォルト無効化 (`.npmrc`)

サードパーティ依存関係のインストール時に、悪意のある任意のシェルスクリプト（認証情報の盗難など）が実行されるのを防ぐため、ルートディレクトリに [`.npmrc`](file:///Users/fuyuan/Desktop/cape/.npmrc) を配置し、スクリプト実行を標準でブロックしています。

```ini
ignore-scripts=true
```

### 2. npm パッケージの来歴証明 (Provenance)

すべての公開パッケージの `package.json` にて `"publishConfig": { "provenance": true }` を有効にしています。
これにより、npm レジストリへのリリース時に、改ざんのない GitHub Actions ワークフロー上の実行ビルドから直接公開されたことが証明（来歴署名）され、攻撃者が偽のビルドを紛れ込ませる余地を排除します。

### 3. CI における毎週の自動依存関係スキャン (GitHub Actions)

[`.github/workflows/security.yml`](file:///Users/fuyuan/Desktop/cape/.github/workflows/security.yml) を設定し、GitHub 上でリクエストされた PR および push に対し、`npm audit` を用いた高リスク以上の脆弱性自動スキャンを実行します。また、毎週月曜日に自動的でスキャンがトリガーされます。
