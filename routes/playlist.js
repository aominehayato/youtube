import express from "express";
import { getYouTube, resetYouTubeIfCritical } from "../utils/youtube.js";
import { videoLimiter } from "../utils/limiter.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/playlist/:id
 */
router.get("/:id", videoLimiter, async (req, res) => {
  const playlistId = req.params.id;

  try {
    const youtube = await getYouTube();
    const playlist = await youtube.getPlaylist(playlistId);

    const items = [];
    const contents = playlist.items || [];

    for (let i = 0; i < contents.length; i++) {
      const item = contents[i];
      if (!item) continue;
      items.push({
        id: item.id || "",
        title: item.title?.text || item.title || "",
        thumbnail: item.thumbnails?.[0]?.url || "",
        author: item.author?.name || ""
      });
    }

    res.json({
      title: playlist.info?.title || "Playlist",
      items: items
    });

  } catch (error) {
    logger.error({ err: error, playlistId }, "Playlist error");
    resetYouTubeIfCritical(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
