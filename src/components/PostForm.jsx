import { useRef, useState } from "react";

export const CATEGORIES = [];

export const NEED_TAGS = [
  { id:"trash",   label:"🗑️ ゴミ捨て" },
  { id:"toilet",  label:"🚻 トイレ" },
  { id:"bench",   label:"🪑 ベンチ" },
  { id:"rest",    label:"☕ 休憩" },
  { id:"water",   label:"💧 水場" },
  { id:"shade",   label:"🌳 日陰" },
  { id:"shelter", label:"🏠 屋内避難" },
  { id:"barrier", label:"♿ バリアフリー" },
  { id:"kids",    label:"👶 子ども向け" },
  { id:"night",   label:"🌙 夜でも安心" },
];

// 投稿タイプ別のサジェスト
const TYPE_HINTS = {
  normal: [
    "ここにベンチがある",
    "この路地は日陰が多い",
    "雨宿りできる場所を見つけた",
    "ゴミ箱がこの辺にある",
    "無料で充電できる場所があった",
    "お腹が空いたら近くに自販機がある",
  ],
  callout: [
    "この道、街灯が少なくて暗いです",
    "ここのベンチ、壊れてます",
    "落とし物がありました",
    "この交差点、見通しが悪い気がします",
  ],
  event: [
    "近くで朝市があります",
    "今日、公園で何かやってます",
    "この時間帯、混雑しています",
  ],
};

export default function PostForm({
  postText, setPostText, validation,
  postType, setPostType,
  postPhoto, setPostPhoto,
  postEventDate, setPostEventDate,
  postExpiry, setPostExpiry,
  postNeedTags, setPostNeedTags,
  chainPost, isDark, T,
  canPost, weatherInfo, userPosition,
  onConfirm, onCancel,
  isPhoneVerified, onShowAuth,
  moderateImage,
}) {
  const fileRef = useRef(null);
  const [showNeedTags, setShowNeedTags] = useState(false);

  if (!userPosition) {
    return (
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:isDark?"rgba(5,8,16,.97)":"rgba(255,255,255,.98)",borderRadius:"20px 20px 0 0",border:`1px solid ${T.border}`,borderBottom:"none",backdropFilter:"blur(28px)",zIndex:1100,padding:"32px 20px 40px",textAlign:"center"}}>
        <button onClick={onCancel} style={{position:"absolute",top:16,right:16,width:32,height:32,borderRadius:"50%",background:isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.06)",border:`1px solid ${T.border}`,color:T.sub,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
        <div style={{fontSize:40,marginBottom:12}}>📍</div>
        <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:8}}>位置情報が必要です</div>
        <div style={{fontSize:12,color:T.sub,lineHeight:1.7}}>ブラウザの位置情報を許可してください。<br/>現在地から1km以内の場所にしか記録できません。</div>
      </div>
    );
  }

  const handlePhoto = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2*1024*1024) { alert("2MB以下の画像を選択してください"); return; }
    const r = new FileReader();
    r.onload = async ev => {
      const imageData = ev.target.result;
      setPostPhoto(imageData);
      
      // 画像AIモデレーション実行（有効な場合）
      if (moderateImage) {
        try {
          const result = await moderateImage(imageData);
          if (!result.safe) {
            alert(`⚠️ この画像は投稿できません:\n${result.reason}`);
            setPostPhoto(null);
          }
        } catch (err) {
          console.error("Image moderation error:", err);
          // エラー時は続行（ユーザー判定）
        }
      }
    };
    r.readAsDataURL(f);
  };

  const toggleNeedTag = id =>
    setPostNeedTags(prev => prev.includes(id) ? prev.filter(t=>t!==id) : [...prev, id]);

  const hints = TYPE_HINTS[postType] || TYPE_HINTS.normal;
  const needTagCount = (postNeedTags||[]).length;

  // タイプ別のplaceholder
  const placeholders = {
    normal:  "今日、近くで起きた出来事・役立つ情報を書いてください…",
    callout: "気になっていること・街への呼びかけを書いてください…",
    event:   "イベントの内容・日時・場所などを書いてください…",
  };

  // タイプ別のアクセントカラー
  const typeColors = {
    normal:  "#3b82f6",
    callout: "#f59e0b",
    event:   "#6366f1",
  };
  const accentColor = typeColors[postType];

  return (
    <div style={{
      position:"absolute",bottom:0,left:0,right:0,
      background:isDark?"rgba(5,8,16,.97)":"rgba(255,255,255,.98)",
      borderRadius:"20px 20px 0 0",
      border:`1px solid ${T.border}`,borderBottom:"none",
      borderTop:`2px solid ${accentColor}`,
      backdropFilter:"blur(28px)",zIndex:1100,
      maxHeight:"88vh",display:"flex",flexDirection:"column",
    }}>

      {/* ハンドル + 閉じるボタン */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 52px 0",flexShrink:0,position:"relative"}}>
        <div style={{width:40,height:4,background:T.border,borderRadius:2}}/>
        <button onClick={onCancel} style={{position:"absolute",top:8,right:14,width:34,height:34,borderRadius:"50%",background:isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)",border:`1px solid ${T.border}`,color:T.sub,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>×</button>
      </div>

      <div style={{overflowY:"auto",flex:1,padding:"10px 16px 24px"}}>

        {/* 天気サジェスト */}
        {weatherInfo&&(
          <div style={{fontSize:11,color:T.sub,marginBottom:10,padding:"6px 11px",background:isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.03)",borderRadius:9}}>
            {weatherInfo.emoji} {weatherInfo.suggest}
          </div>
        )}

        {/* チェーン元 */}
        {chainPost&&(
          <div style={{padding:"7px 11px",background:isDark?"rgba(99,102,241,.08)":"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10,marginBottom:10,fontSize:11,color:"#818cf8"}}>
            🔗 「{chainPost.text.slice(0,30)}{chainPost.text.length>30?"…":""}」への連鎖投稿
          </div>
        )}

        {/* 投稿タイプ */}
        <div style={{display:"flex",gap:5,marginBottom:12}}>
          {[{id:"normal",label:"📝 記録"},{id:"callout",label:"📢 呼びかけ"},{id:"event",label:"📅 イベント"}].map(t=>(
            <button key={t.id} onClick={()=>setPostType(t.id)} style={{
              flex:1,padding:"7px 0",fontSize:11,fontWeight:700,
              background:postType===t.id?(isDark?`rgba(${t.id==="callout"?"245,158,11":t.id==="event"?"99,102,241":"59,130,246"},.18)`:`rgba(${t.id==="callout"?"245,158,11":t.id==="event"?"99,102,241":"37,99,235"},.09)`):"transparent",
              border:`1.5px solid ${postType===t.id?accentColor:T.border}`,
              borderRadius:10,cursor:"pointer",
              color:postType===t.id?accentColor:T.sub,
              transition:"all .15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* テキストエリア */}
        <div style={{marginBottom:10}}>
          <textarea
            value={postText}
            onChange={e=>setPostText(e.target.value)}
            placeholder={placeholders[postType]}
            rows={4}
            autoFocus
            style={{
              width:"100%",padding:"12px 13px",
              background:isDark?"rgba(255,255,255,.06)":"#f8fafc",
              border:`1.5px solid ${postText.length>=5?accentColor+"88":T.border}`,
              borderRadius:12,color:T.text,fontSize:14,lineHeight:1.75,
              resize:"none",outline:"none",boxSizing:"border-box",
              transition:"border-color .2s",
            }}
          />
          {/* バリデーション + 文字数 */}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
            <div style={{fontSize:11,color:"#ef4444",minHeight:16}}>
              {!validation.ok&&postText.length>0?validation.message:""}
            </div>
            <div style={{fontSize:11,color:postText.length>100?"#f59e0b":T.muted}}>
              {postText.length}/120
            </div>
          </div>
        </div>

        {/* 書き方のヒント（サジェストチップ） */}
        {postText.length<5&&(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:6}}>例えば…</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {hints.map((h,i)=>(
                <button key={i} onClick={()=>setPostText(h)} style={{
                  padding:"4px 10px",fontSize:11,borderRadius:999,cursor:"pointer",
                  background:isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)",
                  border:`1px solid ${T.border}`,color:T.muted,
                  transition:"all .1s",textAlign:"left",
                }}>{h}</button>
              ))}
            </div>
          </div>
        )}

        {/* イベント日時 */}
        {postType==="event"&&(
          <input type="datetime-local" value={postEventDate} onChange={e=>setPostEventDate(e.target.value)}
            style={{width:"100%",padding:"9px 11px",background:isDark?"rgba(255,255,255,.06)":"#f8fafc",border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontSize:12,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
        )}

        {/* 用途タグ（折りたたみ式 → 件数見えるトグル） */}
        <div style={{marginBottom:12}}>
          <button
            onClick={()=>setShowNeedTags(s=>!s)}
            style={{
              width:"100%",padding:"8px 12px",
              background:needTagCount>0?(isDark?"rgba(16,185,129,.12)":"rgba(16,185,129,.07)"):(isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.03)"),
              border:`1px solid ${needTagCount>0?"rgba(16,185,129,.35)":T.border}`,
              borderRadius:10,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"space-between",
              color:needTagCount>0?"#10b981":T.muted,fontSize:12,fontWeight:needTagCount>0?700:400,
            }}
          >
            <span>🏷️ この場所で役立つこと{needTagCount>0?` · ${needTagCount}件選択中`:""}</span>
            <span style={{fontSize:11}}>{showNeedTags?"▲":"▼"}</span>
          </button>

          {showNeedTags&&(
            <div style={{marginTop:7,padding:"10px 12px",background:isDark?"rgba(255,255,255,.03)":"rgba(0,0,0,.025)",border:`1px solid ${T.border}`,borderRadius:"0 0 10px 10px",marginTop:-1}}>
              {/* 2列グリッド */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {NEED_TAGS.map(tag=>{
                  const sel=(postNeedTags||[]).includes(tag.id);
                  return(
                    <button key={tag.id} onClick={()=>toggleNeedTag(tag.id)} style={{
                      padding:"8px 10px",fontSize:12,borderRadius:9,cursor:"pointer",
                      background:sel?(isDark?"rgba(16,185,129,.18)":"rgba(16,185,129,.1)"):"transparent",
                      border:`1.5px solid ${sel?"#10b981":T.border}`,
                      color:sel?"#10b981":T.sub,fontWeight:sel?700:400,
                      transition:"all .12s",textAlign:"left",
                    }}>
                      {tag.label}
                    </button>
                  );
                })}
              </div>
              {needTagCount>0&&(
                <button onClick={()=>setPostNeedTags([])} style={{marginTop:8,fontSize:10,color:T.muted,background:"transparent",border:"none",cursor:"pointer",textDecoration:"underline"}}>
                  選択をクリア
                </button>
              )}
            </div>
          )}
        </div>

        {/* 写真 + 有効期限（常時表示・横並び） */}
        <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"flex-start"}}>

          {/* 写真 */}
          <div style={{flex:1}}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
            {postPhoto?(
              <div style={{position:"relative"}}>
                <img src={postPhoto} alt="" style={{width:"100%",borderRadius:10,maxHeight:100,objectFit:"cover",border:`1px solid ${T.border}`}}/>
                <button onClick={()=>setPostPhoto(null)} style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,.65)",border:"none",borderRadius:"50%",color:"white",width:24,height:24,cursor:"pointer",fontSize:13,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            ):(
              <button onClick={()=>fileRef.current?.click()} style={{
                width:"100%",padding:"10px 8px",
                background:"transparent",border:`1px dashed ${T.border}`,
                borderRadius:10,color:T.muted,fontSize:11,cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                minHeight:60,justifyContent:"center",
              }}>
                <span style={{fontSize:20}}>📷</span>
                <span>写真を追加</span>
              </button>
            )}
          </div>

          {/* 有効期限 */}
          <div style={{flexShrink:0}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:5}}>⏱️ 有効期限</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {[{v:"none",l:"なし"},{v:"6h",l:"6時間"},{v:"24h",l:"24時間"},{v:"3d",l:"3日間"}].map(o=>(
                <button key={o.v} onClick={()=>setPostExpiry(o.v)} style={{
                  padding:"4px 10px",fontSize:10,borderRadius:7,cursor:"pointer",
                  background:postExpiry===o.v?(isDark?"rgba(255,255,255,.1)":"rgba(0,0,0,.07)"):"transparent",
                  border:`1px solid ${postExpiry===o.v?T.sub:T.border}`,
                  color:postExpiry===o.v?T.text:T.muted,fontWeight:postExpiry===o.v?700:400,
                  whiteSpace:"nowrap",
                }}>{o.l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 認証されていない場合 */}
        {!isPhoneVerified && (
          <div style={{
            padding: "12px",
            marginBottom: "12px",
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: 10,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 12, color: T.text, marginBottom: 8, fontWeight: 700 }}>
              📱 投稿にはアカウント作成が必要です
            </div>
            <button
              onClick={onShowAuth}
              style={{
                padding: "8px 16px",
                background: "#3b82f6",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              アカウント作成
            </button>
          </div>
        )}

        {/* 場所を決めるボタン */}
        <button
          onClick={onConfirm}
          disabled={!canPost}
          style={{
            width:"100%",padding:"15px 0",
            background:canPost?`linear-gradient(135deg,${accentColor},${postType==="callout"?"#dc2626":postType==="event"?"#4f46e5":"#7c3aed"})`:(isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)"),
            border:`1px solid ${canPost?accentColor:T.border}`,
            borderRadius:14,cursor:canPost?"pointer":"not-allowed",
            color:canPost?"white":T.muted,
            fontSize:15,fontWeight:900,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            transition:"all .2s",
            boxShadow:canPost?`0 6px 24px ${accentColor}44`:"none",
          }}
        >
          <span>📍</span>
          {canPost?"場所を決める →":(postText.length<5?"5文字以上入力してください":validation.message||"入力を確認してください")}
        </button>
      </div>
    </div>
  );
}
