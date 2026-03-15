import { useState, useEffect, useRef } from "react";

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }
  catch { return def; }
}
function safeSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

/**
 * useNotifications
 * - 自分の投稿へのリアクション（GoodJob / コメント / 助かった）を検知して通知を生成
 * - localStorage に永続化
 * - 将来的に Firestore（users/{uid}/notifications）へ移行しやすい設計
 *
 * 問題点（現在）: localStorage のみなので端末を変えると消える
 * 改善予定: Firestore サブコレクションへの移行（やることリスト1位）
 */
export function useNotifications(posts, currentUser) {
  const [notifications, setNotifications] = useState(
    () => load("zenNotifs", [])
  );

  // posts変化の差分検知用
  const prevPostsRef = useRef({});
  const initializedRef = useRef(false);

  // ── 自分の投稿への新着リアクションを検知
  useEffect(() => {
    if (!currentUser || !posts.length) return;

    const myPosts = posts.filter(p => p.userId === currentUser);

    // 初回は「今の状態」をベースラインとして記録（通知を出さない）
    if (!initializedRef.current) {
      myPosts.forEach(p => {
        prevPostsRef.current[p.id] = {
          likes:    p.likes,
          comments: (p.comments || []).length,
          helpedBy: (p.helpedBy || []).length,
        };
      });
      initializedRef.current = true;
      return;
    }

    myPosts.forEach(post => {
      const prev = prevPostsRef.current[post.id];
      const now = {
        likes:    post.likes,
        comments: (post.comments || []).length,
        helpedBy: (post.helpedBy || []).length,
      };

      if (prev) {
        const short = `「${post.text.slice(0, 20)}${post.text.length > 20 ? "…" : ""}」`;

        if (post.likes > prev.likes) {
          setNotifications(p => [{
            id: `${Date.now()}gj${post.id}`,
            type: "goodjob",
            text: `${short}にGoodJobが届きました ✨`,
            timestamp: Date.now(),
            read: false,
          }, ...p].slice(0, 30));
        }
        if ((post.comments || []).length > prev.comments) {
          setNotifications(p => [{
            id: `${Date.now()}cm${post.id}`,
            type: "comment",
            text: `${short}に新しいコメントが届きました 💬`,
            timestamp: Date.now(),
            read: false,
          }, ...p].slice(0, 30));
        }
        if ((post.helpedBy || []).length > prev.helpedBy) {
          setNotifications(p => [{
            id: `${Date.now()}hp${post.id}`,
            type: "helped",
            text: `${short}が「助かった！」と反応されました 🙏`,
            timestamp: Date.now(),
            read: false,
          }, ...p].slice(0, 30));
        }
      }
      prevPostsRef.current[post.id] = now;
    });
  }, [posts, currentUser]);

  // ── localStorage 永続化
  useEffect(() => { safeSave("zenNotifs", notifications); }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () =>
    setNotifications(p => p.map(n => ({ ...n, read: true })));

  return { notifications, setNotifications, unreadCount, markAllRead };
}
