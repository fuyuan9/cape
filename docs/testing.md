# テストガイド (Testing Guide)

Cape Framework は、型安全性の保証および API エンドポイントの整合性を検証するため、Vitest を利用した自動テスト環境を提供しています。

## テストの実行方法

### 依存関係のインストール

```bash
npm install
```

### 全テストの実行

```bash
npm run test
```

---

## テストの構成

### 1. コア単体テスト (`packages/core/tests/`)

`ColumnBuilder`, `FieldBuilder` の不変（Immutable）性、リソース定義（`defineResource`）のメタデータパース、および動的生成される Zod バリデーションスキーマの挙動を検証します。

- `resource.test.ts`: Zod バリデーションスキーマによる値のパースと必須入力の制御を詳細にテストします。

### 2. Hono 統合テスト (`packages/hono/tests/`)

Hono の `app.request()`（インメモリ HTTP テストツール）を利用して、各エンドポイントにアクセスした際のリクエスト・レスポンス挙動を検証します。

- メタデータエンドポイント (`GET /metadata`) から正しい JSON が返ること。
- クエリ（検索・フィルタリングなど）が `DbAdapter` に正確に渡ること。
- 新規登録の際に不正なデータを送信した場合、自動生成された Zod スキーマにより `400 Bad Request` とエラー詳細が返却されること。
