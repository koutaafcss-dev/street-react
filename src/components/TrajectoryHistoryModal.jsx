import React, { useMemo } from "react";

function fmtDistance(km) {
  if (km >= 1) return `${km.toFixed(1)}km`;
  return `${Math.round(km * 1000)}m`;
}

function fmtDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrajectoryHistoryModal({
  open,
  onClose,
  points = [],
  todayDist = 0,
  totalDist = 0,
  isDark = false,
  T,
  showOnMap = false,
  onToggleShowOnMap,
  onClear,
}) {
  const theme =
    T ||
    (isDark
      ? {
          bg: "rgba(5,8,16,0.98)",
          text: "#f8fafc",
          sub: "#e2e8f0",
          muted: "#94a3b8",
          card: "rgba(255,255,255,0.06)",
          cardBorder: "rgba(255,255,255,0.1)",
          border: "rgba(255,255,255,0.12)",
        }
      : {
          bg: "#ffffff",
          text: "#0f172a",
          sub: "#334155",
          muted: "#64748b",
          card: "#ffffff",
          cardBorder: "rgba(0,0,0,0.08)",
          border: "rgba(0,0,0,0.08)",
        });

  const lastPoint = points.length ? points[points.length - 1] : null;

  const recentPoints = useMemo(() => {
    return [...points].reverse().slice(0, 12);
  }, [points]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 9200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(10px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 96vw)",
          maxHeight: "88vh",
          overflow: "hidden",
          borderRadius: 24,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: `1px solid ${theme.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: theme.text }}>
              軌跡の記録
            </div>
            <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
              地図には常時出さず、必要な時だけ見返せます
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: theme.muted,
              fontSize: 24,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 18, overflowY: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {[
              { label: "今日", value: fmtDistance(todayDist), color: "#10b981" },
              { label: "累計", value: fmtDistance(totalDist), color: "#2563eb" },
              { label: "保存点", value: `${points.length}`, color: "#8b5cf6" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: 16,
                  padding: "14px 10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 900, color: item.color }}>
                  {item.value}
                </div>
                <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onToggleShowOnMap}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: `1px solid ${showOnMap ? "rgba(37,99,235,0.35)" : theme.border}`,
                background: showOnMap ? "rgba(37,99,235,0.12)" : "transparent",
                color: showOnMap ? "#2563eb" : theme.sub,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {showOnMap ? "地図表示を隠す" : "地図に一時表示する"}
            </button>

            <button
              onClick={onClear}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.08)",
                color: "#ef4444",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              軌跡をリセット
            </button>
          </div>

          <div
            style={{
              background: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 16,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.text, marginBottom: 6 }}>
              最終更新
            </div>
            <div style={{ fontSize: 13, color: theme.sub }}>
              {lastPoint ? fmtDate(lastPoint.timestamp) : "まだ軌跡がありません"}
            </div>
          </div>

          <div
            style={{
              background: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.text, marginBottom: 10 }}>
              最近の保存地点
            </div>

            {recentPoints.length === 0 ? (
              <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.8 }}>
                まだ保存された軌跡はありません。プロフィールの軌跡パネルから開始すると、ここに履歴がたまります。
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentPoints.map((point, index) => (
                  <div
                    key={`${point.timestamp || 0}-${index}`}
                    style={{
                      border: `1px solid ${theme.cardBorder}`,
                      borderRadius: 12,
                      padding: "10px 12px",
                      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: theme.text, fontWeight: 700, marginBottom: 3 }}>
                      {fmtDate(point.timestamp)}
                    </div>
                    <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.7 }}>
                      緯度 {Number(point.lat).toFixed(5)} / 経度 {Number(point.lng).toFixed(5)}
                      {typeof point.accuracy === "number" ? ` / 精度 ±${Math.round(point.accuracy)}m` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
