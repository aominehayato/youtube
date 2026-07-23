import express from "express";
import { getYouTube } from "../utils/youtube.js";

const router = express.Router();

/**
 * GET /api/comment/:id
 * 動画のコメント一覧を取得する
 */
router.get("/:id", async (req, res) => {
  const videoId = req.params.id;

  try {
    const youtube = await getYouTube();
    const info = await youtube.getInfo(videoId);
    const commentsData = await info.getComments();

    const commentsList = [];
    const contents = commentsData.contents || [];

    for (let i = 0; i < contents.length; i++) {
      const c = contents[i];
      commentsList.push({
        author: c.author?.name || "Anonymous",
        text: c.content?.text || "",
        likes: c.likes_count || "0",
        published: c.published_time || ""
      });
    }

    res.json({
      totalCommentCount: commentsList.length,
      comments: commentsList
    });

  } catch (error) {
    console.error("Comments error for ID " + videoId + ":", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
