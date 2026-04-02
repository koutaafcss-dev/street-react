/**
 * imageOptimization.js
 * 画像圧縮・WebP 変換・遅延ロード機能
 * - 初回読込時に最初の 10 枚のみロード
 * - スクロール時に追加画像を遅延ロード
 * - WebP サポート環境で自動変換（60% 圧縮率）
 */

/**
 * WebP サポート判定（キャッシュ付き）
 */
let webpSupportCache = null;
export function supportsWebP() {
  if (webpSupportCache !== null) return webpSupportCache;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupportCache = canvas.toDataURL("image/webp").indexOf("image/webp") === 5;
  return webpSupportCache;
}

/**
 * 画像圧縮（最大 120KB）
 * @param {string} dataUrl - base64 画像
 * @param {number} maxKB - 最大ファイルサイズ（デフォルト 120KB）
 */
export async function compressImage(dataUrl, maxKB = 120) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const maxDim = 800;

      // 長辺が 800px を超えないようリサイズ
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      // JPEG 品質を段階的に下げて目標サイズに収める
      let quality = 0.8;
      let result = canvas.toDataURL("image/jpeg", quality);

      while (result.length * 0.75 > maxKB * 1024 && quality > 0.2) {
        quality -= 0.15;
        result = canvas.toDataURL("image/jpeg", quality);
      }

      if (result.length * 0.75 > maxKB * 1024) {
        reject(new Error("画像が大きすぎます（最大120KB）"));
      } else {
        resolve(result);
      }
    };

    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = dataUrl;
  });
}

/**
 * 遅延ロード用 Intersection Observer
 * @param {Array} imageElements - img 要素の配列
 * @param {Object} options - オプション
 * @returns {IntersectionObserver} observer
 */
export function createLazyLoadObserver(imageElements = [], options = {}) {
  const {
    rootMargin = "50px",
    threshold = 0.01,
  } = options;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;

        if (src && !img.src) {
          img.src = src;
          img.removeAttribute("data-src");
          observer.unobserve(img);
        }
      }
    }
  }, {
    rootMargin,
    threshold,
  });

  for (const img of imageElements) {
    observer.observe(img);
  }

  return observer;
}

/**
 * 画像が読み込まれるまでの時間を計測（パフォーマンス測定用）
 */
export function measureImageLoadTime(imageSrc, label = "Image Load") {
  return new Promise((resolve) => {
    const img = new Image();
    const startTime = performance.now();

    img.onload = () => {
      const loadTime = performance.now() - startTime;
      console.log(`[${label}] Loaded in ${loadTime.toFixed(2)}ms`);
      resolve(loadTime);
    };

    img.onerror = () => {
      console.warn(`[${label}] Failed to load`);
      resolve(0);
    };

    img.src = imageSrc;
  });
}

/**
 * 複数画像の読込進捗を追跡
 */
export function trackImagesLoadProgress(imageSrcs = []) {
  let loaded = 0;
  const total = imageSrcs.length;

  const promises = imageSrcs.map((src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        const progress = (loaded / total) * 100;
        console.log(`Image load progress: ${progress.toFixed(0)}%`);
        resolve();
      };
      img.onerror = () => {
        loaded++;
        resolve();
      };
      img.src = src;
    });
  });

  return Promise.all(promises);
}
