import { Innertube } from "youtubei.js";

let instance = null;

/**
 * サーバーのスリープ復帰時にも確実に再初期化できる安全なインスタンス取得関数
 */
export async function getYouTube() {
  if (!instance) {
    try {
      instance = await Innertube.create({
        lang: "ja",
        location: "JP"
      });
    } catch (err) {
      console.error("Failed to initialize Innertube:", err);
      throw err;
    }
  }
  return instance;
}
