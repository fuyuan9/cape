# カスタマイズガイド (Customization Guide)

Cape Framework は、開発者のニーズに合わせて UI レイヤーやデータ連携を柔軟にカスタマイズできるよう設計されています。

---

## カスタマイズの3つのアプローチ

### アプローチ1. コンポーネントの再構成 (UI Composition)

Cape が提供する画面ブロック（`<ResourceList />`, `<ResourceCreate />`, `<ResourceEdit />`, `<ResourceShow />`）は個別にエクスポートされているため、デフォルトのレイアウト（`<ResourcePage />`）を使わずに独自のダッシュボードやスライドパネル（Drawer）に組み込むことができます。

```tsx
import React, { useState } from 'react';
import { useAdminMetadata } from '@cape/react';
import { ResourceList, ResourceEdit } from '@cape/shadcn';

export function CustomDashboard() {
  const { data: metaData } = useAdminMetadata();
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const resource = metaData?.resources.find((r) => r.name === 'users');
  if (!resource) return null;

  return (
    <div className="flex">
      <main className="flex-1 p-8">
        <ResourceList resource={resource} onEdit={(id) => setEditingId(id)} onCreate={() => {}} onShow={() => {}} />
      </main>

      {editingId && (
        <aside className="w-80 border-l bg-white p-4">
          <ResourceEdit
            resource={resource}
            id={editingId}
            onSuccess={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        </aside>
      )}
    </div>
  );
}
```

---

### アプローチ2. ヘッドレス Hooks による完全オリジナル UI

UI レンダリングを完全に独自設計したい場合、Cape のデータ連携・状態管理ロジック（TanStack Query ベース）を提供するカスタム Hooks を直接呼び出すことができます。これにより、グリッドカード表示やグラフ表示など、あらゆる UI を自由にデザインできます。

#### 使用可能な主な Hooks (`@cape/react`):

- `useAdminMetadata()`: 全リソースの定義メタデータの取得
- `useResourceList(resourceName, params)`: ソート・フィルタリング・ページネーション付きレコード一覧の取得
- `useResourceRecord(resourceName, id)`: 特定レコードの詳細取得
- `useResourceCreate(resourceName)`: 新規作成処理の実行
- `useResourceUpdate(resourceName, id)`: 更新処理の実行
- `useResourceDelete(resourceName)`: レコードの削除
- `useResourceBulkDelete(resourceName)`: 選択された複数レコードの一括削除

```tsx
import React from 'react';
import { useResourceList } from '@cape/react';

export function UserGrid() {
  const { data, isLoading } = useResourceList('users', { page: 1, pageSize: 10 });

  if (isLoading) return <div>読み込み中...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data?.data.map((user) => (
        <div key={user.id} className="p-4 bg-white border rounded shadow-sm">
          <div className="font-bold text-lg">{user.name}</div>
          <div className="text-slate-500 text-sm">{user.email}</div>
          <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-slate-100 rounded">{user.role}</span>
        </div>
      ))}
    </div>
  );
}
```

---

### アプローチ3. カスタムアクションの追加

リソース定義の `actions` 配列にアクションを指定することで、テーブルの行アクションとしてカスタム処理を登録できます。

```typescript
// admin.ts
export const users = defineResource({
  name: 'users',
  model: usersTable,
  table: {
    columns: [text('name'), badge('role')],
  },
  form: {
    fields: [input('name')],
  },
  actions: [
    {
      name: 'activate',
      label: '有効化する',
      handler: async (record) => {
        // バックエンドでのカスタムアクション処理
        await db.update(usersTable).set({ active: true }).where(eq(usersTable.id, record.id));
      },
    },
  ],
});
```

---

### アプローチ4. カスタムアップロードストレージの指定

デフォルトではファイル・画像アップロード（`fileUpload`）の送信先としてメモリ内 Base64 エンコーディング（データURI）が使用されますが、本番環境用に独自ストレージ（AWS S3 や Cloudflare R2 など）をマウントする場合、バックエンドの `createAdminApi` 側で `upload.handler` を渡してカスタマイズできます。

```typescript
// server.ts
import { createAdminApi } from '@cape/hono';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'ap-northeast-1' });

const app = createAdminApi({
  db: dbAdapter,
  resources: [productsResource],
  upload: {
    handler: async (file: File) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const key = `uploads/${Date.now()}-${file.name}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: 'my-bucket',
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );

      // 保存先の公開URLを返却します
      return `https://my-bucket.s3.ap-northeast-1.amazonaws.com/${key}`;
    },
  },
});
```
