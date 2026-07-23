import express from "express";
import { getYouTube, resetYouTubeIfCritical } from "../utils/youtube.js";
import { commentLimiter } from "../utils/limiter.js";
import logger from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/comment/:id
 */
router.get("/:id", commentLimiter, async (req, res) => {
  const videoId = req.params.id;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: "Invalid video id format." });
  }

  try {
    const youtube = await getYouTube();
    const info = await youtube.getInfo(videoId);
    const commentsData = await info.getComments();

    const commentsList = [];
    const contents = commentsData.contents || [];

    for (let i = 0; i < contents.length; i++) {
      const c = contents[i];
      if (!c) continue;
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
    logger.error({ err: error, videoId }, "Comments error");
    resetYouTubeIfCritical(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
