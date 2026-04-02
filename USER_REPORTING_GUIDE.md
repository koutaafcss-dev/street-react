# ユーザー報告 + AI モデレーション削除システム

## ✅ 実装内容

### **1. ユーザー報告機能**

**報告理由：**
- 🚨 **違法行為** - 最重大
- 😠 **ハラスメント** - 重大
- ⚠️ **誤情報・詐欺** - 重大
- 📧 **スパム** - 軽度
- ❓ **その他** - 軽度

**UI：** App.jsx にモーダル報告フォーム追加

**保存先：** `posts/{postId}/reports/{reportId}`

---

### **2. AI 分析 & 自動削除**

**プロセス：**

```
1時間ごと自動スキャン
    ↓
報告を条件チェック
 - 報告数 ≥ 5件
 - AI リスク度 ≥ 70%
 - 報告者信頼度平均 ≥ 60%
    ↓
条件満たしたら投稿削除
    ↓
投稿者に警告通知
```

**AI 判定スコア：**
- 誤情報：0-100
- 違法性：0-100
- ハラスメント：0-100
- スパム：0-100

---

### **3. 信頼度スコアシステム**

**報告者スコア計算：**
```
信頼度 = (正確な報告数 / 総報告数) × 100

例：
- 10 件報告 → 7 件削除 → 信頼度 70%
- 10 件報告 → 2 件削除 → 信頼度 20%
```

**用途：** 誤報告を減らし、確実な報告を優先

---

### **4. ファイル構成**

```
src/
  hooks/
    usePostReporting.js  ← 報告 Hook
    useAIModerator.js    ← AI モデレーション
  App.jsx               ← 報告フォーム UI

functions/
  moderateReports.js   ← Cloud Functions（自動削除）

firestore.rules        ← セキュリティルール

DEPLOYMENT_GUIDE.md    ← デプロイ手順
```

---

## 🚀 Cloud Functions デプロイ

### **Step 1：Firebase CLI セットアップ**

```bash
npm install -g firebase-tools
firebase login
cd functions
npm install
```

### **Step 2：環境変数設定**

```bash
firebase functions:config:set \
  openai.key="sk-your-api-key" \
  admin.token="your-secret-token"
```

### **Step 3：デプロイ**

```bash
firebase deploy --only functions:moderateReportsScheduled
```

### **Step 4：Cloud Scheduler 自動実行設定**

Firebase Console → Cloud Scheduler

```
名前: moderation-check
周期: 0 * * * * (毎時 0 分)
トピック: projects/YOUR_PROJECT_ID/topics/moderateReportsScheduled
```

---

## 💡 動作確認

### **ローカルテスト**

```bash
npm run dev
```

投稿画面で 🚨 報告ボタン → 報告フォームに入力

### **本番テスト（手動実行）**

```bash
curl -X POST "https://asia-southeast2-YOUR_PROJECT.cloudfunctions.net/moderateReportsOnDemand" \
  -H "x-auth-token: your-secret-token" \
  -H "Content-Type: application/json"
```

---

## 📊 運用ガイドライン

| 項目 | 基準 | 削除判定 |
|-----|------|--------|
| 最小報告数 | 5 件以上 | ✓ |
| AI リスク度 | 70% 以上 | ✓ |
| 報告者信頼度 | 60% 以上 | ✓ |
| 投稿者への警告 | 削除時に送信 | ✓ |

---

## ⚠️ 注意点

1. **API キー管理**
   - OpenAI キーを環境変数で .env に保存
   - Git にコミットしない（.gitignore で除外）

2. **コスト最適化**
   - クライアント側は Moderation API のみ使用
   - 詳細判定は Cloud Functions（サーバー側）で実行
   - 1 時間ごとのスケジュール実行で効率化

3. **誤判定対策**
   - 複数条件の AND 判定で誤削除を最小化
   - 管理者向けダッシュボードで確認推奨
   - 信頼度スコアが低いユーザーの報告は軽視

---

## 🔒 セキュリティ

- Firestore ルールで報告データ保護
- 管理者認証トークンでアクセス制限
- 報告者本人のみ自分の報告を閲覧可能

---

## 📈 拡張可能性

将来的には以下を追加可能：

- [ ] 管理者ダッシュボード（報告一覧確認）
- [ ] 投稿者への異議申し立て機能
- [ ] 自動削除後の復元プロセス
- [ ] ユーザーレピュテーションシステム
- [ ] 機械学習モデルによる学習

