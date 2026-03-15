import { useState, useEffect, useRef, useCallback } from "react";

// ─── 軌跡ユーティリティ ────────────────────────────────
const TRAJECTORY_KEY = "zenTrajectory";
const MAX_POINTS = 2000;

function loadTrajectory() {
  try { return JSON.parse(localStorage.getItem(TRAJECTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveTrajectory(pts) {
  try { localStorage.setItem(TRAJECTORY_KEY, JSON.stringify(pts.slice(-MAX_POINTS))); }
  catch { /* ストレージ満杯時は無視 */ }
}
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function calcTotalDistance(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++)
    d += getDistance(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  return d;
}
export function getTodayPts(pts) {
  const t = new Date().toDateString();
  return pts.filter(p => new Date(p.ts).toDateString() === t);
}

// デフォルト位置（名古屋）
const DEFAULT_POS = [35.181236, 136.906505];

/**
 * useGPS
 * - 現在地の取得（watchPosition / getCurrentPosition）
 * - 軌跡の記録（localStorage永続化）
 * - GPS エラー管理
 *
 * onWalkMilestone: 歩行距離が閾値を超えた時に呼ばれるコールバック
 * これによりミッション判定をApp.jsxに残せる（hook同士の依存を避ける）
 */
export function useGPS({ onWalkMilestone } = {}) {
  const [userPosition, setUserPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isTracking, setIsTracking] = useState(
    () => localStorage.getItem("zenTracking") === "true"
  );
  const [trajectory, setTrajectory] = useState(() => loadTrajectory());
  const watchIdRef = useRef(null);
  const lastPtRef = useRef(null);
  const prevTodayDistRef = useRef(0);

  // ── 初回: 現在地を一度だけ取得（tracking=off でも表示用に必要）
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserPosition(DEFAULT_POS);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        setGpsError(null);
      },
      err => {
        setGpsError(err.code === 1 ? "permission" : "unavailable");
        setUserPosition(DEFAULT_POS);
      }
    );
  }, []);

  // ── tracking ON/OFF で watchPosition を制御
  useEffect(() => {
    localStorage.setItem("zenTracking", String(isTracking));

    if (!isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // 5m 未満の微小移動は無視（バッテリー節約）
        if (lastPtRef.current) {
          const d = getDistance(lastPtRef.current.lat, lastPtRef.current.lng, lat, lng);
          if (d < 0.005) return;
        }
        const pt = { lat, lng, ts: Date.now() };
        lastPtRef.current = pt;
        setTrajectory(prev => {
          const next = [...prev, pt].slice(-MAX_POINTS);
          saveTrajectory(next);
          return next;
        });
        setUserPosition([lat, lng]);
        setGpsError(null);
      },
      err => {
        if (err.code === 1) setGpsError("permission");
        else if (err.code === 2) setGpsError("unavailable");
        else setGpsError("timeout");
        setUserPosition(DEFAULT_POS);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking]);

  // ── 歩行距離のマイルストーン通知
  const todayDist = calcTotalDistance(getTodayPts(trajectory));
  const totalDist = calcTotalDistance(trajectory);

  useEffect(() => {
    if (todayDist >= 1 && prevTodayDistRef.current < 1) {
      onWalkMilestone?.("1km");
    }
    if (todayDist >= 5 && prevTodayDistRef.current < 5) {
      onWalkMilestone?.("5km");
    }
    prevTodayDistRef.current = todayDist;
  }, [todayDist]);

  const clearTrajectory = useCallback(() => {
    setTrajectory([]);
    saveTrajectory([]);
  }, []);

  return {
    userPosition,
    gpsError, setGpsError,
    isTracking, setIsTracking,
    trajectory,
    todayDist,
    totalDist,
    clearTrajectory,
  };
}
