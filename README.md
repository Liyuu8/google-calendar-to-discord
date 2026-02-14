# google-calendar-to-discord

Google カレンダーの予定を Discord へ通知する Firebase Functions の実装です。

実行ランタイムは Node.js 22 を想定しています。

## 仕組み

- Cloud Scheduler (Functions v2 `onSchedule`) が5分ごとに実行
- 「現在時刻から5分以内」に開始する Google カレンダー予定を取得
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
```


6. デプロイ

```bash
firebase deploy --only functions
```

## GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN の取得方法

### 1. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET

1. Google Cloud Console で対象プロジェクトを開く
2. `API とサービス` → `ライブラリ` で `Google Calendar API` を有効化
3. `API とサービス` → `OAuth 同意画面` を設定
4. `API とサービス` → `認証情報` → `認証情報を作成` → `OAuth クライアント ID`
5. 作成後に表示される `クライアント ID` と `クライアント シークレット` を控える

### 2. GOOGLE_REFRESH_TOKEN

1. OAuth Playground: <https://developers.google.com/oauthplayground> を開く
2. 右上の設定で `Use your own OAuth credentials` を ON
3. 上で作成した `Client ID` / `Client secret` を入力
4. スコープに `https://www.googleapis.com/auth/calendar.readonly` を指定して認可
5. `Exchange authorization code for tokens` を実行
6. レスポンスの `refresh_token` を `GOOGLE_REFRESH_TOKEN` として使う

補足:
- OAuth クライアントのリダイレクト URI に `https://developers.google.com/oauthplayground` を追加してください。
- OAuth 同意画面がテスト中の場合、使用する Google アカウントを `テストユーザー` に追加してください。

## サービスアカウントを使用しない理由

- この実装は個人の Google カレンダー（`primary`）を対象にするため、OAuth ユーザー認可が最もシンプルです。
- サービスアカウントは個人 `primary` カレンダーへ直接アクセスできないため、カレンダー共有や追加設定が必要になります。
- Google Workspace 環境でドメイン全体委任を行う運用でない限り、OAuth + refresh token のほうが構築と運用が簡単です。

## 実装ファイル

- `functions/src/index.ts`: 通知ロジック本体
- `functions/tsconfig.json`: TypeScript 設定
- `firebase.json`: Functions 設定
