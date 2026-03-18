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

// ... remaining components and logic ...

function ProfileTab() {
  return (
    <div>
      {/* ここにアバター、名前、Bio、マイタグ、最近の記録、街との関わり方サマリーを配置 */}
      <header>Your Profile Header</header>
      <div>Your Avatar</div>
      <div>Your Name</div>
      <div>Your Bio</div>
      <div>Your Tags</div>
      <div>Your Recent Records</div>
      <div>Your Community Engagement Summary</div>
    </div>
  );
}

export default ProfileTab;