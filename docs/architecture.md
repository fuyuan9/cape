# アーキテクチャ設計書 (Architecture Design)

Cape Framework は、強固な型安全性を持ち、疎結合でメンテナンスしやすいよう設計されたマルチパッケージモノレポ構成を採用しています。

## レイヤー構成と依存関係

各パッケージ間の依存関係は以下のように一方向に限定されており、循環参照は一切存在しません。

```
core
  ├── 共通メタデータスキーマ定義
  └── データベースアダプター抽象層
       │
       ├─────────────────────┐
       ▼                     ▼
     hono                  react
Hono エンドポイント層   TanStack Query データ層
       │                     │
       │                     ▼
       │                  shadcn
       │               UI レンダリング層
       │                     │
       └──────────┬──────────┘
                  ▼
               examples
            基本・実践サンプル
```

---

## 主要設計原則

### 1. イミュータブル（不変）ビルダー

カラム定義（`ColumnBuilder`）およびフィールド定義（`FieldBuilder`）はイミュータブルに設計されています。

```ts
// 内部状態は破壊的に変更されず、常に新しいビルダーインスタンスが生成されます。
const nameField = input('name');
const requiredNameField = nameField.required(); // nameField 自体は変更されません
```

これにより、リソース定義の再利用時や並列参照時の副作用を完全に排除します。

### 2. メタデータ駆動 (Metadata-Driven)

React フロントエンドは、データベースや ORM の詳細を一切関知しません。
バックエンドから取得するシリアライズされたメタデータ（`form.fields`, `table.columns`等）に基づいて、動的なテーブル構造、フォームバリデーション（Zodスキーマのクライアント側動的生成）、および詳細表示カードを構築します。
これにより、フロントエンドとバックエンドの関心事が完全に分離されます。

### 3. DbAdapter 抽象化による ORM 中立性

データベース操作はすべて `DbAdapter` インターフェース経由で行われます。

```ts
export interface DbAdapter {
  list(resource: ResourceMetadata, params: ListParams): Promise<PaginatedResult>;
  create(resource: ResourceMetadata, data: any): Promise<any>;
  read(resource: ResourceMetadata, id: any): Promise<any>;
  update(resource: ResourceMetadata, id: any, data: any): Promise<any>;
  delete(resource: ResourceMetadata, id: any): Promise<void>;
  bulkDelete(resource: ResourceMetadata, ids: any[]): Promise<void>;
}
```

初期状態では Drizzle ORM に対応した `DrizzleAdapter` が提供されていますが、将来的に Prisma などの異なる ORM サポートを追加する際も、コア API やフロントエンド実装を変更する必要はありません。

### 4. 拡張性 (Extension Points)

- **認可 (Authorization)**: 各アクションの実行前に、Hono Context を引き渡す認可関数（`canList`, `canCreate`等）をフックし、検証します。
- **フック (Hooks)**: `beforeCreate`/`afterCreate` などのライフサイクルフックを利用し、データの挿入や更新の直前にハッシュ化や付随する業務ロジックを実行可能です。
