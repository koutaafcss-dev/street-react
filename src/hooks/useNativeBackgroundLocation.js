import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Preferences } from "@capacitor/preferences";

const BG_POINTS_KEY = "viale_bg_points";

function isNativeApp() {
  return Capacitor.isNativePlatform();
}

function normalizePoint(position) {
  if (!position?.coords) return null;
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    speed: position.coords.speed ?? null,
    timestamp: position.timestamp || Date.now(),
  };
}

export async function ensureNativeLocationPermission() {
  if (!isNativeApp()) {
    return { location: "granted", coarseLocation: "granted" };
  }

  const status = await Geolocation.checkPermissions();
  if (status.location === "granted" || status.coarseLocation === "granted") {
    return status;
  }

  return Geolocation.requestPermissions();
}

export async function ensureBackgroundRunnerPermissions() {
  return ensureNativeLocationPermission();
}

export async function readBackgroundPoints() {
  const { value } = await Preferences.get({ key: BG_POINTS_KEY });
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearBackgroundPoints() {
  await Preferences.remove({ key: BG_POINTS_KEY });
}

async function appendBackgroundPoint(point) {
  const current = await readBackgroundPoints();
  const next = [...current, point].slice(-2000);
  await Preferences.set({
    key: BG_POINTS_KEY,
    value: JSON.stringify(next),
  });
}

export async function startNativeForegroundWatch(onPoint) {
  if (!isNativeApp()) return null;

  const watchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
      minimumUpdateInterval: 5000,
    },
    async (position, err) => {
      if (err) return;
      const point = normalizePoint(position);
      if (!point) return;

      await appendBackgroundPoint(point);
      onPoint?.(point);
    }
  );

  return watchId;
}

export async function stopNativeForegroundWatch(watchId) {
  if (!watchId || !isNativeApp()) return;
  await Geolocation.clearWatch({ id: watchId });
}