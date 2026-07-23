import express from "express";
import { getYouTube } from "../utils/youtube.js";

const router = express.Router();

/**
 * GET /api/search?q=キーワード
 * YouTube上の動画やチャンネルを安全に検索して返す
 */
router.get("/", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required." });
  }

  try {
    const youtube = await getYouTube();
    const searchResult = await youtube.search(query);

    const results = [];
    const videos = searchResult.results || [];

    for (let i = 0; i < videos.length; i++) {
      const item = videos[i];
      if (!item) continue;
      
      let itemType = "Video";
      if (item.type === "Channel") {
        itemType = "Channel";
      } else if (item.type === "Playlist") {
        itemType = "Playlist";
      }

      const itemId = item.id || item.playlist_id || item.channel_id || "";
      const thumbnails = item.thumbnails || [];
      const thumbUrl = thumbnails.length > 0 ? thumbnails[0].url : `https://i.ytimg.com/vi/${itemId}/hqdefault.jpg`;

      results.push({
        type: itemType,
        id: itemId,
        title: item.title?.text || item.title || "",
        thumbnail: thumbUrl,
        author: item.author?.name || "",
        duration: item.duration?.text || ""
      });
    }

    res.json({ results: results });

  } catch (error) {
    console.error("Search error for query '" + query + "':", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
