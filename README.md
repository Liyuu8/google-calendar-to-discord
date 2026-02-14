# google-calendar-to-discord

Google カレンダーの予定開始 1 分前に Discord へ通知する Firebase Functions 実装です。

実行ランタイムは Node.js 22 を想定しています。

## 仕組み

- Cloud Scheduler (Functions v2 `onSchedule`) が毎分実行
- 「現在時刻 +1 分」の前後 30 秒に開始する Google カレンダー予定を取得
- Discord Webhook にメッセージ投稿

## セットアップ

1. Firebase プロジェクトを作成して、このディレクトリで初期化
2. `functions` ディレクトリで依存をインストール

```bash
cd functions
npm install
```

3. Google Calendar API を有効化し、OAuth クライアントを作成
4. オフラインアクセス可能な `refresh_token` を取得
5. Functions のパラメータ/シークレットを設定

```bash
firebase functions:secrets:set GOOGLE_CLIENT_ID
firebase functions:secrets:set GOOGLE_CLIENT_SECRET
firebase functions:secrets:set GOOGLE_REFRESH_TOKEN
firebase functions:secrets:set DISCORD_WEBHOOK_URL
firebase functions:params:set GOOGLE_CALENDAR_ID="primary"
```

`GOOGLE_CALENDAR_ID` は対象のカレンダー ID に変更できます。

6. デプロイ

```bash
firebase deploy --only functions
```

## 実装ファイル

- `functions/src/index.ts`: 通知ロジック本体
- `functions/tsconfig.json`: TypeScript 設定
- `firebase.json`: Functions 設定
