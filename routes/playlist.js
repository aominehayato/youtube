import express from "express";
import { getYouTube } from "../utils/youtube.js";

const router = express.Router();

/**
 * GET /api/playlist/:id
 * プレイリスト内の動画一覧を取得する
 */
router.get("/:id", async (req, res) => {
  const playlistId = req.params.id;

  try {
    const youtube = await getYouTube();
    const playlist = await youtube.getPlaylist(playlistId);

    const items = [];
    const contents = playlist.items || [];

    for (let i = 0; i < contents.length; i++) {
      const item = contents[i];
      items.push({
        id: item.id,
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
    console.error("Playlist error for ID " + playlistId + ":", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
