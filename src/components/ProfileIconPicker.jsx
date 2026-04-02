import React, { useMemo, useState } from "react";
import { PROFILE_ICON_BG, PROFILE_ICON_CANDIDATES } from "../constants/appMeta";

export default function ProfileIconPicker({
  open,
  onClose,
  currentEmoji = "🚶",
  currentBgId = "sky",
  onSave,
  isDark = false,
  T,
}) {
  const theme =
    T ||
    (isDark
      ? {
          bg: "rgba(5,8,16,0.98)",
          text: "#f8fafc",
          sub: "#e2e8f0",
          muted: "#94a3b8",
          border: "rgba(255,255,255,0.12)",
          card: "rgba(255,255,255,0.06)",
          cardBorder: "rgba(255,255,255,0.10)",
        }
      : {
          bg: "#ffffff",
          text: "#0f172a",
          sub: "#334155",
          muted: "#64748b",
          border: "rgba(0,0,0,0.08)",
          card: "#ffffff",
          cardBorder: "rgba(0,0,0,0.08)",
        });

  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji || "🚶");
  const [selectedBgId, setSelectedBgId] = useState(currentBgId || "sky");

  const selectedBg = useMemo(() => {
    return PROFILE_ICON_BG.find((item) => item.id === selectedBgId) || PROFILE_ICON_BG[0];
  }, [selectedBgId]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(12px)",
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
            <div style={{ fontSize: 18, fontWeight: 900, color: theme.text }}>プロフィールアイコン</div>
            <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
              派手すぎない範囲で、自分らしい目印を作れます
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: theme.muted, fontSize: 24, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 18, overflowY: "auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                color: "white",
                background: selectedBg.value,
                border: `4px solid ${isDark ? "#050810" : "#f1f5f9"}`,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              {selectedEmoji}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.text, marginBottom: 8 }}>
              アイコンを選ぶ
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
              {PROFILE_ICON_CANDIDATES.map((emoji) => {
                const active = selectedEmoji === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    style={{
                      height: 46,
                      borderRadius: 12,
                      border: `1px solid ${active ? "rgba(37,99,235,0.35)" : theme.cardBorder}`,
                      background: active ? "rgba(37,99,235,0.10)" : theme.card,
                      cursor: "pointer",
                      fontSize: 22,
                      transform: active ? "scale(1.04)" : "scale(1)",
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.text, marginBottom: 8 }}>
              背景色を選ぶ
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {PROFILE_ICON_BG.map((bg) => {
                const active = selectedBgId === bg.id;
                return (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBgId(bg.id)}
                    style={{
                      height: 56,
                      borderRadius: 14,
                      border: `2px solid ${active ? "white" : "transparent"}`,
                      background: bg.value,
                      color: "rgba(255,255,255,0.92)",
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: active ? "0 0 0 2px rgba(37,99,235,0.35)" : "none",
                    }}
                  >
                    {bg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onSave?.({ emoji: selectedEmoji, bgId: selectedBgId })}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg,#2563eb,#7c3aed)",
              color: "white",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            このアイコンにする
          </button>
        </div>
      </div>
    </div>
  );
}
