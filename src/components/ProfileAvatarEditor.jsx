import { useRef, useState } from "react";

const EMOJIS = [
  "🚶", "🏃", "🌳", "🗺️", "☕", "🌙",
  "🌸", "🏙️", "🌊", "📍", "🎒", "🔭",
  "🌿", "⛩️", "🌃", "🚲", "🐕", "🎵",
  "📷", "🍜", "🌺", "⭐", "🦋", "🏞️",
];

export default function ProfileAvatarEditor({
  open,
  onClose,
  isDark,
  T,
  profileAvatarEmoji,
  setProfileAvatarEmoji,
  profileAvatarPhoto,
  setProfileAvatarPhoto,
  compressImage,
  showToast,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast?.("画像ファイルを選んでください", "error");
      return;
    }

    try {
      setBusy(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const compressed = await compressImage(reader.result, 180);
          setProfileAvatarPhoto(compressed);
          showToast?.("プロフィール写真を設定しました");
        } catch (err) {
          showToast?.(err?.message || "写真の保存に失敗しました", "error");
        } finally {
          setBusy(false);
          e.target.value = "";
        }
      };
      reader.onerror = () => {
        setBusy(false);
        showToast?.("画像の読み込みに失敗しました", "error");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setBusy(false);
      showToast?.("写真の保存に失敗しました", "error");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 8000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: isDark ? "rgba(6,10,20,0.99)" : "#fff",
          border: `1px solid ${T.border}`,
          borderRadius: 24,
          padding: "24px 24px 22px",
          width: "min(380px,92vw)",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 6 }}>
          写真・アイコン
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, marginBottom: 16 }}>
          最初は今まで通りのアイコンで使えて、あとから自分の写真にも変えられます。
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          {profileAvatarPhoto ? (
            <div style={{ width: 96, height: 96, borderRadius: "50%", overflow: "hidden", border: `2px solid ${T.cardBorder}` }}>
              <img src={profileAvatarPhoto} alt="プロフィール写真" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 42 }}>
              {profileAvatarEmoji || "🚶"}
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            style={{
              padding: "11px 0",
              background: "linear-gradient(135deg,#2563eb,#7c3aed)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "保存中…" : "写真を選ぶ"}
          </button>

          <button
            onClick={() => {
              setProfileAvatarPhoto("");
              showToast?.("写真を外しました");
            }}
            style={{
              padding: "11px 0",
              background: "transparent",
              color: T.sub,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            写真を外す
          </button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 10, marginTop: 14 }}>
          初期アイコンも使えます
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 18 }}>
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setProfileAvatarEmoji(emoji);
                setProfileAvatarPhoto("");
                showToast?.("アイコンを変更しました");
              }}
              style={{
                fontSize: 24,
                background: profileAvatarEmoji === emoji && !profileAvatarPhoto
                  ? (isDark ? "rgba(59,130,246,.2)" : "rgba(37,99,235,.1)")
                  : "transparent",
                border: `2px solid ${profileAvatarEmoji === emoji && !profileAvatarPhoto ? "#3b82f6" : "transparent"}`,
                borderRadius: 12,
                padding: "8px 0",
                cursor: "pointer",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "11px 0",
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
