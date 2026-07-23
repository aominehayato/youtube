import { Innertube } from "youtubei.js";

let instance = null;

/**
 * スリープ復帰時や初期化エラー発生時にも自動で再試行できる堅牢なインスタンス取得関数
 */
export async function getYouTube() {
  if (instance) {
    return instance;
  }

  try {
    instance = await Innertube.create({
      lang: "ja",
      location: "JP",
      retrieve_player: true
    });
    return instance;
  } catch (err) {
    console.error("Failed to initialize Innertube, resetting instance:", err);
    instance = null;
    throw err;
  }
}
