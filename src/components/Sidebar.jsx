import { useState, useMemo, useEffect, useRef } from "react";
import { CATEGORIES, NEED_TAGS } from "./PostForm";

// ─── プロフィールカラー定義 ───
export const HEADER_COLORS=[
  {id:"city",   grad:"linear-gradient(135deg,#1e3a5f,#2d6a9f)",    label:"夜の街"},
  {id:"park",   grad:"linear-gradient(135deg,#1a4731,#2d8a52)",    label:"公園"},
  {id:"sunset", grad:"linear-gradient(135deg,#7c3022,#e87a35)",    label:"夕暮れ"},
  {id:"rain",   grad:"linear-gradient(135deg,#2c3e50,#4a6fa5)",    label:"雨の日"},
  {id:"sakura", grad:"linear-gradient(135deg,#7e2d58,#c96490)",    label:"さくら"},
  {id:"night",  grad:"linear-gradient(135deg,#0a0c1a,#1e1b4b)",   label:"深夜"},
  {id:"morning",grad:"linear-gradient(135deg,#1c3f6e,#d4881a)",   label:"朝焼け"},
  {id:"earth",  grad:"linear-gradient(135deg,#3b2a1a,#7a5530)",   label:"大地"},
  {id:"neon",   grad:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",label:"ネオン"},
  {id:"ocean",  grad:"linear-gradient(135deg,#0575e6,#021b79)",   label:"海"},
];

// ─── ユーティリティ ───
function getDistance(lat1,lng1,lat2,lng2){const R=6371,dLat=((lat2-lat1)*Math.PI)/180,dLng=((lng2-lng1)*Math.PI)/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function timeAgo(ts){const d=Date.now()-ts,m=Math.floor(d/60000),h=Math.floor(m/60),day=Math.floor(h/24);if(day>0)return day+"日前";if(h>0)return h+"時間前";if(m>0)return m+"分前";return"今";}
function formatExpiry(ts){if(!ts)return null;const diff=ts-Date.now();if(diff<=0)return"期限切れ";if(diff<3600000)return`⏱ あと${Math.floor(diff/60000)}分`;if(diff<86400000)return`⏱ あと${Math.floor(diff/3600000)}時間`;return`⏱ あと${Math.floor(diff/86400000)}日`;}

const DAILY_MISSIONS=[
  {id:"post1",   label:"📝 今日初めて投稿する",   points:20},
  {id:"goodjob3",label:"✨ GoodJobを3回送る",      points:25},
  {id:"callout", label:"📢 呼びかけ投稿をする",    points:35},
  {id:"photo",   label:"📷 写真付きで投稿する",    points:30},
  {id:"walk1km", label:"🚶 今日1km以上歩く",       points:40},
];
const MOODS=["😄","😊","😐","😔","😩"];

// ─── コメント欄 ───
function CommentSection({post,currentUser,onComment,onDeleteComment,T,isDark}){
  const [text,setText]=useState("");
  return<div style={{marginTop:8,borderTop:`1px solid ${T.cardBorder}`,paddingTop:8}}>
    {(post.comments||[]).map(c=><div key={c.id} style={{display:"flex",gap:6,alignItems:"flex-start",padding:"5px 7px",background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",borderRadius:8,marginBottom:4}}>
      <div style={{fontSize:13,flex:1,color:T.sub,lineHeight:1.5,wordBreak:"break-all"}}><span style={{fontSize:11,fontWeight:700,color:c.userId===currentUser?"#3b82f6":T.muted,marginRight:4}}>{c.userId===currentUser?"あなた":"👤"}</span>{c.text}</div>
      <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}><span style={{fontSize:10,color:T.muted}}>{timeAgo(c.timestamp)}</span>{c.userId===currentUser&&<button style={{fontSize:10,color:"#ef4444",background:"transparent",border:"none",cursor:"pointer",padding:0}} onClick={()=>onDeleteComment(post.id,c.id)}>×</button>}</div>
    </div>)}
    <div style={{display:"flex",gap:6}}>
      <input value={text} onChange={e=>setText(e.target.value.slice(0,60))} placeholder="コメントする…" onKeyDown={e=>{if(e.key==="Enter"&&text.trim()){onComment(post.id,text);setText("");}}} style={{flex:1,padding:"6px 10px",background:isDark?"rgba(255,255,255,0.04)":"#f8fafc",border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:12,outline:"none"}}/>
      <button style={{padding:"6px 12px",background:text.trim()?"linear-gradient(135deg,#2563eb,#7c3aed)":"transparent",border:`1px solid ${text.trim()?"#3b82f6":T.border}`,borderRadius:8,color:text.trim()?"white":T.muted,fontSize:11,cursor:text.trim()?"pointer":"default",fontWeight:700}} onClick={()=>{if(text.trim()){onComment(post.id,text);setText("");}}}>送信</button>
    </div>
  </div>;
}

// ─── 投稿カード ───
function PostCard({post,posts,currentUser,userPosition,onGoodJob,onHelped,onDelete,onReport,onEdit,editingId,onEditSave,onShare,onReaction,onBookmark,bookmarks,onComment,onDeleteComment,onChain,onThanks,onPin,pinnedIds,onSetPinnedPost,profilePinnedPostId,T,isDark,highlight,isNew,onFlyTo}){
  const [editText,setEditText]=useState(post.text);
  const [showComments,setShowComments]=useState(false);
  const isEditing=editingId===post.id;
  const isOwner=post.userId===currentUser;
  const liked=(post.likedBy||[]).includes(currentUser);
  const helped=(post.helpedBy||[]).includes(currentUser);
  const alreadyReported=(post.reportedBy||[]).includes(currentUser);
  const isBookmarked=(bookmarks||[]).includes(post.id);
  const isPinned=(pinnedIds||[]).includes(post.id);
  const isRepPost=profilePinnedPostId===post.id;
  const dist=userPosition?getDistance(userPosition[0],userPosition[1],post.lat,post.lng):null;
  const distLabel=dist===null?"":dist<1?Math.round(dist*1000)+"m":dist.toFixed(1)+"km";
  const isCallout=post.postType==="callout";
  const isEvent=post.postType==="event";
  const respondCount=(post.reactions?.["💪"]||[]).length;
  const hasResponded=(post.reactions?.["💪"]||[]).includes(currentUser);
  const commentCount=(post.comments||[]).length;
  const expiryLabel=formatExpiry(post.expiresAt);
  const chainParent=post.chainId?posts.find(p=>p.id===post.chainId):null;
  const tags=post.tags||[];
  const needTags=post.needTags||[];
  const helpedCount=(post.helpedBy||[]).length;
  const isHotHelped=helpedCount>=3;
  const totalReactions=Object.values(post.reactions||{}).reduce((s,arr)=>s+arr.length,0);
  const cardBorder=isPinned?"rgba(251,191,36,0.4)":highlight?"rgba(59,130,246,0.5)":isHotHelped?"rgba(245,158,11,0.4)":isCallout?"rgba(245,158,11,0.25)":isEvent?"rgba(99,102,241,0.2)":post.chainId?"rgba(129,140,248,0.2)":T.cardBorder;
  const cardBg=isPinned?(isDark?"rgba(251,191,36,0.06)":"rgba(254,249,195,0.4)"):highlight?(isDark?"rgba(59,130,246,0.08)":"rgba(219,234,254,0.3)"):isHotHelped?(isDark?"rgba(245,158,11,0.05)":"rgba(254,243,199,0.35)"):T.card;

  return<div style={{background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:16,padding:"13px",position:"relative"}}>
    {isPinned&&<div style={{position:"absolute",top:-6,right:10,background:"#fbbf24",borderRadius:999,padding:"1px 8px",fontSize:9,color:"white",fontWeight:900}}>📌</div>}
    {isNew&&<div style={{position:"absolute",top:-6,left:10,background:"#ef4444",borderRadius:999,padding:"1px 8px",fontSize:9,color:"white",fontWeight:900}}>NEW</div>}
    {isHotHelped&&!isPinned&&<div style={{position:"absolute",top:-6,right:10,background:"#f59e0b",borderRadius:999,padding:"1px 8px",fontSize:9,color:"white",fontWeight:900}}>🙏 {helpedCount}人</div>}
    {chainParent&&<div style={{fontSize:10,color:"#818cf8",marginBottom:5}}>🔗 「{chainParent.text.slice(0,20)}…」に続けて</div>}
    {isCallout&&<div style={{fontSize:10,color:"#f59e0b",fontWeight:800,marginBottom:5,display:"flex",alignItems:"center",gap:4}}>📢 呼びかけ{respondCount>0&&<span style={{background:"rgba(245,158,11,0.15)",borderRadius:999,padding:"1px 7px"}}>{respondCount}人が応答</span>}</div>}
    {isEvent&&<div style={{fontSize:10,color:"#6366f1",fontWeight:800,marginBottom:5}}>📅 イベント</div>}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
      <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,background:isOwner?"rgba(99,102,241,0.15)":"rgba(14,165,233,0.1)",border:`1px solid ${isOwner?"rgba(99,102,241,0.25)":"rgba(14,165,233,0.15)"}`}}>{isOwner?"😊":"👤"}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:700,color:T.sub,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
          {isOwner?"あなた":"街の人"}
          {post.edited&&<span style={{fontSize:9,color:T.muted}}>編集済</span>}
          {expiryLabel&&<span style={{fontSize:9,color:"#f59e0b",background:"rgba(245,158,11,0.1)",borderRadius:999,padding:"1px 6px"}}>{expiryLabel}</span>}
          {totalReactions>0&&<span style={{fontSize:9,color:T.muted,background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",borderRadius:999,padding:"1px 6px"}}>反応{totalReactions}</span>}
        </div>
        <div style={{fontSize:10,color:T.muted,display:"flex",gap:5,marginTop:1}}><span>{timeAgo(post.timestamp)}</span>{distLabel&&<span>· {distLabel}</span>}</div>
      </div>
      <button style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:isBookmarked?"#fbbf24":T.muted,opacity:isBookmarked?1:0.5}} onClick={()=>onBookmark(post.id)}>{isBookmarked?"🔖":"☆"}</button>
    </div>
    {post.photo&&<img src={post.photo} style={{width:"100%",borderRadius:10,marginBottom:8,maxHeight:140,objectFit:"cover",border:`1px solid ${T.cardBorder}`}} alt=""/>}
    {isEditing?<div style={{marginTop:4}}>
      <textarea value={editText} onChange={e=>setEditText(e.target.value)} style={{width:"100%",background:isDark?"rgba(255,255,255,0.04)":"#f8fafc",border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:13,padding:"8px 10px",resize:"none",height:68,outline:"none",boxSizing:"border-box"}} maxLength={120} autoFocus/>
      <div style={{display:"flex",gap:6,alignItems:"center",marginTop:6}}><span style={{fontSize:11,color:T.muted,marginRight:"auto"}}>{editText.length}/120</span><button style={{background:isDark?"#fff":"#0f172a",color:isDark?"#0f172a":"#fff",border:"none",borderRadius:8,padding:"5px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>onEditSave(post.id,editText)}>保存</button><button style={{background:"transparent",color:T.sub,border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer"}} onClick={()=>onEdit(null)}>×</button></div>
    </div>:<p style={{fontSize:13,color:T.text,lineHeight:1.75,margin:"0 0 6px",wordBreak:"break-all"}}>{post.text}</p>}
    {tags.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{tags.map(tag=><span key={tag} style={{fontSize:10,color:"#3b82f6",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:999,padding:"2px 8px"}}>#{tag}</span>)}</div>}
    {needTags.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{needTags.map(id=>{const tag=NEED_TAGS.find(t=>t.id===id);return tag?<span key={id} style={{fontSize:10,color:"#10b981",background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:999,padding:"2px 8px"}}>{tag.label}</span>:null;})}</div>}
    {Object.keys(post.reactions||{}).some(k=>(post.reactions[k]||[]).length>0)&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{["👍","🎉","😢","💪","🙏"].filter(e=>(post.reactions?.[e]||[]).length>0).map(e=><button key={e} style={{padding:"2px 8px",background:(post.reactions?.[e]||[]).includes(currentUser)?(isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.06)"):"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:999,fontSize:12,cursor:"pointer",color:T.sub}} onClick={()=>onReaction(post.id,e)}>{e} {(post.reactions?.[e]||[]).length}</button>)}</div>}
    <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
      <button onClick={()=>onHelped(post.id)} style={{padding:"5px 12px",background:helped?(isDark?"rgba(245,158,11,.15)":"rgba(245,158,11,.09)"):"transparent",border:`1px solid ${helped?"#f59e0b":T.cardBorder}`,borderRadius:20,color:helped?"#f59e0b":T.sub,fontSize:12,cursor:"pointer",fontWeight:helped?700:400,display:"flex",alignItems:"center",gap:4}}>🙏 助かった{helpedCount>0&&<span style={{fontSize:11,fontWeight:700}}>{helpedCount}</span>}</button>
      {isCallout?<button style={{padding:"4px 10px",background:hasResponded?"rgba(245,158,11,0.15)":"transparent",border:`1px solid ${hasResponded?"#f59e0b":"rgba(245,158,11,0.35)"}`,borderRadius:20,color:"#f59e0b",fontSize:11,cursor:"pointer"}} onClick={()=>onReaction(post.id,"💪")}>💪{hasResponded?" 応答済":" 応答"}{respondCount>0?` (${respondCount})`:""}</button>
      :<button style={{padding:"4px 10px",background:liked?(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.05)"):"transparent",border:`1px solid ${liked?T.sub:T.cardBorder}`,borderRadius:20,color:liked?T.text:T.muted,fontSize:11,cursor:"pointer"}} onClick={()=>onGoodJob(post.id)}>✨{post.likes>0?` ${post.likes}`:""}</button>}
      <button style={{padding:"4px 9px",background:showComments?(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)"):"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:20,color:T.muted,fontSize:12,cursor:"pointer"}} onClick={()=>setShowComments(s=>!s)}>💬{commentCount>0?` ${commentCount}`:""}</button>
      <button style={{padding:"4px 8px",background:isPinned?"rgba(251,191,36,0.1)":"transparent",border:`1px solid ${isPinned?"#fbbf24":T.cardBorder}`,borderRadius:20,color:isPinned?"#fbbf24":T.muted,fontSize:11,cursor:"pointer"}} onClick={()=>onPin(post.id)}>📌</button>
      <button style={{padding:"4px 8px",background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:20,color:"#818cf8",fontSize:11,cursor:"pointer"}} onClick={()=>onChain(post.id)}>🔗</button>
      <button style={{padding:"4px 8px",background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:20,color:T.muted,fontSize:12,cursor:"pointer"}} onClick={()=>onShare(post)}>↗</button>
      {onFlyTo&&<button style={{padding:"4px 9px",background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.25)",borderRadius:20,color:"#3b82f6",fontSize:11,cursor:"pointer",fontWeight:700}} onClick={()=>onFlyTo(post)}>🗺️</button>}
      {isOwner&&!isEditing&&<button style={{padding:"4px 8px",background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:20,color:T.muted,fontSize:11,cursor:"pointer"}} onClick={()=>{setEditText(post.text);onEdit(post.id);}}>編集</button>}
      {isOwner&&onSetPinnedPost&&<button style={{padding:"4px 8px",background:isRepPost?"rgba(99,102,241,0.1)":"transparent",border:`1px solid ${isRepPost?"#818cf8":T.cardBorder}`,borderRadius:20,color:isRepPost?"#818cf8":T.muted,fontSize:10,cursor:"pointer"}} onClick={()=>onSetPinnedPost(post.id)}>{isRepPost?"📎代表中":"📎代表"}</button>}
      {isOwner&&<button style={{padding:"4px 8px",background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:20,color:"#ef4444",fontSize:11,cursor:"pointer"}} onClick={()=>onDelete(post.id)}>削除</button>}
      {!isOwner&&<button style={{padding:"4px 8px",background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:20,color:alreadyReported?T.muted:T.sub,fontSize:11,cursor:alreadyReported?"not-allowed":"pointer",opacity:alreadyReported?0.4:1}} onClick={()=>!alreadyReported&&onReport(post.id)}>{alreadyReported?"通報済":"通報"}</button>}
    </div>
    {showComments&&<CommentSection post={post} currentUser={currentUser} onComment={onComment} onDeleteComment={onDeleteComment} T={T} isDark={isDark}/>}
  </div>;
}

// ─── カレンダー ───
function CalendarPanel({posts,currentUser,T,isDark}){
  const [viewMonth,setViewMonth]=useState(()=>{const d=new Date();return{y:d.getFullYear(),m:d.getMonth()};});
  const today=new Date();
  const firstDay=new Date(viewMonth.y,viewMonth.m,1).getDay();
  const daysInMonth=new Date(viewMonth.y,viewMonth.m+1,0).getDate();
  const postMap=useMemo(()=>{const m={};posts.filter(p=>p.userId===currentUser).forEach(p=>{const d=new Date(p.timestamp);if(d.getFullYear()===viewMonth.y&&d.getMonth()===viewMonth.m){const k=d.getDate();m[k]=(m[k]||0)+1;}});return m;},[posts,currentUser,viewMonth]);
  const maxPosts=Math.max(...Object.values(postMap),1);
  return<div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:14,padding:"14px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <button style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"3px 8px",color:T.muted,fontSize:12,cursor:"pointer"}} onClick={()=>setViewMonth(v=>v.m===0?{y:v.y-1,m:11}:{y:v.y,m:v.m-1})}>‹</button>
      <span style={{fontSize:12,fontWeight:800,color:T.text}}>{viewMonth.y}年{viewMonth.m+1}月</span>
      <button style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"3px 8px",color:T.muted,fontSize:12,cursor:"pointer"}} onClick={()=>setViewMonth(v=>v.m===11?{y:v.y+1,m:0}:{y:v.y,m:v.m+1})}>›</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>{["日","月","火","水","木","金","土"].map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:T.muted}}>{d}</div>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
      {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
      {Array.from({length:daysInMonth},(_,i)=>{const day=i+1;const count=postMap[day]||0;const isToday=today.getFullYear()===viewMonth.y&&today.getMonth()===viewMonth.m&&today.getDate()===day;const intensity=count>0?Math.min(1,count/maxPosts):0;const bg=count>0?`rgba(59,130,246,${0.2+intensity*0.7})`:(isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)");return<div key={day} style={{aspectRatio:"1",borderRadius:6,background:bg,border:isToday?`2px solid #3b82f6`:`1px solid ${count>0?"rgba(59,130,246,0.2)":T.cardBorder}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,color:count>0?"#3b82f6":T.muted,fontWeight:isToday?900:400}}>{day}</span>{count>0&&<span style={{fontSize:8,color:"#3b82f6",fontWeight:700,lineHeight:1}}>{count}</span>}</div>;})}
    </div>
  </div>;
}

function MissionPanel({missionsDone,T,isDark}){
  const today=new Date().toDateString();
  const done=DAILY_MISSIONS.filter(m=>missionsDone[today+"_"+m.id]).length;
  const totalPt=DAILY_MISSIONS.filter(m=>missionsDone[today+"_"+m.id]).reduce((s,m)=>s+m.points,0);
  return<div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:14,padding:"14px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:12,fontWeight:800,color:T.text}}>🎯 今日のミッション</span><span style={{fontSize:11,color:"#fbbf24",fontWeight:700}}>{done}/{DAILY_MISSIONS.length} · +{totalPt}pt</span></div>
    {DAILY_MISSIONS.map(m=>{const cleared=!!missionsDone[today+"_"+m.id];return<div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${T.cardBorder}`,opacity:cleared?0.55:1}}><div style={{width:16,height:16,borderRadius:"50%",background:cleared?"linear-gradient(135deg,#10b981,#059669)":"transparent",border:`2px solid ${cleared?"transparent":T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"white",fontWeight:900}}>{cleared?"✓":""}</div><span style={{flex:1,fontSize:11,color:cleared?T.muted:T.sub,textDecoration:cleared?"line-through":"none"}}>{m.label}</span><span style={{fontSize:10,color:"#fbbf24",fontWeight:700}}>+{m.points}</span></div>;})}
  </div>;
}

function StatsChart({myPosts,T,isDark}){
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);const count=myPosts.filter(p=>{const pd=new Date(p.timestamp);return pd.getMonth()===d.getMonth()&&pd.getDate()===d.getDate();}).length;return{key:`${d.getMonth()+1}/${d.getDate()}`,count};}).reverse();
  const max=Math.max(...last7.map(d=>d.count),1);
  return<div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:12,padding:"14px"}}><div style={{fontSize:11,color:T.muted,marginBottom:10,fontWeight:700}}>📊 過去7日の投稿</div><div style={{display:"flex",alignItems:"flex-end",gap:4,height:48}}>{last7.map(d=><div key={d.key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div style={{width:"100%",background:d.count>0?"linear-gradient(180deg,#3b82f6,#6366f1)":(isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)"),borderRadius:"3px 3px 0 0",height:`${Math.max(4,(d.count/max)*42)}px`,transition:"height 0.4s"}}></div><div style={{fontSize:9,color:T.muted}}>{d.key}</div></div>)}</div></div>;
}

function TrajectoryPanel({isTracking,setIsTracking,todayDist,totalDist,trajectoryCount,onClearTrajectory,T,isDark}){
  return<div style={{background:T.card,border:`1px solid ${isTracking?"rgba(16,185,129,0.3)":T.cardBorder}`,borderRadius:14,padding:"14px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:isTracking?"#10b981":"#64748b",boxShadow:isTracking?"0 0 8px #10b981":"none"}}/><span style={{fontSize:12,fontWeight:800,color:T.text}}>🚶 移動軌跡</span></div><button style={{padding:"4px 12px",background:isTracking?"rgba(239,68,68,0.1)":"rgba(16,185,129,0.1)",border:`1px solid ${isTracking?"rgba(239,68,68,0.3)":"rgba(16,185,129,0.3)"}`,borderRadius:999,color:isTracking?"#ef4444":"#10b981",fontSize:11,fontWeight:700,cursor:"pointer"}} onClick={()=>setIsTracking(t=>!t)}>{isTracking?"⏹ 停止":"▶ 開始"}</button></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
      <div style={{background:isDark?"rgba(16,185,129,0.05)":"rgba(209,250,229,0.5)",border:"1px solid rgba(16,185,129,0.15)",borderRadius:10,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:900,color:"#10b981",lineHeight:1}}>{todayDist>=1?todayDist.toFixed(1):(todayDist*1000).toFixed(0)}</div><div style={{fontSize:9,color:T.muted,marginTop:3}}>{todayDist>=1?"km":"m"} 今日</div></div>
      <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:900,color:T.text,lineHeight:1}}>{totalDist>=1?totalDist.toFixed(1):(totalDist*1000).toFixed(0)}</div><div style={{fontSize:9,color:T.muted,marginTop:3}}>{totalDist>=1?"km":"m"} 累計</div></div>
    </div>
    {trajectoryCount>0&&<button style={{width:"100%",padding:"7px 0",background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,color:T.muted,fontSize:11,cursor:"pointer"}} onClick={onClearTrajectory}>🗑️ 軌跡をリセット</button>}
  </div>;
}

// ─── エリアタブ ───
function AreaTab({posts,currentUser,userPosition,postRadius,nearTotal,currentGoal,goalProgress,T,isDark}){
  const nearPosts=useMemo(()=>posts.filter(p=>{if(!userPosition)return false;return getDistance(userPosition[0],userPosition[1],p.lat,p.lng)<=postRadius;}),[posts,userPosition,postRadius]);
  const todayPosts=nearPosts.filter(p=>Date.now()-p.timestamp<86400000);
  const helpedTotal=nearPosts.reduce((s,p)=>s+(p.helpedBy||[]).length,0);
  const activeUserIds=new Set(todayPosts.map(p=>p.userId));
  const needTagRanking=useMemo(()=>{const m={};nearPosts.forEach(p=>{const cnt=(p.helpedBy||[]).length;if(cnt===0)return;(p.needTags||[]).forEach(id=>{m[id]=(m[id]||0)+cnt;});});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);},[nearPosts]);
  const hotPosts=useMemo(()=>[...nearPosts].filter(p=>(p.helpedBy||[]).length>0).sort((a,b)=>(b.helpedBy||[]).length-(a.helpedBy||[]).length).slice(0,3),[nearPosts]);

  return<div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>
    <div style={{background:isDark?"rgba(99,102,241,0.07)":"rgba(238,242,255,0.8)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:14,padding:"14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:12,fontWeight:800,color:T.text}}>🎯 この街の目標</span><span style={{fontSize:11,color:"#818cf8",fontWeight:700}}>{nearTotal} / {currentGoal.target}件</span></div>
      <div style={{fontSize:14,fontWeight:900,color:"#818cf8",marginBottom:4}}>{currentGoal.label}</div>
      <div style={{background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)",borderRadius:999,height:8,overflow:"hidden",marginBottom:6}}><div style={{height:"100%",width:`${goalProgress}%`,background:"linear-gradient(90deg,#6366f1,#818cf8)",borderRadius:999,transition:"width 0.6s"}}/></div>
      <div style={{fontSize:10,color:T.muted}}>達成報酬: {currentGoal.reward} · あと{currentGoal.target-nearTotal}件</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[{val:nearPosts.length,label:"総記録数",color:"#818cf8"},{val:todayPosts.length,label:"今日の記録",color:"#10b981"},{val:helpedTotal,label:"助かった計",color:"#f59e0b"},{val:activeUserIds.size,label:"今日の人数",color:"#3b82f6"}].map(({val,label,color})=><div key={label} style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:12,padding:"12px 8px",textAlign:"center"}}><div style={{fontSize:24,fontWeight:900,color,lineHeight:1}}>{val}</div><div style={{fontSize:10,color:T.muted,marginTop:4}}>{label}</div></div>)}</div>
    {needTagRanking.length>0&&<div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:14,padding:"13px"}}>
      <div style={{fontSize:12,fontWeight:800,color:T.text,marginBottom:10}}>🙏 よく助かっている場所タイプ</div>
      {needTagRanking.map(([id,cnt],i)=>{const tag=NEED_TAGS.find(t=>t.id===id);if(!tag)return null;const max=needTagRanking[0][1];return<div key={id} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:T.sub}}>{tag.label}</span><span style={{fontSize:11,color:"#f59e0b",fontWeight:700}}>🙏 {cnt}</span></div><div style={{background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.05)",borderRadius:999,height:5,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round((cnt/max)*100)}%`,background:i===0?"linear-gradient(90deg,#f59e0b,#fbbf24)":"linear-gradient(90deg,#10b981,#34d399)",borderRadius:999,transition:"width 0.7s"}}/></div></div>;})}
    </div>}
    {hotPosts.length>0&&<div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:14,padding:"13px"}}>
      <div style={{fontSize:12,fontWeight:800,color:T.text,marginBottom:10}}>🔥 よく助かった記録</div>
      {hotPosts.map((p,i)=><div key={p.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 10px",background:isDark?"rgba(245,158,11,0.06)":"rgba(254,243,199,0.5)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,marginBottom:6}}>
        <span style={{fontSize:14,fontWeight:900,color:"#f59e0b",flexShrink:0}}>#{i+1}</span>
        <div style={{flex:1,minWidth:0}}><p style={{fontSize:12,color:T.text,margin:"0 0 3px",lineHeight:1.55,wordBreak:"break-all"}}>{p.text.slice(0,50)}{p.text.length>50?"…":""}</p><div style={{display:"flex",gap:6,fontSize:10,color:T.muted}}><span>🙏 {(p.helpedBy||[]).length}人</span>{(p.needTags||[]).slice(0,2).map(id=>{const tag=NEED_TAGS.find(t=>t.id===id);return tag?<span key={id} style={{color:"#10b981"}}>{tag.label}</span>:null;})}</div></div>
      </div>)}
    </div>}
    <div style={{padding:"12px 14px",background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:14,textAlign:"center"}}><div style={{fontSize:12,fontWeight:900,color:"#f87171",marginBottom:3}}>📍 投稿エリア: 1km以内固定</div><div style={{fontSize:11,color:T.muted}}>現在地から1km以内にしか投稿できません</div></div>
  </div>;
}

// ─── プロフィールタブ（X/Instagram/Discord 統合スタイル）───
function ProfileTab({
  currentUser,myPostsCount,contributionScore,totalLikes,T,isDark,
  nickname,onEditNick,myPosts,streak,missionsDone,activeUsers,
  isTracking,setIsTracking,todayDist,totalDist,trajectoryCount,onClearTrajectory,
  currentChallenge,isChallengeCleared,earnedBadges,
  onShowDigest,pwaPrompt,onPwaInstall,mood,onMood,
  onShowStorage,storageKB,onShowTutorial,dailyQuote,allPosts,
  profileBio,onEditBio,
  profileMyTags,onEditMyTags,
  profileHeaderColor,onEditHeaderColor,
  profileAvatarEmoji,onEditAvatarEmoji,
  profilePinnedPostId,onSetPinnedPost,
}){
  const rank=contributionScore>=500?{label:"✨ まちの守護者",color:"#fbbf24",next:500}:contributionScore>=200?{label:"🌟 街の英雄",color:"#38bdf8",next:500}:contributionScore>=50?{label:"🌱 街の芽",color:"#4ade80",next:200}:{label:"👣 はじめの一歩",color:"#64748b",next:50};
  const progress=Math.min(100,(contributionScore/rank.next)*100);
  const today=new Date().toDateString();
  const todayMood=mood[today];
  const headerGrad=HEADER_COLORS.find(c=>c.id===profileHeaderColor)?.grad||HEADER_COLORS[0].grad;

  const pinnedProfilePost=useMemo(()=>profilePinnedPostId?allPosts.find(p=>p.id===profilePinnedPostId&&p.userId===currentUser):null,[profilePinnedPostId,allPosts,currentUser]);
  const recentMyPosts=useMemo(()=>[...myPosts].sort((a,b)=>b.timestamp-a.timestamp).slice(0,6),[myPosts]);
  const myTopTags=useMemo(()=>{const m={};myPosts.forEach(p=>(p.tags||[]).forEach(t=>{m[t]=(m[t]||0)+1;}));return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);},[myPosts]);
  const myTopNeedTags=useMemo(()=>{const m={};myPosts.forEach(p=>(p.needTags||[]).forEach(t=>{m[t]=(m[t]||0)+1;}));return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4);},[myPosts]);
  const myTotalHelped=useMemo(()=>myPosts.reduce((s,p)=>s+(p.helpedBy||[]).length,0),[myPosts]);

  // 街との関わり方サマリー
  const streetSummary=useMemo(()=>{
    const lines=[];
    if(myTopNeedTags.length>0){const topTag=NEED_TAGS.find(t=>t.id===myTopNeedTags[0][0]);if(topTag)lines.push(`${topTag.label}の記録が多め`);}
    if(myTotalHelped>0)lines.push(`${myTotalHelped}人に助かったと伝わった`);
    const hours=myPosts.map(p=>new Date(p.timestamp).getHours());
    if(hours.filter(h=>h>=21||h<5).length>2)lines.push("夜の街をよく歩く");
    else if(hours.filter(h=>h>=6&&h<10).length>2)lines.push("朝の街をよく歩く");
    return lines.slice(0,3);
  },[myPosts,myTopNeedTags,myTotalHelped]);

  return<div style={{display:"flex",flexDirection:"column",gap:0,overflowY:"auto"}}>
    {pwaPrompt&&<div style={{padding:"0 0 12px"}}><button style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#059669,#10b981)",color:"white",border:"none",borderRadius:14,fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={onPwaInstall}>📱 アプリをインストールする</button></div>}

    {/* ─── X/Instagram/Discord 統合プロフィールカード ─── */}
    <div style={{border:`1px solid ${T.cardBorder}`,borderRadius:20,overflow:"hidden",marginBottom:14}}>

      {/* ヘッダー画像（Xスタイル・クリックで変更） */}
      <div style={{height:110,background:headerGrad,position:"relative",cursor:"pointer"}} onClick={onEditHeaderColor}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.35))"}}/>
        <div style={{position:"absolute",bottom:8,right:10,fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:500,letterSpacing:"0.04em"}}>✏️ タップで変更</div>
        {/* ストリーク・ランク バッジ（右上）*/}
        {streak>0&&<div style={{position:"absolute",top:8,right:10,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",borderRadius:999,padding:"3px 10px",fontSize:10,color:"#fbbf24",fontWeight:800,border:"1px solid rgba(251,191,36,0.3)"}}>🔥 {streak}日連続</div>}
      </div>

      {/* アバター + 編集ボタン */}
      <div style={{background:T.card,padding:"0 16px 18px",position:"relative"}}>
        {/* Discord/Instagram 風アバター（ヘッダーにはみ出す） */}
        <div style={{position:"absolute",top:-38,left:16,width:76,height:76,borderRadius:"50%",background:isDark?"#0d1117":"#fff",border:`4px solid ${isDark?"#050810":"#f1f5f9"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.25)",transition:"transform .15s"}}
          onClick={onEditAvatarEmoji}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.06)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
        >
          {profileAvatarEmoji||"🚶"}
          {/* Discord 風オンラインインジケーター → 最近投稿した人のみ表示 */}
          {myPosts.some(p=>Date.now()-p.timestamp<86400000*3)&&(
            <div style={{position:"absolute",bottom:2,right:2,width:16,height:16,background:"#10b981",border:`3px solid ${isDark?"#050810":"#f1f5f9"}`,borderRadius:"50%"}} title="最近3日以内に記録あり"/>
          )}
        </div>

        {/* 編集ボタン（X スタイル・右寄せ） */}
        <div style={{display:"flex",justifyContent:"flex-end",paddingTop:10,marginBottom:14,gap:7}}>
          <button onClick={onEditNick} style={{padding:"6px 16px",background:"transparent",border:`1.5px solid ${T.border}`,borderRadius:999,fontSize:12,color:T.sub,cursor:"pointer",fontWeight:700,transition:"all .15s"}}>プロフィール編集</button>
        </div>

        {/* 名前 + ランクバッジ（Xスタイル） */}
        <div style={{marginTop:6}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
            <span style={{fontSize:18,fontWeight:900,color:T.text,letterSpacing:"-0.02em"}}>{nickname||"名無し"}</span>
            {/* 認証バッジ的なランクアイコン */}
            <span style={{fontSize:10,color:rank.color,fontWeight:700,background:`${rank.color}15`,border:`1px solid ${rank.color}30`,borderRadius:999,padding:"2px 9px",letterSpacing:"0.02em"}}>{rank.label}</span>
          </div>

          {/* Discord 風のステータステキスト / Bio */}
          <div style={{fontSize:13,color:profileBio?T.sub:"#64748b",lineHeight:1.65,marginBottom:10,cursor:"pointer",fontStyle:profileBio?"normal":"italic",minHeight:20,borderLeft:profileBio?`3px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`:undefined,paddingLeft:profileBio?"10px":undefined}} onClick={onEditBio}>
            {profileBio||"この街とどう関わっているか、一言で…"}
          </div>

          {/* マイタグ（Instagram ハッシュタグ風） */}
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
            {(profileMyTags||[]).map(tag=>(
              <span key={tag} style={{fontSize:11,color:"#3b82f6",fontWeight:600,cursor:"default"}}>#{tag}</span>
            ))}
            <button onClick={onEditMyTags} style={{fontSize:11,color:T.muted,background:"transparent",border:`1px dashed ${T.border}`,borderRadius:999,padding:"2px 8px",cursor:"pointer"}}>
              {(profileMyTags||[]).length===0?"+ タグ追加":"+ 編集"}
            </button>
          </div>

          {/* X/Instagram 風 フォロワー行 → このアプリは「記録・助かった・貢献」 */}
          <div style={{display:"flex",gap:16,paddingTop:10,borderTop:`1px solid ${T.cardBorder}`}}>
            {[
              {val:myPostsCount,     label:"記録",   color:T.text},
              {val:myTotalHelped,    label:"助かった", color:"#f59e0b"},
              {val:contributionScore,label:"貢献度",  color:rank.color},
            ].map(({val,label,color})=>(
              <div key={label} style={{display:"flex",alignItems:"baseline",gap:4}}>
                <span style={{fontSize:16,fontWeight:900,color}}>{val}</span>
                <span style={{fontSize:11,color:T.muted}}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ─ 街との関わり方サマリー（Discord アクティビティ風） ─ */}
    {streetSummary.length>0&&(
      <div style={{background:isDark?"rgba(16,185,129,0.06)":"rgba(209,250,229,0.4)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:13,padding:"11px 14px",marginBottom:12}}>
        <div style={{fontSize:10,color:"#10b981",fontWeight:700,marginBottom:7,letterSpacing:"0.04em"}}>🌏 この人の街との関わり方</div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {streetSummary.map((line,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:4,height:4,borderRadius:"50%",background:"#10b981",flexShrink:0}}/>
              <span style={{fontSize:12,color:T.sub,lineHeight:1.5}}>{line}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* ─ ランクプログレス ─ */}
    <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:13,padding:"12px 14px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:rank.color,fontSize:11,fontWeight:700}}>次のランクまで</span><span style={{color:T.muted,fontSize:11}}>{contributionScore} / {rank.next}</span></div>
      <div style={{background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",borderRadius:3,height:5,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:progress+"%",background:`linear-gradient(90deg,${rank.color}66,${rank.color})`,transition:"width 0.7s"}}/></div>
    </div>

    {/* ─ カレンダー ─ */}
    <div style={{marginBottom:12}}><CalendarPanel posts={allPosts} currentUser={currentUser} T={T} isDark={isDark}/></div>

    {/* ─ 代表記録（X のピン留めツイート風） ─ */}
    <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:13,padding:"13px",marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:800,color:T.text,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{display:"flex",alignItems:"center",gap:5}}>📎 代表記録<span style={{fontSize:9,color:T.muted,fontWeight:400}}>（ピン留め）</span></span>
        {pinnedProfilePost&&<button onClick={()=>onSetPinnedPost(profilePinnedPostId)} style={{fontSize:9,color:T.muted,background:"transparent",border:`1px solid ${T.border}`,borderRadius:6,padding:"2px 7px",cursor:"pointer"}}>解除</button>}
      </div>
      {pinnedProfilePost?(
        <div style={{padding:"9px 11px",background:isDark?"rgba(99,102,241,0.06)":"rgba(238,242,255,0.7)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10}}>
          <p style={{fontSize:12,color:T.text,margin:"0 0 5px",lineHeight:1.65}}>{pinnedProfilePost.text.slice(0,80)}{pinnedProfilePost.text.length>80?"…":""}</p>
          <div style={{display:"flex",gap:8,fontSize:10,color:T.muted}}>
            <span>{timeAgo(pinnedProfilePost.timestamp)}</span>
            {(pinnedProfilePost.helpedBy||[]).length>0&&<span style={{color:"#f59e0b"}}>🙏{(pinnedProfilePost.helpedBy||[]).length}</span>}
            {pinnedProfilePost.likes>0&&<span>✨{pinnedProfilePost.likes}</span>}
          </div>
        </div>
      ):(
        <div style={{fontSize:11,color:T.muted,textAlign:"center",padding:"8px 0",lineHeight:1.7}}>フィードの投稿に「📎代表」ボタンで設定できます</div>
      )}
    </div>

    {/* ─ 活動傾向（よく使うタグ） ─ */}
    {(myTopTags.length>0||myTopNeedTags.length>0)&&(
      <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:13,padding:"13px",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:800,color:T.text,marginBottom:10}}>📊 よく残す記録</div>
        {myTopTags.length>0&&<div style={{marginBottom:8}}>
          <div style={{fontSize:10,color:T.muted,marginBottom:5}}>ハッシュタグ</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{myTopTags.map(([tag,cnt])=><span key={tag} style={{fontSize:10,color:"#3b82f6",background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.2)",borderRadius:999,padding:"2px 8px"}}>#{tag}<span style={{opacity:.6,marginLeft:2}}>{cnt}</span></span>)}</div>
        </div>}
        {myTopNeedTags.length>0&&<div>
          <div style={{fontSize:10,color:T.muted,marginBottom:5}}>役立ち場所タグ</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{myTopNeedTags.map(([id,cnt])=>{const tag=NEED_TAGS.find(t=>t.id===id);return tag?<span key={id} style={{fontSize:10,color:"#10b981",background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:999,padding:"2px 8px"}}>{tag.label}<span style={{opacity:.6,marginLeft:2}}>{cnt}</span></span>:null;})}</div>
        </div>}
      </div>
    )}

    {/* ─ バッジ（コンパクト・控えめに） ─ */}
    {earnedBadges.length>0&&(
      <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:13,padding:"11px 13px",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,display:"flex",justifyContent:"space-between"}}>
          <span>🏅 バッジ</span>
          <span style={{color:T.muted,fontWeight:400}}>{earnedBadges.length}個</span>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {earnedBadges.map(b=>(
            <span key={b.id} style={{fontSize:10,color:T.sub,background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",border:`1px solid ${T.cardBorder}`,borderRadius:999,padding:"3px 9px"}}>
              {b.label}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* ─ Today's Quote（シンプルに） ─ */}
    <div style={{background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",border:`1px solid ${T.cardBorder}`,borderRadius:11,padding:"10px 13px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:14,flexShrink:0}}>💬</span>
      <div style={{fontSize:11,color:T.muted,lineHeight:1.65,fontStyle:"italic"}}>{dailyQuote}</div>
    </div>

    {/* ─ 今日のステータス（Discord 風・コンパクト） ─ */}
    <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:11,padding:"10px 13px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:todayMood?"#f59e0b":"#475569",display:"inline-block"}}/>
        <span style={{fontSize:10,color:T.muted}}>今日</span>
      </div>
      <div style={{display:"flex",gap:4}}>
        {MOODS.map(m=>(
          <button key={m} style={{fontSize:18,background:todayMood===m?(isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.07)"):"transparent",border:`1.5px solid ${todayMood===m?"#3b82f6":"transparent"}`,borderRadius:8,padding:"3px 4px",cursor:"pointer",lineHeight:1,transform:todayMood===m?"scale(1.1)":"scale(1)",transition:"all 0.15s"}} onClick={()=>onMood(m)}>{m}</button>
        ))}
      </div>
      {todayMood&&<span style={{fontSize:11,color:T.muted,marginLeft:"auto"}}>{todayMood}</span>}
    </div>

    {/* ─ 最近の記録（Instagram 風グリッド → リスト） ─ */}
    {recentMyPosts.length>0&&(
      <div style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:13,padding:"13px",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:800,color:T.text,marginBottom:10}}>🕐 最近の記録</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {recentMyPosts.map(p=>(
            <div key={p.id} style={{padding:"8px 11px",background:isDark?"rgba(255,255,255,.03)":"rgba(0,0,0,.03)",border:`1px solid ${T.cardBorder}`,borderRadius:10}}>
              <p style={{fontSize:12,color:T.text,margin:"0 0 4px",lineHeight:1.6}}>{p.text.slice(0,55)}{p.text.length>55?"…":""}</p>
              <div style={{display:"flex",gap:8,fontSize:10,color:T.muted}}>
                <span>{timeAgo(p.timestamp)}</span>
                {(p.helpedBy||[]).length>0&&<span style={{color:"#f59e0b"}}>🙏 {(p.helpedBy||[]).length}</span>}
                {p.likes>0&&<span>✨ {p.likes}</span>}
                {(p.needTags||[]).length>0&&<span style={{color:"#10b981"}}>🏷️ {(p.needTags||[]).length}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* ─ 移動軌跡 ─ */}
    <div style={{marginBottom:12}}><TrajectoryPanel isTracking={isTracking} setIsTracking={setIsTracking} todayDist={todayDist} totalDist={totalDist} trajectoryCount={trajectoryCount} onClearTrajectory={onClearTrajectory} T={T} isDark={isDark}/></div>
    <div style={{marginBottom:12}}><MissionPanel missionsDone={missionsDone} T={T} isDark={isDark}/></div>
    <div style={{marginBottom:12}}><StatsChart myPosts={myPosts} T={T} isDark={isDark}/></div>

    {/* ─ 設定・管理 ─ */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
      <button style={{padding:"10px 0",background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:`1px solid ${T.border}`,borderRadius:12,color:T.sub,fontSize:11,fontWeight:700,cursor:"pointer"}} onClick={onShowDigest}>📰 ダイジェスト</button>
      <button style={{padding:"10px 0",background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:`1px solid ${T.border}`,borderRadius:12,color:T.sub,fontSize:11,fontWeight:700,cursor:"pointer"}} onClick={onShowTutorial}>📖 使い方</button>
      <button style={{padding:"10px 0",background:storageKB>4000?"rgba(239,68,68,0.06)":isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:`1px solid ${storageKB>4000?"rgba(239,68,68,0.3)":T.border}`,borderRadius:12,color:storageKB>4000?"#ef4444":T.sub,fontSize:11,fontWeight:700,cursor:"pointer"}} onClick={onShowStorage}>🗄️ 投稿管理</button>
      <div style={{padding:"10px",background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)",border:`1px solid ${T.border}`,borderRadius:12,textAlign:"center"}}><div style={{fontSize:9,color:T.muted,marginBottom:3}}>今日の気分</div><div style={{fontSize:20}}>{mood[new Date().toDateString()]||"—"}</div></div>
    </div>
  </div>;
}

// ─── 探すパネル ───
function ExplorePanel({posts,userPosition,onFlyTo,T,isDark}){
  const [selectedTags,setSelectedTags]=useState([]);
  const toggleTag=id=>setSelectedTags(prev=>prev.includes(id)?prev.filter(t=>t!==id):[...prev,id]);

  const results=useMemo(()=>{
    const now=Date.now();
    let base=posts.filter(p=>!p.hidden&&(!p.expiresAt||p.expiresAt>now));

    // タグ絞り込み
    if(selectedTags.length>0)base=base.filter(p=>(p.needTags||[]).some(t=>selectedTags.includes(t)));
    else base=base.filter(p=>(p.needTags||[]).length>0);

    return [...base].sort((a,b)=>{
      const distA=userPosition?getDistance(userPosition[0],userPosition[1],a.lat,a.lng):9999;
      const distB=userPosition?getDistance(userPosition[0],userPosition[1],b.lat,b.lng):9999;

      // スコア計算: 近さ・助かった実績・鮮度・有効期限の長さ（常設性）
      const helpedA=(a.helpedBy||[]).length;
      const helpedB=(b.helpedBy||[]).length;

      // 距離ペナルティ（km）: 近いほど低い
      const distScore = d => Math.min(d / 0.5, 5); // 500m以内は0〜1

      // 鮮度スコア（7日以内を新鮮、それ以降は緩やかに下がる）
      const freshnessA = Math.max(0, 1 - (now - a.timestamp) / (7 * 86400000));
      const freshnessB = Math.max(0, 1 - (now - b.timestamp) / (7 * 86400000));

      // 常設スコア（有効期限なし=常設、または長期=高スコア）
      const permanenceA = !a.expiresAt ? 1 : Math.min(1,(a.expiresAt-now)/(86400000*3));
      const permanenceB = !b.expiresAt ? 1 : Math.min(1,(b.expiresAt-now)/(86400000*3));

      const scoreA = helpedA * 2 + freshnessA * 1.5 + permanenceA - distScore(distA);
      const scoreB = helpedB * 2 + freshnessB * 1.5 + permanenceB - distScore(distB);

      return scoreB - scoreA;
    });
  },[posts,selectedTags,userPosition]);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:10,flex:1,overflow:"hidden"}}>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:T.sub,marginBottom:7}}>役立つ場所を探す</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {NEED_TAGS.map(tag=>{
            const sel=selectedTags.includes(tag.id);
            const cnt=posts.filter(p=>!p.hidden&&(p.needTags||[]).includes(tag.id)).length;
            if(cnt===0)return null;
            return<button key={tag.id} onClick={()=>toggleTag(tag.id)} style={{padding:"5px 10px",fontSize:11,borderRadius:999,cursor:"pointer",background:sel?(isDark?"rgba(16,185,129,.2)":"rgba(16,185,129,.12)"):"transparent",border:`1px solid ${sel?"#10b981":T.border}`,color:sel?"#10b981":T.muted,fontWeight:sel?700:400,transition:"all .15s",display:"flex",alignItems:"center",gap:4}}>{tag.label}<span style={{fontSize:10,opacity:.7}}>{cnt}</span></button>;
          })}
        </div>
        {selectedTags.length>0&&<button style={{marginTop:6,fontSize:10,color:T.muted,background:"transparent",border:"none",cursor:"pointer"}} onClick={()=>setSelectedTags([])}>✕ クリア</button>}
      </div>

      <div style={{fontSize:11,color:T.muted,display:"flex",gap:6,alignItems:"center"}}>
        <span><span style={{color:T.sub,fontWeight:700}}>{results.length}</span> 件</span>
        <span style={{fontSize:9,opacity:.7}}>· 助かった実績 + 近さ + 新鮮さで並び替え</span>
      </div>

      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:7}}>
        {results.length===0?(
          <div style={{textAlign:"center",padding:"40px 0",color:T.muted}}><div style={{fontSize:36,marginBottom:8}}>🔍</div><div style={{fontSize:13}}>該当する記録がありません</div></div>
        ):results.map(post=>{
          const dist=userPosition?getDistance(userPosition[0],userPosition[1],post.lat,post.lng):null;
          const distLabel=dist===null?"":dist<1?Math.round(dist*1000)+"m":dist.toFixed(1)+"km";
          const helpedCount=(post.helpedBy||[]).length;
          const isHot=helpedCount>=3;
          return(
            <div key={post.id} style={{background:isHot?(isDark?"rgba(245,158,11,0.06)":"rgba(254,243,199,0.4)"):T.card,border:`1px solid ${isHot?"rgba(245,158,11,0.3)":T.cardBorder}`,borderRadius:13,padding:"11px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
                <div style={{flex:1,minWidth:0}}>
                  {isHot&&<div style={{fontSize:9,color:"#f59e0b",fontWeight:700,marginBottom:4}}>🔥 よく助かっています</div>}
                  <p style={{fontSize:13,color:T.text,margin:"0 0 5px",lineHeight:1.6,wordBreak:"break-all"}}>{post.text.slice(0,60)}{post.text.length>60?"…":""}</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(post.needTags||[]).map(id=>{const tag=NEED_TAGS.find(t=>t.id===id);return tag?<span key={id} style={{fontSize:10,color:"#10b981",background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:999,padding:"2px 7px"}}>{tag.label}</span>:null;})}</div>
                </div>
                <button onClick={()=>onFlyTo(post)} style={{flexShrink:0,padding:"7px 11px",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:10,color:"#3b82f6",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>🗺️ 地図</button>
              </div>
              <div style={{display:"flex",gap:8,fontSize:10,color:T.muted}}>
                {distLabel&&<span>📍 {distLabel}</span>}
                {helpedCount>0&&<span style={{color:"#f59e0b",fontWeight:700}}>🙏 {helpedCount}人</span>}
                <span>{timeAgo(post.timestamp)}</span>
                {!post.expiresAt&&<span style={{color:"#10b981"}}>常設</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sidebar 本体 ───
export default function Sidebar(props){
  const{
    activeTab,setActiveTab,radius,posts,currentUser,userPosition,
    searchText,setSearchText,sortMode,setSortMode,
    onGoodJob,onHelped,onDelete,onReport,onEdit,editingId,onEditSave,
    onShare,onReaction,onBookmark,bookmarks,onComment,onDeleteComment,
    onStartPost,isFrozen,myPostsCount,contributionScore,totalLikes,unreadCount,
    onShowNotif,isDark,setIsDark,T,nickname,onEditNick,myPosts,streak,missionsDone,
    onChain,onThanks,activeUsers,
    isTracking,setIsTracking,todayDist,totalDist,trajectoryCount,onClearTrajectory,
    currentChallenge,isChallengeCleared,earnedBadges,postRadius,
    highlightMine,setHighlightMine,onShowDigest,pwaPrompt,onPwaInstall,
    nearTotal,currentGoal,goalProgress,lastPostId,gpsError,
    pinnedIds,onPin,newPostCount,seenIds,
    onShowStorage,storageKB,mood,onMood,onShowTutorial,dailyQuote,
    allPosts,postsLoading,onHelped:onHelpedIgnored,onShowTerms,onShowGuide,onFlyTo,
    profileBio,onEditBio,profileMyTags,onEditMyTags,
    profileHeaderColor,onEditHeaderColor,profileAvatarEmoji,onEditAvatarEmoji,
    profilePinnedPostId,onSetPinnedPost,
  }=props;

  const [filterTag,setFilterTag]=useState("");
  const [filterDate,setFilterDate]=useState("all");
  const [filterDist,setFilterDist]=useState("all");
  const [exploreMode,setExploreMode]=useState(false);
  const feedRef=useRef(null);

  const filteredPosts=useMemo(()=>{
    const now=Date.now();
    const dateMs={all:null,today:86400000,week:604800000,month:2592000000};
    const distKm={all:null,"0.5":0.5,"1":1,"3":3};
    let wd=posts.filter(p=>!p.hidden)
      .map(p=>({...p,_dist:userPosition?getDistance(userPosition[0],userPosition[1],p.lat,p.lng):9999}))
      .filter(p=>p._dist<=(radius||999))
      .filter(p=>filterTag?(p.tags||[]).some(t=>t.toLowerCase().includes(filterTag.toLowerCase())):true)
      .filter(p=>dateMs[filterDate]?now-p.timestamp<=dateMs[filterDate]:true)
      .filter(p=>distKm[filterDist]?p._dist<=distKm[filterDist]:true);
    if(searchText.trim()){
      const all=posts.filter(p=>!p.hidden&&p.text.includes(searchText.trim()))
        .map(p=>({...p,_dist:userPosition?getDistance(userPosition[0],userPosition[1],p.lat,p.lng):9999}));
      return [...all].sort((a,b)=>a._dist-b._dist);
    }
    const pinned=wd.filter(p=>(pinnedIds||[]).includes(p.id));
    const unpinned=wd.filter(p=>!(pinnedIds||[]).includes(p.id));
    const sorted=sortMode==="new"?[...unpinned].sort((a,b)=>b.timestamp-a.timestamp):sortMode==="hot"?[...unpinned].sort((a,b)=>b.likes-a.likes):[...unpinned].sort((a,b)=>a._dist-b._dist);
    return[...pinned,...sorted];
  },[posts,userPosition,radius,searchText,filterTag,sortMode,filterDate,filterDist,pinnedIds,currentUser]);

  useEffect(()=>{if(lastPostId&&activeTab==="feed"&&feedRef.current){setTimeout(()=>feedRef.current?.scrollTo({top:0,behavior:"smooth"}),200);}},[lastPostId]);
  const bookmarkedPosts=useMemo(()=>posts.filter(p=>bookmarks.includes(p.id)),[posts,bookmarks]);
  const todayDone=Object.keys(missionsDone||{}).filter(k=>k.startsWith(new Date().toDateString())).length;
  const allTags=useMemo(()=>{const m={};posts.forEach(p=>(p.tags||[]).forEach(t=>{m[t]=(m[t]||0)+1;}));return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,8);},[posts]);
  const tabs=[{id:"feed",label:"フィード"},{id:"bookmark",label:"🔖"},{id:"area",label:"エリア"},{id:"profile",label:"プロフ"}];

  const cardProps=(post)=>({
    post,posts,currentUser,userPosition,
    onGoodJob,onHelped:props.onHelped,onDelete,onReport,onEdit,editingId,onEditSave,
    onShare,onReaction,onBookmark,bookmarks,onComment,onDeleteComment,
    onChain,onThanks,onPin,pinnedIds,onSetPinnedPost,profilePinnedPostId,
    T,isDark,onFlyTo,
  });

  return<div style={{width:300,minWidth:300,height:"100vh",background:T.bg,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>

    {/* ─ ヘッダー ─ */}
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 18px 12px",borderBottom:`1px solid ${T.border}`}}>
      <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#2563eb,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 12px rgba(37,99,235,0.4)"}}>🌍</div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:900,color:T.text,letterSpacing:"-0.02em"}}>善意マップ</div>
        <div style={{fontSize:9,color:T.muted,marginTop:1}}>{activeUsers>0?`👥 ${activeUsers}人 · `:""}1km圏内の記録</div>
      </div>
      {streak>0&&<div style={{fontSize:11,color:"#fbbf24",fontWeight:800}}>🔥{streak}</div>}
      {isTracking&&<div style={{width:7,height:7,borderRadius:"50%",background:"#10b981",boxShadow:"0 0 6px #10b981",flexShrink:0}}/>}
      <button style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}} onClick={()=>setIsDark(d=>!d)}>{isDark?"☀️":"🌙"}</button>
      <button style={{position:"relative",background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}} onClick={onShowNotif}>🔔{unreadCount>0&&<div style={{position:"absolute",top:-4,right:-4,width:15,height:15,background:"#ef4444",borderRadius:"50%",fontSize:9,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{unreadCount>9?"9+":unreadCount}</div>}</button>
    </div>

    {!isChallengeCleared&&<div style={{margin:"6px 18px 0",padding:"7px 10px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12}}>🏆</span><div style={{flex:1}}><div style={{fontSize:10,fontWeight:800,color:"#818cf8"}}>{currentChallenge.theme}</div><div style={{fontSize:9,color:T.muted}}>{currentChallenge.desc}</div></div><span style={{fontSize:10,color:"#818cf8",fontWeight:700,flexShrink:0}}>+{currentChallenge.bonus}pt</span></div>}

    <div style={{padding:"6px 18px 0"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:9,color:T.muted}}>🎯 {currentGoal.label}</span><span style={{fontSize:9,color:"#818cf8",fontWeight:700}}>{nearTotal}/{currentGoal.target}</span></div><div style={{background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",borderRadius:2,height:3,overflow:"hidden"}}><div style={{height:"100%",width:`${goalProgress}%`,background:"linear-gradient(90deg,#6366f1,#818cf8)",transition:"width 0.5s"}}/></div></div>

    <div style={{padding:"8px 18px 6px"}}>
      <button style={{width:"100%",padding:"13px 0",background:isFrozen?(isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.04)"):"linear-gradient(135deg,#2563eb,#7c3aed)",color:isFrozen?T.muted:"white",border:"none",borderRadius:14,fontSize:14,fontWeight:800,cursor:isFrozen?"not-allowed":"pointer",boxShadow:isFrozen?"none":"0 4px 20px rgba(37,99,235,0.35)",transition:"all 0.2s"}} onClick={onStartPost} disabled={isFrozen}>{isFrozen?"⚠️ 投稿制限中":"📍 まちに残す（1km以内）"}</button>
    </div>

    {todayDone>0&&<div style={{padding:"0 18px 6px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,color:T.muted}}>🎯 今日のミッション</span><span style={{fontSize:10,color:"#fbbf24",fontWeight:700}}>{todayDone}/{DAILY_MISSIONS.length}</span></div><div style={{background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)",borderRadius:2,height:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,width:`${(todayDone/DAILY_MISSIONS.length)*100}%`,background:"linear-gradient(90deg,#fbbf24,#f59e0b)",transition:"width 0.5s"}}/></div></div>}

    <div style={{display:"flex",padding:"0 18px",gap:3,marginBottom:8}}>
      {tabs.map(({id,label})=><button key={id} style={{flex:1,padding:"6px 2px",background:activeTab===id?(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"):"transparent",color:activeTab===id?T.text:T.muted,border:`1px solid ${activeTab===id?T.sub:"transparent"}`,borderRadius:10,cursor:"pointer",fontSize:9,fontWeight:activeTab===id?800:400,transition:"all 0.15s",position:"relative"}} onClick={()=>{setActiveTab(id);if(id!=="feed")setExploreMode(false);}}>
        {label}{id==="feed"&&newPostCount>0&&<div style={{position:"absolute",top:-5,right:-2,width:14,height:14,background:"#ef4444",borderRadius:"50%",fontSize:8,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{newPostCount>9?"9+":newPostCount}</div>}
      </button>)}
    </div>

    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"0 18px 18px"}}>
      {activeTab==="feed"&&<>
        <div style={{position:"relative",marginBottom:8}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none",color:T.muted}}>🔍</span>
          <input type="text" placeholder="検索" value={searchText} onChange={e=>setSearchText(e.target.value)}
            style={{width:"100%",padding:"8px 36px 8px 32px",background:T.input,border:`1px solid ${searchText?T.sub:T.border}`,borderRadius:10,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box",transition:"border-color .2s"}}/>
          {searchText&&<button style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:14,lineHeight:1,padding:"4px"}} onClick={()=>setSearchText("")}>×</button>}
        </div>
        <div style={{display:"flex",gap:5,marginBottom:8}}>
          <button style={{flex:1,padding:"7px 0",background:!exploreMode?(isDark?"rgba(59,130,246,.15)":"rgba(37,99,235,.08)"):"transparent",border:`1px solid ${!exploreMode?"#3b82f6":T.border}`,borderRadius:10,color:!exploreMode?"#3b82f6":T.muted,fontSize:12,fontWeight:!exploreMode?800:400,cursor:"pointer"}} onClick={()=>setExploreMode(false)}>📋 フィード</button>
          <button style={{flex:1,padding:"7px 0",background:exploreMode?(isDark?"rgba(16,185,129,.15)":"rgba(16,185,129,.08)"):"transparent",border:`1px solid ${exploreMode?"#10b981":T.border}`,borderRadius:10,color:exploreMode?"#10b981":T.muted,fontSize:12,fontWeight:exploreMode?800:400,cursor:"pointer"}} onClick={()=>setExploreMode(true)}>🔍 探す</button>
        </div>
        {exploreMode?(
          <ExplorePanel posts={posts} userPosition={userPosition} onFlyTo={onFlyTo} T={T} isDark={isDark}/>
        ):(
          <>
            {/* フィルター */}
            <div style={{marginBottom:8}}>
              <details>
                <summary style={{fontSize:11,color:T.muted,cursor:"pointer",userSelect:"none",padding:"4px 0",listStyle:"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>詳細フィルター</span><span>▼</span></summary>
                <div style={{padding:"8px",background:isDark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)",border:`1px solid ${T.border}`,borderRadius:"0 0 10px 10px",display:"flex",flexDirection:"column",gap:6,marginTop:-1}}>
                  <div><div style={{fontSize:10,color:T.muted,marginBottom:4}}>📅 日付</div><div style={{display:"flex",gap:4}}>{[{id:"all",label:"全期間"},{id:"today",label:"今日"},{id:"week",label:"今週"},{id:"month",label:"今月"}].map(f=><button key={f.id} style={{flex:1,padding:"4px 0",background:filterDate===f.id?(isDark?"rgba(59,130,246,0.15)":"rgba(59,130,246,0.1)"):"transparent",border:`1px solid ${filterDate===f.id?"#3b82f6":T.border}`,borderRadius:7,color:filterDate===f.id?"#3b82f6":T.muted,fontSize:9,cursor:"pointer"}} onClick={()=>setFilterDate(f.id)}>{f.label}</button>)}</div></div>
                  <div><div style={{fontSize:10,color:T.muted,marginBottom:4}}>📍 距離</div><div style={{display:"flex",gap:4}}>{[{id:"all",label:"全て"},{id:"0.5",label:"500m"},{id:"1",label:"1km"},{id:"3",label:"3km"}].map(f=><button key={f.id} style={{flex:1,padding:"4px 0",background:filterDist===f.id?(isDark?"rgba(16,185,129,0.15)":"rgba(16,185,129,0.1)"):"transparent",border:`1px solid ${filterDist===f.id?"#10b981":T.border}`,borderRadius:7,color:filterDist===f.id?"#10b981":T.muted,fontSize:9,cursor:"pointer"}} onClick={()=>setFilterDist(f.id)}>{f.label}</button>)}</div></div>
                </div>
              </details>
            </div>
            {allTags.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}><button style={{padding:"3px 8px",background:!filterTag?(isDark?"rgba(59,130,246,0.15)":"rgba(59,130,246,0.1)"):"transparent",border:`1px solid ${!filterTag?"#3b82f6":T.border}`,borderRadius:999,color:!filterTag?"#3b82f6":T.muted,fontSize:10,cursor:"pointer"}} onClick={()=>setFilterTag("")}>すべて</button>{allTags.map(([tag,count])=><button key={tag} style={{padding:"3px 7px",background:filterTag===tag?"rgba(59,130,246,0.12)":"transparent",border:`1px solid ${filterTag===tag?"#3b82f6":T.border}`,borderRadius:999,color:filterTag===tag?"#3b82f6":T.muted,fontSize:10,cursor:"pointer"}} onClick={()=>setFilterTag(filterTag===tag?"":tag)}>#{tag} <span style={{opacity:0.6}}>{count}</span></button>)}</div>}
            {!searchText&&<div style={{display:"flex",gap:4,marginBottom:8}}>{[{id:"near",label:"📍 近い"},{id:"new",label:"🕐 新着"},{id:"hot",label:"🔥 人気"}].map(s=><button key={s.id} style={{flex:1,padding:"5px 0",background:sortMode===s.id?(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.07)"):"transparent",border:`1px solid ${sortMode===s.id?T.sub:T.border}`,borderRadius:8,color:sortMode===s.id?T.text:T.muted,fontSize:10,cursor:"pointer",fontWeight:sortMode===s.id?800:400}} onClick={()=>setSortMode(s.id)}>{s.label}</button>)}</div>}
            {searchText&&<div style={{fontSize:11,color:T.muted,marginBottom:6}}>「{searchText}」— <span style={{color:T.sub,fontWeight:700}}>{filteredPosts.length}</span>件 距離順</div>}
            {!searchText&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:11,color:T.muted}}><span style={{color:T.sub,fontWeight:700}}>{filteredPosts.length}</span> 件の記録</span>
              <button style={{padding:"3px 10px",background:highlightMine?"rgba(59,130,246,0.12)":"transparent",border:`1px solid ${highlightMine?"#3b82f6":T.border}`,borderRadius:999,color:highlightMine?"#3b82f6":T.muted,fontSize:10,cursor:"pointer",fontWeight:highlightMine?800:400}} onClick={()=>setHighlightMine(h=>!h)}>{highlightMine?"✅ 自分":"○ 自分"}</button>
            </div>}
            <div ref={feedRef} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
              {postsLoading
                ?<div style={{textAlign:"center",padding:"56px 0",color:T.muted}}><div style={{fontSize:32,marginBottom:10}}>🌍</div><div style={{fontSize:13}}>読み込み中…</div></div>
                :filteredPosts.length===0
                ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 0",textAlign:"center"}}><div style={{fontSize:40}}>🌱</div><div style={{color:T.muted,fontSize:13,marginTop:12}}>{searchText?"検索結果がありません":"この範囲にまだ記録がありません"}</div>{!searchText&&<div style={{color:T.muted,fontSize:11,marginTop:6}}>最初の記録を残してみましょう</div>}</div>
                :filteredPosts.map(post=><PostCard key={post.id} {...cardProps(post)} highlight={highlightMine&&post.userId===currentUser} isNew={!(seenIds||[]).includes(post.id)}/>)
              }
            </div>
          </>
        )}
      </>}
      {activeTab==="bookmark"&&<>
        <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:10}}>🔖 ブックマーク</div>
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
          {bookmarkedPosts.length===0?<div style={{textAlign:"center",padding:"56px 0",color:T.muted}}><div style={{fontSize:40}}>🔖</div><div style={{marginTop:12}}>ブックマークはまだありません</div></div>:bookmarkedPosts.map(post=><PostCard key={post.id} {...cardProps(post)} highlight={false} isNew={false}/>)}
        </div>
      </>}
      {activeTab==="area"&&<AreaTab posts={posts} currentUser={currentUser} userPosition={userPosition} postRadius={postRadius} nearTotal={nearTotal} currentGoal={currentGoal} goalProgress={goalProgress} T={T} isDark={isDark}/>}
      {activeTab==="profile"&&<ProfileTab
        currentUser={currentUser} myPostsCount={myPostsCount} contributionScore={contributionScore}
        totalLikes={totalLikes} T={T} isDark={isDark} nickname={nickname} onEditNick={onEditNick}
        myPosts={myPosts} streak={streak} missionsDone={missionsDone}
        activeUsers={activeUsers} isTracking={isTracking} setIsTracking={setIsTracking}
        todayDist={todayDist} totalDist={totalDist} trajectoryCount={trajectoryCount}
        onClearTrajectory={onClearTrajectory} currentChallenge={currentChallenge}
        isChallengeCleared={isChallengeCleared} earnedBadges={earnedBadges}
        onShowDigest={onShowDigest} pwaPrompt={pwaPrompt} onPwaInstall={onPwaInstall}
        mood={mood} onMood={onMood} onShowStorage={onShowStorage} storageKB={storageKB}
        onShowTutorial={onShowTutorial} dailyQuote={dailyQuote} allPosts={allPosts}
        profileBio={profileBio} onEditBio={onEditBio}
        profileMyTags={profileMyTags} onEditMyTags={onEditMyTags}
        profileHeaderColor={profileHeaderColor} onEditHeaderColor={onEditHeaderColor}
        profileAvatarEmoji={profileAvatarEmoji} onEditAvatarEmoji={onEditAvatarEmoji}
        profilePinnedPostId={profilePinnedPostId} onSetPinnedPost={onSetPinnedPost}
      />}
    </div>
  </div>;
}
