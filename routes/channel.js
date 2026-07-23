import express from "express";
import { getYouTube, resetYouTubeIfCritical } from "../utils/youtube.js";
import { videoLimiter } from "../utils/limiter.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/channel/:id
 */
router.get("/:id", videoLimiter, async (req, res) => {
  const channelId = req.params.id;

  try {
    const youtube = await getYouTube();
    const channel = await youtube.getChannel(channelId);

    const videos = [];
    const content = channel.videos || [];

    for (let i = 0; i < content.length; i++) {
      const v = content[i];
      if (!v) continue;
      videos.push({
        id: v.id || "",
        title: v.title?.text || v.title || "",
        thumbnail: v.thumbnails?.[0]?.url || "",
        duration: v.duration?.text || ""
      });
    }

    res.json({
      channelName: channel.metadata?.title || "Channel",
      avatar: channel.metadata?.avatar?.[0]?.url || "",
      banner: channel.metadata?.banner?.[0]?.url || "",
      subscriberCount: channel.metadata?.subscriber_count || "",
      videos: videos
    });

  } catch (error) {
    logger.error({ err: error, channelId }, "Channel error");
    resetYouTubeIfCritical(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
