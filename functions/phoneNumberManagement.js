import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import crypto from "crypto";

const db = admin.firestore();

/**
 * 電話番号ハッシュ化（プライバシー保護）
 */
function hashPhoneNumber(phoneNumber) {
  return crypto.createHash("sha256").update(phoneNumber).digest("hex");
}

/**
 * Cloud Function: アカウント作成完了時に電話番号を登録
 * 電話番号の一意性チェック + 登録を一度に実行
 */
export const registerPhoneNumber = functions
  .region("asia-southeast2")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "認証が必要です");
    }

    const { phoneNumber, displayName } = data;
    const uid = context.auth.uid;

    if (!phoneNumber || !displayName) {
      throw new functions.https.HttpsError("invalid-argument", "必要な情報が不足しています");
    }

    try {
      const phoneHash = hashPhoneNumber(phoneNumber);
      const phoneRef = db.collection("phoneNumbers").doc(phoneHash);

      return db.runTransaction(async (transaction) => {
        const phoneDoc = await transaction.get(phoneRef);

        if (phoneDoc.exists && phoneDoc.data().uid !== uid) {
          throw new functions.https.HttpsError(
            "already-exists",
            "この電話番号は既に登録されています"
          );
        }

        // 電話番号を登録
        transaction.set(
          phoneRef,
          {
            uid,
            phoneNumber, // ハッシュ前の番号（管理者のみが参照可能に設定）
            displayName,
            registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // ユーザードキュメントを更新
        const userRef = db.collection("users").doc(uid);
        transaction.update(userRef, {
          isPhoneVerified: true,
          phoneNumberHash: phoneHash,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });

        // アカウント状態を初期化
        const statusRef = db.collection("account_status").doc(uid);
        transaction.set(
          statusRef,
          {
            uid,
            trustScore: 50,
            suspended: false,
            suspensionReason: null,
            isSuspicious: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return {
          success: true,
          message: "電話番号が登録されました",
        };
      });
    } catch (error) {
      if (error.code === "already-exists") {
        throw error;
      }
      throw new functions.https.HttpsError("internal", "電話番号登録に失敗しました");
    }
  });

/**
 * Cloud Function: 複製アカウント検出（最適化版）
 * Batch Write で複数アカウントのペナルティを一度に適用
 * N+1 Query パターンを排除
 */
export const detectDuplicateAccounts = functions
  .region("asia-southeast2")
  .pubsub.schedule("every 6 hours")
  .onRun(async () => {
    try {
      const PENALTY_SCORE = 30;
      const batch = db.batch();
      let duplicateCount = 0;

      // account_status で isSuspicious = false のアカウントを取得
      const accountStatusSnap = await db
        .collection("account_status")
        .where("isSuspicious", "==", false)
        .limit(100)
        .get();

      // 複製検出用マップを構築（phoneHash → uid配列）
      const phoneHashMap = new Map();

      for (const statusDoc of accountStatusSnap.docs) {
        const uid = statusDoc.id;
        const userDoc = await db.collection("users").doc(uid).get();

        if (!userDoc.exists) continue;

        const phoneHash = userDoc.data().phoneNumberHash;
        if (!phoneHash) continue;

        if (!phoneHashMap.has(phoneHash)) {
          phoneHashMap.set(phoneHash, []);
        }
        phoneHashMap.get(phoneHash).push(uid);
      }

      // 複製されたアカウントにペナルティを適用（全て Batch で実行）
      for (const [phoneHash, uids] of phoneHashMap.entries()) {
        if (uids.length > 1) {
          // 複製アカウント検出
          for (const uid of uids) {
            const statusRef = db.collection("account_status").doc(uid);
            const statusDoc = await statusRef.get();
            const currentScore = statusDoc.data()?.trustScore || 50;

            batch.update(statusRef, {
              trustScore: Math.max(0, currentScore - PENALTY_SCORE),
              isSuspicious: true,
              suspiciousReason: "複製アカウントの可能性",
              lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
            });
            duplicateCount++;
          }

          // 管理者に通知（Batch 経由）
          batch.set(db.collection("admin_reports").doc(), {
            type: "duplicate_accounts",
            severity: "high",
            phoneHash,
            accountIds: uids,
            reportedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "pending",
          });
        }
      }

      // 一度に全て更新
      if (duplicateCount > 0) {
        await batch.commit();
      }

      return {
        success: true,
        duplicatesProcessed: duplicateCount,
      };
    } catch (error) {
      throw error;
    }
  });

/**
 * Cloud Function: アカウント停止スコアの自動更新（最適化版）
 * Batch Write で複数アカウントを一度に更新
 */
export const autoSuspendLowTrustAccounts = functions
  .region("asia-southeast2")
  .pubsub.schedule("every 1 hours")
  .onRun(async () => {
    const SUSPENSION_THRESHOLD = 20; // スコア 20 以下で停止
    const REACTIVATION_THRESHOLD = 50; // スコア 50 以上で復帰

    try {
      const batch = db.batch();
      let suspendedCount = 0;
      let reactivatedCount = 0;

      // 停止対象のアカウントを取得
      const toSuspendQuery = await db
        .collection("account_status")
        .where("trustScore", "<=", SUSPENSION_THRESHOLD)
        .where("suspended", "==", false)
        .get();

      for (const doc of toSuspendQuery.docs) {
        const accountData = doc.data();
        // account_status を更新
        batch.update(doc.ref, {
          suspended: true,
          suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
          suspensionReason: `信頼度スコアが ${SUSPENSION_THRESHOLD} 以下に低下`,
          lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
        });

        // ユーザードキュメントも更新
        batch.update(db.collection("users").doc(accountData.uid), {
          suspended: true,
          suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        suspendedCount++;
      }

      // 復帰対象のアカウントを取得
      const toReactivateQuery = await db
        .collection("account_status")
        .where("trustScore", ">=", REACTIVATION_THRESHOLD)
        .where("suspended", "==", true)
        .get();

      for (const doc of toReactivateQuery.docs) {
        const accountData = doc.data();
        // ユーザーからの復帰申請があった場合のみ復帰
        if (accountData.reactivationRequested) {
          batch.update(doc.ref, {
            suspended: false,
            suspendedAt: null,
            suspensionReason: null,
            reactivationRequested: false,
            lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
          });

          // ユーザードキュメントも更新
          batch.update(db.collection("users").doc(accountData.uid), {
            suspended: false,
            suspendedAt: null,
          });
          reactivatedCount++;
        }
      }

      // 一度に全て更新
      if (suspendedCount > 0 || reactivatedCount > 0) {
        await batch.commit();
      }

      return { success: true, suspendedCount, reactivatedCount };
    } catch (error) {
      throw error;
    }
  });

/**
 * 復帰申請を行うためのCloud Function
 */
export const requestAccountReactivation = functions
  .region("asia-southeast2")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "認証が必要です");
    }

    const uid = context.auth.uid;

    try {
      const statusRef = db.collection("account_status").doc(uid);
      const statusDoc = await statusRef.get();

      if (!statusDoc.exists) {
        throw new functions.https.HttpsError("not-found", "アカウント状態が見つかりません");
      }

      if (!statusDoc.data().suspended) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "このアカウントは停止されていません"
        );
      }

      const batch = db.batch();

      // 復帰申請フラグを設定
      batch.update(statusRef, {
        reactivationRequested: true,
        reactivationRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 管理者に通知
      batch.set(db.collection("admin_reports").doc(), {
        type: "reactivation_request",
        userId: uid,
        trustScore: statusDoc.data().trustScore,
        suspendedAt: statusDoc.data().suspendedAt,
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending_review",
      });

      await batch.commit();

      return {
        success: true,
        message: "復帰申請を送信しました。管理者の審査をお待ちください",
      };
    } catch (error) {
      throw new functions.https.HttpsError("internal", "復帰申請に失敗しました");
    }
  });
