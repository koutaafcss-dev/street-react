import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, arrayUnion, arrayRemove, runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./hooks/useAuth";
import { useGPS } from "./hooks/useGPS";
import { usePagination } from "./hooks/usePagination";
import { useNotifications } from "./hooks/useNotifications";
import { useGroup } from "./hooks/useGroup";
import { usePostComposer } from "./hooks/usePostComposer";
import { useUiShellState } from "./hooks/useUiShellState";
import { useTextValidation } from "./hooks/useTextValidation";
import { useAIModerator } from "./hooks/useAIModerator";
import { useImageVideoModerator } from "./hooks/useImageVideoModerator";
import { usePostReporting } from "./hooks/usePostReporting";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import PostForm from "./components/PostForm";
import GroupPanel from "./components/GroupPanel";
import ProfileAvatarEditor from "./components/ProfileAvatarEditor";
import TrajectoryHistoryModal from "./components/TrajectoryHistoryModal";
import AppealModal from "./components/AppealModal";
import AdminDashboard from "./components/AdminDashboard";
import PhoneAuthModal from "./components/PhoneAuthModal";
import { expandPostsForMap } from "./utils/expandPostsForMap";
import { compressImage } from "./utils/imageOptimization";

const POST_RADIUS = 1;
const POST_SUCCESS_MESSAGES=["📍 地図に記録しました","🌱 この場所に残しました","✨ マップに追加されました","💫 記録が完了しました","🗺️ 地図に刻まれました"];




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
  const { currentUser, isAnonymous, isPhoneVerified, displayName, suspended, trustScore, authLoading } = useAuth();
  const { posts, isLoading: postsLoading, hasMore, fetchMore } = usePagination(currentUser, {
    onError: err => showToastRef.current?.(getFirestoreError(err), "error"),
  });
  const { checkNG } = useTextValidation();
  
  // AI モデレーション初期化（Cloud Functions経由）
  const { moderate, isModerating } = useAIModerator(null); // APIキーをnullに設定
  const { moderateImage } = useImageVideoModerator(null);

  // 投稿報告システム
  const { reportPost, checkUserReportedPost } = usePostReporting(currentUser);
  
  // 電話認証モーダルの表示状態
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);

  const {
    userPosition, userAccuracy, gpsError, setGpsError,
    isTracking, setIsTracking,
    trajectory, trajectoryHistory, trajectoryCount,
    showTrajectoryOnMap, setShowTrajectoryOnMap,
    todayDist, totalDist,
    clearTrajectory,
  } = useGPS({});
  const { notifications, setNotifications, unreadCount, markAllRead } =
    useNotifications(posts, currentUser);

  // ─── 投稿フォーム state (usePostComposer) ───
  const {
    postText, setPostText,
    postType, setPostType,
    postPhoto, setPostPhoto,
    postEventDate, setPostEventDate,
    postExpiry, setPostExpiry,
    postNeedTags, setPostNeedTags,
    chainPostId, setChainPostId,
    isPosting, setIsPosting,
    postPhase, setPostPhase,
    postTimestamps, setPostTimestamps,
    isFrozen, setIsFrozen,
    resetForm: resetFormBase,
  } = usePostComposer();

  // ─── UI Shell state (useUiShellState) ───
  const {
    toast,
    showToast,
    showNotif, setShowNotif,
    showSidebar, setShowSidebar,
    showTutorial, setShowTutorial,
    showStorage, setShowStorage,
    showTerms, setShowTerms,
    showGuide, setShowGuide,
    showOpening, setShowOpening,
    showNickEdit, setShowNickEdit,
    showBioEdit, setShowBioEdit,
    showTagsEdit, setShowTagsEdit,
    showHeaderEdit, setShowHeaderEdit,
    showAvatarEdit, setShowAvatarEdit,
    newBannerCount, setNewBannerCount,
    storageWarning, setStorageWarning,
    showGroupPanel, setShowGroupPanel,
    showLocationSettings, setShowLocationSettings,
  } = useUiShellState();
  showToastRef.current = showToast;

  // ─── UI State ───
  const [flyToTarget,setFlyToTarget]=useState(null);
  const [radius,setRadius]=useState(5);
  const [activeTab,setActiveTab]=useState("feed");
  const [searchText,setSearchText]=useState("");
  const [sortMode,setSortMode]=useState("near");
  const [editingId,setEditingId]=useState(null);
  const [isDark,setIsDark]=useState(()=>localStorage.getItem("zenTheme")!=="light");
  const [nickname,setNickname]=useState(()=>localStorage.getItem("zenNick")||"");
  const [bookmarks,setBookmarks]=useState(()=>load("zenBookmarks",[]));
  // ─── プロフィール拡張 ───
  const [profileBio,setProfileBio]=useState(()=>localStorage.getItem("zenBio")||"");
  const [profileMyTags,setProfileMyTags]=useState(()=>load("zenMyTags",[]));
  const [profileHeaderColor,setProfileHeaderColor]=useState(()=>localStorage.getItem("zenHeaderColor")||"city");
  const [profileAvatarEmoji,setProfileAvatarEmoji]=useState(()=>localStorage.getItem("zenAvatar")||"🚶");
  const [profileAvatarPhoto,setProfileAvatarPhoto]=useState(()=>localStorage.getItem("zenAvatarPhoto")||"");
  const [profilePinnedPostId,setProfilePinnedPostId]=useState(()=>localStorage.getItem("zenPinnedPost")||"");
  const [tagInputValue,setTagInputValue]=useState("");
  const [postEffect,setPostEffect]=useState(null);
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  const [highlightMine,setHighlightMine]=useState(false);
  const [pwaPrompt,setPwaPrompt]=useState(null);
  const [pinnedIds,setPinnedIds]=useState(()=>load("zenPinned",[]));
  const [seenIds,setSeenIds]=useState(()=>load("zenSeen",[]));
  const [mood,setMood]=useState(()=>load("zenMood",{}));
  const lastPostIdRef=useRef(null);
  const [showTrajectoryHistory,setShowTrajectoryHistory]=useState(false);
  const [selectedLocations,setSelectedLocations]=useState([]);
  const initialLoadDoneRef=useRef(false);
  const prevPostsLengthRef=useRef(0);

  // 報告フォーム state
  const [reportingPostId, setReportingPostId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  // 異議申し立てモーダル state
  const [appealingPost, setAppealingPost] = useState(null);

  // 管理者ダッシュボード state
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // ─── グループ機能 ───
  const {
    myGroups, groupsLoading,
    activeGroupId, setActiveGroupId,
    activeGroupData, groupPosts, groupPostsLoading,
    isAdmin: isGroupAdmin,
    createGroup, joinByInviteCode, leaveGroup,
    addGroupPost, deleteGroupPost,
    regenerateInviteCode, updateGroupSettings,
  } = useGroup(currentUser);

  const T=useMemo(()=>makeTheme(isDark),[isDark]);


  const myPosts=useMemo(()=>posts.filter(p=>p.userId===currentUser),[posts,currentUser]);

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
  useEffect(()=>{
    if(profileAvatarPhoto)localStorage.setItem("zenAvatarPhoto",profileAvatarPhoto);
    else localStorage.removeItem("zenAvatarPhoto");
  },[profileAvatarPhoto]);
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
  const canPost=validation.ok && isPhoneVerified && !suspended;

  const handlePostClick = useCallback(() => {
    if (!isPhoneVerified) {
      showToast("投稿にはアカウント作成が必要です", "error");
      setShowPhoneAuth(true);
      return;
    }
    if (suspended) {
      showToast("📛 このアカウントは一時停止中です。管理者に確認してください", "error");
      return;
    }
    if (!validation.ok) {
      showToast(validation.message, "error");
    }
  }, [isPhoneVerified, suspended, validation]);

  const savePostWithSelectedLocations=useCallback(async()=>{
    if(!currentUser){showToast("認証中です。少しお待ちください","error");return;}
    if(suspended){showToast("📛 アカウントが一時停止中です。投稿できません","error");return;}
    if(!validation.ok){showToast(validation.message,"error");return;}
    if(isFrozen){showToast("投稿制限中です。しばらくお待ちください","error");return;}
    if(selectedLocations.length===0){showToast("地図をタップして場所を1つ以上追加してください","error");return;}

    // AI モデレーション実行（Cloud Functions経由）
    if (true) { // 常に実行（APIキー不要）
      try {
        const moderateText = httpsCallable(functions, 'moderateText');
        const aiResult = await moderateText({ text: postText });
        if (!aiResult.data.safe) {
          showToast(aiResult.data.reason, "error");
          return;
        }

        // 画像モデレーション実行
        if (postPhoto) {
          const moderateImageFn = httpsCallable(functions, 'moderateImage');
          const imageResult = await moderateImageFn({ imageData: postPhoto });
          if (!imageResult.data.safe) {
            showToast(imageResult.data.reason, "error");
            return;
          }
        }
      } catch (err) {
        console.error("AI moderation failed:", err);
        // API エラー時は続行（フォールバック）
      }
    }

    const now=Date.now();
    const newTs=[...postTimestamps,now].filter(t=>now-t<30000);
    if(newTs.length>=3){setIsFrozen(true);setTimeout(()=>setIsFrozen(false),30000);showToast("連続投稿を検出しました。30秒後に解除されます","error");return;}
    setPostTimestamps(newTs);

    const expiryMs={none:null,"1h":3600000,"6h":21600000,"24h":86400000,"3d":259200000};
    let compressedPhoto=null;
    if(postPhoto){try{compressedPhoto=await compressImage(postPhoto);}catch(e){showToast(`📷 ${e.message}`,"error");return;}}

    const locations=selectedLocations.map((loc,index)=>({
      id:loc.id||`loc-${index+1}`,
      lat:loc.lat,
      lng:loc.lng,
      label:loc.label||`地点${index+1}`
    }));
    const primary=locations[0];

    const postData={
      text:postText.trim(),tags:extractTags(postText),category:null,postType,
      needTags:postNeedTags,
      photo:compressedPhoto,eventDate:postType==="event"?postEventDate:null,
      expiresAt:expiryMs[postExpiry]?now+expiryMs[postExpiry]:null,
      chainId:chainPostId,lat:primary.lat,lng:primary.lng,userId:currentUser,
      primaryLocation:{lat:primary.lat,lng:primary.lng,label:primary.label||""},
      locations,locationCount:locations.length,
      likes:0,likedBy:[],helpedBy:[],reactions:{},comments:[],
      reports:0,reportedBy:[],hidden:false,edited:false,timestamp:now,
    };

    try{
      const docRef=await addDoc(collection(db,"posts"),postData);
      lastPostIdRef.current=docRef.id;
      setPostEffect({lat:primary.lat,lng:primary.lng,type:postType,id:now});
      setTimeout(()=>setPostEffect(null),2200);
      resetForm();setActiveTab("feed");
      if(isMobile)setShowSidebar(true);
      showToast(`${locations.length}地点で${getSuccessMessage(postType)}`);
    }catch(e){showToast(getFirestoreError(e,"投稿に失敗しました"),"error");}
  },[currentUser,validation,isFrozen,selectedLocations,postTimestamps,postPhoto,postText,postType,postNeedTags,postEventDate,postExpiry,chainPostId,resetForm,isMobile]);

  const handleMapClick=useCallback((latlng)=>{
    if(!isPosting||postPhase!=="picking")return;
    if(!currentUser){showToast("認証中です。少しお待ちください","error");return;}
    if(!validation.ok){showToast(validation.message,"error");return;}
    if(isFrozen){showToast("投稿制限中です。しばらくお待ちください","error");return;}
    if(userPosition){const dist=getDistance(userPosition[0],userPosition[1],latlng.lat,latlng.lng);if(dist>POST_RADIUS){showToast(`📍 現在地から${POST_RADIUS}km以内にしか投稿できません`,"error");return;}}
    const point={id:`loc-${Date.now()}`,lat:latlng.lat,lng:latlng.lng,label:`地点${selectedLocations.length+1}`};
    setSelectedLocations(prev=>[...prev,point]);
    showToast(`地点を追加しました（${selectedLocations.length+1}件）`);
  },[isPosting,postPhase,currentUser,validation,isFrozen,userPosition,selectedLocations.length]);

  const handleRemoveSelectedLocation=useCallback((id)=>{
    setSelectedLocations(prev=>prev.filter(loc=>loc.id!==id));
  },[]);

  const handleDelete=async id=>{try{await deleteDoc(doc(db,"posts",id));showToast("投稿を削除しました");}catch(e){showToast(getFirestoreError(e),"error");}};

  /**
   * GoodJob — トランザクション化 + self-like ブロック
   * 副作用（ミッション・toast）は transaction 外で実行
   */
  const handleGoodJob=async id=>{
    if(!currentUser)return;
    try{
      await runTransaction(db,async transaction=>{
        const postRef=doc(db,"posts",id);
        const snap=await transaction.get(postRef);
        if(!snap.exists())return;
        const data=snap.data();
        if(data.userId===currentUser)return; // self-like ブロック
        const liked=(data.likedBy||[]).includes(currentUser);
        transaction.update(postRef,{
          likedBy:liked?arrayRemove(currentUser):arrayUnion(currentUser),
          likes:liked?Math.max(0,(data.likes||0)-1):(data.likes||0)+1,
        });
      });
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
  
  const handleComment=async(id,text)=>{
    if(!text.trim()||!currentUser)return;
    const v=checkNG(text);
    if(!v.ok){showToast(v.message,"error");return;}
    
    // AI モデレーション実行（有効な場合）
    if(openaiApiKey){
      try{
        const aiResult=await moderate(text);
        if(!aiResult.safe){
          showToast(aiResult.reason,"error");
          return;
        }
      }catch(err){
        console.error("AI moderation failed:",err);
      }
    }
    
    const comment={id:Date.now().toString(),text:text.trim(),userId:currentUser,timestamp:Date.now()};
    try{
      await updateDoc(doc(db,"posts",id),{comments:arrayUnion(comment)});
    }catch(e){
      showToast(getFirestoreError(e),"error");
    }
  };
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
   * 投稿報告フォームを表示
   */
  const handleReportStart = (postId) => {
    setReportingPostId(postId);
    setReportReason("");
    setReportDescription("");
  };

  /**
   * 投稿を報告（詳細理由付き・usePostReporting による）
   */
  const handleReportSubmit = async () => {
    if (!currentUser || !reportingPostId) return;
    if (!reportReason) {
      showToast("報告理由を選択してください", "error");
      return;
    }

    const result = await reportPost(reportingPostId, {
      reason: reportReason,
      description: reportDescription,
    });

    if (result.success) {
      showToast("問題を報告しました。ご協力ありがとうございます", "success");
      setReportingPostId(null);
      setReportReason("");
      setReportDescription("");
    } else {
      showToast("報告に失敗しました", "error");
    }
  };

  /**
   * 異議申し立てを開始
   */
  const handleAppealStart = (post) => {
    setAppealingPost(post);
  };

  /**
   * 異議申し立て完了時の処理
   */
  const handleAppealSubmitted = (result) => {
    if (result.restored) {
      showToast("異議申し立てが承認され、投稿が復元されました", "success");
    } else if (result.status === "approved") {
      showToast("異議申し立てが承認されました", "success");
    } else {
      showToast("異議申し立てが審査中です。結果は通知でお知らせします", "info");
    }
  };

  /**
   * 編集保存 — タグも更新（旧: text のみで検索インデックスが古いまま）
   */
  const handleEditSave=async(id,newText)=>{
    const v=checkNG(newText);
    if(!v.ok){showToast(v.message,"error");return;}
    
    // AI モデレーション実行（有効な場合）
    if(openaiApiKey){
      try{
        const aiResult=await moderate(newText);
        if(!aiResult.safe){
          showToast(aiResult.reason,"error");
          return;
        }
      }catch(err){
        console.error("AI moderation failed:",err);
      }
    }
    
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
    if(navigator.share)navigator.share({title:"VIALE",text}).catch(()=>{});
    else navigator.clipboard.writeText(text).then(()=>showToast("📋 コピーしました")).catch(()=>showToast("コピーに失敗しました","error"));
  };
  const handleChain=id=>{setChainPostId(id);setIsPosting(true);setPostPhase("form");if(isMobile)setShowSidebar(false);};
  const handleThanks=postId=>{
    const post=posts.find(p=>p.id===postId);
    if(!post||post.userId!==currentUser)return;
    const helpers=(post.helpedBy||[]).length;
    if(helpers===0){showToast("まだ「助かった」がありません");return;}
    setNotifications(prev=>[{
      id:Date.now().toString(),type:"thanks",
      text:`「${post.text.slice(0,20)}…」の「助かった」に感謝を送りました 🙏`,
      timestamp:Date.now(),read:false
    },...prev].slice(0,30));
    showToast(`🙏 ${helpers}人に感謝を伝えました！`);
  };
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
  const mapPosts=expandPostsForMap(visiblePosts);
  const recentInRadius=visiblePosts.filter(p=>userPosition&&getDistance(userPosition[0],userPosition[1],p.lat,p.lng)<=radius&&Date.now()-p.timestamp<86400000);
  const activeUsers=new Set(recentInRadius.filter(p=>p.userId!==currentUser).map(p=>p.userId)).size;
  const chainPost=chainPostId?posts.find(p=>p.id===chainPostId):null;
  const newPostCount=visiblePosts.filter(p=>!seenIds.includes(p.id)).length;
  const storageKB=getStorageUsageKB();

  // ────────────────────────────────────────────────────────
  if(authLoading){
    return(
      <div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#050810",fontFamily:"'Noto Sans JP',sans-serif",gap:20}}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{animation:"fadeUp .5s ease",textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:12}}>🗺️</div>
          <div style={{fontSize:20,fontWeight:900,color:"#f1f5f9",marginBottom:4,letterSpacing:"0.04em"}}>VIALE</div>
          <div style={{fontSize:12,color:"#7a8ea6",letterSpacing:"0.08em",marginBottom:24}}>近くの助かりを、地図に残そう</div>
          <div style={{width:32,height:32,border:"2.5px solid rgba(59,130,246,0.2)",borderTopColor:"#3b82f6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
        </div>
      </div>
    );
  }

  const sidebarProps={
    activeTab,setActiveTab,radius,setRadius,posts:visiblePosts,currentUser,userPosition,searchText,setSearchText,sortMode,setSortMode,
    onGoodJob:handleGoodJob,onDelete:handleDelete,onReport:handleReportStart,onEdit:setEditingId,editingId,onEditSave:handleEditSave,onShare:handleShare,onReaction:handleReaction,onBookmark:handleBookmark,bookmarks,onComment:handleComment,onDeleteComment:handleDeleteComment,
    onStartPost:()=>{setIsPosting(true);setPostPhase("form");if(isMobile)setShowSidebar(false);},
    isFrozen,myPostsCount:myPosts.length,unreadCount,
    onShowNotif:()=>{setShowNotif(true);markAllRead();},
    isDark,setIsDark,T,nickname,onEditNick:()=>setShowNickEdit(true),onChain:handleChain,onThanks:handleThanks,activeUsers,
    isTracking,setIsTracking,todayDist,totalDist,trajectoryCount:trajectory.length,onClearTrajectory:handleClearTrajectory,
    highlightMine,setHighlightMine,pwaPrompt,onPwaInstall:handlePwaInstall,
    lastPostId:lastPostIdRef.current,gpsError,
    pinnedIds,onPin:handlePin,newPostCount,seenIds,
    onShowStorage:()=>setShowStorage(true),storageKB,
    mood,onMood:handleMood,
    onShowTutorial:()=>setShowTutorial(true),
    allPosts:posts,postsLoading,
    onHelped:handleHelped,
    onShowTerms:()=>setShowTerms(true),
    onShowGuide:()=>setShowGuide(true),
    onFlyTo:handleFlyTo,
    profileBio,onEditBio:()=>setShowBioEdit(true),
    profileMyTags,onEditMyTags:()=>setShowTagsEdit(true),
    profileHeaderColor,onEditHeaderColor:()=>setShowHeaderEdit(true),
    profileAvatarEmoji,profileAvatarPhoto,onEditAvatar:()=>setShowAvatarEdit(true),
    profilePinnedPostId,onSetPinnedPost:(id)=>setProfilePinnedPostId(prev=>prev===id?"":id),
    trajectoryHistory,trajectoryCount,showTrajectoryOnMap,onToggleTrajectoryMap:()=>setShowTrajectoryOnMap(v=>!v),onShowTrajectoryHistory:()=>setShowTrajectoryHistory(true),
    onOpenGroupPanel:()=>setShowGroupPanel(true),
    onOpenLocationSettings:()=>setShowLocationSettings(true),
    gpsPermissionStatus: gpsError,
    showAdminDashboard, setShowAdminDashboard,
    isPhoneVerified,
    onShowAuth: () => setShowPhoneAuth(true),
    suspended,
    trustScore,
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
@keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:0.6}}
        @keyframes notifSlide{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeScaleIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
        @keyframes mobileSlideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
        @keyframes previewIn{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:2px}
      `}</style>

      {/* トースト */}
      {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",color:"white",padding:"10px 24px",borderRadius:"999px",fontSize:"13px",fontWeight:"700",zIndex:9999,whiteSpace:"nowrap",background:toast.type==="error"?"linear-gradient(135deg,#ef4444,#dc2626)":"linear-gradient(135deg,#059669,#10b981)",animation:"slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:"0 6px 32px rgba(0,0,0,0.3)"}}>{toast.msg}</div>}

      {/* 新着バナー */}
      {newBannerCount>0&&activeTab==="feed"&&!isPosting&&(
        <div onClick={()=>{setActiveTab("feed");setNewBannerCount(0);}} style={{position:"fixed",top:56,left:"50%",transform:"translateX(-50%)",zIndex:2500,background:"#2563eb",color:"white",padding:"8px 20px",borderRadius:"999px",fontSize:12,fontWeight:700,cursor:"pointer",animation:"bannerIn 0.3s ease",boxShadow:"0 4px 24px rgba(37,99,235,0.4)",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
          <span style={{width:7,height:7,background:"#bfdbfe",borderRadius:"50%",display:"inline-block"}}/>
          {newBannerCount}件の新しい投稿があります
        </div>
      )}

      {/* GPSエラーバー */}
      {gpsError&&(
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:8500,padding:"10px 20px",background:"rgba(245,158,11,0.95)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:"white"}}>
            {gpsError==="位置情報の許可が必要です"||gpsError==="permission"?"📍 位置情報の許可が必要です":gpsError==="unavailable"?"📍 位置情報を取得できません":"📍 "+gpsError}
          </span>
          <button style={{background:"rgba(255,255,255,0.25)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:999,padding:"3px 12px",color:"white",fontSize:11,cursor:"pointer",fontWeight:700}} onClick={()=>setShowLocationSettings(true)}>設定を開く</button>
          <button style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:999,padding:"3px 10px",color:"white",fontSize:11,cursor:"pointer"}} onClick={()=>setGpsError(null)}>×</button>
        </div>
      )}

      {/* ストレージ警告 */}
      {storageWarning&&<div style={{position:"fixed",top:gpsError?46:0,left:0,right:0,zIndex:8400,padding:"10px 20px",background:"rgba(239,68,68,0.95)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}><span style={{fontSize:13,fontWeight:700,color:"white"}}>⚠️ ストレージが残り少なくなっています</span><button style={{background:"rgba(255,255,255,0.25)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:999,padding:"3px 14px",color:"white",fontSize:11,cursor:"pointer",fontWeight:700}} onClick={()=>{setShowStorage(true);setStorageWarning(false);}}>管理する</button><button style={{background:"transparent",border:"none",color:"white",fontSize:16,cursor:"pointer",marginLeft:4}} onClick={()=>setStorageWarning(false)}>×</button></div>}

      {/* グループパネル */}
      {showGroupPanel&&(
        <GroupPanel
          currentUser={currentUser} isDark={isDark} T={T} isMobile={isMobile}
          myGroups={myGroups} groupsLoading={groupsLoading}
          activeGroupId={activeGroupId} setActiveGroupId={setActiveGroupId}
          activeGroupData={activeGroupData} groupPosts={groupPosts} groupPostsLoading={groupPostsLoading}
          isAdmin={isGroupAdmin}
          onCreateGroup={createGroup} onJoinGroup={joinByInviteCode} onLeaveGroup={leaveGroup}
          onAddGroupPost={addGroupPost} onDeleteGroupPost={deleteGroupPost}
          onRegenerateInviteCode={regenerateInviteCode} onUpdateSettings={updateGroupSettings}
          onClose={()=>setShowGroupPanel(false)}
        />
      )}

      {/* 位置情報設定モーダル */}
      {showLocationSettings&&<LocationSettingsModal isDark={isDark} T={T} onClose={()=>setShowLocationSettings(false)} isTracking={isTracking} setIsTracking={setIsTracking} gpsError={gpsError} setGpsError={setGpsError}/>}

      {/* モーダル */}
      {showTutorial&&<TutorialOverlay isDark={isDark} T={T} onClose={()=>{setShowTutorial(false);localStorage.setItem("zenTutorialDone","1");}}/>}
{showStorage&&<StorageModal posts={posts} onDeletePosts={handleDeletePosts} currentUser={currentUser} isDark={isDark} T={T} onClose={()=>setShowStorage(false)}/>}
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
      <ProfileAvatarEditor
        open={showAvatarEdit}
        onClose={()=>setShowAvatarEdit(false)}
        isDark={isDark}
        T={T}
        profileAvatarEmoji={profileAvatarEmoji}
        setProfileAvatarEmoji={setProfileAvatarEmoji}
        profileAvatarPhoto={profileAvatarPhoto}
        setProfileAvatarPhoto={setProfileAvatarPhoto}
        compressImage={compressImage}
        showToast={showToast}
      />

      <TrajectoryHistoryModal
        open={showTrajectoryHistory}
        onClose={()=>setShowTrajectoryHistory(false)}
        points={trajectoryHistory}
        todayDist={todayDist}
        totalDist={totalDist}
        isDark={isDark}
        T={T}
        showOnMap={showTrajectoryOnMap}
        onToggleShowOnMap={()=>setShowTrajectoryOnMap(v=>!v)}
        onClear={()=>{clearTrajectory();showToast("軌跡をリセットしました");}}
      />

      {/* 投稿報告フォーム */}
      {reportingPostId && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:5001,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:isDark?"rgba(5,8,16,0.98)":"white",borderRadius:20,padding:24,maxWidth:500,width:"90%",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <h3 style={{margin:"0 0 16px",fontSize:18,fontWeight:900,color:T.text}}>投稿の問題を報告</h3>
            
            {/* 報告理由選択 */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:T.sub,display:"block",marginBottom:8}}>報告理由</label>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[
                  {id:"misleading",label:"誤情報・詐欺的",emoji:"⚠️"},
                  {id:"spam",label:"スパム",emoji:"📧"},
                  {id:"harassment",label:"ハラスメント",emoji:"😠"},
                  {id:"illegal",label:"違法行為",emoji:"🚨"},
                  {id:"other",label:"その他",emoji:"❓"},
                ].map(opt=>(
                  <button key={opt.id} onClick={()=>setReportReason(opt.id)} style={{padding:"12px 14px",background:reportReason===opt.id?isDark?"rgba(59,130,246,0.2)":"rgba(59,130,246,0.1)":"transparent",border:`1px solid ${reportReason===opt.id?"#3b82f6":T.border}`,borderRadius:10,textAlign:"left",cursor:"pointer",color:T.text,fontWeight:reportReason===opt.id?700:400}}>
                    <span style={{marginRight:8}}>{opt.emoji}</span>{opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 詳細説明 */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:T.sub,display:"block",marginBottom:8}}>詳細（オプション）</label>
              <textarea value={reportDescription} onChange={e=>setReportDescription(e.target.value)} placeholder="より詳しく説明してください..." style={{width:"100%",padding:12,background:isDark?"rgba(255,255,255,0.06)":"#f8fafc",border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontSize:13,resize:"vertical",minHeight:80,outline:"none",boxSizing:"border-box"}}/>
            </div>

            {/* アクションボタン */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={handleReportSubmit} style={{flex:1,padding:"12px 16px",background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"white",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:14}}>報告する</button>
              <button onClick={()=>setReportingPostId(null)} style={{flex:1,padding:"12px 16px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontWeight:700,cursor:"pointer",fontSize:14}}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 異議申し立てモーダル */}
      {appealingPost && (
        <AppealModal
          post={appealingPost}
          onClose={() => setAppealingPost(null)}
          onAppealSubmitted={handleAppealSubmitted}
        />
      )}

      {/* 管理者ダッシュボード */}
      {showAdminDashboard && (
        <AdminDashboard
          onClose={() => setShowAdminDashboard(false)}
          isDark={isDark}
          T={T}
        />
      )}

      {/* 電話認証モーダル */}
      {showPhoneAuth && (
        <PhoneAuthModal
          isDark={isDark}
          T={T}
          onAuthComplete={() => {
            setShowPhoneAuth(false);
            showToast("アカウント作成が完了しました！投稿できるようになります");
          }}
          onCancel={() => setShowPhoneAuth(false)}
        />
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
          posts={mapPosts} onMapClick={handleMapClick}
          onReport={handleReport} onDelete={handleDelete}
          onGoodJob={handleGoodJob} onHelped={handleHelped}
          onEdit={setEditingId} editingId={editingId} onEditSave={handleEditSave}
          onShare={handleShare} onReaction={handleReaction}
          onBookmark={handleBookmark} bookmarks={bookmarks}
          onComment={handleComment} onDeleteComment={handleDeleteComment}
          currentUser={currentUser} userPosition={userPosition} userAccuracy={userAccuracy}
          radius={radius} postRadius={POST_RADIUS}
          isPosting={isPosting&&postPhase==="picking"}
          isDark={isDark} T={T}
          postEffect={postEffect} activeUsers={activeUsers}
          trajectory={trajectory} isTracking={isTracking}
          highlightMine={highlightMine} pinnedIds={pinnedIds}
          isMobile={isMobile}
          flyToTarget={flyToTarget}
          onAppeal={handleAppealStart}
        />

        {/* モバイル FAB */}
        {isMobile&&!isPosting&&(
          <div style={{position:"absolute",bottom:28,left:0,right:0,display:"flex",justifyContent:"center",gap:10,zIndex:1000,padding:"0 20px"}}>
            <button
              style={{flex:1,padding:"15px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"white",border:"none",borderRadius:16,fontSize:15,fontWeight:900,cursor:"pointer",boxShadow:"0 8px 28px rgba(37,99,235,0.45)",letterSpacing:"0.04em"}}
              onClick={()=>{setIsPosting(true);setPostPhase("form");}}>
              投稿
            </button>
            <button style={{width:54,height:54,borderRadius:14,background:isDark?"rgba(10,14,26,0.92)":"rgba(255,255,255,0.95)",border:`1px solid ${T.border}`,cursor:"pointer",fontSize:18,backdropFilter:"blur(12px)",flexShrink:0}} onClick={()=>setShowGroupPanel(true)} title="グループ">
              👥
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
                  <span>地図をタップして地点を追加（複数可）</span>
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
                    <div style={{marginTop:10,padding:"9px 10px",background:isDark?"rgba(59,130,246,0.09)":"rgba(37,99,235,0.06)",border:"1px solid rgba(59,130,246,0.18)",borderRadius:10}}>
                      <div style={{fontSize:11,fontWeight:800,color:"#3b82f6",marginBottom:6}}>選択した地点 {selectedLocations.length}件</div>
                      {selectedLocations.length===0?
                        <div style={{fontSize:11,color:T.muted}}>まだ地点が選ばれていません</div>:
                        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:120,overflowY:"auto"}}>{selectedLocations.map((loc,index)=>(
                          <div key={loc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"6px 8px",background:T.card,border:`1px solid ${T.border}`,borderRadius:8}}>
                            <div style={{fontSize:11,color:T.sub}}>地点{index+1} · {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</div>
                            <button onClick={()=>handleRemoveSelectedLocation(loc.id)} style={{background:"transparent",border:"none",color:"#ef4444",cursor:"pointer",fontSize:12}}>削除</button>
                          </div>
                        ))}</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={savePostWithSelectedLocations} style={{flex:1,padding:"13px 0",background:selectedLocations.length>0?"linear-gradient(135deg,#2563eb,#7c3aed)":"transparent",border:`1px solid ${selectedLocations.length>0?"#2563eb":T.border}`,borderRadius:12,cursor:selectedLocations.length>0?"pointer":"not-allowed",color:selectedLocations.length>0?"white":T.muted,fontSize:14,fontWeight:800}}>投稿する</button>
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
              onConfirm={()=>{setSelectedLocations([]);setPostPhase("picking");}} onCancel={resetForm}
              isPhoneVerified={isPhoneVerified} onShowAuth={() => setShowPhoneAuth(true)}
              moderateImage={moderateImage}
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
    {emoji:"📍",title:"近くの助かりを記録する",desc:"ベンチ・トイレ・日陰・休憩できる場所など、誰かの役に立つ情報を残せる。"},
    {emoji:"🔍",title:"近くで役立つ場所を探す",desc:"今いる場所の周りで、何が助かるかを探せる。目的地が決まれば地図で見られる。"},
    {emoji:"🙏",title:"助かったと伝える",desc:"記録を見て実際に役立ったら「助かった」を押せる。それがまた次の記録につながる。"},
  ];
  return(
    <div style={{position:"fixed",inset:0,zIndex:20000,background:"rgba(3,5,12,0.99)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",overflowY:"auto"}}>
      <div style={{opacity:step?1:0,transform:step?"translateY(0)":"translateY(18px)",transition:"all 0.6s cubic-bezier(0.34,1.56,0.64,1)",textAlign:"center",marginBottom:28,width:"100%",maxWidth:380}}>
        <div style={{fontSize:52,marginBottom:10}}>🗺️</div>
        <div style={{fontSize:26,fontWeight:900,color:"#f1f5f9",marginBottom:6}}>VIALE</div>
        <div style={{fontSize:13,color:"#a8b8cc",lineHeight:1.7}}>
          近くの助かる場所・役立つ情報を<br/>みんなで地図に残していくアプリです
        </div>
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
        <button style={{width:"100%",padding:"15px 0",background:"linear-gradient(135deg,#2563eb,#7c3aed)",border:"none",borderRadius:16,color:"white",fontSize:15,fontWeight:900,cursor:"pointer",boxShadow:"0 8px 32px rgba(37,99,235,0.35)",marginBottom:12}} onClick={onClose}>
          はじめる
        </button>
        <div style={{fontSize:11,color:"#5a6a80",textAlign:"center"}}>
          投稿しなくても、探すだけでも使えます
        </div>
        <div style={{fontSize:10,color:"#3a4a5c",textAlign:"center",marginTop:6}}>
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
// ストレージ管理
// ====================================================
function StorageModal({posts,onDeletePosts,currentUser,isDark,T,onClose}){
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

// ====================================================
// 位置情報設定モーダル
// ====================================================
function LocationSettingsModal({isDark,T,onClose,isTracking,setIsTracking,gpsError,setGpsError}){
  const [permState,setPermState]=useState("unknown"); // "granted" | "denied" | "prompt" | "unknown"
  const [requesting,setRequesting]=useState(false);

  // 現在の権限状態を確認
  useEffect(()=>{
    if(!navigator.permissions){setPermState("unknown");return;}
    navigator.permissions.query({name:"geolocation"}).then(result=>{
      setPermState(result.state);
      result.onchange=()=>setPermState(result.state);
    }).catch(()=>setPermState("unknown"));
  },[]);

  // 許可リクエスト（ブラウザのダイアログを出す）
  const handleRequest=async()=>{
    if(!navigator.geolocation){return;}
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      ()=>{
        setPermState("granted");
        setGpsError(null);
        setRequesting(false);
      },
      err=>{
        if(err.code===1)setPermState("denied");
        setRequesting(false);
      },
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const stateLabel={
    granted:{text:"許可済み",color:"#10b981",icon:"✓"},
    denied: {text:"拒否済み",color:"#ef4444",icon:"✕"},
    prompt: {text:"未設定",color:"#f59e0b",icon:"?"},
    unknown:{text:"確認中",color:T.muted,icon:"…"},
  }[permState]||{text:"不明",color:T.muted,icon:"?"};

  // ブラウザ別の手順テキスト
  const ua=navigator.userAgent;
  const isChrome=/Chrome/.test(ua)&&!/Edg/.test(ua);
  const isFirefox=/Firefox/.test(ua);
  const isSafari=/Safari/.test(ua)&&!/Chrome/.test(ua);
  const browserGuide=isChrome
    ?"アドレスバー左の 🔒 → 「位置情報」→「許可」"
    :isFirefox
    ?"アドレスバー左の盾アイコン → 「許可」"
    :isSafari
    ?"Safari設定 → このサイト → 位置情報「許可」"
    :"ブラウザのアドレスバー付近の設定から「位置情報」を許可";

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:12000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(16px)",padding:16}} onClick={onClose}>
      <div style={{background:isDark?"rgba(6,10,20,0.99)":"#fff",border:`1px solid ${T.border}`,borderRadius:24,width:"min(380px,95vw)",animation:"fadeScaleIn 0.22s ease",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        {/* ヘッダー */}
        <div style={{padding:"20px 22px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:T.text}}>位置情報の設定</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>記録・投稿に必要です</div>
          </div>
          <button style={{background:"transparent",border:"none",color:T.muted,fontSize:22,cursor:"pointer",lineHeight:1}} onClick={onClose}>×</button>
        </div>

        <div style={{padding:"16px 22px 22px",display:"flex",flexDirection:"column",gap:14}}>
          {/* 現在の権限状態 */}
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:14}}>
            <div style={{width:36,height:36,borderRadius:12,background:`${stateLabel.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:stateLabel.color,flexShrink:0}}>
              {stateLabel.icon}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:T.text}}>現在の状態</div>
              <div style={{fontSize:12,color:stateLabel.color,fontWeight:700,marginTop:1}}>{stateLabel.text}</div>
            </div>
          </div>

          {/* 許可されていない場合の案内 */}
          {permState==="denied"&&(
            <div style={{padding:"12px 14px",background:isDark?"rgba(239,68,68,0.07)":"rgba(254,226,226,0.4)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12}}>
              <div style={{fontSize:12,fontWeight:800,color:"#ef4444",marginBottom:6}}>ブラウザで手動で許可してください</div>
              <div style={{fontSize:11,color:T.sub,lineHeight:1.8}}>{browserGuide}</div>
            </div>
          )}
          {(permState==="prompt"||permState==="unknown")&&(
            <div style={{padding:"12px 14px",background:isDark?"rgba(245,158,11,0.07)":"rgba(254,243,199,0.4)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:12}}>
              <div style={{fontSize:11,color:T.sub,lineHeight:1.8}}>ボタンを押すとブラウザの許可ダイアログが表示されます。「許可」を選んでください。</div>
            </div>
          )}
          {permState==="granted"&&(
            <div style={{padding:"12px 14px",background:isDark?"rgba(16,185,129,0.07)":"rgba(209,250,229,0.4)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:12}}>
              <div style={{fontSize:11,color:T.sub,lineHeight:1.8}}>位置情報は許可されています。軌跡の記録は下のトグルでON/OFFできます。</div>
            </div>
          )}

          {/* 許可ボタン */}
          {permState!=="granted"&&permState!=="denied"&&(
            <button
              onClick={handleRequest}
              disabled={requesting}
              style={{width:"100%",padding:"13px 0",background:requesting?"transparent":"linear-gradient(135deg,#2563eb,#7c3aed)",border:`1px solid ${requesting?T.border:"transparent"}`,borderRadius:12,color:requesting?T.muted:"white",fontSize:13,fontWeight:800,cursor:requesting?"not-allowed":"pointer"}}
            >
              {requesting?"確認中…":"📍 位置情報を許可する"}
            </button>
          )}

          {/* 軌跡トラッキングON/OFF */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 14px",background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:14}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:T.text}}>軌跡の記録</div>
              <div style={{fontSize:11,color:T.muted,marginTop:2}}>移動距離・移動ルートを保存します</div>
            </div>
            <button
              onClick={()=>setIsTracking(v=>!v)}
              style={{width:48,height:28,borderRadius:999,background:isTracking?"#2563eb":"rgba(148,163,184,0.3)",border:"none",cursor:permState==="granted"?"pointer":"not-allowed",position:"relative",transition:"background .2s",flexShrink:0,opacity:permState==="granted"?1:0.5}}
              disabled={permState!=="granted"}
            >
              <div style={{position:"absolute",top:3,left:isTracking?22:3,width:22,height:22,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}/>
            </button>
          </div>

          {/* 説明 */}
          <div style={{fontSize:11,color:T.muted,lineHeight:1.8,padding:"0 2px"}}>
            位置情報は投稿時の距離チェックと軌跡記録にのみ使います。外部に送信されることはありません。
          </div>
        </div>
      </div>
    </div>
  );
}
