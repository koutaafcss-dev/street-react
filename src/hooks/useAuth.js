import { useState, useEffect } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * useAuth
 * ユーザー認証を管理する
 * - currentUser: ユーザーUID
 * - isAnonymous: 匿名ユーザーかどうか
 * - isPhoneVerified: 電話番号認証済みか
 * - displayName: ユーザー名
 * - suspended: アカウント停止中か
 * - trustScore: 信頼度スコア
 * - authLoading: 読み込み中か
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [suspended, setSuspended] = useState(false);
  const [trustScore, setTrustScore] = useState(50);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkUser = async (user) => {
      if (!mounted) return;
      
      if (user) {
        setCurrentUser(user.uid);
        setIsAnonymous(user.isAnonymous);

        // 認証ユーザーの場合、Firestoreからプロフィール情報を取得
        if (!user.isAnonymous) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setIsPhoneVerified(userData.isPhoneVerified || false);
              setDisplayName(userData.displayName || "");
              setSuspended(userData.suspended || false);
            }
            
            // アカウント状態（信頼スコア）を取得
            const statusDoc = await getDoc(doc(db, "account_status", user.uid));
            if (statusDoc.exists()) {
              const statusData = statusDoc.data();
              setTrustScore(statusData.trustScore || 50);
              setSuspended(statusData.suspended || false);
            }
          } catch (err) {
            console.error("Error fetching user profile:", err);
          }
        }
      } else {
        // ユーザーがサインアウトしている場合は、匿名ログイン
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Auth error:", e);
        }
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      checkUser(user);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return { 
    currentUser, 
    isAnonymous, 
    isPhoneVerified, 
    displayName,
    suspended,
    trustScore,
    authLoading 
  };
}
