import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase';
import {
  ensureNativeLocationPermission,
  ensureBackgroundRunnerPermissions,
  startNativeForegroundWatch,
  stopNativeForegroundWatch,
  readBackgroundPoints,
  clearBackgroundPoints,
} from './useNativeBackgroundLocation';

const STORAGE_KEYS = {
  lastPosition: 'viale_last_position',
  points: 'viale_trajectory_points',
  totalDist: 'viale_total_distance_km',
  dayKey: 'viale_trajectory_day_key',
  todayDist: 'viale_today_distance_km',
  isTracking: 'viale_is_tracking',
  showOnMap: 'viale_show_trajectory_on_map',
  lastMilestone: 'viale_last_walk_milestone',
};

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function prefGetJson(key, fallback) {
  const { value } = await Preferences.get({ key });
  return safeParse(value, fallback);
}

async function prefSetJson(key, value) {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

async function prefGetNumber(key, fallback = 0) {
  const { value } = await Preferences.get({ key });
  const num = value == null ? fallback : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

async function prefSetNumber(key, value) {
  await Preferences.set({ key, value: String(value) });
}

/**
 * 軌跡データをFirestoreに保存（管理側閲覧用）
 * プライバシー保護のため、匿名化して保存
 */
async function saveTrajectoryToFirestore(trajectoryPoints) {
  if (!trajectoryPoints.length) return;

  try {
    // 現在のユーザーを取得
    const user = auth.currentUser;
    if (!user) return;

    // 匿名化: ユーザーIDをハッシュ化
    const crypto = window.crypto || require('crypto');
    const encoder = new TextEncoder();
    const data = encoder.encode(user.uid);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const anonymousUserId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 軌跡データを集約（プライバシー保護）
    const aggregatedData = {
      anonymousUserId,
      totalPoints: trajectoryPoints.length,
      startTime: trajectoryPoints[0]?.timestamp,
      endTime: trajectoryPoints[trajectoryPoints.length - 1]?.timestamp,
      // 詳細な位置情報は保存せず、統計情報のみ
      boundingBox: calculateBoundingBox(trajectoryPoints),
      totalDistance: calculateTotalDistance(trajectoryPoints),
      averageSpeed: calculateAverageSpeed(trajectoryPoints),
      lastUpdated: new Date(),
      // 管理側でのみ閲覧可能
      adminOnly: true
    };

    // Firestoreに直接保存（ドキュメントIDとして匿名ユーザーIDを使用）
    const trajectoryRef = collection(db, 'user_trajectories');
    await addDoc(trajectoryRef, aggregatedData);

    console.log('軌跡データを保存しました');
  } catch (error) {
    console.error('軌跡データの保存に失敗しました:', error);
  }
}

/**
 * 軌跡データのバウンディングボックスを計算
 */
function calculateBoundingBox(points) {
  if (!points.length) return null;

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2
  };
}

/**
 * 軌跡データの総距離を計算
 */
function calculateTotalDistance(points) {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += getDistanceKm(
      points[i-1].lat, points[i-1].lng,
      points[i].lat, points[i].lng
    );
  }
  return totalDistance;
}

/**
 * 平均速度を計算（km/h）
 */
function calculateAverageSpeed(points) {
  if (points.length < 2) return 0;

  const totalDistance = calculateTotalDistance(points);
  const startTime = points[0].timestamp;
  const endTime = points[points.length - 1].timestamp;
  const timeDiffHours = (endTime - startTime) / (1000 * 60 * 60);

  return timeDiffHours > 0 ? totalDistance / timeDiffHours : 0;
}

async function prefGetBoolean(key, fallback = false) {
  const { value } = await Preferences.get({ key });
  if (value == null) return fallback;
  return value === 'true';
}

async function prefSetBoolean(key, value) {
  await Preferences.set({ key, value: value ? 'true' : 'false' });
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


/**
 * 簡易カルマンフィルタ
 * GPS のノイズを平滑化する。
 * 誤差（accuracy）が小さいほど新しい値を強く信頼する。
 */
class GpsKalman {
  constructor() {
    this.lat = null;
    this.lng = null;
    this.variance = -1; // 未初期化
  }
  update(lat, lng, accuracyM) {
    const q = Math.max(accuracyM, 1) ** 2; // 観測ノイズ
    if (this.variance < 0) {
      // 初回はそのまま採用
      this.lat = lat;
      this.lng = lng;
      this.variance = q;
      return { lat, lng };
    }
    const k = this.variance / (this.variance + q); // カルマンゲイン
    this.lat = this.lat + k * (lat - this.lat);
    this.lng = this.lng + k * (lng - this.lng);
    this.variance = (1 - k) * this.variance;
    return { lat: this.lat, lng: this.lng };
  }
}

function getMilestoneLabel(totalKm) {
  if (totalKm >= 10) return '10km';
  if (totalKm >= 5) return '5km';
  if (totalKm >= 3) return '3km';
  if (totalKm >= 1) return '1km';
  return null;
}

function normalizePoint(positionLike) {
  if (!positionLike) return null;
  if (typeof positionLike.lat === 'number' && typeof positionLike.lng === 'number') {
    return {
      lat: positionLike.lat,
      lng: positionLike.lng,
      accuracy: typeof positionLike.accuracy === 'number' ? positionLike.accuracy : null,
      speed: typeof positionLike.speed === 'number' ? positionLike.speed : null,
      timestamp: typeof positionLike.timestamp === 'number' ? positionLike.timestamp : Date.now(),
      source: positionLike.source || 'app',
    };
  }
  const coords = positionLike.coords;
  if (!coords) return null;
  return {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: typeof coords.accuracy === 'number' ? coords.accuracy : null,
    speed: typeof coords.speed === 'number' ? coords.speed : null,
    timestamp: typeof positionLike.timestamp === 'number' ? positionLike.timestamp : Date.now(),
    source: 'web-foreground',
  };
}

export function useGPS(options = {}) {
  const { onWalkMilestone } = options;
  const isNative = Capacitor.isNativePlatform();

  const [gpsError, setGpsError] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [showTrajectoryOnMap, setShowTrajectoryOnMap] = useState(false);
  const [trajectoryHistory, setTrajectoryHistory] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [totalDist, setTotalDist] = useState(0);
  const [todayDist, setTodayDist] = useState(0);

  const watchIdRef = useRef(null);
  const webWatchIdRef = useRef(null);
  const lastMilestoneRef = useRef('');
  const lastPointRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const savedDay = await Preferences.get({ key: STORAGE_KEYS.dayKey });
      const currentDay = getTodayKey();
      const points = await prefGetJson(STORAGE_KEYS.points, []);
      const total = await prefGetNumber(STORAGE_KEYS.totalDist, 0);
      const today = savedDay.value === currentDay ? await prefGetNumber(STORAGE_KEYS.todayDist, 0) : 0;
      const last = await prefGetJson(STORAGE_KEYS.lastPosition, null);
      const tracking = await prefGetBoolean(STORAGE_KEYS.isTracking, false);
      const showOnMap = await prefGetBoolean(STORAGE_KEYS.showOnMap, false);
      const lastMilestone = (await Preferences.get({ key: STORAGE_KEYS.lastMilestone })).value || '';

      if (!alive) return;
      setTrajectoryHistory(points);
      setTotalDist(total);
      setTodayDist(today);
      setIsTracking(tracking);
      setShowTrajectoryOnMap(showOnMap);
      if (last && typeof last.lat === 'number' && typeof last.lng === 'number') {
        setUserPosition([last.lat, last.lng]);
      }
      lastPointRef.current = points.length ? points[points.length - 1] : last;
      lastMilestoneRef.current = lastMilestone;
      await Preferences.set({ key: STORAGE_KEYS.dayKey, value: currentDay });


      if (isNative) {
        const bgPoints = await readBackgroundPoints();
        if (bgPoints.length) {
          setTrajectoryHistory((prev) => {
            const merged = [...prev, ...bgPoints].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            const deduped = [];
            const seen = new Set();
            for (const p of merged) {
              const key = `${p.timestamp}-${p.lat}-${p.lng}`;
              if (seen.has(key)) continue;
              seen.add(key);
              deduped.push(p);
            }
            return deduped.slice(-2500);
          });
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [isNative]);

  // 常時位置ウォッチ（軌跡記録ON/OFFに関わらず現在地マーカーを更新し続ける）
  useEffect(() => {
    if (isNative || !navigator.geolocation) return;

    const kalman = new GpsKalman();
    let watchId = null;
    let cancelled = false;

    const handlePosition = (pos) => {
      if (cancelled) return;
      const { latitude, longitude, accuracy } = pos.coords;
      console.log('[GPS] position received:', { latitude, longitude, accuracy });
      // 精度に関わらず表示用には採用（IPベースの粗い位置も使う）
      const filtered = kalman.update(latitude, longitude, accuracy);
      setUserPosition([filtered.lat, filtered.lng]);
      setUserAccuracy(accuracy);
      setGpsError('');
    };

    const handleError = (err) => {
      if (cancelled) return;
      if (err.code === 1) setGpsError('位置情報の許可が必要です');
      else if (err.code === 2) setGpsError('現在地を取得できません');
      // タイムアウト(code=3)は無視して watchPosition に任せる
    };

    // まず1回即時取得（キャッシュなし）→ GPS が精度を上げるにつれ watchPosition が追従
    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    // 継続ウォッチ（GPSが衛星を捕捉するにつれ精度が上がっていく）
    watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isNative]);

  useEffect(() => {
    prefSetBoolean(STORAGE_KEYS.isTracking, isTracking);
  }, [isTracking]);

  useEffect(() => {
    prefSetBoolean(STORAGE_KEYS.showOnMap, showTrajectoryOnMap);
  }, [showTrajectoryOnMap]);

  useEffect(() => {
    prefSetJson(STORAGE_KEYS.points, trajectoryHistory);
    const last = trajectoryHistory.length ? trajectoryHistory[trajectoryHistory.length - 1] : null;
    if (last) {
      prefSetJson(STORAGE_KEYS.lastPosition, last);
      setUserPosition([last.lat, last.lng]);
    }
    lastPointRef.current = last;
  }, [trajectoryHistory]);

  useEffect(() => {
    prefSetNumber(STORAGE_KEYS.totalDist, totalDist);
  }, [totalDist]);

  useEffect(() => {
    Preferences.set({ key: STORAGE_KEYS.dayKey, value: getTodayKey() });
    prefSetNumber(STORAGE_KEYS.todayDist, todayDist);
  }, [todayDist]);

  const appendPoint = useCallback((rawPoint) => {
    const point = normalizePoint(rawPoint);
    if (!point) return;

    setGpsError('');
    setUserPosition([point.lat, point.lng]);
    if (point.accuracy != null) setUserAccuracy(point.accuracy);

    const prev = lastPointRef.current;
    if (!prev) {
      setTrajectoryHistory([point]);
      lastPointRef.current = point;
      return;
    }

    const movedKm = getDistanceKm(prev.lat, prev.lng, point.lat, point.lng);
    if (movedKm < 0.003) return;
    const shouldStorePoint = movedKm >= 0.008;

    setTotalDist((prevTotal) => {
      const nextTotal = prevTotal + movedKm;
      const milestone = getMilestoneLabel(nextTotal);
      if (milestone && milestone !== lastMilestoneRef.current) {
        lastMilestoneRef.current = milestone;
        Preferences.set({ key: STORAGE_KEYS.lastMilestone, value: milestone });
        onWalkMilestone?.(milestone);
      }
      return nextTotal;
    });

    setTodayDist((prevToday) => prevToday + movedKm);

    if (shouldStorePoint) {
      setTrajectoryHistory((prevPoints) => [...prevPoints, point].slice(-2500));
      lastPointRef.current = point;
    }
  }, [onWalkMilestone]);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!isTracking) return;

      try {
        if (isNative) {
          await ensureNativeLocationPermission();
          await ensureBackgroundRunnerPermissions();
          watchIdRef.current = await startNativeForegroundWatch((point) => {
            if (!cancelled) appendPoint(point);
          });
          return;
        }

        if (!navigator.geolocation) {
          setGpsError('この端末では位置情報が使えません');
          return;
        }

        webWatchIdRef.current = navigator.geolocation.watchPosition(
          (position) => !cancelled && appendPoint(position),
          (error) => {
            if (error?.code === 1) setGpsError('位置情報の許可が必要です');
            else if (error?.code === 2) setGpsError('現在地を取得できません');
            else if (error?.code === 3) setGpsError('位置情報の取得がタイムアウトしました');
            else setGpsError('位置情報の取得に失敗しました');
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
      } catch (err) {
        setGpsError(err?.message || '位置情報の開始に失敗しました');
      }
    };

    start();

    return () => {
      cancelled = true;
      if (webWatchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(webWatchIdRef.current);
        webWatchIdRef.current = null;
      }
      if (watchIdRef.current != null) {
        stopNativeForegroundWatch(watchIdRef.current).catch(() => {});
        watchIdRef.current = null;
      }
    };
  }, [appendPoint, isNative, isTracking]);

  useEffect(() => {
    if (!isNative) return;
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      const bgPoints = await readBackgroundPoints();
      if (!bgPoints.length) return;
      setTrajectoryHistory((prev) => {
        const merged = [...prev, ...bgPoints].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const deduped = [];
        const seen = new Set();
        for (const p of merged) {
          const key = `${p.timestamp}-${p.lat}-${p.lng}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(p);
        }
        return deduped.slice(-2500);
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isNative]);

  // 軌跡データを定期的にFirestoreに保存するuseEffect
  useEffect(() => {
    if (!isTracking || trajectoryHistory.length === 0) return;

    const saveTrajectoryInterval = setInterval(async () => {
      try {
        await saveTrajectoryToFirestore(trajectoryHistory);
      } catch (error) {
        console.error('軌跡データの保存に失敗しました:', error);
      }
    }, 30000); // 30秒ごとに保存

    return () => clearInterval(saveTrajectoryInterval);
  }, [isTracking, trajectoryHistory]);

  const clearTrajectory = useCallback(async () => {
    setTrajectoryHistory([]);
    setTodayDist(0);
    setTotalDist(0);
    lastPointRef.current = null;
    lastMilestoneRef.current = '';
    await Preferences.remove({ key: STORAGE_KEYS.points });
    await Preferences.remove({ key: STORAGE_KEYS.totalDist });
    await Preferences.remove({ key: STORAGE_KEYS.todayDist });
    await Preferences.remove({ key: STORAGE_KEYS.lastMilestone });
    await Preferences.remove({ key: STORAGE_KEYS.lastPosition });
    await clearBackgroundPoints();
  }, []);

  const trajectory = useMemo(() => (showTrajectoryOnMap ? trajectoryHistory : []), [showTrajectoryOnMap, trajectoryHistory]);

  return {
    userPosition,
    userAccuracy,
    gpsError,
    setGpsError,
    isTracking,
    setIsTracking,
    trajectory,
    trajectoryHistory,
    trajectoryCount: trajectoryHistory.length,
    showTrajectoryOnMap,
    setShowTrajectoryOnMap,
    todayDist,
    totalDist,
    clearTrajectory,
  };
}
