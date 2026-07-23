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
      const createdInstance = await Innertube.create({
        lang: "ja",
        location: "JP",
        client_type: "WEB"
      });
      instance = createdInstance;
      return instance;
    } catch (err) {
      logger.error({ err }, "Failed to initialize Innertube instance");
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
    msg.includes("LOGIN_REQUIRED") ||
    msg.includes("Innertube") ||
    msg.includes("Sign in") ||
    msg.includes("bot") ||
    msg.includes("signature") ||
    msg.includes("extract")
  ) {
    logger.warn({ err: error }, "Critical YouTube API error detected. Resetting Innertube instance.");
    instance = null;
    initializing = null;
  }
}
