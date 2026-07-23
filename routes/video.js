import express from "express";
import { getYouTube } from "../utils/youtube.js";

const router = express.Router();

/**
 * GET /api/video/:id
 * 動画の詳細情報、チャンネル情報、および関連動画一覧を取得してJSONで返却する
 */
router.get("/:id", async (req, res) => {
  const videoId = req.params.id;

  try {
    const youtube = await getYouTube();
    const info = await youtube.getInfo(videoId);

    const basicInfo = info.basic_info || {};
    const thumbnails = basicInfo.thumbnail || [];
    const thumbnailUrl = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // 関連動画（ウォッチフィード等から抽出）
    const relatedVideos = [];
    const secondaryContents = info.secondary_contents || [];
    for (let i = 0; i < secondaryContents.length; i++) {
      const item = secondaryContents[i];
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
