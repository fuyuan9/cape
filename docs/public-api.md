# パブリック API 仕様書 (Public API Specification)

## コアモジュール (`@cape/core`)

### 1. リソース定義

#### `defineResource<TModel, TRecord, TContext>(config: ResourceConfig): Resource`

リソースを構築し、型定義スキーマやバリデーション情報を格納するメタデータを生成します。

```typescript
interface ResourceConfig {
  name: string; // リソースの一意の名前（URLパスに利用）
  label?: string; // UI上に表示される文言 (省略時は自動キャピタライズ)
  model: any; // Drizzleテーブル定義など
  primaryKey?: string; // 主キーのカラム名 (デフォルト: 'id')
  table: {
    columns: ColumnBuilder[]; // 表示カラムの配列
  };
  form: {
    fields: FieldBuilder[]; // 編集用フォームフィールド of 配列
  };
  actions?: ActionMetadata[]; // カスタムアクション定義
  authorization?: ResourceAuthorization;
  hooks?: ResourceHooks;
}
```

### 2. テーブルカラムビルダー (`@cape/core/builders/columns`)

テーブルでの表示形式を指定するためのヘルパーです。すべてイミュータブルで、チェイニングに対応しています。

- `text(name: string)`: 通常テキストカラム。
- `email(name: string)`: メールアドレスカラム。メールへのリンクが自動設定されます。
- `badge(name: string)`: バッジスタイルで表示する区分用カラム。
- `datetime(name: string)`: 日時カラム。ローカライズ表示されます。
- `image(name: string)`: 画像カラム。一覧上でアバター/サムネイルとして画像プレビューが表示されます。

**チェイニングメソッド:**

- `.sortable()`: カラムによるソート（昇順・降順）を有効化。
- `.searchable()`: このカラムでのフリーワード検索を有効化。

---

### 3. フォームフィールドビルダー (`@cape/core/builders/fields`)

新規作成・編集用フォームの入力UIを指定します。チェイニング対応のイミュータブル設計です。

- `input(name: string)`: 汎用テキスト入力。
  - `.email()`: メールアドレス形式検証を追加。
- `numberField(name: string)`: 数値入力。
- `textareaField(name: string)`: 複数行テキスト入力。
- `booleanField(name: string)`: チェックボックスによる真偽値入力。
- `select(name: string, config: { options: string[] })`: プルダウン選択。
- `dateField(name: string)`: 日付選択。
- `datetimeField(name: string)`: 日時選択。
- `badgeField(name: string)`: バッジ用入力フィールド。
- `relationField(name: string, config: { model: any })`: 関連レコードの連携フィールド。
- `fileUpload(name: string)`: ファイル・画像アップロード入力フィールド。進捗インジケータ、プレビュー、クリアボタンが自動で表示されます。

**チェイニングメソッド:**

- `.required()`: 必須入力に設定。
- `.readonly()`: 読み取り専用に設定。
- `.disabled()`: 非活性（Disabled）状態に設定。
- `.description(text: string)`: フィールドのヘルプテキストを追加。
- `.label(text: string)`: 画面表示ラベルを任意設定。
- `.defaultValue(val: any)`: デフォルト値を設定。
- `.unique()`: ユニーク制約を設定。新規作成・更新時にデータベース内に既に同じ値が存在するか自動でバリデーションし、重複時はフォーム上にエラーメッセージを表示します。

---

## バックエンド API 統合 (`@cape/hono`)

#### `createAdminApi(options: { db: DbAdapter, resources: Resource[] })`

Hono アプリにマウント可能な API ルーターを作成します。以下のエンドポイントが自動的に有効になります。

- `GET /metadata`: シリアライズされた管理画面全体のメタデータを返却します。
- `GET /:resourceName`: 検索、ソート、フィルタリングが可能なレコード一覧を取得します。
- `GET /:resourceName/:id`: 単一レコードの詳細を取得します。
- `POST /:resourceName`: 新規レコードを作成します（Zodバリデーション実行）。
- `PUT /:resourceName/:id`: レコードを更新します。
- `DELETE /:resourceName/:id`: レコードを削除します。
- `POST /:resourceName/bulk-delete`: 選択された複数レコードを一括削除します。

---

## フロントエンド層 (`@cape/react` & `@cape/shadcn`)

### 1. `AdminProvider` (`@cape/react`)

React アプリのルート部分で、API 接続先などを指定します。

```tsx
<AdminProvider apiUri="https://api.example.com/admin">{children}</AdminProvider>
```

### 2. `ResourcePage` (`@cape/shadcn`)

マウントするだけで、サイドバーナビゲーションとCRUD機能を持ったフルスクリーンアドミンコンソールを表示します。
内部的には `@cape/react` のデータ取得 Hooks を呼び出しており、ビジネスロジックはコンポーネント外部に保たれています。

---

## リソースのネスト (Sub-resources / Relation Managers)

親子関係を持つリソース（例：注文 `orders` とその中の注文商品 `order-items`）を定義し、親リソースの詳細表示画面内で子リソースのCRUD管理（Relation Manager）を行うことができます。

### 1. リソース定義での親子関係の設定

子リソース（Sub-resource）の `defineResource` に `parent` と `foreignKey` を指定します。

```typescript
// 子リソース（order-items）の定義
export const orderItemsResource = defineResource({
  name: 'order-items',
  label: 'Items',
  parent: 'orders', // 親リソースの 'name' を指定
  foreignKey: 'orderId', // 親レコードのIDが入る外部キーのカラム名
  model: orderItemsTable,
  // ... table / form の設定
});
```

### 2. ルーティングの自動構成

`parent` が設定されているリソースは、以下のネストされたAPIエンドポイントが自動でマウントされます。

- `GET /admin/api/:parentName/:parentId/:childName` - 特定の親レコードに紐づく子レコード一覧の取得
- `POST /admin/api/:parentName/:parentId/:childName` - 特定の親レコードに紐づく子レコードの作成（`foreignKey` に `parentId` の値が自動インジェクションされます）
- `PUT /admin/api/:parentName/:parentId/:childName/:id` - 子レコードの更新
- `DELETE /admin/api/:parentName/:parentId/:childName/:id` - 子レコードの削除

### 3. UIの自動連携

- **詳細画面 (ResourceShow)**: 親レコードの「Show」画面を開くと、子リソースのCRUDテーブルが画面下部に自動的にマウントされ、モーダル経由でその場から追加や編集が可能です。
- **ナビゲーション (ResourcePage)**: 親子関係の子リソースは、サイドバーのナビゲーションメニューから自動的に非表示になり、アドミンコンソールの構成が整理されます。
