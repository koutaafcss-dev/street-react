/**
 * functions/trajectoryManagement.js
 *
 * Cloud Functions 処理：
 * 1. 軌跡データの保存と集計
 * 2. 匿名化されたユーザー移動データの管理
 * 3. 行動分析のためのデータ処理
 *
 * デプロイ方法：
 * firebase deploy --only functions:trajectoryManagement
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firebase Admin SDK の初期化
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 軌跡データを集計して保存する関数
 * 定期的に呼び出されて、ユーザーの移動データを匿名化して保存
 */
exports.aggregateTrajectoryData = functions.https.onCall(async (data, context) => {
  // 管理者権限チェック
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      '管理者権限が必要です'
    );
  }

  try {
    const { anonymousUserId, points, startTime, endTime } = data;

    if (!anonymousUserId || !points || points.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '必要なデータが不足しています'
      );
    }

    // 軌跡データの集計
    const totalDistance = calculateTotalDistance(points);
    const averageSpeed = calculateAverageSpeed(points, startTime, endTime);
    const boundingBox = calculateBoundingBox(points);

    // Firestore に保存
    const trajectoryRef = db.collection('user_trajectories').doc(anonymousUserId);

    await trajectoryRef.set({
      anonymousUserId,
      points: points.slice(-1000), // 最新1000ポイントのみ保存
      totalDistance,
      averageSpeed,
      boundingBox,
      startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      pointCount: points.length,
    }, { merge: true });

    return {
      success: true,
      message: '軌跡データを保存しました',
      stats: {
        totalDistance,
        averageSpeed,
        pointCount: points.length,
      }
    };

  } catch (error) {
    console.error('軌跡データ集計エラー:', error);
    throw new functions.https.HttpsError(
      'internal',
      '軌跡データの処理中にエラーが発生しました'
    );
  }
});

/**
 * 行動分析のための軌跡データを取得する関数
 * 管理者がユーザーの移動パターンを分析するために使用
 */
exports.getTrajectoryAnalytics = functions.https.onCall(async (data, context) => {
  // 管理者権限チェック
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      '管理者権限が必要です'
    );
  }

  try {
    const { anonymousUserId, dateRange } = data;

    let query = db.collection('user_trajectories');

    if (anonymousUserId) {
      query = query.where('anonymousUserId', '==', anonymousUserId);
    }

    if (dateRange) {
      query = query
        .where('lastUpdated', '>=', admin.firestore.Timestamp.fromDate(new Date(dateRange.start)))
        .where('lastUpdated', '<=', admin.firestore.Timestamp.fromDate(new Date(dateRange.end)));
    }

    query = query.orderBy('lastUpdated', 'desc').limit(100);

    const snapshot = await query.get();
    const trajectories = [];

    snapshot.forEach(doc => {
      trajectories.push({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
      });
    });

    // 集計統計
    const stats = {
      totalTrajectories: trajectories.length,
      averageDistance: trajectories.reduce((sum, t) => sum + (t.totalDistance || 0), 0) / trajectories.length || 0,
      averageSpeed: trajectories.reduce((sum, t) => sum + (t.averageSpeed || 0), 0) / trajectories.length || 0,
      totalPoints: trajectories.reduce((sum, t) => sum + (t.pointCount || 0), 0),
    };

    return {
      trajectories,
      stats,
    };

  } catch (error) {
    console.error('軌跡データ取得エラー:', error);
    throw new functions.https.HttpsError(
      'internal',
      '軌跡データの取得中にエラーが発生しました'
    );
  }
});

/**
 * プライバシー保護のための軌跡データを削除する関数
 * GDPR 準拠のためのデータ削除機能
 */
exports.deleteTrajectoryData = functions.https.onCall(async (data, context) => {
  // 管理者権限チェック
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      '管理者権限が必要です'
    );
  }

  try {
    const { anonymousUserId } = data;

    if (!anonymousUserId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '匿名ユーザーIDが必要です'
      );
    }

    const trajectoryRef = db.collection('user_trajectories').doc(anonymousUserId);
    await trajectoryRef.delete();

    return {
      success: true,
      message: '軌跡データを削除しました',
    };

  } catch (error) {
    console.error('軌跡データ削除エラー:', error);
    throw new functions.https.HttpsError(
      'internal',
      '軌跡データの削除中にエラーが発生しました'
    );
  }
});

// ユーティリティ関数

/**
 * 軌跡ポイントから総距離を計算
 */
function calculateTotalDistance(points) {
  let totalDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // ハーバサイン公式で距離を計算
    const distance = getDistanceFromLatLonInKm(
      prev.lat, prev.lng,
      curr.lat, curr.lng
    );

    totalDistance += distance;
  }

  return totalDistance;
}

/**
 * 2点間の距離を計算（ハーバサイン公式）
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球の半径 (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * 度をラジアンに変換
 */
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * 平均速度を計算
 */
function calculateAverageSpeed(points, startTime, endTime) {
  if (points.length < 2) return 0;

  const totalDistance = calculateTotalDistance(points);
  const totalTimeHours = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);

  return totalTimeHours > 0 ? totalDistance / totalTimeHours : 0;
}

/**
 * 地理的境界ボックスを計算
 */
function calculateBoundingBox(points) {
  if (points.length === 0) return null;

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
    southWest: { lat: minLat, lng: minLng },
    northEast: { lat: maxLat, lng: maxLng },
  };
}