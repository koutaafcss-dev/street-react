# VIALE - 街の声、地図に描く

VIALE（ヴァイアレ）は、街の「困ったこと」「役立つ情報」「イベント」を地図上に共有できるコミュニティプラットフォームです。

## 🚀 特徴

### 投稿機能
- **3種類の投稿タイプ**: 記録（日常の発見）、呼びかけ（問題提起）、イベント（日時付き情報）
- **複数地点投稿**: 1つの投稿に複数の場所を指定可能
- **AIモデレーション**: OpenAI GPT-4 Visionによるテキスト・画像検出
- **連続投稿制限**: 30秒以内に3件以上の投稿でフリーズ

### コミュニティ機能
- **リアクション**: いいね（✨）、助かった（🙏）、カスタム絵文字
- **コメント**: NGワードチェック付き
- **ブックマーク・ピン留め**: 重要な投稿を保存・強調表示

### セキュリティ・信頼性
- **電話番号認証**: SMS OTPによる本人確認
- **アカウント重複防止**: 同一電話番号からの複数アカウント検出
- **信頼スコアシステム**: 行動に基づく自動評価・停止
- **異議申し立て**: AI判定による公正な再審査

### 地図機能
- **MapLibre GL JS**: OpenStreetMapベースの高性能地図
- **3D建物表示**: OSMデータによる立体表現
- **軌跡表示**: GPS移動履歴の可視化
- **検索半径**: 円形表示による範囲指定

## 🛠️ 技術スタック

- **Frontend**: React 19 + Vite
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Maps**: MapLibre GL JS
- **AI**: OpenAI GPT-4 Vision API
- **Mobile**: Capacitor (iOS/Android対応)
- **Build**: Vite + ESLint

## 📦 インストール

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# コード品質チェック
npm run lint
```

## 🔧 環境設定

1. `.env.example` を `.env.local` にコピー
2. Firebase設定を入力
3. OpenAI APIキーはCloud Functionsで設定

```bash
# Firebase設定
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
# ...

# Cloud Functionsで設定
firebase functions:secrets:set OPENAI_API_KEY
```

## 🚀 デプロイ

### Firebase Blazeプラン必須
Cloud Functionsを使用するため、従量課金プランが必要です。

```bash
# Cloud Functionsデプロイ
npx firebase deploy --only functions

# 全デプロイ
npx firebase deploy
```

### Capacitor（モバイル）
```bash
# iOS
npx cap add ios
npx cap run ios

# Android
npx cap add android
npx cap run android
```

## 📊 システム要件

- **Node.js**: 18+
- **Firebase**: Blazeプラン
- **OpenAI**: APIキー
- **Capacitor**: iOS/Android SDK

## 📋 開発状況

### ✅ 実装完了
- 地図表示・投稿表示
- 投稿・リアクション・コメント
- 電話認証＆アカウント管理
- AIモデレーション（テキスト・画像）
- 信頼スコア＆自動停止
- 異議申し立てシステム

### 🔄 開発中
- AdminDashboard（UI調整中）
- 背景位置追跡（ネイティブ）
- イベント参加機能

### 📋 TODO
- ユーザーブロック機能
- ダイレクトメッセージング
- グループ機能
- 多言語対応

## 🤝 貢献

1. Fork
2. Feature branch作成
3. Commit
4. Push
5. Pull Request

## 📄 ライセンス

MIT License

## 📞 サポート

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Docs: [FEATURES.md](FEATURES.md), [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
