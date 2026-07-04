# Cape Framework

Hono エコシステム向けに設計された、TypeScript ファーストでかつ不変（Immutable）な API 設計を持つ、本番環境仕様のアドミンパネル開発用フレームワークです。

## 特徴

- **TypeScript First**: Decorator やランタイムのリフレクションを使わず、1つの Resource 定義から型安全な CRUD API、クライアントバリデーション、アドミン UI までを自動的に導出します。
- **Immutable Builder**: フィールドやカラムの設定メソッド（`.required()`, `.sortable()`, `.searchable()` 等）はすべてイミュータブルで、チェイニングのたびに新しいビルダーオブジェクトを返します。
- **Hono Native**: Hono のミドルウェア/ルート定義パターンに完全に準拠し、`createAdminApi` を呼び出すだけで CRUD API エンドポイントを瞬時にマウントできます。
- **ORM Agnostic**: データベース操作は `DbAdapter` インターフェースを通じて抽象化されており、デフォルトで Drizzle ORM に対応した `DrizzleAdapter` が組み込まれています。
- **shadcn/ui**: スタイル定義および UI コンポーネントは shadcn/ui の美学に基づいて構成され、美しくレスポンシブなアドミンコンソールを即座に構築します。

## プロジェクト構成

```
packages/
  core/      - コア設定、ビルダー、リソーススキーマ、DbAdapter
  hono/      - Hono ルーティングおよびエンドポイント統合
  react/     - TanStack Query を用いたデータフェッチ・操作用カスタム Hooks
  shadcn/    - React と shadcn/ui スタイルの UI コンポーネント
  cli/       - リソースと設定を初期設定するためのCLIツール
```

## クイックスタート

### 1. リソースの定義

```ts
import { defineResource, text, email, badge, datetime, input, select } from '@cape/core';

export const users = defineResource({
  name: 'users',
  model: usersTable, // Drizzle テーブル参照
  table: {
    columns: [text('name').sortable().searchable(), email('email').searchable(), badge('role'), datetime('createdAt')],
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

### 2. バックエンド API (Hono)

```ts
import { Hono } from 'hono';
import { DrizzleAdapter } from '@cape/core';
import { createAdminApi } from '@cape/hono';
import { db } from './db.js';
import { users } from './users.js';

const app = new Hono();

// CRUD API エンドポイントのマウント
app.route(
  '/admin/api',
  createAdminApi({
    db: new DrizzleAdapter(db),
    resources: [users],
  })
);
```

### 3. フロントエンド UI (React)

```tsx
import React from 'react';
import { AdminProvider } from '@cape/react';
import { ResourcePage } from '@cape/shadcn';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function AdminConsole() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider apiUri="/admin/api">
        <ResourcePage />
      </AdminProvider>
    </QueryClientProvider>
  );
}
```

## ドキュメント (Documentation)

詳細な機能や設計については、以下の各ドキュメントを参照してください。

- [アーキテクチャ設計書](file:///Users/fuyuan/Desktop/cape/docs/architecture.md)
- [パブリック API 仕様書](file:///Users/fuyuan/Desktop/cape/docs/public-api.md)
- [移行・セットアップガイド](file:///Users/fuyuan/Desktop/cape/docs/migration.md)
- [テストガイド](file:///Users/fuyuan/Desktop/cape/docs/testing.md)
- [セキュリティ設計とサプライチェーン対策](file:///Users/fuyuan/Desktop/cape/docs/security.md)
- [カスタマイズガイド](file:///Users/fuyuan/Desktop/cape/docs/customization.md)
- [CLI ツール利用ガイド](file:///Users/fuyuan/Desktop/cape/docs/cli.md)
