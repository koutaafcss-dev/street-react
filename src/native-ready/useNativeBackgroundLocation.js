import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';

const BG_POINTS_KEY = 'viale_bg_points';
const BG_LAST_KEY = 'viale_bg_last';
const FG_LAST_WATCH_ID = 'viale_native_watch_id';

function toPoint(position) {
  if (!position?.coords) return null;
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
    speed: typeof position.coords.speed === 'number' ? position.coords.speed : null,
    timestamp: typeof position.timestamp === 'number' ? position.timestamp : Date.now(),
    source: 'native-foreground',
  };
}

async function getBackgroundRunner() {
  try {
    const mod = await import('@capacitor/background-runner');
    return mod?.BackgroundRunner || mod?.default || null;
  } catch {
    return null;
  }
}

export function isNativeCapacitor() {
  return Capacitor.isNativePlatform();
}

export async function ensureNativeLocationPermission() {
  const status = await Geolocation.checkPermissions();
  if (status.location === 'granted' || status.coarseLocation === 'granted') {
    return status;
  }
  return Geolocation.requestPermissions();
}

export async function ensureBackgroundRunnerPermissions() {
  const runner = await getBackgroundRunner();
  if (!runner) return null;

  const status = await runner.checkPermissions();
  if (status?.geolocation === 'granted') return status;
  return runner.requestPermissions({ apis: ['geolocation'] });
}

export async function startNativeForegroundWatch(onPoint) {
  const watchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
      minimumUpdateInterval: 5000,
    },
    async (position, err) => {
      if (err) return;
      const point = toPoint(position);
      if (!point) return;
      await Preferences.set({ key: BG_LAST_KEY, value: JSON.stringify(point) });
      onPoint?.(point);
    }
  );

  await Preferences.set({ key: FG_LAST_WATCH_ID, value: String(watchId) });
  return watchId;
}

export async function stopNativeForegroundWatch(watchId) {
  if (!watchId) return;
  await Geolocation.clearWatch({ id: watchId });
  await Preferences.remove({ key: FG_LAST_WATCH_ID });
}

export async function readBackgroundPoints() {
  const { value } = await Preferences.get({ key: BG_POINTS_KEY });
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export async function clearBackgroundPoints() {
  await Preferences.remove({ key: BG_POINTS_KEY });
  await Preferences.remove({ key: BG_LAST_KEY });
}
