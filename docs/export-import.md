# CSV エクスポート・インポートガイド

Cape の管理画面には、リソースデータを CSV ファイルとしてエクスポートしたり、CSV ファイルからデータを一括インポートする機能が組み込まれています。

---

## エクスポート

### UI から使う

リソース一覧の右上に表示される **「Export CSV」** ボタンをクリックすると、現在の検索条件・フィルターを引き継いだ全件を CSV ファイルとしてブラウザにダウンロードします。

### API エンドポイント

```
GET /admin/api/:resource/export
```

クエリパラメータは通常の一覧取得と同じ形式で指定できます：

```bash
# 全件エクスポート
curl http://localhost:3001/admin/api/users/export -o users.csv

# フィルター付きエクスポート
curl "http://localhost:3001/admin/api/users/export?search=alice&status=active" -o users.csv
```

**レスポンスヘッダー：**

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="users-2026-07-08.csv"
```

---

## インポート

### UI から使う

1. リソース一覧の **「Import」** ボタンをクリック
2. モーダルで `.csv` ファイルを選択
3. **「Import」** をクリックしてアップロード
4. 完了後、作成件数とエラー行のサマリーが表示されます

### API エンドポイント

```
POST /admin/api/:resource/import
Content-Type: multipart/form-data
```

```bash
curl -X POST http://localhost:3001/admin/api/users/import \
  -F "file=@users.csv;type=text/csv"
```

**レスポンス（成功）：**

```json
{
  "success": true,
  "created": 42,
  "skipped": 0,
  "errors": []
}
```

**レスポンス（行エラーあり）：**

```json
{
  "success": false,
  "created": 38,
  "skipped": 4,
  "errors": [
    { "row": 3, "field": "email", "message": "Invalid email" },
    { "row": 7, "field": "name", "message": "Required" }
  ]
}
```

---

## CSV ファイルのフォーマット

- **文字コード：** UTF-8
- **区切り文字：** カンマ（`,`）
- **1行目：** ヘッダー行（カラム名）が必須
- **引用符：** RFC 4180 準拠（カンマや改行を含むフィールドは自動引用符処理）

**サンプル：**

```csv
name,email,role
Alice,alice@example.com,admin
Bob,bob@example.com,member
```

---

## インポートの仕様と制限

| 項目               | 説明                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| **`id` カラム**    | 常に無視されます。すべての行が新規レコードとして作成されます                       |
| **未知のカラム**   | テーブル定義にないカラムは無視されます（セキュリティ上のホワイトリスト制御）       |
| **ファイルサイズ** | デフォルト最大 10MB（設定で変更可能）                                              |
| **行数上限**       | デフォルト最大 10,000 行（設定で変更可能）                                         |
| **バリデーション** | リソースに `writeValidationSchema`（Zod）が定義されている場合、各行に適用されます  |
| **ファイル形式**   | `.csv` 拡張子、または `text/csv` / `application/csv` MIME タイプのファイルのみ許可 |

---

## オプション設定

`createAdminApi` に `importExport` オプションを渡すことで上限値をカスタマイズできます：

```ts
import { createAdminApi } from '@fuyuan9/cape-hono';

const api = createAdminApi({
  db: adapter,
  resources: [...],
  importExport: {
    maxFileSizeMB: 25,    // ファイルサイズ上限を 25MB に変更（デフォルト: 10）
    maxRows: 50000,       // 行数上限を 50,000 行に変更（デフォルト: 10,000）
  },
});
```

---

## セキュリティについて

Cape のエクスポート・インポートには以下のセキュリティ対策が組み込まれています：

- **CSV Injection 対策：** エクスポート時、セル値の先頭が `=`, `+`, `-`, `@` などの数式実行文字の場合、シングルクォート (`'`) を自動プレフィックスします
- **カラムホワイトリスト：** インポート時、フォーム定義に存在しないカラムは無視されます
- **認可チェック：** エクスポートは `canList`、インポートは `canCreate` の権限チェックを実施します
- **ファイルサイズ制限：** 巨大ファイルによる DoS を防ぐため、サイズ・行数ともに上限を設けています
