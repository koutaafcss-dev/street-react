import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, arrayUnion, arrayRemove, runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./hooks/useAuth";
import { useGPS } from "./hooks/useGPS";
import { usePosts } from "./hooks/usePosts";
import { useNotifications } from "./hooks/useNotifications";
import { useGamification, COMMUNITY_GOALS } from "./hooks/useGamification";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import PostForm from "./components/PostForm";

const POST_RADIUS = 1;
const POST_SUCCESS_MESSAGES=["📍 地図に記録しました","🌱 この場所に残しました","✨ マップに追加されました","💫 記録が完了しました","🗺️ 地図に刻まれました"];

// ====================================================
// SECURITY v7
// ====================================================
const NG_WORDS_EXACT=["死ね","死んで","死ねよ","死にな","死んでくれ","殺す","殺すぞ","殺せ","消えろ","消えてくれ","ぶっ殺す","ぶっ殺","首つれ","首吊れ","首くくれ","ぶちのめす","ぶっ飛ばす","ぶん殴る","刺す","刺してやる","爆破","テロ","通り魔","リスカ","自傷","練炭","飛び降り","飛び降りろ","首吊り","睡眠薬大量","死にたい死にたい","うざい","うざすぎ","きもい","きもすぎ","クズ","ゴミ","最低野郎","バカ野郎","アホンダラ","死に損ない","生きてる価値ない","生きる価値ない","存在がゴミ","邪魔な存在","ちんこ","まんこ","ちんぽ","ちんちん","おっぱい","おちんちん","セックス","えっち","えちえち","えろい","エロい","ヌード","全裸","射精","勃起","フェラ","クンニ","オナニー","オナ","自慰","ポルノ","アダルト","エロ動画","えろ動画","援助交際","援交","売春","買春","パパ活","ママ活","風俗","デリヘル","ソープ","AV女優","ナンパ","ガチナンパ","レイプ","強姦","痴漢","盗撮","下着泥棒","のぞき","のぞき魔","ロリコン","ショタコン","幼女","児童ポルノ","チョン","チョンコ","チャンコロ","支那","土人","黒人め","白人め","ガイジン出てけ","外国人は嫌い","きちがい","キチガイ","精神病","基地外","池沼","知的障害者め","メクラ","つんぼ","ビッコ","てんかん持ちが","発達障害のくせ","自閉症のくせ","女のくせ","女は黙れ","男のくせ","ゲイのくせ","ホモ野郎","レズ野郎","おかまが","LGBT失せろ","貧乏人","底辺","低学歴","ブスがい","ブサイクが野郎","デブのくせ","ハゲのくせ","チビのくせ","不細工","生活保護","ナマポ","覚せい剤","覚醒剤","大麻","マリファナ","ヘロイン","コカイン","危険ドラッグ","爆弾の作り方","毒の作り方","ウイルス作成","LINE交換","ライン交換","Discord交換","電話番号教えて","住所教えて","会いに行く"];
const NG_PATTERNS=[/死[ねぬんで]+/,/殺[すせして害]/,/自[殺傷]/,/首[つ吊く]/,/飛[びん]降/,/刺[すせし]|爆[破弾]|テロ/,/リスカ|練炭|睡眠薬.*大量/,/https?:\/\/|www\.|\.[comjpnetorg]/i,/\d{2,4}[-ー]\d{3,4}[-ー]\d{4}/,/0[5789]0[-ー\s]?\d{4}[-ー\s]?\d{4}/,/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,/(.)\\1{5,}/,/し+ね|し+に+[なや]|し+ん+で/,/ころ+す|ころ+せ/,/き+もい|う+ざい|く+ず/,/えろ|えち|エロ|エッチ/i,/[ちチ][んン][こコポ]|[まマ][んン][こコ]/,/ポルノ|アダルト|わいせつ|猥褻/i,/援[助交]|売春|買春|パパ活|ママ活|風俗|デリヘル|ソープ/,/レイプ|強[姦]|痴漢|盗撮/,/ロリコン|ショタコン|幼女.*|児童.*ポルノ/,/チョン[コ]?|チャンコロ|支那/,/土[人め]|黒[人め]|白[人め]|ガイジン/,/池[沼]|きちがい|基地外|キチガイ/,/障[害が].*くせ|病[気き].*くせ/,/女.*くせ|男.*くせ|ゲイ.*くせ|ホモ|LGBT.*失/,/底辺|低学歴|ブス.*がい|デブ.*くせ|ハゲ.*くせ/,/覚[せ]い剤|覚醒剤|大麻|マリファナ|ヘロイン|コカイン|MDMA/i,/爆弾.*作り方|毒.*作り方|ウイルス.*作成/,/LINE交換|ライン交換|Discord交換|電話番号.*教え/i,/\b(kill|die|hate you|stupid|idiot|f+u+c+k|s+h+i+t|b+i+t+c+h|n+i+g+g|f+a+g|r+a+p+e)\b/i];
const LEET_MAP={'☆':'','★':'','◆':'','◇':'','■':'','□':'','※':'','→':'','←':'','♡':'','♥':'','●':'','○':'','◎':'','▼':'','▽':'','△':'','▲':''};
function normalizeText(t){let s=t.normalize("NFKC");for(const[k,v]of Object.entries(LEET_MAP))s=s.split(k).join(v);s=s.replace(/[\s\u200b\u3000\t\n\r　・･]/g,"");s=s.replace(/(.)\\1{2,}/g,"$1$1");s=s.replace(/shi/gi,"し").replace(/chi/gi,"ち").replace(/tsu/gi,"つ");return s;}
function checkNG(text){if(!text?.trim())return{ok:false,message:"テキストを入力してください"};const raw=text.trim();if(raw.length<5)return{ok:false,message:"5文字以上入力してください"};if(raw.length>120)return{ok:false,message:"120文字以内で入力してください"};const n=normalizeText(raw);for(const w of NG_WORDS_EXACT)if(n.includes(normalizeText(w)))return{ok:false,message:"🚫 投稿できない内容が含まれています"};for(const p of NG_PATTERNS)if(p.test(n))return{ok:false,message:"🚫 投稿できない内容が含まれています"};return{ok:true,message:""};}

function getWeatherInfo(code){
  if(code===0)return{emoji:"☀️",label:"快晴",suggest:"☀️ 晴れの日に見つけた出来事を投稿しよう"};
  if(code<=3)return{emoji:"⛅",label:"曇り",suggest:"⛅ 曇りの日も街では何かが起きている"};
  if(code<=48)return{emoji:"🌫️",label:"霧",suggest:"🌫️ 霧の中での気づきを記録しよう"};
  if(code<=67)return{emoji:"🌧️",label:"雨",suggest:"🌧️ 雨の日のエピソードを残しておこう"};
  if(code<=77)return{emoji:"❄️",label:"雪",suggest:"❄️ 雪の日の出来事を地図に刻もう"};
  if(code<=82)return{emoji:"🌦️",label:"にわか雨",suggest:"🌦️ 急な雨の日の記録を残そう"};
  return{emoji:"⛈️",label:"雷雨",suggest:"⛈️ 嵐の日にも街の記録を"};
}

const DAILY_QUOTES=[
  "今日、近くで見つけたものを地図に残してみよう",
  "ベンチ・日陰・水場。記録が街を少し使いやすくする",
  "誰かが困っている場所は、誰かが助かる場所でもある",
  "1kmの中に、意外な発見がある",
  "記録は小さくていい。それが積み重なって街になる",
  "雨の日に助かった場所を、次の誰かのために残そう",
  "街の記録は、歩いた人にしか書けない",
  "トイレ・ゴミ箱・休憩できる場所。知っているだけで街が変わる",
  "今日気づいたことが、誰かの「助かった」につながる",
  "夜道の安心できる場所を見つけたら、記録してみよう",
  "子ども連れが休める場所は、意外と少ない",
  "投稿しなくても、探すだけでも使えるアプリです",
  "近くに何があるかを知ることが、街とのつながりになる",
  "小さな発見の積み重ねが、街を少し生きやすくする",
];
function getDailyQuote(){const d=new Date();const idx=(d.getFullYear()*1000+d.getMonth()*31+d.getDate())%DAILY_QUOTES.length;return DAILY_QUOTES[idx];}

// getDistance はSidebar等でも使うため残す
function getDistance(lat1,lng1,lat2,lng2){const R=6371,dLat=((lat2-lat1)*Math.PI)/180,dLng=((lng2-lng1)*Math.PI)/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function extractTags(text){return[...(text||"").matchAll(/#([^\s#、。！？.,!?]{1,20})/g)].map(m=>m[1]);}
function load(key,def){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(def));}catch{return def;}}
function safeSave(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function getStorageUsageKB(){let total=0;for(const k of Object.keys(localStorage)){total+=localStorage.getItem(k).length*2;}return Math.round(total/1024);}
function getSuccessMessage(postType){
  if(postType==="callout")return"📢 呼びかけを投稿しました";
  if(postType==="event")return"📅 イベントを地図に追加しました";
  return POST_SUCCESS_MESSAGES[Math.floor(Math.random()*POST_SUCCESS_MESSAGES.length)];
}

async function compressImage(dataUrl,maxKB=120){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement("canvas");
      let{width,height}=img;const maxDim=800;
      if(width>maxDim||height>maxDim){const r=Math.min(maxDim/width,maxDim/height);width=Math.floor(width*r);height=Math.floor(height*r);}
      canvas.width=width;canvas.height=height;
      canvas.getContext("2d").drawImage(img,0,0,width,height);
      let q=0.8,result=canvas.toDataURL("image/jpeg",q);
      while(result.length*0.75>maxKB*1024&&q>0.2){q-=0.15;result=canvas.toDataURL("image/jpeg",q);}
      if(result.length*0.75>maxKB*1024)reject(new Error("画像が大きすぎます（最大120KB）"));
      else resolve(result);
    };
    img.onerror=()=>reject(new Error("画像の読み込みに失敗しました"));
    img.src=dataUrl;
  });
}

function getFirestoreError(err,fallback="通信エラーが発生しました。もう一度お試しください"){
  if(!err)return fallback;
  if(err.code==="permission-denied")return"権限がありません。再読み込みをお試しください";
  if(err.code==="unavailable")return"オフラインです。接続を確認してください";
  if(err.code==="not-found")return"データが見つかりませんでした";
  if(err.code==="resource-exhausted")return"しばらく時間をおいてから再試行してください";
  return fallback;
}

// ====================================================
// テーマ定義
// B: ダークモードのmuted・placeholderを改善
// ====================================================
function makeTheme(isDark){
  if(isDark) return {
    bg:          "rgba(5,8,16,0.99)",
    border:      "rgba(255,255,255,0.11)",
    text:        "#f8fafc",      // メインテキスト
    sub:         "#e2e8f0",      // サブテキスト
    muted:       "#a8b8cc",      // 補足テキスト（改善：旧#94a3b8より読みやすく）
    card:        "rgba(255,255,255,0.06)",
    cardBorder:  "rgba(255,255,255,0.10)",
    input:       "rgba(255,255,255,0.08)",
    accent:      "#3b82f6",
    inputText:   "#f8fafc",      // input内テキスト
    placeholder: "#7a8ea6",      // placeholder（改善：旧#64748bより読みやすく）
  };
  return {
    bg:          "#f1f5f9",
    border:      "rgba(0,0,0,0.08)",
    text:        "#0f172a",
    sub:         "#334155",
    muted:       "#64748b",
    card:        "#ffffff",
    cardBorder:  "rgba(0,0,0,0.07)",
    input:       "#ffffff",
    accent:      "#2563eb",
    inputText:   "#0f172a",
    placeholder: "#94a3b8",
  };
}

export default function App(){
  // showToastRef: hooks から showToast を呼べるようにする（循環依存回避）
  const showToastRef = useRef(null);

  // ─── Custom Hooks（分離済み） ───
  const { currentUser, authLoading } = useAuth();
  const { posts, postsLoading } = usePosts(currentUser, {
    onError: err => showToastRef.current?.(getFirestoreError(err), "error"),
  });
  const {
    userPosition, gpsError, setGpsError,
    isTracking, setIsTracking,
    trajectory, todayDist, totalDist,
    clearTrajectory,
  } = useGPS({
    onWalkMilestone: dist => {
      if (dist === "1km") gamificationRef.current?.checkWalkMission();
    },
  });
  const { notifications, setNotifications, unreadCount, markAllRead } =
    useNotifications(posts, currentUser);

  // ─── UI State ───
  const [postText,setPostText]=useState("");
  const [postType,setPostType]=useState("normal");
  const [postPhoto,setPostPhoto]=useState(null);
  const [postEventDate,setPostEventDate]=useState("");
  const [postExpiry,setPostExpiry]=useState("none");
  const [postNeedTags,setPostNeedTags]=useState([]);
  const [flyToTarget,setFlyToTarget]=useState(null);
  const [chainPostId,setChainPostId]=useState(null);
  const [isPosting,setIsPosting]=useState(false);
  const [postPhase,setPostPhase]=useState("form");
  const [radius,setRadius]=useState(5);
  const [activeTab,setActiveTab]=useState("feed");
  const [searchText,setSearchText]=useState("");
  const [sortMode,setSortMode]=useState("near");
  const [isFrozen,setIsFrozen]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [toast,setToast]=useState(null);
  const [postTimestamps,setPostTimestamps]=useState([]);
  const [showNotif,setShowNotif]=useState(false);
  const [isDark,setIsDark]=useState(()=>localStorage.getItem("zenTheme")!=="light");
  const [nickname,setNickname]=useState(()=>localStorage.getItem("zenNick")||"");
  const [bookmarks,setBookmarks]=useState(()=>load("zenBookmarks",[]));
  const [showNickEdit,setShowNickEdit]=useState(false);
  // ─── プロフィール拡張 ───
  const [profileBio,setProfileBio]=useState(()=>localStorage.getItem("zenBio")||"");
  const [profileMyTags,setProfileMyTags]=useState(()=>load("zenMyTags",[]));
  const [profileHeaderColor,setProfileHeaderColor]=useState(()=>localStorage.getItem("zenHeaderColor")||"city");
  const [profileAvatarEmoji,setProfileAvatarEmoji]=useState(()=>localStorage.getItem("zenAvatar")||"🚶");
  const [profilePinnedPostId,setProfilePinnedPostId]=useState(()=>localStorage.getItem("zenPinnedPost")||"");
  const [showBioEdit,setShowBioEdit]=useState(false);
  const [showTagsEdit,setShowTagsEdit]=useState(false);
  const [showHeaderEdit,setShowHeaderEdit]=useState(false);
  const [showAvatarEdit,setShowAvatarEdit]=useState(false);
  const [tagInputValue,setTagInputValue]=useState("");
  const [postEffect,setPostEffect]=useState(null);
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  const [showSidebar,setShowSidebar]=useState(false);
  const [highlightMine,setHighlightMine]=useState(false);
  const [showTutorial,setShowTutorial]=useState(()=>!localStorage.getItem("zenTutorialDone"));
  const [showDigest,setShowDigest]=useState(false);
  const [pwaPrompt,setPwaPrompt]=useState(null);
  const [pinnedIds,setPinnedIds]=useState(()=>load("zenPinned",[]));
  const [seenIds,setSeenIds]=useState(()=>load("zenSeen",[]));
  const [showStorage,setShowStorage]=useState(false);
  const [storageWarning,setStorageWarning]=useState(false);
  const [mood,setMood]=useState(()=>load("zenMood",{}));
  const lastPostIdRef=useRef(null);
  const gamificationRef=useRef(null); // useGPS→useGamification 循環依存回避用
  const [showOpening,setShowOpening]=useState(()=>!localStorage.getItem("zenOpeningDone"));
  const [showTerms,setShowTerms]=useState(false);
  const [showGuide,setShowGuide]=useState(false);
  const [newBannerCount,setNewBannerCount]=useState(0);
  const initialLoadDoneRef=useRef(false);
  const prevPostsLengthRef=useRef(0);

  const T=useMemo(()=>makeTheme(isDark),[isDark]);

  const toastTimerRef=useRef(null);
  const showToast=(msg,type="success")=>{
    // 既存タイマーをクリアしてから新しいトーストを表示（競合防止）
    if(toastTimerRef.current)clearTimeout(toastTimerRef.current);
    setToast({msg,type});
    toastTimerRef.current=setTimeout(()=>setToast(null),3200);
  };
  showToastRef.current=showToast;

  // ─── useGamification（showToast確定後に初期化） ───
  const gamification = useGamification({
    posts,
    currentUser,
    totalLikes: posts.filter(p=>p.userId===currentUser).reduce((s,p)=>s+p.likes,0),
    totalDist,
    onToast: showToast,
  });
  // gamificationRef を最新値で更新（useGPS の onWalkMilestone から呼べるように）
  gamificationRef.current = gamification;

  const {
    missionsDone, rankUp,
    currentChallenge, isChallengeCleared,
    streak, contributionScore, earnedBadges, myPosts,
    checkMissions, checkGoodJobMission, checkRankUp,
  } = gamification;

  useEffect(()=>{const h=e=>{e.preventDefault();setPwaPrompt(e);};window.addEventListener("beforeinstallprompt",h);return()=>window.removeEventListener("beforeinstallprompt",h);},[]);

  useEffect(()=>{const kb=getStorageUsageKB();if(kb>3500)setStorageWarning(true);},[posts.length]);

  // 新着バナー（タブがfeedの時は即クリア、それ以外は積算）
  useEffect(()=>{
    if(postsLoading||!posts.length)return;
    if(!initialLoadDoneRef.current){initialLoadDoneRef.current=true;prevPostsLengthRef.current=posts.length;return;}
    const diff=posts.length-prevPostsLengthRef.current;
    if(diff>0&&activeTab==="feed")setNewBannerCount(c=>c+diff);
    prevPostsLengthRef.current=posts.length;
  },[posts.length,postsLoading]);

  useEffect(()=>{localStorage.setItem("zenTheme",isDark?"dark":"light");},[isDark]);
  useEffect(()=>{localStorage.setItem("zenNick",nickname);},[nickname]);
  useEffect(()=>{safeSave("zenBookmarks",bookmarks);},[bookmarks]);
  useEffect(()=>{safeSave("zenPinned",pinnedIds);},[pinnedIds]);
  useEffect(()=>{safeSave("zenSeen",seenIds);},[seenIds]);
  useEffect(()=>{safeSave("zenMood",mood);},[mood]);
  useEffect(()=>{localStorage.setItem("zenBio",profileBio);},[profileBio]);
  useEffect(()=>{safeSave("zenMyTags",profileMyTags);},[profileMyTags]);
  useEffect(()=>{localStorage.setItem("zenHeaderColor",profileHeaderColor);},[profileHeaderColor]);
  useEffect(()=>{localStorage.setItem("zenAvatar",profileAvatarEmoji);},[profileAvatarEmoji]);
  useEffect(()=>{localStorage.setItem("zenPinnedPost",profilePinnedPostId);},[profilePinnedPostId]);
  useEffect(()=>{const onResize=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",onResize);return()=>window.removeEventListener("resize",onResize);},[]);

  useEffect(()=>{
    if(activeTab==="feed"){
      const ids=posts.map(p=>p.id);
      setSeenIds(prev=>{const s=new Set(prev);ids.forEach(id=>s.add(id));return[...s].slice(-1000);});
      setNewBannerCount(0);
    }
  },[activeTab,posts.length]);

  const validation=checkNG(postText);
  const canPost=validation.ok;

  const resetForm=useCallback(()=>{
    setPostText("");setPostType("normal");setPostPhoto(null);
    setPostEventDate("");setPostExpiry("none");setPostNeedTags([]);setChainPostId(null);
    setIsPosting(false);setPostPhase("form");
  },[]);

  const handleMapClick=useCallback(async(latlng)=>{
    if(!isPosting||postPhase!=="picking")return;
    if(!currentUser){showToast("認証中です。少しお待ちください","error");return;}
    if(!validation.ok){showToast(validation.message,"error");return;}
    if(isFrozen){showToast("投稿制限中です。しばらくお待ちください","error");return;}
    if(userPosition){const dist=getDistance(userPosition[0],userPosition[1],latlng.lat,latlng.lng);if(dist>POST_RADIUS){showToast(`📍 現在地から${POST_RADIUS}km以内にしか投稿できません`,"error");return;}}
    const now=Date.now();const newTs=[...postTimestamps,now].filter(t=>now-t<30000);
    if(newTs.length>=3){setIsFrozen(true);setTimeout(()=>setIsFrozen(false),30000);showToast("連続投稿を検出しました。30秒後に解除されます","error");return;}
    setPostTimestamps(newTs);
    // checkRankUp: contributionScore と同じ計算式（投稿×5 + helped×15 + likes×3）
    const totalLk=myPosts.reduce((s,p)=>s+p.likes,0);
    const totalH=myPosts.reduce((s,p)=>s+(p.helpedBy||[]).length,0);
    const oldScore=myPosts.length*5+totalH*15+totalLk*3;
    const newScore=(myPosts.length+1)*5+totalH*15+totalLk*3;
    checkRankUp(oldScore,newScore);
    const expiryMs={none:null,"1h":3600000,"6h":21600000,"24h":86400000,"3d":259200000};
    let compressedPhoto=null;
    if(postPhoto){try{compressedPhoto=await compressImage(postPhoto);}catch(e){showToast(`📷 ${e.message}`,"error");return;}}
    const postData={
      text:postText.trim(),tags:extractTags(postText),category:null,postType,
      needTags:postNeedTags,
      photo:compressedPhoto,eventDate:postType==="event"?postEventDate:null,
      expiresAt:expiryMs[postExpiry]?now+expiryMs[postExpiry]:null,
      chainId:chainPostId,lat:latlng.lat,lng:latlng.lng,userId:currentUser,
      likes:0,likedBy:[],helpedBy:[],reactions:{},comments:[],
      reports:0,reportedBy:[],hidden:false,edited:false,timestamp:now,
    };
    try{
      const docRef=await addDoc(collection(db,"posts"),postData);
      lastPostIdRef.current=docRef.id;
      setPostEffect({lat:latlng.lat,lng:latlng.lng,type:postType,id:now});
      setTimeout(()=>setPostEffect(null),2200);
      checkMissions(postData);resetForm();setActiveTab("feed");
      if(isMobile)setShowSidebar(true);
      showToast(getSuccessMessage(postType));
    }catch(e){showToast(getFirestoreError(e,"投稿に失敗しました"),"error");}
  },[isPosting,postPhase,currentUser,validation,isFrozen,postTimestamps,postText,postType,postPhoto,postEventDate,postExpiry,chainPostId,posts,checkMissions,isMobile,userPosition,resetForm]);

  const handleDelete=async id=>{try{await deleteDoc(doc(db,"posts",id));showToast("投稿を削除しました");}catch(e){showToast(getFirestoreError(e),"error");}};

  /**
   * GoodJob — トランザクション化 + self-like ブロック
   * 副作用（ミッション・toast）は transaction 外で実行
   */
  const handleGoodJob=async id=>{
    if(!currentUser)return;
    let isNewLike=false;
    try{
      await runTransaction(db,async transaction=>{
        const postRef=doc(db,"posts",id);
        const snap=await transaction.get(postRef);
        if(!snap.exists())return;
        const data=snap.data();
        if(data.userId===currentUser)return; // self-like ブロック
        const liked=(data.likedBy||[]).includes(currentUser);
        isNewLike=!liked;
        transaction.update(postRef,{
          likedBy:liked?arrayRemove(currentUser):arrayUnion(currentUser),
          likes:liked?Math.max(0,(data.likes||0)-1):(data.likes||0)+1,
        });
      });
      // 副作用は transaction の外で実行
      if(isNewLike)checkGoodJobMission();
    }catch(e){showToast(getFirestoreError(e),"error");}
  };

  /**
   * 助かった — self-help ブロック + 副作用を transaction 外で実行
   */
  const handleHelped=async id=>{
    if(!currentUser)return;
    let isSelf=false;
    let isNewHelp=false;
    try{
      await runTransaction(db,async transaction=>{
        const postRef=doc(db,"posts",id);
        const snap=await transaction.get(postRef);
        if(!snap.exists())return;
        const data=snap.data();
        if(data.userId===currentUser){isSelf=true;return;}
        const helped=(data.helpedBy||[]).includes(currentUser);
        isNewHelp=!helped;
        transaction.update(postRef,{helpedBy:helped?arrayRemove(currentUser):arrayUnion(currentUser)});
      });
      // 副作用は transaction の外で実行
      if(isSelf)showToast("自分の投稿には「助かった」を送れません","error");
      else if(isNewHelp)showToast("🙏 「助かった！」を送りました");
    }catch(e){showToast(getFirestoreError(e),"error");}
  };

  const handleReaction=async(id,emoji)=>{const post=posts.find(p=>p.id===id);if(!post||!currentUser)return;const users=post.reactions?.[emoji]||[];const has=users.includes(currentUser);try{await updateDoc(doc(db,"posts",id),{[`reactions.${emoji}`]:has?arrayRemove(currentUser):arrayUnion(currentUser)});}catch(e){showToast(getFirestoreError(e),"error");}};
  const handleComment=async(id,text)=>{if(!text.trim()||!currentUser)return;const v=checkNG(text);if(!v.ok){showToast(v.message,"error");return;}const comment={id:Date.now().toString(),text:text.trim(),userId:currentUser,timestamp:Date.now()};try{await updateDoc(doc(db,"posts",id),{comments:arrayUnion(comment)});}catch(e){showToast(getFirestoreError(e),"error");}};

  /**
   * コメント削除 — トランザクション安全化（実装済み）
   */
  const handleDeleteComment=async(postId,commentId)=>{
    if(!currentUser)return;
    try{
      await runTransaction(db,async transaction=>{
        const postRef=doc(db,"posts",postId);
        const snap=await transaction.get(postRef);
        if(!snap.exists())throw new Error("投稿が見つかりません");
        const data=snap.data();
        const newComments=(data.comments||[]).filter(c=>c.id!==commentId);
        transaction.update(postRef,{comments:newComments});
      });
    }catch(e){showToast(getFirestoreError(e),"error");}
  };

  /**
   * 通報 — トランザクション化（reports同時更新の競合防止）
   * 旧: post.reports+1 をクライアント値で計算 → 同時通報でズレる
   * 新: transaction で最新値を読んで安全に更新
   */
  const handleReport=async id=>{
    if(!currentUser)return;
    try{
      await runTransaction(db,async transaction=>{
        const postRef=doc(db,"posts",id);
        const snap=await transaction.get(postRef);
        if(!snap.exists())return;
        const data=snap.data();
        if((data.reportedBy||[]).includes(currentUser))return;
        const nr=(data.reports||0)+1;
        transaction.update(postRef,{
          reports:nr,
          reportedBy:arrayUnion(currentUser),
          hidden:nr>=3,  // 3件で自動非表示
        });
      });
      showToast("問題を報告しました");
    }catch(e){showToast(getFirestoreError(e),"error");}
  };

  /**
   * 編集保存 — タグも更新（旧: text のみで検索インデックスが古いまま）
   */
  const handleEditSave=async(id,newText)=>{
    const v=checkNG(newText);
    if(!v.ok){showToast(v.message,"error");return;}
    try{
      await updateDoc(doc(db,"posts",id),{
        text:newText.trim(),
        tags:extractTags(newText),  // ← タグも更新
        edited:true,
      });
      setEditingId(null);
      showToast("更新しました");
    }catch(e){showToast(getFirestoreError(e),"error");}
  };  const handleBookmark=id=>{setBookmarks(prev=>prev.includes(id)?prev.filter(b=>b!==id):[...prev,id]);showToast(bookmarks.includes(id)?"ブックマークを解除しました":"🔖 ブックマークしました");};
  const handleShare=post=>{
    const text=`「${post.text}」`;
    if(navigator.share)navigator.share({title:"まちの記録",text}).catch(()=>{});
    else navigator.clipboard.writeText(text).then(()=>showToast("📋 コピーしました")).catch(()=>showToast("コピーに失敗しました","error"));
  };
  const handleChain=id=>{setChainPostId(id);setIsPosting(true);setPostPhase("form");if(isMobile)setShowSidebar(false);};
  const handleThanks=postId=>{const post=posts.find(p=>p.id===postId);if(!post||post.userId!==currentUser)return;const givers=(post.likedBy||[]).length;if(givers===0){showToast("まだGoodJobがありません");return;}setNotifications(prev=>[{id:Date.now().toString(),type:"thanks",text:`「${post.text.slice(0,20)}…」のGoodJobに感謝を送りました 🙏`,timestamp:Date.now(),read:false},...prev].slice(0,30));showToast(`🙏 ${givers}人に感謝を伝えました！`);};
  const handleClearTrajectory=()=>{clearTrajectory();showToast("軌跡をリセットしました");};
  const handlePwaInstall=async()=>{if(!pwaPrompt)return;pwaPrompt.prompt();const{outcome}=await pwaPrompt.userChoice;if(outcome==="accepted"){setPwaPrompt(null);showToast("📱 インストールしました！");}};
  const handlePin=id=>{setPinnedIds(prev=>prev.includes(id)?prev.filter(p=>p!==id):[...prev,id]);showToast(pinnedIds.includes(id)?"ピン留めを解除しました":"📌 ピン留めしました");};
  const handleMood=m=>{const today=new Date().toDateString();setMood(prev=>({...prev,[today]:m}));showToast(`気分を記録しました ${m}`);};
  const handleFlyTo=useCallback((post)=>{
    setFlyToTarget({lat:post.lat,lng:post.lng,postId:post.id,ts:Date.now()});
    if(isMobile)setShowSidebar(false);
  },[isMobile]);
  const handleDeletePosts=async(ids)=>{try{await Promise.all(ids.map(id=>deleteDoc(doc(db,"posts",id))));showToast(`🗑️ ${ids.length}件を削除しました`);}catch(e){showToast(getFirestoreError(e),"error");}};

  const visiblePosts=posts.filter(p=>!p.hidden&&(!p.expiresAt||p.expiresAt>Date.now()));
  const totalLikes=myPosts.reduce((s,p)=>s+p.likes,0);
  const recentInRadius=visiblePosts.filter(p=>userPosition&&getDistance(userPosition[0],userPosition[1],p.lat,p.lng)<=radius&&Date.now()-p.timestamp<86400000);
  const activeUsers=new Set(recentInRadius.filter(p=>p.userId!==currentUser).map(p=>p.userId)).size;
  const chainPost=chainPostId?posts.find(p=>p.id===chainPostId):null;
  const nearTotal=visiblePosts.filter(p=>userPosition&&getDistance(userPosition[0],userPosition[1],p.lat,p.lng)<=POST_RADIUS).length;
  const currentGoal=COMMUNITY_GOALS.find(g=>nearTotal<g.target)||COMMUNITY_GOALS[COMMUNITY_GOALS.length-1];
  const prevGoalTarget=COMMUNITY_GOALS[COMMUNITY_GOALS.indexOf(currentGoal)-1]?.target||0;
  const goalProgress=Math.min(100,((nearTotal-prevGoalTarget)/(currentGoal.target-prevGoalTarget))*100);
  const newPostCount=visiblePosts.filter(p=>!seenIds.includes(p.id)).length;
  const storageKB=getStorageUsageKB();

  // ────────────────────────────────────────────────────────
  if(authLoading){
    return(
      <div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#050810",fontFamily:"'Noto Sans JP',sans-serif",gap:20}}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{animation:"fadeUp .5s ease",textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:12}}>🗺️</div>
          <div style={{fontSize:20,fontWeight:900,color:"#f1f5f9",marginBottom:4,letterSpacing:"0.04em"}}>善意マップ</div>
          <div style={{fontSize:12,color:"#7a8ea6",letterSpacing:"0.08em",marginBottom:24}}>街のいい瞬間を、地図に残そう</div>
          <div style={{width:32,height:32,border:"2.5px solid rgba(59,130,246,0.2)",borderTopColor:"#3b82f6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
        </div>
      </div>
    );
  }

  const sidebarProps={
    activeTab,setActiveTab,radius,setRadius,posts:visiblePosts,currentUser,userPosition,searchText,setSearchText,sortMode,setSortMode,
    onGoodJob:handleGoodJob,onDelete:handleDelete,onReport:handleReport,onEdit:setEditingId,editingId,onEditSave:handleEditSave,onShare:handleShare,onReaction:handleReaction,onBookmark:handleBookmark,bookmarks,onComment:handleComment,onDeleteComment:handleDeleteComment,
    onStartPost:()=>{setIsPosting(true);setPostPhase("form");if(isMobile)setShowSidebar(false);},
    isFrozen,myPostsCount:myPosts.length,contributionScore,totalLikes,unreadCount,
    onShowNotif:()=>{setShowNotif(true);markAllRead();},
    isDark,setIsDark,T,nickname,onEditNick:()=>setShowNickEdit(true),myPosts,streak,missionsDone,onChain:handleChain,onThanks:handleThanks,activeUsers,
    isTracking,setIsTracking,todayDist,totalDist,trajectoryCount:trajectory.length,onClearTrajectory:handleClearTrajectory,
    currentChallenge,isChallengeCleared,earnedBadges,postRadius:POST_RADIUS,
    highlightMine,setHighlightMine,onShowDigest:()=>setShowDigest(true),pwaPrompt,onPwaInstall:handlePwaInstall,
    nearTotal,currentGoal,goalProgress,prevGoalTarget,lastPostId:lastPostIdRef.current,gpsError,
    pinnedIds,onPin:handlePin,newPostCount,seenIds,
    onShowStorage:()=>setShowStorage(true),storageKB,
    mood,onMood:handleMood,
    onShowTutorial:()=>setShowTutorial(true),
    dailyQuote:getDailyQuote(),
    allPosts:posts,postsLoading,totalPostsInArea:nearTotal,
    onHelped:handleHelped,
    onShowTerms:()=>setShowTerms(true),
    onShowGuide:()=>setShowGuide(true),
    onFlyTo:handleFlyTo,
    profileBio,onEditBio:()=>setShowBioEdit(true),
    profileMyTags,onEditMyTags:()=>setShowTagsEdit(true),
    profileHeaderColor,onEditHeaderColor:()=>setShowHeaderEdit(true),
    profileAvatarEmoji,onEditAvatarEmoji:()=>setShowAvatarEdit(true),
    profilePinnedPostId,onSetPinnedPost:(id)=>setProfilePinnedPostId(prev=>prev===id?"":id),
  };

  return(
    <div style={{display:"flex",height:"100vh",width:"100vw",overflow:"hidden",background:isDark?"#050810":"#e2e8f0",fontFamily:"'Noto Sans JP',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
        *{box-sizing:border-box;}body{margin:0;}
        /* B: placeholder色を改善 */
        input::placeholder,textarea::placeholder{color:${isDark?"#7a8ea6":"#94a3b8"};}
        @keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes bannerIn{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes rankUpAnim{0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}85%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(0.95)}}
        @keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes notifSlide{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeScaleIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
        @keyframes mobileSlideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        @keyframes previewIn{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:2px}
      `}</style>

      {/* トースト */}
      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",color:"white",padding:"10px 24px",borderRadius:"999px",fontSize:"13px",fontWeight:"700",zIndex:9999,whiteSpace:"nowrap",background:toast.type==="error"?"linear-gradient(135deg,#ef4444,#dc2626)":"linear-gradient(135deg,#059669,#10b981)",animation:"slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:"0 6px 32px rgba(0,0,0,0.3)"}}>{toast.msg}</div>}

      {/* ランクアップ */}
      {rankUp&&<div style={{position:"fixed",top:"50%",left:"50%",zIndex:10000,animation:"rankUpAnim 4s ease forwards",pointerEvents:"none"}}><div style={{background:isDark?"rgba(5,8,16,0.98)":"rgba(255,255,255,0.98)",border:`2px solid ${rankUp.color}55`,borderRadius:32,padding:"44px 72px",textAlign:"center",backdropFilter:"blur(32px)"}}><div style={{fontSize:56,marginBottom:12}}>🎉</div><div style={{color:T.muted,fontSize:10,letterSpacing:"0.25em",marginBottom:6}}>RANK UP</div><div style={{color:rankUp.color,fontSize:26,fontWeight:900}}>{rankUp.label}</div></div></div>}

      {/* 新着バナー */}
      {newBannerCount>0&&activeTab==="feed"&&!isPosting&&(
        <div onClick={()=>{setActiveTab("feed");setNewBannerCount(0);}} style={{position:"fixed",top:56,left:"50%",transform:"translateX(-50%)",zIndex:2500,background:"#2563eb",color:"white",padding:"8px 20px",borderRadius:"999px",fontSize:12,fontWeight:700,cursor:"pointer",animation:"bannerIn 0.3s ease",boxShadow:"0 4px 24px rgba(37,99,235,0.4)",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
          <span style={{width:7,height:7,background:"#bfdbfe",borderRadius:"50%",display:"inline-block"}}/>
          {newBannerCount}件の新しい投稿があります
        </div>
      )}

      {/* GPSエラーバー */}
      {gpsError&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:8500,padding:"10px 20px",background:"rgba(245,158,11,0.95)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}><span style={{fontSize:13,fontWeight:700,color:"white"}}>{gpsError==="permission"?"📍 位置情報の許可が必要です":gpsError==="unavailable"?"📍 位置情報を取得できません":"📍 位置情報タイムアウト"}</span><button style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:999,padding:"3px 12px",color:"white",fontSize:11,cursor:"pointer"}} onClick={()=>setGpsError(null)}>×</button></div>}

      {/* ストレージ警告 */}
      {storageWarning&&<div style={{position:"fixed",top:gpsError?46:0,left:0,right:0,zIndex:8400,padding:"10px 20px",background:"rgba(239,68,68,0.95)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}><span style={{fontSize:13,fontWeight:700,color:"white"}}>⚠️ ストレージが残り少なくなっています</span><button style={{background:"rgba(255,255,255,0.25)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:999,padding:"3px 14px",color:"white",fontSize:11,cursor:"pointer",fontWeight:700}} onClick={()=>{setShowStorage(true);setStorageWarning(false);}}>管理する</button><button style={{background:"transparent",border:"none",color:"white",fontSize:16,cursor:"pointer",marginLeft:4}} onClick={()=>setStorageWarning(false)}>×</button></div>}

      {/* モーダル */}
      {showTutorial&&<TutorialOverlay isDark={isDark} T={T} onClose={()=>{setShowTutorial(false);localStorage.setItem("zenTutorialDone","1");}}/>}
      {showDigest&&<DigestModal posts={visiblePosts} currentUser={currentUser} isDark={isDark} T={T} onClose={()=>setShowDigest(false)}/>}
      {showStorage&&<StorageModal posts={posts} onDeletePosts={handleDeletePosts} currentUser={currentUser} isDark={isDark} T={T} onClose={()=>setShowStorage(false)} storageKB={storageKB} onToast={showToast}/>}
      {showTerms&&<TermsModal isDark={isDark} T={T} onClose={()=>setShowTerms(false)}/>}
      {showGuide&&<GuideModal isDark={isDark} T={T} onClose={()=>setShowGuide(false)}/>}

      {/* プロフィール編集（統合モーダル） */}
      {showNickEdit&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(12px)"}} onClick={()=>setShowNickEdit(false)}>
          <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:24,padding:"28px 28px",width:340,maxHeight:"80vh",overflowY:"auto",animation:"fadeScaleIn 0.2s ease"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:900,color:T.text,marginBottom:4}}>プロフィールを編集</div>
            <div style={{fontSize:11,color:T.muted,marginBottom:18,lineHeight:1.65}}>
              自己アピールではなく、<br/>あなたと街との関わり方を表します
            </div>

            {/* ニックネーム */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:T.sub,marginBottom:6}}>ニックネーム</div>
              <input value={nickname} onChange={e=>setNickname(e.target.value.slice(0,20))} placeholder="例：名古屋のK" autoFocus
                style={{width:"100%",padding:"10px 13px",background:T.input,border:`1px solid ${T.border}`,borderRadius:10,color:T.inputText,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              <div style={{fontSize:10,color:T.muted,textAlign:"right",marginTop:3}}>{nickname.length}/20</div>
            </div>

            {/* アバター */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:T.sub,marginBottom:8}}>アバター</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:5}}>
                {["🚶","🏃","🌳","🗺️","☕","🌙","🌸","🏙️","🌊","📍","🎒","🔭","🌿","⛩️","🌃","🚲"].map(e=>(
                  <button key={e} onClick={()=>setProfileAvatarEmoji(e)} style={{fontSize:20,background:profileAvatarEmoji===e?(isDark?"rgba(59,130,246,.2)":"rgba(37,99,235,.1)"):"transparent",border:`2px solid ${profileAvatarEmoji===e?"#3b82f6":"transparent"}`,borderRadius:9,padding:"5px 0",cursor:"pointer"}}>{e}</button>
                ))}
              </div>
            </div>

            {/* ヘッダーカラー */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:T.sub,marginBottom:8}}>プロフィールカラー</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
                {[
                  {id:"city",   grad:"linear-gradient(135deg,#1e3a5f,#2d6a9f)",   label:"夜の街"},
                  {id:"park",   grad:"linear-gradient(135deg,#1a4731,#2d8a52)",   label:"公園"},
                  {id:"sunset", grad:"linear-gradient(135deg,#7c3022,#e87a35)",   label:"夕暮れ"},
                  {id:"rain",   grad:"linear-gradient(135deg,#2c3e50,#4a6fa5)",   label:"雨の日"},
                  {id:"sakura", grad:"linear-gradient(135deg,#7e2d58,#c96490)",   label:"さくら"},
                  {id:"night",  grad:"linear-gradient(135deg,#0a0c1a,#1e1b4b)",  label:"深夜"},
                  {id:"morning",grad:"linear-gradient(135deg,#1c3f6e,#d4881a)",  label:"朝焼け"},
                  {id:"earth",  grad:"linear-gradient(135deg,#3b2a1a,#7a5530)",  label:"大地"},
                  {id:"neon",   grad:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",label:"ネオン"},
                  {id:"ocean",  grad:"linear-gradient(135deg,#0575e6,#021b79)",  label:"海"},
                ].map(c=>(
                  <button key={c.id} onClick={()=>setProfileHeaderColor(c.id)} style={{background:c.grad,border:`3px solid ${profileHeaderColor===c.id?"white":"transparent"}`,borderRadius:10,height:44,cursor:"pointer",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 4px",transform:profileHeaderColor===c.id?"scale(1.05)":"scale(1)",transition:"transform .15s"}}>
                    <span style={{fontSize:8,color:"rgba(255,255,255,.85)",fontWeight:700}}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={()=>{setShowNickEdit(false);showToast("プロフィールを更新しました");}}>
              保存
            </button>
          </div>
        </div>
      )}

      {/* Bio編集 */}
      {showBioEdit&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(12px)"}} onClick={()=>setShowBioEdit(false)}>
          <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:24,padding:"28px 32px",width:340,animation:"fadeScaleIn 0.2s ease"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:900,color:T.text,marginBottom:4}}>一言プロフィール</div>
            <div style={{fontSize:11,color:T.muted,marginBottom:10,lineHeight:1.7}}>
              自己アピールではなく、<br/>あなたと街との関わり方を一言で
            </div>
            {/* 街志向のサジェスト */}
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
              {[
                "この辺の休憩場所をよく探しています",
                "夜道の安心できる場所が気になります",
                "ベンチや日陰をよく記録します",
                "子ども連れで安心な場所を探しています",
                "街をよく歩きます",
              ].map(hint=>(
                <button key={hint} onClick={()=>setProfileBio(hint)} style={{padding:"3px 9px",fontSize:10,borderRadius:999,cursor:"pointer",background:isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)",border:`1px solid ${T.border}`,color:T.muted,textAlign:"left",lineHeight:1.5}}>
                  {hint}
                </button>
              ))}
            </div>
            <textarea value={profileBio} onChange={e=>setProfileBio(e.target.value.slice(0,80))} placeholder="例：名古屋駅まわりの路地をよく歩きます" rows={3}
              style={{width:"100%",padding:"11px 14px",background:T.input,border:`1px solid ${T.border}`,borderRadius:10,color:T.inputText,fontSize:13,outline:"none",resize:"none",boxSizing:"border-box",lineHeight:1.7,marginBottom:4}}/>
            <div style={{fontSize:11,color:T.muted,textAlign:"right",marginBottom:16}}>{profileBio.length}/80</div>
            <div style={{display:"flex",gap:8}}>
              <button style={{flex:1,padding:"11px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={()=>{setShowBioEdit(false);showToast("プロフィールを更新しました");}}>保存</button>
              <button style={{padding:"11px 16px",background:"transparent",color:T.muted,border:`1px solid ${T.border}`,borderRadius:12,fontSize:13,cursor:"pointer"}} onClick={()=>setShowBioEdit(false)}>×</button>
            </div>
          </div>
        </div>
      )}

      {/* マイタグ編集 */}
      {showTagsEdit&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(12px)"}} onClick={()=>setShowTagsEdit(false)}>
          <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:24,padding:"28px 32px",width:340,animation:"fadeScaleIn 0.2s ease"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:900,color:T.text,marginBottom:4}}>マイタグ</div>
            <div style={{fontSize:11,color:T.muted,marginBottom:12,lineHeight:1.7}}>
              街との関わり方・気にしていることを<br/>タグで表します（最大5個）
            </div>
            {/* 街志向のサジェストタグ */}
            {profileMyTags.length<5&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:T.muted,marginBottom:6}}>よく使われるタグ</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {["夜散歩","ベンチ探し","休憩スポット","日陰好き","子ども連れ","雨の日","朝の街","公園好き","歩き街","路地好き"].filter(s=>!profileMyTags.includes(s)).slice(0,8).map(s=>(
                    <button key={s} onClick={()=>setProfileMyTags(p=>[...p,s])} style={{padding:"3px 9px",fontSize:10,borderRadius:999,cursor:"pointer",background:isDark?"rgba(16,185,129,.06)":"rgba(16,185,129,.05)",border:"1px solid rgba(16,185,129,.2)",color:"#10b981"}}>
                      +{s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12,minHeight:32}}>
              {profileMyTags.map(tag=>(
                <span key={tag} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#10b981",background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.25)",borderRadius:999,padding:"3px 10px"}}>
                  #{tag}<button style={{background:"none",border:"none",color:"#10b981",cursor:"pointer",fontSize:13,padding:0,lineHeight:1,marginLeft:2}} onClick={()=>setProfileMyTags(p=>p.filter(t=>t!==tag))}>×</button>
                </span>
              ))}
              {profileMyTags.length===0&&<span style={{fontSize:11,color:T.muted}}>まだタグがありません</span>}
            </div>
            {profileMyTags.length<5&&<div style={{display:"flex",gap:7,marginBottom:16}}>
              <input value={tagInputValue} onChange={e=>setTagInputValue(e.target.value.replace(/^#/,"").slice(0,15))} placeholder="自分で入力（例: 夜道チェック）"
                onKeyDown={e=>{if(e.key==="Enter"&&tagInputValue.trim()&&!profileMyTags.includes(tagInputValue.trim())){setProfileMyTags(p=>[...p,tagInputValue.trim()]);setTagInputValue("");}}}
                style={{flex:1,padding:"9px 12px",background:T.input,border:`1px solid ${T.border}`,borderRadius:10,color:T.inputText,fontSize:13,outline:"none"}}/>
              <button onClick={()=>{if(tagInputValue.trim()&&!profileMyTags.includes(tagInputValue.trim())){setProfileMyTags(p=>[...p,tagInputValue.trim()]);setTagInputValue("");}}}
                style={{padding:"9px 16px",background:"linear-gradient(135deg,#059669,#10b981)",color:"white",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>追加</button>
            </div>}
            <button style={{width:"100%",padding:"11px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={()=>{setShowTagsEdit(false);showToast("マイタグを更新しました");}}>完了</button>
          </div>
        </div>
      )}

      {/* ヘッダーカラー編集 */}
      {showHeaderEdit&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(12px)"}} onClick={()=>setShowHeaderEdit(false)}>
          <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:24,padding:"28px 32px",width:340,animation:"fadeScaleIn 0.2s ease"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:900,color:T.text,marginBottom:16}}>プロフィールカラー</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20}}>
              {[
                {id:"city",   grad:"linear-gradient(135deg,#1e3a5f,#2d6a9f)",   label:"夜の街"},
                {id:"park",   grad:"linear-gradient(135deg,#1a4731,#2d8a52)",   label:"公園"},
                {id:"sunset", grad:"linear-gradient(135deg,#7c3022,#e87a35)",   label:"夕暮れ"},
                {id:"rain",   grad:"linear-gradient(135deg,#2c3e50,#4a6fa5)",   label:"雨の日"},
                {id:"sakura", grad:"linear-gradient(135deg,#7e2d58,#c96490)",   label:"さくら"},
                {id:"night",  grad:"linear-gradient(135deg,#0a0c1a,#1e1b4b)",  label:"深夜"},
                {id:"morning",grad:"linear-gradient(135deg,#1c3f6e,#d4881a)",  label:"朝焼け"},
                {id:"earth",  grad:"linear-gradient(135deg,#3b2a1a,#7a5530)",  label:"大地"},
                {id:"neon",   grad:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",label:"ネオン"},
                {id:"ocean",  grad:"linear-gradient(135deg,#0575e6,#021b79)",  label:"海"},
              ].map(c=>(
                <button key={c.id} onClick={()=>setProfileHeaderColor(c.id)} style={{background:c.grad,border:`3px solid ${profileHeaderColor===c.id?"white":"transparent"}`,borderRadius:12,height:52,cursor:"pointer",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 5px",transition:"transform .15s",transform:profileHeaderColor===c.id?"scale(1.05)":"scale(1)"}}>
                  <span style={{fontSize:8,color:"rgba(255,255,255,.85)",fontWeight:700}}>{c.label}</span>
                </button>
              ))}
            </div>
            <button style={{width:"100%",padding:"11px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={()=>{setShowHeaderEdit(false);showToast("カラーを変更しました");}}>完了</button>
          </div>
        </div>
      )}

      {/* アバター編集 */}
      {showAvatarEdit&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(12px)"}} onClick={()=>setShowAvatarEdit(false)}>
          <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:24,padding:"28px 32px",width:340,animation:"fadeScaleIn 0.2s ease"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:900,color:T.text,marginBottom:16}}>アバター</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:20}}>
              {["🚶","🏃","🌳","🗺️","☕","🌙","🌸","🏙️","🌊","📍","🎒","🔭","🌿","⛩️","🌃","🚲","🐕","🎵","📷","🍜","🌺","⭐","🦋","🏞️"].map(e=>(
                <button key={e} onClick={()=>setProfileAvatarEmoji(e)} style={{fontSize:24,background:profileAvatarEmoji===e?(isDark?"rgba(59,130,246,.2)":"rgba(37,99,235,.1)"):"transparent",border:`2px solid ${profileAvatarEmoji===e?"#3b82f6":"transparent"}`,borderRadius:12,padding:"8px 0",cursor:"pointer",transform:profileAvatarEmoji===e?"scale(1.15)":"scale(1)",transition:"transform .1s"}}>{e}</button>
              ))}
            </div>
            <button style={{width:"100%",padding:"11px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={()=>{setShowAvatarEdit(false);showToast("アバターを変更しました");}}>完了</button>
          </div>
        </div>
      )}

      {/* 通知パネル */}
      {showNotif&&(
        <div style={{position:"fixed",top:0,right:0,width:isMobile?"100vw":"320px",height:"100vh",background:isDark?"rgba(5,8,16,0.99)":"#f8fafc",borderLeft:`1px solid ${T.border}`,zIndex:5000,display:"flex",flexDirection:"column",animation:"notifSlide 0.25s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"22px 20px 16px",borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:14,fontWeight:900,color:T.text}}>通知</span>
            <div style={{display:"flex",gap:12}}>
              <button style={{fontSize:11,color:T.sub,background:"transparent",border:"none",cursor:"pointer"}} onClick={markAllRead}>すべて既読</button>
              <button style={{fontSize:20,color:T.sub,background:"transparent",border:"none",cursor:"pointer",lineHeight:1}} onClick={()=>setShowNotif(false)}>×</button>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"10px 16px"}}>
            {notifications.length===0?(
              <div style={{textAlign:"center",padding:"56px 0",color:T.muted}}>
                <div style={{fontSize:36,marginBottom:10,opacity:0.4}}>🔔</div>
                <div style={{fontSize:13,color:T.sub}}>まだ通知はありません</div>
              </div>
            ):notifications.map(n=>{
              const icon=n.type==="goodjob"?"✨":n.type==="helped"?"🙏":n.type==="comment"?"💬":"🔔";
              return(
                <div key={n.id} style={{padding:"11px 13px",borderRadius:11,background:n.read?"transparent":T.card,border:`1px solid ${n.read?"transparent":T.cardBorder}`,marginBottom:5}}>
                  <div style={{fontSize:12,color:n.read?T.muted:T.sub,lineHeight:1.6}}>{icon} {n.text}</div>
                  <div style={{fontSize:10,color:T.muted,marginTop:3}}>{Math.floor((Date.now()-n.timestamp)/60000)}分前</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* モバイル サイドバー */}
      {isMobile&&showSidebar&&(
        <div style={{position:"fixed",inset:0,zIndex:3000,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setShowSidebar(false)}/>
          <div style={{position:"relative",background:T.bg,borderRadius:"20px 20px 0 0",maxHeight:"92vh",overflow:"hidden",animation:"mobileSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>
            <div style={{width:40,height:4,background:T.border,borderRadius:2,margin:"10px auto 0"}}/>
            <div style={{maxHeight:"90vh",overflowY:"auto"}}><Sidebar {...sidebarProps} isMobile={true}/></div>
          </div>
        </div>
      )}
      {!isMobile&&<Sidebar {...sidebarProps} isMobile={false}/>}

      {/* マップエリア */}
      <div style={{flex:1,position:"relative",overflow:"hidden"}}>
        <MapView
          posts={visiblePosts} onMapClick={handleMapClick}
          onReport={handleReport} onDelete={handleDelete}
          onGoodJob={handleGoodJob} onHelped={handleHelped}
          onEdit={setEditingId} editingId={editingId} onEditSave={handleEditSave}
          onShare={handleShare} onReaction={handleReaction}
          onBookmark={handleBookmark} bookmarks={bookmarks}
          onComment={handleComment} onDeleteComment={handleDeleteComment}
          currentUser={currentUser} userPosition={userPosition}
          radius={radius} postRadius={POST_RADIUS}
          isPosting={isPosting&&postPhase==="picking"}
          isDark={isDark} T={T}
          postEffect={postEffect} activeUsers={activeUsers}
          trajectory={trajectory} isTracking={isTracking}
          highlightMine={highlightMine} pinnedIds={pinnedIds}
          isMobile={isMobile}
          flyToTarget={flyToTarget}
        />

        {/* モバイル FAB */}
        {isMobile&&!isPosting&&(
          <div style={{position:"absolute",bottom:28,left:0,right:0,display:"flex",justifyContent:"center",gap:10,zIndex:1000,padding:"0 20px"}}>
            <button
              style={{flex:1,padding:"15px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:16,fontSize:15,fontWeight:900,cursor:"pointer",boxShadow:"0 8px 28px rgba(37,99,235,0.45)",letterSpacing:"0.04em"}}
              onClick={()=>{setIsPosting(true);setPostPhase("form");}}>
              投稿
            </button>
            <button style={{width:54,height:54,borderRadius:14,background:isDark?"rgba(10,14,26,0.92)":"rgba(255,255,255,0.95)",border:`1px solid ${T.border}`,cursor:"pointer",fontSize:20,backdropFilter:"blur(12px)",position:"relative",flexShrink:0}} onClick={()=>setShowSidebar(true)}>
              ☰
              {newPostCount>0&&<div style={{position:"absolute",top:-4,right:-4,width:17,height:17,background:"#ef4444",borderRadius:"50%",fontSize:9,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,border:"2px solid "+T.bg}}>{Math.min(newPostCount,99)}</div>}
            </button>
          </div>
        )}

        {/* 投稿フロー（2段階） */}
        {isPosting&&(()=>{
          if(postPhase==="picking"){
            return(
              <>
                <div style={{position:"absolute",top:gpsError?52:16,left:"50%",transform:"translateX(-50%)",background:isDark?"rgba(5,8,16,.97)":"rgba(255,255,255,.98)",color:isDark?"#f8fafc":"#0f172a",padding:"11px 24px",borderRadius:"999px",fontSize:13,fontWeight:800,zIndex:1100,display:"flex",gap:10,alignItems:"center",border:"1.5px solid rgba(59,130,246,.5)",backdropFilter:"blur(20px)",animation:"pulseGlow 2s infinite",whiteSpace:"nowrap",boxShadow:"0 4px 24px rgba(37,99,235,.2)"}}>
                  <span style={{width:9,height:9,background:"#3b82f6",borderRadius:"50%",display:"inline-block",flexShrink:0}}/>
                  <span>地図をタップして場所を決める</span>
                </div>
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:isDark?"rgba(5,8,16,.98)":"rgba(255,255,255,.99)",borderRadius:"20px 20px 0 0",borderTop:"2px solid #3b82f6",border:`1px solid ${T.border}`,borderBottom:"none",backdropFilter:"blur(28px)",zIndex:1100,padding:"14px 18px 32px",animation:"previewIn .3s cubic-bezier(.34,1.56,.64,1)"}}>
                  <div style={{width:36,height:4,background:T.border,borderRadius:2,margin:"0 auto 14px"}}/>
                  <div style={{padding:"12px 14px",background:isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.025)",border:`1px solid ${T.border}`,borderRadius:12,marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                      <span style={{fontSize:14,color:"#3b82f6",fontWeight:800}}>{postType==="callout"?"📢 呼びかけ":postType==="event"?"📅 イベント":"📝 記録"}</span>
                    </div>
                    <div style={{fontSize:14,color:T.text,lineHeight:1.7,wordBreak:"break-all"}}>
                      {postText.slice(0,80)}{postText.length>80?"…":""}
                    </div>
                    {postPhoto&&<div style={{marginTop:6,fontSize:11,color:T.muted}}>📷 写真あり</div>}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setPostPhase("form")} style={{flex:1,padding:"13px 0",background:"transparent",border:`1px solid ${T.border}`,borderRadius:12,cursor:"pointer",color:T.sub,fontSize:14,fontWeight:700}}>✏️ 内容を編集</button>
                    <button onClick={resetForm} style={{padding:"13px 20px",background:"transparent",border:"1px solid rgba(239,68,68,.35)",borderRadius:12,cursor:"pointer",color:"#ef4444",fontSize:14,fontWeight:700}}>キャンセル</button>
                  </div>
                </div>
              </>
            );
          }
          return(
            <PostForm
              postText={postText} setPostText={setPostText}
              validation={validation}
              postType={postType} setPostType={setPostType}
              postPhoto={postPhoto} setPostPhoto={setPostPhoto}
              postEventDate={postEventDate} setPostEventDate={setPostEventDate}
              postExpiry={postExpiry} setPostExpiry={setPostExpiry}
              postNeedTags={postNeedTags} setPostNeedTags={setPostNeedTags}
              chainPost={chainPost} isDark={isDark} T={T}
              canPost={canPost} userPosition={userPosition}
              onConfirm={()=>setPostPhase("picking")} onCancel={resetForm}
            />
          );
        })()}
      </div>

      {showOpening&&<OpeningScreen isDark={isDark} T={T} onClose={()=>{setShowOpening(false);localStorage.setItem("zenOpeningDone","1");}} onShowTerms={()=>setShowTerms(true)}/>}
    </div>
  );
}

// ====================================================
// オープニング
// ====================================================
function OpeningScreen({isDark,T,onClose,onShowTerms}){
  const [step,setStep]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setStep(1),60);return()=>clearTimeout(t);},[]);
  // A: 言葉を街づくり寄りに。「善意」連呼をしない
  const actions=[
    {emoji:"📍",title:"今いる場所に記録する",desc:"現在地から1km以内の場所にピンを置ける。その日、その場所で起きたことを残す。"},
    {emoji:"✨",title:"他の人の投稿に共感する",desc:"GoodJobを送ったり「助かった！」と伝えたり。小さな反応が、次の記録につながる。"},
    {emoji:"🗺️",title:"近くの記録を見つける",desc:"地図を見ると、今日この街でどんなことがあったかが分かる。"},
  ];
  return(
    <div style={{position:"fixed",inset:0,zIndex:20000,background:"rgba(3,5,12,0.99)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",overflowY:"auto"}}>
      <div style={{opacity:step?1:0,transform:step?"translateY(0)":"translateY(18px)",transition:"all 0.6s cubic-bezier(0.34,1.56,0.64,1)",textAlign:"center",marginBottom:28,width:"100%",maxWidth:380}}>
        <div style={{fontSize:52,marginBottom:10}}>🗺️</div>
        <div style={{fontSize:26,fontWeight:900,color:"#f1f5f9",marginBottom:6}}>善意マップ</div>
        <div style={{fontSize:13,color:"#a8b8cc"}}>街のいい瞬間を、地図に残そう</div>
      </div>
      <div style={{opacity:step?1:0,transform:step?"translateY(0)":"translateY(14px)",transition:"all 0.6s 0.1s cubic-bezier(0.34,1.56,0.64,1)",display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:380,marginBottom:28}}>
        {actions.map((a,i)=>(
          <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"13px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14}}>
            <div style={{width:38,height:38,background:"rgba(255,255,255,0.06)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{a.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:"#e2e8f0",marginBottom:3}}>{a.title}</div>
              <div style={{fontSize:11,color:"#a8b8cc",lineHeight:1.7}}>{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{opacity:step?1:0,transform:step?"translateY(0)":"translateY(10px)",transition:"all 0.6s 0.2s cubic-bezier(0.34,1.56,0.64,1)",width:"100%",maxWidth:380}}>
        <button style={{width:"100%",padding:"15px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",border:"none",borderRadius:16,color:"white",fontSize:15,fontWeight:900,cursor:"pointer",boxShadow:"0 8px 32px rgba(37,99,235,0.35)",marginBottom:12}} onClick={onClose}>はじめる</button>
        <div style={{fontSize:10,color:"#5a6a80",textAlign:"center"}}>
          続けることで<button style={{background:"none",border:"none",color:"#7a8ea6",fontSize:10,cursor:"pointer",textDecoration:"underline",padding:"0 3px"}} onClick={e=>{e.stopPropagation();onShowTerms();}}>利用規約</button>に同意したものとみなします
        </div>
      </div>
    </div>
  );
}

// ====================================================
// 利用規約
// ====================================================
function TermsModal({isDark,T,onClose}){
  // A: 「善意のイベント」→「地域のイベント」に統一
  const ok=["誰かを助けた体験・行動の記録","感謝の気持ち・ありがとうのエピソード","誰かを笑顔にした瞬間の記録","清掃・美化活動の記録","地域のイベント・呼びかけ","前向きな改善提案"];
  const ng=["特定の人への批判・中傷・嫌がらせ","怒り・不満・悪口の投稿","性的・暴力的・差別的な内容","連絡先・URL・個人情報の記載","実際にいない場所からの投稿","商用宣伝・勧誘目的の投稿"];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:12000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(16px)",padding:16}} onClick={onClose}>
      <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:24,width:"min(420px,95vw)",maxHeight:"88vh",display:"flex",flexDirection:"column",animation:"fadeScaleIn 0.22s ease",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"20px 22px 14px",borderBottom:`1px solid ${T.border}`,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:16,fontWeight:900,color:T.text}}>ルールと約束</div><div style={{fontSize:11,color:T.muted,marginTop:2}}>気持ちよく使えるために</div></div>
          <button style={{background:"transparent",border:"none",color:T.muted,fontSize:22,cursor:"pointer",lineHeight:1}} onClick={onClose}>×</button>
        </div>
        <div style={{overflowY:"auto",padding:"14px 22px 20px",flex:1,display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#10b981",marginBottom:8}}>✓ 投稿できること</div>
            <div style={{display:"grid",gap:5}}>{ok.map((t,i)=><div key={i} style={{display:"flex",gap:9,alignItems:"center",padding:"9px 11px",background:"rgba(16,185,129,0.05)",border:"1px solid rgba(16,185,129,0.1)",borderRadius:9,fontSize:12,color:T.sub}}><span style={{color:"#10b981",fontWeight:700,flexShrink:0}}>✓</span>{t}</div>)}</div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#ef4444",marginBottom:8}}>✕ 投稿できないこと</div>
            <div style={{display:"grid",gap:5}}>{ng.map((t,i)=><div key={i} style={{display:"flex",gap:9,alignItems:"center",padding:"9px 11px",background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.09)",borderRadius:9,fontSize:12,color:T.sub}}><span style={{color:"#ef4444",fontWeight:700,flexShrink:0}}>✕</span>{t}</div>)}</div>
          </div>
          <div style={{padding:"11px 13px",background:isDark?"rgba(255,255,255,0.04)":"#f8fafc",border:`1px solid ${T.border}`,borderRadius:10,fontSize:11,color:T.muted,lineHeight:1.8}}>通報が3件以上集まると自動的に非表示になります。</div>
        </div>
        <div style={{padding:"12px 22px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
          <button style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",border:"none",borderRadius:12,color:"white",fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ====================================================
// 使い方ガイド
// ====================================================
function GuideModal({isDark,T,onClose}){
  const [tab,setTab]=useState(0);
  const tabs=["基本操作","GoodJob・助かった","1kmルール","Q&A"];
  const cardBg=isDark?"rgba(255,255,255,0.04)":"#f8fafc";
  const contents=[
    <div key={0} style={{display:"flex",flexDirection:"column",gap:10}}>
      {[{step:"01",title:"内容を入力する",desc:"「投稿」ボタンを押すとフォームが出る。投稿タイプを選んで5〜120文字で内容を書く。"},
        {step:"02",title:"場所を決める",desc:"「場所を決める」を押すとフォームが消えて地図が全面に。赤い円の中をタップ。"},
        {step:"03",title:"投稿完了",desc:"マーカーが地図に表示され、他の人にも即座に見える。"},
        {step:"04",title:"他の投稿を見る",desc:"マーカーをタップすると詳細が見られる。GoodJobやコメントも送れる。"},
      ].map((s,i)=>(
        <div key={i} style={{display:"flex",gap:12,padding:"12px 13px",background:cardBg,border:`1px solid ${T.border}`,borderRadius:11}}>
          <div style={{fontSize:10,fontWeight:900,color:"#3b82f6",opacity:0.7,flexShrink:0,width:20,marginTop:1}}>{s.step}</div>
          <div><div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:3}}>{s.title}</div><div style={{fontSize:11,color:T.sub,lineHeight:1.7}}>{s.desc}</div></div>
        </div>
      ))}
    </div>,
    // A: GoodJob・助かった の説明をより自然に
    <div key={1} style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{padding:"13px",background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.15)",borderRadius:11}}>
        <div style={{fontSize:15,marginBottom:6}}>✨ GoodJob</div>
        <div style={{fontSize:12,color:T.sub,lineHeight:1.8}}>「それいいな」という気軽な共感。だれでも・どんな投稿にも送れる。投稿した人の背中を押す、小さな応援。</div>
      </div>
      <div style={{padding:"13px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:11}}>
        <div style={{fontSize:15,marginBottom:6}}>🙏 助かった</div>
        <div style={{fontSize:12,color:T.sub,lineHeight:1.8}}>その場所や情報が実際に役立ったとき。「助けてもらった」という具体的な実感を伝えられる。GoodJobより重い一票。</div>
      </div>
    </div>,
    <div key={2} style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{padding:"13px",background:cardBg,border:`1px solid ${T.border}`,borderRadius:11}}><div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:6}}>なぜ1kmなのか</div><div style={{fontSize:12,color:T.sub,lineHeight:1.8}}>現在地から1km以内にしか投稿できない。「その場所にいた人の記録」だけを残すため。</div></div>
      <div style={{padding:"13px",background:cardBg,border:`1px solid ${T.border}`,borderRadius:11}}><div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:6}}>位置情報の許可が必要</div><div style={{fontSize:12,color:T.sub,lineHeight:1.8}}>ブラウザの位置情報を「許可」にしないと投稿できない。</div></div>
    </div>,
    <div key={3} style={{display:"flex",flexDirection:"column",gap:8}}>
      {[{q:"アカウント登録は必要？",a:"不要。起動時に自動的に匿名IDが発行される。"},
        {q:"投稿を削除できる？",a:"自分の投稿は削除できる。マーカーをタップしてパネルから削除ボタンを押す。"},
        {q:"他人の迷惑な投稿はどうする？",a:"投稿パネルの「通報」ボタンを押す。3件以上で自動非表示。"},
        {q:"写真はどこに保存される？",a:"Firestoreに圧縮されて保存される（最大120KB）。"},
      ].map((qa,i)=>(
        <div key={i} style={{padding:"11px 13px",background:cardBg,border:`1px solid ${T.border}`,borderRadius:10}}>
          <div style={{fontSize:12,fontWeight:800,color:T.text,marginBottom:4}}>Q. {qa.q}</div>
          <div style={{fontSize:11,color:T.sub,lineHeight:1.7}}>A. {qa.a}</div>
        </div>
      ))}
    </div>,
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:12000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(16px)",padding:16}} onClick={onClose}>
      <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:24,width:"min(440px,95vw)",maxHeight:"88vh",display:"flex",flexDirection:"column",animation:"fadeScaleIn 0.22s ease",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"20px 22px 14px",borderBottom:`1px solid ${T.border}`,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:16,fontWeight:900,color:T.text}}>使い方ガイド</div><div style={{fontSize:11,color:T.muted,marginTop:2}}>このアプリの使い方と仕組み</div></div>
          <button style={{background:"transparent",border:"none",color:T.muted,fontSize:22,cursor:"pointer",lineHeight:1}} onClick={onClose}>×</button>
        </div>
        <div style={{display:"flex",gap:4,padding:"10px 16px",borderBottom:`1px solid ${T.border}`,flexShrink:0,overflowX:"auto"}}>
          {tabs.map((t,i)=>(
            <button key={i} style={{padding:"6px 12px",borderRadius:999,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",background:tab===i?(isDark?"rgba(59,130,246,0.2)":"rgba(37,99,235,0.1)"):"transparent",color:tab===i?"#3b82f6":T.muted}} onClick={()=>setTab(i)}>{t}</button>
          ))}
        </div>
        <div style={{overflowY:"auto",padding:"14px 22px 20px",flex:1}}>{contents[tab]}</div>
        <div style={{padding:"12px 22px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
          <button style={{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",border:"none",borderRadius:12,color:"white",fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// ====================================================
// チュートリアル
// ====================================================
function TutorialOverlay({isDark,T,onClose}){
  const [step,setStep]=useState(0);
  // A: 「善意」を連呼せず、街の記録という文脈で統一
  const steps=[
    {emoji:"🗺️",title:"ようこそ",desc:"街で起きたいい出来事を地図に残すアプリです。今日、近くでどんなことがあったかリアルタイムで見えます。"},
    {emoji:"📝",title:"まず内容を書く",desc:"「投稿」ボタンを押すとフォームが出ます。投稿タイプを選んで5〜120文字で書いてください。"},
    {emoji:"📍",title:"次に場所を決める",desc:"「場所を決める」を押すとフォームが消えて地図が全面に。赤い円の中をタップすると投稿完了。"},
    {emoji:"📋",title:"投稿のルール",desc:"批判・怒り・個人情報はNG。助けた、感謝した、笑顔にした——そういった体験を書きます。"},
    {emoji:"🌍",title:"準備完了",desc:"地図を見て、まず一つ記録してみましょう。"},
  ];
  const s=steps[step];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:15000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(16px)"}}>
      <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:28,padding:"36px 32px",width:"min(360px,90vw)",textAlign:"center",animation:"fadeScaleIn 0.3s ease"}}>
        <div style={{fontSize:52,marginBottom:14}}>{s.emoji}</div>
        <div style={{fontSize:17,fontWeight:900,color:T.text,marginBottom:8}}>{s.title}</div>
        <div style={{fontSize:13,color:T.sub,lineHeight:1.8,marginBottom:26}}>{s.desc}</div>
        <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:22}}>
          {steps.map((_,i)=><div key={i} style={{width:i===step?18:6,height:6,borderRadius:999,background:i===step?"#3b82f6":isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.1)",transition:"all 0.3s"}}/>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          {step>0&&<button style={{flex:1,padding:"11px 0",background:"transparent",border:`1px solid ${T.border}`,borderRadius:12,fontSize:13,color:T.sub,cursor:"pointer"}} onClick={()=>setStep(s=>s-1)}>戻る</button>}
          <button style={{flex:2,padding:"11px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={()=>step<steps.length-1?setStep(s=>s+1):onClose()}>{step<steps.length-1?"次へ":"はじめる 🌟"}</button>
        </div>
      </div>
    </div>
  );
}

// ====================================================
// ダイジェスト（助かった・記録中心）
// ====================================================
function DigestModal({posts,currentUser,isDark,T,onClose}){
  const today=new Date().toDateString();
  const todayPosts=posts.filter(p=>new Date(p.timestamp).toDateString()===today&&!p.hidden);
  const myToday=todayPosts.filter(p=>p.userId===currentUser);
  const totalHelpedToday=todayPosts.reduce((s,p)=>s+(p.helpedBy||[]).length,0);
  const myHelpedToday=myToday.reduce((s,p)=>s+(p.helpedBy||[]).length,0);

  // needTags 別の記録件数
  const {NEED_TAGS}=(() => {
    try { return {NEED_TAGS:[{id:"trash",label:"🗑️ ゴミ捨て"},{id:"toilet",label:"🚻 トイレ"},{id:"bench",label:"🪑 ベンチ"},{id:"rest",label:"☕ 休憩"},{id:"water",label:"💧 水場"},{id:"shade",label:"🌳 日陰"},{id:"shelter",label:"🏠 屋内避難"},{id:"barrier",label:"♿ バリアフリー"},{id:"kids",label:"👶 子ども向け"},{id:"night",label:"🌙 夜でも安心"}]}; }
    catch { return {NEED_TAGS:[]}; }
  })();
  const needTagMap={};
  todayPosts.forEach(p=>(p.needTags||[]).forEach(id=>{needTagMap[id]=(needTagMap[id]||0)+1;}));
  const topNeedTags=Object.entries(needTagMap).sort((a,b)=>b[1]-a[1]).slice(0,4);

  // 今日いちばん助かった記録
  const mostHelped=[...todayPosts].sort((a,b)=>(b.helpedBy||[]).length-(a.helpedBy||[]).length)[0];

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(16px)"}} onClick={onClose}>
      <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:24,padding:"24px",width:"min(360px,92vw)",animation:"fadeScaleIn 0.22s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div><div style={{fontSize:15,fontWeight:900,color:T.text}}>今日のまとめ</div><div style={{fontSize:11,color:T.muted,marginTop:2}}>{new Date().toLocaleDateString("ja-JP",{month:"long",day:"numeric"})}</div></div>
          <button style={{fontSize:20,background:"transparent",border:"none",cursor:"pointer",color:T.muted,lineHeight:1}} onClick={onClose}>×</button>
        </div>

        {/* 主役: 助かった・記録 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[
            {val:todayPosts.length, label:"今日の記録",  color:"#818cf8"},
            {val:totalHelpedToday,  label:"助かった計",  color:"#f59e0b"},
            {val:myToday.length,    label:"自分の記録",  color:"#10b981"},
          ].map(({val,label,color})=>(
            <div key={label} style={{background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,padding:"10px 4px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color,lineHeight:1}}>{val}</div>
              <div style={{fontSize:9,color:T.muted,marginTop:3}}>{label}</div>
            </div>
          ))}
        </div>

        {/* 自分の助かった */}
        {myHelpedToday>0&&(
          <div style={{padding:"10px 12px",background:isDark?"rgba(245,158,11,0.07)":"rgba(254,243,199,0.5)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:11,marginBottom:10,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:24}}>🙏</span>
            <div>
              <div style={{fontSize:12,fontWeight:800,color:"#f59e0b"}}>今日 {myHelpedToday}人に助かったと伝わりました</div>
              <div style={{fontSize:10,color:T.muted,marginTop:1}}>あなたの記録が役に立っています</div>
            </div>
          </div>
        )}

        {/* 今日いちばん助かった記録 */}
        {mostHelped&&(mostHelped.helpedBy||[]).length>0&&(
          <div style={{padding:"11px 12px",background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:11,marginBottom:10}}>
            <div style={{fontSize:10,color:"#f59e0b",fontWeight:800,marginBottom:5}}>🔥 今日いちばん助かった記録</div>
            <div style={{fontSize:12,color:T.sub,lineHeight:1.6}}>{mostHelped.text.slice(0,60)}{mostHelped.text.length>60?"…":""}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:4}}>🙏 {(mostHelped.helpedBy||[]).length}人 · 助かった</div>
          </div>
        )}

        {/* needTags 別の記録傾向 */}
        {topNeedTags.length>0&&(
          <div style={{padding:"11px 12px",background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:11,marginBottom:10}}>
            <div style={{fontSize:10,color:"#10b981",fontWeight:800,marginBottom:8}}>📍 今日よく残された場所タイプ</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {topNeedTags.map(([id,cnt])=>{
                const tag=NEED_TAGS.find(t=>t.id===id);
                return tag?(
                  <div key={id} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:isDark?"rgba(16,185,129,0.08)":"rgba(209,250,229,0.5)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:999}}>
                    <span style={{fontSize:11}}>{tag.label}</span>
                    <span style={{fontSize:10,color:T.muted}}>×{cnt}</span>
                  </div>
                ):null;
              })}
            </div>
          </div>
        )}

        {todayPosts.length===0&&(
          <div style={{textAlign:"center",padding:"28px 0",color:T.muted}}>
            <div style={{fontSize:36,opacity:0.4}}>📍</div>
            <div style={{marginTop:8,fontSize:13,color:T.sub}}>今日はまだ記録がありません</div>
            <div style={{fontSize:11,color:T.muted,marginTop:4}}>近くで気づいたことを残してみましょう</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ====================================================
// ストレージ管理
// ====================================================
function StorageModal({posts,onDeletePosts,currentUser,isDark,T,onClose,storageKB,onToast}){
  const [selected,setSelected]=useState(new Set());
  const [filter,setFilter]=useState("old");
  const [deleting,setDeleting]=useState(false);
  const displayPosts=useMemo(()=>{let p=[...posts];if(filter==="old")p=[...p].sort((a,b)=>a.timestamp-b.timestamp).slice(0,50);else if(filter==="mine")p=p.filter(q=>q.userId===currentUser).sort((a,b)=>a.timestamp-b.timestamp);else p=[...p].sort((a,b)=>a.timestamp-b.timestamp);return p;},[posts,filter,currentUser]);
  const toggleAll=()=>{if(selected.size===displayPosts.length)setSelected(new Set());else setSelected(new Set(displayPosts.map(p=>p.id)));};
  const handleDelete=async()=>{if(selected.size===0||deleting)return;setDeleting(true);await onDeletePosts([...selected]);setSelected(new Set());setDeleting(false);onClose();};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:9500,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(16px)"}} onClick={onClose}>
      <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:22,padding:"22px",width:"min(400px,95vw)",maxHeight:"85vh",display:"flex",flexDirection:"column",animation:"fadeScaleIn 0.2s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><div style={{fontSize:14,fontWeight:900,color:T.text}}>投稿の管理</div><div style={{fontSize:11,color:T.muted,marginTop:2}}>削除する投稿を選べます</div></div>
          <button style={{fontSize:20,background:"transparent",border:"none",cursor:"pointer",color:T.muted,lineHeight:1}} onClick={onClose}>×</button>
        </div>
        <div style={{padding:"9px 11px",background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:11,color:T.sub}}>総投稿数</span>
          <span style={{fontSize:18,fontWeight:900,color:"#3b82f6"}}>{posts.length}<span style={{fontSize:11,color:T.muted,fontWeight:400}}> 件</span></span>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:9}}>
          {[{id:"old",label:"古い順"},{id:"mine",label:"自分の投稿"},{id:"all",label:"すべて"}].map(f=>(
            <button key={f.id} style={{flex:1,padding:"5px 0",background:filter===f.id?(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"):"transparent",border:`1px solid ${filter===f.id?T.sub:T.border}`,borderRadius:8,color:filter===f.id?T.text:T.muted,fontSize:10,cursor:"pointer",fontWeight:filter===f.id?800:400}} onClick={()=>setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
          <button style={{fontSize:11,color:T.muted,background:"transparent",border:"none",cursor:"pointer"}} onClick={toggleAll}>{selected.size===displayPosts.length?"すべて解除":"すべて選択"}</button>
          <span style={{fontSize:11,color:T.muted}}>{selected.size}件選択中</span>
        </div>
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
          {displayPosts.map(p=>{
            const sel=selected.has(p.id);const d=new Date(p.timestamp);
            return(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:sel?(isDark?"rgba(239,68,68,0.08)":"rgba(254,226,226,0.4)"):T.card,border:`1px solid ${sel?"rgba(239,68,68,0.25)":T.cardBorder}`,borderRadius:9,cursor:"pointer"}} onClick={()=>setSelected(prev=>{const n=new Set(prev);sel?n.delete(p.id):n.add(p.id);return n;})}>
                <div style={{width:15,height:15,borderRadius:4,background:sel?"#ef4444":"transparent",border:`1.5px solid ${sel?"#ef4444":T.border}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{sel&&<span style={{color:"white",fontSize:9,fontWeight:900}}>✓</span>}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,color:T.sub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.text}</div><div style={{fontSize:9,color:T.muted,marginTop:1}}>{d.getFullYear()}/{d.getMonth()+1}/{d.getDate()} · ✨{p.likes}</div></div>
                {p.userId===currentUser&&<span style={{fontSize:9,color:"#3b82f6",flexShrink:0}}>自分</span>}
              </div>
            );
          })}
        </div>
        <button style={{width:"100%",padding:"11px 0",background:selected.size>0?"linear-gradient(135deg,#ef4444,#dc2626)":"transparent",border:`1px solid ${selected.size>0?"#ef4444":T.border}`,borderRadius:11,color:selected.size>0?"white":T.muted,fontSize:13,fontWeight:800,cursor:selected.size>0&&!deleting?"pointer":"not-allowed"}} onClick={handleDelete} disabled={selected.size===0||deleting}>
          {deleting?"削除中…":`${selected.size}件を削除する`}
        </button>
      </div>
    </div>
  );
}
