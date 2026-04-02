import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, startAfter, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * usePagination
 * Firestore データの効率的な読込（ページネーション）
 * - 初回: 最新 30 件のみ
 * - スクロール時: 次 20 件を追加
 * - メモリ上限: 常に最新 200 件まで保持
 */
export function usePagination(currentUser, { onError, initialSize = 30, pageSize = 20, maxCached = 200 } = {}) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 初期データ読込
  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);
    const q = query(
      collection(db, "posts"),
      orderBy("timestamp", "desc"),
      limit(initialSize)
    );

    const unsub = onSnapshot(
      q,
      snapshot => {
        const docs = snapshot.docs;
        const newPosts = docs.map(d => ({ id: d.id, ...d.data() }));
        setPosts(newPosts);
        setLastDoc(docs.length > 0 ? docs[docs.length - 1] : null);
        setHasMore(docs.length === initialSize);
        setIsLoading(false);
      },
      err => {
        console.error("Pagination initial error:", err);
        setIsLoading(false);
        onError?.(err);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // 追加ページ読込（無限スクロール用）
  const fetchMore = async () => {
    if (!lastDoc || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const q = query(
        collection(db, "posts"),
        orderBy("timestamp", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      const newPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      setPosts(prev => {
        // メモリ上限を超えないようにカット
        const combined = [...prev, ...newPosts];
        return combined.length > maxCached ? combined.slice(0, maxCached) : combined;
      });

      setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error("Pagination fetchMore error:", err);
      onError?.(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return { posts, isLoading, isLoadingMore, hasMore, fetchMore, lastDoc };
}
