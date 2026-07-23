import express from "express";
import { getYouTube } from "../utils/youtube.js";

const router = express.Router();

/**
 * GET /api/stream/:id
 * 動画の再生ストリームURL（videoplayback等）を解決して返却する
 */
router.get("/:id", async (req, res) => {
  const videoId = req.params.id;

  try {
    const youtube = await getYouTube();
    const info = await youtube.getInfo(videoId);

    // streamingData から再生用URLを取得
    const streamingData = info.streaming_data;
    if (!streamingData) {
      throw new Error("Streaming data not available for this video.");
    }

    let streamUrl = "";

    // 結合フォーマットまたはアダプティブフォーマットから有効なURLを抽出
    const formats = [].concat(streamingData.formats || [], streamingData.adaptive_formats || []);
    for (let i = 0; i < formats.length; i++) {
      if (formats[i].url) {
        streamUrl = formats[i].url;
        break;
      }
    }

    if (!streamUrl) {
      throw new Error("Could not extract a direct stream URL.");
    }

    res.json({
      id: videoId,
      url: streamUrl
    });

  } catch (error) {
    console.error("Stream URL error for ID " + videoId + ":", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
