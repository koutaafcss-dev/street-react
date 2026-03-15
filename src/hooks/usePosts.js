import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

/**
 * usePosts
 * Firestore の posts コレクションを購読する。
 * currentUser が確定してから購読を開始することで、無駄なリクエストを防ぐ。
 * visiblePosts のフィルタリングは呼び出し側（App.jsx）で行い、
 * このhookは「生データを取得する」責務のみ持つ。
 */
export function usePosts(currentUser, { onError } = {}) {
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "posts"),
      orderBy("timestamp", "desc"),
      limit(300)
    );

    const unsub = onSnapshot(
      q,
      snapshot => {
        setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setPostsLoading(false);
      },
      err => {
        console.error("Firestore posts error:", err);
        setPostsLoading(false);
        onError?.(err);
      }
    );

    return () => unsub();
  }, [currentUser]);

  return { posts, postsLoading };
}
