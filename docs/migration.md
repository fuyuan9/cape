# 移行・セットアップガイド (Migration & Setup Guide)

既存のプロジェクトに Cape Framework を新規セットアップまたは導入する手順です。

## 新規導入ステップ

### 1. 必要なパッケージのインストール

モノレポの各ワークスペース、あるいは既存プロジェクトに依存関係を追加します。

```bash
# 既存の Hono サーバー環境に導入する場合
npm install @cape/core @cape/hono zod drizzle-orm
```

### 2. リソース定義ファイルの作成

`admin/resources/user.ts` にアドミン用定義を記述します。

```ts
import { defineResource, text, input } from '@cape/core';
import { usersTable } from '../schema.js';

export const userResource = defineResource({
  name: 'users',
  model: usersTable,
  table: {
    columns: [text('name').sortable().searchable()],
  },
  form: {
    fields: [input('name').required()],
  },
});
```

### 3. Hono API ルーティングの設定

Hono サーバーのエントリーファイルで `createAdminApi` をマウントします。

```ts
import { Hono } from 'hono';
import { DrizzleAdapter } from '@cape/core';
import { createAdminApi } from '@cape/hono';
import { db } from './db.js';
import { userResource } from './admin/resources/user.js';

const app = new Hono();

app.route(
  '/api/admin',
  createAdminApi({
    db: new DrizzleAdapter(db),
    resources: [userResource],
  })
);
```

### 4. クライアント UI 画面の設定

Vite や Next.js 等の React アプリケーションに `AdminProvider` と `ResourcePage` をセットアップします。

```tsx
import { AdminProvider } from '@cape/react';
import { ResourcePage } from '@cape/shadcn';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider apiUri="/api/admin">
        <ResourcePage />
      </AdminProvider>
    </QueryClientProvider>
  );
}
```

これで、完全な管理画面の動作確認ができるようになります。
