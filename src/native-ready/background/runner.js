/**
 * VIALE Background Runner
 *
 * 役割:
 * - アプリがバックグラウンドになった後、OS の許す範囲で定期的に現在地を取る
 * - 取得した点を CapacitorKV に保存する
 *
 * 注意:
 * - これは WebView ではなく headless JS で動く
 * - DOM / localStorage は使えない
 * - OS 制約により「常時・秒単位」の追跡はできない
 */

const BG_POINTS_KEY = 'viale_bg_points';
const BG_LAST_KEY = 'viale_bg_last';
const MAX_POINTS = 400;

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function pushPoint(points, point) {
  const next = Array.isArray(points) ? [...points, point] : [point];
  return next.slice(-MAX_POINTS);
}

addEventListener('trackLocation', async (resolve, reject) => {
  try {
    const position = CapacitorGeolocation.getCurrentPosition();
    if (!position || typeof position.latitude !== 'number' || typeof position.longitude !== 'number') {
      resolve({ ok: true, skipped: 'no-position' });
      return;
    }

    const point = {
      lat: position.latitude,
      lng: position.longitude,
      accuracy: typeof position.accuracy === 'number' ? position.accuracy : null,
      speed: typeof position.speed === 'number' ? position.speed : null,
      altitude: typeof position.altitude === 'number' ? position.altitude : null,
      heading: typeof position.heading === 'number' ? position.heading : null,
      timestamp: Date.now(),
      source: 'background-runner',
    };

    const stored = CapacitorKV.get(BG_POINTS_KEY);
    const prevPoints = safeParse(stored?.value, []);
    const nextPoints = pushPoint(prevPoints, point);

    CapacitorKV.set(BG_POINTS_KEY, JSON.stringify(nextPoints));
    CapacitorKV.set(BG_LAST_KEY, JSON.stringify(point));

    resolve({ ok: true, saved: true, count: nextPoints.length });
  } catch (err) {
    console.error('VIALE background runner error', err);
    reject(err);
  }
});
