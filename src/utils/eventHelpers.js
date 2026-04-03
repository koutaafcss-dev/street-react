/**
 * イベント時間の表示形式を決定
 */
export function getEventStatus(eventDate, createdAt) {
  if (!eventDate) return null;
  
  const now = new Date().getTime();
  const eventTime = new Date(eventDate).getTime();
  const diff = eventTime - now;
  
  // イベント時間から24時間以内の場合
  if (diff > 0 && diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    
    if (hours === 0 && mins === 0) {
      return { status: "live", label: "🔴 開催中！", color: "#ef4444" };
    }
    if (hours === 0) {
      return { status: "soon", label: `⏰ ${mins}分後開始`, color: "#f59e0b" };
    }
    return { status: "soon", label: `⏰ ${hours}時間後開始`, color: "#f59e0b" };
  }
  
  // イベント開始済み
  if (diff <= 0) {
    const endSpan = 3600000; // イベント開催時間（1時間と仮定）
    if (now - eventTime < endSpan) {
      return { status: "live", label: "🔴 開催中！", color: "#ef4444" };
    }
    return { status: "ended", label: "✅ 終了", color: "#10b981" };
  }
  
  // それ以外
  const days = Math.floor(diff / 86400000);
  if (days === 1) {
    return { status: "upcoming", label: "📅 明日", color: "#3b82f6" };
  }
  if (days <= 7) {
    return { status: "upcoming", label: `📅 ${days}日後`, color: "#3b82f6" };
  }
  
  return null;
}

/**
 * イベント開催時間のフォーマット
 */
export function formatEventTime(eventDate) {
  if (!eventDate) return "";
  
  const date = new Date(eventDate);
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
