import { useState, useEffect } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

/**
 * useAuth
 * 匿名認証を管理する。currentUser と authLoading を返す。
 * App.jsx から切り出したことで、認証ロジックが独立してテストしやすくなる。
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // 匿名ログイン（すでにログイン済みなら onAuthStateChanged が即発火するので問題なし）
    signInAnonymously(auth).catch(e => console.error("Auth error:", e));

    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user ? user.uid : null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  return { currentUser, authLoading };
}
