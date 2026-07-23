import { Innertube } from "youtubei.js";

let instance = null;
let initializing = null;

/**
 * 同時大量アクセス時の競合を防ぎ、安全にInnertubeインスタンスをシングルトン共有・初期化する関数
 */
export async function getYouTube() {
  if (instance) {
    return instance;
  }

  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    try {
      const createdInstance = await Innertube.create({
        lang: "ja",
        location: "JP",
        retrieve_player: true
      });
      instance = createdInstance;
      return instance;
    } catch (err) {
      console.error("Failed to initialize Innertube instance:", err);
      instance = null;
      throw err;
    } finally {
      initializing = null;
    }
  })();

  return initializing;
}

/**
 * 障害発生時にインスタンスを破棄し、次回呼び出し時に強制再初期化を行わせるための復旧関数
 */
export function resetYouTube() {
  instance = null;
  initializing = null;
}
