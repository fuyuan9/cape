# リレーションフィールド ガイド

Cape では、リソース同士の関連（`belongsTo` / `hasMany` 参照）を管理画面上で直感的に扱えるように、リレーションフィールドを提供しています。

---

## 1. belongsTo リレーション

多対1（親への参照）の関係を持つリソース（例: `posts` は `users` に属する）側で使用し、動的に親レコードを検索・選択するためのコンボボックスを提供します。

### 基本的な使い方

リレーションフィールド（外部キー）を定義するには、`belongsTo(fieldName, config)` 関数を使用します。

### 例: Post リソースに Author (User) への参照を追加する

```ts
import { defineResource, input, text, belongsTo } from '@fuyuan9/cape-core';

export const postsResource = defineResource({
  name: 'posts',
  model: {},
  table: {
    columns: [
      text('title').searchable(),
      // テーブル上には紐づく ID が表示されます
      text('authorId'),
    ],
  },
  form: {
    fields: [
      input('title').required(),
      // フォーム上にインクリメンタル検索コンボボックスを表示します
      belongsTo('authorId', {
        resource: 'users', // 関連先のリソース名
        labelField: 'name', // 検索・表示に使用するフィールド名
      }).required(),
    ],
  },
});
```

---

## 2. hasMany リレーション

1対多（子レコードのコレクション）の関係を持つリソース（例: `users` は複数の `posts` を持つ）側で使用し、詳細表示画面や編集画面でインラインで子リソースの一覧を表示・追加・編集・削除できるようにします。

### 基本的な使い方

`hasMany(fieldName, config)` 関数を使用し、親リソース（例: `users`）のフォームフィールドに定義します。

### 例: User リソースに Posts リストを追加する

```ts
import { defineResource, input, text, hasMany } from '@fuyuan9/cape-core';

export const usersResource = defineResource({
  name: 'users',
  model: {},
  table: {
    columns: [text('name').searchable()],
  },
  form: {
    fields: [
      input('name').required(),
      // 関連リストの埋め込み
      hasMany('posts', {
        resource: 'posts', // 紐付く子リソース名
        foreignKey: 'userId', // 子リソース側が持つ外部キー名
      }).label('User Posts'), // 表示ラベル
    ],
  },
});
```

---

## 仕組み

### 1. belongsTo のオートコンプリート

- `belongsTo` フィールドが指定されたフォーム項目には、ユーザー名やタイトルを動的に検索できる**コンボボックス（オートコンプリート）**が表示されます。
- ユーザーがテキストを入力すると、300ms のデバウンスを経て、関連先リソースの検索API（`GET /admin/api/users/relation-search?q=検索文字`）を呼び出します。
- 検索にヒットした関連レコードがドロップダウンリストで表示され、ユーザーが選択するとそのレコードのプライマリキー（`id`）が外部キーとしてフォームに適用されます。

### 2. hasMany のインライン管理（ハイブリッド表示）

- `hasMany` が定義された箇所には、子レコードの一覧テーブルおよび追加・編集・削除のためのアクションがインラインで自動表示されます。
- **詳細（Show）画面** および **編集（Edit）画面** の両方でこの一覧が表示され、その場で管理が可能です。
- **新規作成（Create）画面** では、親レコードの ID がまだ確定していない（DB保存されていない）ため、安全のために自動的に**非表示**（またはID確定後に操作可能である旨のメッセージ表示）になります。

### 3. API（Cape Hono）

- belongsTo検索のために、自動的に `${path}/relation-search` エンドポイントが作成されます。
- 子リソースの取得・作成・更新には、すでに実装済みのネストパス（例: `/users/:parentId/posts`）が活用され、親のIDが自動的にインジェクトされます。

---

## セキュリティ対策

- **認可チェック (canList)**: 関連先レコードを検索する際、関連先リソースの `canList` 認可設定（定義されている場合）が評価されます。権限のないユーザーがAPIを悪用して関連先リソースのレコードを一覧検索することはできません。
- **取得件数制限**: 検索APIから返されるリストは最大で50件に制限され、過剰な負荷や不要な情報漏洩を防ぎます。
- **型バリデーション**: `belongsTo` は入力値として `string` および `number` の両方を許容するため、あらゆるプライマリキー設計に対応し、Zodスキーマにより型検証が行われます。
- **外部キー保護**: インポート時などに許可されていないリレーションをインジェクションされないよう、安全なバリデーション機構が動作します。
