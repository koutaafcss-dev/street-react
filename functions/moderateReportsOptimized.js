/**
 * functions/moderateReportsOptimized.js
 * 
 * 最適化版：Cloud Functions の性能改善
 * 改善点：
 * 1. N+1クエリ削減（collectionGroup → indexed query）
 * 2. API並列化（最大5件の並列呼び出し）
 * 3. 信頼度スコア計算のキャッシング（1時間TTL）
 * 4. バッチ処理化
 * 
 * デプロイ方法：
 * firebase deploy --only functions:moderateReportsOptimized
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 定数
const MISREPORT_PENALTY = {
  scoreReduction: 10,
  accountSuspensionThreshold: 20,
  appealBonus: 5,
};

const CACHE_TTL = 3600; // 1時間
const MAX_PARALLEL_AI_CALLS = 5;

/**
 * キャッシュからデータを取得 or セット
 */
async function getOrSetCache(key, fetchFn, ttl = CACHE_TTL) {
  const cacheRef = db.collection('_cache').doc(key);
  const cacheDoc = await cacheRef.get();

  if (cacheDoc.exists && Date.now() - cacheDoc.data().createdAt < ttl * 1000) {
    console.log(`[CACHE HIT] ${key}`);
    return cacheDoc.data().value;
  }

  console.log(`[CACHE MISS] ${key} - fetching...`);
  const value = await fetchFn();

  await cacheRef.set(
    {
      value,
      createdAt: Date.now(),
    },
    { merge: true }
  );

  return value;
}

/**
 * 信頼度スコアを計算（キャッシング付き）
 */
async function calculateReporterTrustScore(reporterId) {
  return getOrSetCache(`trust_${reporterId}`, async () => {
    try {
      const userDoc = await db.collection('users').doc(reporterId).get();
      if (!userDoc.exists) return 50; // デフォルト値

      return userDoc.data().trustScore || 50;
    } catch (err) {
      console.error(`Error calculating trust score for ${reporterId}:`, err);
      return 50;
    }
  });
}

/**
 * バッチサイズに分割
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * 最適化版：pending reports のみ取得＆バッチ処理
 */
exports.moderateReportsBatch = functions.https.onCall(async (data, context) => {
  try {
    // Step 1: pending reports のみ取得（collectionGroup 使用）
    const pendingReportsSnapshot = await db
      .collectionGroup('reports')
      .where('status', '==', 'pending')
      .orderBy('submittedAt', 'desc')
      .limit(100)
      .get();

    console.log(`Found ${pendingReportsSnapshot.size} pending reports`);

    if (pendingReportsSnapshot.size === 0) {
      return { success: true, message: 'No pending reports to moderate' };
    }

    // Step 2: 報告者ID一覧を取得＆キャッシュからスコア取得
    const reporterIds = [
      ...new Set(
        pendingReportsSnapshot.docs.map((doc) => doc.data().reportedBy)
      ),
    ];
    const trustScoreCache = {};

    await Promise.all(
      reporterIds.map(async (id) => {
        trustScoreCache[id] = await calculateReporterTrustScore(id);
      })
    );

    console.log(`Cached trust scores for ${reporterIds.length} reporters`);

    // Step 3: AI分析をバッチで並列実行
    const batches = chunkArray(pendingReportsSnapshot.docs, MAX_PARALLEL_AI_CALLS);
    let processedCount = 0;
    let errorCount = 0;

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (reportDoc) => {
          try {
            const reportData = reportDoc.data();
            const postRef = db.collection('posts').doc(reportData.postId);
            const postDoc = await postRef.get();

            if (!postDoc.exists) {
              console.warn(`Post ${reportData.postId} not found`);
              return { status: 'notfound', reportId: reportDoc.id };
            }

            const postData = postDoc.data();

            // AI分析（簡潔版）
            const aiResult = await analyzeReportWithAIOptimized(
              postData.text,
              reportData.reportReasons
            );

            return {
              status: 'analyzed',
              reportId: reportDoc.id,
              postId: reportData.postId,
              reportedBy: reportData.reportedBy,
              trustScore: trustScoreCache[reportData.reportedBy],
              aiResult,
              reportData,
            };
          } catch (err) {
            console.error('Error processing report:', err);
            return { status: 'error', error: err.message };
          }
        })
      );

      // Step 4: 結果に応じてアクション実行
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.status === 'analyzed') {
            await processReportResult(data);
            processedCount++;
          } else if (data.status === 'error') {
            errorCount++;
          }
        } else {
          errorCount++;
          console.error('Promise rejected:', result.reason);
        }
      }
    }

    return {
      success: true,
      processedCount,
      errorCount,
      totalReports: pendingReportsSnapshot.size,
    };
  } catch (err) {
    console.error('Batch moderation error:', err);
    throw new functions.https.HttpsError('internal', 'Moderation failed');
  }
});

/**
 * 最適化版：AI分析（シンプル化）
 */
async function analyzeReportWithAIOptimized(postText, reportReasons) {
  try {
    const prompt = `Analyze this post moderation case.
      
Post content: "${postText}"
Report reasons: ${reportReasons.join(', ')}

Respond with JSON only:
{
  "shouldDelete": boolean,
  "severity": 0-10,
  "confidence": 0-100
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a content moderator. Respond with JSON only. No explanation.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    try {
      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (e) {
      console.error('JSON parse error:', e);
      return { shouldDelete: false, severity: 5, confidence: 0 };
    }
  } catch (err) {
    console.error('AI analysis error:', err);
    return { shouldDelete: false, severity: 5, confidence: 0 };
  }
}

/**
 * レポート結果を処理
 */
async function processReportResult({
  reportId,
  postId,
  reportedBy,
  trustScore,
  aiResult,
  reportData,
}) {
  try {
    const reportRef = db
      .collection('posts')
      .doc(postId)
      .collection('reports')
      .doc(reportId);

    if (aiResult.shouldDelete && aiResult.severity >= 7) {
      // 削除
      await db.collection('posts').doc(postId).update({
        deleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletionReason: 'VIOLATES_COMMUNITY_STANDARDS',
      });

      await reportRef.update({
        status: 'approved',
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        aiDecision: aiResult,
      });

      // 報告者にボーナス（信頼度向上）
      if (trustScore < 100) {
        await db
          .collection('users')
          .doc(reportedBy)
          .update({
            trustScore: Math.min(100, trustScore + 2),
          });
      }
    } else {
      // 削除しない
      await reportRef.update({
        status: 'rejected',
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        aiDecision: aiResult,
      });

      // 報告者にペナルティ
      if (trustScore > 0) {
        const newScore = Math.max(0, trustScore - MISREPORT_PENALTY.scoreReduction);
        await db
          .collection('users')
          .doc(reportedBy)
          .update({
            trustScore: newScore,
            misreports: admin.firestore.FieldValue.increment(1),
          });
      }
    }

    console.log(`[PROCESSED] ReportID=${reportId}, Decision=${aiResult.shouldDelete ? 'DELETE' : 'KEEP'}`);
  } catch (err) {
    console.error(`Error processing report result for ${reportId}:`, err);
    throw err;
  }
}

/**
 * 異議申し立てをバッチで処理（API呼び出し最小化）
 */
exports.processAppealsBatch = functions.https.onCall(async (data, context) => {
  try {
    const pendingAppealsSnapshot = await db
      .collection('appeals')
      .where('status', '==', 'pending')
      .orderBy('submittedAt', 'desc')
      .limit(50)
      .get();

    if (pendingAppealsSnapshot.size === 0) {
      return { success: true, message: 'No pending appeals' };
    }

    const batches = chunkArray(pendingAppealsSnapshot.docs, MAX_PARALLEL_AI_CALLS);
    let processedCount = 0;

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (appealDoc) => {
          const appealData = appealDoc.data();
          const postRef = db.collection('posts').doc(appealData.postId);
          const postDoc = await postRef.get();

          if (!postDoc.exists) return;

          const aiResult = await analyzeAppealOptimized(
            postDoc.data().text,
            appealData.reportReasons,
            appealData.appealText
          );

          let newStatus = 'rejected';
          if (aiResult.shouldRestore) {
            newStatus = 'approved';
            // 投稿を復元
            await postRef.update({
              deleted: false,
              restoredAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          await db.collection('appeals').doc(appealDoc.id).update({
            status: newStatus,
            decidedAt: admin.firestore.FieldValue.serverTimestamp(),
            aiDecision: aiResult,
          });

          processedCount++;
        })
      );
    }

    return {
      success: true,
      processedCount,
      totalAppeals: pendingAppealsSnapshot.size,
    };
  } catch (err) {
    console.error('Appeal batch processing error:', err);
    throw new functions.https.HttpsError('internal', 'Appeal processing failed');
  }
});

/**
 * 異議申し立て分析（最適化版）
 */
async function analyzeAppealOptimized(postText, reportReasons, appealText) {
  try {
    const prompt = `Analyze appeal: should the post be restored?

Post: "${postText.substring(0, 200)}"
Report reasons: ${reportReasons.join(', ')}
Appeal: "${appealText.substring(0, 200)}"

JSON: {"shouldRestore": boolean, "confidence": 0-100}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'Respond with JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 150,
    });

    return JSON.parse(response.choices[0]?.message?.content || '{"shouldRestore": false}');
  } catch (err) {
    console.error('Appeal analysis error:', err);
    return { shouldRestore: false, confidence: 0 };
  }
}