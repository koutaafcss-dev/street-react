/**
 * functions/moderateReports.js
 * 
 * Cloud Functions 処理：
 * 1. 報告を分析（OpenAI API）
 * 2. ユーザー信頼度スコア計算（誤報告ペナルティ追加）
 * 3. 投稿削除判定
 * 4. 自動削除実行
 * 5. アカウント停止判定
 * 6. 異議申し立ての AI 判定
 * 
 * デプロイ方法：
 * firebase deploy --only functions:moderateReports
 */

// 誤報告ペナルティ設定
const MISREPORT_PENALTY = {
  // 報告が誤りだった場合のスコア減点
  scoreReduction: 10, // 信頼度スコアから 10 点減点
  
  // アカウント停止基準
  accountSuspensionThreshold: 20, // 信頼度スコアが 20 以下で停止
  
  // 異議申し立て成功時のボーナス
  appealBonus: 5, // 異議申し立て成功で +5 点
};

// 異議申し立て判定の AI プロンプト（倫理的考慮を強化）
const APPEAL_ANALYSIS_PROMPT = `
あなたは公正で倫理的なコンテンツモデレーターです。以下の原則に基づいて判断してください：

【倫理的原則】
1. 表現の自由を尊重し、過度な検閲を避ける
2. 誤った報告による不正な削除を防ぐ
3. ユーザーの権利を保護する
4. コミュニティの安全を優先する
5. 疑わしい場合はユーザーに有利に判断する

【判断基準】
- 投稿内容が本当に違法または有害か？
- 報告理由が妥当か？
- 異議申し立ての内容に合理性があるか？
- 全体として投稿を維持すべきか？

投稿内容：
"{postText}"

元の報告理由：
{reportReasons}

異議申し立ての内容：
"{appealText}"

以下の観点から異議申し立ての正当性を評価してください：
1. 投稿内容に重大な問題があるか（0-100）：違法性・有害性・攻撃性を評価
2. 報告が明らかに誤りだった可能性（0-100）：報告理由の妥当性を評価
3. 異議申し立ての合理性（0-100）：主張の論理性を評価
4. 表現の自由への配慮（0-100）：検閲の是非を評価

JSON形式で返してください：
{
  "contentSeverity": 0-100,
  "reportAccuracy": 0-100,
  "appealReasonableness": 0-100,
  "freeSpeechConsideration": 0-100,
  "recommendation": "restore" | "keep_deleted" | "escalate_to_admin",
  "reason": "判定理由（日本語・倫理的考慮を明記）",
  "confidence": 0-100
}
}
`;

/**
 * 異議申し立てを AI で分析
 */
async function analyzeAppealWithAI(postText, reportReasons, appealText) {
  const prompt = APPEAL_ANALYSIS_PROMPT
    .replace("{postText}", postText)
    .replace("{reportReasons}", reportReasons.join(", "))
    .replace("{appealText}", appealText);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an ethical content moderator focused on fairness, free speech, and user rights. Respond ONLY with valid JSON. Consider ethical implications carefully.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // より決定論的に
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    const result = JSON.parse(content);

    // 倫理的考慮に基づく最終判定
    let finalRecommendation = result.recommendation;
    
    // 表現の自由への配慮が強く、コンテンツの重大性が低い場合は復元を優先
    if (result.freeSpeechConsideration > 70 && result.contentSeverity < 30) {
      finalRecommendation = "restore";
    }
    
    // 報告の正確性が低く、異議申し立てが合理的な場合は復元
    if (result.reportAccuracy < 30 && result.appealReasonableness > 60) {
      finalRecommendation = "restore";
    }

    return {
      ...result,
      recommendation: finalRecommendation,
      ethicalConsiderations: {
        freeSpeech: result.freeSpeechConsideration,
        userRights: result.appealReasonableness,
        communitySafety: result.contentSeverity,
      },
    };
  } catch (err) {
    console.error("Appeal analysis error:", err);
    return {
      contentSeverity: 50,
      reportAccuracy: 50,
      appealReasonableness: 50,
      freeSpeechConsideration: 50,
      recommendation: "escalate_to_admin",
      reason: "AI分析失敗 - 管理者判断を推奨",
      confidence: 0,
      ethicalConsiderations: {
        freeSpeech: 50,
        userRights: 50,
        communitySafety: 50,
      },
    };
  }
}

/**
 * 誤報告ペナルティを適用
 */
async function applyMisreportPenalty(reporterId, postId) {
  try {
    const userRef = db.collection("users").doc(reporterId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const currentScore = userData.trustScore || 50;
    
    // 信頼度スコアを減点
    const newScore = Math.max(0, currentScore - MISREPORT_PENALTY.scoreReduction);
    
    // アカウント停止判定
    const shouldSuspend = newScore <= MISREPORT_PENALTY.accountSuspensionThreshold;
    
    const updateData = {
      trustScore: newScore,
      misreports: admin.firestore.FieldValue.increment(1),
      lastMisreportAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    if (shouldSuspend) {
      updateData.suspended = true;
      updateData.suspendedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.suspensionReason = "信頼度スコアが極端に低いため";
    }
    
    await userRef.update(updateData);
    
    // 誤報告ログを記録
    await db.collection("misreport_logs").add({
      reporterId,
      postId,
      oldScore: currentScore,
      newScore,
      penalty: MISREPORT_PENALTY.scoreReduction,
      suspended: shouldSuspend,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`Applied misreport penalty to user ${reporterId}: ${currentScore} → ${newScore}`);
    
    return { newScore, suspended: shouldSuspend };
  } catch (err) {
    console.error("Error applying misreport penalty:", err);
    throw err;
  }
}

/**
 * 異議申し立て成功時のボーナス適用
 */
async function applyAppealBonus(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const currentScore = userData.trustScore || 50;
    
    // 信頼度スコアをボーナス加点
    const newScore = Math.min(100, currentScore + MISREPORT_PENALTY.appealBonus);
    
    await userRef.update({
      trustScore: newScore,
      successfulAppeals: admin.firestore.FieldValue.increment(1),
      lastAppealBonusAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`Applied appeal bonus to user ${userId}: ${currentScore} → ${newScore}`);
    
    return newScore;
  } catch (err) {
    console.error("Error applying appeal bonus:", err);
    throw err;
  }
}

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";

const db = admin.firestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 報告の重大度レベル
const REPORT_SEVERITY = {
  misleading: 1.0,  // 誤情報・詐欺（重大）
  spam: 0.4,        // スパム（軽度）
  harassment: 1.5,  // ハラスメント（最重大）
  illegal: 2.0,     // 違法行為（最重大）
  other: 0.5,
};

// 削除判定のしきい値
const DELETION_THRESHOLD = {
  reportCount: 5,           // 最低 5 件の報告
  aiRiskScore: 0.7,        // AI リスク度 70% 以上
  avgUserTrustScore: 0.6,  // 報告者の平均信頼度 60% 以上
};

/**
 * 報告内容を AI が分析
 */
async function analyzeReportWithAI(postText, reports) {
  const reportSummary = reports
    .map(
      (r) =>
        `- ${r.reason}: ${r.description}`
    )
    .join("\n");

  const prompt = `
投稿内容：
"${postText}"

ユーザー報告（${reports.length}件）：
${reportSummary}

以下の観点から投稿の信頼性を評価してください：
1. 誤情報・詐欺の可能性（0-100）
2. 違法性（0-100）
3. ハラスメント（0-100）
4. スパム（0-100）

JSON形式で返してください：
{
  "misleadingScore": 0-100,
  "illegalScore": 0-100,
  "harassmentScore": 0-100,
  "spamScore": 0-100,
  "recommendation": "keep" | "flag" | "delete",
  "reason": "判定理由（日本語）"
}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a content moderation analyzer. Respond ONLY with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (err) {
    console.error("AI analysis error:", err);
    return {
      misleadingScore: 0,
      illegalScore: 0,
      harassmentScore: 0,
      spamScore: 0,
      recommendation: "keep",
      reason: "AI分析失敗 - デフォルト判定",
    };
  }
}

/**
 * ユーザー信頼度スコア計算
 */
async function calculateReporterTrustScore(userId) {
  try {
    const reportsSnapshot = await db
      .collectionGroup("reports")
      .where("reportedBy", "==", userId)
      .get();

    if (reportsSnapshot.size === 0) return 50; // デフォルト

    let correctCount = 0;
    let totalCount = reportsSnapshot.size;

    for (const doc of reportsSnapshot.docs) {
      const data = doc.data();
      // 投稿が削除されたら「正確な報告」とカウント
      if (data.status === "resolved" && data.postDeleted === true) {
        correctCount++;
      }
    }

    const trustScore = Math.round((correctCount / totalCount) * 100);
    return Math.max(0, Math.min(100, trustScore));
  } catch (err) {
    console.error("Error calculating trust score:", err);
    return 50;
  }
}

/**
 * Cloud Function: 定期的に報告をチェック & 削除判定
 * Cloud Scheduler から 1 時間ごとにトリガー
 */
export const moderateReportsScheduled = functions
  .region("asia-southeast2")
  .pubsub.schedule("every 1 hours")
  .onRun(async (context) => {
    console.log("Starting report moderation check...");

    try {
      // ステータス "pending" の報告をすべて取得
      const postsSnapshot = await db.collection("posts").get();
      let totalProcessed = 0;
      let totalDeleted = 0;

      for (const postDoc of postsSnapshot.docs) {
        const postId = postDoc.id;
        const postData = postDoc.data();
        const postText = postData.text || "";

        // この投稿への報告を取得
        const reportsSnapshot = await db
          .collection("posts")
          .doc(postId)
          .collection("reports")
          .where("status", "==", "pending")
          .get();

        if (reportsSnapshot.size < DELETION_THRESHOLD.reportCount) {
          continue; // 報告が少なすぎるのでスキップ
        }

        totalProcessed++;

        // 報告者の信頼度スコアを計算
        const reporterTrustScores = await Promise.all(
          reportsSnapshot.docs.map((doc) =>
            calculateReporterTrustScore(doc.data().reportedBy)
          )
        );

        const avgTrustScore =
          reporterTrustScores.reduce((a, b) => a + b, 0) /
          reporterTrustScores.length;

        // AI 分析実行
        const aiAnalysis = await analyzeReportWithAI(
          postText,
          reportsSnapshot.docs.map((d) => d.data())
        );

        // リスク度 = 各スコアの最大値の加重平均
        const riskScore = Math.max(
          aiAnalysis.misleadingScore * 0.4,
          aiAnalysis.illegalScore * 0.5,
          aiAnalysis.harassmentScore * 0.3,
          aiAnalysis.spamScore * 0.2
        ) / 100;

        console.log(`Post ${postId}:`, {
          reportCount: reportsSnapshot.size,
          avgTrustScore,
          riskScore,
          recommendation: aiAnalysis.recommendation,
        });

        // 削除判定
        const shouldDelete =
          reportsSnapshot.size >= DELETION_THRESHOLD.reportCount &&
          riskScore >= DELETION_THRESHOLD.aiRiskScore &&
          avgTrustScore >= DELETION_THRESHOLD.avgUserTrustScore;

        if (shouldDelete || aiAnalysis.recommendation === "delete") {
          // 投稿削除
          await db.collection("posts").doc(postId).update({
            hidden: true,
            deletionReason: "多数の報告により削除されました",
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            aiRecommendation: aiAnalysis.recommendation,
          });

          // 報告ステータス更新
          for (const reportDoc of reportsSnapshot.docs) {
            await reportDoc.ref.update({
              status: "resolved",
              postDeleted: true,
              aiAnalysis: aiAnalysis,
              trustScore: reporterTrustScores[
                reportsSnapshot.docs.indexOf(reportDoc)
              ],
            });
          }

          // 投稿者に警告メッセージを送信
          await sendWarningToUser(postData.userId, postId, aiAnalysis);

          totalDeleted++;
          console.log(`Deleted post: ${postId}`);
        } else {
          // 報告ステータスを "investigating" に更新
          for (let i = 0; i < reportsSnapshot.docs.length; i++) {
            await reportsSnapshot.docs[i].ref.update({
              status: "investigating",
              aiAnalysis: aiAnalysis,
              trustScore: reporterTrustScores[i],
            });
          }
        }
      }

      console.log(
        `Moderation complete: ${totalProcessed} posts processed, ${totalDeleted} posts deleted`
      );
      return {
        processed: totalProcessed,
        deleted: totalDeleted,
      };
    } catch (err) {
      console.error("Moderation error:", err);
      throw err;
    }
  });

/**
 * Cloud Function: 異議申し立てを処理
 */
export const processAppeal = functions
  .region("asia-southeast2")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "認証が必要です");
    }

    const { postId, appealText } = data;
    const userId = context.auth.uid;

    if (!postId || !appealText?.trim()) {
      throw new functions.https.HttpsError("invalid-argument", "投稿IDと異議申し立て内容が必要です");
    }

    try {
      // 投稿が存在するか確認
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();

      if (!postDoc.exists) {
        throw new functions.https.HttpsError("not-found", "投稿が見つかりません");
      }

      const postData = postDoc.data();

      // 投稿が削除されているか確認
      if (!postData.hidden) {
        throw new functions.https.HttpsError("failed-precondition", "この投稿は削除されていません");
      }

      // 投稿者が本人か確認
      if (postData.userId !== userId) {
        throw new functions.https.HttpsError("permission-denied", "自分の投稿に対してのみ異議申し立て可能です");
      }

      // 既に異議申し立て済みか確認
      const existingAppealQuery = db.collection("appeals").where("postId", "==", postId);
      const existingAppeals = await existingAppealQuery.get();

      if (!existingAppeals.empty) {
        throw new functions.https.HttpsError("already-exists", "この投稿に対する異議申し立ては既に存在します");
      }

      // 報告内容を取得
      const reportsSnapshot = await db.collection("posts").doc(postId).collection("reports").get();
      const reportReasons = reportsSnapshot.docs.map(doc => doc.data().reason);

      // AI で異議申し立てを分析
      const aiAnalysis = await analyzeAppealWithAI(postData.text, reportReasons, appealText);

      // 異議申し立てを記録（管理者審査待ち）
      const appealRef = await db.collection("appeals").add({
        postId,
        userId,
        appealText: appealText.trim(),
        reportReasons,
        aiAnalysis,
        status: "pending", // 常に管理者審査待ち
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Appeal submitted for post ${postId}, waiting for admin review`);

      return {
        appealId: appealRef.id,
        status: "pending",
        aiRecommendation: aiAnalysis.recommendation,
        reason: aiAnalysis.reason,
        message: "異議申し立てが提出されました。管理者による審査をお待ちください。",
      };
    } catch (err) {
      console.error("Appeal processing error:", err);
      throw err;
    }
  });

/**
 * Cloud Function: 管理者による異議申し立て処理
 */
export const processAppealByAdmin = functions
  .region("asia-southeast2")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "認証が必要です");
    }

    // TODO: 管理者権限チェックを追加
    // const isAdmin = await checkAdminRole(context.auth.uid);
    // if (!isAdmin) {
    //   throw new functions.https.HttpsError("permission-denied", "管理者権限が必要です");
    // }

    const { appealId, action, adminNote } = data; // action: "approve" | "deny" | "escalate"

    if (!appealId || !action) {
      throw new functions.https.HttpsError("invalid-argument", "異議申し立てIDとアクションが必要です");
    }

    try {
      const appealRef = db.collection("appeals").doc(appealId);
      const appealDoc = await appealRef.get();

      if (!appealDoc.exists) {
        throw new functions.https.HttpsError("not-found", "異議申し立てが見つかりません");
      }

      const appeal = appealDoc.data();

      if (appeal.status !== "pending") {
        throw new functions.https.HttpsError("failed-precondition", "この異議申し立ては既に処理されています");
      }

      const postRef = db.collection("posts").doc(appeal.postId);
      const postDoc = await postRef.get();
      const post = postDoc.data();

      let newStatus;
      let updateData = {
        status: action,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        processedBy: context.auth.uid,
        adminNote: adminNote || null,
      };

      if (action === "approve") {
        newStatus = "approved";
        // 投稿を復元
        await postRef.update({
          hidden: false,
          appealRestored: true,
          restoredAt: admin.firestore.FieldValue.serverTimestamp(),
          restorationReason: `管理者承認: ${adminNote || "異議申し立てが正当と判断"}`,
        });

        // 報告者に誤報告ペナルティを適用
        const reportsSnapshot = await db.collection("posts").doc(appeal.postId).collection("reports").get();
        for (const reportDoc of reportsSnapshot.docs) {
          await applyMisreportPenalty(reportDoc.data().reportedBy, appeal.postId);
        }

        // 投稿者にボーナスを付与
        await applyAppealBonus(appeal.userId);

        console.log(`Post ${appeal.postId} restored by admin via appeal ${appealId}`);
      } else if (action === "deny") {
        newStatus = "denied";
        // 投稿を維持削除
        await postRef.update({
          hidden: true,
          deletionReason: `異議申し立て却下: ${adminNote || "管理者判断により削除維持"}`,
        });
        console.log(`Appeal ${appealId} denied by admin`);
      } else if (action === "escalate") {
        newStatus = "escalated";
        // さらに上級管理者や法的審査へ
        updateData.escalatedTo = "senior_admin";
        console.log(`Appeal ${appealId} escalated by admin`);
      }

      await appealRef.update(updateData);

      return {
        success: true,
        status: newStatus,
        message: action === "approve" ? "異議申し立てが承認されました。投稿が復元されます。" :
                 action === "deny" ? "異議申し立てが却下されました。" :
                 "異議申し立てが上級審査に回されました。",
      };

    } catch (error) {
      console.error("Admin appeal processing error:", error);
      throw new functions.https.HttpsError("internal", "異議申し立て処理中にエラーが発生しました");
    }
  });

/**
 * Cloud Function: 管理者によるユーザー管理アクション
 */
export const manageUserByAdmin = functions
  .region("asia-southeast2")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "認証が必要です");
    }

    // TODO: 管理者権限チェックを追加
    // const isAdmin = await checkAdminRole(context.auth.uid);
    // if (!isAdmin) {
    //   throw new functions.https.HttpsError("permission-denied", "管理者権限が必要です");
    // }

    const { userId, action, reason } = data; // action: "suspend" | "unsuspend" | "reset_score"

    if (!userId || !action) {
      throw new functions.https.HttpsError("invalid-argument", "ユーザーIDとアクションが必要です");
    }

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "ユーザーが見つかりません");
      }

      const userData = userDoc.data();
      let updateData = {};

      if (action === "suspend") {
        updateData = {
          suspended: true,
          suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
          suspensionReason: reason || "管理者による停止",
        };
        console.log(`User ${userId} suspended by admin`);
      } else if (action === "unsuspend") {
        updateData = {
          suspended: false,
          suspendedAt: null,
          suspensionReason: null,
          trustScore: 50, // 復帰時にスコアをリセット
        };
        console.log(`User ${userId} unsuspended by admin`);
      } else if (action === "reset_score") {
        updateData = {
          trustScore: 50,
          misreports: 0,
          successfulAppeals: 0,
        };
        console.log(`User ${userId} trust score reset by admin`);
      }

      await userRef.update(updateData);

      return {
        success: true,
        action,
        message: action === "suspend" ? "ユーザーが停止されました。" :
                 action === "unsuspend" ? "ユーザーの停止が解除されました。" :
                 "ユーザーの信頼スコアがリセットされました。",
      };

    } catch (error) {
      console.error("Admin user management error:", error);
      throw new functions.https.HttpsError("internal", "ユーザー管理処理中にエラーが発生しました");
    }
  });
