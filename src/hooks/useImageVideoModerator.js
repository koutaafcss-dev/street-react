import { useState, useCallback } from "react";
import { OpenAI } from "openai";

/**
 * useImageVideoModerator
 * OpenAI Vision API を使用した画像・動画のモデレーション
 * 
 * 機能：
 * - 不適切なコンテンツの検出（暴力、性的、ハラスメント等）
 * - 危険物や違法物の検出
 * - 個人情報（顔認証など）の検出
 * - 詐欺やスパム検出（QRコード、フィッシング等）
 * 
 * 使用例：
 *   const { moderateImage } = useImageVideoModerator(apiKey);
 *   const result = await moderateImage(imageBase64);
 */
export function useImageVideoModerator(apiKey) {
  const [isModerating, setIsModerating] = useState(false);
  const [error, setError] = useState(null);

  const client = apiKey ? new OpenAI({ apiKey, dangerouslyAllowBrowser: true }) : null;

  const moderateImage = useCallback(
    async (imageBase64) => {
      if (!client || !imageBase64) {
        return { safe: true, reason: "", confidence: 0, categories: {} };
      }

      setIsModerating(true);
      setError(null);

      try {
        // Base64データを処理（data:image/...で始まる場合は除去）
        const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
        
        const response = await client.chat.completions.create({
          model: "gpt-4-vision",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`,
                  },
                },
                {
                  type: "text",
                  text: `この画像をモデレーションしてください。以下の項目について評価してください：
                  
1. 暴力・危険（violence）: 暴力シーン、武器、危険な行為 (0-100)
2. 性的コンテンツ（sexual）: 性的に露骨な内容 (0-100)
3. ハラスメント（harassment）: 嫌がらせ、差別、ヘイト (0-100)
4. 個人情報（personal_info）: 顔、実名、個人特定可能な情報 (0-100)
5. 詐欺・スパム（fraud）: QRコード、フィッシング、詐欺的な要素 (0-100)
6. 違法物（illegal）: 違法ドラッグ、銃器などの違法物 (0-100)

結果をJSON形式で返してください（数字のみ）:
{
  "violence": 0-100,
  "sexual": 0-100,
  "harassment": 0-100,
  "personal_info": 0-100,
  "fraud": 0-100,
  "illegal": 0-100,
  "overall_safety": true/false,
  "reason": "主な理由（日本語）"
}`,
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0,
        });

        const content = response.choices[0]?.message?.content || "{}";
        
        // JSONを抽出（```で囲まれている可能性あり）
        let jsonStr = content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
        
        const result = JSON.parse(jsonStr);
        
        // スコアの最大値を計算
        const scores = {
          violence: result.violence || 0,
          sexual: result.sexual || 0,
          harassment: result.harassment || 0,
          personal_info: result.personal_info || 0,
          fraud: result.fraud || 0,
          illegal: result.illegal || 0,
        };
        
        const maxScore = Math.max(...Object.values(scores));
        const safe = result.overall_safety !== false && maxScore < 75;
        
        return {
          safe,
          reason: result.reason || "Content moderation completed",
          confidence: 100 - maxScore,
          scores,
          maxScore,
        };
      } catch (err) {
        console.error("Image moderation error:", err);
        setError(err.message);
        // エラーの場合は、ユーザーの判定に委ねる
        return {
          safe: true,
          reason: "Image moderation skipped (API error)",
          confidence: 0,
          scores: {},
        };
      } finally {
        setIsModerating(false);
      }
    },
    [client]
  );

  return { moderateImage, isModerating, error };
}
