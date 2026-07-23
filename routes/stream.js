import express from "express";
import { execFile } from "child_process";
import path from "path";

const router = express.Router();

/**
 * GET /api/stream/:id
 * yt-dlp を用いてYouTubeのストリームURLを取得する
 */
router.get("/:id", (req, res) => {
  const videoId = req.params.id;
  const ytDlpPath = path.join(process.cwd(), "bin", "yt-dlp");

  execFile(ytDlpPath, ["-g", "--no-warnings", "https://www.youtube.com/watch?v=" + videoId], { timeout: 15000 }, (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp stream execution error for ID " + videoId + ":", error);
      return res.status(500).json({ error: "Failed to extract stream URL via yt-dlp: " + error.message });
    }

    const urls = stdout.trim().split("\n");
    if (urls.length === 0 || !urls[0]) {
      return res.status(500).json({ error: "No stream URL returned from yt-dlp." });
    }

    res.json({
      id: videoId,
      url: urls[0],
      audioUrl: urls.length > 1 ? urls[1] : null
    });
  });
});

export default router;
