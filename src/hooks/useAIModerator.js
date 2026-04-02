import { useState, useCallback } from "react";
import { OpenAI } from "openai";

/**
 * useAIModerator
 * OpenAI API を使用したコンテンツモデレーション
 * 
 * 機能：
 * - 1. OpenAI Moderation API で自動判定
 * - 2. 暴言・下ネタ・ハラスメント自動検出
 * - 3. 判定理由を返却
 * 
 * 使用例：
 *   const { moderate, isModerating, result } = useAIModerator();
 *   const result = await moderate(postText);
 *   if (!result.safe) showToast(result.reason);
 */
export function useAIModerator(apiKey) {
  const [isModerating, setIsModerating] = useState(false);
  const [error, setError] = useState(null);

  // OpenAI クライアント初期化
  const client = apiKey ? new OpenAI({ apiKey, dangerouslyAllowBrowser: true }) : null;

  /**
   * Moderation API で判定
   * @param {string} text - 判定対象テキスト
   * @returns {object} { safe: boolean, reason: string, scores: object }
   */
  const moderate = useCallback(
    async (text) => {
      if (!client) {
        console.warn("OpenAI API key not configured");
        return { safe: true, reason: "", scores: {} };
      }

      if (!text?.trim()) {
        return { safe: true, reason: "", scores: {} };
      }

      setIsModerating(true);
      setError(null);

      try {
        const response = await client.moderations.create({
          model: "text-moderation-latest",
          input: text,
        });

        const result = response.results[0];
        const { flagged, categories, category_scores } = result;

        if (flagged) {
          // フラグが立ったカテゴリを特定
          const violatedCategories = Object.entries(categories)
            .filter(([_, value]) => value)
            .map(([key, _]) => key);

          const reason = generateModerationMessage(violatedCategories, category_scores);

          return {
            safe: false,
            reason,
            violatedCategories,
            scores: category_scores,
          };
        }

        return {
          safe: true,
          reason: "",
          scores: category_scores,
        };
      } catch (err) {
        console.error("Moderation API error:", err);
        setError(err.message);

        // API エラー時は通す（サービス継続性重視）
        return {
          safe: true,
          reason: "",
          apiError: true,
          scores: {},
        };
      } finally {
        setIsModerating(false);
      }
    },
    [client]
  );

  /**
   * 違反カテゴリから日本語メッセージ生成
   */
  const generateModerationMessage = (categories, scores) => {
    const categoryLabels = {
      harassment: "ハラスメント・暴力的內容",
      harassment_threatening: "脅迫的な表現",
      hate: "ヘイト・差別的表現",
      illegal: "違法行為の助長",
      self_harm: "自傷・自殺関連",
      sexual: "性的內容",
      sexual_minors: "児童への搾取",
      violence: "暴力的表現",
      violence_graphic: "グラフィック暴力",
    };

    const violations = categories
      .map((cat) => categoryLabels[cat] || cat)
      .slice(0, 3)
      .join("・");

    return `投稿できない内容が含まれています：${violations}`;
  };

  return {
    moderate,
    isModerating,
    error,
  };
}

/**
 * GPT-4 を使った より詳細な判定（オプション・高コスト）
 */
export async function moderateWithGPT(client, text, systemPrompt = null) {
  const defaultPrompt = `
以下のテキストを評価してください。以下の基準で不適切かどうか判定してください：
- 暴言・罵詈雑言
- 下ネタ・性的內容
- ハラスメント・脅迫
- 差別・ヘイト表現
- 自傷・自殺関連

JSON 形式で以下を返してください：
{
  "safe": boolean,
  "reason": "不適切な理由（日本語）",
  "score": 0-100（安全性スコア、100が最も安全）
}
  `;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt || defaultPrompt,
        },
        {
          role: "user",
          content: `判定対象テキスト：\n${text}`,
        },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (err) {
    console.error("GPT moderation error:", err);
    throw err;
  }
}
