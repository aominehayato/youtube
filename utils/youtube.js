import { Innertube } from "youtubei.js";
import logger from "./logger.js";

let instance = null;
let initializing = null;

/**
 * Innertubeインスタンスを安全にシングルトン初期化する関数
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
      const youtube = await Innertube.create({
        lang: "ja",
        location: "JP",
        retrieve_player: true
      });
      instance = youtube;
      logger.info("YouTube client initialized");
      return youtube;
    } catch (err) {
      logger.error({ err }, "Failed to initialize YouTube client");
      instance = null;
      throw err;
    } finally {
      initializing = null;
    }
  })();

  return initializing;
}

/**
 * 致命的なAPI障害時のみインスタンスを破棄する関数
 */
export function resetYouTubeIfCritical(error) {
  const msg = error?.message || "";
  if (
    msg.includes("signature") ||
    msg.includes("extract") ||
    msg.includes("Innertube") ||
    msg.includes("LOGIN_REQUIRED") ||
    msg.includes("bot")
  ) {
    logger.warn({ err: error }, "Reset YouTube client");
    instance = null;
    initializing = null;
  }
}
