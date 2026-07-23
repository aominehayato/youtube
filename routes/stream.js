import express from "express";
import fs from "fs";
import { execFile } from "child_process";
import path from "path";
import rateLimit from "express-rate-limit";

const router = express.Router();

const streamLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many stream requests from this IP, please try again later." }
});

/**
 * GET /api/stream/:id
 * yt-dlp を用いてYouTubeのストリームURLを取得し、クライアントへ直接リダイレクトする
 */
router.get("/:id", streamLimit, (req, res) => {
  const videoId = req.params.id;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: "Invalid video id format." });
  }

  const isWindows = process.platform === "win32";
  const ytDlpFileName = isWindows ? "yt-dlp.exe" : "yt-dlp";
  const ytDlpPath = path.join(process.cwd(), "bin", ytDlpFileName);

  // yt-dlp バイナリの存在を事前検証し、ENOENTによるサーバークラッシュを完全防止
  if (!fs.existsSync(ytDlpPath)) {
    console.error("Critical error: yt-dlp binary not found at " + ytDlpPath);
    return res.status(500).json({ error: "Server configuration error: yt-dlp is not installed." });
  }

  const videoUrl = "https://www.youtube.com/watch?v=" + videoId;

  execFile(ytDlpPath, ["-g", "--no-warnings", videoUrl], { timeout: 15000 }, (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp stream execution error for ID " + videoId + ":", error);
      return res.status(500).json({ error: "Failed to extract stream URL via yt-dlp: " + error.message });
    }

    const urls = stdout.trim().split("\n");
    const streamUrl = urls[0];

    if (!streamUrl) {
      return res.status(500).json({ error: "No stream URL returned from yt-dlp." });
    }

    return res.redirect(302, streamUrl);
  });
});

export default router;
