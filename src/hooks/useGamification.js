import { useState, useCallback, useMemo } from "react";

// ─── ミッション定義 ──────────────────────────────────────
export const DAILY_MISSIONS = [
  { id:"post1",    label:"📝 今日初めて投稿する",   req: p => true,                  points: 20 },
  { id:"goodjob3", label:"✨ GoodJobを3回送る",      req: null,                       points: 25 },
  { id:"callout",  label:"📢 呼びかけ投稿をする",    req: p => p.postType==="callout",points: 35 },
  { id:"photo",    label:"📷 写真付きで投稿する",    req: p => !!p.photo,             points: 30 },
  { id:"walk1km",  label:"🚶 今日1km以上歩く",       req: null, type:"walk",          points: 40 },
];

// ─── コミュニティ目標定義 ────────────────────────────────
export const COMMUNITY_GOALS = [
  { id:"g10",   label:"🌱 最初の一歩",   target:10,   reward:"エリア初達成バッジ" },
  { id:"g50",   label:"🤝 広がる輪",     target:50,   reward:"広がる輪バッジ" },
  { id:"g100",  label:"🌟 活気の街",     target:100,  reward:"活気の街バッジ" },
  { id:"g500",  label:"✨ 賑わいの都市", target:500,  reward:"賑わいの都市バッジ" },
  { id:"g1000", label:"👑 伝説の聖地",   target:1000, reward:"伝説の聖地バッジ" },
];

// ─── 週次チャレンジ定義 ──────────────────────────────────
export const WEEKLY_CHALLENGES = [
  { theme:"🌱 環境週間",    desc:"自然・環境に関する投稿をしよう",    tag:"環境",  bonus:50 },
  { theme:"🤝 助け合い週間",desc:"助けた体験を投稿しよう",            tag:"助けた",bonus:50 },
  { theme:"😊 笑顔週間",    desc:"誰かを笑顔にした体験を投稿しよう",  tag:"笑顔",  bonus:50 },
  { theme:"🐾 動物週間",    desc:"動物・ペットへの行動を投稿しよう",  tag:"動物",  bonus:50 },
  { theme:"🧹 清掃週間",    desc:"清掃・美化活動を投稿しよう",        tag:"清掃",  bonus:50 },
  { theme:"👴 高齢者週間",  desc:"お年寄りへの行動を投稿しよう",      tag:"高齢者",bonus:50 },
  { theme:"🚶 歩き週間",    desc:"歩きながら発見したことを投稿しよう",tag:"歩き",  bonus:50 },
  { theme:"☂ 雨の日週間",  desc:"雨の日の出来事を投稿しよう",        tag:"雨",    bonus:50 },
  { theme:"🎒 子ども週間",  desc:"子どもへの行動を投稿しよう",        tag:"子ども",bonus:50 },
  { theme:"🌙 夜の週間",    desc:"夜間の出来事を投稿しよう",          tag:"夜",    bonus:50 },
];

// ─── バッジ定義（助かった主役に再設計）───────────────────
export const BADGES = [
  { id:"first",   label:"🌱 初投稿",       cond:(p,s,l,d,h)=>p>=1 },
  { id:"p5",      label:"📝 5投稿",        cond:(p,s,l,d,h)=>p>=5 },
  { id:"p20",     label:"✍️ 20投稿",       cond:(p,s,l,d,h)=>p>=20 },
  { id:"s3",      label:"🔥 3日連続",      cond:(p,s,l,d,h)=>s>=3 },
  { id:"s7",      label:"🔥 7日連続",      cond:(p,s,l,d,h)=>s>=7 },
  { id:"s30",     label:"👑 30日連続",     cond:(p,s,l,d,h)=>s>=30 },
  // 助かった系バッジ（主役）
  { id:"h1",      label:"🙏 初めて助かった", cond:(p,s,l,d,h)=>h>=1 },
  { id:"h10",     label:"🙏 10人助かった",  cond:(p,s,l,d,h)=>h>=10 },
  { id:"h50",     label:"🌟 50人助かった",  cond:(p,s,l,d,h)=>h>=50 },
  // GoodJob系バッジ（補助）
  { id:"l5",      label:"✨ いいね5",       cond:(p,s,l,d,h)=>l>=5 },
  { id:"l20",     label:"✨ いいね20",      cond:(p,s,l,d,h)=>l>=20 },
  // 歩行
  { id:"w1",      label:"🚶 1km",          cond:(p,s,l,d,h)=>d>=1 },
  { id:"w10",     label:"🏃 10km",         cond:(p,s,l,d,h)=>d>=10 },
  { id:"w50",     label:"🏅 50km",         cond:(p,s,l,d,h)=>d>=50 },
];

// ─── ランク定義 ──────────────────────────────────────────
export const RANKS = [
  { score: 500, label:"✨ まちの守護者", color:"#fbbf24" },
  { score: 200, label:"🌟 街の英雄",     color:"#38bdf8" },
  { score:  50, label:"🌱 街の芽",       color:"#4ade80" },
  { score:   0, label:"👣 はじめの一歩", color:"#64748b" },
];

export function getCurrentRank(score) {
  return RANKS.find(r => score >= r.score) || RANKS[RANKS.length - 1];
}

// ─── ユーティリティ ──────────────────────────────────────
function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }
  catch { return def; }
}
function safeSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch {}
}
function getWeekNumber() {
  const d = new Date(), y = d.getFullYear();
  const start = new Date(y, 0, 1);
  return Math.floor((d - start) / 604800000);
}
export function calcStreak(posts, userId) {
  const myDays = new Set(
    posts.filter(p => p.userId === userId).map(p => {
      const d = new Date(p.timestamp);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  let streak = 0, d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!myDays.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/**
 * useGamification
 * バッジ・ミッション・週次チャレンジ・GoodJobミッション・ランクアップ検知を管理。
 * App.jsx から切り出すことで、今後のミッション追加・変更が局所化できる。
 *
 * 注意: onToast は外部から渡してもらう（hook同士の循環依存を避けるため）
 */
export function useGamification({ posts, currentUser, totalLikes, totalDist, onToast }) {
  const [missionsDone, setMissionsDone] = useState(() => load("zenMissions", {}));
  const [goodjobCount, setGoodjobCount] = useState(() => load("zenGJCount", { date:"", count:0 }));
  const [challengeDone, setChallengeDone] = useState(() => load("zenChallenge", {}));
  const [rankUp, setRankUp] = useState(null);

  // 永続化
  const persistMissions = useCallback((v) => {
    setMissionsDone(v);
    safeSave("zenMissions", v);
  }, []);

  // ─── 今週のチャレンジ ───
  const weekNum = getWeekNumber();
  const currentChallenge = WEEKLY_CHALLENGES[weekNum % WEEKLY_CHALLENGES.length];
  const challengeKey = `week_${weekNum}`;
  const isChallengeCleared = !!challengeDone[challengeKey];

  // ─── streak ───
  const streak = useMemo(() => calcStreak(posts, currentUser || ""), [posts, currentUser]);

  // ─── 自分の投稿 ───
  const myPosts = useMemo(() => posts.filter(p => p.userId === currentUser), [posts, currentUser]);

  // ─── 貢献スコア（助かった主役・GoodJob補助） ───
  const myTotalHelped = useMemo(
    () => myPosts.reduce((s,p) => s + (p.helpedBy||[]).length, 0),
    [myPosts]
  );
  const missionScore = Object.keys(missionsDone).filter(k => k.startsWith(new Date().toDateString())).length * 10;
  const challengeScore = Object.keys(challengeDone).length * 50;
  // helpedBy × 15 が主役、likes × 3 は補助、投稿数 × 5
  const contributionScore = myPosts.length * 5 + myTotalHelped * 15 + totalLikes * 3 + missionScore + challengeScore;

  // ─── バッジ（助かった数 h を5番目のパラメータで渡す） ───
  const earnedBadges = useMemo(
    () => BADGES.filter(b => b.cond(myPosts.length, streak, totalLikes, totalDist, myTotalHelped)),
    [myPosts.length, streak, totalLikes, totalDist, myTotalHelped]
  );

  // ─── ランクアップ検知 ───
  const checkRankUp = useCallback((oldScore, newScore) => {
    for (const r of RANKS.slice(0, -1)) {
      if (oldScore < r.score && newScore >= r.score) {
        setRankUp(r);
        setTimeout(() => setRankUp(null), 4000);
        break;
      }
    }
  }, []);

  // ─── ミッション達成チェック（投稿時に呼ぶ） ───
  const checkMissions = useCallback((post) => {
    const today = new Date().toDateString();
    const newDone = { ...missionsDone };
    let gained = 0;

    DAILY_MISSIONS.filter(m => m.req && !m.type).forEach(m => {
      const key = today + "_" + m.id;
      if (!newDone[key] && m.req(post)) {
        newDone[key] = true;
        gained += m.points;
        setTimeout(() => onToast?.(`🎯 ミッション達成！「${m.label}」+${m.points}pt`), 900);
      }
    });

    // 週次チャレンジチェック
    if (!isChallengeCleared) {
      const tags = post.tags || [];
      if (post.text.includes(currentChallenge.tag) || tags.some(t => t === currentChallenge.tag)) {
        const next = { ...challengeDone, [challengeKey]: true };
        setChallengeDone(next);
        safeSave("zenChallenge", next);
        setTimeout(() => onToast?.(`🏆 週次チャレンジ達成！「${currentChallenge.theme}」+${currentChallenge.bonus}pt`), 1200);
      }
    }

    if (gained > 0) persistMissions(newDone);
  }, [missionsDone, isChallengeCleared, currentChallenge, challengeKey, challengeDone, persistMissions, onToast]);

  // ─── GoodJob ミッション（GoodJobボタン押下時に呼ぶ） ───
  const checkGoodJobMission = useCallback(() => {
    const today = new Date().toDateString();
    const gjc = goodjobCount.date === today ? goodjobCount.count + 1 : 1;
    const next = { date: today, count: gjc };
    setGoodjobCount(next);
    safeSave("zenGJCount", next);
    const key = today + "_goodjob3";
    if (gjc >= 3 && !missionsDone[key]) {
      const newDone = { ...missionsDone, [key]: true };
      persistMissions(newDone);
      setTimeout(() => onToast?.("🎯 ミッション達成！「✨ GoodJobを3回送る」+25pt"), 900);
    }
  }, [goodjobCount, missionsDone, persistMissions, onToast]);

  // ─── 徒歩1kmミッション（useGPS の onWalkMilestone から呼ぶ） ───
  const checkWalkMission = useCallback(() => {
    const today = new Date().toDateString();
    const key = today + "_walk1km";
    if (!missionsDone[key]) {
      const newDone = { ...missionsDone, [key]: true };
      persistMissions(newDone);
      setTimeout(() => onToast?.("🎯 ミッション達成！「🚶 今日1km以上歩く」+40pt"), 600);
    }
  }, [missionsDone, persistMissions, onToast]);

  return {
    // state
    missionsDone,
    goodjobCount,
    challengeDone,
    rankUp,
    // computed
    currentChallenge,
    isChallengeCleared,
    streak,
    contributionScore,
    earnedBadges,
    myPosts,
    myTotalHelped,
    // actions
    checkMissions,
    checkGoodJobMission,
    checkWalkMission,
    checkRankUp,
  };
}
