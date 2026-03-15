import { useRef } from "react";

export const CATEGORIES = [
  { id:"helped",  label:"🤝 助けた",      color:"#10b981", question:"誰をどう助けましたか？",         placeholder:"例：重い荷物を持っていたお年寄りを手伝いました。",    action:"助けた記録を残す",    hint:"誰かの力になった" },
  { id:"thanks",  label:"🙏 ありがとう",   color:"#f59e0b", question:"誰に何を感謝しましたか？",       placeholder:"例：道に迷っていたら目的地まで案内してくれる人がいました。", action:"感謝の記録を残す",    hint:"感謝を伝えた" },
  { id:"smile",   label:"😊 笑顔を届けた", color:"#ec4899", question:"どうやって笑顔を届けましたか？", placeholder:"例：泣いている子どもに声をかけたら笑顔になってくれました。", action:"笑顔の記録を残す",    hint:"誰かを笑顔にした" },
  { id:"picked",  label:"🔍 発見・拾得",   color:"#3b82f6", question:"何を見つけましたか？",           placeholder:"例：公園でお財布が落ちていたので交番に届けました。",      action:"発見した記録を残す",  hint:"困りごとを見つけた" },
  { id:"clean",   label:"🧹 清掃・美化",   color:"#8b5cf6", question:"どんな活動をしましたか？",       placeholder:"例：通勤途中に駅前のゴミが気になって少し拾いながら歩きました。", action:"清掃の記録を残す",    hint:"街をきれいにした" },
  { id:"other",   label:"💬 その他",       color:"#64748b", question:"どんなことがありましたか？",     placeholder:"例：雨の日に傘を持っていない人に少し一緒に歩いてあげました。", action:"記録を残す",          hint:"その他の出来事" },
];

export default function PostForm({
  postText, setPostText, validation,
  postCategory, setPostCategory,
  postType, setPostType,
  postPhoto, setPostPhoto,
  postEventDate, setPostEventDate,
  postExpiry, setPostExpiry,
  chainPost,
  isDark, T,
  canPost, weatherInfo, userPosition,
  onConfirm,
}) {
  const fileRef = useRef(null);

  if (!userPosition) {
    return (
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        background: isDark ? "rgba(5,8,16,.97)" : "rgba(255,255,255,.98)",
        borderRadius:"20px 20px 0 0",
        border:`1px solid ${T.border}`, borderBottom:"none",
        backdropFilter:"blur(28px)", zIndex:1100,
        padding:"28px 20px 36px", textAlign:"center",
      }}>
        <div style={{fontSize:40, marginBottom:12}}>📍</div>
        <div style={{fontSize:14, fontWeight:800, color:T.text, marginBottom:8}}>位置情報が必要です</div>
        <div style={{fontSize:12, color:T.muted, lineHeight:1.7}}>
          ブラウザの位置情報を許可してください。<br/>
          現在地から1km以内の場所にしか記録できません。
        </div>
      </div>
    );
  }

  const cat = CATEGORIES.find(c => c.id === postCategory) || null;
  const accentColor = cat?.color || "#3b82f6";

  const handlePhoto = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert("2MB以下の画像を選択してください"); return; }
    const r = new FileReader();
    r.onload = ev => setPostPhoto(ev.target.result);
    r.readAsDataURL(f);
  };

  return (
    <div style={{
      position:"absolute", bottom:0, left:0, right:0,
      background: isDark ? "rgba(5,8,16,.97)" : "rgba(255,255,255,.98)",
      borderRadius:"20px 20px 0 0",
      border:`1px solid ${T.border}`, borderBottom:"none",
      borderTop: cat ? `2px solid ${accentColor}` : `1px solid ${T.border}`,
      backdropFilter:"blur(28px)", zIndex:1100,
      maxHeight:"72vh", display:"flex", flexDirection:"column",
      transition:"border-top-color .25s",
    }}>
      {/* ドラッグバー */}
      <div style={{width:40, height:4, background:T.border, borderRadius:2, margin:"10px auto 0", flexShrink:0}}/>

      <div style={{overflowY:"auto", flex:1, padding:"12px 16px 24px"}}>

        {/* 天気サジェスト */}
        {weatherInfo && (
          <div style={{fontSize:11, color:T.muted, marginBottom:10, padding:"6px 10px", background:isDark?"rgba(255,255,255,.03)":"rgba(0,0,0,.03)", borderRadius:8}}>
            {weatherInfo.emoji} {weatherInfo.suggest}
          </div>
        )}

        {/* チェーン元 */}
        {chainPost && (
          <div style={{padding:"8px 11px", background:isDark?"rgba(99,102,241,.08)":"rgba(99,102,241,.06)", border:"1px solid rgba(99,102,241,.2)", borderRadius:10, marginBottom:10, fontSize:11, color:"#818cf8"}}>
            🔗 「{chainPost.text.slice(0,30)}{chainPost.text.length>30?"…":""}」への連鎖投稿
          </div>
        )}

        {/* カテゴリ選択 */}
        <div style={{fontSize:11, fontWeight:700, color:T.muted, marginBottom:8, letterSpacing:".04em"}}>カテゴリ</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:14}}>
          {CATEGORIES.map(c => {
            const sel = postCategory === c.id;
            return (
              <button key={c.id} onClick={() => setPostCategory(sel ? "" : c.id)} style={{
                padding:"10px 4px 8px",
                background: sel ? `${c.color}18` : (isDark?"rgba(255,255,255,.03)":"rgba(0,0,0,.02)"),
                border:`${sel?2:1}px solid ${sel ? c.color : T.border}`,
                borderRadius:12, cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                transition:"all .18s",
                transform: sel ? "scale(1.03)" : "scale(1)",
              }}>
                <span style={{fontSize:20}}>{c.label.split(" ")[0]}</span>
                <span style={{fontSize:9, color:sel?c.color:T.muted, fontWeight:sel?800:400}}>
                  {c.label.split(" ").slice(1).join(" ")}
                </span>
              </button>
            );
          })}
        </div>

        {/* 投稿タイプ */}
        <div style={{display:"flex", gap:5, marginBottom:12}}>
          {[
            {id:"normal",  label:"📝 記録"},
            {id:"callout", label:"📢 呼びかけ"},
            {id:"event",   label:"📅 イベント"},
          ].map(t => (
            <button key={t.id} onClick={() => setPostType(t.id)} style={{
              flex:1, padding:"7px 0", fontSize:11, fontWeight:700,
              background: postType===t.id ? (isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.06)") : "transparent",
              border:`1px solid ${postType===t.id ? T.sub : T.border}`,
              borderRadius:9, cursor:"pointer", color:postType===t.id ? T.text : T.muted,
            }}>{t.label}</button>
          ))}
        </div>

        {/* テキストエリア */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11, fontWeight:700, color:cat?accentColor:T.muted, marginBottom:6, transition:"color .2s"}}>
            {cat ? cat.question : "どんなことがありましたか？"}
          </div>
          <textarea
            value={postText}
            onChange={e => setPostText(e.target.value)}
            placeholder={cat ? cat.placeholder : "今日、近くで起きた出来事を書いてください…"}
            rows={4}
            style={{
              width:"100%", padding:"11px 13px",
              background:T.input,
              border:`1.5px solid ${postText.length>=5 ? accentColor+"66" : T.border}`,
              borderRadius:12, color:T.text, fontSize:14, lineHeight:1.7,
              resize:"none", outline:"none", boxSizing:"border-box",
              transition:"border-color .2s",
            }}
          />
          <div style={{display:"flex", justifyContent:"space-between", marginTop:3}}>
            <div style={{fontSize:11, color:postText.length<5||postText.length>120?"#ef4444":T.muted}}>
              {!validation.ok && postText.length>0 ? validation.message : ""}
            </div>
            <div style={{fontSize:11, color:postText.length>100?"#f59e0b":T.muted}}>
              {postText.length}/120
            </div>
          </div>
        </div>

        {/* イベント日時 */}
        {postType === "event" && (
          <input type="datetime-local" value={postEventDate} onChange={e=>setPostEventDate(e.target.value)}
            style={{width:"100%",padding:"8px 11px",background:T.input,border:`1px solid ${T.border}`,borderRadius:9,color:T.text,fontSize:12,marginBottom:10,boxSizing:"border-box"}}/>
        )}

        {/* 詳細オプション */}
        <details style={{marginBottom:12}}>
          <summary style={{fontSize:11, color:T.muted, cursor:"pointer", userSelect:"none", listStyle:"none", display:"flex", alignItems:"center", gap:5}}>
            <span>▸</span>詳細オプション（写真・有効期限）
          </summary>
          <div style={{marginTop:10, display:"flex", flexDirection:"column", gap:8}}>
            {/* 写真 */}
            <div>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
              {postPhoto ? (
                <div style={{position:"relative"}}>
                  <img src={postPhoto} alt="" style={{width:"100%", borderRadius:10, maxHeight:120, objectFit:"cover"}}/>
                  <button onClick={()=>setPostPhoto(null)} style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,.6)",border:"none",borderRadius:"50%",color:"white",width:24,height:24,cursor:"pointer",fontSize:14,lineHeight:1}}>×</button>
                </div>
              ) : (
                <button onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"9px",background:"transparent",border:`1px dashed ${T.border}`,borderRadius:10,color:T.muted,fontSize:12,cursor:"pointer"}}>
                  📷 写真を追加（最大2MB）
                </button>
              )}
            </div>

            {/* 有効期限 */}
            <div>
              <div style={{fontSize:10, color:T.muted, marginBottom:5}}>有効期限</div>
              <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                {[{v:"none",l:"なし"},{v:"1h",l:"1時間"},{v:"6h",l:"6時間"},{v:"24h",l:"24時間"},{v:"3d",l:"3日間"}].map(o=>(
                  <button key={o.v} onClick={()=>setPostExpiry(o.v)} style={{
                    padding:"4px 10px", fontSize:10,
                    background:postExpiry===o.v?(isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.07)"):"transparent",
                    border:`1px solid ${postExpiry===o.v?T.sub:T.border}`,
                    borderRadius:7, cursor:"pointer", color:postExpiry===o.v?T.text:T.muted, fontWeight:postExpiry===o.v?700:400,
                  }}>{o.l}</button>
                ))}
              </div>
            </div>
          </div>
        </details>

        {/* ★ 場所を決めるボタン */}
        <button
          onClick={onConfirm}
          disabled={!canPost}
          style={{
            width:"100%", padding:"15px 0",
            background: canPost
              ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
              : (isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.05)"),
            border:`1px solid ${canPost ? accentColor : T.border}`,
            borderRadius:14, cursor:canPost?"pointer":"not-allowed",
            color: canPost ? "white" : T.muted,
            fontSize:15, fontWeight:900,
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all .2s",
            boxShadow: canPost ? `0 6px 24px ${accentColor}44` : "none",
          }}
        >
          <span style={{fontSize:17}}>📍</span>
          {canPost
            ? (cat ? cat.action.replace("を残す","") + "→ 場所を決める" : "場所を決める")
            : (postText.length<5 ? "5文字以上入力してください" : validation.message || "入力内容を確認してください")
          }
        </button>
      </div>
    </div>
  );
}