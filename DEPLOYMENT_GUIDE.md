# Cloud Functions デプロイガイド

## Step 1：functions ディレクトリのセットアップ

```bash
# Firebase CLI をインストール
npm install -g firebase-tools

# Firebase プロジェクトにログイン
firebase login

# functions ディレクトリ初期化
cd functions
npm install
```

## Step 2：環境変数設定

```bash
# .env.local を函数に渡す
firebase functions:config:set openai.key="sk-..." admin.token="your-secret-token"

# 確認
firebase functions:config:get
```

## Step 3：デプロイ

```bash
# 特定の関数だけデプロイ
firebase deploy --only functions:moderateReportsScheduled

# すべての関数デプロイ
firebase deploy --only functions
```

## Step 4：Cloud Scheduler 設定（自動実行）

```bash
# Cloud Scheduler で以下の設定
- 実行周期：every 1 hours （Pub/Sub）
- トピック：projects/YOUR_PROJECT_ID/topics/moderateReportsScheduled
```

## 手動実行（テスト用）

```bash
curl -X POST "https://asia-southeast2-YOUR_PROJECT_ID.cloudfunctions.net/moderateReportsOnDemand" \
  -H "x-auth-token: your-secret-token" \
  -H "Content-Type: application/json"
```

---

## 💰 推定コスト

| API | 费用 | 例 |
|-----|------|-----|
| OpenAI Moderation | $0.0001 / 1K reqs | 1000投稿 = 十数円 |
| Cloud Functions | $0.40 / 百万呼び出し | 月 1,000 回 = ~1円 |
| Firestore 読み取り | $0.06 / 百万ドキュ | 月 1000 投稿分析 = 数円 |

**合計：月 100 円未満**（想定ユーザー 1000 人）
