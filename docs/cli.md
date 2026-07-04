# CLI ツール利用ガイド (CLI Guide)

Cape Framework は、開発を高速化するためのコマンドラインツール (CLI) を提供しています。リソースファイルの生成や設定の初期化を簡単に行うことができます。

---

## 起動方法

パッケージがローカルにインストールされている場合、`npx` を介して呼び出すことができます。

```bash
npx cape <command> [arguments]
```

また、モノレポ内や開発環境では以下のように実行することもできます。

```bash
# ヘルプメニューの表示
npx cape help
```

---

## 提供コマンド

### 1. `cape init`

プロジェクトのルートディレクトリに、管理画面の初期設定ファイルである `admin.ts` を生成します。

- **実行方法**:
  ```bash
  npx cape init
  ```
- **生成されるファイル (`admin.ts`)**:
  ```typescript
  import { defineResource, text, email, badge, datetime, input, select } from '@cape/core';

  // サンプルリソースの定義
  export const users = defineResource({
    name: 'users',
    model: {}, // ここに Drizzle のテーブル定義を関連付けます
    table: {
      columns: [
        text('name').sortable().searchable(),
        email('email').searchable(),
        badge('role'),
        datetime('createdAt'),
      ],
    },
    form: {
      fields: [
        input('name').required(),
        input('email').email().required(),
        select('role', {
          options: ['admin', 'member'],
        }),
      ],
    },
  });
  ```

---

### 2. `cape make:resource <resourceName>`

指定された名前で新規のリソース定義ファイル（例: `posts.resource.ts`）を生成します。

- **実行方法**:
  ```bash
  npx cape make:resource posts
  ```
- **生成されるファイル (`posts.resource.ts`)**:
  ```typescript
  import { defineResource, text, input } from '@cape/core';

  export const posts = defineResource({
    name: 'posts',
    label: 'Posts',
    model: {}, // Drizzle のテーブル定義を関連付けます
    table: {
      columns: [text('id').sortable(), text('title').searchable()],
    },
    form: {
      fields: [input('title').required()],
    },
  });
  ```

---

### 3. `cape make:field <fieldName>`

指定されたフィールド名に基づいて、テーブルカラム定義およびフォームフィールド定義用の定型ボイラープレートコードをコンソールに出力します。定義ファイルへ素早くコピー＆ペーストする際に便利です。

- **実行方法**:
  ```bash
  npx cape make:field status
  ```
- **コンソール出力結果**:
  ```typescript
  // Copy the code below to use inside your Resource columns / fields:

  // Table column:
  text('status').sortable().searchable();

  // Form input field:
  input('status').required();
  ```
