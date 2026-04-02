import { useState, useCallback } from "react";
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * usePostReporting
 * ユーザー報告システム
 * 
 * 機能：
 * 1. 投稿に報告ボタン追加
 * 2. 報告理由・コメント記録
 * 3. ユーザーの報告履歴トラック
 * 4. 同一ユーザーの多重報告防止
 */
export function usePostReporting(currentUser) {
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState(null);

  /**
   * 投稿を報告する
   * @param {string} postId - 報告対象の投稿 ID
   * @param {object} reportData - 報告内容
   *   - reason: 報告理由（"misleading", "spam", "harassment", "illegal", "other"）
   *   - description: 詳細説明
   *   - evidence: 証拠（オプション）
   */
  const reportPost = useCallback(
    async (postId, reportData) => {
      if (!currentUser) {
        setReportError("認証が必要です");
        return { success: false };
      }

      if (!postId || !reportData.reason) {
        setReportError("報告理由を選択してください");
        return { success: false };
      }

      setIsReporting(true);
      setReportError(null);

      try {
        // 既に報告済みかチェック
        const existingQuery = query(
          collection(db, "posts", postId, "reports"),
          where("reportedBy", "==", currentUser)
        );
        const existing = await getDocs(existingQuery);

        if (existing.size > 0) {
          setReportError("この投稿は既に報告済みです");
          return { success: false };
        }

        // 報告を記録
        const reportRef = await addDoc(
          collection(db, "posts", postId, "reports"),
          {
            reportedBy: currentUser,
            reason: reportData.reason,
            description: reportData.description || "",
            evidence: reportData.evidence || null,
            timestamp: Date.now(),
            status: "pending", // pending, investigating, resolved
            aiAnalysis: null, // AI 分析結果
            trustScore: 0, // 報告の信頼度（0-100）
          }
        );

        // 投稿の報告カウント更新
        const postRef = doc(db, "posts", postId);
        const post = await getDocs(
          query(collection(db, "posts"), where("__name__", "==", postId))
        );

        if (post.size > 0) {
          const postSnap = post.docs[0];
          const currentCount = postSnap.data().reports || 0;
          await updateDoc(postRef, { reports: currentCount + 1 });
        }

        console.log("Report submitted:", reportRef.id);
        return { success: true, reportId: reportRef.id };
      } catch (err) {
        console.error("Report submission failed:", err);
        setReportError("報告に失敗しました");
        return { success: false, error: err };
      } finally {
        setIsReporting(false);
      }
    },
    [currentUser]
  );

  /**
   * ユーザーが投稿を報告済みかチェック
   */
  const checkUserReportedPost = useCallback(
    async (postId) => {
      if (!currentUser) return false;

      try {
        const q = query(
          collection(db, "posts", postId, "reports"),
          where("reportedBy", "==", currentUser)
        );
        const result = await getDocs(q);
        return result.size > 0;
      } catch (err) {
        console.error("Error checking report status:", err);
        return false;
      }
    },
    [currentUser]
  );

  /**
   * ユーザーの報告信頼度スコア計算
   * - 過去にどれだけ正確な報告をしたか
   * - 報告した投稿がどれだけ実際に削除されたか
   * - 誤報告の多さ
   */
  const calculateUserTrustScore = useCallback(
    async () => {
      if (!currentUser) return 0;

      try {
        // ユーザーの全報告を取得
        const allReportsQuery = query(
          collection(db, "reports"),
          where("reportedBy", "==", currentUser)
        );
        const reportsSnap = await getDocs(allReportsQuery);

        if (reportsSnap.size === 0) return 50; // デフォルト

        let correctReports = 0; // 投稿が削除された報告
        let totalReports = reportsSnap.size;

        for (const report of reportsSnap.docs) {
          const data = report.data();
          if (data.status === "resolved" && data.postDeleted) {
            correctReports++;
          }
        }

        // 信頼度 = (正確な報告数 / 総報告数) * 100
        // 最大 100、最小 0
        const trustScore = Math.round((correctReports / totalReports) * 100);
        return Math.max(0, Math.min(100, trustScore));
      } catch (err) {
        console.error("Error calculating trust score:", err);
        return 50;
      }
    },
    [currentUser]
  );

  return {
    reportPost,
    checkUserReportedPost,
    calculateUserTrustScore,
    isReporting,
    reportError,
  };
}
