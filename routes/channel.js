import express from "express";
import { getYouTube } from "../utils/youtube.js";

const router = express.Router();

/**
 * GET /api/channel/:id
 * チャンネル詳細情報および動画一覧を取得する
 */
router.get("/:id", async (req, res) => {
  const channelId = req.params.id;

  try {
    const youtube = await getYouTube();
    const channel = await youtube.getChannel(channelId);

    const videos = [];
    const content = channel.videos || [];

    for (let i = 0; i < content.length; i++) {
      const v = content[i];
      videos.push({
        id: v.id,
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
    console.error("Channel error for ID " + channelId + ":", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
