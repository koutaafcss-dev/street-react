/**
 * expandPostsForMap.js
 *
 * 目的:
 * - 旧データ（lat / lng だけの1地点投稿）
 * - 新データ（locations[] を持つ複数地点投稿）
 * の両方を、地図表示用に同じ形へ変換する
 *
 * 使い方:
 *   import { expandPostsForMap } from "./utils/expandPostsForMap";
 *   const mapPosts = expandPostsForMap(posts);
 *
 * 返り値:
 * [
 *   {
 *     ...元の投稿データ,
 *     _mapPointId: "postId__loc-1",
 *     _sourcePostId: "postId",
 *     _locationIndex: 0,
 *     lat: 35.1,
 *     lng: 136.9,
 *     locationLabel: "南側集積所"
 *   }
 * ]
 */

/**
 * 数字かどうかを安全に判定
 */
function isValidNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * 文字列を安全に整える
 */
function safeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 投稿から locations 配列を安全に取り出す
 * - 新形式: post.locations
 * - 旧形式: post.lat / post.lng
 */
export function getPostLocations(post) {
  if (!post || typeof post !== "object") return [];

  // 新形式: locations[]
  if (Array.isArray(post.locations) && post.locations.length > 0) {
    return post.locations
      .map((loc, index) => {
        const lat = loc?.lat;
        const lng = loc?.lng;

        if (!isValidNumber(lat) || !isValidNumber(lng)) {
          return null;
        }

        return {
          id: safeText(loc?.id) || `loc-${index + 1}`,
          lat,
          lng,
          label: safeText(loc?.label),
        };
      })
      .filter(Boolean);
  }

  // 旧形式: lat / lng だけ
  if (isValidNumber(post.lat) && isValidNumber(post.lng)) {
    return [
      {
        id: "loc-1",
        lat: post.lat,
        lng: post.lng,
        label: safeText(post.locationLabel),
      },
    ];
  }

  return [];
}

/**
 * 投稿一覧を、地図で描画しやすい一覧に展開する
 * 1投稿に複数地点があれば、地点数ぶんに増やす
 */
export function expandPostsForMap(posts) {
  if (!Array.isArray(posts)) return [];

  const expanded = [];

  for (const post of posts) {
    const locations = getPostLocations(post);

    // 位置が無い投稿は地図に出さない
    if (locations.length === 0) continue;

    locations.forEach((loc, index) => {
      expanded.push({
        ...post,

        // 地図用の一意キー
        _mapPointId: `${post.id || "unknown"}__${loc.id || index}`,

        // 元の投稿ID
        _sourcePostId: post.id || null,

        // その投稿の何番目の地点か
        _locationIndex: index,

        // 地図表示では地点ごとの lat / lng を上書きで持たせる
        lat: loc.lat,
        lng: loc.lng,

        // 地点ラベル
        locationLabel: loc.label || "",
      });
    });
  }

  return expanded;
}

/**
 * 1投稿が複数地点を持っているか
 */
export function hasMultipleLocations(post) {
  return getPostLocations(post).length > 1;
}

/**
 * 投稿の地点数を返す
 */
export function getLocationCount(post) {
  return getPostLocations(post).length;
}
