# チェックインデータ取得API 使用方法

## 概要
期間を指定してチェックインデータを取得するためのCloud Functions APIです。

## セットアップ

### 1. APIトークンの設定
まず、Firebase FunctionsでAPIトークンを設定します：

```bash
firebase functions:config:set api.token="your-secret-api-key-here"
```

例：
```bash
firebase functions:config:set api.token="checkin-api-2024-secure-token"
```

### 2. Functionsのデプロイ
```bash
npm run deploy
```

### 3. IAM権限の設定
認証を追加したので、一般公開の権限は必要ありません。以下のコマンドで公開アクセスを削除できます：

```bash
gcloud functions remove-iam-policy-binding getCheckinsForPeriodApi \
  --region=asia-northeast1 \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker"
```

## エンドポイント

### REST API
```
GET https://asia-northeast1-bullshit-checkin.cloudfunctions.net/getCheckinsForPeriodApi
```

### パラメータ
- `startDate` (必須): 開始日 (YYYY-MM-DD形式)
- `endDate` (必須): 終了日 (YYYY-MM-DD形式)
- `apiKey` (必須): APIキー（URLパラメータまたはヘッダー）

### 認証方法
以下の2つの方法でAPIキーを送信できます：

#### 方法1: URLパラメータ
```bash
curl "https://asia-northeast1-bullshit-checkin.cloudfunctions.net/getCheckinsForPeriodApi?startDate=2024-01-01&endDate=2024-01-31&apiKey=your-secret-api-key"
```

#### 方法2: HTTPヘッダー（推奨）
```bash
curl -H "X-API-Key: your-secret-api-key" \
  "https://asia-northeast1-bullshit-checkin.cloudfunctions.net/getCheckinsForPeriodApi?startDate=2024-01-01&endDate=2024-01-31"
```

### JavaScriptでの使用例
```javascript
const response = await fetch(
  'https://asia-northeast1-bullshit-checkin.cloudfunctions.net/getCheckinsForPeriodApi?startDate=2024-01-01&endDate=2024-01-31',
  {
    headers: {
      'X-API-Key': 'your-secret-api-key'
    }
  }
);
const data = await response.json();
```

### レスポンス形式
```json
{
  "checkins": [
    {
      "id": "checkin_id",
      "clientCheckInTime": "2024-01-15T10:00:00.000Z",
      "room": "room1",
      "purpose": "meeting",
      "count": 3,
      "startTime": "10:00",
      "endTime": "15:00",
      "ageGroup": "30代",
      "parking": true,
      "reservationId": "reservation_id",
      "checkInDate": "2024-01-15",
      "checkInTime": "10:00"
    }
  ],
  "stats": {
    "totalCheckins": 10,
    "totalPeople": 25,
    "byRoom": {
      "room1": 5,
      "large6": 3,
      "private4": 2
    },
    "byPurpose": {
      "meeting": 4,
      "study": 3,
      "remote": 3
    }
  },
  "logs": ["ログメッセージ"]
}
```

## 部屋IDマッピング
- `room1`: 1番
- `private4`: 4番個室
- `large4`: 4番大部屋
- `large6`: 6番大部屋
- `workshop6`: 6番工作室
- `tour`: 見学

## 利用目的マッピング
- `meeting`: 会議・打合せ
- `remote`: 仕事・テレワーク利用
- `study`: 学習利用
- `event`: イベント・講座
- `creation`: デジタル制作
- `tour`: 視察・見学・取材
- `other`: その他

## CORS対応
このAPIはCORS対応済みで、ブラウザから直接呼び出すことができます。

## エラーレスポンス

### 認証エラー（401）
```json
{
  "error": "認証が必要です。有効なAPIキーを提供してください。",
  "logs": ["ログメッセージ"]
}
```

### 設定エラー（500）
```json
{
  "error": "APIトークンが設定されていません。管理者に連絡してください。",
  "logs": ["ログメッセージ"]
}
```

### その他のエラー
```json
{
  "error": "エラーメッセージ",
  "errorDetails": "詳細なエラー情報",
  "logs": ["ログメッセージ"]
}
```

## セキュリティ注意事項
- APIキーは機密情報です。ソースコードにコミットしないでください
- HTTPSでのみアクセスしてください
- 定期的にAPIキーを変更することを推奨します
- 不要になったAPIキーは削除してください