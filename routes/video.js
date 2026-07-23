import express from "express";
import { getYouTube } from "../utils/youtube.js";

const router = express.Router();

/**
 * GET /api/video/:id
 * 動画の詳細情報および関連動画一覧を取得してJSONで返却する
 */
router.get("/:id", async (req, res) => {
  const videoId = req.params.id;

  // 動画IDの形式検証（不正な文字列やインジェクションを防ぐ）
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: "Invalid video id format." });
  }

  try {
    const youtube = await getYouTube();
    const info = await youtube.getInfo(videoId);

    const basicInfo = info.basic_info || {};
    const thumbnails = basicInfo.thumbnail || [];
    const thumbnailUrl = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const relatedVideos = [];
    const watchNextFeed = info.watch_next_feed?.contents || info.secondary_contents || [];
    for (let i = 0; i < watchNextFeed.length; i++) {
      const item = watchNextFeed[i];
      if (item.type === "CompactVideo" || item.id) {
        relatedVideos.push({
          id: item.id,
          title: item.title?.text || item.title || "",
          thumbnail: item.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          author: item.author?.name || "",
          duration: item.duration?.text || ""
        });
      }
    }

    res.json({
      id: videoId,
      title: basicInfo.title || "",
      views: basicInfo.view_count || 0,
      likes: basicInfo.like_count || 0,
      description: basicInfo.short_description || "",
      duration: basicInfo.duration || 0,
      author: {
        id: basicInfo.channel_id || "",
        name: basicInfo.author || "",
        icon: ""
      },
      thumbnail: thumbnailUrl,
      relatedVideos: relatedVideos
    });

  } catch (error) {
    console.error("Error fetching video info for ID " + videoId + ":", error);
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;
