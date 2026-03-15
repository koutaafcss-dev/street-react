import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE_DARK  = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";

function timeSince(ts){
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60)return`${s}秒前`;if(s<3600)return`${Math.floor(s/60)}分前`;
  if(s<86400)return`${Math.floor(s/3600)}時間前`;return`${Math.floor(s/86400)}日前`;
}

function makeCircle(lat,lng,rKm,n=72){
  const pts=[];
  for(let i=0;i<=n;i++){const a=(i/n)*2*Math.PI;pts.push([lng+(rKm/(111.32*Math.cos(lat*Math.PI/180)))*Math.cos(a),lat+(rKm/110.574)*Math.sin(a)]);}
  return{type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Polygon",coordinates:[pts]}}]};
}

function getPostColor(post){
  if(post.postType==="callout")return"#f59e0b";
  if(post.postType==="event")  return"#6366f1";
  return"#3b82f6";
}
function getPostEmoji(post){
  if(post.postType==="callout")return"📢";
  if(post.postType==="event")  return"📅";
  return"📝";
}

// マーカー生成（助かった数でサイズアップ・needTags持ち緑）
function makeMarkerEl(post,isOwn,isPinned,isHL,onClick){
  const helpedCount=(post.helpedBy||[]).length;
  const hasNeedTags=(post.needTags||[]).length>0;
  const baseSize=post.postType==="callout"||post.postType==="event"?44:36;
  // 助かった数に応じて最大56pxまでサイズアップ
  const sz=Math.min(56,baseSize+Math.floor(helpedCount*2));
  // 色: needTags持ち→緑、助かった3件以上→オレンジ、それ以外→タイプ色
  const color=hasNeedTags?"#10b981":helpedCount>=3?"#f59e0b":getPostColor(post);
  const emoji=getPostEmoji(post);
  const bw=isPinned||isHL||hasNeedTags?3:2;
  const bc=isPinned?"#fbbf24":hasNeedTags?"#10b981":isHL?"white":"rgba(255,255,255,.8)";
  const el=document.createElement("div");
  el.style.cssText="cursor:pointer;";
  el.innerHTML=`
    <div style="width:${sz}px;height:${sz}px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:${bw}px solid ${bc};box-shadow:0 4px 16px rgba(0,0,0,.35),0 1px 4px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;position:relative;">
      <span style="transform:rotate(45deg);font-size:${Math.floor(sz*.42)}px;line-height:1;">${emoji}</span>
      ${isOwn?`<div style="position:absolute;top:-3px;right:-3px;width:9px;height:9px;background:#10b981;border-radius:50%;border:1.5px solid white;transform:rotate(45deg);"></div>`:""}
      ${helpedCount>0?`<div style="position:absolute;top:-8px;left:-8px;min-width:18px;height:18px;background:#f59e0b;border-radius:9px;border:1.5px solid white;font-size:9px;color:white;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px;transform:rotate(45deg);">🙏</div>`:""}
      ${post.likes>0?`<div style="position:absolute;top:-8px;right:-8px;min-width:18px;height:18px;background:#ef4444;border-radius:9px;border:1.5px solid white;font-size:9px;color:white;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px;transform:rotate(45deg);">${post.likes}</div>`:""}
    </div>`;
  el.addEventListener("click",e=>{e.stopPropagation();onClick(post.id);});
  return el;
}

// ─── PostPanel ───────────────────────────────────────
function PostPanel({post,currentUser,isDark,T,onGoodJob,onHelped,onBookmark,bookmarks,onShare,onReport,onDelete,onEdit,editingId,onEditSave,onReaction,onComment,onDeleteComment,onClose}){
  const [commentText,setCommentText]=useState("");
  const [showAll,setShowAll]=useState(false);
  const [editText,setEditText]=useState(post.text);
  const isOwn=post.userId===currentUser;
  const liked=(post.likedBy||[]).includes(currentUser);
  const helped=(post.helpedBy||[]).includes(currentUser);
  const isBookmarked=bookmarks?.includes(post.id);
  const isEditing=editingId===post.id;
  const comments=post.comments||[];
  const displayed=showAll?comments:comments.slice(-3);
  const REACTIONS=["❤️","😂","😮","😢","👏","🙏"];
  const postColor=getPostColor(post);
  const postEmoji=getPostEmoji(post);
  const helpedCount=(post.helpedBy||[]).length;

  // needTags ラベル変換
  const NEED_LABEL={trash:"🗑️ ゴミ捨て",toilet:"🚻 トイレ",bench:"🪑 ベンチ",rest:"☕ 休憩",water:"💧 水場",shade:"🌳 日陰",shelter:"🏠 屋内避難",barrier:"♿ バリアフリー",kids:"👶 子ども向け",night:"🌙 夜でも安心"};

  useEffect(()=>{setEditText(post.text);setCommentText("");setShowAll(false);},[post.id]);

  const aBtn=(emoji,label,onClickFn,active=false,danger=false)=>(
    <button onClick={onClickFn} style={{padding:"8px 4px",flex:1,minWidth:44,background:danger?"transparent":active?(isDark?"rgba(59,130,246,.14)":"rgba(59,130,246,.08)"):"transparent",border:`1px solid ${danger?"rgba(239,68,68,.35)":active?"#3b82f6":T.border}`,borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
      <span style={{fontSize:16}}>{emoji}</span>
      <span style={{fontSize:9,color:danger?"#ef4444":active?"#3b82f6":T.sub,fontWeight:700}}>{label}</span>
    </button>
  );

  return(
    <div style={{position:"absolute",bottom:0,left:0,right:0,background:isDark?"rgba(5,8,16,.98)":"rgba(255,255,255,.99)",borderRadius:"20px 20px 0 0",border:`1px solid ${T.border}`,borderBottom:"none",borderTop:`2px solid ${postColor}`,backdropFilter:"blur(28px)",zIndex:1200,maxHeight:"74vh",display:"flex",flexDirection:"column",animation:"panelSlideUp .28s cubic-bezier(.34,1.56,.64,1)"}}>
      <div style={{width:40,height:4,background:T.border,borderRadius:2,margin:"10px auto 0",flexShrink:0}}/>
      <div style={{overflowY:"auto",flex:1,padding:"12px 16px 28px"}}>

        {/* ヘッダー */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:17}}>{postEmoji}</span>
            <span style={{fontSize:12,color:postColor,fontWeight:700}}>{post.postType==="callout"?"呼びかけ":post.postType==="event"?"イベント":"記録"}</span>
            {post.edited&&<span style={{fontSize:9,color:T.muted}}>編集済</span>}
            {/* 助かった件数をヘッダーに表示 */}
            {helpedCount>0&&<span style={{fontSize:11,color:"#f59e0b",fontWeight:800,background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.25)",borderRadius:999,padding:"1px 8px"}}>🙏 {helpedCount}人が助かった</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:T.muted}}>{timeSince(post.timestamp)}</span>
            <button style={{background:"transparent",border:"none",color:T.muted,fontSize:22,cursor:"pointer",lineHeight:1,padding:"0 3px"}} onClick={onClose}>×</button>
          </div>
        </div>

        {/* 本文 */}
        {isEditing?(
          <div style={{marginBottom:10}}>
            <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={3}
              style={{width:"100%",padding:"9px 11px",background:isDark?"rgba(255,255,255,.06)":"#f8fafc",border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontSize:14,lineHeight:1.6,resize:"none",outline:"none",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:7,marginTop:5}}>
              <button style={{flex:1,padding:"8px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>onEditSave(post.id,editText)}>保存</button>
              <button style={{padding:"8px 12px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:9,color:T.muted,fontSize:12,cursor:"pointer"}} onClick={()=>onEdit(null)}>×</button>
            </div>
          </div>
        ):(
          <p style={{fontSize:15,color:T.text,lineHeight:1.8,margin:"0 0 10px"}}>{post.text}</p>
        )}

        {post.photo&&<img src={post.photo} alt="" style={{width:"100%",borderRadius:12,marginBottom:10,maxHeight:200,objectFit:"cover"}}/>}
        {post.eventDate&&<div style={{fontSize:11,color:"#6366f1",marginBottom:8}}>📅 {post.eventDate}</div>}

        {/* ハッシュタグ */}
        {(post.tags||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{post.tags.map(t=><span key={t} style={{fontSize:10,background:isDark?"rgba(99,102,241,.12)":"rgba(99,102,241,.08)",color:"#818cf8",borderRadius:999,padding:"2px 9px"}}>#{t}</span>)}</div>}

        {/* needTags */}
        {(post.needTags||[]).length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
            {post.needTags.map(id=>(
              <span key={id} style={{fontSize:10,color:"#10b981",background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:999,padding:"2px 9px"}}>
                {NEED_LABEL[id]||id}
              </span>
            ))}
          </div>
        )}

        {/* リアクション */}
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
          {REACTIONS.map(r=>{const cnt=(post.reactions?.[r]||[]).length;const has=(post.reactions?.[r]||[]).includes(currentUser);return(<button key={r} onClick={()=>onReaction(post.id,r)} style={{padding:"3px 9px",background:has?(isDark?"rgba(99,102,241,.2)":"rgba(99,102,241,.1)"):"transparent",border:`1px solid ${has?"#818cf8":T.border}`,borderRadius:999,fontSize:13,cursor:"pointer",color:T.text,display:"flex",alignItems:"center",gap:3}}>{r}{cnt>0&&<span style={{fontSize:9,color:T.muted}}>{cnt}</span>}</button>);})}
        </div>

        {/* アクションバー */}
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
          {/* 🙏 助かった — 主役 */}
          <button onClick={()=>onHelped(post.id)} style={{flex:1,minWidth:56,padding:"8px 4px",background:helped?(isDark?"rgba(245,158,11,.15)":"rgba(245,158,11,.09)"):"transparent",border:`1px solid ${helped?"#f59e0b":T.border}`,borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:16}}>🙏</span>
            <span style={{fontSize:9,color:helped?"#f59e0b":T.sub,fontWeight:700}}>助かった{helpedCount>0?` ${helpedCount}`:""}</span>
          </button>
          {/* ✨ GoodJob — 補助 */}
          <button onClick={()=>onGoodJob(post.id)} style={{flex:1,minWidth:44,padding:"8px 4px",background:liked?(isDark?"rgba(37,99,235,.15)":"rgba(37,99,235,.09)"):"transparent",border:`1px solid ${liked?"#3b82f6":T.border}`,borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:16}}>✨</span>
            <span style={{fontSize:9,color:liked?"#3b82f6":T.sub,fontWeight:700}}>Good{post.likes>0?` ${post.likes}`:""}</span>
          </button>
          {aBtn("🔖",isBookmarked?"済":"保存",()=>onBookmark(post.id),isBookmarked)}
          {aBtn("📤","シェア",()=>onShare(post))}
          {isOwn?(<>{aBtn("✏️","編集",()=>onEdit(post.id))}{aBtn("🗑️","削除",()=>{onDelete(post.id);onClose();},false,true)}</>):(aBtn("🚩","通報",()=>onReport(post.id)))}
        </div>

        {/* コメント */}
        <div style={{borderTop:`1px solid ${T.border}`,paddingTop:12}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8}}>コメント{comments.length>0?` (${comments.length})`:""}</div>
          {comments.length===0&&<div style={{textAlign:"center",padding:"14px 0",color:T.muted,fontSize:12,opacity:.6}}>まだコメントはありません</div>}
          {comments.length>3&&!showAll&&<button style={{fontSize:11,color:"#3b82f6",background:"transparent",border:"none",cursor:"pointer",padding:0,marginBottom:7}} onClick={()=>setShowAll(true)}>過去 {comments.length-3} 件を表示</button>}
          {displayed.map(c=>(
            <div key={c.id} style={{display:"flex",gap:7,marginBottom:8,alignItems:"flex-start"}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>{c.userId===currentUser?"👤":"🙂"}</div>
              <div style={{flex:1}}>
                <div style={{background:isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.04)",borderRadius:"0 10px 10px 10px",padding:"7px 10px"}}>
                  <div style={{fontSize:12,color:T.text,lineHeight:1.65}}>{c.text}</div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                  <span style={{fontSize:9,color:T.muted}}>{timeSince(c.timestamp)}</span>
                  {c.userId===currentUser&&<button style={{fontSize:9,color:"#ef4444",background:"transparent",border:"none",cursor:"pointer",padding:0}} onClick={()=>onDeleteComment(post.id,c.id)}>削除</button>}
                </div>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&commentText.trim()){e.preventDefault();onComment(post.id,commentText);setCommentText("");}}} placeholder="コメント…" style={{flex:1,padding:"8px 11px",background:isDark?"rgba(255,255,255,.07)":"#f8fafc",border:`1px solid ${T.border}`,borderRadius:9,color:T.text,fontSize:12,outline:"none"}}/>
            <button onClick={()=>{if(commentText.trim()){onComment(post.id,commentText);setCommentText("");}}} style={{padding:"8px 14px",background:commentText.trim()?"linear-gradient(135deg,#2563eb,#7c3aed)":"transparent",border:`1px solid ${commentText.trim()?"#3b82f6":T.border}`,borderRadius:9,color:commentText.trim()?"white":T.muted,fontSize:12,fontWeight:700,cursor:"pointer"}}>送信</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MapView 本体
// ═══════════════════════════════════════════════════════════
export default function MapView({
  posts,onMapClick,onReport,onDelete,
  onGoodJob,onHelped,onEdit,editingId,onEditSave,
  onShare,onReaction,onBookmark,bookmarks,
  onComment,onDeleteComment,
  currentUser,userPosition,
  radius,postRadius,
  isPosting,isDark,T,
  postEffect,activeUsers,
  trajectory,isTracking,
  highlightMine,pinnedIds,
  isMobile,
  flyToTarget,
}){
  const containerRef=useRef(null);
  const mapRef=useRef(null);
  const markersRef=useRef({});
  const markerSigRef=useRef({});
  const userMarkerRef=useRef(null);
  const onMapClickRef=useRef(onMapClick);
  const isDarkRef=useRef(isDark);
  const prevDarkRef=useRef(isDark);

  const [selectedPostId,setSelectedPostId]=useState(null);
  const [mapReady,setMapReady]=useState(false);
  const [is3D,setIs3D]=useState(true);
  // 助かったヒートマップ表示トグル
  const [showHeatmap,setShowHeatmap]=useState(false);

  useEffect(()=>{onMapClickRef.current=onMapClick;},[onMapClick]);
  useEffect(()=>{isDarkRef.current=isDark;},[isDark]);

  const getMarkerSig=post=>`${post.likes}_${(post.helpedBy||[]).length}_${post.postType}_${post.userId===currentUser?1:0}_${(pinnedIds||[]).includes(post.id)?1:0}_${highlightMine?1:0}_${(post.needTags||[]).length}`;

  // ヒートマップ用GeoJSONを生成
  const makeHeatmapData=(postsArr)=>({
    type:"FeatureCollection",
    features:postsArr
      .filter(p=>(p.helpedBy||[]).length>0||(p.needTags||[]).length>0)
      .map(p=>({
        type:"Feature",
        geometry:{type:"Point",coordinates:[p.lng,p.lat]},
        properties:{
          // helpedBy数をweightに（最小1、最大で強調）
          weight:Math.max(1,(p.helpedBy||[]).length*2+(p.needTags||[]).length),
          helpedCount:(p.helpedBy||[]).length,
          needTagCount:(p.needTags||[]).length,
        },
      })),
  });

  const addCustomLayers=()=>{
    const map=mapRef.current;if(!map)return;

    // 3D建物
    try{
      const srcKeys=Object.keys(map.getStyle()?.sources||{});
      const bSrc=srcKeys.find(k=>k.includes("openmaptiles")||k.includes("carto")||k.includes("mapbox"))||srcKeys[0];
      if(bSrc&&!map.getLayer("zen-buildings")){
        map.addLayer({id:"zen-buildings",source:bSrc,"source-layer":"building",type:"fill-extrusion",minzoom:14,paint:{"fill-extrusion-color":isDarkRef.current?"#1a2640":"#c8d4e8","fill-extrusion-height":["coalesce",["get","height"],5],"fill-extrusion-base":["coalesce",["get","min_height"],0],"fill-extrusion-opacity":0.75}});
      }
    }catch(e){console.warn("Buildings skipped:",e);}

    // 投稿可能エリア
    if(!map.getSource("zen-radius")){
      map.addSource("zen-radius",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
      map.addLayer({id:"zen-radius-fill",type:"fill",source:"zen-radius",paint:{"fill-color":"#3b82f6","fill-opacity":0.05}});
      map.addLayer({id:"zen-radius-line",type:"line",source:"zen-radius",paint:{"line-color":"#ef4444","line-width":2,"line-dasharray":[6,3],"line-opacity":0.7}});
    }

    // GPS軌跡
    if(!map.getSource("zen-traj")){
      map.addSource("zen-traj",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
      map.addLayer({id:"zen-traj-glow",type:"line",source:"zen-traj",paint:{"line-color":"#10b981","line-width":7,"line-opacity":0.15,"line-blur":5},layout:{"line-join":"round","line-cap":"round"}});
      map.addLayer({id:"zen-traj-line",type:"line",source:"zen-traj",paint:{"line-color":"#10b981","line-width":2.5,"line-opacity":0.8},layout:{"line-join":"round","line-cap":"round"}});
    }

    // 助かった密度ヒートマップ
    if(!map.getSource("zen-helped")){
      map.addSource("zen-helped",{type:"geojson",data:{type:"FeatureCollection",features:[]}});

      // ヒートマップレイヤー（低ズームで表示）
      map.addLayer({
        id:"zen-helped-heat",
        type:"heatmap",
        source:"zen-helped",
        maxzoom:16,
        paint:{
          // 重みを weight プロパティで
          "heatmap-weight":["interpolate",["linear"],["get","weight"],0,0,6,1],
          // ズームに応じて強度変化
          "heatmap-intensity":["interpolate",["linear"],["zoom"],8,1,16,3],
          // 色: 薄い青→濃い黄→オレンジ
          "heatmap-color":["interpolate",["linear"],["heatmap-density"],
            0,"rgba(0,0,0,0)",
            0.2,"rgba(59,130,246,0.4)",
            0.5,"rgba(245,158,11,0.6)",
            0.8,"rgba(239,68,68,0.7)",
            1,"rgba(239,68,68,0.9)",
          ],
          // ズームに応じて半径変化
          "heatmap-radius":["interpolate",["linear"],["zoom"],8,15,16,40],
          // ズームアウトで透明に
          "heatmap-opacity":["interpolate",["linear"],["zoom"],14,0.85,16,0.4],
        },
        layout:{"visibility":"none"}, // 初期非表示
      });

      // 高ズームでは円でポイント表示
      map.addLayer({
        id:"zen-helped-circle",
        type:"circle",
        source:"zen-helped",
        minzoom:15,
        paint:{
          "circle-radius":["interpolate",["linear"],["get","weight"],1,8,8,20],
          "circle-color":["interpolate",["linear"],["get","helpedCount"],0,"#10b981",3,"#f59e0b",8,"#ef4444"],
          "circle-opacity":0.55,
          "circle-blur":0.5,
        },
        layout:{"visibility":"none"},
      });
    }

    setMapReady(true);
  };

  // ─── マップ初期化 ───
  useEffect(()=>{
    if(mapRef.current||!containerRef.current)return;
    const center=userPosition?[userPosition[1],userPosition[0]]:[136.906505,35.181236];
    mapRef.current=new maplibregl.Map({container:containerRef.current,style:isDark?STYLE_DARK:STYLE_LIGHT,center,zoom:16,pitch:50,bearing:0,antialias:true,maxPitch:80});
    const map=mapRef.current;
    map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");
    map.on("style.load",addCustomLayers);
    map.on("click",e=>{setSelectedPostId(null);onMapClickRef.current({lat:e.lngLat.lat,lng:e.lngLat.lng});});
    map.on("pitchend",()=>setIs3D(map.getPitch()>10));
    return()=>{
      Object.values(markersRef.current).forEach(m=>m.remove());
      markersRef.current={};markerSigRef.current={};
      if(userMarkerRef.current){userMarkerRef.current.remove();userMarkerRef.current=null;}
      map.remove();mapRef.current=null;setMapReady(false);
    };
  },[]);

  // ─── ダークモード切替 ───
  useEffect(()=>{
    if(!mapRef.current||prevDarkRef.current===isDark)return;
    prevDarkRef.current=isDark;setMapReady(false);
    mapRef.current.setStyle(isDark?STYLE_DARK:STYLE_LIGHT);
    mapRef.current.once("style.load",addCustomLayers);
  },[isDark]);

  // ─── ユーザー位置マーカー ───
  useEffect(()=>{
    if(!mapRef.current||!mapReady||!userPosition)return;
    const map=mapRef.current;
    const lngLat=[userPosition[1],userPosition[0]];
    if(userMarkerRef.current){userMarkerRef.current.setLngLat(lngLat);}
    else{
      const el=document.createElement("div");
      el.innerHTML=`<div style="width:20px;height:20px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,.25),0 2px 10px rgba(0,0,0,.3);"></div>`;
      userMarkerRef.current=new maplibregl.Marker({element:el,anchor:"center"}).setLngLat(lngLat).addTo(map);
      map.easeTo({center:lngLat,duration:900});
    }
    const src=map.getSource("zen-radius");
    if(src)src.setData(makeCircle(userPosition[0],userPosition[1],postRadius));
  },[userPosition,mapReady,postRadius]);

  // ─── GPS軌跡 ───
  useEffect(()=>{
    if(!mapRef.current||!mapReady||!trajectory?.length)return;
    const src=mapRef.current.getSource("zen-traj");
    if(!src)return;
    src.setData({type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"LineString",coordinates:trajectory.map(p=>[p.lng,p.lat])}}]});
  },[trajectory,mapReady]);

  // ─── 助かったヒートマップデータ更新 ───
  useEffect(()=>{
    if(!mapRef.current||!mapReady)return;
    const src=mapRef.current.getSource("zen-helped");
    if(!src)return;
    src.setData(makeHeatmapData(posts));
  },[posts,mapReady]);

  // ─── ヒートマップ表示切替 ───
  useEffect(()=>{
    if(!mapRef.current||!mapReady)return;
    const map=mapRef.current;
    const vis=showHeatmap?"visible":"none";
    try{
      if(map.getLayer("zen-helped-heat"))map.setLayoutProperty("zen-helped-heat","visibility",vis);
      if(map.getLayer("zen-helped-circle"))map.setLayoutProperty("zen-helped-circle","visibility",vis);
    }catch(e){console.warn("Heatmap toggle:",e);}
  },[showHeatmap,mapReady]);

  // ─── 投稿マーカー差分更新 ───
  useEffect(()=>{
    if(!mapRef.current||!mapReady)return;
    const map=mapRef.current;
    const postIds=new Set(posts.map(p=>p.id));
    Object.keys(markersRef.current).forEach(id=>{
      if(!postIds.has(id)){markersRef.current[id].remove();delete markersRef.current[id];delete markerSigRef.current[id];}
    });
    posts.forEach(post=>{
      const sig=getMarkerSig(post);
      if(markersRef.current[post.id]){if(markerSigRef.current[post.id]===sig)return;markersRef.current[post.id].remove();delete markersRef.current[post.id];}
      const el=makeMarkerEl(post,post.userId===currentUser,(pinnedIds||[]).includes(post.id),highlightMine&&post.userId===currentUser,(id)=>{setSelectedPostId(id);});
      markersRef.current[post.id]=new maplibregl.Marker({element:el,anchor:"bottom"}).setLngLat([post.lng,post.lat]).addTo(map);
      markerSigRef.current[post.id]=sig;
    });
  },[posts,mapReady,currentUser,highlightMine,pinnedIds]);

  // ─── 投稿後フライ ───
  useEffect(()=>{
    if(!postEffect||!mapRef.current)return;
    mapRef.current.easeTo({center:[postEffect.lng,postEffect.lat],zoom:17,pitch:50,duration:700});
  },[postEffect]);

  // ─── flyToTarget ───
  useEffect(()=>{
    if(!flyToTarget||!mapRef.current)return;
    mapRef.current.easeTo({center:[flyToTarget.lng,flyToTarget.lat],zoom:17,pitch:50,duration:800});
    if(flyToTarget.postId)setTimeout(()=>setSelectedPostId(flyToTarget.postId),700);
  },[flyToTarget]);

  const toggleView=()=>{
    if(!mapRef.current)return;
    mapRef.current.easeTo({pitch:is3D?0:50,duration:650});
    setIs3D(!is3D);
  };

  const selectedPost=selectedPostId?posts.find(p=>p.id===selectedPostId):null;
  const hudBottomBase=isMobile?100:88;
  const hudBottom=selectedPost?"calc(74vh + 14px)":hudBottomBase;
  const hudLabel=isDark?"#a8b8cc":"#64748b";

  // 助かった件数の統計（HUD用）
  const totalHelped=posts.reduce((s,p)=>s+(p.helpedBy||[]).length,0);

  return(
    <div style={{width:"100%",height:"100%",position:"relative",overflow:"hidden"}}>
      <style>{`
        @keyframes panelSlideUp{from{opacity:0;transform:translateY(55%)}to{opacity:1;transform:translateY(0)}}
        @keyframes gpsPulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.7);opacity:0}}
        .maplibregl-ctrl-group{background:${isDark?"rgba(10,14,26,.95)":"rgba(255,255,255,.96)"} !important;border:1px solid ${isDark?"rgba(255,255,255,.12)":"rgba(0,0,0,.08)"} !important;border-radius:12px !important;overflow:hidden !important;backdrop-filter:blur(16px) !important;box-shadow:0 4px 20px rgba(0,0,0,.18) !important;}
        .maplibregl-ctrl button{background:transparent !important;color:${isDark?"#a8b8cc":"#475569"} !important;width:36px !important;height:36px !important;}
        .maplibregl-ctrl button:hover{background:${isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.05)"} !important;}
        .maplibregl-ctrl-attrib,.maplibregl-ctrl-logo{display:none !important;}
      `}</style>

      <div ref={containerRef} style={{width:"100%",height:"100%"}}/>

      {/* ─── HUD（右下） ─── */}
      <div style={{position:"absolute",bottom:hudBottom,right:12,zIndex:900,display:"flex",flexDirection:"column",gap:7,transition:"bottom .3s ease"}}>

        {/* 近くのユーザー */}
        <div style={{background:isDark?"rgba(10,14,26,.95)":"rgba(255,255,255,.96)",border:`1px solid ${isDark?"rgba(255,255,255,.12)":T.border}`,borderRadius:13,padding:"8px 12px",backdropFilter:"blur(16px)",boxShadow:"0 4px 20px rgba(0,0,0,.15)"}}>
          <div style={{fontSize:9,color:hudLabel,letterSpacing:".07em",marginBottom:2}}>近くのユーザー</div>
          <div style={{fontSize:20,fontWeight:900,color:"#10b981",lineHeight:1.1}}>{activeUsers}<span style={{fontSize:10,color:hudLabel,fontWeight:400}}> 人</span></div>
        </div>

        {/* 助かった数（ヒートマップボタン兼用） */}
        <button onClick={()=>setShowHeatmap(h=>!h)} style={{background:showHeatmap?"rgba(245,158,11,.2)":(isDark?"rgba(10,14,26,.95)":"rgba(255,255,255,.96)"),border:`1px solid ${showHeatmap?"#f59e0b":(isDark?"rgba(255,255,255,.12)":T.border)}`,borderRadius:13,padding:"8px 12px",backdropFilter:"blur(16px)",cursor:"pointer",boxShadow:showHeatmap?"0 4px 20px rgba(245,158,11,.3)":"0 4px 20px rgba(0,0,0,.15)",textAlign:"left"}}>
          <div style={{fontSize:9,color:showHeatmap?"#f59e0b":hudLabel,letterSpacing:".07em",marginBottom:2,fontWeight:showHeatmap?700:400}}>{showHeatmap?"🗺️ マップ表示中":"🙏 助かった"}</div>
          <div style={{fontSize:20,fontWeight:900,color:showHeatmap?"#f59e0b":"#10b981",lineHeight:1.1}}>{totalHelped}<span style={{fontSize:10,color:hudLabel,fontWeight:400}}> 件</span></div>
        </button>

        {/* GPS記録中バッジ */}
        {isTracking&&<div style={{background:"rgba(16,185,129,.12)",border:"1px solid rgba(16,185,129,.3)",borderRadius:13,padding:"7px 10px",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:6,height:6,background:"#10b981",borderRadius:"50%",animation:"gpsPulse 1.5s infinite"}}/>
          <div style={{fontSize:9,color:"#10b981",fontWeight:700}}>GPS記録中</div>
        </div>}

        {/* 2D / 3D 切替 */}
        <button onClick={toggleView} style={{background:isDark?"rgba(10,14,26,.95)":"rgba(255,255,255,.96)",border:`1px solid ${isDark?"rgba(255,255,255,.12)":T.border}`,borderRadius:13,padding:"8px 12px",backdropFilter:"blur(16px)",cursor:"pointer",fontSize:11,color:isDark?"#cbd5e1":"#475569",fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,.15)"}}>
          {is3D?"2D 表示":"3D 表示"}
        </button>
      </div>

      {/* ヒートマップ凡例 */}
      {showHeatmap&&(
        <div style={{position:"absolute",bottom:hudBottomBase,left:12,zIndex:900,background:isDark?"rgba(10,14,26,.92)":"rgba(255,255,255,.92)",border:"1px solid rgba(245,158,11,.3)",borderRadius:12,padding:"8px 12px",backdropFilter:"blur(16px)",boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>
          <div style={{fontSize:9,color:"#f59e0b",fontWeight:700,marginBottom:6}}>🙏 助かった密度</div>
          <div style={{display:"flex",gap:3,alignItems:"center"}}>
            <div style={{width:60,height:8,borderRadius:4,background:"linear-gradient(90deg,rgba(59,130,246,.4),rgba(245,158,11,.6),rgba(239,68,68,.9))"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
            <span style={{fontSize:8,color:hudLabel}}>少</span>
            <span style={{fontSize:8,color:hudLabel}}>多</span>
          </div>
        </div>
      )}

      {/* PostPanel */}
      {selectedPost&&(
        <PostPanel
          post={selectedPost} currentUser={currentUser} isDark={isDark} T={T}
          onGoodJob={onGoodJob} onHelped={onHelped} onBookmark={onBookmark} bookmarks={bookmarks}
          onShare={onShare} onReport={onReport} onDelete={onDelete}
          onEdit={onEdit} editingId={editingId} onEditSave={onEditSave}
          onReaction={onReaction} onComment={onComment} onDeleteComment={onDeleteComment}
          onClose={()=>setSelectedPostId(null)}
        />
      )}
    </div>
  );
}
