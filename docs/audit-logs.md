# 監査ログ＆ソフトデリート実装ガイド

Cape で「監査ログ（変更履歴の記録）」をライフサイクルフックを利用して実装する方法、および「ソフトデリート（論理削除）」の設定方法について説明します。

---

## 1. ソフトデリート（論理削除）の有効化

データベースのアダプター（Drizzle, Prisma, InMemory）は、リソース定義に `softDelete` オプションが設定されている場合、自動的に論理削除を処理します。

### 基本設定 (デフォルトのカラム `deletedAt` を使用)

データベースのテーブルに `deletedAt` カラム（日時型/文字列型、NULL許容）を用意し、リソース定義で `softDelete: true` を設定します。

```ts
import { defineResource, text } from '@fuyuan9/cape-core';

export const products = defineResource({
  name: 'products',
  model: productsTable,
  softDelete: true, // 論理削除を有効化
  table: {
    columns: [text('name')],
  },
  form: {
    fields: [input('name').required()],
  },
});
```

### カスタムカラムの設定 (`archivedAt` などを使用)

論理削除を示すカラム名をカスタマイズしたい場合、`softDelete: { columnName: 'カスタムカラム名' }` を指定します。

```ts
export const users = defineResource({
  name: 'users',
  model: usersTable,
  softDelete: { columnName: 'archivedAt' }, // 'archivedAt' カラムを論理削除用に指定
  table: { ... },
  form: { ... },
});
```

### 動作の挙動

`softDelete` が有効化されると、Cape は以下の処理を自動で行います。

- **削除時 (`DELETE`)**: レコードを物理削除せず、指定されたカラム（`deletedAt` など）に現在日時を書き込みます。
- **一覧取得時 (`list`)**: `deletedAt IS NULL` であるレコードのみを自動で抽出し、論理削除されたレコードを除外します。
- **詳細取得時 (`read`)**: 論理削除されたIDのリクエストに対して自動的に `404 Not Found` を返却します。
- **更新時 (`update`)**: 論理削除されたレコードに対する更新リクエストを遮断し、`404 Not Found` を返却します。

---

## 2. 監査ログ（監査追跡）の実装

監査ログは、Cape のライフサイクルフックとフックに渡される Hono Context (`c`) を活用することで、ユーザーの操作ログを簡単に保存できます。

### 実装例：作成・更新・削除のユーザーと日時の記録

以下は、作成者・更新者・削除者を Hono のセッション/認証情報から取得し、監査追跡を行う実装例です。

```ts
import { defineResource, text, input } from '@fuyuan9/cape-core';
import { db } from './db'; // 独自データベース等

export const articles = defineResource({
  name: 'articles',
  model: articlesTable,
  table: {
    columns: [text('title')],
  },
  form: {
    fields: [input('title').required()],
  },
  hooks: {
    // レコード作成前フック
    beforeCreate: async (record, c) => {
      if (c) {
        // Hono Context からログインユーザーを取得 (例: better-auth や独自ミドルウェア経由)
        const user = c.get('user');
        if (user) {
          record.createdBy = user.id;
          record.updatedBy = user.id;
        }
      }
    },

    // レコード更新前フック
    beforeUpdate: async (id, record, c) => {
      if (c) {
        const user = c.get('user');
        if (user) {
          record.updatedBy = user.id;
        }
      }
    },

    // 削除前フック (監査用外部テーブルへの書き出し)
    beforeDelete: async (id, c) => {
      if (c) {
        const user = c.get('user');
        const userId = user ? user.id : 'system';

        // 変更履歴テーブル等に「誰がいつこの記事を削除したか」をログ出力
        await db.auditLogs.create({
          userId: userId,
          action: 'DELETE',
          resource: 'articles',
          resourceId: String(id),
          timestamp: new Date(),
        });
      }
    },
  },
});
```

`c` (Hono Context) を通じてリクエストヘッダー、IPアドレス、セッション情報などに直接アクセスできるため、柔軟な監査ログの実装が可能です。
